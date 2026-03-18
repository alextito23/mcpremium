/**
 * Configuration Manager
 * Manages the invite role system configuration
 * Stores invite tiers, role mappings, and system settings
 */

const logger = require('./logger');

// Default configuration structure
const defaultConfig = {
    // Whether the invite system is enabled
    enabled: true,
    
    // Array of invite tiers
    // Each tier has: invites (number), roleId (string), roleName (string)
    tiers: [],
    
    // Settings
    settings: {
        // Check interval in minutes
        checkInterval: 5,
        // Notify via DM (true) or channel (false)
        notifyViaDM: true,
        // Channel ID for notifications (if not set, uses system channel)
        notificationChannelId: null
    }
};

// Server-specific configurations (for multi-server support)
const serverConfigs = new Map();

/**
 * Initialize configuration for a guild
 * @param {string} guildId - Discord guild ID
 */
function initGuildConfig(guildId) {
    if (!serverConfigs.has(guildId)) {
        serverConfigs.set(guildId, JSON.parse(JSON.stringify(defaultConfig)));
        logger.info(`Initialized configuration for guild: ${guildId}`, 'CONFIG');
    }
    return serverConfigs.get(guildId);
}

/**
 * Get configuration for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Object} Guild configuration
 */
function getConfig(guildId) {
    if (!serverConfigs.has(guildId)) {
        initGuildConfig(guildId);
    }
    return serverConfigs.get(guildId);
}

/**
 * Set the entire configuration for a guild
 * @param {string} guildId - Discord guild ID
 * @param {Object} config - New configuration
 */
function setConfig(guildId, config) {
    serverConfigs.set(guildId, config);
    logger.success(`Configuration updated for guild: ${guildId}`, 'CONFIG');
}

/**
 * Enable or disable the invite system
 * @param {string} guildId - Discord guild ID
 * @param {boolean} enabled - Enable or disable
 */
function setEnabled(guildId, enabled) {
    const config = getConfig(guildId);
    config.enabled = enabled;
    logger.info(`Invite system ${enabled ? 'enabled' : 'disabled'} for guild: ${guildId}`, 'CONFIG');
}

/**
 * Check if the invite system is enabled for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {boolean} Whether the system is enabled
 */
function isEnabled(guildId) {
    const config = getConfig(guildId);
    return config.enabled;
}

/**
 * Add or update an invite tier
 * @param {string} guildId - Discord guild ID
 * @param {number} invites - Number of invites required
 * @param {string} roleId - Role ID to assign
 * @param {string} roleName - Role name (for logging/display)
 */
function setTier(guildId, invites, roleId, roleName) {
    const config = getConfig(guildId);
    
    // Check if tier already exists
    const existingIndex = config.tiers.findIndex(t => t.invites === invites);
    
    const tier = { invites, roleId, roleName };
    
    if (existingIndex >= 0) {
        config.tiers[existingIndex] = tier;
        logger.info(`Updated tier: ${invites} invites -> ${roleName}`, 'CONFIG');
    } else {
        config.tiers.push(tier);
        logger.info(`Added new tier: ${invites} invites -> ${roleName}`, 'CONFIG');
    }
    
    // Sort tiers by invites (ascending)
    config.tiers.sort((a, b) => a.invites - b.invites);
}

/**
 * Remove an invite tier
 * @param {string} guildId - Discord guild ID
 * @param {number} invites - Number of invites required
 */
function removeTier(guildId, invites) {
    const config = getConfig(guildId);
    const initialLength = config.tiers.length;
    config.tiers = config.tiers.filter(t => t.invites !== invites);
    
    if (config.tiers.length < initialLength) {
        logger.info(`Removed tier for ${invites} invites`, 'CONFIG');
        return true;
    }
    return false;
}

/**
 * Get all tiers for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Array} Array of tier objects
 */
function getTiers(guildId) {
    const config = getConfig(guildId);
    return config.tiers;
}

/**
 * Get the appropriate role for a given invite count
 * @param {string} guildId - Discord guild ID
 * @param {number} inviteCount - Number of invites
 * @returns {Object|null} Tier object or null if no match
 */
function getRoleForInvites(guildId, inviteCount) {
    const config = getConfig(guildId);
    
    if (!config.enabled) return null;
    
    // Find the highest tier that the user qualifies for
    // We iterate in reverse to get the highest tier first
    for (let i = config.tiers.length - 1; i >= 0; i--) {
        if (inviteCount >= config.tiers[i].invites) {
            return config.tiers[i];
        }
    }
    
    return null;
}

/**
 * Update settings for a guild
 * @param {string} guildId - Discord guild ID
 * @param {Object} settings - Settings object to merge
 */
function updateSettings(guildId, settings) {
    const config = getConfig(guildId);
    config.settings = { ...config.settings, ...settings };
    logger.info(`Updated settings for guild: ${guildId}`, 'CONFIG');
}

/**
 * Get settings for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {Object} Settings object
 */
function getSettings(guildId) {
    const config = getConfig(guildId);
    return config.settings;
}

/**
 * Get the notification channel for a guild
 * @param {string} guildId - Discord guild ID
 * @returns {string|null} Channel ID or null
 */
function getNotificationChannel(guildId) {
    const config = getConfig(guildId);
    return config.settings.notificationChannelId;
}

/**
 * Clear all configuration for a guild
 * @param {string} guildId - Discord guild ID
 */
function clearConfig(guildId) {
    serverConfigs.delete(guildId);
    logger.warn(`Cleared configuration for guild: ${guildId}`, 'CONFIG');
}

/**
 * Get all configurations (for debugging)
 * @returns {Map} Map of all configurations
 */
function getAllConfigs() {
    return serverConfigs;
}

module.exports = {
    initGuildConfig,
    getConfig,
    setConfig,
    setEnabled,
    isEnabled,
    setTier,
    removeTier,
    getTiers,
    getRoleForInvites,
    updateSettings,
    getSettings,
    getNotificationChannel,
    clearConfig,
    getAllConfigs,
    defaultConfig
};
