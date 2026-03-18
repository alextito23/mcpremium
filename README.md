# Bot MCPremium 🤖

Bot de Discord moderno y escalable para la asignación automática de roles basada en invitaciones.

## 📋 Características

- ✅ Sistema de roles por invitaciones automático
- ✅ Comandos slash modernos (`/`)
- ✅ Configuración flexible mediante subcomandos
- ✅ Múltiples niveles de invitación (ej: 5 → Rol A, 10 → Rol B)
- ✅ Notificaciones por DM o canal
- ✅ Código modular y escalable
- ✅ Embeds modernos y profesionales

## 📁 Estructura del Proyecto

```
Bot MCPremium/
├── src/
│   ├── commands/           # Comandos slash
│   │   ├── config/         # Comandos de configuración
│   │   │   └── invites-config.js
│   │   ├── check/          # Comandos de verificación
│   │   │   └── check-invites.js
│   │   └── info/           # Comandos de información
│   │       └── ayuda.js
│   ├── events/             # Eventos de Discord
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── error.js
│   ├── handlers/           # Manejadores
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── utils/              # Utilidades
│   │   ├── logger.js
│   │   ├── configManager.js
│   │   ├── embedBuilder.js
│   │   └── inviteChecker.js
│   ├── index.js            # Punto de entrada
│   └── deploy-commands.js  # Script de registro de comandos
├── .env.example            # Ejemplo de variables de entorno
├── package.json
└── README.md
```

## 🚀 Instalación

### 1. Requisitos Previos

- Node.js 16.9.0 o superior
- npm o yarn

### 2. Clonar e Instalar

```bash
# Clonar el repositorio
git clone <repo-url>
cd Bot-MCPremium

# Instalar dependencias
npm install
```

### 3. Configuración

1. Copia el archivo de ejemplo de configuración:

```bash
cp .env.example .env
```

2. Edita el archivo `.env` con tus datos:

```env
# Token del bot (del Portal de Desarrolladores de Discord)
DISCORD_TOKEN=tu_token_aqui

# ID de tu aplicación (del Portal de Desarrolladores)
APPLICATION_ID=tu_application_id_aqui

# ID del servidor (opcional, para desarrollo)
GUILD_ID=tu_guild_id_aqui

# Configuración del sistema
INVITE_SYSTEM_ENABLED=true
CHECK_INTERVAL_MINUTES=5
NOTIFY_VIA_DM=true
```

### 4. Obtener el Token del Bot

1. Ve al [Portal de Desarrolladores de Discord](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. Ve a "Bot" y crea un bot
4. Copia el token
5. En "Privileged Intents", habilita:
   - Server Members Intent
   - Message Content Intent

### 5. Invitar el Bot

1. Ve a "OAuth2" → "URL Generator"
2. Selecciona los scopes: `bot` y `applications.commands`
3. Selecciona los permisos necesarios:
   - Manage Roles
   - Send Messages
   - Read Message History
   - Use Slash Commands
4. Copia la URL generada e invita al bot

## ⚙️ Uso

### Registrar Comandos

```bash
# Para desarrollo (más rápido)
npm run register

# Para producción (comandos globales)
# Nota: Esto puede tomar hasta 1 hora en propagarse
```

### Iniciar el Bot

```bash
npm start
```

## 📚 Comandos

### Comandos de Administración

| Comando | Descripción |
|---------|-------------|
| `/invites-config ver` | Ver la configuración actual |
| `/invites-config agregar <invitaciones> <rol>` | Agregar un nivel |
| `/invites-config eliminar <invitaciones>` | Eliminar un nivel |
| `/invites-config activar` | Activar el sistema |
| `/invites-config desactivar` | Desactivar el sistema |
| `/invites-config notificaciones [canal]` | Configurar notificaciones |
| `/invites-config verificar` | Verificar y asignar roles |

### Comandos de Usuario

| Comando | Descripción |
|---------|-------------|
| `/mis-invitaciones [usuario]` | Ver tus invitaciones y roles |
| `/ayuda` | Mostrar ayuda |

## 🔧 Configuración de Niveles

### Ejemplo: Configurar múltiples niveles

```bash
# Nivel 1: 5 invitaciones → rol "Invitado"
/invites-config agregar 5 @Invitado

# Nivel 2: 10 invitaciones → rol "Regular"
/invites-config agregar 10 @Regular

# Nivel 3: 25 invitaciones → rol "VIP"
/invites-config agregar 25 @VIP

# Nivel 4: 50 invitaciones → rol "Legend"
/invites-config agregar 50 @Legend
```

## 🔌 Integración con Fuente de Datos Externa

El sistema está diseñado para funcionar con cualquier fuente de datos externa. Para conectar tu sistema de invitaciones existente:

1. Abre el archivo `src/utils/inviteChecker.js`
2. Busca la función `getUserInviteCount`
3. Reemplaza el código de ejemplo con tu lógica:

```javascript
// Ejemplo 1: Base de datos MySQL
async function getUserInviteCount(guildId, userId) {
    const [rows] = await db.execute(
        'SELECT invite_count FROM user_invites WHERE guild_id = ? AND user_id = ?',
        [guildId, userId]
    );
    return rows[0]?.invite_count || 0;
}

// Ejemplo 2: API externa
async function getUserInviteCount(guildId, userId) {
    const response = await fetch(`https://tu-api.com/invites/${guildId}/${userId}`);
    const data = await response.json();
    return data.invite_count;
}
```

## 🎨 Personalización

### Colores de Embeds

Edita `src/utils/embedBuilder.js` para cambiar los colores:

```javascript
const colors = {
    success: 0x57F287,
    error: 0xED4245,
    warning: 0xFEE75C,
    info: 0x5865F2
};
```

### Mensajes Personalizados

Edita los archivos en `src/utils/` para personalizar mensajes y comportamiento.

## 🔍 Solución de Problemas

### El bot no responde a comandos

1. Verifica que los comandos estén registrados: `npm run register`
2. Verifica que el bot tenga los permisos correctos
3. Revisa la consola para errores

### Los roles no se asignan

1. Verifica que el rol del bot esté por encima del rol a asignar
2. Usa `/invites-config ver` para verificar la configuración
3. Usa `/invites-config verificar` para forzar una verificación

### Error de permisos

Asegúrate de que el bot tenga el permiso "Manage Roles" y que su rol esté por encima de los roles que debe asignar.

## 📄 Licencia

MIT License - Feel free to use more and modify!

## ☁️ Despliegue en Railway

### Requisitos

1. Cuenta en [Railway.app](https://railway.app)
2. Proyecto de Discord configurado (token, application ID)

### Pasos para desplegar

1. **Sube el proyecto a GitHub**

2. **Crea un nuevo proyecto en Railway**
   - Ve a [Railway](https://railway.app) e inicia sesión
   - Click en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Autoriza GitHub y selecciona tu repositorio

3. **Configura las variables de entorno**
   - En Railway, ve a "Variables" 
   - Añade las siguientes variables:
     ```
     DISCORD_TOKEN=tu_token_del_bot
     APPLICATION_ID=tu_application_id
     GUILD_ID=tu_guild_id
     MONGODB_URI=tu_uri_de_mongodb
     INVITE_SYSTEM_ENABLED=true
     CHECK_INTERVAL_MINUTES=5
     NOTIFY_VIA_DM=true
     ```

4. **Despliega**
   - Click en "Deploy"
   - Espera a que termine el build

5. **Verifica**
   - El bot debería estar online en Discord
   - Revisa los logs en Railway para confirmar

### Notas importantes

- Railway ofrece $5/mes gratis en crédito
- El bot estará 24/7 mientras tengas crédito
- Si el crédito se agota, el bot se apagará

## 👤 Autor

Bot Developer
