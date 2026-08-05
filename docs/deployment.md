# Despliegue publico de la demo

Esta guia cubre el despliegue publico usado desde la US-023 y las evidencias de defensa de US-025: API Express en Railway, PostgreSQL con pgvector en Railway, frontend Vite en Vercel, smoke postdespliegue y condiciones para ejecutar el estudio humano sobre una version estable.

## Topologia

- Railway ejecuta `@admin/api` con `npm run start --workspace @admin/api`.
- Railway ejecuta `npm run db:migrate` como predeploy antes de activar cada version.
- Railway valida `/health` antes de considerar saludable el despliegue.
- La base de datos debe crearse desde la plantilla pgvector de Railway. No usar PostgreSQL estandar sin extension `vector`.
- Vercel compila `@admin/web` y deja `VITE_API_BASE_URL` sin definir.
- `apps/web/vercel.mjs` reenvia `/api/:path*` al origen Railway y resuelve rutas profundas con `/index.html`.
- OpenAI solo se configura en Railway; nunca en Vercel ni en el navegador.

## Variables

### Railway

| Variable                        | Valor esperado                   | Notas                                           |
| ------------------------------- | -------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                      | `production`                     | Activa cookies seguras y confianza en 1 proxy.  |
| `DATABASE_URL`                  | Referencia a PostgreSQL pgvector | Debe apuntar a la base Railway con pgvector.    |
| `COOKIE_SECRET`                 | Secreto largo y aleatorio        | Firma cookies y hashes diarios de cuota.        |
| `OPENAI_API_KEY`                | API key OpenAI                   | Activa redaccion y clasificacion IA.            |
| `AI_ACTION_QUOTA_SECRET`        | Secreto largo y aleatorio        | Separa el HMAC de cuotas de la firma de cookie. |
| `AI_ACTION_SESSION_DAILY_LIMIT` | `20`                             | Limite UTC diario por sesion.                   |
| `AI_ACTION_IP_DAILY_LIMIT`      | `100`                            | Limite UTC diario por IP.                       |
| `PORT`                          | Inyectada por Railway            | No definir manualmente.                         |

### Vercel

| Variable             | Valor esperado              | Notas                                  |
| -------------------- | --------------------------- | -------------------------------------- |
| `RAILWAY_API_ORIGIN` | Origen HTTPS publico de API | Sin ruta, query ni barra final logica. |

No definir `VITE_API_BASE_URL` en Vercel. El frontend usa rutas relativas para que el proxy same-origin gestione cookies y CORS.

### GitHub Actions

Configurar variables publicas del repositorio:

| Variable         | Valor esperado                  |
| ---------------- | ------------------------------- |
| `PUBLIC_WEB_URL` | URL publica del frontend Vercel |
| `PUBLIC_API_URL` | URL publica directa de la API   |

## Aprovisionamiento

1. Crear en Railway un proyecto para la demo.
2. Crear la base desde la plantilla pgvector de Railway.
3. Crear el servicio de API desde el repositorio y usar `railway.json`.
4. Configurar las variables Railway obligatorias.
5. Desplegar Railway y comprobar que el predeploy ejecuta migraciones sin error.
6. Confirmar que `/health` responde `status: ok`, `service: administrador-virtual-api` y version.
7. Crear el proyecto Vercel apuntando a `apps/web` como root directory.
8. Configurar `RAILWAY_API_ORIGIN` con el origen HTTPS publico de Railway.
9. Desplegar Vercel.
10. Configurar `PUBLIC_WEB_URL` y `PUBLIC_API_URL` como variables publicas del repositorio GitHub.
11. Ejecutar el workflow manual `Public smoke` contra produccion.

## Smoke postdespliegue

El smoke se puede ejecutar desde GitHub Actions o desde una terminal con:

```bash
PUBLIC_WEB_URL=https://<frontend>.vercel.app PUBLIC_API_URL=https://<api>.up.railway.app npm run smoke:public
```

El script verifica:

- `GET /health` directo contra Railway.
- Portada y `/documentos` desde Vercel.
- `GET /api/session` a traves del proxy Vercel, `mode: api` y cookie segura.
- Dos listados consecutivos de incidencias con la misma cookie: cuatro incidencias demo estables y sin duplicados.
- Dos juntas demo.
- Borrador de orden del dia con cuatro fuentes de incidencia y dos acuerdos pendientes.
- Generacion `mode: openai` o fallback explicito. `deterministic-demo` sin `fallbackReason` falla porque indica falta de `OPENAI_API_KEY`.
- `/api/observability` a traves del proxy.

La salida solo imprime conteos, estados, URLs publicas y modos. No imprime cookies, IDs de sesion, secretos ni contenido generado.

## Congelacion para US-025

Antes de reclutar participantes del estudio:

1. Confirmar el commit que se va a evaluar.
2. Desplegar API y frontend desde ese mismo codigo.
3. Ejecutar `npm run smoke:public` contra las URLs publicas.
4. Ejecutar `npm run eval:demo` y conservar el reporte local generado en `artifacts/evaluations` como evidencia tecnica saneada.
5. Ejecutar `npm run eval:openai` solo si existe `OPENAI_API_KEY`; si no existe, documentar su ausencia como limitacion.
6. Registrar URL, commit, navegador y fechas en `docs/study/responses.json`.

Durante la recogida no se debe cambiar codigo funcional, configuracion visible, prompt versionado ni datos demo. Si ocurre un cambio, las sesiones afectadas deben repetirse o separarse en otro bloque de evaluacion.

## Rollback

- Railway: volver a desplegar una version anterior desde el historial del servicio. Si el esquema ya fue migrado, verificar compatibilidad antes de promover una version antigua.
- Vercel: promover el deployment anterior desde el historial del proyecto.
- GitHub: ejecutar de nuevo `Public smoke` despues del rollback y adjuntar el log saneado a la PR o incidencia.

## Rotacion de secretos

- Rotar `OPENAI_API_KEY` desde el panel de Railway y redeplegar la API.
- Rotar `AI_ACTION_QUOTA_SECRET` al cambiar el periodo de control de cuotas. Al rotarlo se inicia una nueva identidad diaria de cuota.
- Rotar `COOKIE_SECRET` invalida cookies de demo existentes. Hacerlo fuera de una demostracion en vivo y ejecutar el smoke despues.
- Nunca copiar secretos a Vercel, GitHub variables publicas ni logs de PR.

## Evidencias para la PR

- Captura de portada en Vercel.
- Captura de `/documentos` cargando como ruta profunda.
- Captura de un flujo IA con modo OpenAI o fallback visible.
- Log Railway de migraciones predeploy.
- Evidencia del healthcheck Railway.
- Log saneado del workflow `Public smoke`.
- Para US-025, protocolo del estudio, `docs/study/results.md`, `docs/defense-traceability.md` y `docs/final-metrics-limitations.md`.

## Limitaciones

- No hay dominio personalizado en esta historia.
- No se configuran backups ni monitorizacion continua.
- Los previews pueden compartir la API publica.
- Cada smoke crea una sesion canario aislada y sin datos personales; no se anade API administrativa de limpieza.
