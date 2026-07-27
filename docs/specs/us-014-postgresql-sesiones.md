# US-014 - PostgreSQL para sesiones

## Objetivo

Como visitante, quiero que mi sesion demo sea estable durante su periodo de validez aunque el servidor se reinicie.

## Criterios de aceptacion

- La API usa un repositorio PostgreSQL para sesiones cuando `DATABASE_URL` existe y no esta vacia.
- La API mantiene el repositorio en memoria cuando `DATABASE_URL` no existe o esta vacia.
- Una sesion creada con PostgreSQL conserva `id`, `createdAt`, `lastSeenAt`, `expiresAt`, `requestsUsed` y `requestsLimit` al reiniciar el servidor.
- La sesion dura exactamente 24 horas desde `createdAt`; actualizar `lastSeenAt` no amplia `expiresAt`.
- Una sesion expirada se descarta al intentar reutilizarla y se sustituye por una sesion nueva.
- Cada ejecucion de `EnsureDemoSession` consume una solicitud, conservando el comportamiento HTTP actual.
- El limite de solicitudes se aplica de forma atomica en PostgreSQL, incluso con consumos concurrentes.
- El limite almacenado al crear la sesion no cambia por modificaciones posteriores de configuracion.
- Los errores de conexion o esquema PostgreSQL se propagan como error controlado y no activan fallback silencioso.
- Las migraciones se ejecutan explicitamente con `npm run db:migrate`.

## Contratos

- El puerto `SessionRepository` se mantiene como contrato de aplicacion.
- El adaptador PostgreSQL implementa `findById`, `save` y `consumeRequest`.
- La tabla `demo_sessions` almacena:
  - `id` como UUID primario.
  - `created_at` como fecha con zona horaria.
  - `last_seen_at` como fecha con zona horaria.
  - `expires_at` como fecha con zona horaria.
  - `requests_used` como entero no negativo.
  - `requests_limit` como entero positivo.
- La migracion incluye restricciones para evitar consumos negativos, limites invalidos, consumo superior al limite y expiraciones anteriores a la creacion.
- Los DTOs HTTP de sesion no cambian y siguen validandose mediante Zod.

## Casos de error

- Si una URL PostgreSQL configurada no conecta, la API falla de forma explicita durante el arranque.
- Si falta la tabla o el esquema no esta migrado, las operaciones de sesion fallan y la API responde con el error controlado existente.
- Si una sesion existente ya alcanzo `requestsLimit`, `EnsureDemoSession` lanza `SessionUsageLimitReachedError`.
- Si una sesion existente expiro, se elimina y se crea una sesion nueva con el limite configurado en ese momento.

## Restricciones

- No se persisten incidencias, acuerdos, propuestas ni documentos en esta historia.
- No se anade autenticacion ni roles.
- No se cambia el contrato HTTP ni la interfaz.
- No se ejecutan migraciones automaticamente al arrancar la API.
- No se introduce pgvector en esta historia.
- No se cambia la inicializacion demo idempotente de datos en memoria.

## Estrategia TDD

1. Probar la migracion contra PostgreSQL real y verificar que crea la tabla esperada.
2. Probar el adaptador PostgreSQL para guardar, leer, consumir, expirar y limitar sesiones.
3. Probar persistencia tras cerrar y reabrir el pool contra la misma base.
4. Probar consumos concurrentes por encima del cupo y verificar que el contador final nunca supera el limite.
5. Probar la factoria de infraestructura para `DATABASE_URL` presente, vacia y ausente.
6. Probar la integracion HTTP minima para confirmar que el modo PostgreSQL mantiene el contrato actual.
7. Ejecutar la quality gate completa.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- `npm run quality` termina en verde.
- Se anade exactamente un archivo `.changes/*.md`.
- La funcionalidad puede demostrarse arrancando la API con `DATABASE_URL` migrada y reiniciando el proceso.
- La PR mantiene un unico incremento funcional y justifica el tamano si supera 500 lineas modificadas.
