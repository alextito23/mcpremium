/**
 * Bonus Invites Command
 * Add or remove bonus invites from a user
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const InviteTracker = require('../../services/InviteTracker');
const embedBuilder = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * Create the slash command definition
 */
const data = new SlashCommandBuilder()
    .setName('bonus-invites')
    .setDescription('Añadir o quitar invitaciones bonus a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option
            .setName('usuario')
            .setDescription('Usuario al que añadir/quitar bonus')
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName('cantidad')
            .setDescription('Cantidad de invites bonus (negativo para quitar)')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('razón')
            .setDescription('Razón del bonus (opcional)')
    );

/**
 * Execute the command
 * @param {Client} client - Discord client
 * @param {CommandInteraction} interaction - Command interaction
 */
async function execute(client, interaction) {
    const guildId = interaction.guildId;
    const user = interaction.options.getUser('usuario');
    const amount = interaction.options.getInteger('cantidad');
    const reason = interaction.options.getString('razón') || 'No especificada';

    try {
        const newTotal = await InviteTracker.addBonusInvites(client, guildId, user.id, amount, reason);

        const embed = amount > 0 
            ? embedBuilder.success(
                '✅ Bonus añadido',
                `Se han añadido **${amount}** invitaciones bonus a ${user.toString()}`
            )
            : embedBuilder.warning(
                '❌ Bonus eliminado',
                `Se han eliminado **${Math.abs(amount)}** invitaciones bonus de ${user.toString()}`
            );

        embed.addFields(
            { name: '📊 Nuevo total', value: `**${newTotal}** invitaciones`, inline: true },
            { name: '📝 Razón', value: reason, inline: true }
        );

        await interaction.reply({ embeds: [embed] });

    } catch (err) {
        logger.error(`Bonus error: ${err.message}`, 'COMMAND');
        
        const embed = embedBuilder.error(
            'Error',
            'No se pudieron modificar las invitaciones bonus'
        );
        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = {
    data,
    execute
};
