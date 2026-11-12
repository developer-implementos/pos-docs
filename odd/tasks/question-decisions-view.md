# Decisión final en la vista de preguntas y reglas

Objetivo: que `/project/questions/` muestre la decisión final de negocio que registra POS Platform en el esquema 3 de `delivery/business-questions.json`, y que la recomendación aparezca como aporte del agente, sin aprobaciones. Issue: https://github.com/developer-implementos/pos-platform/issues/333 (TASK-333). Responsable: @floxcristian.
La unidad completa está en la ficha del producto `odd/tasks/business-question-decisions.md` (rama `work/task-333-business-decisions`): el esquema 3, su validador, la migración del registro y el procedimiento con que un agente registra las decisiones. Esta ficha cubre el corte de POS Docs, que no cierra la issue del producto ni acredita aceptación.
Rama: `work/task-333-decision-reader` desde `e424be1`. Entrega: `stacked-to-main`; esta PR se integra **antes** que el esquema 3 del producto, porque la importación valida el registro con este lector.
Pruebas: `questions:test`, `project:test`, `portal:test`, `build`, `project:check`, `editorial:check`, `editorial:test`, `odd:check` y `odd:test`.
Espejo Engram: pendiente. El servidor MCP no conectó en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. «las recomdanciones son del agente con llm. nadie debe aprobar nada»: la recomendación se presenta como aporte del agente:
  - el bloque se titula «Recomendación del agente (IA)» y termina con «Generada por» el agente y la fecha;
  - no hay respaldo ni validación, ni recuentos o filtros que los usen;
  - la recomendación no cambia el estado de la regla y sigue visible después de la decisión.
- S2. «la decision final las pasaremos en un documento y alli deberas agregar un nuevo campo supongo»: la tarjeta de una regla decidida muestra primero su decisión:
  - la regla decidida, el rol u órgano que decidió y la fecha;
  - el documento de origen, citado por nombre y fecha y sin enlace, porque «el documento no se subira»;
  - si la decisión adopta, ajusta o descarta la recomendación; no indica nada cuando no había recomendación o la decisión es anterior a ella.

  El resumen cuenta las preguntas abiertas, respondidas y decididas, con enlaces a la lista filtrada, y lo que las decisiones hicieron con las recomendaciones. El filtro de estado usa esos tres estados, y la tabla de hechos y reglas indica quién decidió y cuándo, o que la decisión está pendiente.
- S3. «implementa todo de forma enterprise-grade, sin parches y como lo harian las bigtechs» (Prettier normaliza el doble espacio original después de «parches»):
  - el importador y el build aplican las reglas del validador del esquema 3 del producto, con los mismos mensajes;
  - aceptan el esquema 2 sólo mientras el producto migra, y lo presentan con el modelo del 3;
  - la versión 2 se retira después de importar la 3 desde `main`.

## Tasks

- [x] T1 · S1,S2,S3 · route:delegated · Lector de los esquemas 2 y 3, reglas replicadas del esquema 3, tarjeta con la decisión, resumen, filtros, estilos, pruebas y `docs/project-progress.md` · status:done · evidence: RED con el lector del esquema 2 en `questions:test` y `project:test`; GREEN `questions:test` 27/27 con la importación, `project:test` 35/35, `portal:test`, `build` y `project:check` (commits `f3b67d5`, `97cf85d` y `5eae8ff`)
- [x] T2 · S1,S2 · route:inline · Importar localmente la rama del producto con el esquema 3 y revisar la vista con los datos reales · status:done · evidence: importación local de pos-platform `b1492f5` (esquema 3: 74 registros, 64 abiertos y 64 pendientes de decisión; no se versiona el snapshot); `build` y `project:check` aprobados; capturas a 1440 y 390 px revisadas, sin errores de página. La decisión de Q-05 aparece antes de la respuesta actual, la recomendación de Q-01 termina con «Generada por Claude Code · TASK-314», el hecho Q-10 no muestra decisión ni recomendación, y los filtros dejan 64 abiertas, 5 respondidas y 5 decididas
- [ ] T3 · S3 · route:inline · Importar el corte del producto en `main` con el esquema 3 y retirar el esquema 2 del lector · status:pending · evidence: pendiente

## Log

- L1 · 2026-11-12 · Solicitud original, literal:

> las recomdanciones son del agente con llm. nadie debe aprobar nada. la decision final las pasaremos en un documento y alli deberas agregar un nuevo campo supongo.

- L2 · 2026-11-12 · Se preguntó si la decisión del documento reemplaza la validación del responsable de negocio, y la respuesta fue «Sí, la reemplaza (Recomendado)». Sobre cómo citar el documento: «el documento no se subira. le pedire a un agente que actualice la documentacion pasandole el documento». Por eso la decisión cita su documento por nombre y fecha, sin enlace.
- L3 · 2026-11-12 · El lector acepta los esquemas 2 y 3 (expansión) para que la importación no falle cuando el producto publique el 3, y el 2 se retira después (contracción). El esquema 2 se presenta con el modelo del 3: el tipo `decision` se lee como regla, `validation` y el respaldo se descartan, el agente se toma del autor y no hay bloque de decisión.
- L4 · 2026-11-12 · El producto y POS Docs interpretaron distinto `outcome` con recomendación: el producto lo exigía siempre y POS Docs lo admitía nulo. Ambos validadores quedan con la misma regla: `outcome` es nulo si no hubo recomendación o si la decisión es anterior a ella, y obligatorio en los demás casos (`5eae8ff`). El importador informa además cuántas reglas esperan decisión.
- L5 · 2026-11-12 · Paridad comprobada con 27 registros mutados que pasan por ambos validadores: 26 coinciden en aceptar o rechazar y en el primer renglón del mensaje. La diferencia restante es la prevista durante la transición, porque POS Docs todavía lee el esquema 2.
- L6 · 2026-11-12 · Dos PR abiertas de otra sesión leen este registro: pos-platform #334 y pos-docs #86. Las dos dan por resuelta una regla cuando todas sus preguntas que no son hechos están `decided` o `validated`. Con el esquema 3 eso sigue funcionando, porque `validated` ya no aparece. pos-docs #86 cambia los mismos archivos de la vista: quien se integre después resuelve esos conflictos.
- L7 · 2026-11-12 · La revisión con el registro real del esquema 3 no encontró defectos. Las cinco decisiones reales no tienen `outcome`, porque se tomaron en las fichas sin una recomendación previa. Las etiquetas de resultado (adopta, ajusta, descarta) se comprueban sólo con las pruebas de la vista, hasta que llegue la primera decisión del documento de negocio.
