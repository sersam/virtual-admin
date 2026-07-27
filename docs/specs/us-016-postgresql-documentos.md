# US-016 - PostgreSQL para documentos

## Objetivo

Como usuario demo, quiero que los documentos subidos se conserven durante mi sesión y puedan usarse como fuentes aunque el servidor se reinicie.

## Criterios de aceptación

- La API usa un repositorio PostgreSQL para documentos subidos cuando `DATABASE_URL` existe y no está vacía.
- La API mantiene el repositorio actual en memoria cuando `DATABASE_URL` no existe o está vacía.
- Sesiones, incidencias, acuerdos, propuestas y documentos comparten un único pool PostgreSQL.
- El arranque valida el esquema completo y falla explícitamente si falta la migración, alguna columna o la conexión.
- El puerto `UploadedDocumentRepository` no cambia.
- Los DTOs Zod, endpoints, códigos de error y componentes frontend no cambian.
- Cada documento queda aislado por `sessionId` para listado, descarga y recuperación documental.
- Los documentos se eliminan en cascada cuando se elimina la sesión demo.
- La API persiste metadatos, texto extraído y binario PDF.
- El orden de listado se conserva después de cerrar y reabrir la conexión.
- `save` es idempotente por `(sessionId, id)` y conserva la primera versión.
- Las altas concurrentes con identidades distintas no pierden documentos.
- Los documentos persistidos alimentan `UploadedSessionDocumentRetriever` como fuentes reales tras reiniciar la persistencia.
- Las migraciones siguen siendo explícitas mediante `npm run db:migrate`.

## Contratos y modelo de datos

La migración crea la tabla `uploaded_documents` sin modificar migraciones ya publicadas.

La tabla almacena:

- `session_id uuid` como clave foránea a `demo_sessions(id)` con `on delete cascade`.
- `id varchar(80)` como identificador funcional.
- Clave primaria compuesta `(session_id, id)`.
- `inserted_order integer` para reproducir el orden estable del adaptador en memoria.
- `title text`.
- `filename text`.
- `content_type text`.
- `size_bytes integer`.
- `uploaded_at timestamp with time zone`.
- `document_url text`.
- `text_content text`.
- `content bytea`.

La tabla incluye restricciones para:

- Aceptar únicamente `application/pdf`.
- Exigir `size_bytes` entre 1 byte y 5 MB.
- Rechazar binarios vacíos.
- Mantener coherencia entre `size_bytes` y la longitud real de `content`.
- Exigir textos y nombres no vacíos cuando forman parte del contrato actual.

## Casos de error

- Si `DATABASE_URL` configurada no conecta, el arranque falla sin fallback silencioso.
- Si falta la tabla `uploaded_documents` o alguna columna esperada, el arranque falla con un mensaje de migración pendiente.
- Si se intenta guardar un documento para una sesión inexistente, PostgreSQL rechaza la operación por clave foránea.
- Si se repite `(sessionId, id)`, se conserva la primera versión y no se sobreescribe contenido.
- Si se consulta un documento de otra sesión, el caso de uso mantiene el error HTTP actual de no encontrado.
- Los PDFs inválidos y los documentos mayores de 5 MB mantienen los errores actuales del caso de uso.

## Restricciones

- No se modifica el frontend.
- No se cambian DTOs, endpoints ni códigos HTTP.
- No se añaden dependencias.
- No se ejecutan migraciones automáticamente al arrancar la API.
- No se introduce pgvector, embeddings ni recuperación semántica de US-017.
- No se persisten juntas, borradores ni comunicaciones.

## Estrategia TDD

1. Escribir pruebas de migración contra PostgreSQL 16 para tabla, columnas, restricciones, clave compuesta y borrado en cascada.
2. Versionar esquema Drizzle y migración hasta dejar las pruebas de base de datos en verde.
3. Escribir contratos de integración del repositorio PostgreSQL para persistencia exacta, aislamiento, orden, idempotencia y concurrencia.
4. Implementar `PostgresUploadedDocumentRepository` conservando el puerto de aplicación.
5. Escribir pruebas de composición para selección memoria/PostgreSQL, pool único, esquema inválido y ausencia de fallback silencioso.
6. Conectar el repositorio persistente en `createApiPersistence` y `main`.
7. Añadir prueba HTTP de reinicio con la misma cookie para listar, descargar bytes idénticos y recuperar texto persistido como fuente real.
8. Ejecutar regresiones de PDF inválido, límite de 5 MB, contratos Zod y E2E existentes.
9. Ejecutar `npm run quality`.

## Incrementos y commits

| Incremento                  | Cambio verificable                                                                                                                            | Commit objetivo                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Especificación y proceso | Crear esta especificación, `.changes/us-016.md` y actualizar `AGENTS.md` con SDD, planificación incremental y un commit verde por incremento. | `docs(us-016): especifica persistencia documental y flujo SDD` |
| 2. Esquema persistente      | Probar y añadir `uploaded_documents` mediante una nueva migración Drizzle sin modificar las publicadas.                                       | `feat(database): versiona esquema de documentos subidos`       |
| 3. Adaptador PostgreSQL     | Probar e implementar `PostgresUploadedDocumentRepository`, conservando el puerto actual.                                                      | `feat(documents): añade repositorio PostgreSQL persistente`    |
| 4. Composición vertical     | Probar y conectar el repositorio en `createApiPersistence` y `main`, incluyendo recuperación HTTP y RAG después de reiniciar la persistencia. | `feat(api): activa documentos persistentes por DATABASE_URL`   |
| 5. Documentación y cierre   | Actualizar README con configuración, fallback y demostración de reinicio; ejecutar la quality gate completa.                                  | `docs(us-016): documenta recuperación de documentos`           |

## Definition of Done

- Todos los criterios de aceptación quedan cubiertos por pruebas automatizadas.
- Cada incremento se commitea por separado y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al final de la historia.
- Se añade exactamente un archivo `.changes/us-016.md`.
- La demostración manual puede subir un PDF, reiniciar la API con la misma base y recuperarlo usando la misma cookie.
- La PR incluye evidencias de calidad y justificación si supera 500 líneas modificadas por artefactos Drizzle generados.
