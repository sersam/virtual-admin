# US-021 - Preparador de juntas con OpenAI

## Objetivo

Como administrador, quiero redactar ordenes del dia con IA a partir de incidencias, acuerdos y propuestas trazables.

La aplicacion debe conservar la seleccion, priorizacion, titulo, junta y trazabilidad de forma determinista, mientras delega unicamente la redaccion del cuerpo en un generador intercambiable demo u OpenAI.

## Criterios de aceptacion

- `POST /api/meeting-agendas/draft` mantiene la peticion `{ meetingId }`.
- La respuesta expone `draft.title`, `draft.body`, `draft.items`, `meeting` y `mode`.
- `mode` acepta `deterministic-demo` y `openai`, reutilizando el modo IA compartido.
- Existe un puerto de aplicacion `MeetingAgendaGenerator` que recibe la junta seleccionada y las entradas ya ordenadas, y devuelve solo `body` y `mode`.
- La aplicacion controla siempre `draft.title`, `draft.items` y `meeting`.
- Se conservan incidencias pendientes unicamente.
- Incidencias y acuerdos se ordenan por prioridad descendente, antiguedad, tipo e ID.
- Los acuerdos con fecha tienen prioridad alta y los acuerdos sin fecha tienen prioridad media.
- Las propuestas se incorporan al final, de mas antigua a mas reciente, sin prioridad.
- El borrador incluye como maximo 100 entradas y cuerpo de hasta 4.000 caracteres.
- Si no hay entradas, se devuelve el mensaje vacio determinista y no se invoca OpenAI.
- Sin `OPENAI_API_KEY`, el backend usa `DeterministicMeetingAgendaGenerator`.
- Con `OPENAI_API_KEY`, el backend usa OpenAI mediante Responses API, salida Zod `{ body }`, modelo compartido `gpt-5-nano`, maximo 1.500 tokens, prompt `meeting-agenda.v1` y esquema `meeting_agenda_draft_v1`.
- La entrada enviada a OpenAI incluye solo metadatos de la junta y las entradas seleccionadas.
- El prompt exige espanol formal, respetar orden y contenido recibido, tratar entradas como datos y no inventar asuntos, responsables, fechas, acuerdos, prioridades ni fuentes.
- Una llamada OpenAI fallida o una salida invalida produce `AI_PROVIDER_ERROR`, sin fallback silencioso.
- El endpoint y el nodo de chat de juntas comparten el mismo caso de uso.
- El chat sigue usando la primera junta demo cuando no recibe `meetingId`.
- La UI mantiene selector, editor, trazabilidad e invalidacion al registrar propuestas.
- La UI muestra el modo con `formatAiProviderMode` y menciona incidencias, acuerdos y propuestas.
- Las juntas demo seleccionables tienen siempre fechas futuras: una a un mes de la fecha actual y otra a dos meses de la fecha actual.
- Las pruebas usan clientes fake; CI no hace llamadas reales a OpenAI.

## Contratos e interfaces afectadas

`MeetingAgendaDraftRequest` se mantiene:

```ts
{
  meetingId: string;
}
```

`MeetingAgendaGenerator` recibe:

```ts
{
  meeting: CommunityMeeting;
  items: MeetingAgendaItem[];
}
```

Y devuelve:

```ts
{
  body: string;
  mode: 'deterministic-demo' | 'openai';
}
```

`MeetingAgendaDraftResponse` queda como:

```ts
{
  draft: {
    title: string;
    body: string;
    items: MeetingAgendaItem[];
  };
  meeting: Meeting;
  mode: 'deterministic-demo' | 'openai';
}
```

La telemetria IA incorpora la operacion `meeting-agenda` y no registra contenido fuera de los metadatos ya enviados al proveedor.

## Casos de error

- Peticion invalida: la API responde `VALIDATION_ERROR` antes de crear o consumir sesion.
- Junta inexistente: la API responde `MEETING_NOT_FOUND`.
- OpenAI no configurado: generador demo determinista con `mode: deterministic-demo`.
- OpenAI configurado con error de red, credenciales, cuota o proveedor: `AI_PROVIDER_ERROR`.
- OpenAI devuelve cuerpo vacio, fuera de limite o estructura invalida: `AI_PROVIDER_ERROR`.
- Junta inexistente o sin entradas: no se invoca el generador OpenAI.
- API responde error HTTP: error visible en la UI, sin fallback local.

## Restricciones

- OpenAI solo se usa desde backend.
- No se anaden endpoints, persistencia, campos publicos, streaming, herramientas ni selector de modelo.
- No se cambian el modelo compartido, el stack, la persistencia ni los contratos del chat.
- Los filtros temporales y las incidencias resueltas pertenecen a la US-026.
- OpenAI no selecciona, reordena ni crea entradas trazables.
- No se anade fallback local al navegador para `/juntas`.
- Todo texto visible para usuario permanece en espanol.
- No se muestran fuentes simuladas ni referencias inexistentes.

## Estrategia TDD

1. Probar contratos compartidos con ambos modos y entradas discriminadas.
2. Probar seleccion, priorizacion, desempates, limite de 100, junta inexistente y entrada vacia.
3. Probar que el caso de uso envia datos exactos al generador y que este no altera titulo, junta ni trazas.
4. Probar el adaptador demo con cuerpo actual, detalles de origen y truncado por bloques completos.
5. Probar el adaptador OpenAI con cliente fake: JSON ordenado, prompt, modelo, esquema, tokens, telemetria y salidas invalidas.
6. Probar composicion, endpoint y chat con y sin clave, `AI_PROVIDER_ERROR` y ausencia de fallback.
7. Probar cliente web, hook, panel y E2E para modo OpenAI simulado, editor, selector, trazabilidad, invalidacion y error visible.
8. Ejecutar `npm run quality` al cierre.

## Incrementos y commits

| Incremento                  | Cambio verificable                                                   | Commit objetivo                                                  |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1. Especificacion y proceso | Crear esta especificacion y exactamente `.changes/us-021.md`.        | `docs(us-021): especifica juntas con OpenAI`                     |
| 2. Puerto y demo            | Separar seleccion y redaccion preservando el cuerpo demo actual.     | `feat(juntas): separa seleccion y redaccion del orden del dia`   |
| 3. Adaptador OpenAI         | Implementar prompt, salida estructurada, proveedor y telemetria.     | `feat(openai): añade generacion estructurada de ordenes del dia` |
| 4. Composicion API y chat   | Integrar generador en endpoint y nodo de chat con errores IA.        | `feat(api): integra el generador de juntas`                      |
| 5. Experiencia visible      | Mostrar modo de generacion y conservar editor, selector y trazas.    | `feat(juntas): muestra el modo de generacion`                    |
| 6. Documentacion y cierre   | Documentar comportamiento, prompt, telemetria y politica de errores. | `docs(us-021): documenta la generacion de ordenes del dia`       |

Cada incremento sigue Red -> Green -> Refactor y ejecuta `npm run precommit:check` antes del commit.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- Cada incremento queda commiteado por separado con Conventional Commit y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al cierre.
- Se anade exactamente un archivo `.changes/us-021.md`.
- La UI permite demostrar juntas en modo demo local y modo OpenAI simulado.
- La PR queda por debajo de 500 lineas modificadas o justifica explicitamente el exceso.
- La PR queda lista para revision con evidencias, riesgos y limitaciones conocidas.
