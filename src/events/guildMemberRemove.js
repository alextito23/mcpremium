/**
 * Guild Member Remove Event
 * Triggered when a member leaves the server
 */

const logger = require('../utils/logger');
const InviteTracker = require('../services/InviteTracker');

/**
 * Handle member leave event
 * @param {Client} client - Discord client
 * @param {GuildMember} member - Leaving member
 */
async function execute(client, member) {
    try {
        await InviteTracker.handleMemberLeave(client, member);
    } catch (err) {
        logger.error(`Error handling member leave: ${err.message}`, 'MEMBER_LEAVE');
    }
}

module.exports = {
    name: 'guildMemberRemove',
    execute
};
