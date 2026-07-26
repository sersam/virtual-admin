# US-012 - Datos demo completos

## Objetivo

Como evaluador, quiero encontrar una comunidad demo completa desde el primer acceso para probar consultas documentales, incidencias y preparacion de juntas sin crear datos manualmente.

## Criterios de aceptacion

- El corpus documental incluye presupuesto comunitario de 2026 y dos comunicados históricos.
- Los nuevos documentos estan enlazados a PDFs reales servidos por la aplicacion.
- La home muestra 4 incidencias abiertas y ese contador coincide con el estado inicial de la sesión.
- Cada sesión demo se inicializa con 4 incidencias abiertas y 2 acuerdos pendientes.
- La inicialización es idempotente por sesión: repetirla no duplica datos ni elimina datos creados por el usuario.
- Existen 2 juntas demo seleccionables para preparar el orden del dia.
- El borrador de orden del dia se genera usando la junta seleccionada y muestra su tipo y fecha.

## Datos demo

Documentos nuevos:

- Presupuesto comunitario 2026: cuotas ordinarias por 108.000 euros, gastos previstos por 96.000 euros y reserva por 12.000 euros.
- Comunicado mantenimiento piscina junio 2026: cierre el 16 de junio de 2026 entre las 08:00 y las 14:00.
- Comunicado revisión garaje julio 2026: revisión eléctrica el 22 de julio de 2026 entre las 09:00 y las 12:00.

Incidencias iniciales:

- Fuga de agua urgente.
- Averia del ascensor.
- Basura acumulada en el portal.
- Ruidos fuera del horario permitido.

Acuerdos pendientes:

- Comparar presupuestos del ascensor del portal B.
- Revisar subvenciones para placas solares en zonas comunes.

Juntas demo:

- Junta ordinaria del 18 de septiembre de 2026 a las 17:00.
- Junta extraordinaria del 15 de octubre de 2026 a las 17:00.

## Contratos

- `MeetingAgendaDraftRequest` recibe `meetingId`.
- `MeetingAgendaDraftResponse` incluye la junta usada para generar el borrador.
- Se expone `GET /api/meetings` para listar las juntas disponibles de la sesión.
- Todos los DTOs se validan mediante Zod.
- Los tipos documentales aceptan `presupuesto` y `comunicado`.

## Casos de error

- Si `meetingId` no cumple el contrato, la API responde `400 VALIDATION_ERROR`.
- Si la junta no existe para la sesión actual, la API responde `404 MEETING_NOT_FOUND`.
- Si no hay juntas disponibles, la interfaz muestra un estado vacio y no permite generar el borrador.

## Estrategia TDD

1. Escribir pruebas de contratos y corpus antes de modificar datos documentales.
2. Escribir pruebas de inicializacion demo idempotente antes del caso de uso.
3. Escribir pruebas de juntas y API antes de exponer endpoints.
4. Escribir pruebas de hooks/componentes y E2E antes de completar la UI.
5. Refactorizar manteniendo la suite en verde.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- `npm run quality` termina en verde.
- Se anade exactamente un archivo `.changes/*.md`.
- No se anaden autenticacion, roles, base de datos, dependencias ni integraciones externas.
- La funcionalidad puede demostrarse manualmente desde la primera visita a la demo.
