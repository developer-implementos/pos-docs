# Documentación de lo integrado en POS Platform el 23-11-2026

Objetivo: actualizar en su lugar las páginas canónicas de POS Docs con el comportamiento que llegó hoy a `main` de POS Platform, citando el commit de integración de cada PR como revisión de evidencia. Issue principal: https://github.com/developer-implementos/pos-platform/issues/581 (TASK-581); las demás tareas se enlazan desde sus páginas.
Rama: `work/docs-integrated-2026-11-23` desde `origin/main` (`bd76ce9`). Entrega: una PR editorial, sin cerrar entregables del producto ni acreditar aceptación, despliegue u homologación.
Test runner: `npm run verify` y la comprobación de recorridos sobre el HTML construido.
Clasificación: varias páginas de una misma entrega editorial; ficha propia porque el control editorial no puede leer las fichas del producto, que vive en un repositorio privado.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. Reimpresión autorizada (pos-platform#588, TASK-581, F02-10, `2bcff89`): permiso propio `device.reprint` y motivo, sin nueva venta, pago ni documento; reglas provisionales de FOLLOWUP-035. Páginas: guía F02, ADR-17 y recorrido de impresión.
- S2. Política de verificación de transferencias (pos-platform#680, TASK-658, F02-06, `13b0e59`): el aprovisionamiento rechaza `block-sale` sin verificador autorizado con `verifier-not-authorized`; FOLLOWUP-036 sigue abierto. Páginas: guía F02 y recorrido de cobro.
- S3. Apidog (pos-platform#640, TASK-635, `7ad6b41`): vista previa sin red en cada PR y publicación desde el artefacto verificado de `main`, apagada mientras no se habilite `APIDOG_PUBLISH_ENABLED`. Páginas: referencia de contratos y sistema documental.
- S4. OpenAPI de reporting, fiscal, pricing y pagos (pos-platform#685, TASK-679, `d94dfbe`; #688, TASK-678, `69ca3e6`): referencia importada desde el artefacto de `d94dfbe` y explicación de qué declara cada operación.
- S5. Medición de carga de la exportación de ventas del turno (pos-platform#691, TASK-676, `c6e2445`): informe en hardware de desarrollo, no capacidad del piloto. Página: guía de pruebas.
- S6. Inbox de país (pos-platform#645, TASK-636, `2f0cc55`; #700, TASK-696, `ab44071`): deduplicación estricta y lote idéntico concurrente como `duplicate`. Páginas: recorrido de sincronización y guía de la API.
- S7. Host de dispositivos (pos-platform#672, TASK-655, `8a9b191`): cuerpo de error acotado y acuse aplazado sólo ante 409 `DEVICE_STATE_CONFLICT`. Página: guía F02.
- S8. Renombre de una caja (pos-platform#671, TASK-663, `0488333`): comando propietario auditado `name-register`. Página: ADR-30.
- S9. Sólo se documenta lo implementado: las PR abiertas #508, #557, #695 y #690 no se presentan como implementadas, y los límites y decisiones abiertas se marcan como tales. El contenido es apto para un repositorio público: sin secretos, hosts internos ni datos de clientes.

## Tasks

- [x] T1 · S4 · route:inline · Importar la referencia del producto en `d94dfbe` · status:done · evidence: `5827b56`
- [x] T2 · S1,S2,S7,S9 · route:inline · Guía F02, ADR-17 y recorridos de impresión y cobro · status:done · evidence: `c1598f2`
- [x] T3 · S6,S9 · route:inline · Recorrido de sincronización y guía de la API · status:done · evidence: `9dfa52f`
- [x] T4 · S8 · route:inline · ADR-30 · status:done · evidence: `1283066`
- [x] T5 · S3,S4 · route:inline · Referencia de contratos y sistema documental · status:done · evidence: `167af82`
- [x] T6 · S5 · route:inline · Guía de pruebas · status:done · evidence: `8cfa1dc`
- [ ] T7 · S1,S2,S3,S4,S5,S6,S7,S8,S9 · route:inline · Regenerar la colección de Excalidraw, verificar y abrir la PR · status:in_progress · evidence: `npm run verify` en verde sobre 438515a (L3); PR abierta

## Log

- L1 · 2026-11-23 · Solicitud de la sesión coordinadora, literal (extracto):

> Update the editorial repository developer-implementos/pos-docs so its canonical pages reflect behavior that landed today in developer-implementos/pos-platform main. […] Only document what is implemented; mark limits and open decisions as such; do not describe pending PRs (#508/#557 shift close, #695 country consumer, #690 outbox quarantine) as implemented. Find the existing canonical page for each (business flow, API guide, architecture, roadmap work item) and update it in place instead of adding duplicate pages

- L2 · 2026-11-23 · La referencia se importó del artefacto `documentation-contracts` de la corrida de `main` 45238596815 (verde) sobre `d94dfbe`, copiado a un checkout limpio de esa revisión fuera de este repositorio; `sync.mjs` validó el manifiesto y los hashes. No había página de capacidad o carga: la medición va en la guía de pruebas, que ya reúne la cobertura por ubicación. TASK-568 (#571), base de la política de verificación, no estaba documentada; se resume sólo lo necesario para explicar TASK-658. El renombre de cajas en cada despliegue de QA (TASK-702) llegó después y queda fuera de esta ficha.
- L3 · 2026-11-23 · `npm run verify` falló dos veces y se corrigió: la presentación de arquitectura fija el hash del ADR-17 (se revisó el deck, que no menciona la reimpresión, y se renovó la fuente), y Archify rechazó los diagramas de datos con las tablas nuevas (se ubicaron las de administration y devices, y payments pasa a tres columnas). Sobre 438515a `npm run verify` sale 0, incluidos build, enlaces, Archify y comprobaciones de navegador. No hubo revisión visual humana de los diagramas.
