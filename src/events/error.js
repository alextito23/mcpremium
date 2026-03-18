/**
 * Error Event
 * Handles Discord API errors
 */

const logger = require('../utils/logger');

/**
 * Handle errors
 * @param {Error} error - The error object
 */
function execute(error) {
    logger.error(`Discord API Error: ${error.message}`, 'ERROR');
    
    // Log stack trace in debug mode
    if (process.env.DEBUG_MODE === 'true' && error.stack) {
        logger.debug(error.stack, 'ERROR');
    }
}

module.exports = {
    name: 'error',
    execute
};
