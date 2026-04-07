require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, ModalBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const { DISCORD_TOKEN, GUILD_ID } = process.env;

const config = {
    vipRoleId: null,
    vipPlusRoleId: null,
    vipChannelId: null,
    vipPlusChannelId: null
};

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    await registerAllCommands();
    console.log('Comandos registrados');
});

async function registerAllCommands() {
    const guild = await client.guilds.fetch(GUILD_ID).catch(() => null);
    const isGlobal = !guild;

    const commands = [
        {
            name: 'sugerencia',
            description: 'Envía el embed principal del sistema de sugerencias',
            dmPermission: false
        },
        {
            name: 'set-rol-vip',
            description: 'Establece el rol de VIP',
            dmPermission: false,
            defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
            options: [
                { name: 'rol_id', description: 'ID del rol de VIP', type: 3, required: true }
            ]
        },
        {
            name: 'set-rol-vip-plus',
            description: 'Establece el rol de VIP+',
            dmPermission: false,
            defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
            options: [
                { name: 'rol_id', description: 'ID del rol de VIP+', type: 3, required: true }
            ]
        },
        {
            name: 'set-canal-vip',
            description: 'Establece el canal para sugerencias de VIP',
            dmPermission: false,
            defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
            options: [
                { name: 'canal_id', description: 'ID del canal para VIP', type: 3, required: true }
            ]
        },
        {
            name: 'set-canal-vip-plus',
            description: 'Establece el canal para sugerencias de VIP+',
            dmPermission: false,
            defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
            options: [
                { name: 'canal_id', description: 'ID del canal para VIP+', type: 3, required: true }
            ]
        }
    ];

    if (isGlobal) {
        for (const cmd of commands) {
            await client.application.commands.create(cmd);
        }
    } else {
        for (const cmd of commands) {
            await guild.commands.create(cmd);
        }
    }
}

function getUserRank(interaction) {
    const member = interaction.member;
    
    if (config.vipPlusRoleId && member.roles.cache.has(config.vipPlusRoleId)) {
        return 'vip_plus';
    }
    if (config.vipRoleId && member.roles.cache.has(config.vipRoleId)) {
        return 'vip';
    }
    return null;
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'sugerencia') {
        await handleSuggestionCommand(interaction);
    } else if (commandName === 'set-rol-vip') {
        config.vipRoleId = interaction.options.getString('rol_id');
        await interaction.reply({ content: `✅ Rol de VIP configurado: ${config.vipRoleId}`, ephemeral: true });
    } else if (commandName === 'set-rol-vip-plus') {
        config.vipPlusRoleId = interaction.options.getString('rol_id');
        await interaction.reply({ content: `✅ Rol de VIP+ configurado: ${config.vipPlusRoleId}`, ephemeral: true });
    } else if (commandName === 'set-canal-vip') {
        config.vipChannelId = interaction.options.getString('canal_id');
        await interaction.reply({ content: `✅ Canal de VIP configurado: ${config.vipChannelId}`, ephemeral: true });
    } else if (commandName === 'set-canal-vip-plus') {
        config.vipPlusChannelId = interaction.options.getString('canal_id');
        await interaction.reply({ content: `✅ Canal de VIP+ configurado: ${config.vipPlusChannelId}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'crear_sugerencia') {
        await handleSuggestionButton(interaction);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'sugerencia_modal') {
        await handleSuggestionSubmit(interaction);
    }
});

async function handleSuggestionCommand(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('💡 Sistema de Sugerencias')
        .setDescription('¿Tienes una idea para mejorar el servidor? ¡Tu opinión nos importa!\n\nUsa el botón de abajo para enviar tu sugerencia.')
        .setColor(0x5865F2)
        .setFooter({ text: 'Todas las sugerencias son revisadas por el staff' });

    const button = new ButtonBuilder()
        .setCustomId('crear_sugerencia')
        .setLabel('Crear Sugerencia')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('💭');

    const row = new ActionRowBuilder().addComponents(button);
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleSuggestionButton(interaction) {
    const rank = getUserRank(interaction);
    if (!rank) {
        await interaction.reply({ content: '❌ No tienes el rango necesario para enviar sugerencias.\n\nNecesitas ser **VIP** o **VIP+** para usar este sistema.', ephemeral: true });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('sugerencia_modal')
        .setTitle(rank === 'vip_plus' ? 'Nueva Sugerencia VIP+' : 'Nueva Sugerencia VIP');

    const titleInput = new TextInputBuilder()
        .setCustomId('sugerencia_titulo')
        .setLabel('Título de la sugerencia')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: Añadir canales de voz')
        .setRequired(true)
        .setMaxLength(100);

    const descriptionInput = new TextInputBuilder()
        .setCustomId('sugerencia_descripcion')
        .setLabel('Descripción')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Describe tu sugerencia en detalle...')
        .setRequired(true)
        .setMaxLength(4000);

    modal.addComponents(new ActionRowBuilder().addComponents(titleInput));
    modal.addComponents(new ActionRowBuilder().addComponents(descriptionInput));

    await interaction.showModal(modal);
}

async function handleSuggestionSubmit(interaction) {
    const rank = getUserRank(interaction);
    if (!rank) {
        await interaction.reply({ content: '❌ Tu rango ha cambiado. No puedes enviar sugerencias.', ephemeral: true });
        return;
    }

    const title = interaction.fields.getTextInputValue('sugerencia_titulo');
    const description = interaction.fields.getTextInputValue('sugerencia_descripcion');
    
    let channelId = rank === 'vip_plus' ? config.vipPlusChannelId : config.vipChannelId;
    let channel = client.channels.cache.get(channelId);

    if (!channel && channelId) {
        try {
            channel = await interaction.guild.channels.fetch(channelId);
        } catch (e) {
            channel = null;
        }
    }

    if (!channel) {
        const neededConfig = rank === 'vip_plus' ? '/set-canal-vip-plus' : '/set-canal-vip';
        await interaction.reply({ content: `❌ Canal no encontrado. Ejecuta ${neededConfig} primero.`, ephemeral: true });
        return;
    }

    const color = rank === 'vip_plus' ? 0xFFD700 : 0x57F287;
    const rankEmoji = rank === 'vip_plus' ? '⭐' : '💎';
    const rankLabel = rank === 'vip_plus' ? 'VIP+' : 'VIP';

    const suggestionEmbed = new EmbedBuilder()
        .setTitle(`${rankEmoji} ${title}`)
        .setDescription(description)
        .setColor(color)
        .setAuthor({ name: `${interaction.user.tag} (${rankLabel})`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp()
        .setFooter({ text: `ID: ${interaction.user.id} | Rango: ${rankLabel}` });

    await channel.send({ embeds: [suggestionEmbed] });
    await interaction.reply({ content: '✅ ¡Tu sugerencia ha sido enviada correctamente! 🎉', ephemeral: true });
}

client.login(DISCORD_TOKEN);