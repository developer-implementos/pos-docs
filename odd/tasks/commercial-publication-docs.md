# Carga de la publicación comercial desde archivo en POS Docs

Objetivo: registrar en el portal el contrato `commercial-publication-v1` y la puerta de carga `import-commercial` de la sucursal como **en revisión**, distinguiendo lo que concreta de F03-10 de lo que sigue propuesto en F03-02, y actualizar las páginas que describían la cotización sin datos comerciales. Issue: https://github.com/developer-implementos/pos-platform/issues/404 (TASK-404, tarea hija de F03-10). Responsable: floxcristian.
Rama: `work/task-404-carga-comercial`. Entrega: una PR editorial coordinada con la PR del producto (pos-platform#417, borrador sin integrar); no cierra la issue del producto ni acredita integración, despliegue en QA, homologación ni aceptación comercial.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Registra un contrato nuevo del producto y cambia el comportamiento descrito de la cotización y del ambiente QA.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/contracts/master-data-publication.md` agrega la sección «Carga desde archivo en la sucursal»: estado en revisión, comando, contrato `commercial-publication-v1`, los tres pasos de F03-10 con su resultado ante un fallo, idempotencia, precio de venta frente al piso, y las diferencias con el diseño (sin transporte ni cursores, activación por reemplazo, sin retención, política aprovisionada). Aceptación: enlaza las fuentes del producto fijadas a `bc06758274d95abae8f0f640c8904eff14f8b0cb` sin copiar el esquema ni sus límites; no afirma integración, despliegue ni homologación. Checks: contraste con la ficha `odd/tasks/commercial-publication-import.md`, `commercial-publication.ts`, la sección 4 de `tools/database/README.operational.md` y `tools/deploy/README.md` del producto en esa revisión.
- S2. Las páginas que describían la cotización sin datos comerciales enlazan la sección: ADR-22 (datos de QA), guía F02 (activación del puesto) y el recorrido de precios. Aceptación: distinguen el estado de `main` del cambio en revisión y los enlaces resuelven. Checks: `validate`, `typecheck`, `build`, `check`.
- S3. Referencia de APIs y diccionario de datos: no se importa un artefacto de una rama sin integrar. La puerta no agrega rutas HTTP; las tablas `catalog.commercial_publication`, `catalog.commercial_staging` y `pricing.price_book_candidate` se importarán desde `main` cuando TASK-404 se integre. Aceptación: la PR lo declara pendiente. Checks: revisión del diff.
- S4. Derivados: el deck de arquitectura revisa sus fuentes porque `master-data-publication.md` es una de ellas, y el ZIP de Excalidraw se regenera porque empaqueta `docs/*.md`, `docs/decisions/*.md` y `docs/contracts/*.md`. Checks: `presentations:check`, `diagrams:test`.
- S5. El contenido es apto para un repositorio público: sin hosts, IP, cuentas, credenciales, datos de clientes ni valores de despliegue. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S5 · route:inline · Redactar la sección del contrato de publicación · status:done · evidence: `docs/contracts/master-data-publication.md`
- [x] T2 · S2 · route:inline · Enlazar la sección desde ADR-22, la guía F02 y el recorrido de precios · status:done · evidence: `docs/decisions/environments.md`, `docs/phase-2-payments-documents.md`, `docs/flows/pricing.md`
- [x] T3 · S2,S4,S5 · route:inline · Regenerar derivados, ejecutar las comprobaciones y abrir la PR · status:done · evidence: `b53608c`, L3
- [ ] T4 · S3 · route:inline · Importar el diccionario de datos desde `main` cuando TASK-404 se integre · status:blocked · evidence: pendiente de la integración de pos-platform#417
- [x] T5 · S1,S4 · route:inline · Corregir la activación y fijar los enlaces a la cabeza nueva de pos-platform#417 · status:done · evidence: L4

## Log

- L1 · 2026-11-18 · Solicitud original, literal (respuesta a «¿Sigo con la carga comercial (#404) para que se pueda vender en QA?»):

> si. continua con ello

Encargo de la sesión coordinadora a esta sesión: preparar y abrir, sin integrar, la PR editorial coordinada de TASK-404 en POS Docs, registrando el contrato y la puerta de carga como en revisión y sin importar la referencia de APIs ni el diccionario de datos de una rama sin integrar.

- L2 · 2026-11-18 · Fuente técnica: rama `work/task-404-carga-comercial` del producto en `a2f6b4a2afa786549eaa9686fb14fb0d1dcb84f1` (pos-platform#417, borrador). Decisiones editoriales:
  - Una sección en el contrato de publicación y no una página nueva: el contrato del archivo pertenece al producto, que ya mantiene su esquema, límites, ejemplo y guía operativa; una página propia repetiría esa tabla. El contrato de publicación es la página canónica de la activación en sucursal y ya enlaza F03-02.
  - No es un ADR: concreta operaciones ya propuestas en F03-10. La activación por reemplazo de proyecciones en lugar de un puntero sobre tablas versionadas es una decisión de diseño del producto (L2 de su ficha) que se publica como diferencia pendiente de revisión, no como decisión aprobada.
  - El roadmap (`docs/roadmap.json`) no cambia y la vista de Archify `/explore/commercial-version/` sigue describiendo la propuesta.
- L3 · 2026-11-18 · Sobre `b53608c`, con Node 22.23.3:
  - `npm run verify` completo en verde, incluidos `odd:check`, `editorial:check`, `editorial:test` 28/28, `diagrams:test` 7/7, `validate`, `typecheck`, `build`, `check` (24 768 enlaces, sin errores), `presentations:check` y `project:check`.
  - El deck de arquitectura no describe la carga en sucursal; su texto sigue correcto y `sources.json` se refrescó con `presentations/tools/review-sources.mjs`. El ZIP de Excalidraw se regeneró con `tools/diagrams/package-excalidraw.py`.
  - Con el cuerpo de la PR: `pr-check` valida la declaración (offline, sin consultar la issue) y `journeys-check` encuentra las 4 rutas en `dist`.
  - Revisión de agente; falta la revisión humana.
- L4 · 2026-11-18 · El producto cambió después de abrir pos-docs#129: la cabeza de pos-platform#417 es `bc06758274d95abae8f0f640c8904eff14f8b0cb` (`d8f5bb1` y `bc06758`; S4, L5 y L6 de su ficha y el párrafo final de la sección 4 de `tools/database/README.operational.md`). Dos frases de la sección quedaron falsas: la activación ya no corre entera bajo el bloqueo de las lecturas de venta. Ahora un bloqueo propio de activación ordena a los activadores, y las lecturas esperan solo el tramo final (base, puntero, libro de precios y postcondición). Se corrigen la fila «Activar» y el punto «Activación por reemplazo», sin copiar las cifras medidas, que se enlazan a la guía del producto. Dos cargas simultáneas del mismo archivo terminan en `activated` y `recovered`. Todos los enlaces al producto y la S1 se fijan a `bc06758`; L2 conserva la revisión con la que se abrió la PR.
- L5 · 2026-11-18 · Sobre `5413457`, con Node 22.23.3: `npm run verify` completo en verde, incluidos `odd:check`, `editorial:check`, `editorial:test` 28/28, `diagrams:test` 7/7, `validate`, `typecheck`, `build`, `check` (24 768 enlaces, sin errores), `presentations:check` y `project:check`. El ZIP de Excalidraw se regeneró y `sources.json` se refrescó con `presentations/tools/review-sources.mjs`; el texto del deck sigue correcto. Con el cuerpo actualizado de pos-docs#129, `pr-check` valida la declaración y `journeys-check` encuentra las 4 rutas en `dist`. Revisión de agente; falta la revisión humana.
