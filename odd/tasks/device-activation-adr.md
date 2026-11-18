# ADR de la activación de equipos con prueba de posesión

Objetivo: registrar como ADR-23 la activación administrativa de equipos con una llave propia, el login con prueba de posesión y el cambio obligatorio de la contraseña inicial, y actualizar las páginas que describían el registro por JSON. Issue: https://github.com/developer-implementos/pos-platform/issues/412 (TASK-412). Responsable: floxcristian.
Rama: `work/task-412-activacion-equipos`. Entrega: una PR editorial coordinada con la PR de backend del producto (pos-platform#413, en revisión) y la PR de clientes que se apilará encima; no cierra la issue del producto ni acredita homologación, operación productiva ni aceptación de QA.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Introduce una decisión de arquitectura sobre la identidad de las instalaciones cliente y cambia el comportamiento descrito del acceso.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/device-activation.md` registra estado, decisión, activación, login con prueba de posesión, cambio obligatorio, administración de equipos, datos, clientes, relación con otras decisiones, límites y verificación. Aceptación: distingue lo implementado en revisión (#413) de lo pendiente (clientes, E2E, QA) y de lo propuesto (F03-06); no afirma integración, homologación ni aceptación. Checks: revisión contra la ficha `odd/tasks/device-activation.md`, el README de `libs/backend/administration` y `installation-identity.ts` del producto en `7e20fcc`.
- S2. La decisión es localizable y las páginas afectadas la enlazan: fila ADR-23 en `docs/propuesta-arquitectura.md`, entrada `architecture/device-activation` en `apps/starlight/content-map.mjs` y su barra lateral, término del glosario; ADR-14, ADR-16, ADR-21, ADR-22, la guía F01, la API de sucursal y el recorrido de recuperación distinguen el estado de `main` del cambio en revisión. Aceptación: la página se construye y los enlaces resuelven. Checks: `validate`, `typecheck`, `build`, `check`, `diagrams:test`.
- S3. Referencia de contratos y diccionario de datos: no se importa un artefacto de una rama sin integrar. `tools/product-reference/sync.mjs` no tiene un modo de corte previo a la integración y la ficha del producto deja `documentation:export` en curso. Aceptación: la PR declara la importación como pendiente hasta que TASK-412 se integre en `main`. Checks: revisión del diff.
- S4. El contenido es apto para un repositorio público: sin hosts, IP, cuentas, credenciales ni valores de despliegue. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S4 · route:inline · Redactar el ADR-23 · status:done · evidence: `docs/decisions/device-activation.md`
- [x] T2 · S2 · route:inline · Registrar la decisión y actualizar las páginas que describían el registro por JSON · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, glosario, `docs/contracts/identity-and-trust.md`, `docs/decisions/{native-clients,web-client,environments}.md`, `docs/phase-1-laboratory.md`, `docs/api.md`, `docs/flows/recovery.md`
- [ ] T3 · S1,S2,S4 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: L3
- [ ] T4 · S3 · route:inline · Importar contratos y esquema desde `main` cuando TASK-412 se integre · status:blocked · evidence: pendiente de la integración de pos-platform#413 y de la PR de clientes

## Log

- L1 · 2026-11-17 · Solicitud original de la issue del producto, literal según su ficha:

> asi es como lo harian los pos enterprise-grade, sin parches y como lo harian las bigtechs? si estas seguro entonces implementalo de forma enterprise-grade, sin parches y com lo harian las bigtechs.

Encargo de la sesión coordinadora a esta sesión: preparar y abrir, sin integrar, la PR editorial coordinada de TASK-412 en POS Docs, distinguiendo lo implementado en revisión (#413) de lo propuesto (F03-06), registrar un ADR si hay una decisión nueva y no importar el artefacto de contratos como si fuera de `main`.

- L2 · 2026-11-17 · Fuente técnica: rama `work/task-412-activacion-equipos` del producto en `7e20fcc2372ee0fd7966b4746ac0c205fbc023b1` (pos-platform#413, borrador). Decisiones editoriales:
  - Es una decisión nueva (ADR-23) y no solo una actualización del ADR-16: fija el almacén WebCrypto no extraíble en IndexedDB y la prueba de posesión al iniciar sesión, mientras el ADR-16 propone un almacén nativo y DPoP. El ADR-16 queda vigente y enlaza la parte implementada.
  - El roadmap (`docs/roadmap.json`) no cambia: TASK-412 es de mantenimiento y F03-06 conserva su alcance en el producto.
  - La referencia de APIs y el diccionario de datos siguen en `f3290b5`: el importador exige el commit exacto de un checkout limpio y el portal no tiene una etiqueta de corte previo para ellos; `docs/api.md` lista las rutas en revisión aparte de la tabla de `main`.
  - La PR de clientes todavía no está abierta; las páginas la nombran como pendiente.
