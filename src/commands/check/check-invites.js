/**
 * Check Invites Command
 * Allows users to check their current invite count and status
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const InviteTracker = require('../../services/InviteTracker');
const GuildConfig = require('../../database/models/GuildConfig');
const embedBuilder = require('../../utils/embedBuilder');
const logger = require('../../utils/logger');

/**
 * Create the slash command definition
 */
const data = new SlashCommandBuilder()
    .setName('mis-invitaciones')
    .setDescription('Verifica tu cantidad de invitaciones y estado de roles')
    .addUserOption(option =>
        option
            .setName('usuario')
            .setDescription('Usuario a verificar (opcional, por defecto tú mismo)')
    );

/**
 * Execute the command
 * @param {Client} client - Discord client
 * @param {CommandInteraction} interaction - Command interaction
 */
async function execute(client, interaction) {
    const guildId = interaction.guildId;
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    try {
        // Get config
        const config = await GuildConfig.getConfig(guildId);
        
        // Check if system is enabled
        if (!config.inviteSystem.enabled) {
            const embed = embedBuilder.warning(
                'Sistema desactivado',
                'El sistema de invitaciones está actualmente desactivado en este servidor.'
            );
            return await interaction.reply({ embeds: [embed] });
        }
        
        // Get user invites
        const invites = await InviteTracker.getUserInvites(guildId, targetUser.id);
        
        // Get tier info
        const currentTier = await GuildConfig.getRoleForInvites(guildId, invites.total);
        
        // Create the embed
        const embed = embedBuilder.neutral(
            `📊 Invitaciones de ${targetUser.username}`,
            `Información sobre las invitaciones de **${targetUser.toString()}**`
        );
        
        // Add invite counts
        embed.addFields(
            { name: '📈 Total', value: `**${invites.total}**`, inline: true },
            { name: '✅ Regulares', value: `**${invites.regular}**`, inline: true },
            { name: '⭐ Bonus', value: `**${invites.bonus}**`, inline: true }
        );
        
        // Add fake/leave info
        if (invites.fake > 0 || invites.left > 0) {
            embed.addFields(
                { name: '⚠️ Fakes', value: `**${invites.fake}**`, inline: true },
                { name: '👋 Abandonados', value: `**${invites.left}**`, inline: true }
            );
        }
        
        // Add inviter info
        if (invites.inviterId) {
            const inviter = await interaction.guild.members.fetch(invites.inviterId).catch(() => null);
            const inviterName = inviter ? inviter.user.username : `Usuario ${invites.inviterId}`;
            embed.addFields(
                { name: '👤 Invitado por', value: inviterName, inline: false }
            );
        }
        
        // Add current role status
        if (currentTier && targetMember) {
            const hasRole = targetMember.roles.cache.has(currentTier.roleId);
            
            embed.addFields(
                { 
                    name: '🎭 Rol actual', 
                    value: hasRole ? `✅ **${currentTier.roleName}**` : `❌ **${currentTier.roleName}** (pendiente)`, 
                    inline: false 
                }
            );
        }
        
        // Show next tier info
        const nextTier = config.tiers.find(t => t.invites > invites.total);
        if (nextTier) {
            const remaining = nextTier.invites - invites.total;
            embed.addFields(
                { 
                    name: '🎯 Siguiente nivel', 
                    value: `**${nextTier.roleName}** en ${remaining} invitaciones más`, 
                    inline: false 
                }
            );
        } else if (currentTier) {
            embed.addFields(
                { 
                    name: '🎉 ¡Máximo nivel alcanzado!', 
                    value: 'Has alcanzado el nivel más alto de invitaciones', 
                    inline: false 
                }
            );
        }
        
        // Add tier progress
        if (config.tiers.length > 0) {
            const progressFields = config.tiers.map(tier => {
                const hasRole = targetMember?.roles.cache.has(tier.roleId);
                const status = hasRole ? '✅' : invites.total >= tier.invites ? '🔄' : '⬜';
                return `${status} ${tier.invites} → ${tier.roleName}`;
            });
            
            embed.addFields(
                { name: '📋 Progreso', value: progressFields.join('\n') }
            );
        }
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (err) {
        logger.error(`Check invites error: ${err.message}`, 'COMMAND');
        
        const embed = embedBuilder.error(
            'Error',
            'No se pudieron obtener las invitaciones'
        );
        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = {
    data,
    execute
};
