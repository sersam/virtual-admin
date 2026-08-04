# Changelog

Todos los cambios relevantes se documentan siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

## 2026-08-04 · PR [#29](https://github.com/sersam/virtual-admin/pull/29)

### Added

- Documenta y prepara el despliegue publico de la demo con API Railway, frontend Vercel, PostgreSQL pgvector y smoke postdespliegue.

## 2026-07-31 · PR [#28](https://github.com/sersam/virtual-admin/pull/28)

### Added

- Añade limites diarios para acciones IA, telemetria publica agregada y avisos de fallback determinista.

## 2026-07-29 · PR [#27](https://github.com/sersam/virtual-admin/pull/27)

### Added

- Prepara ordenes del dia trazables para juntas con redaccion OpenAI en backend y modo demo determinista.

## 2026-07-29 · PR [#26](https://github.com/sersam/virtual-admin/pull/26)

### Added

- US-020 prepara la generacion de actas formales con OpenAI desde backend, manteniendo el modo demo determinista y acuerdos y tareas estructurados.

## 2026-07-28 · PR [#25](https://github.com/sersam/virtual-admin/pull/25)

### Added

- Coordinador IA de chat con enrutado OpenAI o demo determinista y traza visible de agente, modo y proveedor.

## 2026-07-28 · PR [#24](https://github.com/sersam/virtual-admin/pull/24)

### Added

- US-018 añade respuestas RAG redactadas con OpenAI en backend, fuentes validadas contra documentos recuperados, modo demo determinista y telemetria.

## 2026-07-28 · PR [#23](https://github.com/sersam/virtual-admin/pull/23)

### Added

- US-017 añade recuperacion semantica documental con embeddings OpenAI y pgvector cuando la API esta configurada con PostgreSQL y `OPENAI_API_KEY`, manteniendo el fallback lexico demo sin base de datos o sin API key.

## 2026-07-27 · PR [#22](https://github.com/sersam/virtual-admin/pull/22)

### Added

- Añade persistencia PostgreSQL para documentos subidos de la sesión demo, incluyendo metadatos, texto extraído, binario PDF y recuperación tras reinicio.

## 2026-07-27 · PR [#21](https://github.com/sersam/virtual-admin/pull/21)

### Added

- Añade persistencia PostgreSQL para incidencias, acuerdos pendientes y propuestas de la sesión demo.

## 2026-07-27 · PR [#20](https://github.com/sersam/virtual-admin/pull/20)

### Added

- Añade persistencia PostgreSQL para sesiones demo con migraciones explícitas y fallback local en memoria.

## 2026-07-26 · PR [#19](https://github.com/sersam/virtual-admin/pull/19)

### Added

- Permite registrar propuestas vecinales de sesion y usarlas como entradas trazables del orden del dia.

## 2026-07-26 · PR [#18](https://github.com/sersam/virtual-admin/pull/18)

### Added

- US-012 añade datos demo iniciales completos para evaluar la comunidad desde el primer acceso, incorporando presupuesto, comunicados históricos, incidencias, acuerdos y juntas demo seleccionables.

## 2026-07-25 · PR [#17](https://github.com/sersam/virtual-admin/pull/17)

### Added

- Añade un comunicado sugerido persistido a cada incidencia, visible y copiable desde la pantalla de Incidencias, con clasificador OpenAI actualizado a `incident-classification.v2`.

## 2026-07-25 · PR [#16](https://github.com/sersam/virtual-admin/pull/16)

### Changed

- Permite preparar comunicados con asunto, tipo, audiencia, tono, copia al portapapeles y exportacion PDF.

## 2026-07-24 · PR [#15](https://github.com/sersam/virtual-admin/pull/15)

### Changed

- Se desglosa el backlog pendiente del MVP en historias incrementales de la US-010 a la
US-025.

## 2026-07-24 · PR [#14](https://github.com/sersam/virtual-admin/pull/14)

### Added

- Integra OpenAI en backend para comunicados e incidencias con modo demo local reproducible.

## 2026-07-24 · PR [#12](https://github.com/sersam/virtual-admin/pull/12)

### Added

- Añade el preparador de juntas con orden del día determinista desde incidencias y acuerdos pendientes de la sesión, integrado en API, chat y pantalla editable con trazabilidad.

## 2026-07-24 · PR [#13](https://github.com/sersam/virtual-admin/pull/13)

### Added

- Añade el registro y la clasificación determinista de incidencias por sesión, con listado, filtro por tipo, resolución con fecha de cierre e integración en el chat.

## 2026-07-23 · PR [#11](https://github.com/sersam/virtual-admin/pull/11)

### Added

- Añade el registro y la clasificación determinista de incidencias por sesión, con listado, filtro por tipo e integración en el chat.

## 2026-06-27 · PR [#10](https://github.com/sersam/virtual-admin/pull/10)

### Added

- Añade los contratos y el generador demo determinista para actas de reunión.

## 2026-06-26 · PR [#8](https://github.com/sersam/virtual-admin/pull/8)

### Added

- Añade la redacción demo inicial de comunicados desde el chat coordinador.

## 2026-06-24 · PR [#9](https://github.com/sersam/virtual-admin/pull/9)

### Changed

- Separa la integración de OpenAI para comunicados en una historia de usuario propia del backlog.

## 2026-06-24 · PR [#7](https://github.com/sersam/virtual-admin/pull/7)

### Added

- Añade los contratos iniciales de chat, la clasificación de intención del coordinador multiagente y el endpoint backend de mensajes con LangGraph.

## 2026-06-23 · PR [#6](https://github.com/sersam/virtual-admin/pull/6)

### Added

- Añade la consulta documental RAG determinista con corpus ficticio, endpoint API, pantalla de documentos, fuentes trazables y biblioteca de PDFs consultable sin pregunta previa.

## 2026-06-23 · PR [#4](https://github.com/sersam/virtual-admin/pull/4)

### Added

- Incorpora la API base Express con sesiones demo aisladas por cookie firmada, contratos Zod compartidos y fallback local de sesión en el frontend.

## 2026-06-23 · PR [#5](https://github.com/sersam/virtual-admin/pull/5)

### Added

- Añade Husky con hooks de pre-commit y pre-push para ejecutar controles automáticos antes de confirmar y subir cambios.

## 2026-06-22 · PR [#3](https://github.com/sersam/virtual-admin/pull/3)

### Fixed

- Permite que la automatización del changelog actualice la rama protegida `main` mediante un token administrativo de alcance limitado.

## 2026-06-22 · PR [#2](https://github.com/sersam/virtual-admin/pull/2)

### Added

- Incorpora el shell responsive, la portada y los datos demo de Residencial Sierra Nevada, junto con pruebas unitarias, de integración y end-to-end obligatorias.

## 2026-06-21 · PR [#1](https://github.com/sersam/virtual-admin/pull/1)

### Added

- Fundamentos de Clean Architecture, estándares automáticos de calidad y flujo incremental por historias de usuario.
