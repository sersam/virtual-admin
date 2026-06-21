# Administrador Virtual Inteligente

## Objetivo

Construir el MVP por historias de usuario pequeñas, demostrables e integrables mediante PR.

## Arquitectura

- Aplicar Clean Architecture y SOLID.
- Backend: `domain`, `application`, `infrastructure`, `presentation`.
- Frontend: `app`, `pages`, `features`, `shared`.
- El dominio no importa infraestructura, frameworks ni presentación.
- Las dependencias externas se conectan mediante puertos de `application`.
- Extraer componentes reutilizables y evitar archivos multipropósito.

## Flujo por historia de usuario

- Una rama `codex/us-NNN-descripcion` por historia.
- Una historia entrega un incremento vertical verificable.
- Cada rama añade exactamente un fragmento `.changes/*.md`.
- No mezclar refactors o funcionalidades ajenas a la historia.
- Ejecutar `npm run quality` antes de dar una historia por terminada.

## Convenciones

- TypeScript estricto; contenido visible en español.
- Contratos de transporte validados con Zod.
- OpenAI solo desde backend y con modo demo local.
- Datos ficticios y sesiones aisladas.
- El RAG siempre muestra las fuentes realmente recuperadas.

## Restricciones

- Sin autenticación, roles ni integraciones externas en el MVP.
- No cambiar el stack sin justificarlo en la PR.
