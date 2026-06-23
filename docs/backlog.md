# Backlog incremental del MVP

## US-000 · Fundamentos, arquitectura y calidad

Como equipo, queremos estándares automáticos para integrar código de forma segura.

**Incluye:** AGENTS.md, Clean Architecture, ESLint, Prettier, TypeScript estricto, SonarLint recomendado, SonarCloud opcional en CI, plantilla de PR y changelog automático.

**Aceptación:** `npm run quality` funciona y una PR valida calidad y fragmento de cambios.

## US-001 · Shell navegable y comunidad demo

Como evaluador, quiero abrir una interfaz institucional responsive y conocer Residencial Sierra Nevada.

**Aceptación:** layout, navegación, inicio, datos ficticios, accesibilidad básica y pruebas visuales/componentes.

## US-002 · API base y sesiones aisladas

Como visitante, quiero usar la demo sin registro y sin compartir mi estado con otros usuarios.

**Aceptación:** Express, healthcheck, cookie firmada, límites, validación, almacenamiento en memoria y contrato Zod.

## US-003 · Consulta documental RAG

Como propietario, quiero preguntar por estatutos, normas y actas viendo las fuentes utilizadas.

**Aceptación:** documentos precargados, recuperación léxica de fallback, pgvector, embeddings, respuesta con fragmentos, fuentes enlazadas a PDF completo en nueva pestaña y pruebas de relevancia.

## US-004 · Coordinador y chat multiagente

Como usuario, quiero escribir una petición libre y ser atendido por el agente adecuado.

**Aceptación:** LangGraph, clasificación de intención, chat, indicador de agente/modo y rutas verificadas.

## US-005 · Generador de comunicados

Como administrador, quiero redactar comunicaciones según tipo, audiencia y tono.

**Aceptación:** formulario, OpenAI/fallback, edición, copia y PDF.

## US-006 · Generador de actas

Como secretario, quiero convertir notas y acuerdos en un acta formal.

**Aceptación:** estructura formal, tareas extraídas, edición y PDF sin inventar datos.

## US-007 · Gestor de incidencias

Como vecino, quiero registrar una incidencia y obtener categoría, prioridad y responsable sugerido.

**Aceptación:** clasificación estructurada, reglas fallback, persistencia por sesión y listado.

## US-008 · Preparador de juntas

Como administrador, quiero generar un orden del día desde incidencias y acuerdos pendientes.

**Aceptación:** agregación por sesión, priorización, resultado editable y trazabilidad de entradas.

## US-009 · PostgreSQL, despliegue y evaluación

Como tribunal, quiero acceder a una demo pública reproducible y evidencias medibles.

**Aceptación:** Docker/pgvector, migraciones, Vercel/Render o Railway, dataset de evaluación, métricas y guía de defensa.
