# Sección de reglas de negocio en POS Docs

Objetivo: publicar el catálogo de reglas de negocio de la caja como complemento de «Preguntas y reglas», con la entrada «Reglas de negocio» en la guía. Issue: [TASK-280](https://github.com/developer-implementos/pos-platform/issues/280).
Rama: `work/task-280-reglas-negocio`, desde `84a578b`. Entrega: `ask-on-risk`; fuente propietaria en POS Platform, `delivery/business-rules.json` de la PR developer-implementos/pos-platform#282.
Checks: portal, reglas, preguntas, ODD, editorial, contenido, Astro, build y checks de navegador del portal y del proyecto. Espejo Engram pendiente: MCP no disponible.

## Specs

- S1. «entiendes que ahi debe ir un nuevo item que seria reglas de negocio?»: la barra lateral de la guía gana la entrada «Reglas de negocio», que lleva a las dos vistas del tema.
- S2. «ajustemonos a lo que creo cristian. solo complementemos con lo que tenemos»: «Preguntas y reglas» sigue siendo el lugar de las decisiones; el catálogo no guarda decisiones y toma el estado de cada regla de las preguntas publicadas.
- S3. El catálogo se importa desde una revisión identificada del producto, validado con las mismas reglas que el producto, sin credenciales, hosts, IP ni RUT reales.

## Tasks

- [x] T1 · S1 · route:inline · Página `/guide/business-rules/` y entrada de la barra lateral · status:done · evidence: apps/starlight/src/content/docs/business-rules.mdx; apps/starlight/content-map.mjs; navigation.test.mjs aprobado
- [x] T2 · S2,S3 · route:inline · Vista `/project/rules/`, importador y pruebas · status:done · evidence: portal/rules.mjs, tools/sync-project-rules.mjs, portal/rules.test.mjs, tools/sync-project-rules.test.mjs
- [ ] T3 · S3 · route:inline · Reimportar desde `main` cuando se integre la PR del producto · status:pending · evidence: pendiente de la integración de developer-implementos/pos-platform#282

## Log

- L1 · 2026-11-11 · Solicitud directa del usuario, con una captura de la barra lateral de la guía:

> entiendes que ahi debe ir un nuevo item que seria reglas de negocio?

- L2 · 2026-11-11 · El usuario detectó que TASK-258 ya publica «Preguntas y reglas» y pidió complementarla. La pestaña del catálogo pasa a «Catálogo de reglas», sin decisión propia, y la página de la guía presenta ambas vistas.
