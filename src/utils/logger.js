/**
 * Logger Utility
 * Handles all logging operations for the bot
 * Provides different log levels with timestamps and colors
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

/**
 * Get current timestamp in formatted string
 * @returns {string} Formatted timestamp
 */
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').replace('Z', '');
}

/**
 * Log info message
 * @param {string} message - Message to log
 * @param {string} [context] - Optional context for the log
 */
function info(message, context = 'INFO') {
    console.log(`${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.blue}[${context}]${colors.reset} ${message}`);
}

/**
 * Log success message
 * @param {string} message - Message to log
 * @param {string} [context] - Optional context for the log
 */
function success(message, context = 'SUCCESS') {
    console.log(`${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.green}[${context}]${colors.reset} ${message}`);
}

/**
 * Log warning message
 * @param {string} message - Message to log
 * @param {string} [context] - Optional context for the log
 */
function warn(message, context = 'WARNING') {
    console.log(`${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.yellow}[${context}]${colors.reset} ${message}`);
}

/**
 * Log error message
 * @param {string} message - Message to log
 * @param {string} [context] - Optional context for the log
 */
function error(message, context = 'ERROR') {
    console.log(`${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.red}[${context}]${colors.reset} ${message}`);
}

/**
 * Log debug message (only if DEBUG_MODE is enabled)
 * @param {string} message - Message to log
 * @param {string} [context] - Optional context for the log
 */
function debug(message, context = 'DEBUG') {
    if (process.env.DEBUG_MODE === 'true') {
        console.log(`${colors.cyan}[${getTimestamp()}]${colors.reset} ${colors.gray}[${context}]${colors.reset} ${colors.dim}${message}${colors.reset}`);
    }
}

/**
 * Log command usage
 * @param {string} commandName - Name of the command
 * @param {string} userId - ID of the user who used the command
 * @param {string} guildId - ID of the guild where command was used
 */
function logCommand(commandName, userId, guildId) {
    info(`Command executed: /${commandName} by user ${userId} in guild ${guildId}`, 'COMMAND');
}

/**
 * Log role assignment
 * @param {string} userId - ID of the user receiving the role
 * @param {string} roleId - ID of the role being assigned
 * @param {string} reason - Reason for assignment
 */
function logRoleAssignment(userId, roleId, reason) {
    success(`Role assigned: ${roleId} to user ${userId} - ${reason}`, 'ROLE');
}

module.exports = {
    info,
    success,
    warn,
    error,
    debug,
    logCommand,
    logRoleAssignment,
    colors
};
