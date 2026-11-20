# ADR de la sesión del puesto y el marco común de los clientes

Objetivo: registrar como ADR-30 el modelo común de sesión del puesto (estados, política de acceso versionada, renovación con prueba de posesión, bloqueo del puesto, reautenticación para acciones sensibles, bloqueo por intentos y sesiones propias) y el esqueleto del encabezado y de «Mi cuenta». Issue: https://github.com/developer-implementos/pos-platform/issues/461 (TASK-461). Responsable: floxcristian.
Rama: `work/task-461-adr-sesion`. Entrega: una PR editorial que va primero; las tareas de implementación TASK-462 a TASK-466 se construyen sobre ella. No cierra issues del producto ni acredita implementación, despliegue en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Registra una decisión de arquitectura que agrega contratos HTTP, tablas, una política versionada y el marco visual común de los clientes.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/workstation-session.md` registra estado, decisión, qué resuelve, los estados del puesto y su dueño, la política de acceso con los valores provisionales de Q-58, el contrato con `branch-api` (tope, inactividad, renovación, bloqueo y desbloqueo, aviso, reautenticación, bloqueo por intentos, sesiones propias y errores), el encabezado y «Mi cuenta», los datos, la compatibilidad, las alternativas descartadas, la relación con otras decisiones, los límites y la verificación. Aceptación: describe la implementación como pendiente y los valores como provisionales; no afirma despliegue en QA, homologación ni aceptación. Checks: revisión contra la issue TASK-461 y la auditoría #451.
- S2. La decisión es localizable: fila ADR-30 en `docs/propuesta-arquitectura.md` y entrada `architecture/workstation-session` en `apps/starlight/content-map.mjs` y su barra lateral. Aceptación: la página se construye y los enlaces resuelven. Checks: `npm run verify`.
- S3. El contenido es apto para un repositorio público: sin hosts, IP, dominios internos, cuentas, correos reales, credenciales ni valores de despliegue. Checks: revisión del diff completo.
- S4. Cuando las PR del producto se integren en `main`, el ADR-30 pasa a implementado y se importan el contrato y el diccionario con `tools/product-reference/sync.mjs`. Aceptación: la PR editorial declara ese seguimiento.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-30 · status:done · evidence: `docs/decisions/workstation-session.md`
- [x] T2 · S2 · route:inline · Registrar la decisión en la propuesta y en la barra lateral · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`
- [ ] T3 · S1,S2,S3 · route:inline · Regenerar los derivados, ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: en curso en esta rama.
- [ ] T4 · S4 · route:inline · Marcar implementado e importar contrato y diccionario cuando TASK-462 a TASK-466 se integren · status:pending · evidence: las PR del producto no están integradas.

## Log

- L1 · 2026-11-20 · Solicitud original, literal (pedido del responsable del producto, transmitido por la sesión coordinadora):

> faltan pantallas yo creo. se crítico. queremos una solucion enterprise-grade, sin parches y como lo harian las bigtechs

Respuestas del responsable a las preguntas de la sesión, el 2026-11-20: sobre el alcance, «P0 y P1» de la auditoría #451; sobre Q-58, «Sí, provisional»: la recomendación de Q-58 se adopta como valor provisional de QA, como configuración versionada y no como constantes, hasta que seguridad la confirme.

Y sobre esta parte del trabajo, el pedido literal de la sesión coordinadora (se omite solo la ruta local del clon):

> 1. **Diseño corto del modelo de sesión y del shell**, como ADR en POS Docs ([ruta local omitida], repo **público**: sin IP, hosts, cuentas ni correos reales). Define:
>    - los estados: activo, por vencer, bloqueado, sin conexión, versión nueva y error;
>    - el contrato con `branch-api`: renovación con la prueba de posesión del equipo de TASK-412, vencimiento por inactividad en el servidor y reingreso para acciones sensibles;
>    - el esqueleto del encabezado y de «Mi cuenta», con la identidad de prime-showcase (https://prime-showcase-mu.vercel.app) y las reglas de diseño de `AGENTS.md`.
>
>    Va primero, en su propia PR, y el resto se construye sobre él.

- L2 · 2026-11-20 · Decisiones de diseño, con la evidencia de la auditoría #451 sobre `fda4368` y la lectura de `libs/backend/administration`, `libs/data-access/branch-api` y `libs/features/branch-operation` en esa revisión:
  - La política de acceso es una tabla propia de revisiones inmutables y no un campo de la configuración por caja: el bloqueo por intentos se decide antes de conocer la caja, Q-58 la propone corporativa y así la revisión inicial llega a QA con la migración, sin pasos manuales.
  - Desbloquear es un ingreso completo que crea una sesión nueva, y el cliente conserva el shell si la persona es la misma. Así hay un solo camino para la inactividad, el tope y la revocación, y el tope se cuenta desde la última contraseña.
  - La renovación rota el token; el cliente evita la carrera esperando las solicitudes en curso. La reautenticación por acción responde 403, no 401, para no confundirse con una sesión vencida.
  - El indicador de conexión, los errores y la versión nueva son de TASK-457 y TASK-458; el ADR solo fija cómo se combinan con el bloqueo y deja su lugar en el encabezado.
