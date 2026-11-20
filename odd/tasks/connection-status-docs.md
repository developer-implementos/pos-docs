# Sonda de conexión de los clientes con la sucursal

Objetivo: documentar en la guía de la API cómo los clientes conectados saben si la sucursal responde: la readiness como sonda, sin carga de más, y el rechazo de comandos durante una caída. Issue: https://github.com/developer-implementos/pos-platform/issues/457 (TASK-457). Responsable: floxcristian.
Rama: `work/task-457-conexion-docs`. Entrega: una PR editorial coordinada con la PR del producto de TASK-457 (pos-platform#470), sin integrar. No cierra la issue del producto ni acredita integración, despliegue en QA ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad editorial acotada a una sección de una página, con ficha propia porque el control editorial no puede leer la ficha del producto, que vive en un repositorio privado.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/api.md`, sección de sondas, describe la readiness como sonda de conexión de los clientes. Incluye cuándo sondean y cuándo no, la espera durante una caída, el rechazo de comandos como no enviados, la conservación de la activación y el aviso accesible. Aceptación: coincide con la ficha `odd/tasks/branch-connection-status.md` de pos-platform#470 y no afirma despliegue. Checks: revisión contra esa ficha.
- S2. La colección de Excalidraw empaqueta la página actualizada. Checks: `python tools/diagrams/package-excalidraw.py` y `npm run verify`.
- S3. El contenido es apto para un repositorio público: sin hosts, IP, cuentas ni valores de despliegue. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar la sección de la sonda de conexión · status:done · evidence: `63f3706`
- [x] T2 · S2 · route:inline · Regenerar la colección de Excalidraw · status:done · evidence: `895d3ca`
- [ ] T3 · S1,S2,S3 · route:inline · Verificar y abrir la PR · status:in_progress · evidence: `npm run verify` en verde hasta `project:check`, que falla igual sobre `origin/main` en este equipo (L2); PR #148 abierta.

## Log

- L1 · 2026-11-20 · Solicitud original del responsable, literal:

> faltan pantallas yo creo. se crítico. queremos una solucion enterprise-grade, sin parches y como lo harian las bigtechs

El alcance elegido fue «P0 y P1» de la auditoría pos-platform#451. Para la documentación, la sesión coordinadora pidió:

> si cambia un contrato o un comportamiento documentado en POS Docs, haz su PR editorial.

- L2 · 2026-11-20 · `npm run verify` sobre `895d3ca` llegó en verde hasta `project:check`, que falló con `Indicator opens its filtered detail: /project/work/?status=verified` (71 filas). La misma comprobación falla igual sobre `origin/main` (`0fa4d19`) en este equipo, así que no la causa este cambio. La declaración de la PR apuntaba a la ficha del producto, que el control editorial no puede leer (404 desde el repositorio privado); por eso esta ficha la reemplaza. Espejo Engram pendiente.
