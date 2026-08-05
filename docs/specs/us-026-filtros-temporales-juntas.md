# US-026 - Preparador de juntas con filtros temporales

## Objetivo funcional

Permitir preparar un borrador de orden del día usando solo datos demo trazables que correspondan al período que se revisa en la junta seleccionada.

La ventana temporal se calcula de forma determinista al preparar o listar juntas:

- Juntas ordinarias: últimos 90 días.
- Juntas extraordinarias: últimos 30 días.
- La ventana termina en el instante de preparación/listado, no en la fecha futura de la junta.

## Criterios de aceptación verificables

- El listado de juntas expone para cada junta `reviewPeriod.startsAt` y `reviewPeriod.endsAt`.
- `POST /api/meeting-agendas/draft` mantiene la petición `{ meetingId }`.
- La respuesta del borrador incluye la junta seleccionada, el período revisado y explicaciones deterministas de los filtros aplicados.
- Las incidencias pendientes se incluyen si fueron creadas y estaban disponibles antes del instante de preparación y antes de la fecha de la junta.
- Las incidencias resueltas se incluyen si `resolvedAt` cae dentro de la ventana 90/30; se excluyen las resueltas antes o después del período.
- Las incidencias incluidas exponen `status` y `resolvedAt`, usando `null` para pendientes.
- Los acuerdos pendientes con `dueOn` se incluyen si esa fecha cae dentro del período revisado.
- Los acuerdos pendientes sin `dueOn` se incluyen si `createdAt` cae dentro del período revisado.
- Los acuerdos mantienen `dueDate` como texto visible y exponen `dueOn` cuando exista.
- Las propuestas se incluyen si ya existían antes de la preparación y fueron creadas antes de la fecha de la junta, aunque sean anteriores al inicio del período.
- Los intervalos de timestamps son inclusivos.
- `dueOn` se compara como fecha de calendario en `Europe/Madrid`.
- Se conservan la priorización, desempates y límite de 100 entradas.
- La pantalla `/juntas` muestra ventana, explicaciones, estado/resolución de incidencias y fecha límite estructurada de acuerdos.
- Existen pruebas unitarias, de integración y E2E para juntas ordinarias y extraordinarias.

## Contratos e interfaces afectadas

- `CommunityMeeting` incorpora:

```ts
reviewPeriod: {
  startsAt: Date;
  endsAt: Date;
}
```

- `Meeting` incorpora el período serializado para transporte:

```ts
reviewPeriod: {
  startsAt: string;
  endsAt: string;
}
```

- `PendingAgreement` incorpora `dueOn?: string` con formato ISO `YYYY-MM-DD`.
- Persistencia PostgreSQL de acuerdos incorpora `due_on date null`.
- Los elementos de agenda de tipo `incident` incorporan:

```ts
status: 'pendiente' | 'resuelta';
resolvedAt: string | null;
```

- Los elementos de tipo `pending-agreement` incorporan `dueOn?: string`.
- `MeetingAgendaDraftResponse` incorpora:

```ts
reviewPeriod: {
  startsAt: string;
  endsAt: string;
}
filterExplanations: string[];
```

## Casos de error esperados

- Junta inexistente: se mantiene el error de junta no encontrada.
- Contratos con fechas no ISO, períodos invertidos, `dueOn` no ISO o incidencias resueltas sin `resolvedAt` se rechazan mediante Zod.
- Datos futuros respecto al instante de preparación se excluyen del borrador aunque pertenezcan a la junta futura.

## Restricciones relevantes

- No se interpretará texto libre como "viernes" o "30 de junio"; sin `dueOn` se usa `createdAt`.
- No se persistirán juntas; sus ventanas se derivan mediante el repositorio demo y el reloj.
- No se añaden endpoints, parámetros de usuario ni dependencias externas.
- Todo texto visible para usuario se mantiene en español.
- OpenAI solo se usa desde backend y el modo demo local sigue disponible.

## Estrategia TDD

- Contratos: validar períodos, invariantes pendiente/resuelta, `dueOn` ISO y nueva respuesta trazable.
- Aplicación: cubrir límites 90/30, fechas de frontera, datos futuros, resueltas dentro/fuera, acuerdos con/sin `dueOn`, propuestas previas y límite de 100.
- Infraestructura: probar cálculo de ventanas, semillas relativas, round-trip de `dueOn` en memoria y PostgreSQL, migración y esquema.
- Generadores: representar resueltas, verificar entrada a OpenAI, prompt v2, telemetría y ausencia de invenciones.
- Integración HTTP: listar juntas con períodos y generar borradores ordinario/extraordinario con selecciones distintas.
- Frontend: selector, explicaciones, trazabilidad de resueltas, cambio de junta e invalidación del borrador.
- Playwright: recorrido ordinario y extraordinario verificando ventanas, inclusiones y exclusiones.
- Evaluación: actualizar fixtures afectados y comprobar `eval:demo`.

## Incrementos integrables

| Incremento | Alcance                                                                              | Commit                                                        |
| ---------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1          | Especificar US-026 y crear `.changes/us-026.md`.                                     | `docs(us-026): especifica los filtros temporales de juntas`   |
| 2          | Modelar períodos y `dueOn` en dominio, contratos, repositorios y migración.          | `feat(juntas): modela períodos y fechas límite estructuradas` |
| 3          | Aplicar seleccion temporal trazable en caso de uso, generadores, API y evaluaciones. | `feat(juntas): aplica la seleccion temporal trazable`         |
| 4          | Mostrar ventana, explicaciones y trazabilidad en `/juntas` con E2E.                  | `feat(juntas): explica los filtros temporales en la interfaz` |

## Definition of Done

- Todos los criterios de aceptación quedan cubiertos.
- Cada incremento sigue Red -> Green -> Refactor.
- `npm run precommit:check` se ejecuta antes de cada commit.
- `npm run quality` pasa al cerrar la historia.
- Existe exactamente un archivo `.changes/us-026.md`.
- La historia puede demostrarse manualmente en `/juntas`.
- Si el PR supera 500 lineas modificadas, se justifica en la descripcion del PR.
