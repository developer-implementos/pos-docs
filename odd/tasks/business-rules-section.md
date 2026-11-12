# Sección de reglas de negocio en POS Docs

Objetivo: publicar el catálogo de reglas de negocio de la caja como complemento de «Preguntas y reglas», con la entrada «Reglas de negocio» en la guía. Issue: [TASK-280](https://github.com/developer-implementos/pos-platform/issues/280).
Rama: `work/task-280-reglas-publicas`, desde `e424be1`; reemplaza `work/task-280-reglas-negocio` (#57), cuyo corte publicaba el registro completo. Entrega: `ask-on-risk`; fuente propietaria en POS Platform, `delivery/business-rules.json` de la PR que reemplaza a developer-implementos/pos-platform#282.
Checks: portal, reglas, preguntas, ODD, editorial, contenido, Astro, build y checks de navegador del portal y del proyecto. Espejo Engram pendiente: MCP no disponible.

## Specs

- S1. «entiendes que ahi debe ir un nuevo item que seria reglas de negocio?»: la barra lateral de la guía gana la entrada «Reglas de negocio», que lleva a las dos vistas del tema.
- S2. «ajustemonos a lo que creo cristian. solo complementemos con lo que tenemos»: «Preguntas y reglas» sigue siendo el lugar de las decisiones; el catálogo no guarda decisiones y toma el estado de cada regla de las preguntas publicadas.
- S3. El catálogo se importa desde una revisión identificada del producto, validado con las mismas reglas que el producto, sin credenciales, hosts, IP ni RUT reales.
- S4. POS Docs es público: publica una proyección del registro por lista cerrada de campos, según la clasificación `disclosure` de cada regla. El comportamiento del legacy, su evidencia, las notas, las preguntas candidatas y las propuestas quedan en el producto; una regla interna figura sólo con código, área, entregable y preguntas. El importador falla ante una clasificación incoherente y el build rechaza cualquier otro campo.
- S5. La decisión se deriva en la vista del corte de preguntas de la misma revisión, sólo de preguntas `rule` o `decision`, y la importación automática incluye el snapshot de reglas.

## Tasks

- [x] T1 · S1 · route:inline · Página `/guide/business-rules/` y entrada de la barra lateral · status:done · evidence: apps/starlight/src/content/docs/business-rules.mdx; apps/starlight/content-map.mjs; navigation.test.mjs aprobado
- [x] T2 · S2,S3 · route:inline · Vista `/project/rules/`, importador y pruebas · status:done · evidence: portal/rules.mjs, tools/sync-project-rules.mjs, portal/rules.test.mjs, tools/sync-project-rules.test.mjs
- [ ] T3 · S3 · route:inline · Reimportar desde `main` cuando se integre la PR del producto · status:pending · evidence: el corte actual viene de la rama del producto (`fe228e3`), identificado como previo a la integración
- [x] T4 · S4,S5 · route:inline · Proyección, importador, vista y página reescritos sobre `e424be1` · status:done · evidence: portal/rules.mjs, tools/sync-project-rules.mjs, sus pruebas y portal/project-view.test.mjs; snapshot de 257 KB frente a 1,43 MB
- [x] T5 · S5 · route:inline · Snapshot de reglas en la importación automática · status:done · evidence: tools/project-import/snapshots.mjs y su prueba

## Log

- L1 · 2026-11-11 · Solicitud directa del usuario, con una captura de la barra lateral de la guía:

> entiendes que ahi debe ir un nuevo item que seria reglas de negocio?

- L2 · 2026-11-11 · El usuario detectó que TASK-258 ya publica «Preguntas y reglas» y pidió complementarla. La pestaña del catálogo pasa a «Catálogo de reglas», sin decisión propia, y la página de la guía presenta ambas vistas.
- L3 · 2026-11-12 · El usuario pidió aplicar las recomendaciones de la revisión de #57 con el máximo detalle para los agentes que migran el legacy. Claude Code rehízo la sección en `work/task-280-reglas-publicas` desde `main`, sin los commits de #57, que publicaban en este repositorio público el registro completo con debilidades de seguridad del legacy. El detalle no se recorta: queda en el registro del producto, que los agentes leen con acceso a POS Platform, y aquí se publica un índice. La vista toma la decisión de las preguntas; un hecho no decide. El código de la vista y de la página parte del trabajo de Jesús en #57.
