# ADR de la caja tomada por la persona, el acceso de soporte y la consola de operaciones

Objetivo: registrar como ADR-31, ADR-32 y ADR-33 el modelo en que el equipo se inscribe en la sucursal y la persona toma la caja, el acceso de soporte sin suplantación y la consola de operaciones central.
Rama: `work/task-782-register-tenure-adrs`. Entrega: una PR editorial que va primero; la implementación de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782) se construye sobre ella. No cierra issues del producto ni acredita implementación, despliegue en QA, homologación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Registra tres decisiones de arquitectura que cambian la identidad de los equipos, el origen de las cajas y agregan una aplicación.

## Specs

- S1. `docs/decisions/register-tenure.md` registra el ADR-31: el equipo se inscribe en la sucursal; las cajas son un maestro del ERP; el tablero de cajas al ingresar, con los estados disponible, ocupada, tu turno y arqueo pendiente; la tenencia con época que excluye al equipo anterior; las capacidades del equipo; la seguridad frente al legacy; los datos lógicos y la relación con ADR-16, ADR-21, ADR-23, ADR-24 y ADR-30. Checks: `npm run verify`.
- S2. `docs/decisions/support-access.md` registra el ADR-32: diagnóstico, «ver como» de solo lectura impuesto por el servidor y rol propio con vencimiento; lo que no se permite. Checks: `npm run verify`.
- S3. `docs/decisions/operations-console.md` registra el ADR-33: la consola central separada del POS, qué comparte, qué muestra, cómo llegan los datos y sus ámbitos. Checks: `npm run verify`.
- S4. Las decisiones son localizables: filas ADR-31 a ADR-33 en `docs/propuesta-arquitectura.md` y entradas en `apps/starlight/content-map.mjs` y su barra lateral. Aceptación: la página se construye y los enlaces resuelven. Checks: `npm run verify`.
- S5. El contenido es apto para un repositorio público: sin hosts, IP, dominios internos, cuentas, correos reales, credenciales ni la clase de debilidad de un sistema en producción. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S5 · route:inline · Redactar el ADR-31 · status:done · evidence: `docs/decisions/register-tenure.md`
- [x] T2 · S2,S5 · route:inline · Redactar el ADR-32 · status:done · evidence: `docs/decisions/support-access.md`
- [x] T3 · S3,S5 · route:inline · Redactar el ADR-33 · status:done · evidence: `docs/decisions/operations-console.md`
- [x] T4 · S4 · route:inline · Registrar las decisiones en la propuesta y en la barra lateral · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`
- [ ] T5 · S1,S2,S3,S4,S5 · route:inline · Regenerar los derivados, ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: en curso en esta rama.

## Log

- L1 · 2026-11-24 · Solicitud original del responsable del producto, literal:

> me parece todo bien entonces. Entonces crea el adr o rfc y ayudame a implementar todo de forma enterprise-grade, sin parches y como lo harian las bigtechs. para el ui podríamos compartir componentes, colores, etc que ya usa al app de pos. Para no volver a construir todo eso desde cero

Antecedentes del mismo día, literales: «debe funcionar como antes corrigiendo todos los problemas de seguridad y con mejoras. que me recomiendas tu? si hay que cambiar la arquitectura lo hacemos. aun estamos en qa, sin prod.»; sobre soporte, «soporte se puede meter con la sesion del cajero para identificar problemas»; y sobre la consola, «el soporte o admin debería poder ver todas las cajas no? el estado, errores, etc».

- L2 · 2026-11-24 · Evidencia: el código desplegado del legacy de QA lista las cajas de la sucursal y retoma la propia cuando la persona tiene un turno abierto; su sincronizador descarga las cajas del ERP. En el producto, sobre `aa66fc9`, la caja se deriva de la instalación en el inicio de sesión y la asignación operativa se indexa por persona, caja e instalación. La PR [pos-platform#775](https://github.com/developer-implementos/pos-platform/pull/775) aporta el cierre de un turno ajeno con supervisor y testigo y un turno abierto por operador, que estos ADR reutilizan.
