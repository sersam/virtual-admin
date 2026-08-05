# Metricas y limitaciones finales US-025

## Metricas tecnicas

- `npm run eval:demo` mide RAG, coordinacion, incidencias, comunicados, actas y juntas con proveedores deterministas y aplica gates bloqueantes.
- `npm run eval:openai` mide el mismo dataset con proveedores OpenAI cuando existe `OPENAI_API_KEY`; es evidencia descriptiva y no bloquea por calidad estocastica.
- `npm run smoke:public` valida healthcheck, proxy same-origin, sesion segura, seed demo, juntas, generacion de orden del dia y observabilidad contra la demo desplegada.
- `npm run study:check` valida que los datos humanos anonimos y el informe agregado sean recalculables.

## Metricas humanas

Cuando el estudio pase a `status: final`, `docs/study/results.md` mostrara:

- Participantes validos y reparto 5/5 por perfil.
- Finalizacion estricta, finalizacion sin ayuda y mediana de tiempo por tarea.
- Modo observado y fallbacks visibles.
- SUS individual agregado como media, mediana, minimo, maximo y desviacion estandar muestral.
- Frecuencia de temas positivos y de mejora sin citas literales.

## Estado actual

El repositorio contiene el protocolo, el dataset planificado y los scripts de validacion. No contiene resultados humanos porque todavia no se han incorporado 10 sesiones reales anonimas.

## Limitaciones

- Muestra pequena, de conveniencia y sin inferencia estadistica.
- Sesiones moderadas, con posible sesgo de ayuda y de orden fijo.
- Evaluacion humana solo en escritorio.
- Datos de comunidad ficticios, sin autenticacion ni roles.
- Dependencia de red, Railway, Vercel, PostgreSQL y OpenAI para la experiencia publica completa.
- El modo demo reproduce flujos y contratos, pero no sustituye una integracion real con datos administrativos.
- `eval:openai` puede variar por configuracion, modelo, latencia y disponibilidad del proveedor.
