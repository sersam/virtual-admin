# US-017 - RAG con pgvector

## Objetivo

Como propietario, quiero respuestas documentales mas relevantes mediante busqueda semantica sobre la biblioteca demo y los PDFs subidos en mi sesion.

## Criterios de aceptacion

- Existe un puerto de aplicacion `EmbeddingProvider` para generar embeddings por lotes preservando el orden de entrada.
- La infraestructura OpenAI implementa el puerto con el modelo `text-embedding-3-small`, 1536 dimensiones y telemetria de modelo, tokens, coste estimado, latencia y resultado.
- Los documentos se dividen con chunking determinista e idempotente: texto normalizado, maximo 1200 caracteres, solape de 200 caracteres en limites de palabra y version `document-chunking.v1`.
- PostgreSQL habilita `pgvector`, persiste chunks con `vector(1536)` y crea indice HNSW con similitud coseno.
- La recuperacion semantica se activa solo cuando existen `DATABASE_URL` y `OPENAI_API_KEY`.
- Sin base de datos o sin API key se mantiene la recuperacion lexica actual, incluyendo PDFs subidos recuperables desde memoria o PostgreSQL.
- En modo semantico, la primera consulta reconcilia de forma lazy el corpus base y los documentos subidos existentes de la sesion.
- La busqueda devuelve como maximo tres documentos distintos, usando el mejor chunk por documento, con fuentes reales y score normalizado entre 0 y 1.
- Los resultados con score inferior a `0.50` se descartan como evidencia insuficiente.
- Si la configuracion semantica esta activa y falla OpenAI o pgvector en ejecucion, la API propaga un error explicito en vez de hacer fallback silencioso.
- El contrato `DocumentQueryResponse` mantiene su forma y anade el modo `semantic-pgvector`.
- La interfaz muestra `API RAG semantica` cuando el backend devuelve el modo semantico.
- La redaccion de respuestas sigue siendo determinista; la generacion de respuestas con OpenAI queda fuera de alcance hasta US-018.

## Contratos y modelo de datos

`DocumentRetriever` acepta una consulta, un maximo de fuentes y opcionalmente `sessionId`. Devuelve documentos recuperados ya combinados entre corpus global y documentos de sesion. `SessionDocumentRetriever` deja de ser necesario.

`EmbeddingProvider` expone:

- `model`, con valor `text-embedding-3-small`.
- `dimensions`, con valor `1536`.
- `embed(texts: readonly string[]): Promise<EmbeddingBatch>`, donde cada vector corresponde a la entrada de la misma posicion.

La tabla `document_chunks` almacena:

- `id varchar(96)` como identificador determinista del chunk.
- `session_id uuid` nullable, con clave foranea a `demo_sessions(id)` y borrado en cascada; `null` identifica corpus global.
- `document_id varchar(80)`.
- `document_fingerprint text`.
- `chunk_index integer`.
- `title text`.
- `type text`.
- `section text`.
- `document_url text`.
- `content text`.
- `embedding_model text`.
- `embedding vector(1536)`.

La tabla incluye clave primaria por `id`, restricciones de contenido no vacio, metadatos no vacios, indice de consulta por sesion/documento y un indice HNSW `vector_cosine_ops`.

## Casos de error

- Si `DATABASE_URL` existe pero falta la extension, tabla, columnas o indice de pgvector, el arranque falla con mensaje de migracion pendiente.
- Si OpenAI devuelve una cantidad de embeddings distinta, vectores con dimension incorrecta o valores no finitos, se lanza error de proveedor.
- Si la pregunta no tiene evidencias por encima del umbral, se devuelve la respuesta determinista de evidencia insuficiente sin fuentes.
- Si un PDF subido no tiene texto extraido, no genera chunks ni fuentes semanticas.
- Si un documento cambia de fingerprint, sus chunks anteriores se reemplazan transaccionalmente.
- Si dos consultas intentan indexar el mismo documento, la persistencia es idempotente y no duplica chunks.

## Restricciones

- OpenAI solo se usa desde backend.
- No se anade generacion OpenAI de respuestas.
- No se anade busqueda hibrida ni reintentos silenciosos.
- No se indexa en arranque ni al subir PDFs.
- No se anaden dependencias npm para pgvector.
- No se modifican endpoints ni DTOs salvo ampliar el enum del modo documental.
- No se registran preguntas ni contenido documental en telemetria.

## Estrategia TDD

1. Probar contrato de modo `semantic-pgvector`, puerto de embeddings, chunking determinista y fingerprints.
2. Implementar chunker puro, proveedor OpenAI fakeable y validaciones de vectores.
3. Probar migracion pgvector contra `pgvector/pgvector:pg16`: extension, columnas, `vector(1536)`, indices, reejecucion y cascada.
4. Implementar esquema Drizzle y repositorio de chunks con idempotencia, reemplazo por fingerprint, aislamiento por sesion y ranking coseno.
5. Probar la composicion de recuperadores con y sin `DATABASE_URL` y `OPENAI_API_KEY`.
6. Implementar recuperador semantico lazy, colapso por documento, top 3, umbral `0.50` y error explicito si falla una configuracion semantica activa.
7. Probar HTTP, chat y frontend con modo semantico, fuentes reales y regresiones lexicas/locales.
8. Ejecutar `npm run quality`.

## Incrementos y commits

| Incremento                  | Cambio verificable                                                                                                       | Commit objetivo                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1. Especificacion y proceso | Crear esta especificacion y exactamente `.changes/us-017.md`.                                                            | `docs(us-017): especifica recuperacion semantica`       |
| 2. Embeddings y chunking    | Probar e implementar puerto de embeddings, adaptador OpenAI fakeable, telemetria y chunking idempotente.                 | `feat(rag): añade embeddings y chunking idempotente`    |
| 3. Persistencia vectorial   | Probar y anadir migracion pgvector, esquema Drizzle y repositorio PostgreSQL para chunks documentales.                   | `feat(database): añade indice vectorial de documentos`  |
| 4. Recuperacion vertical    | Probar y conectar recuperacion semantica lazy con fallback lexico por configuracion y error explicito en modo semantico. | `feat(rag): activa recuperacion semantica con fallback` |
| 5. Presentacion y cierre    | Actualizar contrato, etiqueta visual, README, pruebas de UI y ejecutar la quality gate completa.                         | `docs(us-017): documenta RAG con pgvector`              |

Cada incremento sigue Red -> Green -> Refactor y ejecuta `npm run precommit:check` antes del commit.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- Cada incremento queda commiteado por separado con Conventional Commit y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al cierre.
- Se anade exactamente un archivo `.changes/us-017.md`.
- Las fuentes mostradas son reales, trazables y enlazan a PDF.
- La recuperacion lexica sigue disponible sin PostgreSQL o sin API key.
- La PR queda lista para revision con evidencias y justificacion si supera 500 lineas modificadas por artefactos Drizzle.
