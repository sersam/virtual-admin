# US-020 - Actas con OpenAI

## Objetivo

Como secretario, quiero generar actas formales con IA a partir de notas y acuerdos sin inventar informacion.

La generacion de actas debe usar OpenAI desde backend cuando exista `OPENAI_API_KEY`, conservar un modo demo determinista reproducible y mantener la edicion y descarga PDF actuales.

## Criterios de aceptacion

- Existe un puerto de aplicacion `MeetingMinutesGenerator` para generar actas desde notas validadas.
- Sin `OPENAI_API_KEY`, el backend usa un generador demo determinista local y reproducible.
- Con `OPENAI_API_KEY`, el backend usa OpenAI mediante Responses API, salida estructurada Zod, modelo compartido `gpt-5-nano` y prompt versionado `meeting-minutes.v1`.
- La peticion HTTP se mantiene como `{ notes: string }`, con notas entre 10 y 4.000 caracteres.
- La respuesta HTTP expone `draft.title`, `draft.body`, `draft.agreements`, `draft.tasks` y `mode`.
- El titulo queda controlado por la aplicacion como `Acta de reunión`.
- OpenAI genera unicamente cuerpo, acuerdos y tareas a partir de las notas recibidas.
- Los acuerdos estructurados se devuelven como descripciones no vacias de hasta 240 caracteres, maximo 50 elementos y en el orden detectado.
- Las tareas estructuradas mantienen descripcion, responsable opcional y fecha opcional, con los limites existentes.
- Tras una generacion satisfactoria se persisten solamente las tareas como acuerdos pendientes de sesion.
- Los acuerdos detectados son informativos y no se persisten como acuerdos pendientes.
- Una salida vacia, fuera de limites o con estructura invalida produce `AI_PROVIDER_ERROR`.
- Si OpenAI falla no se guarda ninguna tarea y el backend no cambia silenciosamente al generador demo.
- La UI muestra el proveedor con `formatAiProviderMode`, los acuerdos detectados, las tareas detectadas, el cuerpo editable y la descarga PDF del cuerpo editado.
- El fallback local del navegador solo se activa ante errores de transporte; errores HTTP o respuestas invalidas quedan visibles.
- Las pruebas usan fakes y no hacen llamadas reales a OpenAI.

## Contratos e interfaces afectadas

`MeetingMinutesGenerator` recibe:

- `notes`: notas ya validadas por contrato de entrada.

Devuelve:

- `draft`: borrador de acta con titulo, cuerpo, acuerdos y tareas.
- `mode`: `deterministic-demo` u `openai`.

`MeetingMinutesDraftResponse` queda definido como:

```ts
{
  draft: {
    title: string;
    body: string;
    agreements: string[];
    tasks: Array<{
      description: string;
      assignee?: string;
      dueDate?: string;
    }>;
  };
  mode: 'deterministic-demo' | 'openai';
}
```

El prompt `meeting-minutes.v1` debe exigir espanol formal, uso exclusivo de las notas recibidas y prohibir inventar asistentes, fechas, votaciones, quorum, decisiones, responsables o plazos. Para cumplir Structured Outputs, OpenAI devuelve `assignee` y `dueDate` como campos requeridos nullable; la aplicacion transforma `null` en campos omitidos antes de exponer el contrato publico. Las listas pueden estar vacias.

La telemetria IA incorpora la operacion `meeting-minutes` y no registra el contenido de las notas.

## Casos de error

- Notas invalidas: la API responde `VALIDATION_ERROR` antes de crear o consumir sesion.
- OpenAI no configurado: generador demo determinista con `mode: deterministic-demo`.
- OpenAI configurado con error de red, credenciales, cuota o proveedor: error `AI_PROVIDER_ERROR`.
- OpenAI devuelve cuerpo vacio, campos fuera de limite, tareas invalidas o acuerdos invalidos: error `AI_PROVIDER_ERROR`.
- Fallo de generacion: no se persisten tareas ni acuerdos pendientes.
- API inalcanzable desde navegador: fallback local determinista.
- API responde error HTTP: error visible en la UI, sin fallback local.

## Restricciones

- OpenAI solo se usa desde backend.
- No se anaden dependencias, migraciones, persistencia nueva, streaming, herramientas ni selector de modelo.
- No se crean campos separados para acuerdos en el formulario.
- Las listas estructuradas no se recalculan cuando el usuario edita manualmente el cuerpo.
- No se anade un segundo modelo verificador.
- Todo texto visible para usuario permanece en espanol.
- No se muestran fuentes simuladas ni referencias inexistentes.

## Estrategia TDD

1. Probar contratos compartidos con acuerdos y ambos modos de proveedor.
2. Probar la extraccion determinista de acuerdos y tareas.
3. Probar el puerto `MeetingMinutesGenerator`, el adaptador demo, la delegacion del caso de uso y la persistencia exclusiva de tareas.
4. Probar el adaptador OpenAI con cliente fake: prompt, esquema, modelo, tokens, telemetria de exito/fallo y salidas invalidas.
5. Probar composicion con y sin `OPENAI_API_KEY`.
6. Probar endpoint dedicado y nodo de chat con generadores fake, ambos modos y `AI_PROVIDER_ERROR`.
7. Probar cliente web, hook, panel y E2E para proveedor visible, acuerdos visibles, fallback solo por transporte, error HTTP visible, edicion y PDF.
8. Ejecutar `npm run quality` al cierre.

## Incrementos y commits

| Incremento                        | Cambio verificable                                                            | Commit objetivo                                          |
| --------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1. Especificacion y proceso       | Crear esta especificacion y exactamente `.changes/us-020.md`.                 | `docs(us-020): especifica actas con OpenAI`              |
| 2. Acuerdos y puerto demo         | Exponer acuerdos, introducir puerto y mantener generacion demo reproducible.  | `feat(actas): estructura acuerdos y separa el generador` |
| 3. Adaptador OpenAI               | Implementar prompt, salida estructurada, seleccion por API key y telemetria.  | `feat(openai): añade generación estructurada de actas`   |
| 4. API y chat                     | Integrar el generador en endpoint y nodo de chat con errores de proveedor.    | `feat(api): integra el generador de actas`               |
| 5. Experiencia visible y fallback | Mostrar acuerdos y proveedor, conservar edicion/PDF y limitar fallback local. | `feat(actas): muestra acuerdos y modo de generación`     |
| 6. Documentacion y cierre         | Documentar configuracion, prompt, telemetria, demo y politica de errores.     | `docs(us-020): documenta la generación de actas`         |

Cada incremento sigue Red -> Green -> Refactor y ejecuta `npm run precommit:check` antes del commit.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- Cada incremento queda commiteado por separado con Conventional Commit y en verde.
- `npm run precommit:check` pasa antes de cada commit.
- `npm run quality` termina en verde al cierre.
- Se anade exactamente un archivo `.changes/us-020.md`.
- La UI permite demostrar actas en modo demo local y modo OpenAI simulado.
- La PR queda lista para revision con capturas, pruebas, riesgos y limitaciones conocidas.
