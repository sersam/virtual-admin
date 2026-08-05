# Matriz de trazabilidad para la defensa

Esta matriz conecta los objetivos defendibles del TFM con implementacion, pruebas automatizadas y evidencias de estudio. En el estado actual, `docs/study/responses.json` esta en `status: not-conducted`, por lo que la columna humana se conserva como protocolo no ejecutado y no como resultado empirico.

| Objetivo                                    | Implementacion                                                                                    | Pruebas automatizadas                                                              | Benchmark US24                                         | Tarea humana US25                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Gestion centralizada de tareas comunitarias | Shell web, sesiones demo, incidencias, comunicados, actas, juntas y propuestas                    | Unitarias, integracion API y Playwright de flujos criticos                         | Coordinacion, incidencias, comunicados, actas y juntas | Tareas 1, 2, 4, 5 y 6                                       |
| RAG trazable sin fuentes inventadas         | `AnswerDocumentQuestion`, `DocumentRetriever`, validacion de fuentes citadas y enlaces a PDF real | Pruebas de recuperacion, respuestas con evidencia insuficiente y E2E de documentos | RAG                                                    | Tarea 3                                                     |
| Coordinacion especializada multiagente      | `ChatWorkflow`, `ChatIntentClassifier`, LangGraph y fallback determinista                         | Pruebas de clasificacion, rutas de chat y trazas de proveedor                      | Coordinacion                                           | Tarea 1                                                     |
| Automatizacion estructurada de documentos   | Generadores de comunicados, actas y ordenes del dia con salida validada y edicion posterior       | Pruebas de contratos, generadores fake, UI y exportacion                           | Comunicados, actas y juntas                            | Tareas 2, 5 y 6                                             |
| Modo demo seguro y reproducible             | Adaptadores deterministas, fallbacks visibles, datasets ficticios y `eval:demo` bloqueante        | `npm run eval:demo`, unitarias de fallback y smoke local/publico                   | Demo: gate bloqueante sin llamadas externas            | Registro de modo en todas las tareas                        |
| Despliegue publico observable               | Railway, PostgreSQL pgvector, Vercel proxy, cuotas, telemetria y smoke publico                    | `smoke:public`, pruebas de cuotas y observabilidad                                 | OpenAI descriptivo cuando existe clave                 | Condicion de ejecucion del estudio sobre URL/commit estable |

## Lectura para defensa

- La evidencia tecnica muestra correctitud reproducible sobre casos ficticios controlados.
- La evidencia humana queda limitada al diseno del protocolo porque no se ejecutaron sesiones con usuarios reales.
- La matriz evita afirmar que el sistema esta listo para produccion: cada objetivo se defiende con su implementacion, su prueba y su limitacion observable.
