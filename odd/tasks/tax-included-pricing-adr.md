# ADR de precios con impuesto incluido

Objetivo: registrar como ADR-28 que cada país declara en su publicación comercial si sus precios incluyen el impuesto, y que con impuesto incluido la cotización cobra lo que suman las líneas, como la caja legacy de Chile, y obtiene de ese total el neto y el impuesto. Issue: https://github.com/developer-implementos/pos-platform/issues/445 (TASK-445). Responsable: floxcristian.
Rama: `work/task-445-precios-impuesto-incluido`. Entrega: una PR editorial coordinada con la PR del producto de TASK-445, sin integrar; no cierra la issue del producto ni acredita integración, carga en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Registra una decisión de arquitectura que cambia el contrato de la publicación comercial y el cálculo de la cotización.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/tax-included-pricing.md` registra estado, decisión, qué resuelve, la regla de la caja legacy de Chile con su evidencia por archivo y línea, el cálculo, los contratos, los motivos, qué cambia para otros países, la convivencia de versiones y la reversión, la relación con otras decisiones, límites y verificación. Aceptación: describe la implementación como en revisión, sin integrar, y no afirma carga en QA, homologación ni aceptación. Checks: revisión contra la ficha `odd/tasks/tax-included-pricing.md` de la rama del producto.
- S2. La decisión es localizable: fila ADR-28 en `docs/propuesta-arquitectura.md`, entrada `architecture/tax-included-pricing` en `apps/starlight/content-map.mjs` y en su barra lateral, y el contrato de publicación la enlaza desde la lista de precios. Aceptación: la página se construye y los enlaces resuelven. Checks: `npm run verify`.
- S3. El contenido es apto para un repositorio público: sin hosts, IP, cuentas, correos reales, credenciales ni valores de despliegue; sin código del legacy, solo rutas y líneas como evidencia; sin la clase de ninguna debilidad de seguridad del legacy. Checks: revisión del diff completo.
- S4. Cuando la PR del producto se integre en `main`, el ADR-28 pasa a implementado y se importan el contrato y el diccionario con `tools/product-reference/sync.mjs`. Aceptación: la PR editorial declara ese seguimiento.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-28 · status:done · evidence: `docs/decisions/tax-included-pricing.md`
- [x] T2 · S2 · route:inline · Registrar la decisión y enlazarla desde el contrato de publicación · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, `docs/contracts/master-data-publication.md`
- [ ] T3 · S1,S2,S3 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: pendiente de `npm run verify`.
- [ ] T4 · S4 · route:inline · Marcar implementado e importar contrato y diccionario cuando TASK-445 se integre · status:pending · evidence: la PR del producto no está integrada.

## Log

- L1 · 2026-11-19 · Solicitud original, literal (pedido de la sesión coordinadora del producto, en su parte editorial):

> **Decisión en POS Docs.** Un ADR nuevo en `pos-docs`, siguiendo las reglas de ese repo (lee su README y CONTRIBUTING). POS Docs es **público**: nada de IP, hosts, cuentas, correos reales ni volúmenes internos exactos. Los ejemplos van con example.com o example.test. Una página nueva en `docs/` exige regenerar el ZIP con `python tools/diagrams/package-excalidraw.py`. Si cambias una página canónica que cita el deck, actualiza `presentations/architecture/sources.json`. Verifica con `npm ci` en `apps/starlight` y `npm run verify`.

- L2 · 2026-11-19 · Fuente técnica: rama `work/task-445-redondeo-legacy` del producto, ficha `odd/tasks/tax-included-pricing.md` (L2 regla del legacy, L3 decisión). Decisiones editoriales:
  - Es una decisión nueva (ADR-28) y no solo una nota del contrato de publicación: cambia el contrato de la lista de precios, el cálculo de la cotización y su contrato, y fija una regla que cada país declara.
  - La regla del legacy se publica con rutas y líneas como evidencia, sin copiar código y sin describir cómo el backend legacy valida lo que recibe de la caja.
  - Las cifras son de barridos sintéticos (brutos de 1 a 300 000) y de tres precios sondeados, sin productos, sucursales ni volúmenes del QA.
  - Por pedido de la sesión coordinadora se agrega la convivencia de versiones: los clientes validan la cotización con objetos estrictos, así que primero se despliegan `branch-api` y los clientes, y después se activa un libro con impuesto incluido.
