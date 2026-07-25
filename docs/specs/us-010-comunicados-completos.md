# US-010 - Comunicados completos

## Historia

Como administrador, quiero preparar comunicados con tipo, audiencia y tono para reutilizarlos fuera de la aplicacion.

## Objetivo funcional

El flujo de comunicados debe permitir crear, editar, copiar y exportar un borrador completo a partir de un asunto y tres catalogos cerrados: tipo, audiencia y tono.

El chat puede derivar al formulario de comunicados con valores iniciales coherentes, sin generar redirecciones automaticas ni ampliar el contrato publico de chat.

## Criterios de aceptacion

- El formulario dedicado contiene asunto, tipo, audiencia y tono.
- Los catalogos son cerrados: tipo `informativo | recordatorio | urgente`, audiencia `todos | propietarios | residentes` y tono `formal | cercano | directo`.
- Los valores iniciales del formulario son asunto `Corte de agua`, tipo `informativo`, audiencia `todos` y tono `formal`.
- El endpoint dedicado valida todos los campos con Zod antes de consumir sesion.
- La generacion devuelve un borrador editable con asunto y cuerpo.
- El modo demo local genera comunicados deterministas usando los cuatro campos.
- OpenAI se invoca solo desde backend, recibe input estructurado y conserva el asunto validado.
- El prompt de comunicados queda versionado como `community-notice.v2`.
- El chat muestra `Continuar en Comunicados` solo para respuestas del agente `comunicados`.
- El boton del chat navega al formulario con estado interno validado y asunto extraido del ultimo mensaje enviado.
- Copiar al portapapeles usa el asunto y cuerpo editados con el formato `Asunto: {asunto}\n\n{cuerpo}`.
- Exportar PDF usa el asunto y cuerpo editados y descarga `comunicado.pdf`.

## Casos de error esperados

- Un asunto demasiado corto o largo devuelve `400 VALIDATION_ERROR`.
- Un tipo, audiencia o tono fuera de catalogo devuelve `400 VALIDATION_ERROR`.
- El endpoint dedicado no crea ni consume sesion cuando el payload es invalido.
- Si OpenAI devuelve un cuerpo invalido, la peticion falla con error controlado y observable.
- Si la copia al portapapeles falla, la UI muestra un error accesible y conserva el borrador.
- Copia y PDF quedan deshabilitados cuando asunto o cuerpo estan vacios.

## Restricciones

- No se introduce persistencia.
- No se introduce autenticacion, roles ni permisos.
- No se introduce streaming.
- No se agregan dependencias para PDF.
- No se invoca OpenAI desde frontend.
- No se hacen llamadas reales a OpenAI en pruebas.
- No se modifica el contrato publico de chat para anadir CTA.

## Estrategia de pruebas

- Contratos: validan enums, limites de asunto y modo de proveedor.
- Dominio: cubre valores por defecto desde texto, audiencia, tipo y tono.
- Aplicacion: verifica que el caso de uso pasa el input estructurado al puerto.
- Infraestructura demo: verifica determinismo y modo demo.
- Infraestructura OpenAI: verifica prompt v2, input estructurado, validacion de cuerpo, telemetria y preservacion del asunto.
- Presentacion HTTP: cubre payload valido, proveedor OpenAI y validacion previa a sesion.
- Frontend: cubre formulario, edicion, copia, fallo de copia, PDF y estado inicial desde chat.
- E2E: cubre chat a comunicados, generacion demo, edicion, copia y descarga PDF.

## Definition of Done

- Todos los criterios anteriores estan cubiertos por pruebas automatizadas.
- `npm run quality` pasa completo.
- La rama incluye exactamente un archivo `.changes/*.md`.
- La PR puede demostrar manualmente el flujo completo de comunicados.
