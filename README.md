# Bot de Eventos Discord

Bot de Discord para gestionar **Asaltos a Sede**, **Rey del Crimen** y **Battle Royale** mediante botones, modales y selectores. Construido con Node.js, `discord.js` v14 y `better-sqlite3`.

## Características

- Wizard guiado de configuración del asalto (lugar, defensor, atacante, staff)
- Canal privado por evento, visible solo para los leones seleccionados
- Cambio automático de bandos entre rondas, marcador con histórico
- Manejo de empate y ronda de desempate
- Resumen al cerrar enviado a un canal de logs configurable
- CRUD completo de sedes con coordenadas
- Configuración por servidor (`/config`)
- Audit log cifrado, rate limiting, métricas y `/health`
- `/forgetme` para cumplimiento RGPD

## Instalación

```bash
git clone <repo>
cd bot-eventos-discord
npm install
```

Crea `.env` en la raíz:

```env
DISCORD_TOKEN=tu_token
LOG_LEVEL=info
AUDIT_KEY=     # genérala con: npm run audit:key
```

Genera la clave del audit:

```bash
npm run audit:key
# copia el hex resultante a AUDIT_KEY en .env
```

Carga las sedes iniciales (opcional, ya hay una semilla):

```bash
npm run seed
```

## Ejecutar

```bash
npm start
```

## Tests

```bash
npm test
```

## Comandos slash

| Comando | Descripción | Permiso |
|---------|-------------|---------|
| `/evento` | Abre el menú de eventos | Cualquiera |
| `/sedes` | Panel de gestión de sedes | Admin |
| `/config` | Configura rol admin, categoría y canal de logs | Admin |
| `/health` | Estado del bot, métricas, uptime | Admin |
| `/forgetme` | Elimina tus datos del bot (RGPD) | Cualquiera |

Equivalentes con prefix `!`: `!evento`, `!sedes`.

## Configuración por servidor

Por defecto el bot usa los IDs definidos en `src/config.js`. Cada servidor puede sobrescribirlos con `/config`:

- **Rol administrador del bot** → quien puede usar `/sedes`, `/config`, `/health`
- **Categoría de asaltos** → donde se crean los canales privados
- **Canal de logs** → donde se publica el resumen al cerrar

Si no hay rol admin configurado, vale el permiso nativo `Manage Server`.

## Permisos requeridos del bot

- View Channels
- Send Messages
- Embed Links
- Read Message History
- Use Application Commands
- **Manage Channels** (para crear/borrar canales privados)
- Intent `GuildMembers` activado en el portal de desarrolladores

## Estructura del proyecto

```
src/
  index.js                  arranque, registro de comandos, error handlers
  config.js                 IDs por defecto + duración de preparación
  db.js                     SQLite + caché + validación
  state.js                  estado en memoria + persistencia
  cache.js                  TTLCache reutilizable
  guildConfig.js            configuración por servidor
  rateLimit.js              token bucket por clave
  permissions.js            comprobación de admin
  audit.js                  log cifrado AES-256-GCM
  logger.js                 logger JSON estructurado
  metrics.js                contadores y timings
  interactions/
    router.js               enruta toda interacción
    menu.js                 menú principal
    sedesAdmin.js           CRUD de sedes
    asalto.js               wizard, embeds, ciclo del asalto
    asaltoButtons.js        handlers del panel del asalto
    config.js               panel /config
    health.js               panel /health
    privacy.js              /forgetme
scripts/
  seedSedes.js              resembrado
  generateAuditKey.js       genera AUDIT_KEY hex
tests/                      node --test
.github/workflows/test.yml  CI
data.db                     SQLite
audit.log                   audit cifrado (no commitear)
```

## Solución de problemas

**El bot no responde a `/evento`:**
1. Comprueba que sincronizó comandos en el log de arranque (`commands.synced`).
2. Verifica que tiene los intents activados en el portal de desarrolladores.

**No puede crear el canal privado:**
- Faltan permisos. El bot necesita `Manage Channels` y acceso a la categoría configurada.

**No aparecen miembros en el selector de staff:**
- Activa el intent `Server Members` en el portal y reinicia el bot.

**Mensajes "Vas muy rápido":**
- Has superado el rate limit (10 ops con refill de 2/s). Espera unos segundos.

**Audit log:**
- Genera la clave con `npm run audit:key` y ponla en `AUDIT_KEY`. Sin clave los registros se escriben en claro con prefijo `PLAIN ` y aparece un warning en el log.
- Para descifrarlo offline usa la función `decryptLines(buffer)` de `src/audit.js`.

## RGPD

Ver [PRIVACY.md](./PRIVACY.md). El comando `/forgetme` elimina los datos asociados al `userId` de quien lo invoca.

## Changelog

Ver [CHANGELOG.md](./CHANGELOG.md).
