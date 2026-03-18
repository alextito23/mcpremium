/**
 * Interaction Create Event
 * Handles all interactions (slash commands, buttons, etc.)
 */

const logger = require('../utils/logger');
const embedBuilder = require('../utils/embedBuilder');

/**
 * Handle interaction creation
 * @param {Client} client - Discord client
 * @param {Interaction} interaction - The interaction object
 */
async function execute(client, interaction) {
    // Only handle slash commands
    if (!interaction.isChatInputCommand()) {
        return;
    }

    // Get the command
    const command = client.commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Command not found: ${interaction.commandName}`, 'INTERACTION');
        return;
    }

    // Log command usage
    const guildId = interaction.guildId || 'DM';
    logger.logCommand(interaction.commandName, interaction.user.id, guildId);

    // Execute the command with error handling
    try {
        // Defer reply if the command might take a while
        await command.execute(client, interaction);
    } catch (err) {
        logger.error(`Error executing command /${command.data?.name || interaction.commandName}: ${err.message}`, 'INTERACTION');

        // Try to respond with an error embed
        try {
            const errorEmbed = embedBuilder.error(
                'Error en el comando',
                `Ha ocurrido un error: \`${err.message}\``
            );

            // Check if interaction was already replied
            if (interaction.replied) {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 }); // flags: 64 = ephemeral
            } else if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        } catch (replyErr) {
            logger.error(`Failed to send error response: ${replyErr.message}`, 'INTERACTION');
        }
    }
}

module.exports = {
    name: 'interactionCreate',
    execute
};
