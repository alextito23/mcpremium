/**
 * Leaderboard Command
 * Shows the top invite earners in the server
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const InviteTracker = require('../../services/InviteTracker');
const embedBuilder = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * Create the slash command definition
 */
const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el ranking de invitaciones del servidor')
    .addIntegerOption(option =>
        option
            .setName('limite')
            .setDescription('Número de usuarios a mostrar (default: 10)')
            .setMinValue(1)
            .setMaxValue(25)
    );

/**
 * Execute the command
 * @param {Client} client - Discord client
 * @param {CommandInteraction} interaction - Command interaction
 */
async function execute(client, interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limite') || 10;

    try {
        const leaderboard = await InviteTracker.getLeaderboard(guildId, limit);

        if (leaderboard.length === 0) {
            const embed = embedBuilder.warning(
                '📊 Leaderboard vacío',
                'No hay datos de invitaciones aún. ¡Invita a amigos para aparecer en el ranking!'
            );
            return await interaction.reply({ embeds: [embed] });
        }

        const embed = embedBuilder.info(
            '🏆 Top Invitaciones',
            `Los ${leaderboard.length} mejores invitadores del servidor`
        );

        const fields = [];
        
        for (let i = 0; i < leaderboard.length; i++) {
            const user = leaderboard[i];
            const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
            const username = member ? member.user.username : `Usuario ${user.userId}`;
            
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            
            fields.push({
                name: `${medal} ${username}`,
                value: `**${user.regularInvites || 0}** invitaciones regulares + **${user.bonusInvites || 0}** bonus`,
                inline: false
            });
        }

        embed.addFields(fields);
        embed.setFooter({ text: 'Usa /mis-invitaciones para ver tu posición' });

        await interaction.reply({ embeds: [embed] });

    } catch (err) {
        logger.error(`Leaderboard error: ${err.message}`, 'COMMAND');
        
        const embed = embedBuilder.error(
            'Error',
            'No se pudo obtener el leaderboard'
        );
        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = {
    data,
    execute
};
