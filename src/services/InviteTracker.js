/**
 * InviteTracker Service
 * Core invite tracking system using Discord API
 * Handles: joins, leaves, fake joins, bonuses, role assignment
 */

const logger = require('../utils/logger');
const embedBuilder = require('../utils/embedBuilder');
const database = require('../database/connection');
const InviteUser = require('../database/models/InviteUser');
const InviteLog = require('../database/models/InviteLog');
const GuildConfig = require('../database/models/GuildConfig');

// In-memory cache for invite codes (for quick comparison)
const inviteCache = new Map();

/**
 * Fetch all invites from Discord and cache them
 * @param {Guild} guild - Discord guild
 * @returns {Promise<Map<string, number>>} Map of invite code -> uses
 */
async function fetchAndCacheInvites(guild) {
    try {
        const invites = await guild.invites.fetch();
        const inviteMap = new Map();
        
        for (const [code, invite] of invites) {
            inviteMap.set(code, invite.uses || 0);
            inviteMap.set(`${code}_inviter`, invite.inviter?.id || null);
            inviteMap.set(`${code}_maxUses`, invite.maxUses || null);
            inviteMap.set(`${code}_temporary`, invite.temporary || false);
        }
        
        inviteCache.set(guild.id, {
            invites: inviteMap,
            timestamp: Date.now()
        });
        
        logger.debug(`Cached ${invites.size} invite codes for guild ${guild.id}`, 'INVITE_TRACKER');
        return inviteMap;
    } catch (err) {
        logger.error(`Failed to fetch invites: ${err.message}`, 'INVITE_TRACKER');
        return null;
    }
}

/**
 * Get cached invites for a guild
 * @param {string} guildId - Guild ID
 * @returns {Map<string, number>|null}
 */
function getCachedInvites(guildId) {
    const cached = inviteCache.get(guildId);
    if (!cached) return null;
    
    // Check if cache is still valid (5 minutes)
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
        return null;
    }
    
    return cached.invites;
}

/**
 * Handle member join event
 * @param {Client} client - Discord client
 * @param {GuildMember} member - New member
 */
async function handleMemberJoin(client, member) {
    if (member.user.bot) {
        logger.debug(`Ignoring bot join: ${member.user.tag}`, 'INVITE_TRACKER');
        return;
    }

    const guildId = member.guild.id;
    const userId = member.id;
    const now = new Date();

    logger.info(`Member joined: ${member.user.tag} (${userId})`, 'INVITE_TRACKER');

    // Get config
    const config = await GuildConfig.getConfig(guildId);
    if (!config.inviteSystem.enabled) {
        return;
    }

    // Anti-abuse: Check minimum account age
    if (config.antiAbuse.minAccountAge > 0) {
        const accountAgeMinutes = (now - member.user.createdAt) / (1000 * 60);
        if (accountAgeMinutes < config.antiAbuse.minAccountAge) {
            logger.warn(`Account too young: ${member.user.tag} (${accountAgeMinutes.toFixed(1)} minutes)`, 'INVITE_TRACKER');
            // Log but don't block - could add punishment here
        }
    }

    // Get previous invites from cache
    const oldInvites = getCachedInvites(guildId) || new Map();

    // Fetch fresh invites to detect which one was used
    const newInvites = await fetchAndCacheInvites(member.guild);

    if (!newInvites) {
        logger.error('Could not fetch new invites', 'INVITE_TRACKER');
        return;
    }

    // Find which invite was used
    let usedCode = null;
    let inviterId = null;
    let isFake = false;

    for (const [code, uses] of newInvites) {
        if (code.startsWith(`${code}_`)) continue; // Skip metadata keys

        const oldUses = oldInvites.get(code) || 0;
        
        if (uses > oldUses) {
            usedCode = code;
            inviterId = newInvites.get(`${code}_inviter`);
            
            // Check for fake join (temporary invite that was used)
            const maxUses = newInvites.get(`${code}_maxUses`);
            const isTemporary = newInvites.get(`${code}_temporary`);
            
            if (isTemporary || (maxUses && maxUses === 1)) {
                isFake = true;
            }
            
            break;
        }
    }

    // If no invite found in cache comparison, check if this is a rejoin
    if (!usedCode) {
        const userData = await InviteUser.findOne({ guildId, userId });
        if (userData && userData.lastLeave) {
            const timeSinceLeave = (now - userData.lastLeave) / (1000 * 60);
            if (timeSinceLeave < config.antiAbuse.fakeJoinTimeout) {
                isFake = true;
                logger.warn(`Possible rejoin detected for ${member.user.tag}`, 'INVITE_TRACKER');
            }
        }
    }

    // Get or create user data
    const userData = await InviteUser.findOrCreate(guildId, userId);

    // Update user data
    const previousInvites = userData.totalInvites;
    userData.firstJoin = userData.firstJoin || now;
    userData.lastJoin = now;
    userData.inviteCode = usedCode;
    userData.inviterId = inviterId;
    userData.isFake = isFake;

    if (isFake) {
        userData.fakeJoins = (userData.fakeJoins || 0) + 1;
        userData.joinHistory.push({
            date: now,
            inviterId,
            inviteCode: usedCode,
            type: 'fake'
        });
        
        await InviteLog.log({
            guildId,
            action: 'fake_detected',
            userId,
            inviterId,
            inviteCode: usedCode
        });
        
        logger.warn(`Fake join detected for ${member.user.tag}`, 'INVITE_TRACKER');
    } else if (inviterId) {
        // Increment inviter's invites
        const inviterData = await InviteUser.findOrCreate(guildId, inviterId);
        inviterData.regularInvites = (inviterData.regularInvites || 0) + 1;
        inviterData.lastJoin = now;
        inviterData.joinHistory.push({
            date: now,
            targetUserId: userId,
            inviteCode: usedCode,
            type: 'join'
        });
        
        await InviteLog.log({
            guildId,
            action: 'join',
            userId,
            targetUserId: userId,
            inviterId,
            inviteCode: usedCode,
            inviteCount: inviterData.totalInvites,
            previousCount: previousInvites
        });
        
        await inviterData.save();
        
        logger.info(`Invite recorded: ${inviterId} invited ${userId} (total: ${inviterData.totalInvites})`, 'INVITE_TRACKER');
        
        // Check for role rewards
        await checkAndAssignRoles(client, guildId, inviterId, inviterData.totalInvites);
    } else {
        // Unknown inviter (vanity URL or other)
        userData.joinHistory.push({
            date: now,
            inviteCode: usedCode || 'unknown',
            type: 'join'
        });
        
        await InviteLog.log({
            guildId,
            action: 'join',
            userId,
            inviteCode: usedCode || 'vanity'
        });
    }

    await userData.save();

    // Send welcome message with invite info
    await sendJoinMessage(client, guildId, member, inviterId, usedCode, isFake);
}

/**
 * Handle member leave event
 * @param {Client} client - Discord client
 * @param {GuildMember} member - Leaving member
 */
async function handleMemberLeave(client, member) {
    if (member.user.bot) {
        return;
    }

    const guildId = member.guild.id;
    const userId = member.id;
    const now = new Date();

    logger.info(`Member left: ${member.user.tag} (${userId})`, 'INVITE_TRACKER');

    // Get config
    const config = await GuildConfig.getConfig(guildId);
    if (!config.inviteSystem.enabled) {
        return;
    }

    // Find user data
    const userData = await InviteUser.findOne({ guildId, userId });

    if (!userData) {
        return;
    }

    const wasInvitedBy = userData.inviterId;
    const previousInvites = userData.totalInvites;

    // Update leave data
    userData.lastLeave = now;
    userData.left = (userData.left || 0) + 1;
    userData.joinHistory.push({
        date: now,
        inviterId: wasInvitedBy,
        type: 'leave'
    });

    await userData.save();

    // Decrease inviter's count if they were the inviter
    if (wasInvitedBy) {
        const inviterData = await InviteUser.findOne({ guildId, userId: wasInvitedBy });
        
        if (inviterData && inviterData.regularInvites > 0) {
            inviterData.regularInvites -= 1;
            inviterData.lastLeave = now;
            
            await inviterData.save();

            await InviteLog.log({
                guildId,
                action: 'leave',
                userId,
                targetUserId: userId,
                inviterId: wasInvitedBy,
                inviteCount: inviterData.totalInvites,
                previousCount: previousInvites
            });

            logger.info(`Invite removed: ${wasInvitedBy} lost invite (total: ${inviterData.totalInvites})`, 'INVITE_TRACKER');

            // Check if role should be removed
            await checkAndAssignRoles(client, guildId, wasInvitedBy, inviterData.totalInvites);
        }
    }

    // Send leave log
    await sendLeaveMessage(client, guildId, member, wasInvitedBy);
}

/**
 * Check and assign roles based on invite count
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID to check
 * @param {number} inviteCount - Current invite count
 */
async function checkAndAssignRoles(client, guildId, userId, inviteCount) {
    const config = await GuildConfig.getConfig(guildId);
    const guild = await client.guilds.fetch(guildId);
    
    if (!guild) return;

    const member = await guild.members.fetch(userId);
    if (!member) return;

    // Find the appropriate tier
    let currentTier = null;
    for (let i = config.tiers.length - 1; i >= 0; i--) {
        if (inviteCount >= config.tiers[i].invites) {
            currentTier = config.tiers[i];
            break;
        }
    }

    if (!currentTier) return;

    // Check if user already has this role
    const hasRole = member.roles.cache.has(currentTier.roleId);

    if (!hasRole) {
        const role = guild.roles.cache.get(currentTier.roleId);
        
        if (role) {
            try {
                await member.roles.add(role);
                
                await InviteLog.log({
                    guildId,
                    action: 'role_assigned',
                    userId,
                    roleId: currentTier.roleId,
                    inviteCount
                });

                // Send notification
                const embed = embedBuilder.roleAssigned(
                    member.user.toString(),
                    currentTier.roleName,
                    inviteCount
                );

                const settings = config.inviteSystem;
                
                if (settings.notifyViaDM) {
                    try {
                        await member.send({ embeds: [embed] });
                    } catch (err) {
                        // DM failed, try channel
                        if (settings.notificationChannelId) {
                            const channel = guild.channels.cache.get(settings.notificationChannelId);
                            if (channel) await channel.send({ embeds: [embed] });
                        }
                    }
                } else if (settings.notificationChannelId) {
                    const channel = guild.channels.cache.get(settings.notificationChannelId);
                    if (channel) await channel.send({ embeds: [embed] });
                }

                logger.logRoleAssignment(userId, currentTier.roleId, `${inviteCount} invites`);
            } catch (err) {
                logger.error(`Failed to assign role: ${err.message}`, 'INVITE_TRACKER');
            }
        }
    }
}

/**
 * Add bonus invites to a user
 * @param {Client} client - Discord client (optional, for role assignment)
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add (can be negative)
 * @param {string} reason - Reason for bonus
 */
async function addBonusInvites(client, guildId, userId, amount, reason = 'Manual bonus') {
    const userData = await InviteUser.findOrCreate(guildId, userId);
    
    userData.bonusInvites = (userData.bonusInvites || 0) + amount;
    userData.isBonus = true;
    
    await userData.save();

    await InviteLog.log({
        guildId,
        action: amount > 0 ? 'bonus_add' : 'bonus_remove',
        userId,
        metadata: { amount, reason }
    });

    logger.info(`Bonus invites ${amount > 0 ? 'added' : 'removed'}: ${userId} ${amount} (reason: ${reason})`, 'INVITE_TRACKER');
    
    // Check for role assignment if client is provided
    if (client && amount > 0) {
        await checkAndAssignRoles(client, guildId, userId, userData.totalInvites);
    }
    
    return userData.totalInvites;
}

/**
 * Get user invite data
 * @param {string} guildId - Guild ID
 * @param {string} userId - User ID
 * @returns {Object} User invite data
 */
async function getUserInvites(guildId, userId) {
    const userData = await InviteUser.findOrCreate(guildId, userId);
    
    return {
        total: userData.totalInvites,
        regular: userData.regularInvites,
        bonus: userData.bonusInvites,
        fake: userData.fakeJoins,
        left: userData.left,
        firstJoin: userData.firstJoin,
        lastJoin: userData.lastJoin,
        inviterId: userData.inviterId
    };
}

/**
 * Get leaderboard for a guild
 * @param {string} guildId - Guild ID
 * @param {number} limit - Number of users to return
 * @returns {Array} Leaderboard data
 */
async function getLeaderboard(guildId, limit = 10) {
    return InviteUser.find({ guildId })
        .sort({ regularInvites: -1, bonusInvites: -1 })
        .limit(limit);
}

/**
 * Send join message with invite info
 */
async function sendJoinMessage(client, guildId, member, inviterId, inviteCode, isFake) {
    const config = await GuildConfig.getConfig(guildId);
    
    console.log('[DEBUG] Log channel ID:', config.inviteSystem.logChannelId);
    
    if (!config.inviteSystem.logChannelId) {
        console.log('[DEBUG] No log channel configured, skipping join message');
        return;
    }
    
    const channel = client.channels.cache.get(config.inviteSystem.logChannelId);
    if (!channel) return;

    const inviterMention = inviterId ? `<@${inviterId}>` : 'Desconocido';

    // Use the appropriate embed based on whether it's a fake join
    let embed;
    if (isFake) {
        embed = embedBuilder.logFakeJoin(member.user.tag, member.id);
    } else {
        embed = embedBuilder.logJoin(member.user.tag, member.id, inviterMention, inviteCode || 'Desconocido');
    }

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        logger.error(`Failed to send join message: ${err.message}`, 'INVITE_TRACKER');
    }
}

/**
 * Send leave message
 */
async function sendLeaveMessage(client, guildId, member, inviterId) {
    const config = await GuildConfig.getConfig(guildId);
    
    console.log('[DEBUG] Leave log channel ID:', config.inviteSystem.logChannelId);
    
    if (!config.inviteSystem.logChannelId) {
        console.log('[DEBUG] No log channel configured, skipping leave message');
        return;
    }
    
    const channel = client.channels.cache.get(config.inviteSystem.logChannelId);
    if (!channel) return;

    const inviterMention = inviterId ? `<@${inviterId}>` : 'Desconocido';

    const embed = embedBuilder.logLeave(member.user.tag, member.id, inviterMention);

    try {
        await channel.send({ embeds: [embed] });
    } catch (err) {
        logger.error(`Failed to send leave message: ${err.message}`, 'INVITE_TRACKER');
    }
}

/**
 * Sync all invites from Discord
 * @param {Client} client - Discord client
 * @param {string} guildId - Guild ID
 */
async function syncInvites(client, guildId) {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return;

    await fetchAndCacheInvites(guild);
    
    const config = await GuildConfig.getConfig(guildId);
    config.lastSync = new Date();
    await config.save();

    logger.info(`Invites synced for guild ${guildId}`, 'INVITE_TRACKER');
}

module.exports = {
    handleMemberJoin,
    handleMemberLeave,
    addBonusInvites,
    getUserInvites,
    getLeaderboard,
    syncInvites,
    fetchAndCacheInvites
};
