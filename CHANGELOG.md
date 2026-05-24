# Changelog

## 2.0.0

### Añadido
- Configuración por servidor (`/config`): rol admin, categoría de asaltos y canal de logs persistidos en SQLite.
- Comando `/health` (admin) con uptime, memoria, latencia API, contadores y tiempos.
- Comando `/forgetme` para eliminar datos personales del bot (RGPD).
- Audit log cifrado con AES-256-GCM (`audit.log`). La clave se genera con `npm run audit:key`.
- Rate limiting por usuario (token bucket, 10 ops con refill de 2/s).
- Validación y sanitización estricta de nombres y coordenadas de sedes.
- Persistencia de asaltos activos en SQLite y rehidratación al arrancar.
- Caché TTL para listado de sedes y configuración por servidor.
- Métricas en memoria (counters + timings).
- Logger estructurado JSON.
- Error handlers globales y graceful shutdown (SIGINT/SIGTERM).
- Tests con `node --test` (cache, db, rateLimit, audit, lógica del asalto).
- Workflow de GitHub Actions para CI.
- Documentación: README ampliado, PRIVACY, este CHANGELOG.

### Cambiado
- `/sedes` requiere ahora rol admin (configurable por servidor) o permiso ManageGuild.
- `cerrarAsalto` usa el canal de logs y categoría definidos por servidor.
- `db.js` usa transacciones y validación antes de escribir.

### Corregido
- Errores no capturados ya no tumban el proceso: se loguean.
- El bot sobrevive a un reinicio sin perder los asaltos en curso.
- Limpieza periódica de buckets de rate-limit para evitar fugas de memoria.

## 1.x
- Migración de Python a Node.js.
- CRUD de sedes, wizard del asalto, canal privado por evento, log al cerrar.
