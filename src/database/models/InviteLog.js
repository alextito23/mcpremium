/**
 * InviteLog Model
 * Stores invite action logs
 */

const mongoose = require('mongoose');

const inviteLogSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: ['join', 'leave', 'bonus_add', 'bonus_remove', 'fake_detected', 'role_assigned', 'role_removed', 'invite_update']
    },
    userId: {
        type: String,
        required: true
    },
    targetUserId: {
        type: String,
        default: null
    },
    inviterId: {
        type: String,
        default: null
    },
    inviteCode: {
        type: String,
        default: null
    },
    inviteCount: {
        type: Number,
        default: null
    },
    previousCount: {
        type: Number,
        default: null
    },
    roleId: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Index for efficient queries
inviteLogSchema.index({ guildId: 1, createdAt: -1 });
inviteLogSchema.index({ userId: 1, createdAt: -1 });

/**
 * Log an invite action
 */
inviteLogSchema.statics.log = async function(data) {
    try {
        return await this.create(data);
    } catch (err) {
        console.error('Failed to create log:', err);
        return null;
    }
};

/**
 * Get recent logs for a guild
 */
inviteLogSchema.statics.getRecentLogs = async function(guildId, limit = 50) {
    return this.find({ guildId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Get logs for a specific user
 */
inviteLogSchema.statics.getUserLogs = async function(guildId, userId, limit = 20) {
    return this.find({ guildId, userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model('InviteLog', inviteLogSchema);
