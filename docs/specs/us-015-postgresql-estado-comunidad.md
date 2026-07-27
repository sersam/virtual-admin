# US-015 - PostgreSQL para estado de comunidad

## Objetivo

Como usuario demo, quiero conservar incidencias, acuerdos pendientes y propuestas durante la sesion aunque el servidor se reinicie.

## Criterios de aceptacion

- La API usa repositorios PostgreSQL para incidencias, acuerdos pendientes y propuestas cuando `DATABASE_URL` existe y no esta vacia.
- La API conserva los repositorios actuales en memoria cuando `DATABASE_URL` no existe o esta vacia.
- Sesiones, incidencias, acuerdos y propuestas comparten un unico pool PostgreSQL.
- El arranque valida el esquema completo y falla explicitamente si falta una migracion, columna o conexion.
- Los puertos `IncidentRepository`, `PendingAgreementRepository` y `ProposalRepository` no cambian.
- Los contratos HTTP y la interfaz no cambian.
- Cada estado comunitario queda aislado por `sessionId`.
- El estado comunitario se elimina en cascada cuando se elimina la sesion demo.
- El orden de listado se conserva despues de cerrar y reabrir la conexion.
- Las operaciones concurrentes no pierden altas con identidades distintas.
- `saveIfAbsent` de incidencias y acuerdos es idempotente por `(sessionId, id)`.
- Las resoluciones concurrentes de una incidencia conservan la primera fecha de resolucion.
- Los acuerdos equivalentes por descripcion, responsable y fecha se deduplican aunque varien espacios exteriores o mayusculas.
- Las propuestas permiten descripciones duplicadas cuando usan identidades distintas.
- Las migraciones siguen siendo explicitas mediante `npm run db:migrate`.

## Modelo de datos

La migracion crea tres tablas nuevas sin modificar migraciones ya publicadas:

- `community_incidents`.
- `pending_agreements`.
- `community_proposals`.

Las tres tablas comparten:

- `session_id uuid` como clave foranea a `demo_sessions(id)` con `on delete cascade`.
- `id varchar(80)` como identificador funcional.
- Clave primaria compuesta `(session_id, id)`.
- `created_at timestamp with time zone`.
- `inserted_order integer` para reproducir el orden de insercion de los adaptadores en memoria.

`community_incidents` almacena descripcion, tipo, prioridad, responsable sugerido, comunicado sugerido, estado y fecha opcional de resolucion. Incluye checks de longitudes, enums y coherencia entre `status` y `resolved_at`.

`pending_agreements` almacena descripcion, responsable opcional, fecha limite opcional y una firma normalizada por sesion para deduplicar `save`.

`community_proposals` almacena descripcion y permite textos repetidos por sesion si el `id` es distinto.

## Concurrencia

- Las inserciones idempotentes usan `insert ... on conflict do nothing`.
- Las altas normales de incidencias y propuestas protegen solo la identidad repetida y permiten identidades distintas.
- Las altas normales de acuerdos se serializan por sesion mediante bloqueo transaccional de la sesion antes de comprobar la firma normalizada.
- La resolucion de incidencias usa una actualizacion atomica que solo escribe `resolved_at` cuando sigue pendiente; las llamadas posteriores leen y devuelven la primera resolucion.
- La eliminacion de una sesion expirada en `PostgresSessionRepository` elimina el estado comunitario mediante claves foraneas.

## Casos de error

- Si `DATABASE_URL` configurada no conecta, el arranque falla y no activa fallback silencioso.
- Si falta alguna tabla o columna del esquema PostgreSQL, el arranque falla con un mensaje explicito de migracion pendiente.
- Si se intenta guardar estado para una sesion inexistente, PostgreSQL rechaza la operacion por clave foranea.
- Si una incidencia no existe al resolverla, el puerto devuelve `undefined` y el caso de uso mantiene el error HTTP actual.
- Si se repite un `id` en una propuesta, se conserva la primera version por identidad.

## Restricciones

- No se persisten juntas, documentos subidos, borradores ni comunicaciones.
- No se cambian DTOs, endpoints ni componentes frontend.
- No se anaden dependencias.
- No se ejecutan migraciones automaticamente al arrancar.
- No se amplia el alcance a una transaccion unica entre cuota de sesion y mutacion HTTP.

## Estrategia TDD

1. Escribir pruebas de migracion contra PostgreSQL 16 y verificar el fallo inicial.
2. Versionar esquema Drizzle y migracion hasta dejar las pruebas en verde.
3. Escribir contratos de integracion del repositorio PostgreSQL de incidencias y cubrir persistencia, aislamiento, filtros y concurrencia.
4. Escribir contratos de integracion del repositorio PostgreSQL de acuerdos y cubrir deduplicacion normalizada, persistencia, aislamiento y concurrencia.
5. Escribir contratos de integracion del repositorio PostgreSQL de propuestas y cubrir duplicados por texto, orden, aislamiento y concurrencia.
6. Escribir pruebas de composicion para seleccion memoria/PostgreSQL, esquema invalido, cierre de pool y reinicio HTTP.
7. Ejecutar suites de regresion y `npm run quality`.

## Definition of Done

- Los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- Cada incremento se commitea por separado y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al final de la historia.
- La demostracion manual puede crear estado, reiniciar la API con la misma base y recuperarlo usando la misma cookie.
- La PR incluye `.changes/us-015.md`, evidencias de calidad y justificacion si supera 500 lineas modificadas.
