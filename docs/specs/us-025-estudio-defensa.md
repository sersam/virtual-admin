# US-025 - Estudio y defensa

## Objetivo funcional

Como autor del TFM, quiero preparar evidencias finales de utilidad, limitaciones y trazabilidad para defender el MVP con datos tecnicos reproducibles, un protocolo de estudio humano anonimo y una matriz que conecte objetivos, implementacion y pruebas.

## Criterios de aceptacion verificables

- Existe un protocolo versionado para 10 participantes anonimos, con consentimiento, guion, tareas, observacion, SUS y reglas de privacidad.
- El estudio usa 5 perfiles con experiencia en administracion de comunidades y 5 propietarios o usuarios finales.
- Las sesiones son moderadas, de escritorio, de 30 a 40 minutos, sobre una demo publica estable identificada por URL y commit.
- El dataset anonimo admite exactamente `P01`-`P10` cuando el estudio queda finalizado y prohibe datos personales, texto libre identificable, cookies, IP, sesiones, grabaciones y organizaciones.
- Los resultados agregados se generan de forma determinista desde `docs/study/responses.json` mediante `npm run study:report`.
- `npm run study:check` valida privacidad, reparto de perfiles, puntuacion SUS, resultados por tarea, sincronizacion del informe, matriz de defensa y enlaces documentales.
- El cuestionario SUS usa los 10 items, escala 1-5 y formula de la version espanola validada; las preguntas abiertas se codifican solo como temas.
- README, arquitectura, despliegue, metricas, limitaciones y matriz objetivo-implementacion-prueba quedan actualizados para la defensa.
- No se modifican endpoints, DTOs HTTP, modelos de dominio, base de datos ni UI.
- No se versionan resultados humanos ficticios. Hasta incorporar 10 sesiones reales, el dataset queda en estado `planned` y el informe declara que la recogida esta pendiente.

## Contratos, datos e interfaces afectadas

- Nuevo contrato documental `docs/study/responses.json`, con `schemaVersion: study-responses/v1`, `status: planned|final`, metadatos del estudio, seis tareas y participantes anonimos.
- Nuevo informe generado `docs/study/results.md`.
- Nuevos scripts raiz `study:report` y `study:check`.
- Nuevo script versionado `scripts/study-report.mjs` con funciones puras para validar, puntuar SUS, agregar tareas y renderizar Markdown.
- Nueva matriz `docs/defense-traceability.md`.
- Nuevo resumen `docs/final-metrics-limitations.md`.
- No cambian contratos de transporte ni APIs publicas.

## Casos de error esperados

- Dataset con version no soportada, estado invalido o metadatos incompletos: `study:check` falla.
- Estado `planned` con participantes parciales: `study:check` falla para evitar datos incompletos ambiguos.
- Estado `final` sin exactamente diez participantes `P01`-`P10`: `study:check` falla.
- Reparto distinto de 5/5 perfiles: `study:check` falla.
- Participante con campo prohibido, email, texto libre o posible identificador: `study:check` falla.
- Tareas fuera de orden, resultados no permitidos, tiempos fuera de rango o SUS distinto de 10 enteros entre 1 y 5: `study:check` falla.
- Informe Markdown no regenerado: `study:check` falla y pide ejecutar `npm run study:report`.
- Enlaces documentales o matriz incompletos: `study:check` falla.

## Restricciones relevantes

- La historia es de evidencias y defensa; no introduce comportamiento visible en la aplicacion.
- El benchmark demo de US24 sigue siendo bloqueante y reproducible.
- El benchmark OpenAI es descriptivo y depende de configuracion externa; su ausencia debe documentarse, no simularse.
- Las respuestas abiertas no se versionan literalmente; solo se versionan codigos tematicos.
- Las notas originales de moderacion se eliminan tras agregarlas al dataset anonimo.
- El dataset no permite datos personales ni identificadores operativos.
- La historia anade exactamente un archivo `.changes/*.md`.

## Estrategia TDD

1. Especificacion y cambio: crear esta especificacion y `.changes/us-025.md`.
2. Analizador del estudio: escribir pruebas rojas para SUS, validacion de participantes, privacidad, agregados y scripts raiz; despues implementar `scripts/study-report.mjs`.
3. Protocolo y dataset: versionar protocolo, plantilla `planned`, catalogo de tareas y resultados Markdown generados.
4. Defensa: actualizar README, arquitectura, despliegue, metricas, limitaciones y matriz objetivo-implementacion-prueba.
5. Cierre: ejecutar `npm run precommit:check` antes de cada commit y `npm run quality` al terminar la historia.

## Incrementos integrables

1. `docs(us-025): especifica el estudio y la defensa`
   - Especificacion SDD y `.changes/us-025.md`.
   - Validacion: `npm run precommit:check`.
2. `feat(study): valida y agrega el estudio anonimo`
   - Pruebas unitarias, script `study:report`, script `study:check` y dataset planificado.
   - Validacion: `npm run precommit:check`.
3. `docs(study): documenta protocolo, evidencias y matriz`
   - Protocolo, resultados generados, matriz, metricas, limitaciones y actualizacion de docs existentes.
   - Validacion: `npm run quality`.

## Definition of Done

- `npm run study:check` pasa y detecta datasets finales incompletos o no anonimos.
- `npm run study:report` regenera `docs/study/results.md` de forma estable.
- README, arquitectura, despliegue, metricas, limitaciones y matriz enlazan las evidencias de US25.
- El estado actual no contiene resultados humanos ficticios.
- Cuando existan las 10 sesiones reales, el dataset final incluira exactamente P01-P10 y resultados agregados recalculables.
- `npm run quality` pasa en verde.
- Existe exactamente un archivo `.changes/us-025.md`.
