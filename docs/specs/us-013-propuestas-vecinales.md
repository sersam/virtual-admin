# US-013 - Propuestas vecinales

## Objetivo

Como vecino, quiero registrar propuestas para que puedan aparecer en el orden del dia de una junta.

## Criterios de aceptacion

- La pagina de juntas permite registrar una propuesta con descripcion entre 10 y 1.000 caracteres tras eliminar espacios exteriores.
- La pagina de juntas lista las propuestas de la sesion actual de mas reciente a mas antigua.
- Las propuestas se almacenan en memoria, aisladas por sesion demo, sin datos precargados.
- Se permiten descripciones duplicadas y cada alta conserva identidad y fecha propias.
- Cada propuesta registrada se convierte automaticamente en candidata para el orden del dia.
- El orden del dia conserva primero incidencias y acuerdos pendientes con su orden actual, y despues anade propuestas de mas antigua a mas reciente.
- El maximo global del orden del dia sigue siendo de 100 entradas.
- Las propuestas no tienen prioridad en contratos, cuerpo editable ni entradas utilizadas.
- El cuerpo editable muestra las propuestas como `N. {descripcion}`.
- Las entradas utilizadas muestran "Propuesta vecinal", el identificador y la descripcion.
- Registrar una propuesta oculta cualquier borrador de orden del dia previo y obliga a prepararlo de nuevo.
- Una alta correcta limpia el campo, anade la propuesta al principio y anuncia "Propuesta registrada." de forma accesible.
- Un fallo de alta conserva el texto y el listado actual.
- Un fallo de carga muestra un error, pero mantiene el formulario disponible.

## Contratos

- `CommunityProposal` contiene `id`, `sessionId`, `description` normalizada y `createdAt`.
- `POST /api/proposals` recibe `{ description }` y responde `201 { proposal }`.
- `GET /api/proposals` responde `200 { proposals }`.
- Los DTOs de propuestas se validan con Zod.
- Las peticiones son estrictas y rechazan campos desconocidos.
- Las respuestas exponen identificadores de 1 a 80 caracteres y fechas ISO.
- `MeetingAgendaItem` es una union discriminada:
  - `incident` y `pending-agreement` conservan `priority`.
  - `proposal` no incluye `priority`.

## Truncado del borrador

- El cuerpo del orden del dia mantiene el limite maximo de 4.000 caracteres.
- Si no caben todas las entradas, solo se incluyen bloques completos.
- Si se omite contenido por limite, el cuerpo termina con:

```text
Contenido abreviado por el límite del borrador. Consulta «Entradas utilizadas» para ver todas las fuentes.
```

- `draft.items` conserva todas las entradas seleccionadas por el maximo global de 100, aunque el cuerpo editable se haya abreviado.

## Casos de error

- Si la descripcion no cumple longitud o formato, la API responde `400 VALIDATION_ERROR` sin crear sesion.
- Si la peticion contiene campos desconocidos, la API responde `400 VALIDATION_ERROR` sin crear sesion.
- Si falla la carga inicial en UI, se muestra error y el formulario sigue disponible.
- Si falla el alta en UI, se muestra error, se conserva el texto escrito y no se modifica el listado.

## Restricciones

- No se anade autor porque no existe autenticacion.
- No se anaden estados posteriores al alta.
- No se anade edicion, retirada, aprobacion ni eliminacion.
- No se anade navegacion nueva.
- No se anade fallback en navegador.
- No se anaden datos precargados.
- No se modifica chat, OpenAI ni el stack tecnologico.
- No se anaden dependencias.

## Estrategia TDD

1. Probar contratos Zod de propuestas y union del orden del dia.
2. Probar dominio, casos de uso y puerto de propuestas con fakes.
3. Probar repositorio en memoria con aislamiento, duplicados y orden.
4. Probar endpoints HTTP antes de registrarlos en la app.
5. Probar integracion de propuestas en el orden del dia antes de modificar el caso de uso.
6. Probar cliente, hook y componente de UI antes de implementar comportamiento visible.
7. Probar el flujo E2E de registro, invalidacion y regeneracion.

## Definition of Done

- Todos los criterios de aceptacion quedan cubiertos por pruebas automatizadas.
- `npm run quality` termina en verde.
- Se anade exactamente un archivo `.changes/*.md`.
- La funcionalidad puede demostrarse manualmente en `/juntas`.
- La PR mantiene un unico incremento funcional y justifica el tamano si supera 500 lineas modificadas.
