# Preguntas abiertas por rol en la vista de preguntas y reglas

Objetivo: que `/project/questions/` muestre a cada rol que decide las preguntas abiertas que le tocan, con cuántas tiene por prioridad, y que cada cifra abra esa misma lista, para obtener las decisiones de negocio del registro de preguntas (FOLLOWUP-017). Issue: https://github.com/developer-implementos/pos-platform/issues/258 (TASK-258), cuyo seguimiento FOLLOWUP-017 sigue abierto. Responsable: @floxcristian.

Rama: `work/task-258-agenda-por-rol` desde `de01aa0`. Entrega: una PR a `main`. No importa snapshots: lee el corte publicado del registro, `55ba70a`.

Pruebas: `questions:test`, `project:test`, `portal:test`, `validate`, `typecheck`, `build`, `project:check`, `portal:check`, `editorial:check`, `editorial:test`, `odd:check` y `odd:test`.

Espejo Engram: pendiente. El servidor MCP no conectó en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. «entonces continua con todo lo pendiente que puedas, de forma enterprise-grade, sin parches y como lo harian las bigtechs», sobre la recomendación de preparar la agenda de decisiones por rol: **Preguntas abiertas por rol** lista, antes de los filtros, cada rol que decide alguna pregunta abierta:
  - su nombre, su responsabilidad del catálogo, cuántas preguntas abiertas tiene y cuántas de cada prioridad (P1, P2 y P3);
  - primero los roles con más P1, después los que tienen más abiertas y, a igual cifra, por nombre;
  - un rol que sólo se consulta no figura, y sin preguntas abiertas no hay tabla.
- S2. Cada cifra abre la lista filtrada por ese rol, el estado abierto y, si corresponde, la prioridad, con los mismos criterios que la cifra: no pueden discrepar. La vista agrega un filtro de prioridad, que se combina con los demás y se guarda en la URL.
- S3. La tabla se deriva del corte publicado del registro, sin asignar nada ni marcar decisiones que el registro no tiene. Cuenta preguntas abiertas, reglas y hechos: el filtro no distingue tipos, y un hecho abierto también espera algo del rol que lo decide.

## Tasks

- [x] T1 · S1,S3 · route:inline · `agenda` en `deriveQuestions` de `portal/questions.mjs`, con su prueba · status:done · evidence: RED `questions:test`, la prueba nueva falla sin `agenda`; GREEN 21/21. Con el corte vigente, 13 roles y 98 preguntas abiertas, las mismas que cuenta el resumen
- [x] T2 · S1,S2 · route:inline · Sección, filtro de prioridad, `data-priority` en cada tarjeta, estilos y pruebas de la vista y del filtro · status:done · evidence: con `project-view.mjs`, `project.js` y `questions.mjs` de `main`, fallan 5 pruebas de `questions.test.mjs`, `project-view.test.mjs` y `project.test.mjs`; con los cambios, 55/55
- [x] T3 · S2 · route:inline · Comprobación de navegador y revisión visual · status:done · evidence: `build` y `project:check` aprobados: el clic en la cifra P1 del primer rol abre esa cantidad de preguntas, y su total abre la lista de sus abiertas. Sin desborde a 320 y 390 px. La captura a 390 px mostró la cabecera de cada rol al 52 % del ancho, y se corrigió (L3)
- [x] T4 · S1,S2,S3 · route:inline · `docs/project-progress.md` · status:done · evidence: describe la tabla, su orden, sus enlaces y lo que no hace. El paquete Excalidraw incluye una copia de `docs/*.md`: RED `package-freshness.test.mjs` con la página desactualizada; GREEN `diagrams:test` 7/7 tras `python tools/diagrams/package-excalidraw.py`

## Log

- L1 · 2026-11-13 · Solicitud original, literal:

> entonces continua con todo lo pendiente que puedas, de forma enterprise-grade, sin parches y como lo harian las bigtechs

La recomendación a la que responde proponía agrupar las 96 reglas abiertas por rol, con las P1 primero, para que cada área reciba sólo lo que le toca decidir.

- L2 · 2026-11-13 · No se escribió una agenda aparte: sería una segunda lista que quedaría desactualizada con la próxima importación. La vista ya guardaba los filtros en la URL, así que `?decider=<rol>&state=open` era la lista de un rol; faltaban el filtro de prioridad y un índice con las cifras. La tabla cuenta preguntas abiertas y no sólo reglas, porque cada cifra debe coincidir con la lista que abre y el filtro no distingue tipos. La recomendación también señalaba seis decisiones que cambian el comportamiento actual (Q-14, Q-57, Q-61, Q-80, Q-87 y Q-112). La vista no las destaca, porque el registro no tiene un campo para eso y la vista no inventa datos.
- L3 · 2026-11-13 · En el teléfono, la regla `th:first-child` de la tabla, más específica, dejaba la cabecera de cada rol al 52 % del ancho. La regla móvil de la agenda usa ahora el mismo selector. El filtro de prioridad deja seis selectores en la página de preguntas; la rejilla de escritorio se amplía sólo en esa página, y la de reglas conserva la suya.
