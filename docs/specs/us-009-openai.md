# US-009 - OpenAI para comunicados e incidencias

## Historia

Como administrador, quiero generar comunicados y clasificar incidencias con OpenAI manteniendo un modo demo local reproducible.

## Objetivo funcional

El backend debe poder usar OpenAI para dos capacidades IA:

- Generar borradores de comunicados comunitarios.
- Clasificar incidencias por tipo, prioridad y responsable sugerido.

Cuando no exista `OPENAI_API_KEY`, el sistema debe conservar el comportamiento demo determinista actual para que la demo local y CI sigan siendo reproducibles.

## Criterios de aceptación

- OpenAI se invoca solo desde el backend.
- El modelo OpenAI de la historia es `gpt-5.6-luna`.
- La generacion de comunicados se consume mediante un puerto de aplicacion.
- La clasificacion de incidencias se consume mediante un puerto de aplicacion.
- Los adaptadores OpenAI validan la respuesta externa con Zod antes de exponerla al resto del sistema.
- Los adaptadores demo no hacen llamadas externas y son reproducibles.
- Los prompts estan versionados y no se embeben en la UI.
- Cada operacion IA registra modelo, tokens, coste estimado, latencia y resultado.
- Si falta `OPENAI_API_KEY`, el backend usa los adaptadores demo.
- Las pruebas y CI no hacen llamadas reales a OpenAI.
- La UI muestra si el resultado viene de OpenAI o del modo demo.

## Casos de error esperados

- Si OpenAI devuelve una respuesta con formato invalido, la peticion falla con un error controlado y observable.
- Si OpenAI falla en tiempo de ejecucion, la peticion falla con un error controlado y observable.
- El backend no hace fallback silencioso a demo cuando OpenAI esta configurado pero falla.
- Las validaciones existentes de entrada siguen devolviendo errores de validacion en espanol.

## Restricciones

- No se introduce streaming.
- No se introducen tools, memoria conversacional ni RAG nuevo.
- No se persiste telemetria en base de datos.
- No se expone el detalle de telemetria en contratos publicos.
- No se agrega selector dinamico de modelo; `gpt-5.6-luna` queda fijado para esta historia.
- No se modifica el stack frontend.

## Estrategia de pruebas

- Contratos: aceptan `deterministic-demo` y `openai`.
- Aplicacion: los casos de uso consumen puertos inyectados y propagan el modo del proveedor.
- Infraestructura demo: mantiene resultados deterministas.
- Infraestructura OpenAI: usa proveedores fake en tests, valida Zod y registra telemetria.
- Presentacion HTTP: selecciona demo sin API key y OpenAI con API key inyectada en configuracion.
- Frontend: muestra el proveedor recibido por API.
- E2E: cubre al menos el flujo visible demo sin llamadas externas.

## Definition of Done

- Todos los criterios anteriores estan cubiertos por pruebas automatizadas.
- `npm run quality` pasa completo.
- La rama incluye exactamente un archivo `.changes/*.md`.
- La PR puede demostrar manualmente los flujos de comunicados e incidencias en modo demo.
