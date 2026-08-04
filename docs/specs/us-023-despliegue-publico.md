# US-023 - Despliegue publico

## Objetivo funcional

Como tribunal, quiero acceder a una demo publica desplegada con frontend, API y base de datos persistente para evaluar el MVP sin instalar el proyecto en local.

## Criterios de aceptacion verificables

- La API Express se despliega en Railway y arranca con `NODE_ENV=production`, `DATABASE_URL`, `COOKIE_SECRET`, `OPENAI_API_KEY`, `AI_ACTION_QUOTA_SECRET`, `AI_ACTION_SESSION_DAILY_LIMIT=20` y `AI_ACTION_IP_DAILY_LIMIT=100`.
- La base de datos de Railway usa PostgreSQL con pgvector disponible; no se acepta PostgreSQL estandar sin la extension `vector`.
- Railway ejecuta `npm run db:migrate` como predeploy y falla el despliegue si las migraciones no terminan correctamente.
- Railway sirve la API con `npm run start --workspace @admin/api`, escucha en `0.0.0.0` y usa el puerto inyectado por la plataforma.
- Railway consulta `/health` antes de activar una version.
- El frontend Vite se despliega en Vercel sin definir `VITE_API_BASE_URL`.
- Vercel reenvia `/api/:path*` hacia la API publica de Railway y conserva el prefijo `/api`.
- Vercel resuelve rutas profundas de la SPA, por ejemplo `/documentos`, devolviendo `index.html`.
- OpenAI solo queda configurado en Railway. El navegador nunca recibe ni necesita `OPENAI_API_KEY`.
- El seed demo se verifica creando una sesion canario en el smoke postdespliegue; la inicializacion sigue siendo idempotente y aislada por sesion.
- El smoke publico valida salud de API, carga de frontend, proxy, cookie segura, incidencias demo, juntas demo, borrador de orden del dia, modo OpenAI o fallback explicito y observabilidad.
- El smoke no imprime cookies, identificadores de sesion, secretos ni contenido generado.
- La documentacion lista variables, aprovisionamiento, despliegue, rollback, rotacion de secretos, smoke y limitaciones conocidas.

## Contratos, datos e interfaces afectadas

- No cambian contratos HTTP, DTOs, esquemas Zod ni tablas de base de datos.
- `@admin/api` anade un script `start` para produccion usando `tsx`.
- `tsx` pasa a dependencia de produccion de `@admin/api` porque Railway ejecutara el arranque con `npm install --omit=dev` o equivalente.
- `apps/api/src/main.ts` escucha en `0.0.0.0` y mantiene `PORT` configurable.
- `railway.json` declara build, predeploy, start, healthcheck, reinicio y rutas observadas.
- `apps/web/vercel.mjs` valida `RAILWAY_API_ORIGIN` como HTTPS y define rewrites en orden proxy y SPA.
- La raiz anade `smoke:public`, ejecutado por un script Node sin navegador ni credenciales.
- GitHub Actions anade un workflow manual `workflow_dispatch` para ejecutar el smoke con `PUBLIC_WEB_URL` y `PUBLIC_API_URL`.

## Casos de error esperados

- Falta `COOKIE_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY` o una cuota requerida en Railway: la API falla en arranque o el smoke falla con diagnostico saneado.
- La base Railway no tiene pgvector o el esquema no esta migrado: el predeploy o el arranque falla; no hay fallback silencioso a memoria.
- `RAILWAY_API_ORIGIN` esta ausente, no es HTTPS o contiene ruta: la configuracion de Vercel falla antes de desplegar.
- `/health` no devuelve el contrato esperado: el smoke falla.
- La portada o una ruta profunda no cargan HTML desde Vercel: el smoke falla.
- `/api/session` no atraviesa el proxy, no devuelve `mode: api` o no emite cookie segura: el smoke falla.
- La sesion canario duplica datos demo entre listados consecutivos: el smoke falla.
- El borrador de orden del dia no contiene cuatro incidencias y dos acuerdos pendientes trazables: el smoke falla.
- La generacion responde en modo determinista sin `fallbackReason`: el smoke falla porque indicaria falta de OpenAI en produccion.
- Cualquier error del smoke debe informar URL, paso y estado sin exponer datos sensibles.

## Restricciones relevantes

- Sin autenticacion, roles, dominio personalizado, backups ni monitorizacion continua en esta historia.
- No se anade API administrativa de limpieza; cada smoke crea una sesion canario sin datos personales.
- Los previews pueden compartir la API publica; entornos aislados de preview quedan fuera de alcance.
- Se reutilizan las cuotas y fallbacks de US-022.
- La implementacion debe anadir exactamente un archivo `.changes/*.md`.
- La historia no se considera terminada hasta que ambos servicios esten publicos y el smoke de produccion pase.

## Estrategia TDD

1. Documentacion: especificacion y fragmento de changelog validados por `changes:validate`.
2. Railway/API: pruebas rojas para `railway.json`, script `start`, dependencia `tsx`, host `0.0.0.0`, predeploy, healthcheck, reinicio y watch paths.
3. Vercel: pruebas rojas para origen ausente, URL insegura, URL con ruta, normalizacion de barra final y orden de rewrites.
4. Smoke: pruebas con dobles HTTP para salud, HTML, proxy, cookie, idempotencia de seed, juntas, orden del dia, observabilidad, errores y saneamiento de logs.
5. Documentacion operacional: README y arquitectura actualizados; validacion final con `npm run quality`.

## Incrementos integrables

1. `docs(us-023): especifica el despliegue publico`
   - Crear esta especificacion y `.changes/us-023.md`.
   - Validacion: `npm run precommit:check`.
2. `feat(deploy): prepara la API para Railway`
   - Arranque productivo, escucha publica y `railway.json`.
   - Validacion: pruebas de configuracion Railway/API y `npm run precommit:check`.
3. `feat(deploy): configura el frontend en Vercel`
   - Configuracion programatica, validacion de origen y rewrites.
   - Validacion: pruebas de configuracion Vercel y `npm run precommit:check`.
4. `test(deploy): automatiza el smoke publico`
   - Script Node, pruebas con dobles HTTP y workflow manual.
   - Validacion: pruebas de smoke y `npm run precommit:check`.
5. `docs(us-023): documenta despliegue y operacion`
   - README, arquitectura y runbook de despliegue.
   - Validacion: `npm run quality`.

## Definition of Done

- Todos los criterios de aceptacion estan cubiertos por pruebas automatizadas o smoke documentado.
- `npm run quality` pasa en verde.
- TypeScript, ESLint y Prettier no reportan errores.
- Existe exactamente un archivo `.changes/*.md`.
- Railway queda aprovisionado con plantilla pgvector y API publica saludable.
- Vercel queda desplegado con proxy `/api` y rutas profundas de SPA.
- GitHub Actions permite ejecutar el smoke postdespliegue contra produccion.
- La PR incluye capturas de portada, `/documentos`, flujo IA y logs saneados de migracion, healthcheck y smoke.
