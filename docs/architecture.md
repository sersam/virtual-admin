# Arquitectura objetivo

## Backend

- `domain`: entidades y reglas puras.
- `application`: casos de uso y puertos.
- `infrastructure`: PostgreSQL, pgvector, OpenAI y adaptadores locales.
- `presentation`: Express, controladores y validación HTTP.

Las dependencias apuntan hacia el dominio. Express, OpenAI y PostgreSQL son detalles reemplazables.

La consulta documental se mantiene en la capa de aplicacion mediante `DocumentRetriever`, `DocumentAnswerGenerator` y `EmbeddingProvider`. El dominio conserva documentos y chunking determinista como reglas puras; la infraestructura decide entre recuperacion lexica local o recuperacion semantica con OpenAI y pgvector segun la configuracion disponible. La redaccion RAG valida que las fuentes citadas por el generador existan entre los documentos recuperados antes de exponerlas por HTTP.

El chat se coordina mediante `ChatWorkflow` y el puerto `ChatIntentClassifier`. La infraestructura LangGraph clasifica primero la intencion y enruta a nodos especializados para documentos, comunicados, actas, incidencias, juntas o respuesta general. La clasificacion puede usar OpenAI con salida estructurada o un adaptador demo determinista; los nodos delegan en los casos de uso existentes y la respuesta transporta `agent`, `mode` y `provider` para mantener trazabilidad visible.

La generacion de actas se mantiene en aplicacion mediante `MeetingMinutesGenerator`. El caso de uso `DraftMeetingMinutes` no conoce OpenAI: delega la generacion en el puerto y, si el resultado es satisfactorio y existe sesion, persiste solo las tareas como acuerdos pendientes. La infraestructura decide entre `DeterministicMeetingMinutesGenerator` y `OpenAiMeetingMinutesGenerator` segun `OPENAI_API_KEY`. El adaptador OpenAI usa Responses API, prompt `meeting-minutes.v1`, esquema `meeting_minutes_draft_v1`, telemetria `meeting-minutes` y validacion Zod antes de exponer el borrador. Los acuerdos estructurados son visibles en transporte y UI, pero no modifican el estado persistente.

La preparacion de juntas vive en aplicacion mediante `DraftMeetingAgenda` y el puerto `MeetingAgendaGenerator`. El caso de uso selecciona, prioriza y limita las entradas de forma determinista antes de delegar la redaccion: incidencias pendientes, acuerdos pendientes y propuestas vecinales trazables. `draft.title`, `draft.items` y `meeting` nunca dependen del modelo. La infraestructura decide entre `DeterministicMeetingAgendaGenerator` y `OpenAiMeetingAgendaGenerator` segun `OPENAI_API_KEY`. El adaptador OpenAI usa Responses API, prompt `meeting-agenda.v1`, esquema `meeting_agenda_draft_v1`, telemetria `meeting-agenda`, maximo 1.500 tokens de salida y validacion Zod `{ body }`. Si no hay entradas no se invoca OpenAI; si el proveedor falla o devuelve salida invalida, la API responde `AI_PROVIDER_ERROR` sin fallback silencioso.

## Frontend

- `app`: arranque, rutas y proveedores.
- `pages`: composición de pantallas.
- `features`: flujos verticales del usuario.
- `shared`: UI, cliente HTTP, hooks y utilidades reutilizables.

Cada historia deberá justificar cualquier dependencia nueva y mantener componentes con una única responsabilidad.
