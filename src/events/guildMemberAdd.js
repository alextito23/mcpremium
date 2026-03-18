/**
 * Guild Member Add Event
 * Triggered when a member joins the server
 */

const logger = require('../utils/logger');
const InviteTracker = require('../services/InviteTracker');

/**
 * Handle member join event
 * @param {Client} client - Discord client
 * @param {GuildMember} member - New member
 */
async function execute(client, member) {
    try {
        await InviteTracker.handleMemberJoin(client, member);
    } catch (err) {
        logger.error(`Error handling member join: ${err.message}`, 'MEMBER_JOIN');
    }
}

module.exports = {
    name: 'guildMemberAdd',
    execute
};
