# US-024 - Evaluacion automatica

## Objetivo funcional

Como tribunal, quiero evidencias cuantitativas de calidad para justificar el comportamiento del sistema mediante un benchmark reproducible sobre proveedores y casos de uso reales del backend, sin atravesar HTTP, sesiones ni cuotas.

## Criterios de aceptacion verificables

- La raiz expone `npm run eval:demo`, que ejecuta proveedores deterministas, no realiza llamadas externas y aplica umbrales bloqueantes.
- La raiz expone `npm run eval:openai`, que exige `OPENAI_API_KEY`, usa recuperacion RAG lexica y generadores OpenAI reales, informa metricas sin bloquear por calidad estocastica y falla por configuracion, dataset invalido o errores tecnicos.
- Los datasets versionados se almacenan en `apps/api/evaluation/datasets/v1` y contienen 48 casos ficticios: RAG 8, coordinacion 12, incidencias 8, comunicados 8, actas 6 y juntas 6.
- Los datasets se validan con Zod antes de ejecutar cualquier evaluacion.
- La evaluacion reutiliza los casos de uso reales `AnswerDocumentQuestion`, `CreateIncident`, `DraftCommunityNotice`, `DraftMeetingMinutes` y `DraftMeetingAgenda`, ademas del puerto `ChatIntentClassifier`.
- La evaluacion no crea endpoints, no cambia DTOs HTTP y no modifica contratos frontend.
- `eval:openai` no aplica fallback determinista ni reintentos, ejecuta los casos secuencialmente y continua tras fallos aislados para escribir un diagnostico completo.
- Los reportes se escriben en `artifacts/evaluations/{demo|openai}.{json|md}` y `artifacts/` queda ignorado por Git.
- El JSON contiene version de esquema/dataset, modo, commit, fecha, duracion, agregados, resultados por caso, errores saneados y, en OpenAI, modelo, prompts, tokens, coste y latencia.
- Los reportes no almacenan claves, entradas completas ni textos generados.
- El Markdown muestra tablas, umbrales, casos fallidos y limitaciones.
- `npm run quality` ejecuta `eval:demo`.
- El workflow de calidad de GitHub Actions ejecuta `eval:demo` y sube los reportes demo como artifact incluso cuando falle el gate.

## Contratos, datos e interfaces afectadas

- Nueva interfaz publica de scripts raiz: `eval:demo` y `eval:openai`.
- Nueva carpeta versionada `apps/api/evaluation/datasets/v1` con JSON validado por Zod.
- Nueva capa `apps/api/src/application/evaluation` para orquestacion, metricas y evaluadores puros.
- Nueva capa `apps/api/src/infrastructure/evaluation` para carga de datasets, escritura atomica de reportes, resolucion de commit y telemetria.
- Nuevo CLI en `apps/api/src/presentation/cli/runEvaluation.ts`.
- No cambian endpoints, DTOs HTTP, tablas de base de datos ni contratos frontend.

## Metricas y gates

- RAG: recall de recuperacion `@3`, rango reciproco, precision/recall de citas, cobertura de hechos y exactitud ante evidencia insuficiente.
- Coordinacion: accuracy y macro-F1.
- Incidencias: accuracy de categoria, prioridad y clasificacion conjunta, cobertura del comunicado y tasa de afirmaciones prohibidas.
- Comunicados: cobertura de conceptos requeridos, validez estructural y ausencia de afirmaciones inventadas.
- Actas: precision/recall/F1 de acuerdos y tareas, exactitud de responsable/fecha y tasa de elementos inventados.
- Juntas: precision/recall y orden de fuentes, cobertura del cuerpo, ausencia de asuntos inventados y exactitud del caso vacio.
- Se calcula una puntuacion normalizada por capacidad y una media macro global.
- `eval:demo` exige cero errores tecnicos, cero afirmaciones prohibidas y minimos: RAG 0,85; coordinacion 0,90; incidencias 0,85; comunicados 0,90; actas 0,90; juntas 0,90.
- `eval:openai` muestra las mismas metricas, pero no falla por puntuacion. Una clave ausente, dataset invalido o cualquier caso no ejecutado correctamente produce codigo de salida distinto de cero despues de escribir el reporte disponible.

## Casos de error esperados

- Dataset inexistente, mal formado, con version no soportada, IDs duplicados, cobertura incompleta o expectativas incoherentes: el CLI falla antes de ejecutar casos y emite diagnostico saneado.
- `eval:openai` sin `OPENAI_API_KEY`: el CLI falla con mensaje de configuracion, sin ejecutar casos.
- Error tecnico aislado en un caso: la ejecucion continua, el reporte incluye el fallo saneado y el codigo final es distinto de cero.
- Error de escritura de reportes: el CLI falla con codigo distinto de cero.
- Division vacia en metricas o capacidades sin casos: se normaliza a cero o se informa como invalido segun corresponda, sin `NaN`.
- Cualquier salida de error evita imprimir claves, entradas completas o textos generados.

## Restricciones relevantes

- OpenAI solo se usa desde backend.
- El modo demo local no depende de red ni de `OPENAI_API_KEY`, aunque la variable exista.
- No se anaden integraciones externas reales adicionales.
- No se anade E2E de navegador porque no existe flujo UI; el CLI real en CI es la validacion de aceptacion mas cercana.
- Cada caso de junta usa repositorios de evaluacion aislados para evitar contaminacion entre casos.
- La historia anade exactamente un archivo `.changes/*.md`.

## Estrategia TDD

1. Documentacion: crear esta especificacion y `.changes/us-024.md`.
2. Datasets y metricas: escribir pruebas rojas para esquemas, version, IDs unicos, cobertura, normalizacion, divisiones vacias, puntuaciones compuestas y umbrales; despues implementar validadores, datasets y evaluadores puros.
3. Orquestacion y CLI: escribir pruebas rojas con proveedores fake para aislamiento, agregacion, errores parciales, telemetria, reportes saneados y modos demo/OpenAI; despues implementar composicion, CLI y escritura atomica.
4. CI y scripts: escribir pruebas rojas de scripts/configuracion cuando aplique; despues conectar scripts raiz, `quality`, `.gitignore` y workflow.
5. Cierre: ejecutar `npm run precommit:check` antes de cada commit y `npm run quality` al terminar la historia.

## Incrementos integrables

1. `docs(us-024): especifica la evaluacion automatica`
   - Especificacion SDD y `.changes/us-024.md`.
   - Validacion: `npm run precommit:check`.
2. `feat(evaluation): anade datasets y metricas versionadas`
   - Esquemas, datasets, evaluadores y pruebas unitarias.
   - Validacion: `npm run precommit:check`.
3. `feat(evaluation): ejecuta benchmarks demo y OpenAI`
   - Composicion, CLI, telemetria, reportes y pruebas de integracion.
   - Validacion: `npm run precommit:check`.
4. `ci(evaluation): ejecuta el benchmark demo`
   - Scripts raiz, quality gate, artifact de CI y documentacion de uso/limitaciones.
   - Validacion: `npm run quality`.

## Definition of Done

- Todos los criterios de aceptacion estan cubiertos por pruebas automatizadas o por la ejecucion del CLI.
- `npm run quality` pasa en verde.
- TypeScript, ESLint y Prettier no reportan errores.
- Existe exactamente un archivo `.changes/us-024.md`.
- `eval:demo` genera reportes JSON y Markdown, aplica gates y no realiza llamadas externas.
- `eval:openai` genera reportes JSON y Markdown con telemetria OpenAI cuando hay clave configurada.
- La PR documenta que `eval:openai` evalua recuperacion lexica mas redaccion OpenAI, no pgvector, y justifica superar 500 lineas si los datasets versionados hacen inevitable ese tamano.
