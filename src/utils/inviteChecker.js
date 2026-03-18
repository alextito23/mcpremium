/**
 * Invite Checker
 * Core logic for checking invites and assigning roles
 * Flexible to work with external data sources (database, external bot, etc.)
 */

const configManager = require('./configManager');
const embedBuilder = require('./embedBuilder');
const logger = require('./logger');

/**
 * Data source interface - This is where you can connect to external systems
 * Currently returns mock data for demonstration
 * 
 * TO INTEGRATE WITH EXTERNAL SOURCE:
 * Replace getUserInviteCount with your actual data fetching logic
 * Examples:
 * - Database query (MySQL, PostgreSQL, MongoDB)
 * - API call to another bot
 * - JSON file read
 * - Redis cache
 * 
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {Promise<number>} Number of invites
 */
async function getUserInviteCount(guildId, userId) {
    // ======================================================
    // TODO: Replace this with your actual data source
    // ======================================================
    // 
    // Example 1 - Database (MySQL):
    // const [rows] = await db.execute(
    //   'SELECT invite_count FROM user_invites WHERE guild_id = ? AND user_id = ?',
    //   [guildId, userId]
    // );
    // return rows[0]?.invite_count || 0;
    //
    // Example 2 - API Call:
    // const response = await fetch(`https://api.example.com/invites/${guildId}/${userId}`);
    // const data = await response.json();
    // return data.invite_count;
    //
    // Example 3 - Another Bot's API:
    // const { data } = await axios.get(`http://localhost:3000/api/invites`, {
    //   params: { guild: guildId, user: userId }
    // });
    // return data.count;
    //
    // ======================================================
    
    // MOCK DATA - For demonstration purposes
    // This simulates external invite data
    // Remove this when you connect your actual data source
    
    // Generate deterministic mock data based on user ID
    // This is just for testing - replace with real data!
    const mockData = generateMockInviteData(userId);
    logger.debug(`Fetched ${mockData} invites for user ${userId}`, 'INVITE_CHECKER');
    
    return mockData;
}

/**
 * Generate mock invite data for demonstration
 * This function simulates external invite data
 * @private
 */
function generateMockInviteData(userId) {
    // Create a pseudo-random but consistent number based on user ID
    // This ensures the same user always gets the same "mock" invites
    const hash = userId.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
    }, 0);
    
    // Return a number between 0 and 50 for demonstration
    // In production, remove this and use real data
    return Math.floor((hash % 51));
}

/**
 * Check if a user qualifies for a role based on their invites
 * @param {Client} client - Discord client
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @returns {Promise<Object>} Result object {shouldAssign, role, currentInvites}
 */
async function checkUserInvites(client, guildId, userId) {
    // Get the guild
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
        logger.error(`Guild not found: ${guildId}`, 'INVITE_CHECKER');
        return { shouldAssign: false, role: null, currentInvites: 0 };
    }
    
    // Check if system is enabled
    if (!configManager.isEnabled(guildId)) {
        logger.debug(`Invite system is disabled for guild ${guildId}`, 'INVITE_CHECKER');
        return { shouldAssign: false, role: null, currentInvites: 0 };
    }
    
    // Get user's invite count from external source
    const currentInvites = await getUserInviteCount(guildId, userId);
    
    // Get the appropriate tier for this invite count
    const tier = configManager.getRoleForInvites(guildId, currentInvites);
    
    if (!tier) {
        return { shouldAssign: false, role: null, currentInvites };
    }
    
    // Check if user already has this role
    try {
        const member = await guild.members.fetch(userId);
        
        if (member) {
            const hasRole = member.roles.cache.has(tier.roleId);
            
            if (hasRole) {
                logger.debug(`User ${userId} already has role ${tier.roleName}`, 'INVITE_CHECKER');
                return { shouldAssign: false, role: tier, currentInvites, alreadyHasRole: true };
            }
        }
    } catch (err) {
        logger.error(`Error checking member roles: ${err.message}`, 'INVITE_CHECKER');
    }
    
    return { shouldAssign: true, role: tier, currentInvites };
}

/**
 * Assign a role to a user and send notification
 * @param {Client} client - Discord client
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {Object} tier - Tier object with roleId and roleName
 * @param {number} inviteCount - Current invite count
 * @returns {Promise<boolean>} Success status
 */
async function assignRoleAndNotify(client, guildId, userId, tier, inviteCount) {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
        logger.error(`Guild not found: ${guildId}`, 'INVITE_ASSIGN');
        return false;
    }
    
    const member = await guild.members.fetch(userId);
    if (!member) {
        logger.error(`Member not found: ${userId}`, 'INVITE_ASSIGN');
        return false;
    }
    
    // Get the role
    const role = guild.roles.cache.get(tier.roleId);
    if (!role) {
        logger.error(`Role not found: ${tier.roleId}`, 'INVITE_ASSIGN');
        return false;
    }
    
    try {
        // Assign the role
        await member.roles.add(role);
        logger.logRoleAssignment(userId, tier.roleId, `${inviteCount} invites reached`);
        
        // Get notification settings
        const settings = configManager.getSettings(guildId);
        
        // Create the notification embed
        const embed = embedBuilder.roleAssigned(
            member.user.toString(),
            tier.roleName,
            inviteCount
        );
        
        // Send notification
        if (settings.notifyViaDM) {
            // Send DM to user
            try {
                await member.send({ embeds: [embed] });
                logger.info(`Sent role notification DM to user ${userId}`, 'INVITE_ASSIGN');
            } catch (err) {
                // User might have DMs disabled, try channel instead
                logger.warn(`Could not send DM to user ${userId}, trying channel: ${err.message}`, 'INVITE_ASSIGN');
                await sendChannelNotification(client, guildId, embed);
            }
        } else {
            // Send to notification channel
            await sendChannelNotification(client, guildId, embed);
        }
        
        return true;
    } catch (err) {
        logger.error(`Failed to assign role: ${err.message}`, 'INVITE_ASSIGN');
        return false;
    }
}

/**
 * Send notification to the configured channel
 * @param {Client} client - Discord client
 * @param {string} guildId - Discord guild ID
 * @param {EmbedBuilder} embed - Embed to send
 * @returns {Promise<boolean>} Success status
 */
async function sendChannelNotification(client, guildId, embed) {
    const channelId = configManager.getNotificationChannel(guildId);
    const guild = await client.guilds.fetch(guildId);
    
    let channel;
    
    if (channelId) {
        channel = guild.channels.cache.get(channelId);
    }
    
    // Fall back to system channel
    if (!channel && guild.systemChannel) {
        channel = guild.systemChannel;
    }
    
    // Fall back to first text channel
    if (!channel) {
        channel = guild.channels.cache.find(c => c.isTextBased());
    }
    
    if (channel) {
        try {
            await channel.send({ embeds: [embed] });
            logger.info(`Sent role notification to channel ${channel.id}`, 'INVITE_ASSIGN');
            return true;
        } catch (err) {
            logger.error(`Failed to send channel notification: ${err.message}`, 'INVITE_ASSIGN');
            return false;
        }
    }
    
    logger.error('No suitable channel found for notifications', 'INVITE_ASSIGN');
    return false;
}

/**
 * Check all members in a guild and assign roles if needed
 * This is called periodically to process all users
 * @param {Client} client - Discord client
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} Results summary
 */
async function processAllMembers(client, guildId) {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) {
        return { processed: 0, rolesAssigned: 0, errors: 0 };
    }
    
    const members = await guild.members.fetch();
    let rolesAssigned = 0;
    let errors = 0;
    
    for (const [userId, member] of members) {
        // Skip bots
        if (member.user.bot) continue;
        
        try {
            const result = await checkUserInvites(client, guildId, userId);
            
            if (result.shouldAssign) {
                const success = await assignRoleAndNotify(
                    client,
                    guildId,
                    userId,
                    result.role,
                    result.currentInvites
                );
                
                if (success) {
                    rolesAssigned++;
                } else {
                    errors++;
                }
            }
        } catch (err) {
            logger.error(`Error processing member ${userId}: ${err.message}`, 'INVITE_PROCESS');
            errors++;
        }
    }
    
    return {
        processed: members.size,
        rolesAssigned,
        errors
    };
}

module.exports = {
    getUserInviteCount,
    checkUserInvites,
    assignRoleAndNotify,
    sendChannelNotification,
    processAllMembers
};
