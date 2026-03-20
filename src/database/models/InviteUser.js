/**
 * InviteUser Model
 * Stores invite tracking data for each user
 */

const mongoose = require('mongoose');

const inviteUserSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    inviterId: {
        type: String,
        default: null
    },
    inviteCode: {
        type: String,
        default: null
    },
    // Invite counts
    regularInvites: {
        type: Number,
        default: 0
    },
    bonusInvites: {
        type: Number,
        default: 0
    },
    fakeJoins: {
        type: Number,
        default: 0
    },
    left: {
        type: Number,
        default: 0
    },
    // Timestamps
    firstJoin: {
        type: Date,
        default: null
    },
    lastJoin: {
        type: Date,
        default: null
    },
    lastLeave: {
        type: Date,
        default: null
    },
    // Metadata
    isFake: {
        type: Boolean,
        default: false
    },
    isBonus: {
        type: Boolean,
        default: false
    },
    // History
    joinHistory: [{
        date: Date,
        inviterId: String,
        inviteCode: String,
        type: String // 'join', 'leave', 'fake'
    }]
}, {
    timestamps: true
});

// Compound index for efficient queries - use sparse to allow nulls
inviteUserSchema.index({ guildId: 1, userId: 1 }, { unique: true, sparse: true });

// Virtual for total invites
// Total = regular invites + bonus invites (fakes and lefts are tracked separately but don't reduce the count)
inviteUserSchema.virtual('totalInvites').get(function() {
    return Math.max(0, (this.regularInvites || 0) + (this.bonusInvites || 0));
});

// Ensure virtuals are included in JSON
inviteUserSchema.set('toJSON', { virtuals: true });
inviteUserSchema.set('toObject', { virtuals: true });

/**
 * Find or create user invite data safely using upsert
 */
inviteUserSchema.statics.findOrCreate = async function(guildId, userId) {
    try {
        let user = await this.findOne({ guildId, userId });
        
        if (!user) {
            user = await this.findOneAndUpdate(
                { guildId, userId },
                { 
                    $setOnInsert: { 
                        guildId, 
                        userId,
                        regularInvites: 0,
                        bonusInvites: 0,
                        fakeJoins: 0,
                        left: 0
                    }
                },
                { 
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
        }
        
        return user;
    } catch (err) {
        // Handle duplicate key error
        if (err.code === 11000) {
            // Another process created it, just fetch it
            return await this.findOne({ guildId, userId });
        }
        throw err;
    }
};

/**
 * Get leaderboard for a guild
 */
inviteUserSchema.statics.getLeaderboard = async function(guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ regularInvites: -1, bonusInvites: -1 })
        .limit(limit);
};

module.exports = mongoose.model('InviteUser', inviteUserSchema);
