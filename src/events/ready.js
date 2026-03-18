/**
 * Ready Event
 * Triggered when the bot is fully connected and ready
 */

const logger = require('../utils/logger');

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
}

module.exports = {
    name: 'ready',
    once: true,
    execute
};
