# Roles y preguntas unidas en la vista de preguntas y reglas

Objetivo: que `/project/questions/` lea el esquema 4 de `delivery/business-questions.json` de POS Platform. La vista debe mostrar quién decide cada pregunta y a quién se consulta, filtrar por rol del catálogo y conservar las preguntas unidas a otra, con su ancla, su texto y un enlace a la pregunta donde se deciden. Issue: https://github.com/developer-implementos/pos-platform/issues/339 (TASK-339). Responsable: @floxcristian.

La unidad completa está en la ficha del producto `odd/tasks/business-questions-unification.md`, en la rama `work/task-339-unificar-preguntas`. Esa ficha cubre la revisión de las respuestas y recomendaciones, las uniones y el esquema 4 con su validador. Esta ficha cubre el corte de POS Docs, que no cierra la issue del producto ni acredita aceptación.

Rama: `work/task-339-questions-reader` desde `43f2554`. Entrega: `stacked-to-main`. Esta PR se integra **antes** que el esquema 4 del producto, porque la importación valida el registro con este lector.

Pruebas: `questions:test`, `project:test`, `portal:test`, `validate`, `typecheck`, `build`, `project:check`, `portal:check`, `editorial:check`, `editorial:test`, `odd:check` y `odd:test`.

Espejo Engram: pendiente. El servidor MCP no conectó en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. «respecto a quien decide tu pon lo que creas mejor, nosotros iremos corrgiendo eso con prompts en el camino»: la vista nombra los roles desde el catálogo del registro:
  - cada pregunta muestra **Quién decide**, un solo rol, y **Se consulta a**, los roles consultados cuando los hay;
  - el filtro «Quién decide» selecciona por la clave estable del rol y muestra su nombre, y ofrece sólo los roles que deciden alguna pregunta;
  - el esquema 3 se presenta con el mismo modelo: su texto de quién decide es el rol, sin roles consultados.
- S2. «respecto al segundo punto hazlo como tu creas que es mejor. como piense que sea la forma enterprise-grade, sin parches y como lo harian las bigtechs»: una pregunta unida a otra no se pierde:
  - aparece al final, en «Preguntas unidas a otra», con su código, su texto original, el motivo, la fecha y un enlace a la pregunta donde se decide, de modo que un enlace a su ancla sigue resolviendo;
  - no cuenta como registro, los filtros no la seleccionan y el resumen la enlaza;
  - una regla no puede enlazarla.
- S3. El importador y el build aplican las reglas del validador del esquema 4 del producto, con los mismos mensajes:
  - roles únicos, con clave y nombre;
  - `decider` y `consulted` tomados del catálogo, sin repetir el rol que decide;
  - una pregunta unida con un código que no se reutiliza y que apunta a una pregunta del registro revisada en la fecha de la unión o después.

  Aceptan el esquema 3 sólo mientras el producto migra; el 3 se retira después de importar el 4 desde `main`.

## Tasks

- [x] T1 · S1,S2,S3 · route:inline · Lector de los esquemas 3 y 4, catálogo de roles, roles consultados, preguntas unidas, tarjeta, filtro, resumen, estilos, pruebas y `docs/project-progress.md` · status:done · evidence: las pruebas del esquema 4 se escribieron después del lector, así que no hay un RED registrado; GREEN `questions:test` 20/20, importador 8/8, `project:test`, `portal:test` 210/210, `validate`, `typecheck`, `build`, `project:check`, `portal:check` y `editorial:check` aprobados sobre el corte vigente del esquema 3
- [ ] T2 · S1,S2 · route:inline · Importar localmente la rama del producto con el esquema 4 y revisar la vista con los datos reales · status:pending · evidence: espera la rama del producto con el esquema 4
- [ ] T3 · S3 · route:inline · Importar el corte del producto en `main` con el esquema 4 y retirar el esquema 3 del lector · status:pending · evidence: espera que el producto integre el esquema 4 en `main`

## Log

- L1 · 2026-11-12 · Solicitud original, literal:

> haz un analisis profundo, ve que deberias unificar. vuelve a analizas las respuestas legacy y las recomendaciones, deja lo de seguridad de lado por ahora

- L2 · 2026-11-12 · La revisión encontró 52 formas distintas de nombrar a quien decide en las preguntas, y 6 más en las reglas. Por eso el filtro «Quién decide» ofrecía 52 opciones. Sobre quién decide, el responsable respondió: «tu pon lo que creas mejor, nosotros iremos corrgiendo eso con prompts en el camino». Sobre cómo unir preguntas: «hazlo como tu creas que es mejor».
- L3 · 2026-11-12 · Se descartó borrar las preguntas absorbidas, porque las páginas públicas enlazan las preguntas por ancla, como `/project/questions/#q-53`, y se perdería lo que preguntaban. Una pregunta unida queda en una tabla aparte del registro, como un «cerrado por duplicado», y no como un estado más. Así los recuentos, los filtros y la decisión de las reglas no necesitan excepciones.
- L4 · 2026-11-12 · El lector acepta los esquemas 3 y 4 (expansión) para que la importación no falle cuando el producto publique el 4; el 3 se retira después (contracción), como exige `delivery/README.md` del producto.
