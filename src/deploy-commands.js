/**
 * Deploy Commands Script
 * Registers slash commands with Discord
 * Run this once to register commands, then use npm start
 */

require('dotenv').config();

const { REST, Routes, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const logger = require('./utils/logger');

// Collect all command data
const commands = [];
const commandsPath = join(__dirname, 'commands');

// Load commands from all categories
const categories = ['config', 'check', 'info'];

for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    
    try {
        const files = readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        for (const file of files) {
            const command = require(join(categoryPath, file));
            
            if (command.data) {
                commands.push(command.data.toJSON());
                logger.info(`Loaded command: /${command.data.name}`, 'DEPLOY');
            }
        }
    } catch (err) {
        // Directory might not exist
    }
}

async function deployCommands() {
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.APPLICATION_ID;
    const guildId = process.env.GUILD_ID;
    
    // Validate required environment variables
    if (!token || token === 'your_bot_token_here') {
        logger.error('Bot token not configured. Please add DISCORD_TOKEN to .env file', 'DEPLOY');
        process.exit(1);
    }
    
    if (!clientId || clientId === 'your_application_id_here') {
        logger.error('Application ID not configured. Please add APPLICATION_ID to .env file', 'DEPLOY');
        process.exit(1);
    }
    
    const rest = new REST({ version: '10' }).setToken(token);
    
    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands`, 'DEPLOY');
        
        if (guildId && guildId !== 'your_guild_id_here') {
            // Register commands for a specific guild (faster, for development)
            await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            
            logger.success(`Successfully registered ${commands.length} guild commands for guild ${guildId}`, 'DEPLOY');
        } else {
            // Register commands globally (slower, for production)
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            
            logger.success(`Successfully registered ${commands.length} global commands`, 'DEPLOY');
        }
        
        logger.info('Command deployment complete!', 'DEPLOY');
        process.exit(0);
        
    } catch (err) {
        logger.error(`Failed to deploy commands: ${err.message}`, 'DEPLOY');
        
        if (err.response) {
            logger.error(`Response data: ${JSON.stringify(err.response.data)}`, 'DEPLOY');
        }
        
        process.exit(1);
    }
}

deployCommands();
