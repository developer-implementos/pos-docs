# ADR del ingreso con correo y los códigos de activación

Objetivo: registrar como ADR-24 el correo como identificador de ingreso, el origen `local` o `erp` de la cuenta con la referencia opcional al trabajador, los códigos de activación de un solo uso, el administrador inicial por aprovisionamiento y la recuperación de emergencia, y actualizar las páginas que describían el ingreso con usuario y el estado de TASK-412. Issue: https://github.com/developer-implementos/pos-platform/issues/416 (TASK-416). Responsable: floxcristian.
Rama: `work/task-416-correo-codigos`. Entrega: una PR editorial coordinada con la PR del producto de TASK-416, en revisión; no cierra la issue del producto ni acredita integración, despliegue en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Introduce una decisión de arquitectura sobre la identidad de los operadores y la activación de equipos, y cambia el comportamiento descrito del acceso.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/email-sign-in.md` registra estado, decisión, qué resuelve, el correo como identificador, el retiro del usuario, el origen de la cuenta, los códigos de activación, por qué se mantiene la activación con la cuenta, el administrador inicial y la recuperación de emergencia, datos, clientes, relación con otras decisiones, límites y verificación. Aceptación: describe la implementación como en revisión, sin integrar; no afirma integración, despliegue en QA, homologación ni aceptación. Checks: revisión contra la ficha `odd/tasks/email-identity-activation-codes.md`, los contratos de `libs/backend/administration/contracts`, las migraciones 255 a 258, `administrator-recovery.ts`, `tools/deploy/README.md` y `tools/database/README.operational.md` de la rama del producto.
- S2. La decisión es localizable y las páginas afectadas la enlazan: fila ADR-24 en `docs/propuesta-arquitectura.md`, entrada `architecture/email-sign-in` en `apps/starlight/content-map.mjs` y su barra lateral, término «Código de activación» en el glosario; el ADR-23, la API de sucursal, el ADR-22 y el ADR-16 distinguen lo integrado en `main` (TASK-412) de lo que está en revisión (TASK-416). Aceptación: la página se construye y los enlaces resuelven. Checks: `validate`, `typecheck`, `build`, `check`, `diagrams:test`.
- S3. Contrato y diccionario de datos: no se importa un artefacto de una rama sin integrar ni se editan a mano; se importan desde `main` del producto con `tools/product-reference/sync.mjs` después de la integración. Aceptación: el ADR y la PR declaran la importación pendiente. Checks: revisión del diff.
- S4. El contenido es apto para un repositorio público: sin hosts, IP, cuentas, correos reales, credenciales ni valores de despliegue. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S3,S4 · route:inline · Redactar el ADR-24 · status:done · evidence: `docs/decisions/email-sign-in.md`
- [x] T2 · S2 · route:inline · Registrar la decisión y actualizar el ADR-23, la API, el ADR-22 y el ADR-16 · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, glosario, `docs/decisions/{device-activation,environments}.md`, `docs/api.md`, `docs/contracts/identity-and-trust.md`
- [ ] T3 · S1,S2,S4 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: L3
- [ ] T4 · S3 · route:inline · Importar contrato y diccionario desde `main` cuando TASK-416 se integre · status:blocked · evidence: pendiente de la integración de la PR del producto

## Log

- L1 · 2026-11-18 · Solicitud original de la issue del producto, literal según su ficha:

> es que me parece raro tambien poner un username cuando la caja legacy usaba correos. o que opinas?

> me parece bien. pero ve como funciona el legacy. de hecho habian correos que no estaban en usuariosAX creo. que eran roles mas admin creo. revisa la doc

> 1. son buzones reales. 2. Si deberia poder vender. el vendedor debería ser configurable. 3. usa [correo del administrador de QA]. Esto debería ser configurable tambien? me esa pensar en el problema del huevo y la gallina.

La ficha del producto omite el correo de la tercera cita porque el repositorio y POS Docs son públicos, y esta ficha conserva esa omisión. Encargo de la sesión coordinadora a esta sesión: preparar y abrir, sin integrar, la PR editorial de TASK-416 en POS Docs con un ADR-24 nuevo, actualizar el ADR-23 y las páginas afectadas, y no editar a mano el contrato ni el diccionario exportados.

- L2 · 2026-11-18 · Fuente técnica: rama `work/task-416-correo-codigos` del producto, con la implementación sin commit al redactar. Decisiones editoriales:
  - Es una decisión nueva (ADR-24) y no solo una actualización del ADR-23: cambia el identificador de ingreso, agrega el origen de la cuenta y una segunda forma de activar un equipo. El ADR-23 conserva la prueba de posesión y enlaza el ADR-24.
  - El ADR-23 pasa a integrado: pos-platform#413 (`47e1461`) y #414 (`588e11c`) se integraron en `main` el 18-11-2026. La referencia de APIs y el diccionario de datos siguen sin importar también para TASK-412.
  - Las mismas importaciones se hacen con `tools/product-reference/sync.mjs` (AGENTS.md y `docs/documentation-system.md`); `project-import.yml` importa avance, seguimientos, planificación, preguntas y reglas, no el contrato ni el diccionario.
  - No se publican los valores del límite de nginx ni rutas del servidor: el ADR dice que nginx limita por IP las rutas de identidad sin sesión.
  - Las cuentas administrativas del legacy que no están en AX se describen sin detallar cómo las protege su código.
  - `docs/decisions/native-clients.md`, `docs/decisions/web-client.md` y `docs/phase-1-laboratory.md` siguen diciendo «en implementación en TASK-412»; quedan fuera del alcance pedido.
  - El roadmap (`docs/roadmap.json`) no cambia: TASK-416 es de mantenimiento y F03-07 conserva su alcance.
