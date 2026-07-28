# Arquitectura objetivo

## Backend

- `domain`: entidades y reglas puras.
- `application`: casos de uso y puertos.
- `infrastructure`: PostgreSQL, pgvector, OpenAI y adaptadores locales.
- `presentation`: Express, controladores y validación HTTP.

Las dependencias apuntan hacia el dominio. Express, OpenAI y PostgreSQL son detalles reemplazables.

La consulta documental se mantiene en la capa de aplicacion mediante `DocumentRetriever`, `DocumentAnswerGenerator` y `EmbeddingProvider`. El dominio conserva documentos y chunking determinista como reglas puras; la infraestructura decide entre recuperacion lexica local o recuperacion semantica con OpenAI y pgvector segun la configuracion disponible. La redaccion RAG valida que las fuentes citadas por el generador existan entre los documentos recuperados antes de exponerlas por HTTP.

El chat se coordina mediante `ChatWorkflow` y el puerto `ChatIntentClassifier`. La infraestructura LangGraph clasifica primero la intencion y enruta a nodos especializados para documentos, comunicados, actas, incidencias, juntas o respuesta general. La clasificacion puede usar OpenAI con salida estructurada o un adaptador demo determinista; los nodos delegan en los casos de uso existentes y la respuesta transporta `agent`, `mode` y `provider` para mantener trazabilidad visible.

## Frontend

- `app`: arranque, rutas y proveedores.
- `pages`: composición de pantallas.
- `features`: flujos verticales del usuario.
- `shared`: UI, cliente HTTP, hooks y utilidades reutilizables.

Cada historia deberá justificar cualquier dependencia nueva y mantener componentes con una única responsabilidad.
