/**
 * Bot MCPremium - Main Entry Point
 * Advanced Discord bot for invite tracking and role assignment
 * 
 * Features:
 * - Real-time invite tracking using Discord API
 * - Fake join detection
 * - Leave tracking
 * - Bonus invites
 * - Leaderboard
 * - Role rewards
 * - MongoDB persistence
 * 
 * @version 2.0.0
 * @author Bot Developer
 */

require('dotenv').config();

// Import required modules
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const logger = require('./utils/logger');
const database = require('./database/connection');
const commandHandler = require('./handlers/commandHandler');
const eventHandler = require('./handlers/eventHandler');
const InviteTracker = require('./services/InviteTracker');

// Create Discord client with required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,              // Required for guild operations
        GatewayIntentBits.GuildMembers,       // Required for member operations
        GatewayIntentBits.GuildInvites,        // Required for invite tracking
        GatewayIntentBits.GuildMessages,       // Required for message operations
        GatewayIntentBits.MessageContent       // Required for reading message content
    ],
    // Enable partials for better reliability
    partials: [
        'CHANNEL',
        'GUILD_MEMBER',
        'MESSAGE',
        'USER'
    ]
});

// Store commands collection on client
client.commands = new Collection();

// Store intervals
client.checkIntervals = new Map();

/**
 * Initialize the bot
 */
async function init() {
    try {
        // Connect to MongoDB
        const dbConnected = await database.connect();
        
        if (dbConnected) {
            logger.success('MongoDB connected successfully', 'STARTUP');
        } else {
            logger.warn('Running without MongoDB - data will not persist', 'STARTUP');
        }

        // Load events
        eventHandler.loadEvents(client);
        
        // Load commands
        commandHandler.loadCommands(client);
        
        // Login to Discord
        const token = process.env.DISCORD_TOKEN;
        
        if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
            logger.error('Bot token not configured. Please add DISCORD_TOKEN to .env file', 'STARTUP');
            process.exit(1);
        }
        
        await client.login(token);
        
        // Initialize invite tracking for all guilds
        await initializeInviteTracking(client);
        
        logger.success('Bot initialized successfully!', 'STARTUP');
        
    } catch (err) {
        logger.error(`Failed to initialize bot: ${err.message}`, 'STARTUP');
        process.exit(1);
    }
}

/**
 * Initialize invite tracking for all guilds
 * @param {Client} client - Discord client
 */
async function initializeInviteTracking(client) {
    const checkInterval = parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5;
    const intervalMs = checkInterval * 60 * 1000;
    
    const inviteEnabled = process.env.INVITE_SYSTEM_ENABLED === 'true';
    
    if (!inviteEnabled) {
        logger.info('Invite system is globally disabled in .env', 'INVITE_TRACKING');
        return;
    }
    
    // For each guild, fetch and cache invites
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            // Fetch initial invites
            await InviteTracker.fetchAndCacheInvites(guild);
            
            // Set up periodic sync
            const interval = setInterval(async () => {
                try {
                    await InviteTracker.syncInvites(client, guildId);
                } catch (err) {
                    logger.error(`Error syncing invites for guild ${guildId}: ${err.message}`, 'INVITE_INTERVAL');
                }
            }, intervalMs);
            
            client.checkIntervals.set(guildId, interval);
            logger.info(`Invite tracking initialized for guild ${guild.name}`, 'INVITE_TRACKING');
            
            // Send test log message
            try {
                const GuildConfig = require('./database/models/GuildConfig');
                const config = await GuildConfig.getConfig(guildId);
                console.log('[TEST] Log channel ID:', config.inviteSystem.logChannelId);
                if (config.inviteSystem.logChannelId) {
                    const channel = client.channels.cache.get(config.inviteSystem.logChannelId);
                    console.log('[TEST] Channel found:', !!channel);
                    if (channel) {
                        const { EmbedBuilder } = require('discord.js');
                        const testEmbed = new EmbedBuilder()
                            .setColor(0x57F287)
                            .setTitle('✅ Sistema de logs activo')
                            .setDescription('El sistema de logging de invitaciones está funcionando correctamente.')
                            .addFields(
                                { name: '📊 Canal', value: `Logs se enviarán a este canal`, inline: true }
                            )
                            .setTimestamp();
                        await channel.send({ embeds: [testEmbed] });
                        logger.success(`Test log message sent to channel ${config.inviteSystem.logChannelId}`, 'STARTUP');
                    } else {
                        console.log('[TEST] Channel not found in cache. Attempting to fetch...');
                        try {
                            const fetchedChannel = await client.channels.fetch(config.inviteSystem.logChannelId);
                            console.log('[TEST] Fetched channel:', !!fetchedChannel);
                            if (fetchedChannel) {
                                const { EmbedBuilder } = require('discord.js');
                                const testEmbed = new EmbedBuilder()
                                    .setColor(0x57F287)
                                    .setTitle('✅ Sistema de logs activo')
                                    .setDescription('El sistema de logging de invitaciones está funcionando correctamente.')
                                    .setTimestamp();
                                await fetchedChannel.send({ embeds: [testEmbed] });
                                logger.success(`Test log message sent (fetched) to channel ${config.inviteSystem.logChannelId}`, 'STARTUP');
                            }
                        } catch (fetchErr) {
                            console.log('[TEST] Failed to fetch channel:', fetchErr.message);
                        }
                    }
                }
            } catch (err) {
                console.log('[TEST] Failed to send test log:', err.message);
                logger.error(`Failed to send test log: ${err.message}`, 'STARTUP');
            }
            
        } catch (err) {
            logger.error(`Failed to initialize invite tracking for guild ${guildId}: ${err.message}`, 'INVITE_TRACKING');
        }
    }
}

/**
 * Clean up intervals when bot disconnects
 */
process.on('SIGINT', async () => {
    logger.warn('Shutting down bot...', 'SHUTDOWN');
    
    // Clear all intervals
    client.checkIntervals.forEach((interval, guildId) => {
        clearInterval(interval);
        logger.info(`Cleared interval for guild ${guildId}`, 'SHUTDOWN');
    });
    
    // Disconnect from MongoDB
    await database.disconnect();
    
    // Destroy client
    client.destroy();
    
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught exception: ${err.message}`, 'PROCESS');
    if (process.env.DEBUG_MODE === 'true') {
        logger.debug(err.stack, 'PROCESS');
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error(`Unhandled rejection: ${reason}`, 'PROCESS');
});

// Handle guild create (when bot joins a new guild)
client.on('guildCreate', async (guild) => {
    logger.info(`Bot added to guild: ${guild.name} (${guild.id})`, 'GUILD_CREATE');
    
    // Initialize invite tracking for new guild
    try {
        await InviteTracker.fetchAndCacheInvites(guild);
        
        const checkInterval = parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5;
        const intervalMs = checkInterval * 60 * 1000;
        
        const interval = setInterval(async () => {
            try {
                await InviteTracker.syncInvites(client, guild.id);
            } catch (err) {
                logger.error(`Error syncing invites for guild ${guild.id}: ${err.message}`, 'INVITE_INTERVAL');
            }
        }, intervalMs);
        
        client.checkIntervals.set(guild.id, interval);
        logger.info(`Invite tracking initialized for new guild: ${guild.name}`, 'GUILD_CREATE');
        
    } catch (err) {
        logger.error(`Failed to initialize invite tracking for new guild: ${err.message}`, 'GUILD_CREATE');
    }
});

// Handle guild delete (when bot is removed from a guild)
client.on('guildDelete', (guild) => {
    logger.info(`Bot removed from guild: ${guild.name} (${guild.id})`, 'GUILD_DELETE');
    
    // Clear interval for this guild
    const interval = client.checkIntervals.get(guild.id);
    if (interval) {
        clearInterval(interval);
        client.checkIntervals.delete(guild.id);
    }
});

// Start the bot
init();
