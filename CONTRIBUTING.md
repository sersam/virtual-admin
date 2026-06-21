# Contribución por historias de usuario

1. Crear una rama desde `main`: `codex/us-NNN-descripcion`.
2. Implementar únicamente los criterios de aceptación de la historia.
3. Añadir `.changes/us-NNN.md` con el tipo y resumen del cambio.
4. Ejecutar `npm run quality` y las pruebas específicas de la historia.
5. Abrir una PR usando la plantilla del repositorio.

## Fragmento de changelog

```md
---
type: Added
---

Descripción breve y orientada a usuario.
```

Tipos válidos: `Added`, `Changed`, `Fixed`, `Removed` y `Security`.
