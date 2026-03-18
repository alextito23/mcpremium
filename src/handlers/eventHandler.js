/**
 * Event Handler
 * Loads and manages all Discord events
 */

const { readdirSync } = require('fs');
const { join } = require('path');
const logger = require('../utils/logger');

/**
 * Load all events from the events directory
 * @param {Client} client - Discord client
 */
function loadEvents(client) {
    const eventsPath = join(__dirname, '..', 'events');
    
    try {
        const files = readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        for (const file of files) {
            const event = require(join(eventsPath, file));
            
            // Validate event structure
            if (!event.name || !event.execute) {
                logger.warn(`Event file ${file} is missing required properties`, 'EVENT_HANDLER');
                continue;
            }
            
            // Bind the event to the client
            if (event.once) {
                client.once(event.name, (...args) => event.execute(client, ...args));
            } else {
                client.on(event.name, (...args) => event.execute(client, ...args));
            }
            
            logger.info(`Loaded event: ${event.name}`, 'EVENT_HANDLER');
        }
        
        logger.success(`Loaded ${files.length} events total`, 'EVENT_HANDLER');
    } catch (err) {
        logger.error(`Failed to load events: ${err.message}`, 'EVENT_HANDLER');
    }
}

module.exports = {
    loadEvents
};
