# Política de privacidad

## Datos que el bot almacena

El bot guarda lo mínimo necesario para funcionar:

| Dato | Dónde | Tiempo de retención |
|------|-------|----------------------|
| Sedes (nombre, coordenadas) | `data.db` (SQLite local) | Indefinido, gestionado por administradores con `/sedes` |
| Configuración del servidor (rol admin, categoría, canal de logs) | `data.db` | Hasta que se cambie con `/config` |
| Asaltos activos (sedes, marcador, IDs de staff) | `data.db` | Se elimina al cerrar/cancelar el asalto |
| Audit log (acciones administrativas y de asalto) | `audit.log` cifrado con AES-256-GCM | Retención por defecto indefinida; ver `/forgetme` |

**No** se almacenan mensajes de usuarios, contenido de canales ajenos al bot ni información personal fuera de los IDs de Discord necesarios.

## Audit log

Las acciones sensibles (alta/baja/edición de sedes, inicio y cierre de asaltos, cambios de configuración, ejecuciones de `/forgetme`) se registran en `audit.log`. Cada línea está cifrada con AES-256-GCM. La clave **no** sale del servidor donde corre el bot; se configura como variable de entorno `AUDIT_KEY` (32 bytes hex). Sin esa clave los registros no son legibles.

## Derechos del usuario (RGPD)

Cualquier usuario puede ejecutar el comando `/forgetme` para:
- Eliminar entradas del `audit.log` que contengan su `userId`.
- Eliminar asaltos persistidos donde su `userId` aparezca como participante.

Lo que **no** elimina automáticamente:
- Mensajes y embeds ya publicados en canales de Discord (los gestiona el moderador del servidor).
- Datos del propio servicio Discord (no son nuestros).

## Contacto

Para cualquier solicitud adicional, abre un issue en el repositorio o contacta con un administrador del servidor.
