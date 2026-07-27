# US-015 - PostgreSQL para estado de comunidad

## Objetivo

Como usuario demo, quiero conservar incidencias, acuerdos pendientes y propuestas durante la sesión aunque el servidor se reinicie.

## Criterios de aceptación

- La API usa repositorios PostgreSQL para incidencias, acuerdos pendientes y propuestas cuando `DATABASE_URL` existe y no está vacía.
- La API conserva los repositorios actuales en memoria cuando `DATABASE_URL` no existe o está vacía.
- Sesiones, incidencias, acuerdos y propuestas comparten un único pool PostgreSQL.
- El arranque valida el esquema completo y falla explícitamente si falta una migración, columna o conexión.
- Los puertos `IncidentRepository`, `PendingAgreementRepository` y `ProposalRepository` no cambian.
- Los contratos HTTP y la interfaz no cambian.
- Cada estado comunitario queda aislado por `sessionId`.
- El estado comunitario se elimina en cascada cuando se elimina la sesión demo.
- El orden de listado se conserva después de cerrar y reabrir la conexión.
- Las operaciones concurrentes no pierden altas con identidades distintas.
- `saveIfAbsent` de incidencias y acuerdos es idempotente por `(sessionId, id)`.
- Las resoluciones concurrentes de una incidencia conservan la primera fecha de resolución.
- Los acuerdos equivalentes por descripción, responsable y fecha se deduplican aunque varíen espacios exteriores o mayúsculas.
- Las propuestas permiten descripciones duplicadas cuando usan identidades distintas.
- Las migraciones siguen siendo explícitas mediante `npm run db:migrate`.

## Modelo de datos

La migración crea tres tablas nuevas sin modificar migraciones ya publicadas:

- `community_incidents`.
- `pending_agreements`.
- `community_proposals`.

Las tres tablas comparten:

- `session_id uuid` como clave foránea a `demo_sessions(id)` con `on delete cascade`.
- `id varchar(80)` como identificador funcional.
- Clave primaria compuesta `(session_id, id)`.
- `created_at timestamp with time zone`.
- `inserted_order integer` para reproducir el orden de inserción de los adaptadores en memoria.

`community_incidents` almacena descripción, tipo, prioridad, responsable sugerido, comunicado sugerido, estado y fecha opcional de resolución. Incluye checks de longitudes, enums y coherencia entre `status` y `resolved_at`.

`pending_agreements` almacena descripción, responsable opcional, fecha límite opcional y una firma normalizada por sesión para deduplicar `save`.

`community_proposals` almacena descripción y permite textos repetidos por sesión si el `id` es distinto.

## Concurrencia

- Las inserciones idempotentes usan `insert ... on conflict do nothing`.
- Las altas normales de incidencias y propuestas protegen solo la identidad repetida y permiten identidades distintas.
- Las altas normales de acuerdos se serializan por sesión mediante bloqueo transaccional de la sesión antes de comprobar la firma normalizada.
- La resolución de incidencias usa una actualización atómica que solo escribe `resolved_at` cuando sigue pendiente; las llamadas posteriores leen y devuelven la primera resolución.
- La eliminación de una sesión expirada en `PostgresSessionRepository` elimina el estado comunitario mediante claves foráneas.

## Casos de error

- Si `DATABASE_URL` configurada no conecta, el arranque falla y no activa fallback silencioso.
- Si falta alguna tabla o columna del esquema PostgreSQL, el arranque falla con un mensaje explícito de migración pendiente.
- Si se intenta guardar estado para una sesión inexistente, PostgreSQL rechaza la operación por clave foránea.
- Si una incidencia no existe al resolverla, el puerto devuelve `undefined` y el caso de uso mantiene el error HTTP actual.
- Si se repite un `id` en una propuesta, se conserva la primera versión por identidad.

## Restricciones

- No se persisten juntas, documentos subidos, borradores ni comunicaciones.
- No se cambian DTOs, endpoints ni componentes frontend.
- No se añaden dependencias.
- No se ejecutan migraciones automáticamente al arrancar.
- No se amplía el alcance a una transacción única entre cuota de sesión y mutación HTTP.

## Estrategia TDD

1. Escribir pruebas de migración contra PostgreSQL 16 y verificar el fallo inicial.
2. Versionar esquema Drizzle y migración hasta dejar las pruebas en verde.
3. Escribir contratos de integración del repositorio PostgreSQL de incidencias y cubrir persistencia, aislamiento, filtros y concurrencia.
4. Escribir contratos de integración del repositorio PostgreSQL de acuerdos y cubrir deduplicación normalizada, persistencia, aislamiento y concurrencia.
5. Escribir contratos de integración del repositorio PostgreSQL de propuestas y cubrir duplicados por texto, orden, aislamiento y concurrencia.
6. Escribir pruebas de composición para selección memoria/PostgreSQL, esquema inválido, cierre de pool y reinicio HTTP.
7. Ejecutar suites de regresión y `npm run quality`.

## Definition of Done

- Los criterios de aceptación quedan cubiertos por pruebas automatizadas.
- Cada incremento se commitea por separado y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al final de la historia.
- La demostración manual puede crear estado, reiniciar la API con la misma base y recuperarlo usando la misma cookie.
- La PR incluye `.changes/us-015.md`, evidencias de calidad y justificación si supera 500 líneas modificadas.
