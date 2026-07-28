# US-018 - Respuestas RAG con OpenAI

## Objetivo

Como propietario, quiero recibir respuestas documentales redactadas con IA que citen unicamente documentos recuperados por el sistema RAG.

## Criterios de aceptacion

- Existe un puerto de aplicacion `DocumentAnswerGenerator` para redactar respuestas a partir de una pregunta y un maximo de tres evidencias recuperadas.
- La infraestructura OpenAI implementa el puerto en backend mediante Responses API, salida estructurada, modelo de texto compartido y prompt versionado `document-answer.v1`.
- La respuesta del generador incluye texto y `sourceIds`; la aplicacion solo expone fuentes reales recuperadas cuyo `id` haya sido citado por el generador.
- Si el generador devuelve IDs desconocidos, duplicados o vacios, la API devuelve un error explicito de proveedor IA y no muestra fuentes filtradas silenciosamente.
- Si no hay documentos recuperados, se devuelve el mensaje de evidencia insuficiente sin invocar OpenAI y sin fuentes.
- Sin `OPENAI_API_KEY`, el modo demo determinista redacta una respuesta reproducible desde las evidencias recuperadas.
- Con `OPENAI_API_KEY`, se usa el generador OpenAI aunque la recuperacion haya sido lexica; si OpenAI falla no hay fallback silencioso.
- La telemetria de la operacion `document-answer` registra modelo, tokens, coste estimado, latencia, version de prompt y resultado, sin registrar preguntas ni contenido documental.
- El contrato de consulta documental distingue `mode` de recuperacion y `generationMode` de redaccion.
- La interfaz muestra en espanol el modo combinado de generacion y recuperacion.
- Las pruebas usan proveedores fake o clientes fake; CI no hace llamadas reales a OpenAI.

## Contratos e interfaces afectadas

`DocumentAnswerGenerator` recibe:

- `question`: pregunta validada por el caso de uso.
- `evidence`: lista de hasta tres entradas con `id`, `title`, `section` y `content` normalizado y acotado.

Devuelve:

- `answer`: texto final en espanol, no vacio.
- `sourceIds`: IDs citados, unicos y presentes en las evidencias recibidas.
- `mode`: `deterministic-demo` u `openai`.

`DocumentQueryResponse` mantiene:

- `answer`: respuesta final.
- `mode`: modo de recuperacion (`lexical-demo`, `semantic-pgvector` o `local-demo`).
- `generationMode`: modo de redaccion (`deterministic-demo` u `openai`).
- `sources`: fuentes reales recuperadas y citadas.

El prompt `document-answer.v1` debe indicar que el contenido documental es evidencia no confiable como instrucciones, que solo se puede responder desde esas evidencias y que no se deben inventar referencias.

## Casos de error

- Pregunta sin evidencias: respuesta de evidencia insuficiente, `sources: []` y `generationMode: deterministic-demo`.
- OpenAI no configurado: generador demo determinista.
- OpenAI configurado con error de red, cuota, credenciales o salida invalida: error `AI_PROVIDER_ERROR` en API.
- Salida estructurada con `sourceIds` duplicados, vacios o no recuperados: error `AI_PROVIDER_ERROR`.
- Respuesta sin texto util: error `AI_PROVIDER_ERROR`.
- Recuperador documental fallido: se mantiene el error actual del recuperador, sin invocar el generador.
- Generador documental invocado directamente sin evidencias, con mas de tres evidencias o con evidencias incompletas: error `AI_PROVIDER_ERROR`.

## Restricciones

- OpenAI solo se usa desde backend.
- No se modifica el algoritmo de recuperacion, pgvector, chunking ni umbral de US-017.
- No se envian URLs, scores, `sessionId` ni telemetria con preguntas o contenido documental al reporter.
- No se anaden herramientas, memoria, streaming, busqueda hibrida ni reintentos silenciosos.
- No se crea trabajo de US-019 ni cambios de coordinador IA.
- Todo texto visible para usuario permanece en espanol.

## Estrategia TDD

1. Probar que `AnswerDocumentQuestion` delega la redaccion en `DocumentAnswerGenerator`, acota evidencias, expone solo fuentes citadas y conserva evidencia insuficiente sin invocar al generador.
2. Implementar el puerto y el generador demo determinista reutilizando utilidades documentales existentes.
3. Probar el adaptador OpenAI con cliente fake: prompt versionado, salida estructurada, validacion estricta de fuentes y telemetria `document-answer`.
4. Conectar la composicion de proveedores IA y la API HTTP con generador fake para happy path y error de proveedor.
5. Ampliar contrato compartido, cliente web, UI y E2E para mostrar `generationMode`.
6. Actualizar documentacion y ejecutar `npm run quality`.

## Incrementos y commits

| Incremento                        | Cambio verificable                                                                                | Commit objetivo                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1. Especificacion y proceso       | Crear esta especificacion y exactamente `.changes/us-018.md`.                                     | `docs(us-018): especifica respuestas RAG con OpenAI`         |
| 2. Generador de aplicacion        | Probar e implementar el puerto, generador demo y validacion de fuentes citadas en el caso de uso. | `feat(rag): separa la generacion de respuestas documentales` |
| 3. Adaptador OpenAI documental    | Probar e implementar prompt, salida estructurada, seleccion por API key y errores explicitos.     | `feat(openai): añade generacion RAG con fuentes validadas`   |
| 4. Contrato y experiencia visible | Probar y exponer `generationMode` en API, cliente web, etiquetas de UI y flujo E2E.               | `feat(documents): muestra el modo de generacion RAG`         |
| 5. Documentacion y cierre         | Actualizar README/arquitectura, verificar quality y dejar la historia lista para revision.        | `docs(us-018): documenta respuestas RAG con OpenAI`          |

Cada incremento sigue Red -> Green -> Refactor y ejecuta `npm run precommit:check` antes del commit.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- Cada incremento queda commiteado por separado con Conventional Commit y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al cierre.
- Se anade exactamente un archivo `.changes/us-018.md`.
- Las fuentes mostradas son reales, recuperadas y citadas por la respuesta.
- El modo demo local sigue disponible sin `OPENAI_API_KEY`.
- La PR queda lista para revision con evidencias y limitaciones conocidas.
