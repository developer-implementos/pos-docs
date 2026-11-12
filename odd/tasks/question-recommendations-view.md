# Recomendación multipaís en la vista de preguntas y reglas

Objetivo: que `/project/questions/` muestre, junto a la respuesta legacy, la recomendación del equipo para un POS corporativo multipaís que registra POS Platform en el esquema 2 de `delivery/business-questions.json`. Issue: https://github.com/developer-implementos/pos-platform/issues/314 (TASK-314). Responsable: @floxcristian.
La unidad completa está en la ficha del producto `odd/tasks/business-question-recommendations.md` (rama `work/task-314-question-recommendations`), con el esquema, el validador y el primer lote de recomendaciones. Esta ficha cubre el corte de POS Docs, que no cierra la issue del producto ni acredita aceptación.
Rama: `floxcristian/docs-agregar-recomendacion-preguntas` desde `6445852`. Entrega: `stacked-to-main`; esta PR se integra **antes** que el esquema 2 del producto, porque la importación automática valida el registro con este lector.
Pruebas: `questions:test`, `project:test`, `portal:test`, `build`, `project:check`, `editorial:check`, `editorial:test`, `odd:check` y `odd:test`.
Espejo Engram: pendiente. El servidor MCP no conectó en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. «algo que diga lo que recomienda la ia o lo que recomnedamos o nose, para un POS corporativo multipais»: cada tarjeta de una regla o decisión muestra su recomendación con:
  - la regla propuesta;
  - el ámbito: núcleo común, o configurable por país, sociedad, sucursal o caja;
  - el valor por defecto;
  - el motivo y el fundamento, con la nota de confirmación fiscal o legal cuando se basa en una norma;
  - las referencias y fuentes, fijadas a la revisión importada;
  - la autoría (borrador de agente o persona) y el respaldo.

  Un hecho no muestra recomendación, y una regla sin recomendación lo indica.
- S2. «de esa manera nos ayudaria en la respuesta o elecccion de reglas»: el resumen cuenta las recomendaciones sin respaldo, las respaldadas y las reglas sin recomendación, con enlaces a la lista filtrada. Los filtros admiten el estado de la recomendación y el ámbito, se guardan en la URL y no tratan un hecho como regla sin recomendación.
- S3. «implementa todo de forma enterprise-grade, sin parches y como lo harian las bigtechs» (Prettier normaliza el doble espacio original después de «parches»):
  - el importador y el build aplican las mismas reglas que el validador del producto, incluido el hash del respaldo, comprobado con un vector compartido;
  - aceptan el esquema 1 sólo mientras el producto migra, y lo muestran sin recomendaciones;
  - la versión 1 se retira después de importar la 2 desde `main`.

## Tasks

- [x] T1 · S1,S2,S3 · route:inline · Lector de los esquemas 1 y 2, reglas replicadas, tarjeta, resumen, filtros, estilos, pruebas y `docs/project-progress.md` · status:done · evidence: RED `questions:test` sin `officialHosts` y 4 fallos de vista y filtro; GREEN `questions:test` 22/22, `project:test` 32/32, importación 6/6
- [x] T2 · S1,S2 · route:inline · Importar localmente la rama del producto y revisar la vista con los datos reales · status:done · evidence: importación local de pos-platform `dd8a6a4` (74 registros, 35 con recomendación; no se versiona el snapshot); `build` y `project:check` aprobados; capturas a 1440 y 390 px revisadas. Corrigió dos defectos: una prueba que suponía un registro sin recomendaciones y el estado de una decisión ya tomada, que se mostraba como pendiente
- [ ] T3 · S3 · route:inline · Retirar el esquema 1 del lector después de importar el 2 desde `main` · status:pending · evidence: pendiente

## Log

- L1 · 2026-11-12 · Solicitud original, literal:

> en pos-docs hay varias preguntas, decisiones, etc. alli tu pones la respuesta en base al legacy. yo creo que falta tambien algo que diga lo que recomienda la ia o lo que recomnedamos o nose, para un POS corporativo multipais. que opinas? de esa manera nos ayudaria en la respuesta o elecccion de reglas.

- L2 · 2026-11-12 · Se propuso agregar la recomendación al mismo registro, con ámbito, fundamento, autoría y respaldo, mostrarla en POS Docs y empezar por las 34 reglas P1 abiertas. La respuesta fue: «si, implementa todo de forma enterprise-grade, sin parches y como lo harian las bigtechs».
- L3 · 2026-11-12 · El lector acepta ambas versiones (expansión) para que la importación automática no falle cuando el producto publique la 2, y la versión 1 se retira después (contracción). Las etiquetas de ámbito usan el vocabulario de la propuesta de arquitectura: núcleo común y configuración por país, sociedad, sucursal y caja.
- L4 · 2026-11-12 · La revisión con el registro real mostró que una decisión ya tomada sin recomendación aparecía «Sin recomendación todavía» y contaba como pendiente. Ahora sólo una regla o decisión pendiente cuenta como sin recomendación; una recomendación registrada sigue visible después de decidir, como historia. La prueba de la tarjeta identifica sus fixtures por contenido, porque la importación automática traerá recomendaciones reales.
