# Arquitectura objetivo

## Backend

- `domain`: entidades y reglas puras.
- `application`: casos de uso y puertos.
- `infrastructure`: PostgreSQL, pgvector, OpenAI y adaptadores locales.
- `presentation`: Express, controladores y validación HTTP.

Las dependencias apuntan hacia el dominio. Express, OpenAI y PostgreSQL son detalles reemplazables.

## Frontend

- `app`: arranque, rutas y proveedores.
- `pages`: composición de pantallas.
- `features`: flujos verticales del usuario.
- `shared`: UI, cliente HTTP, hooks y utilidades reutilizables.

Cada historia deberá justificar cualquier dependencia nueva y mantener componentes con una única responsabilidad.
