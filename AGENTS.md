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

## Pruebas obligatorias

- Todo código de producción nuevo o modificado debe incluir pruebas unitarias que cubran su comportamiento y casos límite.
- Cada caso de uso debe contar con pruebas de integración para sus límites relevantes, como API, persistencia, proveedores de IA o contratos compartidos.
- Cada flujo visible para el usuario debe incluir una prueba end-to-end con Playwright siempre que la funcionalidad pueda ejecutarse en navegador.
- Las correcciones de errores deben incorporar una prueba de regresión que falle antes del arreglo.
- Si una prueba de integración o E2E no es técnicamente aplicable, la PR debe explicar el motivo y aportar la verificación automatizada más cercana posible.
- No se considera completa una historia si sus pruebas no se ejecutan desde `npm run quality`.

## Restricciones

- Sin autenticación, roles ni integraciones externas en el MVP.
- No cambiar el stack sin justificarlo en la PR.
