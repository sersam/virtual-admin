# US-019 - Coordinador IA con OpenAI

## Objetivo

Como propietario, quiero que el chat enrute mis peticiones al agente adecuado mediante IA cuando OpenAI este configurado, manteniendo una traza visible del agente, modo de orquestacion y proveedor de enrutado.

## Criterios de aceptacion

- Existe un puerto de aplicacion `ChatIntentClassifier` para clasificar mensajes en uno de los seis agentes del MVP.
- Sin `OPENAI_API_KEY`, el backend usa un clasificador determinista demo que reutiliza las reglas actuales y conserva sus prioridades.
- Con `OPENAI_API_KEY`, la infraestructura OpenAI clasifica la intencion mediante Responses API, salida estructurada, modelo compartido `gpt-5-nano` y prompt versionado `chat-intent.v1`.
- La salida estructurada de OpenAI devuelve unicamente `{ agent }`; el adaptador anade `provider: 'openai'`.
- El coordinador LangGraph tiene nodos especializados para `documentos`, `comunicados`, `actas`, `incidencias`, `juntas` y `general`.
- Cada nodo especializado delega en los casos de uso existentes sin modificar sus proveedores internos.
- La respuesta del chat expone una traza plana: `agent`, `mode` y `provider`.
- `mode` identifica la orquestacion (`langgraph` o `local-demo`) y `provider` identifica exclusivamente quien eligio la ruta (`openai` o `deterministic-demo`).
- Si OpenAI falla o devuelve una salida invalida, la API devuelve `AI_PROVIDER_ERROR` sin ejecutar ningun nodo especializado.
- El fallback local del navegador solo se activa cuando la API es inalcanzable; los errores HTTP se muestran al usuario.
- La interfaz muestra etiquetas separadas para el modo de orquestacion y el proveedor de enrutado.
- Las pruebas usan clientes fake o clasificadores demo; CI no hace llamadas reales a OpenAI.

## Contratos e interfaces afectadas

`ChatIntentClassifier` recibe:

- `message`: mensaje validado por el caso de uso o el flujo de chat.

Devuelve:

- `agent`: uno de `documentos`, `comunicados`, `actas`, `incidencias`, `juntas` o `general`.
- `provider`: `openai` o `deterministic-demo`.

`ChatMessageResponse` queda definido como:

- `agent`: agente finalmente seleccionado.
- `answer`: respuesta en espanol, no vacia.
- `mode`: `langgraph` o `local-demo`.
- `provider`: proveedor de clasificacion de ruta.
- `sources`: fuentes documentales reales cuando el nodo documental las recupere.

El prompt `chat-intent.v1` debe indicar las seis rutas disponibles, devolver solo JSON estructurado y no incluir explicaciones, confianza ni contenido del mensaje en telemetria.

## Casos de error

- OpenAI no configurado: clasificador demo determinista, `mode: langgraph` y `provider: deterministic-demo`.
- OpenAI configurado con error de red, cuota, credenciales o salida invalida: error `AI_PROVIDER_ERROR`.
- OpenAI devuelve un agente desconocido, vacio o mal formado: error `AI_PROVIDER_ERROR`.
- Fallo del clasificador: no se ejecuta ningun nodo especializado ni se generan efectos laterales.
- API inalcanzable desde el navegador: fallback local con `mode: local-demo` y `provider: deterministic-demo`.
- API responde con error HTTP: el error queda visible en la UI y no se reemplaza por fallback local.

## Restricciones

- OpenAI solo se usa desde backend.
- No se anaden memoria conversacional, streaming, herramientas, confianza, explicacion de clasificacion, persistencia ni dependencias nuevas.
- No se modifican los casos de uso especializados ni sus proveedores internos.
- No se registra el mensaje del usuario en telemetria.
- No se muestran fuentes simuladas.
- Todo texto visible para usuario permanece en espanol.
- `langgraph-demo` se sustituye por `langgraph` sin compatibilidad temporal duplicada.

## Estrategia TDD

1. Probar el contrato compartido con `provider` y el nuevo valor `langgraph`.
2. Probar el puerto y el clasificador demo conservando las prioridades de intencion actuales.
3. Probar el adaptador OpenAI con cliente fake: esquema, prompt, telemetria, errores y salida invalida.
4. Probar la composicion de proveedores para seleccionar OpenAI con clave y demo sin clave.
5. Probar LangGraph con clasificadores fake para verificar que solo se ejecuta el nodo elegido y que un fallo de clasificacion no causa efectos laterales.
6. Probar API, cliente web, hook, panel y E2E para la traza visible y el fallback solo por errores de transporte.
7. Ejecutar `npm run quality` al cierre.

## Incrementos y commits

| Incremento                        | Cambio verificable                                                             | Commit objetivo                                                 |
| --------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 1. Especificacion y proceso       | Crear esta especificacion y exactamente `.changes/us-019.md`.                  | `docs(us-019): especifica coordinador IA con OpenAI`            |
| 2. Puerto y clasificador demo     | Separar el puerto y reutilizar las reglas actuales desde infraestructura demo. | `feat(agent): separa la clasificacion de intenciones`           |
| 3. Adaptador OpenAI               | Implementar prompt, salida estructurada, seleccion por API key y telemetria.   | `feat(openai): añade clasificacion estructurada de intenciones` |
| 4. Grafo y API                    | Enrutar por nodos especializados y exponer `provider` en contrato/API.         | `feat(chat): enruta peticiones por nodos especializados`        |
| 5. Experiencia visible y fallback | Mostrar trazas separadas y limitar el fallback local a API inalcanzable.       | `feat(chat): muestra la trazabilidad del coordinador`           |
| 6. Documentacion y cierre         | Documentar configuracion, fallos y demo; ejecutar quality gate final.          | `docs(us-019): documenta el coordinador IA`                     |

Cada incremento sigue Red -> Green -> Refactor y ejecuta `npm run precommit:check` antes del commit.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- Cada incremento queda commiteado por separado con Conventional Commit y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al cierre.
- Se anade exactamente un archivo `.changes/us-019.md`.
- El proveedor de enrutado queda visible en API y frontend.
- El fallback local del navegador no oculta errores HTTP.
- La PR queda lista para revision con evidencias y limitaciones conocidas.
