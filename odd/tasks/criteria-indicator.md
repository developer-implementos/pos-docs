# Indicador de criterios cumplidos con evidencia

Objetivo: importar y mostrar en `/project/`, junto al porcentaje oficial, los criterios de las fichas cumplidos con evidencia, global, por fase y por entregable. Issue: https://github.com/developer-implementos/pos-platform/issues/716 (TASK-716). Responsable: floxcristian.
Rama: `work/task-716-criteria-indicator`. Entrega: una PR editorial coordinada con la PR del producto de TASK-716, sin integrar. No cierra la issue del producto ni acredita verificación, aceptación ni homologación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. La importación (`tools/sync-project-progress.mjs` mediante `portal/progress.mjs`) acepta y conserva los campos opcionales `criteria: { met, total }` de cada entregable y el agregado de `delivery/progress.json`; valida enteros con `0 <= met <= total`, rechaza campos desconocidos, el esquema 1 y un agregado distinto de la suma, sin reemplazar el snapshot publicado. El agregado admite `phases` con claves `F\d\d` que cubren las fases del roadmap; cada fase coincide con la suma de sus entregables y las fases suman el total. Checks: `npm run progress:test`.
- S2. Las páginas del proyecto muestran «Criterios cumplidos con evidencia: met de total (X %)» junto al porcentaje oficial, global, por fase y por entregable, con una explicación que lo distingue del porcentaje oficial y enlaza su definición; sin los campos no muestran nada. Checks: `npm run project:test`, `npm run project:check`.
- S3. `docs/project-progress.md` define el indicador y su diferencia con el porcentaje oficial, sin aceptación ni homologación. Checks: `npm run verify`.

## Tasks

- [x] T1 · S1 · route:inline · Validar e importar los conteos opcionales · status:done · evidence: pruebas de `portal/progress.test.mjs` y `tools/sync-project-progress.test.mjs`
- [x] T2 · S2,S3 · route:inline · Mostrar el indicador y su definición · status:done · evidence: pruebas de `portal/project-view.test.mjs`
- [x] T4 · S1,S3 · route:inline · Aceptar el agregado por fase del generador del producto · status:done · evidence: pruebas con los valores reales del 2026-11-23
- [x] T3 · S1,S2,S3 · route:inline · Verificar y abrir la PR · status:done · evidence: `npm run verify` en verde (exit 0) sobre `2e5d839`; PR abierta sin integrar

## Log

- L1 · 2026-11-23 · Solicitud de la sesión coordinadora, literal:

> show a second progress indicator next to the official percentage (issue developer-implementos/pos-platform#716, TASK-716)

> display, next to the official percentage, the indicator "Criterios cumplidos con evidencia: met de total (X %)" globally, per phase and per package, with a short explanation that distinguishes it from the official percentage and links the definition; when the fields are absent, show nothing (no fake zeros)

- L2 · 2026-11-23 · El contrato del producto se implementa en paralelo. `summary` de `delivery/progress.json` es texto, así que el agregado se acepta en `criteria` del contenido; las fases y el total se derivan sumando los entregables, sólo cuando todos los informan, y un agregado declarado debe coincidir con esa suma. Un entregable con total 0 no muestra indicador. Coordinar ese campo con la PR del producto.
- L3 · 2026-11-23 · `npm run verify` falló primero en `diagrams:test` porque la colección de Excalidraw empaqueta `docs/project-progress.md`; se regeneró con `python tools/diagrams/package-excalidraw.py` (`2e5d839`) y la segunda corrida terminó en verde, incluido `project:check`.
- L4 · 2026-11-23 · La sesión coordinadora confirmó la forma real del generador: `criteria: { met, total, phases: { F01: { met, total }, … } }` en el contenido y `criteria: { met, total }` por entregable, con esquema 2. Valores del día: total 156/594; F01 93/110, F02 49/118, F03 9/97, F04 3/100, F05 2/97, F06 0/72. Se usan como fixture sintético; el snapshot publicado no cambia.
