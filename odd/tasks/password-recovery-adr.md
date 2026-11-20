# ADR de recuperación de contraseña por correo

Objetivo: registrar como ADR-29 la recuperación de la contraseña con un código de un solo uso enviado al correo y escrito en la caja, el correo durable del POS por SMTP con TLS obligatorio desde un buzón corporativo propio, el aviso de cada cambio de contraseña y el control accesible para mostrar la contraseña. Issue: https://github.com/developer-implementos/pos-platform/issues/450 (TASK-450). Responsable: floxcristian.
Rama: `work/task-450-adr-recuperacion`. Entrega: una PR editorial coordinada con las PR apiladas del producto de TASK-450, sin integrar; no cierra la issue del producto ni acredita integración, buzón configurado, despliegue en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Registra una decisión de arquitectura que agrega contratos HTTP, tablas, configuración y una dependencia de envío de correo.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/password-recovery.md` registra estado, decisión, qué resuelve, el control para mostrar la contraseña, el correo del POS (buzón, puerto, adaptador, configuración, outbox, despachador y aviso), la recuperación (alcance, tres pasos con posesión, el código, reglas, respuesta uniforme, confirmación y cierre), la degradación sin correo, la habilitación en un ambiente, los datos, la relación con otras decisiones, límites y verificación. Aceptación: describe la implementación como en revisión, sin integrar, y no afirma buzón configurado, despliegue en QA, homologación ni aceptación. Checks: revisión contra la ficha `odd/tasks/password-recovery.md` del producto.
- S2. La decisión es localizable: fila ADR-29 en `docs/propuesta-arquitectura.md` y entrada `architecture/password-recovery` en `apps/starlight/content-map.mjs` y su barra lateral. Aceptación: la página se construye y los enlaces resuelven. Checks: `npm run verify`.
- S3. El contenido es apto para un repositorio público: sin hosts, IP, dominios reales, cuentas, correos reales, credenciales ni valores de despliegue; los ejemplos usan example.com. Checks: revisión del diff completo.
- S4. Cuando las PR del producto se integren en `main`, el ADR-29 pasa a implementado y se importan el contrato y el diccionario con `tools/product-reference/sync.mjs`. Aceptación: la PR editorial declara ese seguimiento.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-29 · status:done · evidence: `docs/decisions/password-recovery.md`
- [x] T2 · S2 · route:inline · Registrar la decisión en la propuesta y en la barra lateral · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`
- [x] T3 · S1,S2,S3 · route:inline · Regenerar los derivados, ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:done · evidence: L3
- [ ] T4 · S4 · route:inline · Marcar implementado e importar contrato y diccionario cuando TASK-450 se integre · status:pending · evidence: las PR del producto no están integradas.

## Log

- L1 · 2026-11-20 · Solicitud original, literal (pedido de la sesión coordinadora del producto, en su parte editorial):

> **ADR en POS Docs** (`C:/Users/crist/Projects/Implementos/pos-platform/pos-docs`, repo **público**: sin IP, hosts, cuentas ni correos reales; ejemplos con example.com). Una página nueva en `docs/` exige `python tools/diagrams/package-excalidraw.py`. Si tocas una página canónica que cita el deck, actualiza `presentations/architecture/sources.json`. Verifica con `npm ci` en `apps/starlight` y `npm run verify` en la raíz.

Y sobre el buzón, decisión del responsable comunicada por la sesión coordinadora: «Buzón corporativo», con un remitente propio del POS en el mismo servicio SMTP corporativo, credencial separada en un archivo de secretos del servidor y sin nombrar el dominio real en POS Docs.

- L2 · 2026-11-20 · Fuente técnica: ficha `odd/tasks/password-recovery.md` del producto (L2 decisiones de diseño, L3 y L4 evidencia de los dos primeros eslabones). Decisiones editoriales:
  - Es una decisión nueva (ADR-29) y no una nota del ADR-24: agrega contratos HTTP, tablas, configuración, una dependencia de envío de correo y una regla de seguridad para la recuperación de cuentas.
  - El buzón se describe con `no-responder-pos@example.com`, sin el dominio corporativo, y el servicio SMTP como «el que ya usan otros sistemas de la empresa», sin nombrarlo.
  - Se publican los límites y su efecto (a lo más 25 códigos probados al día por cuenta, de 10⁸) porque son parte del diseño de seguridad y no permiten reconstruir una debilidad; no se publican hosts ni ajustes de ningún ambiente.
- L3 · 2026-11-20 · La cadena del producto quedó completa en cinco PR: #452 integrada y #454, #455, #469 y #471 en revisión. El ADR se ajustó a lo implementado:
  - el estado lista las cinco PR y corrige el número del adaptador de correo, que es #454;
  - el pedido responde `200` con `{ accepted: true }`, porque los contratos HTTP del producto solo admiten 200 o 201 como éxito, y el tiempo mínimo es de 750 ms;
  - un código escrito en otro equipo cuenta como intento fallido, y la confirmación limpia los intentos fallidos del login como un ingreso exitoso;
  - un trigger de `operator_account` cierra la recuperación abierta ante cualquier cambio de contraseña o de correo, o al deshabilitar la cuenta;
  - las pantallas, con el código en un solo campo en vez de `p-inputotp`, y el límite del medidor de robustez (P2-6 de pos-platform#451);
  - los seguimientos del producto: FOLLOWUP-027, el pedido a infraestructura, y FOLLOWUP-028, la decisión del remitente, ya resuelta;
  - la verificación cita la ficha del producto en `a369729`, con la evidencia de los cinco eslabones y lo que no se verificó.
  - después de integrarse el ADR-30 en `main`, la relación con ese ADR: la recuperación limpia los fallos del ingreso como un ingreso correcto, y sigue la regla que decida TASK-465 si solo un administrador puede levantar el bloqueo.
