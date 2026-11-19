# ADR del modo único de operación

Objetivo: registrar como ADR-25 el retiro del perfil de laboratorio, del modo `branch-lab` y de la demo, el catálogo único de capacidades, cómo se prueban los recorridos por las puertas oficiales, el destino de las claves de almacenamiento de la demo, las migraciones nuevas y el ambiente local operativo. Issue: https://github.com/developer-implementos/pos-platform/issues/406 (TASK-406). Responsable: floxcristian.
Rama: `work/task-406-retirar-laboratorio`. Entrega: una PR editorial coordinada con las PR encadenadas del producto de TASK-406, en revisión; no cierra la issue del producto ni acredita integración, despliegue en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Introduce una decisión de arquitectura que retira dos modos de ejecución, cambia qué capacidades admite el modo operativo y cómo se preparan las pruebas.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/single-operational-mode.md` registra estado, decisión, qué resuelve, el modo único de servidor, el catálogo único de capacidades, cómo se prueban los recorridos, los clientes, datos y esquema, el ambiente local, la relación con otras decisiones, límites y verificación. Aceptación: describe la implementación como en revisión, sin integrar; no afirma integración, despliegue en QA, homologación ni aceptación. Checks: revisión contra la ficha `odd/tasks/retire-laboratory-demo.md` de la rama del producto.
- S2. La decisión es localizable: fila ADR-25 en `docs/propuesta-arquitectura.md`, entrada `architecture/single-operational-mode` en `apps/starlight/content-map.mjs` y su barra lateral, y el ADR-22 la enlaza. Aceptación: la página se construye y los enlaces resuelven. Checks: `npm run verify`.
- S3. Las páginas que describen el laboratorio y la demo como estado actual de `main` (guía F01, guía de pruebas, API, escritorio y móvil) se actualizan cuando el producto se integre, no antes. Aceptación: la PR declara ese seguimiento.
- S4. El contenido es apto para un repositorio público: sin hosts, IP, cuentas, correos reales, credenciales ni valores de despliegue. Checks: revisión del diff completo.
- S5. Tras la integración de TASK-406 en `main` del producto, las guías que describían el laboratorio, `branch-lab`, la demo, `seed` o `/auth/lab/login` como vigentes describen el modo único y el ambiente local preparado igual que QA, y enlazan el ADR-25; lo histórico (ADR anteriores, notas de versión, evidencia fechada) se conserva sin reescribir. El ADR-25 pasa a implementado. Aceptación: ninguna guía vigente presenta esos modos como disponibles en `main`, y no se describen capacidades que el producto no implemente. Checks: búsqueda en `docs/` y `apps/starlight`, contraste con la revisión `b170bf1` del producto, `npm run verify`.
- S6. La referencia del producto (contrato HTTP y esquema) se importa desde `main` con `tools/product-reference/sync.mjs` y el artefacto `documentation-contracts` de la corrida verde más reciente de `Validate POS Platform`, y el diff se revisa por `operationId` y por tabla, con cada salida explicada. Checks: salida de `sync.mjs`, comparación semántica, `npm run verify`.

## Tasks

- [x] T1 · S1,S4 · route:inline · Redactar el ADR-25 · status:done · evidence: `docs/decisions/single-operational-mode.md`
- [x] T2 · S2 · route:inline · Registrar la decisión y enlazarla desde el ADR-22 · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, `docs/decisions/environments.md`
- [x] T3 · S1,S2,S4 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:done · evidence: `c1e7fbe`, pos-docs#133 (L3)
- [x] T4 · S3,S5,S6 · route:inline · Actualizar las guías que describen el laboratorio y la demo e importar contrato y diccionario cuando TASK-406 se integre · status:done · evidence: rama `work/task-406-guias-y-referencia` (L5, L6)

## Log

- L1 · 2026-11-18 · Solicitud original de la issue del producto, literal según su ficha:

> no entiendo eso de los perfiles. ya no deberia existir laboratorio yo creo. deberia funcionar con datos en db o quizas un hibrido. o quizas datos mock en db. total sera qa el ambiente. operacional me imagino que es como un backoffice. eso deberia estar en la misma app de caja pero ingresando con un perfil como admin u otro. los ambientes que usaremos seran solo qa y prod.

> continua con todo lo pendiente de forma enterprise-grade, sin parches y como lo harian las bigtechs

- L2 · 2026-11-18 · Fuente técnica: rama `work/task-406-retirar-laboratorio` del producto, explorada sobre `1bd312c`. Decisiones editoriales:
  - Es una decisión nueva (ADR-25) y no solo una actualización del ADR-22: además de retirar el código de dos modos, cambia qué capacidades admite el modo operativo y fija cómo se preparan los datos de prueba. El ADR-22 la enlaza.
  - El catálogo único de capacidades se describe como «soportar no es habilitar»: el producto no cambia el comportamiento de QA ni producción mientras su activación no incluya las capacidades nuevas.
  - El inventario detallado de recorridos y la cobertura antes y después viven en la ficha del producto; el ADR los resume y la enlaza.
  - Las guías que describen el laboratorio y la demo (F01, pruebas, API, escritorio y móvil) siguen siendo ciertas para `main` hasta la integración; se actualizan en otra PR editorial (S3).
- L3 · 2026-11-18 · Evidencia local con Node 22.23.3: el primer `npm run verify`, sobre el árbol sin commit, falló solo porque el build exige revisar el deck después de cambiar `docs/propuesta-arquitectura.md`; tras confirmar `2ce96b9`, `presentations/tools/review-sources.mjs` refrescó `sources.json` en `c1e7fbe` y `npm run verify` completo pasó sobre ese commit. El ZIP de Excalidraw se regeneró con `tools/diagrams/package-excalidraw.py`. PR [pos-docs#133](https://github.com/developer-implementos/pos-docs/pull/133) abierta. Revisión de agente; falta la revisión humana.
- L4 · 2026-11-18 · El ADR-25 enlaza las cuatro PR encadenadas del producto, todas abiertas y sin integrar (pos-platform#420, #421, #422 y #423), y resume su evidencia local sin atribuir integración, despliegue ni aceptación. El ZIP de Excalidraw se regeneró porque cambió `docs/decisions/`. Revisión de agente; falta la revisión humana.
- L5 · 2026-11-18 · TASK-406 quedó integrada en `main` del producto (#420, #421, #422 y #423 hasta `fe8f52e`; después entraron #425 de TASK-424 y #427 de TASK-426). Guías contrastadas con `b170bf1`, sobre la ficha `odd/tasks/retire-laboratory-demo.md`, el README, `tools/local`, `tests/pos-clients-e2e/README.md`, `client-profile.ts` y la configuración de `branch-api`. Decisiones editoriales:
  - Se reescriben como vigentes F01, API, repositorio, monorepo, pruebas, seguridad, arquitectura, escritorio, móvil, inicio de tarea y base técnica, más las menciones de estado en C4, opciones tecnológicas, propuesta, F02, identidad y el catálogo del monorepo. Las anclas retiradas de F01, del repositorio y de seguridad se conservan con `<span id>`.
  - El archivo de perfil del cliente ya no lleva `registerId` ni `installationId` (TASK-412) y HTTP no se admite ni en loopback: la guía F01 lo describe así.
  - `mock-api.md` conserva su ruta como registro histórico, con un aviso de retiro y la revisión `d824646`, la última con la demo.
  - Se conservan sin reescribir los ADR anteriores, las revisiones fechadas (calidad del 3 de octubre, inventario de Chile), la evidencia del instalador `corporate-pos-windows-demo`, `roadmap.json` (sus criterios pertenecen al backlog del producto) y los «laboratorios» didácticos del portal, que no son el perfil retirado.
  - Quedan fuera los diagramas C4 cuya nota dice «F01 operativo/laboratorio» (modelo `tools/diagrams/models/c4-data.js` con sus layouts, escenas y Mermaid) y la incorporación de `pos-web` al catálogo de aplicaciones (TASK-403): ambos exigen regenerar diagramas y tienen alcance propio.
  - La evidencia del código (`product-evidence.json`) pasa de `3929549` a `b170bf1`, porque las páginas de implementación declaran la revisión que describen.
