# Administrador Virtual Inteligente

## Objetivo

Construir el MVP mediante historias de usuario pequeñas, demostrables e integrables a través de Pull Requests independientes.

Cada historia debe aportar un incremento funcional vertical, verificable y desplegable.

---

## Principios generales

* Aplicar Clean Architecture y principios SOLID.
* Mantener el código simple, legible y fácil de modificar.
* Favorecer la composición frente a la herencia.
* Evitar la sobreingeniería.
* Implementar únicamente lo necesario para satisfacer la historia actual.
* No desarrollar funcionalidades futuras de forma anticipada (YAGNI).
* Todo comportamiento debe estar respaldado por pruebas automatizadas.

---

## Arquitectura

### Backend

Estructura obligatoria:

```text
domain/
application/
infrastructure/
presentation/
```

### Frontend

Estructura obligatoria:

```text
app/
pages/
features/
shared/
```

### Reglas arquitectónicas

* `domain` no depende de ningún otro módulo.
* `application` depende únicamente de `domain`.
* `infrastructure` implementa puertos definidos por `application`.
* `presentation` consume casos de uso de `application`.
* Las dependencias siempre apuntan hacia el dominio.
* El dominio no conoce frameworks, librerías externas ni detalles de infraestructura.
* Las dependencias externas deben conectarse mediante puertos definidos en `application`.
* Extraer componentes reutilizables cuando exista una necesidad real de reutilización.
* Evitar archivos multipropósito.

---

## Desarrollo guiado por pruebas (TDD)

Todas las historias deben seguir estrictamente el ciclo:

```text
Red → Green → Refactor
```

### Flujo obligatorio

1. Analizar la historia.
2. Identificar criterios de aceptación.
3. Diseñar las pruebas.
4. Escribir primero las pruebas.
5. Verificar que fallan.
6. Implementar el mínimo código necesario para hacerlas pasar.
7. Añadir casos alternativos y casos límite.
8. Refactorizar manteniendo todas las pruebas en verde.
9. Ejecutar validaciones de calidad.

### Orden recomendado de implementación

1. Happy Path.
2. Casos alternativos.
3. Casos límite.
4. Manejo de errores.
5. Refactorización final.

### Restricciones

* No escribir código de producción sin una prueba previa que lo justifique.
* No implementar funcionalidades no cubiertas por pruebas.
* No optimizar prematuramente.
* No introducir abstracciones antes de que exista una necesidad real.

---

## Flujo por historia de usuario

### Rama

Cada historia debe desarrollarse en una rama independiente:

```text
codex/us-NNN-descripcion
```

### Alcance

* Una historia entrega un único incremento funcional.
* No mezclar refactors no relacionados.
* No mezclar correcciones ajenas.
* No mezclar mejoras técnicas fuera del alcance de la historia.
* Si aparece una necesidad fuera del alcance, crear una nueva historia.

### Cambios

Cada rama debe añadir exactamente un archivo:

```text
.changes/*.md
```

---

## Criterios de aceptación

Toda historia debe definir explícitamente:

* Objetivo funcional.
* Criterios de aceptación verificables.
* Casos de error esperados.
* Restricciones relevantes.
* Definition of Done.

No implementar comportamiento que no esté descrito en la historia.

---

## Convenciones

### Código

* TypeScript estricto.
* ESLint sin errores.
* Prettier aplicado.
* Evitar comentarios innecesarios.
* Nombres descriptivos.
* Funciones pequeñas y cohesionadas.

### Idioma

* Todo el contenido visible para el usuario debe estar en español.
* Los identificadores del código pueden mantenerse en inglés.

### Contratos

* Todos los DTOs y contratos de transporte deben validarse mediante Zod.
* No confiar en datos externos sin validación.

---

## Reglas para funcionalidades IA

### OpenAI

* OpenAI solo podrá utilizarse desde backend.
* Nunca desde componentes frontend.
* Debe existir un modo demo local.

### Prompts

* Los prompts deben almacenarse de forma versionada.
* Los prompts no deben estar embebidos en componentes UI.
* Los prompts deben ser fácilmente sustituibles.

### Observabilidad

Registrar:

* Modelo utilizado.
* Tokens consumidos.
* Coste estimado.
* Latencia.

### RAG

* El sistema debe mostrar siempre las fuentes realmente recuperadas.
* Nunca mostrar fuentes simuladas.
* Nunca generar referencias inexistentes.
* Las respuestas deben ser trazables a los documentos recuperados.

---

## Pruebas obligatorias

### Unitarias

Todo código nuevo o modificado debe incluir pruebas unitarias que cubran:

* Comportamiento esperado.
* Casos alternativos.
* Casos límite.
* Errores relevantes.

### Integración

Todo caso de uso debe incluir pruebas de integración cuando aplique:

* Persistencia.
* APIs.
* Proveedores IA.
* Contratos compartidos.
* Adaptadores externos.

### End-to-End

Todo flujo visible para usuario debe incluir pruebas E2E mediante Playwright cuando sea técnicamente posible.

### Regresiones

Toda corrección de errores debe incorporar una prueba de regresión que falle antes del arreglo.

### Excepciones

Si una prueba de integración o E2E no es viable:

* Documentar el motivo en la PR.
* Añadir la verificación automatizada más cercana posible.

---

## Cobertura mínima

Objetivos recomendados:

| Capa           | Cobertura mínima |
| -------------- | ---------------- |
| Domain         | 95%              |
| Application    | 90%              |
| Infrastructure | 80%              |
| Presentation   | Flujos críticos  |

Reglas:

* No reducir la cobertura existente.
* Las nuevas funcionalidades deben mantener o aumentar la cobertura global.

---

## Pull Requests

Cada Pull Request debe incluir:

### Resumen

* Historia implementada.
* Alcance funcional.

### Evidencias

* Capturas de pantalla.
* Vídeos.
* Resultados de pruebas.

### Calidad

* Tests añadidos.
* Riesgos conocidos.
* Limitaciones detectadas.
* Archivo `.changes` correspondiente.

### Tamaño

Objetivo:

```text
< 500 líneas modificadas
```

Si se supera:

* Justificar el motivo en la PR.

---

## Definition of Done

Una historia se considera terminada únicamente cuando:

* Cumple todos los criterios de aceptación.
* Todas las pruebas pasan.
* Las pruebas se ejecutan desde `npm run quality`.
* No existen errores de TypeScript.
* No existen errores de ESLint.
* No existen warnings críticos.
* Se ha añadido el archivo `.changes`.
* El incremento funcional puede demostrarse manualmente.
* La PR está lista para revisión.

---

## Restricciones del MVP

* Sin autenticación.
* Sin gestión de roles.
* Sin integraciones externas reales.
* Sin dependencias innecesarias.
* No modificar el stack tecnológico sin justificación explícita en la PR.

---

## Comportamiento esperado del agente

Antes de implementar cualquier historia:

1. Analizar requisitos.
2. Identificar criterios de aceptación.
3. Diseñar estrategia de pruebas.
4. Proponer un plan breve.
5. Implementar siguiendo TDD.

Si existe cualquier ambigüedad:

* Detener la implementación.
* Solicitar aclaración.
* No asumir comportamientos no especificados.

El agente debe priorizar:

1. Correctitud.
2. Simplicidad.
3. Testabilidad.
4. Mantenibilidad.
5. Rendimiento.

## Contexto y reutilización

Antes de comenzar cualquier tarea:

* Leer completamente este archivo `agents.md`.
* Revisar la estructura actual del proyecto.
* Revisar historias de usuario implementadas previamente.
* Revisar componentes, casos de uso y utilidades existentes antes de crear nuevas implementaciones.
* Mantener consistencia con las decisiones arquitectónicas ya adoptadas.

### Reutilización

* No duplicar lógica existente.
* Reutilizar componentes compartidos cuando cubran el caso de uso.
* Reutilizar casos de uso, servicios y utilidades existentes cuando sea posible.
* Extraer código compartido únicamente cuando exista una segunda necesidad real.

### Consistencia

* Mantener convenciones de nombres ya existentes.
* Mantener patrones arquitectónicos ya presentes en el proyecto.
* Evitar introducir nuevos patrones o librerías sin una justificación clara.
* Mantener una experiencia de usuario consistente en toda la aplicación.

### Análisis previo

Antes de escribir código, identificar:

* Qué partes del sistema se verán afectadas.
* Qué pruebas deberán añadirse o modificarse.
* Qué componentes pueden reutilizarse.
* Qué riesgos de regresión existen.

Si existe una implementación previa que resuelva el problema de forma razonable, debe priorizarse su reutilización frente a la creación de una nueva.
