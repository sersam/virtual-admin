# US-022 - Limites y observabilidad publica

## Objetivo funcional

Como responsable de la comunidad quiero publicar la demo con limites de uso visibles y metricas tecnicas agregadas, para controlar el coste de las acciones IA sin exponer datos sensibles ni ocultar al usuario cuando el sistema opera en modo determinista.

## Criterios de aceptacion verificables

- Las acciones IA de consulta documental, chat, comunicados, actas, incidencias y juntas tienen una cuota diaria UTC configurable de 20 acciones por sesion y 100 acciones por IP.
- Cada peticion valida a una accion IA consume una unidad aunque el flujo use varias llamadas internas a OpenAI.
- Las peticiones invalidas, los endpoints sin IA y el modo sin `OPENAI_API_KEY` no consumen la nueva cuota IA.
- Los fallos de OpenAI consumen la unidad reservada y activan fallback determinista visible.
- El limite general de 120 peticiones por sesion de 24 horas mantiene su comportamiento independiente.
- La IP se lee con `request.ip`; en produccion se confia en un unico salto de proxy. Solo se persiste un HMAC diario con `COOKIE_SECRET`, nunca la IP, cabeceras, sesion ni contenido de usuario.
- PostgreSQL reserva conjuntamente cuota de sesion e IP dentro de una transaccion para soportar concurrencia sin superar ningun limite.
- Ante cuota agotada, indisponibilidad del control de cuota o `AiProviderError`, la accion se ejecuta con el flujo determinista completo y devuelve `fallbackReason`.
- Si el fallback determinista tambien falla, la API devuelve el error controlado correspondiente sin reintentos adicionales.
- Las incidencias y tareas se persisten exactamente una vez y solo despues de una generacion satisfactoria.
- La telemetria IA persiste fecha, operacion, proveedor/modelo, version de prompt, tokens de entrada/cache/salida, coste estimado, latencia, resultado y motivo de fallback.
- La telemetria no persiste prompts, respuestas, documentos, sesiones, IP ni identificadores pseudonimos.
- Cada llamada OpenAI queda registrada como exito o fallo. Cada fallback determinista queda registrado como ejecucion separada con tokens y coste cero.
- `GET /api/observability` expone agregados del dia UTC sin crear ni consumir una sesion.
- Inicio muestra un panel con ejecuciones, exitos, fallos, fallbacks, tokens, coste estimado, latencia media, desglose por operacion/modelo y limites configurados.
- Si las metricas no estan disponibles, Inicio muestra que no hay metricas reales disponibles y no inventa valores.
- Los seis flujos IA muestran una indicacion en espanol cuando el resultado determinista se debe a cuota de sesion, cuota de IP, error de OpenAI o indisponibilidad de cuota.

## Contratos, datos e interfaces afectadas

- Contratos compartidos:
  - Nuevo enum `AiFallbackReason`: `session-quota`, `ip-quota`, `provider-error`, `quota-unavailable`.
  - Respuestas ampliadas con `fallbackReason?: AiFallbackReason`: chat, consulta documental, comunicados, creacion de incidencias, actas y juntas.
  - Nuevo contrato `ObservabilityResponseSchema` validado con Zod.
- API publica:
  - `GET /api/observability` responde `generatedAt`, periodo diario UTC, limites configurados, resumen tecnico y desgloses por operacion/modelo.
  - No cambia ningun DTO de peticion.
- Aplicacion:
  - Puerto `AiActionQuotaRepository` para reservar cuota diaria de sesion e IP.
  - Politica/orquestador de accion IA para seleccionar flujo OpenAI o flujo determinista y anotar fallback.
  - Puerto de consulta agregada de telemetria.
- Infraestructura:
  - Adaptadores en memoria y PostgreSQL para cuotas.
  - Reporter de telemetria best-effort con persistencia PostgreSQL o memoria y log saneado.
  - Migracion para tablas de cuota diaria y eventos IA.
- Frontend:
  - Cliente compartido para `/api/observability`.
  - Panel de Inicio y avisos visibles de fallback en los seis flujos IA.

## Casos de error esperados

- `session-quota`: la sesion alcanzo su cuota diaria IA; la accion responde con fallback determinista.
- `ip-quota`: la IP diaria alcanzo su cuota IA; la accion responde con fallback determinista.
- `provider-error`: OpenAI fallo; la accion responde con fallback determinista y registra el fallo OpenAI mas el fallback.
- `quota-unavailable`: la reserva de cuota no esta disponible; la accion responde con fallback determinista sin consumir contadores.
- Fallo del fallback: la API devuelve el error controlado existente del flujo determinista o un error interno saneado si no existe uno mas especifico.
- API de observabilidad no disponible en frontend: el panel informa indisponibilidad de metricas reales.

## Restricciones relevantes

- OpenAI solo se usa desde backend.
- Sin autenticacion, roles ni integraciones externas reales.
- Los datos visibles para usuario deben estar en espanol.
- No se exponen eventos individuales ni identificadores pseudonimos en la observabilidad publica.
- Los prompts versionados existentes se reutilizan; no se embeben prompts en UI.
- La implementacion debe respetar Clean Architecture y reutilizar repositorios/casos de uso existentes.
- La historia debe anadir exactamente un archivo `.changes/*.md`.

## Estrategia TDD

1. Contratos: pruebas rojas para `AiFallbackReason`, respuestas ampliadas y `ObservabilityResponseSchema`.
2. Cuotas: pruebas unitarias de politica, reinicio UTC, prioridad sesion/IP, no consumo invalido y adaptador en memoria; pruebas PostgreSQL de persistencia, HMAC diario y concurrencia.
3. Observabilidad: pruebas de reporter best-effort, privacidad de eventos, persistencia, agregados vacios/poblados y separacion por dia/operacion/modelo.
4. API: pruebas de fallback por cuota, error OpenAI, repositorio de cuota indisponible, fallo de fallback y modo sin API key en los seis endpoints; prueba de `/api/observability` sin sesion.
5. UI: pruebas de cliente, componentes, panel de Inicio, estados de indisponibilidad y avisos de fallback.
6. E2E: cubrir panel de Inicio y al menos un resultado determinista con motivo de fallback visible.
7. Regresion: mantener verdes limites generales, aislamiento de sesion, persistencia y proveedores IA existentes.

## Incrementos integrables

1. `docs(us-022): especifica limites y observabilidad publica`
   - Crear esta especificacion y `.changes/us-022.md`.
   - Validacion: `npm run precommit:check`.
2. `feat(limites): añade cuotas diarias para operaciones IA`
   - Contratos base, politica y repositorios en memoria/PostgreSQL.
   - Validacion: pruebas de cuotas y `npm run precommit:check`.
3. `feat(observabilidad): persiste y agrega telemetria IA`
   - Migracion, reporter persistente, consulta agregada y pruebas.
   - Validacion: pruebas de telemetria/agregados y `npm run precommit:check`.
4. `feat(api): activa fallback determinista observable`
   - Orquestacion de flujos, endpoint publico y motivos en respuestas.
   - Validacion: pruebas de API de seis endpoints y `npm run precommit:check`.
5. `feat(web): muestra limites y metricas tecnicas`
   - Panel de Inicio, estados, avisos y E2E.
   - Validacion: pruebas web/E2E relevantes y `npm run precommit:check`.
6. `docs(us-022): documenta cuotas y observabilidad`
   - Actualizar README/arquitectura y evidencias finales.
   - Validacion: `npm run quality`.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- `npm run quality` pasa en verde.
- TypeScript, ESLint y Prettier no reportan errores.
- Se mantiene exactamente un archivo `.changes/*.md`.
- La telemetria persistida y publica no contiene contenido de usuario ni IP en claro.
- Los fallbacks son visibles y trazables.
- La PR documenta riesgos, evidencias y justifica el tamano si supera 500 lineas modificadas.
