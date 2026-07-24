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

**Aceptación:** formulario, generación demo determinista, edición, copia y PDF.

## US-006 · Generador de actas

Como secretario, quiero convertir notas y acuerdos en un acta formal.

**Aceptación:** estructura formal, tareas extraídas, edición y PDF sin inventar datos.

## US-007 · Gestor de incidencias

Como vecino, quiero registrar una incidencia y obtener categoría, prioridad y responsable sugerido.

**Aceptación:** clasificación estructurada, reglas fallback, persistencia por sesión, listado y filtrado por tipo de incidencia, y resolución unidireccional con fecha de cierre.

## US-008 · Preparador de juntas

Como administrador, quiero generar un orden del día desde incidencias y acuerdos pendientes.

**Aceptación:** agregación por sesión, priorización, resultado editable y trazabilidad de entradas.

## US-009 · OpenAI para comunicados e incidencias

Como administrador, quiero generar comunicados y clasificar incidencias con OpenAI manteniendo un modo demo local reproducible.

**Aceptación:** OpenAI solo desde backend, puerto de generación de comunicados, puerto de clasificación de incidencias, adaptadores OpenAI, adaptadores demo, prompts versionados, observabilidad de modelo/tokens/coste/latencia, fallback sin API key, pruebas con proveedor fake y sin llamadas reales en CI.

## US-010 · Comunicados completos

Como administrador, quiero preparar comunicados con tipo, audiencia y tono para reutilizarlos fuera de la aplicación.

**Aceptación:** formulario con asunto, tipo, audiencia y tono; generación editable; copia al portapapeles; exportación PDF; valores por defecto coherentes desde chat; pruebas unitarias, integración y E2E.

## US-011 · Comunicación sugerida en incidencias

Como administrador, quiero obtener una comunicación sugerida al registrar una incidencia para informar a los vecinos con rapidez.

**Aceptación:** la clasificación de incidencias devuelve categoría, prioridad, responsable y comunicado sugerido; la API valida el contrato con Zod; la UI muestra y permite copiar el texto; fallback demo local; pruebas con proveedor fake y sin llamadas reales en CI.

## US-012 · Datos demo completos

Como evaluador, quiero una comunidad demo más completa para probar flujos realistas desde el primer acceso.

**Aceptación:** corpus con presupuesto y comunicados históricos; incidencias iniciales coherentes con el contador de inicio; juntas demo seleccionables; inicialización idempotente por sesión; documentos enlazados como fuentes reales.

## US-013 · Propuestas vecinales

Como vecino, quiero registrar propuestas para que puedan aparecer en el orden del día de una junta.

**Aceptación:** creación y listado de propuestas por sesión; validación Zod; persistencia demo; formulario y listado en UI; integración con el preparador de juntas como fuente trazable.

## US-014 · PostgreSQL para sesiones

Como visitante, quiero que mi sesión demo sea estable durante su periodo de validez aunque el servidor se reinicie.

**Aceptación:** migraciones PostgreSQL; repositorio de sesiones persistente; expiración de 24 horas; límite de solicitudes atómico; fallback en memoria sin `DATABASE_URL`; pruebas de integración.

## US-015 · PostgreSQL para estado de comunidad

Como usuario demo, quiero conservar incidencias, acuerdos pendientes y propuestas dentro de mi sesión.

**Aceptación:** adaptadores PostgreSQL para incidencias, acuerdos y propuestas; aislamiento por sesión; borrado en cascada al expirar sesión; pruebas de reinicio, concurrencia y aislamiento.

## US-016 · PostgreSQL para documentos

Como usuario demo, quiero que los documentos subidos se conserven durante mi sesión y puedan usarse como fuentes.

**Aceptación:** persistencia de metadatos, texto extraído y binario; validación de PDF y tamaño; aislamiento por sesión; recuperación tras reinicio; fallback local; pruebas de integración.

## US-017 · RAG con pgvector

Como propietario, quiero respuestas documentales más relevantes mediante búsqueda semántica.

**Aceptación:** puerto de embeddings; adaptador OpenAI `text-embedding-3-small`; chunking idempotente; índice pgvector; recuperación top 3 con fuentes reales; fallback léxico sin base de datos o API key; pruebas de relevancia.

## US-018 · Respuestas RAG con OpenAI

Como propietario, quiero recibir respuestas redactadas con IA que citen únicamente los documentos recuperados.

**Aceptación:** generador documental OpenAI en backend; respuesta estructurada con fuentes válidas; mensaje de evidencia insuficiente cuando aplique; sin referencias inventadas; modo demo determinista; telemetría; pruebas con proveedor fake.

## US-019 · Coordinador IA con OpenAI

Como usuario, quiero que el chat enrute mis peticiones al agente adecuado usando IA y manteniendo trazabilidad.

**Aceptación:** puerto de clasificación de intención; adaptador OpenAI con salida estructurada; grafo LangGraph con nodos especializados; traza de agente, modo y proveedor; fallback demo explícito; pruebas de rutas e intención.

## US-020 · Actas con OpenAI

Como secretario, quiero generar actas formales con IA a partir de notas y acuerdos sin inventar información.

**Aceptación:** puerto de generación de actas; adaptador OpenAI estructurado; prompts versionados; tareas y acuerdos extraídos; modo demo determinista; edición y PDF se mantienen; pruebas unitarias, integración y E2E.

## US-021 · Preparador de juntas con OpenAI

Como administrador, quiero redactar órdenes del día con IA a partir de incidencias, acuerdos y propuestas trazables.

**Aceptación:** selección determinista de entradas; redacción OpenAI limitada a las fuentes recibidas; modo demo determinista; editor y selector de junta; trazabilidad de entradas; pruebas de priorización y generación.

## US-022 · Límites y observabilidad pública

Como responsable del proyecto, quiero publicar la demo con límites de uso y métricas técnicas sin exponer datos sensibles.

**Aceptación:** telemetría persistida de operación, modelo, tokens, coste, latencia y resultado; cuotas por sesión/IP/día; fallback visible por límite o error; sin almacenar contenido de usuario en telemetría; pruebas de límites y errores.

## US-023 · Despliegue público

Como tribunal, quiero acceder a una demo pública desplegada con frontend, API y base de datos persistente.

**Aceptación:** API en Railway con PostgreSQL/pgvector; frontend en Vercel; proxy `/api`; migraciones y seed en despliegue; healthcheck; variables documentadas; smoke test postdespliegue.

## US-024 · Evaluación automática

Como tribunal, quiero evidencias cuantitativas de calidad para justificar el comportamiento del sistema.

**Aceptación:** datasets de evaluación para RAG, coordinación, incidencias, comunicados, actas y juntas; scripts `eval:demo` y `eval:openai`; métricas y reporte Markdown/JSON; ejecución demo en CI sin llamadas reales.

## US-025 · Estudio y defensa

Como autor del TFM, quiero preparar evidencias finales de utilidad, limitaciones y trazabilidad para la defensa.

**Aceptación:** protocolo con 10 participantes anónimos; resultados agregados; SUS o cuestionario equivalente; actualización de README, arquitectura, despliegue, métricas y limitaciones; matriz objetivo-implementación-prueba.
