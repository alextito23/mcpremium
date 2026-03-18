/**
 * Command Handler
 * Loads and manages all slash commands
 */

const { readdirSync } = require('fs');
const { join } = require('path');
const logger = require('../utils/logger');

// Collection to store commands
const commands = new Map();

/**
 * Load all commands from the commands directory
 * @param {Client} client - Discord client
 */
function loadCommands(client) {
    const commandsPath = join(__dirname, '..', 'commands');
    
    // Command categories (subdirectories)
    const categories = ['config', 'check', 'info'];
    
    for (const category of categories) {
        const categoryPath = join(commandsPath, category);
        
        try {
            const files = readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            for (const file of files) {
                const command = require(join(categoryPath, file));
                
                // Validate command structure
                if (!command.data || !command.data.name) {
                    logger.warn(`Command file ${file} is missing required properties`, 'COMMAND_HANDLER');
                    continue;
                }
                
                // Store command
                commands.set(command.data.name, command);
                
                // Set command in client for easy access
                if (!client.commands) {
                    client.commands = new Map();
                }
                client.commands.set(command.data.name, command);
                
                logger.info(`Loaded command: /${command.data.name}`, 'COMMAND_HANDLER');
            }
        } catch (err) {
            // Directory might not exist, that's ok
            logger.debug(`Category ${category} not found or empty`, 'COMMAND_HANDLER');
        }
    }
    
    logger.success(`Loaded ${commands.size} commands total`, 'COMMAND_HANDLER');
    return commands;
}

/**
 * Get all loaded commands
 * @returns {Map} Commands map
 */
function getCommands() {
    return commands;
}

/**
 * Get a specific command
 * @param {string} name - Command name
 * @returns {Object|null} Command object
 */
function getCommand(name) {
    return commands.get(name);
}

/**
 * Get commands by category
 * @param {string} category - Category name
 * @returns {Array} Array of commands in category
 */
function getCommandsByCategory(category) {
    const result = [];
    const categoryPath = join(__dirname, '..', 'commands', category);
    
    try {
        const files = readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        for (const file of files) {
            const command = require(join(categoryPath, file));
            if (command.data && command.data.name) {
                result.push(command);
            }
        }
    } catch (err) {
        // Directory might not exist
    }
    
    return result;
}

module.exports = {
    loadCommands,
    getCommands,
    getCommand,
    getCommandsByCategory
};
