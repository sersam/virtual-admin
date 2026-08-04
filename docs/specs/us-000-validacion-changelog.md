# US-000 - Validacion robusta de changelog

## Objetivo funcional

Como equipo, queremos que los scripts de changelog manejen de forma controlada la ausencia del directorio `.changes` para que los hooks informen errores accionables y no trazas internas de Node.

## Criterios de aceptacion verificables

- `changes:validate` no lanza `ENOENT` cuando `.changes` no existe.
- La ausencia de `.changes` se interpreta como cero fragmentos y conserva la regla de exigir exactamente un fragmento en ramas de historia.
- `changes:consume` puede reutilizar la misma lectura de fragmentos sin duplicar el manejo de directorios ausentes.
- El mensaje de error sigue indicando cuantos fragmentos se encontraron.

## Contratos, modelo de datos o interfaces afectadas

- `scripts/changelog-lib.mjs` expone una utilidad para listar fragmentos Markdown de un directorio.
- `scripts/validate-changes.mjs` y `scripts/consume-changes.mjs` consumen esa utilidad.
- No cambian los formatos de fragmento `.changes/*.md`.

## Casos de error esperados

- Si `.changes` no existe, el validador falla con el error de dominio de cero fragmentos.
- Si existen cero o varios fragmentos Markdown, se mantiene el error de exactamente un fragmento.
- Si existe un fragmento con formato invalido, se mantiene el error de parseo existente.

## Restricciones relevantes

- No se relaja la regla de un unico fragmento por rama.
- No se introducen dependencias nuevas.
- No se modifican hooks ni scripts de calidad ajenos al changelog.

## Estrategia TDD

1. Anadir una prueba unitaria que verifique que listar fragmentos en un directorio ausente devuelve una lista vacia.
2. Ejecutar la prueba y verificar que falla por ausencia de la utilidad.
3. Implementar la utilidad minima y reutilizarla en los scripts afectados.
4. Ejecutar `npm run test:root` y `npm run changes:validate`.

## Incrementos pequeños, integrables y verificables

1. `fix(changelog): maneja directorios de cambios ausentes`
   - Validacion: `npm run test:root` y `npm run changes:validate`.

## Definition of Done

- La prueba de regresion cubre la ausencia de `.changes`.
- Los scripts de changelog comparten la lectura de fragmentos.
- Existe exactamente un archivo `.changes/*.md` para esta rama.
- Las validaciones indicadas pasan en verde.
