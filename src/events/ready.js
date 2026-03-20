/**
 * Ready Event
 * Triggered when the bot is fully connected and ready
 */

const logger = require('../utils/logger');
const InviteTracker = require('../services/InviteTracker');
const GuildConfig = require('../database/models/GuildConfig');

/**
 * Handle the ready event
 * @param {Client} client - Discord client
 */
async function execute(client) {
    // Set bot presence
    const status = process.env.BOT_STATUS || 'online';
    const activityType = process.env.ACTIVITY_TYPE || 'PLAYING';
    const activityMessage = process.env.ACTIVITY_MESSAGE || 'Con las invitaciones';
    
    // Map activity type string to ActivityType enum
    const activityTypes = {
        PLAYING: 0,
        STREAMING: 1,
        LISTENING: 2,
        WATCHING: 3,
        COMPETING: 5
    };
    
    await client.user.setPresence({
        status: status,
        activities: [{
            name: activityMessage,
            type: activityTypes[activityType] || 0
        }]
    });
    
    // Log ready message
    logger.success(`🤖 Bot is ready!`, 'READY');
    logger.info(`Bot: ${client.user.tag}`, 'READY');
    logger.info(`ID: ${client.user.id}`, 'READY');
    logger.info(`Guilds: ${client.guilds.cache.size}`, 'READY');
    
    // Log commands
    const globalCommands = await client.application.commands.fetch();
    logger.info(`Global commands registered: ${globalCommands.size}`, 'READY');
    
    // Log invite system status
    const inviteEnabled = process.env.INVITE_SYSTEM_ENABLED === 'true';
    const checkInterval = process.env.CHECK_INTERVAL_MINUTES || 5;
    logger.info(`Invite system: ${inviteEnabled ? 'Enabled' : 'Disabled'} (check every ${checkInterval} min)`, 'READY');
    
    // Initialize invite tracking for all guilds
    if (inviteEnabled) {
        await initializeInviteTracking(client);
    }
}

/**
 * Initialize invite tracking for all guilds
 * @param {Client} client - Discord client
 */
async function initializeInviteTracking(client) {
    const checkInterval = parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5;
    const intervalMs = checkInterval * 60 * 1000;
    
    logger.info('Initializing invite tracking for all guilds...', 'READY');
    
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            // Fetch and cache invites for this guild
            await InviteTracker.fetchAndCacheInvites(guild);
            logger.info(`Cached invites for guild: ${guild.name}`, 'READY');
            
            // Send test log message
            try {
                const config = await GuildConfig.getConfig(guildId);
                if (config.inviteSystem.logChannelId && config.inviteSystem.enabled) {
                    let channel = client.channels.cache.get(config.inviteSystem.logChannelId);
                    if (!channel) {
                        channel = await client.channels.fetch(config.inviteSystem.logChannelId);
                    }
                    
                    if (channel) {
                        const { EmbedBuilder } = require('discord.js');
                        const testEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle('✅ Sistema de logs activo')
                            .setDescription('El sistema de logging de invitaciones está funcionando correctamente.')
                            .setTimestamp();
                        
                        await channel.send({ embeds: [testEmbed] });
                        logger.success(`Test log message sent to guild: ${guild.name}`, 'READY');
                    }
                }
            } catch (logErr) {
                logger.warn(`Could not send test log for guild ${guild.name}: ${logErr.message}`, 'READY');
            }
            
        } catch (err) {
            logger.error(`Failed to initialize invite tracking for guild ${guildId}: ${err.message}`, 'READY');
        }
    }
    
    logger.success('Invite tracking initialization complete!', 'READY');
}

module.exports = {
    name: 'ready',
    once: true,
    execute
};
