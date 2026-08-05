# Administrador Virtual Inteligente

## Descripción general

**Administrador Virtual Inteligente** es un MVP para la gestión de comunidades de propietarios. La aplicación simula la administración de la comunidad ficticia **Residencial Sierra Nevada** y explora cómo los modelos de lenguaje, la generación aumentada por recuperación (RAG) y la coordinación de agentes especializados pueden asistir en tareas administrativas reales.

El sistema ofrece una aplicación web responsive y una API HTTP. Puede ejecutarse completamente en modo demo, sin servicios externos, o conectarse de forma opcional a OpenAI y PostgreSQL con pgvector. No incluye autenticación ni gestión de roles; cada visitante trabaja en una sesión demo aislada mediante una cookie firmada.

Demo pública: [virtual-admin-web-two.vercel.app](https://virtual-admin-web-two.vercel.app/).

Documentación relacionada:

- [Backlog del MVP](docs/backlog.md)
- [Arquitectura detallada](docs/architecture.md)
- [Guía de despliegue](docs/deployment.md)
- [Matriz de trazabilidad](docs/defense-traceability.md)
- [Métricas y limitaciones](docs/final-metrics-limitations.md)
- [Guía de contribución](CONTRIBUTING.md)

## Funcionalidades de la aplicación

| Área             | Funcionalidad                                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inicio           | Resume el estado de la comunidad y muestra métricas agregadas de uso de IA, tokens, coste, latencia y fallbacks.                                                                  |
| Chat inteligente | Clasifica cada petición y la dirige a uno de los agentes de documentos, comunicados, actas, incidencias, juntas o consulta general. La interfaz muestra la traza de enrutamiento. |
| Documentos       | Permite consultar estatutos, normas, actas y contratos mediante lenguaje natural, subir archivos PDF de hasta 5 MB y abrir las fuentes reales utilizadas en cada respuesta.       |
| Comunicados      | Genera borradores de avisos para la comunidad a partir de un tema y un contexto.                                                                                                  |
| Actas            | Convierte notas de una reunión en un acta editable con acuerdos y tareas estructuradas; las tareas pueden incorporarse como asuntos pendientes de futuras juntas.                 |
| Incidencias      | Registra incidencias, sugiere categoría, prioridad y responsable, y permite consultar su estado.                                                                                  |
| Juntas           | Prepara órdenes del día con incidencias pendientes, acuerdos y propuestas vecinales, y permite seleccionar reuniones próximas.                                                    |

Además, el MVP incorpora:

- Datos precargados de la comunidad ficticia y fallbacks deterministas para trabajar sin OpenAI.
- Recuperación documental léxica en modo local y recuperación semántica con embeddings y pgvector cuando OpenAI y PostgreSQL están configurados.
- Persistencia opcional de sesiones, incidencias, propuestas, acuerdos, documentos, cuotas y telemetría.
- Límites diarios configurables para acciones de IA y fallback explícito cuando se agota la cuota o falla el proveedor.
- Evaluaciones automáticas reproducibles para los principales flujos del sistema.

## Stack tecnológico

| Capa                    | Tecnologías principales                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| Lenguaje y monorepo     | TypeScript 5, Node.js 20+, npm workspaces                                    |
| Frontend                | React 19, Vite 6, React Router 7, Tailwind CSS 4, Lucide React               |
| Backend                 | Express 5, Zod 4, Multer, pdf-parse                                          |
| Inteligencia artificial | OpenAI Responses API, `gpt-5-nano`, `text-embedding-3-small`, LangGraph      |
| Persistencia            | PostgreSQL, pgvector, Drizzle ORM; repositorios en memoria para el modo demo |
| Pruebas                 | Vitest, Testing Library, Supertest, Testcontainers y Playwright              |
| Calidad                 | TypeScript estricto, ESLint, Prettier, Husky y SonarCloud opcional           |
| Despliegue              | Vercel para el frontend y Railway para la API y PostgreSQL                   |

Los contratos de transporte se comparten entre frontend y backend y se validan con esquemas Zod. OpenAI se consume exclusivamente desde la API; ninguna credencial se expone en el navegador.

## Instalación y ejecución

### Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Git.
- Docker Desktop, solo si se van a ejecutar las pruebas de integración con PostgreSQL incluidas en la quality gate.

### Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd administrador-virtual-inteligente
npm install
```

### Ejecución local en modo demo

No es necesario configurar OpenAI ni una base de datos. Arranca la API en una terminal:

```bash
npm run dev:api
```

En otra terminal, arranca el frontend:

```bash
npm run dev:web
```

`npm run dev` es un alias de `npm run dev:web`.

- Aplicación web: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3000](http://localhost:3000)
- Healthcheck: [http://localhost:3000/health](http://localhost:3000/health)

Vite reenvía las peticiones `/api` a la API local. Si la API no está disponible, el frontend mantiene fallbacks locales para los flujos compatibles.

### Configuración opcional

La API carga automáticamente el archivo `.env` situado en la raíz al ejecutar `npm run dev:api` o `npm run db:migrate`. Variables disponibles:

```dotenv
# Activa los proveedores OpenAI del backend.
OPENAI_API_KEY=<TU_API_KEY>

# Activa la persistencia y, junto con OPENAI_API_KEY, el RAG semántico.
DATABASE_URL=postgres://usuario:password@localhost:5432/admin_virtual

# En desarrollo se usa un valor local por defecto; define secretos propios fuera de local.
COOKIE_SECRET=<SECRETO_DE_COOKIES>
AI_ACTION_QUOTA_SECRET=<SECRETO_PARA_HASHES_DE_CUOTA>

# Valores opcionales; sus valores predeterminados son 20 y 100.
AI_ACTION_SESSION_DAILY_LIMIT=20
AI_ACTION_IP_DAILY_LIMIT=100
```

Con `DATABASE_URL` configurada, aplica las migraciones antes de arrancar la API:

```bash
npm run db:migrate
npm run dev:api
```

La base de datos debe disponer de la extensión pgvector y el usuario de migración debe poder habilitarla. Si `DATABASE_URL` no está definida, se utilizan repositorios en memoria. Si `OPENAI_API_KEY` no está definida, se utilizan generadores deterministas y recuperación léxica sin llamadas externas.

### Comprobaciones y comandos útiles

```bash
npm run quality          # Quality gate completa
npm run precommit:check  # Formato, lint, tipos, tests raíz y changelog
npm test                 # Pruebas unitarias y de integración
npm run test:e2e         # Pruebas end-to-end con Playwright
npm run test:coverage    # Pruebas con cobertura
npm run build            # Compilación de todos los workspaces
npm run eval:demo        # Evaluación determinista sin servicios externos
npm run eval:openai      # Evaluación con OpenAI; requiere OPENAI_API_KEY
npm run study:check      # Valida el protocolo US-025; status: not-conducted
```

`npm run quality` ejecuta formato, lint, comprobación de tipos, pruebas, compilación, E2E, evaluación demo, validación del estudio y validación del fragmento de changelog. Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para conocer el flujo de desarrollo completo.

## Estructura del código

El repositorio es un monorepo organizado con npm workspaces:

```text
.
├── apps/
│   ├── api/                    # API Express
│   │   ├── drizzle/            # Migraciones PostgreSQL
│   │   ├── evaluation/         # Datasets de evaluación
│   │   └── src/
│   │       ├── domain/         # Entidades y reglas de negocio puras
│   │       ├── application/    # Casos de uso y puertos
│   │       ├── infrastructure/ # Adaptadores de BD, OpenAI, RAG y telemetría
│   │       └── presentation/   # API HTTP y CLI de evaluación
│   └── web/                    # SPA React
│       ├── e2e/                # Pruebas Playwright
│       └── src/
│           ├── app/            # Arranque, rutas y layout global
│           ├── pages/          # Composición de pantallas
│           ├── features/       # Flujos funcionales por área
│           └── shared/         # UI, configuración, hooks y cliente HTTP
├── packages/
│   ├── community-notices/      # Reglas compartidas de comunicados
│   ├── contracts/              # DTOs y esquemas Zod compartidos
│   ├── incidents/              # Clasificación de incidencias
│   └── meeting-minutes/        # Modelo compartido de actas
├── docs/                       # Arquitectura, especificaciones y operación
├── scripts/                    # Automatización de calidad, estudio y despliegue
└── tooling/                    # Quality gate del repositorio
```

### Arquitectura backend

La API aplica Clean Architecture. Las dependencias apuntan hacia el dominio:

```mermaid
flowchart LR
    UI["Frontend React"] --> P["Presentation · Express"]
    P --> A["Application · Casos de uso y puertos"]
    A --> D["Domain · Entidades y reglas"]
    I["Infrastructure · PostgreSQL, OpenAI y modo demo"] -. "implementa puertos" .-> A
```

- `domain` no conoce frameworks ni infraestructura.
- `application` coordina los casos de uso y define los puertos externos.
- `infrastructure` implementa persistencia, IA, recuperación documental y telemetría.
- `presentation` adapta HTTP o CLI a los casos de uso.

### Arquitectura frontend

- `app` configura el enrutamiento y el layout principal.
- `pages` compone las pantallas asociadas a cada ruta.
- `features` encapsula los flujos de chat, documentos, comunicados, actas, incidencias, juntas, propuestas, sesión y observabilidad.
- `shared` contiene piezas reutilizables sin lógica específica de una funcionalidad.

Las especificaciones versionadas de cada historia están en [`docs/specs`](docs/specs), que actúa como fuente de verdad del comportamiento implementado.
