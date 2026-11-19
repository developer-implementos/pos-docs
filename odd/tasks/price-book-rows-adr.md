# ADR del libro de precios en filas

Objetivo: registrar como ADR-26 que el libro de precios activado se guarda con una fila por precio y que la activación registra la validez del conjunto activo y la cobertura por clase de cliente, para que la lectura de venta no lea ni valide el libro completo en cada operación. Issue: https://github.com/developer-implementos/pos-platform/issues/431 (TASK-431). Responsable: floxcristian.
Rama: `work/task-431-adr-libro-precios`. Entrega: una PR editorial en borrador, coordinada con la PR del producto de TASK-431, sin integrar; no cierra la issue del producto ni acredita integración, carga en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Introduce una decisión de arquitectura que cambia el modelo de datos de precios y el protocolo de lectura de la venta.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/price-book-rows.md` registra estado, decisión, qué resuelve, las tablas nuevas, la activación, la lectura de venta, por qué registrar equivale a recalcular, la migración y convivencia, el resultado medido, la relación con otras decisiones, límites y verificación. Aceptación: describe la implementación como en revisión, sin integrar, y no afirma integración, carga en QA, homologación ni aceptación. Checks: revisión contra la ficha `odd/tasks/price-book-rows.md` de la rama del producto.
- S2. La decisión es localizable: fila ADR-26 en `docs/propuesta-arquitectura.md`, entrada `architecture/price-book-rows` en `apps/starlight/content-map.mjs` y en su barra lateral, y el contrato de publicación la enlaza. Aceptación: la página se construye y los enlaces resuelven. Checks: `npm run verify`.
- S3. El contenido es apto para un repositorio público: sin hosts, IP, cuentas, correos reales, credenciales ni valores de despliegue; las cifras son de cargas sintéticas. Checks: revisión del diff completo.
- S5. `docs/decisions/customer-projection-split.md` registra como ADR-27 la proyección de clientes separada de la publicación comercial, con su medición, convivencia con v1, orden de carga y límites. La decisión es localizable igual que el ADR-26 (S2), y el ADR-26 la enlaza desde sus límites. Aceptación: lo describe como en revisión, sin integrar, con cifras de cargas sintéticas. Checks: revisión contra la ficha `odd/tasks/commercial-publication-split.md` del producto y `npm run verify`.
- S4. Cuando la PR del producto se integre en `main`, el ADR-26 pasa a implementado y se importan el contrato y el diccionario con `tools/product-reference/sync.mjs`. Aceptación: la PR editorial declara ese seguimiento.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-26 · status:done · evidence: `docs/decisions/price-book-rows.md`
- [x] T2 · S2 · route:inline · Registrar la decisión y enlazarla desde el contrato de publicación · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, `docs/contracts/master-data-publication.md`
- [ ] T3 · S1,S2,S3 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: pendiente de `npm run verify`.
- [x] T5 · S5,S3 · route:inline · Redactar y registrar el ADR-27 · status:done · evidence: `docs/decisions/customer-projection-split.md` (L3)
- [ ] T4 · S4 · route:inline · Marcar implementado e importar contrato y diccionario cuando TASK-431 se integre · status:pending · evidence: la PR del producto no está integrada.

## Log

- L1 · 2026-11-19 · Solicitud original, literal (indicación de la sesión coordinadora del producto):

> **Decisión de arquitectura:** si el diseño lo amerita, prepara también el borrador del ADR en POS Docs (`developer-implementos/pos-docs`, repo público: sin IP, hosts ni datos reales), sin integrarlo.

- L2 · 2026-11-19 · Fuente técnica: rama `work/task-431-topes-carga` del producto, ficha `odd/tasks/price-book-rows.md`. Decisiones editoriales:
  - Es una decisión nueva (ADR-26) y no solo una nota del contrato de publicación: cambia el modelo de datos del libro de precios, agrega dos verificaciones persistidas y cambia qué lee cada operación de venta.
  - Las cifras son de cargas sintéticas en una estación de trabajo, con PostgreSQL limitado a 2 CPU; el ADR no las presenta como medidas en QA.
  - El formato del archivo, sus topes y la memoria del comando quedan para la decisión de formato de TASK-431; el ADR los declara como límites.
- L3 · 2026-11-19 · El responsable del producto delegó la elección del formato en la recomendación medida, y se agrega el ADR-27 a esta misma PR editorial. Fuente técnica: rama `work/task-431-formato-carga` del producto, ficha `odd/tasks/commercial-publication-split.md`. Decisión editorial: un ADR aparte del ADR-26, porque cambia el contrato del archivo (v2 y una proyección de clientes propia) y la semántica de aplicación de los clientes, mientras el ADR-26 cambia el modelo de lectura.
