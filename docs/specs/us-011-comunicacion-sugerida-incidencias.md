# US-011 - Comunicacion sugerida en incidencias

## Objetivo

Al registrar una incidencia, el administrador obtiene una comunicacion sugerida para informar a los vecinos con rapidez. La comunicacion queda guardada junto con la incidencia y se puede consultar y copiar desde la pantalla de Incidencias.

## Criterios de aceptacion

- La clasificacion de una incidencia devuelve categoria, prioridad, responsable sugerido y `suggestedNotice`.
- El contrato `Incident` exige `suggestedNotice` como texto normalizado entre 1 y 2.000 caracteres.
- El endpoint de creacion devuelve el comunicado sugerido dentro de `incident`.
- Los endpoints de listado, filtrado y resolucion conservan el comunicado sugerido.
- El modo demo local genera un comunicado determinista basado en la descripcion normalizada.
- El proveedor OpenAI devuelve los cuatro campos en una unica salida estructurada validada con Zod.
- La pantalla de Incidencias muestra la seccion "Comunicado sugerido" y permite copiar exactamente su texto.
- El chat mantiene su respuesta visible actual y no incluye el comunicado sugerido.

## Contratos

`IncidentClassification` y `CommunityIncident` incorporan:

```ts
readonly suggestedNotice: string;
```

El comunicado se valida como `z.string().trim().min(1).max(2_000)`.

La plantilla determinista es:

```text
Estimados vecinos:

Se ha registrado la siguiente incidencia: {description}

La administracion comunicara cualquier novedad relevante.
```

## OpenAI

El prompt versionado pasa a `incident-classification.v2` y el schema name a `incident_classification_v2`. La salida debe estar en espanol, dirigida a vecinos y trazable a la descripcion recibida. No debe inventar actuaciones realizadas, plazos, resoluciones ni fuentes.

Una salida vacia, sin `suggestedNotice`, superior a 2.000 caracteres o con cualquier campo invalido produce el error `AI_PROVIDER_ERROR` existente, registra telemetria de fallo y no guarda la incidencia.

## UX

Cada tarjeta de incidencia muestra el comunicado preservando saltos de linea. El boton accesible "Copiar comunicado sugerido" copia solo `suggestedNotice`. En exito se muestra "Comunicado copiado.". En error de portapapeles se muestra "No se pudo copiar el comunicado." con `role="alert"`.

## Estrategia TDD

1. Contratos y clasificador compartido: tests de campo obligatorio, limites y plantilla exacta.
2. Aplicacion e infraestructura: tests de propagacion, persistencia, adaptador determinista y OpenAI v2 valido/invalido.
3. Presentacion HTTP: tests de creacion, listado y resolucion con `suggestedNotice`.
4. Frontend y E2E: tests de parsing, renderizado, copia exacta, fallo de copia y flujo visible.

## Definition of Done

- Todos los criterios de aceptacion estan cubiertos por tests automatizados.
- `npm run quality` termina en verde.
- Se anade exactamente un archivo `.changes/*.md`.
- No se anaden endpoints, dependencias, migraciones ni integraciones externas reales.
