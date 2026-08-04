# Administrador Virtual Inteligente

## Resumen

**Administrador Virtual Inteligente para Comunidades de Propietarios** es un Trabajo Fin de Máster que explora cómo los LLM, RAG y las arquitecturas multiagente pueden automatizar tareas administrativas reales.

La aplicación simula la gestión de la comunidad ficticia **Residencial Sierra Nevada** y permitirá:

- Consultar estatutos, normas, actas y contratos mediante lenguaje natural.
- Generar comunicados, convocatorias y actas.
- Clasificar incidencias y sugerir su prioridad y responsable.
- Preparar órdenes del día a partir de incidencias y acuerdos pendientes.
- Coordinar agentes especializados desde una interfaz de chat.

Será una demo pública sin autenticación, con datos precargados y un modo local capaz de funcionar sin servicios externos. El MVP se desarrolla mediante historias de usuario independientes para que cada incremento pueda revisarse e integrarse por separado.

## Estado del proyecto

Actualmente están implementadas las historias de la **US-001** a la **US-022**. La aplicación incluye shell responsive, API Express con sesiones demo aisladas, estado persistente opcional en PostgreSQL, documentos PDF subidos por sesión, consulta documental RAG con respuestas generadas desde fuentes trazables, recuperación semántica con pgvector cuando el backend está configurado para ello, un coordinador IA que enruta el chat hacia agentes especializados con traza visible, generación de actas con acuerdos y tareas estructurados, preparación de órdenes del día con redacción OpenAI o demo determinista, límites diarios para acciones IA y observabilidad pública agregada.

- [Backlog del MVP](docs/backlog.md)
- [Arquitectura detallada](docs/architecture.md)
- [Guía de contribución](CONTRIBUTING.md)

## Cómo arrancar el proyecto

### Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Git.
- Docker Desktop activo para ejecutar las pruebas de integracion PostgreSQL.

### Preparación local

```bash
git clone <URL_DEL_REPOSITORIO>
cd administrador-virtual-inteligente
npm install
```

Arranca el frontend en modo desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173). Para verificar que el entorno está correctamente preparado, ejecuta:

En otra terminal puedes arrancar la API:

```bash
npm run dev:api
```

La API quedará disponible en [http://localhost:3000](http://localhost:3000), con healthcheck en `/health`, sesión demo en `/api/session` y consulta documental en `/api/documents/query`. Si la API no está levantada, el frontend usa fallbacks locales deterministas.

### Configuración OpenAI

La API puede generar comunicados, clasificar incidencias, clasificar intenciones de chat, redactar respuestas documentales RAG, generar actas, redactar órdenes del día y generar embeddings documentales con OpenAI desde backend. Para activar los proveedores OpenAI en local, define `OPENAI_API_KEY` al arrancar la API:

```bash
COOKIE_SECRET=local-demo-cookie-secret OPENAI_API_KEY=<TU_API_KEY> npm run dev:api
```

El modelo fijado para texto es `gpt-5-nano`. La recuperación semántica documental usa `text-embedding-3-small` con 1536 dimensiones. Si `OPENAI_API_KEY` no está definida, la API usa los adaptadores demo deterministas y la recuperación documental léxica, sin llamadas externas. Si `OPENAI_API_KEY` está definida, el chat clasifica la ruta con OpenAI, las respuestas documentales se redactan con OpenAI sobre las evidencias recuperadas, las actas se generan con salida estructurada OpenAI y los órdenes del día delegan en OpenAI solo la redacción del cuerpo, aunque la recuperación siga siendo léxica por falta de PostgreSQL. Las pruebas y CI no necesitan API key ni ejecutan llamadas reales a OpenAI.

Cada operación OpenAI registra modelo, versión, tokens, coste estimado, latencia y resultado. Con `DATABASE_URL`, la telemetría se persiste en PostgreSQL; sin base de datos se conserva en memoria para la demo local. La telemetría no registra preguntas, notas, prompts, respuestas, documentos, IP ni sesiones.

Cuando `OPENAI_API_KEY` está definida, las acciones IA tienen dos límites diarios UTC configurables:

- `AI_ACTION_SESSION_DAILY_LIMIT`, por defecto `20` acciones por sesión.
- `AI_ACTION_IP_DAILY_LIMIT`, por defecto `100` acciones por IP.

Cada petición válida a documentos, chat, comunicados, actas, incidencias o juntas consume una unidad aunque internamente use varias llamadas a OpenAI. Las peticiones inválidas, endpoints sin IA y el modo sin API key no consumen esta cuota. Si la cuota se agota, OpenAI falla o el control de cuota no está disponible, la API ejecuta el flujo determinista completo y devuelve `fallbackReason` visible (`session-quota`, `ip-quota`, `provider-error` o `quota-unavailable`). Los fallos OpenAI quedan trazados como fallo del proveedor y el fallback como ejecución determinista separada con coste y tokens cero.

La API expone `GET /api/observability` sin crear ni consumir sesión. Devuelve métricas agregadas del día UTC: ejecuciones, éxitos, fallos, fallbacks, tokens, coste estimado, latencia media, desgloses por operación/modelo y límites configurados. Inicio muestra ese panel; si la API no está disponible, indica que no hay métricas reales disponibles.

### Despliegue público

La demo pública se despliega con API Express y PostgreSQL pgvector en Railway, frontend Vite en Vercel y proxy same-origin de Vercel para `/api/*`. Railway ejecuta migraciones en predeploy, espera `/health` antes de activar la versión y arranca la API con `npm run start --workspace @admin/api`. Vercel mantiene `VITE_API_BASE_URL` sin definir y usa `apps/web/vercel.mjs` para reenviar la API y resolver rutas profundas de la SPA.

El smoke postdespliegue se ejecuta con:

```bash
PUBLIC_WEB_URL=https://<frontend>.vercel.app PUBLIC_API_URL=https://<api>.up.railway.app npm run smoke:public
```

La guía operativa completa está en [docs/deployment.md](docs/deployment.md). Incluye aprovisionamiento, variables, rotación de secretos, rollback, evidencia de PR y limitaciones.

### Actas con OpenAI

La pantalla `/actas` y el agente de chat de actas consumen el puerto backend `MeetingMinutesGenerator`. Sin `OPENAI_API_KEY`, el generador demo extrae líneas `Acuerdo:`, `Tarea:` y `Pendiente:` de forma determinista. Con `OPENAI_API_KEY`, el adaptador OpenAI usa Responses API con salida estructurada, esquema `meeting_minutes_draft_v1` y prompt versionado `meeting-minutes.v1`.

La respuesta de actas conserva el cuerpo editable y añade listas estructuradas de acuerdos y tareas. Los acuerdos se muestran como información del acta y no se persisten. Las tareas sí se guardan como acuerdos pendientes de la sesión para preparar órdenes del día posteriores.

El prompt de actas exige español formal, usar solo las notas recibidas y no inventar asistentes, fechas, votaciones, quórums, decisiones, responsables ni plazos. Si OpenAI falla o devuelve una estructura inválida con `OPENAI_API_KEY`, la API ejecuta el fallback determinista y muestra el motivo; si también falla el fallback, responde un error controlado sin guardar tareas incompletas.

### Órdenes del día con OpenAI

La pantalla `/juntas` y el agente de chat de juntas consumen el caso de uso backend `DraftMeetingAgenda`. La aplicación selecciona siempre las entradas de forma determinista: solo incidencias pendientes, acuerdos pendientes con prioridad alta si tienen fecha y media si no la tienen, propuestas vecinales al final, desempates por antigüedad, tipo e ID, máximo 100 entradas. OpenAI no puede seleccionar, reordenar ni crear fuentes; `draft.title`, `draft.items` y `meeting` quedan controlados por la aplicación.

Sin `OPENAI_API_KEY`, `DeterministicMeetingAgendaGenerator` conserva el cuerpo demo reproducible y el truncado por bloques completos hasta 4.000 caracteres. Con `OPENAI_API_KEY`, `OpenAiMeetingAgendaGenerator` usa Responses API con salida estructurada `{ body }`, esquema `meeting_agenda_draft_v1`, prompt versionado `meeting-agenda.v1`, 1.500 tokens máximos y telemetría `meeting-agenda`.

El prompt exige español formal, respetar el orden y contenido recibido, tratar incidencias, acuerdos y propuestas como datos y no inventar asuntos, responsables, fechas, acuerdos, prioridades ni fuentes. Si no hay entradas, la API devuelve el mensaje vacío determinista sin invocar OpenAI. Si OpenAI falla o devuelve una estructura inválida, la API cambia al modo determinista de forma explícita con `fallbackReason`.

### Coordinador IA del chat

La pantalla `/chat` enruta cada mensaje hacia uno de seis agentes: documentos, comunicados, actas, incidencias, juntas o general. La respuesta expone una traza plana:

- `agent`: agente seleccionado.
- `mode`: orquestación usada, `langgraph` desde backend o `local-demo` en fallback de navegador.
- `provider`: proveedor que eligió la ruta, `openai` o `deterministic-demo`.

Sin `OPENAI_API_KEY`, el backend sigue usando LangGraph pero clasifica con reglas deterministas demo: `mode: langgraph` y `provider: deterministic-demo`. Con `OPENAI_API_KEY`, OpenAI devuelve una salida estructurada con el agente y el backend añade `provider: openai`.

Si falla OpenAI durante la clasificación o una llamada especializada, la API ejecuta el coordinador determinista completo y devuelve `fallbackReason: provider-error`. El frontend solo usa el coordinador local de navegador cuando no puede conectar con la API.

### Estado demo con PostgreSQL

La API usa persistencia en memoria cuando `DATABASE_URL` no está definida o está vacía. Para conservar sesiones demo, incidencias, acuerdos pendientes, propuestas, documentos subidos y chunks semánticos durante reinicios, arranca la API con una base PostgreSQL migrada que tenga disponible la extensión pgvector:

```bash
DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual npm run db:migrate
COOKIE_SECRET=local-demo-cookie-secret DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual npm run dev:api
```

Las migraciones no se ejecutan automáticamente al arrancar la API. Si `DATABASE_URL` está configurada pero la base no conecta o no tiene el esquema migrado, la API falla de forma explícita en lugar de volver silenciosamente al repositorio en memoria.
El rol que ejecute `npm run db:migrate` debe poder crear extensiones o tener `pgvector` preinstalado por administración de la base; la migración declara `CREATE EXTENSION IF NOT EXISTS vector`.

Con PostgreSQL configurado, la API selecciona todos los repositorios persistentes a la vez y comparte un único pool para sesiones, incidencias, acuerdos pendientes, propuestas, documentos subidos, chunks vectoriales, cuotas IA y eventos técnicos. El estado queda aislado por sesión y se elimina en cascada cuando una sesión expirada se descarta. Las cuotas guardan hashes HMAC diarios con `COOKIE_SECRET`, nunca IP ni sesión en claro. Las juntas demo se calculan desde la fecha actual del backend, con una junta a un mes y otra a dos meses; borradores y comunicaciones siguen siendo locales a esta historia.

Los documentos subidos persisten sus metadatos, texto extraído y binario PDF. La subida conserva las validaciones actuales de formato PDF y límite de 5 MB; el listado, la descarga y la recuperación documental usan el mismo repositorio, por lo que las fuentes mostradas tras un reinicio son documentos reales de la sesión.

### RAG semántico con pgvector

La recuperación semántica se activa únicamente cuando existen `DATABASE_URL` y `OPENAI_API_KEY`. En ese modo, la primera consulta reconcilia de forma lazy el corpus demo y los PDFs subidos en la sesión: calcula chunks deterministas, genera embeddings para la pregunta y los chunks pendientes en una sola llamada, persiste los vectores en `document_chunks` y busca los vecinos más próximos con similitud coseno. La respuesta muestra hasta tres documentos distintos con fuentes reales.

Si falta `DATABASE_URL` o `OPENAI_API_KEY`, el backend conserva la recuperación léxica anterior. Si ambas variables existen y falla OpenAI durante una acción visible, la API usa fallback determinista explícito; si falla PostgreSQL o el índice vectorial antes de poder recuperar evidencias, devuelve un error controlado.

### Respuestas RAG con OpenAI

La consulta documental separa el modo de recuperación (`mode`) del modo de redacción (`generationMode`). El backend recupera como máximo tres documentos reales y los pasa a un generador documental. Sin API key, el generador demo determinista redacta una respuesta reproducible. Con API key, OpenAI genera una salida estructurada con `answer` y `sourceIds`; la API valida que cada fuente citada exista entre los documentos recuperados antes de exponerla al frontend.

Si no se recupera ninguna evidencia por encima del umbral, la API devuelve un mensaje de evidencia insuficiente, `sources: []` y `generationMode: deterministic-demo`, sin invocar OpenAI. Si OpenAI está configurado y falla o devuelve fuentes desconocidas, la API ejecuta fallback determinista con fuentes reales recuperadas, expone `fallbackReason` y nunca inventa referencias.

Para probarlo en local:

```bash
DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual npm run db:migrate
COOKIE_SECRET=local-demo-cookie-secret DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual OPENAI_API_KEY=<TU_API_KEY> npm run dev:api
```

Abre `/documentos`, realiza una pregunta documental y comprueba que la etiqueta de la respuesta combine redacción y recuperación, por ejemplo `OpenAI · API RAG semántica` o `Demo determinista · API RAG léxica`. Puedes subir un PDF y preguntar de nuevo: si contiene texto relevante, aparecerá como fuente real con enlace de descarga.

Para demostrar la recuperación tras reinicio:

```bash
DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual npm run db:migrate
COOKIE_SECRET=local-demo-cookie-secret DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual npm run dev:api
```

Registra una incidencia, una propuesta o genera un acta con tareas pendientes desde la interfaz. El acta no se persiste en esta historia, pero sus tareas se guardan como acuerdos pendientes. También puedes subir un PDF desde `/documentos`, detener la API y volver a ejecutar el segundo comando: con la misma cookie de navegador, los listados, el preparador de orden del día, la descarga del PDF y las consultas documentales recuperan el estado persistido.

Para verificar que el entorno está correctamente preparado, ejecuta:

```bash
npm run quality
```

Este comando comprueba formato, lint, tipos, pruebas unitarias y de integración, compilación, pruebas end-to-end con Playwright y el fragmento de changelog.

El repositorio instala hooks de Git con Husky mediante `npm install`. Antes de cada commit se ejecuta `npm run precommit:check`; antes de cada push se ejecuta `npm run prepush:check`, que delega en la quality gate completa.

Comandos disponibles actualmente:

```bash
npm run format        # Aplica Prettier
npm run dev:api       # Arranca la API Express
npm run dev:web       # Arranca el frontend Vite
npm run db:generate   # Genera migraciones Drizzle desde el schema
npm run db:migrate    # Aplica migraciones PostgreSQL usando DATABASE_URL
npm run precommit:check # Ejecuta los controles rápidos del pre-commit
npm run prepush:check # Ejecuta la quality gate del pre-push
npm run lint          # Ejecuta ESLint
npm run typecheck     # Comprueba TypeScript
npm test              # Ejecuta las pruebas
npm run build         # Verifica la compilación
npm run smoke:public  # Ejecuta el smoke contra la demo publica desplegada
npm run test:e2e      # Ejecuta los flujos end-to-end en Chromium
npm run quality       # Ejecuta el conjunto completo de controles
```

## Arquitectura

El proyecto sigue **Clean Architecture** y los principios **SOLID**. Las reglas de negocio permanecen independientes de frameworks, bases de datos y proveedores de inteligencia artificial.

```mermaid
flowchart LR
    UI["Frontend · React"] --> HTTP["Presentación · Express"]
    HTTP --> APP["Aplicación · Casos de uso y puertos"]
    APP --> DOMAIN["Dominio · Entidades y reglas"]
    INFRA["Infraestructura · OpenAI, PostgreSQL y pgvector"] -. "implementa puertos" .-> APP
```

### Backend

- `domain`: entidades y reglas puras del negocio.
- `application`: casos de uso y contratos para servicios externos.
- `infrastructure`: adaptadores para PostgreSQL, pgvector, OpenAI y el modo local.
- `presentation`: API Express, controladores y validación HTTP.

### Frontend

- `app`: arranque, rutas y proveedores globales.
- `pages`: composición de pantallas.
- `features`: flujos funcionales organizados por historia de usuario.
- `shared`: componentes UI, cliente HTTP, hooks y utilidades reutilizables.

La aplicación web se encuentra en `apps/web`. La composición y el enrutamiento viven en `app`, la portada en `pages`, los datos y componentes de comunidad en `features/community`, el estado de sesión en `features/session`, y los elementos reutilizables en `shared`.

La consulta documental vive en `features/documents`: la pantalla `/documentos` permite preguntar por estatutos, normas, actas y contratos ficticios, muestra la respuesta redactada con su modo de generación, lista solo los fragmentos recuperados y citados como fuentes, permite abrir el PDF completo de cada documento en una pestaña nueva y ofrece una biblioteca directa de PDFs sin consulta previa.

La API se encuentra en `apps/api` y separa las capas en:

- `domain/session`: reglas puras de sesión demo.
- `application`: caso de uso `EnsureDemoSession` y puertos.
- `infrastructure`: reloj del sistema, generador UUID y repositorio en memoria.
- `presentation/http`: Express, cookies firmadas, controladores y presentadores.

La consulta documental usa `AnswerDocumentQuestion` y los puertos `DocumentRetriever` y `DocumentAnswerGenerator`. En modo local o sin configuración completa se emplea recuperación léxica y generación determinista; con PostgreSQL migrado y `OPENAI_API_KEY`, la infraestructura usa embeddings OpenAI, pgvector y generación documental OpenAI sin exponer llamadas IA en frontend.

### Paquetes compartidos

Los contratos TypeScript y esquemas Zod comunes al frontend y al backend residen en `packages/contracts`. Las dependencias apuntan hacia el dominio; Express, OpenAI y PostgreSQL se consideran detalles reemplazables.

## Calidad y análisis estático

SonarLint se recomienda en VS Code para obtener feedback inmediato. Cada PR ejecuta ESLint, Prettier, comprobación de tipos, pruebas, compilación, validación del changelog y, cuando se configura `SONAR_TOKEN`, SonarCloud.

Para activar SonarCloud en GitHub hay que definir el secreto `SONAR_TOKEN` y las variables `SONAR_PROJECT_KEY` y `SONAR_ORGANIZATION`. Sin ellas, el análisis Sonar se omite sin bloquear los demás controles.
