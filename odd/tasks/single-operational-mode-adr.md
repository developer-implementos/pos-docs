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

## Tasks

- [x] T1 · S1,S4 · route:inline · Redactar el ADR-25 · status:done · evidence: `docs/decisions/single-operational-mode.md`
- [x] T2 · S2 · route:inline · Registrar la decisión y enlazarla desde el ADR-22 · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, `docs/decisions/environments.md`
- [ ] T3 · S1,S2,S4 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: pendiente
- [ ] T4 · S3 · route:inline · Actualizar las guías que describen el laboratorio y la demo e importar contrato y diccionario cuando TASK-406 se integre · status:blocked · evidence: pendiente de la integración de las PR del producto

## Log

- L1 · 2026-11-18 · Solicitud original de la issue del producto, literal según su ficha:

> no entiendo eso de los perfiles. ya no deberia existir laboratorio yo creo. deberia funcionar con datos en db o quizas un hibrido. o quizas datos mock en db. total sera qa el ambiente. operacional me imagino que es como un backoffice. eso deberia estar en la misma app de caja pero ingresando con un perfil como admin u otro. los ambientes que usaremos seran solo qa y prod.

> continua con todo lo pendiente de forma enterprise-grade, sin parches y como lo harian las bigtechs

- L2 · 2026-11-18 · Fuente técnica: rama `work/task-406-retirar-laboratorio` del producto, explorada sobre `1bd312c`. Decisiones editoriales:
  - Es una decisión nueva (ADR-25) y no solo una actualización del ADR-22: además de retirar el código de dos modos, cambia qué capacidades admite el modo operativo y fija cómo se preparan los datos de prueba. El ADR-22 la enlaza.
  - El catálogo único de capacidades se describe como «soportar no es habilitar»: el producto no cambia el comportamiento de QA ni producción mientras su activación no incluya las capacidades nuevas.
  - El inventario detallado de recorridos y la cobertura antes y después viven en la ficha del producto; el ADR los resume y la enlaza.
  - Las guías que describen el laboratorio y la demo (F01, pruebas, API, escritorio y móvil) siguen siendo ciertas para `main` hasta la integración; se actualizan en otra PR editorial (S3).
