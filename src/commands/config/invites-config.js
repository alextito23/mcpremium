/**
 * Invites Config Command
 * Main configuration command for the invite role system
 * Allows admins to configure tiers, roles, and system settings
 */

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../database/models/GuildConfig');
const InviteTracker = require('../../services/InviteTracker');
const logger = require('../../utils/logger');

/**
 * Create the slash command definition
 */
const data = new SlashCommandBuilder()
    .setName('invites-config')
    .setDescription('Configura el sistema de roles por invitaciones')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('ver')
            .setDescription('Ver la configuración actual del sistema')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('agregar')
            .setDescription('Agregar un nuevo nivel de invitación')
            .addIntegerOption(option =>
                option
                    .setName('invitaciones')
                    .setDescription('Número de invitaciones requeridas')
                    .setRequired(true)
                    .setMinValue(1)
            )
            .addRoleOption(option =>
                option
                    .setName('rol')
                    .setDescription('Rol que se otorgará al alcanzar las invitaciones')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('eliminar')
            .setDescription('Eliminar un nivel de invitación')
            .addIntegerOption(option =>
                option
                    .setName('invitaciones')
                    .setDescription('Número de invitaciones del nivel a eliminar')
                    .setRequired(true)
                    .setMinValue(1)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('activar')
            .setDescription('Activar el sistema de roles por invitaciones')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('desactivar')
            .setDescription('Desactivar el sistema de roles por invitaciones')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('notificaciones')
            .setDescription('Configurar cómo recibir las notificaciones')
            .addBooleanOption(option =>
                option
                    .setName('dm')
                    .setDescription('¿Enviar notificaciones por DM? (false = canal del servidor)')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('logs')
            .setDescription('Configurar canal de logs para entradas/salidas')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Canal para logs (dejar vacío para desactivar)')
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('antiabuso')
            .setDescription('Configurar protecciones anti-abuso')
            .addIntegerOption(option =>
                option
                    .setName('edadminima')
                    .setDescription('Edad mínima de cuenta en minutos para unirse')
                    .setMinValue(0)
                    .setMaxValue(525600)
            )
            .addIntegerOption(option =>
                option
                    .setName('timeoutfake')
                    .setDescription('Timeout para detectar fakes en minutos')
                    .setMinValue(1)
                    .setMaxValue(60)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('sync')
            .setDescription('Sincronizar invitaciones desde Discord')
    );

/**
 * Helper function to create success embed
 */
function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Helper function to create error embed
 */
function errorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Helper function to create warning embed
 */
function warningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Helper function to create info embed
 */
function infoEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create invite tiers embed
 */
function inviteTiersEmbed(tiers, enabled) {
    const embed = new EmbedBuilder()
        .setColor(enabled ? 0x57F287 : 0x95A5A6)
        .setTitle(enabled ? '📊 Sistema de Invitaciones' : '📊 Sistema de Invitaciones (Desactivado)')
        .setTimestamp();
    
    if (tiers.length === 0) {
        embed.setDescription('No hay niveles configurados aún.');
    } else {
        const tierFields = tiers.map((tier, index) => ({
            name: `Nivel ${index + 1}: ${tier.invites} invitaciones`,
            value: `🎭 Rol: **${tier.roleName}**`,
            inline: true
        }));
        embed.addFields(tierFields);
    }
    
    return embed;
}

/**
 * Execute the command
 * @param {Client} client - Discord client
 * @param {CommandInteraction} interaction - Command interaction
 */
async function execute(client, interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    
    // Handle each subcommand
    switch (subcommand) {
        case 'ver':
            return await showConfig(interaction, guildId);
        case 'agregar':
            return await addTier(interaction, guildId);
        case 'eliminar':
            return await removeTier(interaction, guildId);
        case 'activar':
            return await toggleSystem(interaction, guildId, true);
        case 'desactivar':
            return await toggleSystem(interaction, guildId, false);
        case 'notificaciones':
            return await setNotifications(interaction, guildId);
        case 'logs':
            return await setLogs(interaction, guildId);
        case 'antiabuso':
            return await setAntiAbuse(interaction, guildId);
        case 'sync':
            return await syncInvites(client, interaction, guildId);
        default:
            return await interaction.reply({
                embeds: [errorEmbed('Comando desconocido', 'Subcomando no reconocido')],
                ephemeral: true
            });
    }
}

/**
 * Show current configuration
 */
async function showConfig(interaction, guildId) {
    const config = await GuildConfig.getConfig(guildId);
    
    const embed = inviteTiersEmbed(config.tiers, config.inviteSystem.enabled);
    
    // Add settings info
    embed.addFields(
        { name: '📬 Notificaciones', value: config.inviteSystem.notifyViaDM ? '💬 DM' : '📢 Canal', inline: true },
        { name: '⏱️ Intervalo', value: `${config.inviteSystem.checkInterval} min`, inline: true },
        { name: '📝 Canal Logs', value: config.inviteSystem.logChannelId ? `<#${config.inviteSystem.logChannelId}>` : '❌ No configurado', inline: false }
    );
    
    // Anti-abuse info
    const antiAbuse = config.antiAbuse;
    const ageText = antiAbuse.minAccountAge > 0 
        ? `${antiAbuse.minAccountAge} min` 
        : 'Desactivado';
    
    embed.addFields(
        { name: '🛡️ Anti-abuso', value: `Edad mínima: ${ageText}\nFake timeout: ${antiAbuse.fakeJoinTimeout} min`, inline: false }
    );
    
    await interaction.reply({ embeds: [embed] });
}

/**
 * Add a new invite tier
 */
async function addTier(interaction, guildId) {
    const invites = interaction.options.getInteger('invitaciones');
    const role = interaction.options.getRole('rol');
    
    const config = await GuildConfig.getConfig(guildId);
    
    // Check if tier already exists
    const existingTier = config.tiers.find(t => t.invites === invites);
    if (existingTier) {
        const embed = warningEmbed(
            'Nivel ya existe',
            `Ya existe un nivel para ${invites} invitaciones con el rol **${existingTier.roleName}**. Elimínalo primero si quieres cambiarlo.`
        );
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // Add new tier
    config.tiers.push({
        invites: invites,
        roleId: role.id,
        roleName: role.name
    });
    
    // Sort tiers by invites (ascending)
    config.tiers.sort((a, b) => a.invites - b.invites);
    
    await config.save();
    
    const embed = successEmbed(
        'Nivel agregado',
        `Se ha añadido el nivel: **${invites} invitaciones** → **${role.name}**`
    );
    
    await interaction.reply({ embeds: [embed] });
}

/**
 * Remove an invite tier
 */
async function removeTier(interaction, guildId) {
    const invites = interaction.options.getInteger('invitaciones');
    
    const config = await GuildConfig.getConfig(guildId);
    
    // Find tier
    const tierIndex = config.tiers.findIndex(t => t.invites === invites);
    
    if (tierIndex === -1) {
        const embed = errorEmbed(
            'Nivel no encontrado',
            `No hay ningún nivel configurado para ${invites} invitaciones.`
        );
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    const removedTier = config.tiers[tierIndex];
    config.tiers.splice(tierIndex, 1);
    
    await config.save();
    
    const embed = successEmbed(
        'Nivel eliminado',
        `Se ha eliminado el nivel: **${invites} invitaciones** → **${removedTier.roleName}**`
    );
    
    await interaction.reply({ embeds: [embed] });
}

/**
 * Toggle system enabled/disabled
 */
async function toggleSystem(interaction, guildId, enabled) {
    const config = await GuildConfig.getConfig(guildId);
    
    config.inviteSystem.enabled = enabled;
    await config.save();
    
    if (enabled) {
        const embed = successEmbed('Sistema activado', 'El sistema de invitaciones ha sido activado');
        await interaction.reply({ embeds: [embed] });
    } else {
        const embed = warningEmbed('Sistema desactivado', 'El sistema de invitaciones ha sido desactivado');
        await interaction.reply({ embeds: [embed] });
    }
}

/**
 * Set notification preferences
 */
async function setNotifications(interaction, guildId) {
    const dm = interaction.options.getBoolean('dm');
    
    const config = await GuildConfig.getConfig(guildId);
    config.inviteSystem.notifyViaDM = dm;
    await config.save();
    
    const embed = successEmbed(
        'Notificaciones configuradas',
        dm ? '📬 Las notificaciones se enviarán por DM' : '📢 Las notificaciones se enviarán al canal del servidor'
    );
    
    await interaction.reply({ embeds: [embed] });
}

/**
 * Set logs channel
 */
async function setLogs(interaction, guildId) {
    const channel = interaction.options.getChannel('canal');
    
    const config = await GuildConfig.getConfig(guildId);
    
    if (channel) {
        config.inviteSystem.logChannelId = channel.id;
        
        const embed = successEmbed(
            'Canal de logs configurado',
            `Los logs de entradas/salidas se enviarán al canal ${channel}`
        );
    } else {
        config.inviteSystem.logChannelId = null;
        
        const embed = warningEmbed(
            'Logs desactivados',
            'Los logs de entradas/salidas no se enviarán a ningún canal'
        );
    }
    
    await config.save();
    await interaction.reply({ embeds: [embed] });
}

/**
 * Set anti-abuse settings
 */
async function setAntiAbuse(interaction, guildId) {
    const minAge = interaction.options.getInteger('edadminima');
    const fakeTimeout = interaction.options.getInteger('timeoutfake');
    
    const config = await GuildConfig.getConfig(guildId);
    
    if (minAge !== null) {
        config.antiAbuse.minAccountAge = minAge;
    }
    
    if (fakeTimeout !== null) {
        config.antiAbuse.fakeJoinTimeout = fakeTimeout;
    }
    
    await config.save();
    
    const embed = successEmbed(
        'Anti-abuso configurado',
        `Edad mínima: ${config.antiAbuse.minAccountAge} minutos\nTimeout fake: ${config.antiAbuse.fakeJoinTimeout} minutos`
    );
    
    await interaction.reply({ embeds: [embed] });
}

/**
 * Sync invites from Discord
 */
async function syncInvites(client, interaction, guildId) {
    const guild = client.guilds.cache.get(guildId);
    
    if (!guild) {
        const embed = errorEmbed('Error', 'No se pudo encontrar el servidor');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    try {
        await interaction.deferReply({ ephemeral: true });
        
        // Use the exported function directly, not a class instance
        await InviteTracker.syncInvites(client, guildId);
        
        const embed = successEmbed(
            'Sincronización completada',
            'Las invitaciones se han sincronizado correctamente desde Discord.'
        );
        
        await interaction.editReply({ embeds: [embed] });
    } catch (err) {
        const embed = errorEmbed(
            'Error de sincronización',
            `Error al sincronizar: ${err.message}`
        );
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = {
    data,
    execute
};
