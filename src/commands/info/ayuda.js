/**
 * Help Command
 * Shows bot information and available commands
 */

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { version } = require('../../../package.json');
const embedBuilder = require('../../utils/embedBuilder');

/**
 * Create the slash command definition
 */
const data = new SlashCommandBuilder()
    .setName('ayuda')
    .setDescription('Muestra información sobre los comandos del bot');

/**
 * Execute the command
 * @param {Client} client - Discord client
 * @param {CommandInteraction} interaction - Command interaction
 */
async function execute(client, interaction) {
    // Create help embed
    const embed = embedBuilder.info(
        '📚 Centro de Ayuda',
        'Aquí encontrarás todos los comandos disponibles del bot'
    );
    
    // Bot info
    embed.addFields(
        { name: '🤖 Información del Bot', value: `Versión: ${version}\nUsuario: ${client.user.username}`, inline: false }
    );
    
    // Admin commands
    const adminCommands = [
        { name: '/invites-config ver', description: 'Ver la configuración actual' },
        { name: '/invites-config agregar', description: 'Agregar un nivel de invitaciones' },
        { name: '/invites-config eliminar', description: 'Eliminar un nivel de invitaciones' },
        { name: '/invites-config activar', description: 'Activar el sistema' },
        { name: '/invites-config desactivar', description: 'Desactivar el sistema' },
        { name: '/invites-config notificaciones', description: 'Configurar notificaciones' },
        { name: '/invites-config verificar', description: 'Verificar y asignar roles' }
    ];
    
    embed.addFields(
        { name: '⚙️ Comandos de Administración', value: adminCommands.map(c => `\`${c.name}\` - ${c.description}`).join('\n'), inline: false }
    );
    
    // User commands
    const userCommands = [
        { name: '/mis-invitaciones', description: 'Ver tus invitaciones y roles' }
    ];
    
    embed.addFields(
        { name: '👤 Comandos de Usuario', value: userCommands.map(c => `\`${c.name}\` - ${c.description}`).join('\n'), inline: false }
    );
    
    // How it works
    embed.addFields(
        { 
            name: '💡 ¿Cómo funciona?', 
            value: '1. Un administrador configura los niveles de invitaciones y sus roles correspondientes\n2. El sistema verifica periódicamente las invitaciones de cada usuario\n3. Cuando un usuario alcanza un nivel, recibe automáticamente el rol\n4. El usuario recibe una notificación por DM o en el canal', 
            inline: false 
        }
    );
    
    // Footer
    embed.setFooter({ text: 'Para más ayuda, contacta a un administrador' });
    
    await interaction.reply({ embeds: [embed] });
}

module.exports = {
    data,
    execute
};
