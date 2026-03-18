/**
 * GuildConfig Model
 * Stores guild-specific configuration
 */

const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Invite system settings
    inviteSystem: {
        enabled: {
            type: Boolean,
            default: true
        },
        checkInterval: {
            type: Number,
            default: 5
        },
        notifyViaDM: {
            type: Boolean,
            default: true
        },
        notificationChannelId: {
            type: String,
            default: null
        },
        logChannelId: {
            type: String,
            default: null
        }
    },
    // Anti-abuse settings
    antiAbuse: {
        minAccountAge: {
            type: Number,
            default: 0 // in minutes, 0 = disabled
        },
        fakeJoinTimeout: {
            type: Number,
            default: 5 // in minutes
        }
    },
    // Role tiers for invite rewards
    tiers: [{
        invites: Number,
        roleId: String,
        roleName: String
    }],
    // Cached data
    cachedInvites: {
        type: Map,
        of: Number,
        default: {}
    },
    // Metadata
    lastSync: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Ensure tiers are sorted
guildConfigSchema.pre('save', function(next) {
    if (this.tiers && this.tiers.length > 1) {
        this.tiers.sort((a, b) => a.invites - b.invites);
    }
    next();
});

/**
 * Get configuration for a guild safely
 */
guildConfigSchema.statics.getConfig = async function(guildId) {
    try {
        let config = await this.findOne({ guildId });
        
        if (!config) {
            // Create new config with default values
            config = new this({
                guildId,
                inviteSystem: {
                    enabled: true,
                    checkInterval: 5,
                    notifyViaDM: true,
                    notificationChannelId: null,
                    logChannelId: '1245790414393573478'  // Default log channel
                },
                antiAbuse: {
                    minAccountAge: 0,
                    fakeJoinTimeout: 5
                },
                tiers: [],
                cachedInvites: {},
                lastSync: null
            });
            await config.save();
        } else {
            // Update existing config if logChannelId is not set
            if (!config.inviteSystem.logChannelId) {
                config.inviteSystem.logChannelId = '1245790414393573478';
                await config.save();
                console.log('[GuildConfig] Updated logChannelId for guild:', guildId);
            }
        }
        
        return config;
    } catch (err) {
        if (err.code === 11000) {
            // Another process created it, just fetch it
            return await this.findOne({ guildId });
        }
        throw err;
    }
};

/**
 * Update tier
 */
guildConfigSchema.statics.setTier = async function(guildId, invites, roleId, roleName) {
    const config = await this.getConfig(guildId);
    
    const existingIndex = config.tiers.findIndex(t => t.invites === invites);
    
    if (existingIndex >= 0) {
        config.tiers[existingIndex] = { invites, roleId, roleName };
    } else {
        config.tiers.push({ invites, roleId, roleName });
    }
    
    config.tiers.sort((a, b) => a.invites - b.invites);
    await config.save();
    
    return config;
};

/**
 * Remove tier
 */
guildConfigSchema.statics.removeTier = async function(guildId, invites) {
    const config = await this.getConfig(guildId);
    config.tiers = config.tiers.filter(t => t.invites !== invites);
    await config.save();
    
    return config;
};

/**
 * Get role for invite count
 */
guildConfigSchema.statics.getRoleForInvites = async function(guildId, inviteCount) {
    const config = await this.getConfig(guildId);
    
    if (!config.inviteSystem.enabled) return null;
    
    for (let i = config.tiers.length - 1; i >= 0; i--) {
        if (inviteCount >= config.tiers[i].invites) {
            return config.tiers[i];
        }
    }
    
    return null;
};

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
