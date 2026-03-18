/**
 * Embed Builder Utility
 * Creates consistent, modern embeds for the bot
 */

const { EmbedBuilder } = require('discord.js');

// Color palette
const colors = {
    success: 0x57F287,    // Green
    error: 0xED4245,       // Red
    warning: 0xFEE75C,    // Yellow
    info: 0x5865F2,       // Blue
    neutral: 0x95A5A6,    // Gray
    premium: 0xFF7139,    // Orange (premium/gold)
    embed: 0xEBF2F8        // Light blue/gray for general embeds
};

/**
 * Create a success embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder} Discord embed
 */
function success(title, description) {
    return new EmbedBuilder()
        .setColor(colors.success)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an error embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder} Discord embed
 */
function error(title, description) {
    return new EmbedBuilder()
        .setColor(colors.error)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a warning embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder} Discord embed
 */
function warning(title, description) {
    return new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an info embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder} Discord embed
 */
function info(title, description) {
    return new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a neutral/info embed (default style)
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder} Discord embed
 */
function neutral(title, description) {
    return new EmbedBuilder()
        .setColor(colors.neutral)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a premium/special embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @returns {EmbedBuilder} Discord embed
 */
function premium(title, description) {
    return new EmbedBuilder()
        .setColor(colors.premium)
        .setTitle(`⭐ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an embed with custom color
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {number} color - Hex color code
 * @returns {EmbedBuilder} Discord embed
 */
function custom(title, description, color) {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a configuration embed with fields
 * @param {string} title - Embed title
 * @param {Array} fields - Array of field objects {name, value, inline}
 * @returns {EmbedBuilder} Discord embed
 */
function config(title, fields = []) {
    const embed = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(`⚙️ ${title}`)
        .setTimestamp();
    
    if (fields.length > 0) {
        embed.addFields(fields);
    }
    
    return embed;
}

/**
 * Create a role assignment notification embed
 * @param {string} userMention - User mention
 * @param {string} roleName - Role name
 * @param {number} inviteCount - Current invite count
 * @returns {EmbedBuilder} Discord embed
 */
function roleAssigned(userMention, roleName, inviteCount) {
    return new EmbedBuilder()
        .setColor(colors.success)
        .setTitle('🎉 ¡Nuevo rol asignado!')
        .setDescription(`¡Felicidades ${userMention}!`)
        .addFields(
            { name: '📋 Rol obtenido', value: `**${roleName}**`, inline: true },
            { name: '📊 Tus invitaciones', value: `**${inviteCount}** invitaciones`, inline: true }
        )
        .setFooter({ text: 'Gracias por ayudar a hacer crecer el servidor!' })
        .setTimestamp();
}

/**
 * Create a help/command list embed
 * @param {string} title - Embed title
 * @param {Array} commands - Array of command info {name, description}
 * @returns {EmbedBuilder} Discord embed
 */
function helpList(title, commands) {
    const embed = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle(`📚 ${title}`)
        .setTimestamp();
    
    if (commands.length > 0) {
        const fields = commands.map(cmd => ({
            name: `/${cmd.name}`,
            value: cmd.description,
            inline: false
        }));
        embed.addFields(fields);
    }
    
    return embed;
}

/**
 * Create an invite tier display embed
 * @param {Array} tiers - Array of tier objects
 * @param {boolean} enabled - Whether the system is enabled
 * @returns {EmbedBuilder} Discord embed
 */
function inviteTiers(tiers, enabled) {
    const embed = new EmbedBuilder()
        .setColor(enabled ? colors.success : colors.neutral)
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

// ============ LOG EMBEDS ============

/**
 * Create a join log embed
 * @param {string} userTag - User tag
 * @param {string} userId - User ID
 * @param {string} inviterMention - Inviter mention
 * @param {string} inviteCode - Invite code used
 * @returns {EmbedBuilder} Discord embed
 */
function logJoin(userTag, userId, inviterMention, inviteCode) {
    return new EmbedBuilder()
        .setColor(colors.success)
        .setTitle('👋 Nuevo miembro')
        .setDescription(`${userTag} se unió al servidor`)
        .addFields(
            { name: '👤 Usuario', value: `${userTag}\n(\`${userId}\`)`, inline: true },
            { name: '📢 Invitado por', value: inviterMention || 'Desconocido', inline: true },
            { name: '🔗 Código', value: inviteCode ? `\`${inviteCode}\`` : 'Desconocido', inline: true }
        )
        .setTimestamp();
}

/**
 * Create a leave log embed
 * @param {string} userTag - User tag
 * @param {string} userId - User ID
 * @param {string} inviterMention - Who invited them
 * @returns {EmbedBuilder} Discord embed
 */
function logLeave(userTag, userId, inviterMention) {
    return new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle('👋 Miembro salió')
        .setDescription(`${userTag} abandonó el servidor`)
        .addFields(
            { name: '👤 Usuario', value: `${userTag}\n(\`${userId}\`)`, inline: true },
            { name: '📢 Fue invitado por', value: inviterMention || 'Desconocido', inline: true }
        )
        .setTimestamp();
}

/**
 * Create a fake join detected embed
 * @param {string} userTag - User tag
 * @param {string} userId - User ID
 * @returns {EmbedBuilder} Discord embed
 */
function logFakeJoin(userTag, userId) {
    return new EmbedBuilder()
        .setColor(colors.error)
        .setTitle('⚠️ Posible Fake Join detectado')
        .setDescription(`${userTag} entró y salió rápidamente`)
        .addFields(
            { name: '👤 Usuario', value: `${userTag}\n(\`${userId}\`)`, inline: true }
        )
        .setTimestamp();
}

/**
 * Create an invite update embed (bonus/remove)
 * @param {string} userTag - User tag
 * @param {string} userId - User ID
 * @param {number} amount - Amount added/removed
 * @param {string} reason - Reason
 * @param {boolean} isAddition - True if added, false if removed
 * @returns {EmbedBuilder} Discord embed
 */
function logInviteUpdate(userTag, userId, amount, reason, isAddition) {
    return new EmbedBuilder()
        .setColor(isAddition ? colors.success : colors.warning)
        .setTitle(isAddition ? '⭐ Invitaciones bonus' : '➖ Invitaciones reducidas')
        .setDescription(`${isAddition ? 'Añadidas' : 'Eliminadas'} ${Math.abs(amount)} invitaciones`)
        .addFields(
            { name: '👤 Usuario', value: `${userTag}\n(\`${userId}\`)`, inline: true },
            { name: '📝 Razón', value: reason, inline: true }
        )
        .setTimestamp();
}

/**
 * Create a role assigned embed for logs
 * @param {string} userTag - User tag
 * @param {string} roleName - Role name
 * @param {number} inviteCount - Invite count
 * @returns {EmbedBuilder} Discord embed
 */
function logRoleAssigned(userTag, roleName, inviteCount) {
    return new EmbedBuilder()
        .setColor(colors.premium)
        .setTitle('🎭 Rol asignado por invitaciones')
        .setDescription(`${userTag} recibió el rol **${roleName}**`)
        .addFields(
            { name: '📊 Invitaciones', value: `\`${inviteCount}\``, inline: true },
            { name: '🎭 Rol', value: roleName, inline: true }
        )
        .setTimestamp();
}

module.exports = {
    colors,
    success,
    error,
    warning,
    info,
    neutral,
    premium,
    custom,
    config,
    roleAssigned,
    helpList,
    inviteTiers,
    // Log embeds
    logJoin,
    logLeave,
    logFakeJoin,
    logInviteUpdate,
    logRoleAssigned
};
