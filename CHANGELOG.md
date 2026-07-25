# Changelog

Todos los cambios relevantes se documentan siguiendo [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

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
