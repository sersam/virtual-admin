# Protocolo de estudio US-025

## Objetivo

Evaluar si la demo publica de Administrador Virtual Inteligente resulta util, comprensible y trazable para tareas habituales de una comunidad de propietarios antes de la defensa del TFM.

El estudio complementa la evaluacion tecnica de US-024. No mide satisfaccion poblacional ni pretende generalizar estadisticamente; ofrece evidencia cualitativa y descriptiva sobre una muestra pequena y de conveniencia.

## Muestra

- 10 participantes validos, todos mayores de edad y ajenos al desarrollo.
- 5 personas con experiencia en administracion de comunidades.
- 5 propietarios o usuarios finales.
- Identificadores anonimos `P01`-`P10`.
- Un piloto adicional permite ajustar instrucciones y no cuenta dentro de los 10 participantes.

## Condiciones

- Sesion moderada de escritorio, 30-40 minutos.
- Chrome estable actualizado.
- Demo publica estable identificada por URL y commit.
- Una sesion demo limpia por participante.
- Orden fijo de tareas para construir un recorrido coherente.
- Maximo de 5 minutos por tarea.

## Consentimiento y privacidad

Antes de empezar, la persona participante recibe este resumen:

> Esta prueba evalua una demo academica, no a la persona participante. La sesion es voluntaria, puede detenerse en cualquier momento y los datos se registraran de forma anonima. No se conservaran nombres, correos, organizaciones, IP, cookies, identificadores de sesion, grabaciones ni texto libre identificable.

Las notas originales de moderacion se destruyen despues de codificar resultados estructurados. En Git solo se versionan resultados anonimos, tiempos, ayuda observada, respuestas SUS numericas y codigos tematicos.

## Tareas

| ID                    | Tarea                                                                                 | Criterio de exito observable                                                             |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `chat-coordination`   | Pedir al chat que prepare un aviso por corte de agua e identificar el agente elegido. | La respuesta enruta a comunicados o muestra una traza coherente de agente/proveedor.     |
| `notice-draft`        | Continuar en Comunicados, generar, editar y copiar el aviso.                          | Existe un borrador editable y la accion de copia queda disponible.                       |
| `rag-source`          | Consultar el horario de la piscina y abrir la fuente PDF citada.                      | La respuesta muestra una fuente real y el PDF se abre desde el enlace.                   |
| `incident-notice`     | Registrar una fuga urgente, revisar clasificacion y copiar el comunicado sugerido.    | La incidencia queda clasificada con prioridad/responsable y muestra comunicado copiable. |
| `minutes-pdf`         | Generar un acta desde notas con acuerdo y tarea, editarla y descargar el PDF.         | El acta contiene acuerdo/tarea estructurados y permite exportar PDF.                     |
| `agenda-traceability` | Registrar una propuesta y generar un orden del dia localizando entradas trazables.    | El orden del dia incluye entradas trazables de incidencias, acuerdos o propuestas.       |

## Observacion

Para cada tarea se registra:

- `completed`: alcanza todos los puntos de comprobacion.
- `partial`: obtiene el resultado principal, pero falta un punto secundario.
- `failed`: no obtiene el resultado principal, abandona o agota el tiempo.
- Segundos hasta finalizar o abandonar.
- Ayuda: `none`, `minor` o `blocking`.
- Modo observado: `openai` o `deterministic-demo`.
- `fallbackReason` solo cuando aparezca un fallback visible.

## SUS

Tras completar las tareas se aplica la version espanola validada de System Usability Scale con sus 10 items originales, escala 1-5 y sin reformular. La puntuacion se calcula ajustando items impares como `respuesta - 1`, items pares como `5 - respuesta` y multiplicando la suma por `2,5`.

Fuente metodologica: [Spanish language version of the System Usability Scale](https://humanfactors.jmir.org/2020/4/e21161/).

## Preguntas abiertas

Se hacen dos preguntas separadas de SUS:

- Cual ha sido la utilidad principal de la demo.
- Que mejora priorizaria antes de usarla en una situacion real.

Las respuestas no se versionan literalmente. Se codifican con temas del catalogo incluido en `docs/study/responses.json`.

## Criterios de invalidez

Una sesion se descarta y se sustituye si:

- La persona retira su consentimiento.
- La demo publica no corresponde al commit registrado.
- Se pierde la conectividad durante mas de una tarea.
- Cambia el guion, el codigo funcional o la configuracion visible despues de iniciar la recogida.
- Aparecen datos personales en las notas que no puedan eliminarse con seguridad.
