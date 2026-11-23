# Historial de cambios

Qué cambió en POS Docs y cuándo, versión por versión, con la más reciente arriba. Cada entrada resume un PR integrado y enlaza a él; el PR conserva el detalle, las fuentes y la revisión. Cuando un PR cambia seguimientos, preguntas abiertas, decisiones o el avance importado de POS Platform, la entrada los nombra por su identificador.

- **Novedades:** páginas, recorridos, vistas o secciones nuevas.
- **Correcciones:** contenido que estaba equivocado o enlaces rotos.
- **Contenido actualizado:** cambios de estado, alcance, fuentes o redacción del contenido existente.
- **Reversiones:** cambios publicados que se deshicieron.

Los cambios de herramientas, pruebas y CI no aparecen aquí; quedan en el [registro de Git](https://github.com/developer-implementos/pos-docs/commits/main). Un cambio que retira o renombra una ruta pública de `/guide/` se marca como incompatible.

Este archivo lo escribe [release-please](https://github.com/googleapis/release-please) desde los títulos de los PR, y cada versión queda como [release en GitHub](https://github.com/developer-implementos/pos-docs/releases). Para recibir un aviso por versión, usa *Watch → Custom → Releases* en el repositorio. No se edita a mano: cómo se escribe una buena entrada está en la [guía de versiones](tools/release/README.md).

## [0.11.0](https://github.com/developer-implementos/pos-docs/compare/v0.10.22...v0.11.0) (2026-11-23)


### Novedades

* **project:** [TASK-716] mostrar los criterios cumplidos con evidencia junto al porcentaje ([#161](https://github.com/developer-implementos/pos-docs/issues/161)) ([347a76c](https://github.com/developer-implementos/pos-docs/commit/347a76cda60799d08b6546530665348b33c74af1))


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (impacto): Obtener las decisiones de negocio del registro de preguntas y reglas de paridad ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F01-02 actualizado (resumen): Verificados cálculo decimal, cotización reproducible y comparación con consentimiento o rechazo de recotización ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F01-09 actualizado (resumen): Verificados borradores y presupuestos persistidos, captura por código/unidad, cantidad repetida, pausa y recuperación explícita entre puestos con CAS ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F01-12 actualizado (resumen): Revalidados contratos v1, errores, límites, idempotencia y consumidores ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F02-04 actualizado (resumen): Seguimiento conectado muestra por operación los estados independientes de venta, pago, documento fiscal e impresión con su evidencia cronológica (TASK-11… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F02-05 actualizado (resumen): Verificados el plan de cobro congelado, las asignaciones exactas, el bloqueo del saldo incierto, los reintentos y el vuelto sólo de efectivo ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F02-06 actualizado (resumen): Implementadas transferencias manuales con cuenta autorizada, referencia única entre ventas de la sucursal, aprobación independiente, bandeja por permisos… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F02-10 actualizado (resumen): Contrato de recibo no fiscal existente, payload/hash y distinción spool/efecto implementados ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F02-14 actualizado (resumen): GetTerminalStatus distingue desconectado, conectado en modo manual, listo e indisponible con su origen y antigüedad, y sólo un adaptador puede afirmar qu… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F03-01 pasa de Pendiente a En desarrollo ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F03-11 actualizado (resumen): pnpm run contracts:check compara los esquemas del código con un manifiesto versionado (tools/contracts/contract-manifest.json) y rechaza sin cambio de ve… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F04-03 pasa de Pendiente a En desarrollo ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F04-05 actualizado (resumen): listShiftSalesV1 lista con sale.read y paginación keyset las ventas que el solicitante confirmó en su turno, caja e instalación, y cada fila abre su comp… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F05-02 actualizado (resumen): database.js backup respalda la base de sucursal con pg_dump sobre una instantánea REPEATABLE READ y un manifiesto con SHA-256, versiones, ámbito, migraci… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F05-06 pasa de Pendiente a En desarrollo ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F05-07 actualizado (resumen): tools/load mide branch-api con escenarios reproducibles por semilla, preparados sólo por las puertas oficiales, e informa percentiles, errores, recursos… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F05-09 pasa de Pendiente a En desarrollo ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **progress:** F05-12 actualizado (resumen): El recorrido del cajero se completa sólo con teclado, desde la apertura del turno hasta el comprobante, con foco visible, diálogos que devuelven el foco… ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))
* **project:** [TASK-361] importar el corte 4999b1a de avance, seguimientos y preguntas ([4237c8e](https://github.com/developer-implementos/pos-docs/commit/4237c8e919878498452da92637f51c71a3167210))

## [0.10.22](https://github.com/developer-implementos/pos-docs/compare/v0.10.21...v0.10.22) (2026-11-23)


### Contenido actualizado

* **architecture:** [TASK-705] registrar el perfil firmado del equipo en el ADR-30 ([#158](https://github.com/developer-implementos/pos-docs/issues/158)) ([3caa981](https://github.com/developer-implementos/pos-docs/commit/3caa9813dcb2e848a94403969cde3893b26a5944))

## [0.10.21](https://github.com/developer-implementos/pos-docs/compare/v0.10.20...v0.10.21) (2026-11-23)


### Contenido actualizado

* **api:** [TASK-635] describir la vista previa por PR y la publicación en Apidog desde el artefacto de main ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **api:** [TASK-679] importar los contratos del producto en d94dfbe con la documentación OpenAPI de pagos, reporting, fiscal y pricing ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **architecture:** [TASK-663] registrar en el ADR-30 el renombre auditado de una caja ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **devices:** [TASK-581] documentar la reimpresión autorizada con permiso propio y motivo ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **devices:** [TASK-655] documentar la lectura acotada de errores y el acuse aplazado del host ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **payments:** [TASK-658] documentar el rechazo de block-sale sin verificador autorizado y FOLLOWUP-036 ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **sync:** [TASK-636] documentar la recepción del país con deduplicación estricta y lotes concurrentes ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))
* **testing:** [TASK-676] registrar la medición de carga de la exportación de ventas del turno ([38bd3c8](https://github.com/developer-implementos/pos-docs/commit/38bd3c8645688326ad602b884af36e88623647b0))

## [0.10.20](https://github.com/developer-implementos/pos-docs/compare/v0.10.19...v0.10.20) (2026-11-23)


### Contenido actualizado

* **follow-up:** FOLLOWUP-025 nuevo · Decisión: Decidir cómo representar en el POS los precios y clientes del legacy que el contrato no admite ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-026 nuevo · Decisión: Confirmar con seguridad la política de sesión y de bloqueo por intentos adoptada como provisional en QA ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-027 nuevo · Acceso: Crear el buzón propio del POS con su credencial y abrir la salida SMTP desde los servidores ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-028 nuevo · Decisión: Decidir el remitente y la cuenta de los correos del POS ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-029 nuevo · Decisión: Confirmar con Tesorería la regla del voucher manual de tarjeta adoptada como provisional en QA ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-030 nuevo · Decisión: Confirmar con Tesorería y Operaciones las reglas del cierre de turno adoptadas como provisionales en QA ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-031 nuevo · Decisión: Confirmar con Operaciones los reportes del turno adoptados como provisionales en QA ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-032 nuevo · Decisión: Confirmar qué rol recibe los permisos del voucher manual, adoptados como provisionales en QA para el administrador protegido ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-033 nuevo · Decisión: Fijar con el negocio las ventanas reales de soporte y deprecación de las versiones de contrato, adoptadas como provisionales sin plazo fijo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-034 nuevo · Decisión: Rehabilitar los adjuntos de transferencias y vouchers sólo cuando exista un escáner de seguridad, deshabilitados por política de forma provisional ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-035 nuevo · Decisión: Definir las reglas de negocio de la reimpresión que Q-17 no fija ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **follow-up:** FOLLOWUP-036 nuevo · Decisión: Decidir si una cuenta receptora puede bloquear la venta mientras no existe un verificador de transferencias autorizado ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F01-09 actualizado (resumen): Verificados borradores y presupuestos persistidos, captura por código/unidad, cantidad repetida, pausa y recuperación explícita entre puestos con CAS ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F02-01 actualizado (resumen): Intenciones, intentos y destinos durables, reserva de venta y recuperación implementados y probados en PostgreSQL ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F02-04 actualizado (resumen): Seguimiento conectado muestra por operación los estados independientes de venta, pago, documento fiscal e impresión con su evidencia cronológica (TASK-11… ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F02-05 actualizado (resumen): Verificados el plan de cobro congelado, las asignaciones exactas, el bloqueo del saldo incierto, los reintentos y el vuelto sólo de efectivo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F02-06 actualizado (resumen): Implementadas transferencias manuales con cuenta autorizada, referencia única entre ventas de la sucursal, aprobación independiente, bandeja por permisos… ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F02-07 actualizado (resumen): Perfiles de pago versionados, destino fiscal congelado y asignación de instalación/época implementados ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F02-14 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F03-06 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F03-07 actualizado (resumen): Pendiente de implementación y verificación técnica: El operador usa identidad corporativa homologada y la sucursal aplica autorizaciones de continuidad f… ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F03-09 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F03-10 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F03-11 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F04-05 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F04-10 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F05-02 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F05-06 actualizado (resumen): Pendiente de implementación y verificación técnica: Se detectan fallos y degradación del recorrido mediante métricas y alertas accionables con responsabl… ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F05-07 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F05-11 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F05-12 pasa de Pendiente a En desarrollo ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **progress:** F06-03 actualizado (resumen): Pendiente de implementación y verificación técnica: Configuraciones aceptadas se habilitan gradualmente con versiones compatibles y criterios explícitos… ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))
* **project:** [TASK-361] importar el corte 0488333 de avance, seguimientos y preguntas ([eda2ddd](https://github.com/developer-implementos/pos-docs/commit/eda2ddd67c691c7f81edf1f58bd08a501f4cad72))

## [0.10.19](https://github.com/developer-implementos/pos-docs/compare/v0.10.18...v0.10.19) (2026-11-20)


### Contenido actualizado

* **api:** [TASK-458] documentar el código de referencia, la versión del cliente y su arranque ([#150](https://github.com/developer-implementos/pos-docs/issues/150)) ([348ff50](https://github.com/developer-implementos/pos-docs/commit/348ff50837918618fc7fcb5f8729552bddcb1152))

## [0.10.18](https://github.com/developer-implementos/pos-docs/compare/v0.10.17...v0.10.18) (2026-11-20)


### Contenido actualizado

* **architecture:** [TASK-450] registrar el ADR-29 de recuperación de contraseña por correo ([#151](https://github.com/developer-implementos/pos-docs/issues/151)) ([1d2d118](https://github.com/developer-implementos/pos-docs/commit/1d2d11865764b35b8f54b309eeab198d8dd86861))

## [0.10.17](https://github.com/developer-implementos/pos-docs/compare/v0.10.16...v0.10.17) (2026-11-20)


### Contenido actualizado

* **api:** [TASK-457] documentar la sonda de conexión de los clientes con la sucursal ([#148](https://github.com/developer-implementos/pos-docs/issues/148)) ([fcaa52a](https://github.com/developer-implementos/pos-docs/commit/fcaa52a3c5ce75abfef1daacf114722b98aef726))

## [0.10.16](https://github.com/developer-implementos/pos-docs/compare/v0.10.15...v0.10.16) (2026-11-20)


### Contenido actualizado

* **architecture:** [TASK-461] registrar el ADR-30 de la sesión del puesto y su marco común ([#147](https://github.com/developer-implementos/pos-docs/issues/147)) ([bd6d7d6](https://github.com/developer-implementos/pos-docs/commit/bd6d7d63aa7a88b69c6817094c596eee107dd91d))

## [0.10.15](https://github.com/developer-implementos/pos-docs/compare/v0.10.14...v0.10.15) (2026-11-20)


### Contenido actualizado

* **architecture:** [TASK-445] registrar el ADR-28 de precios con impuesto incluido ([#144](https://github.com/developer-implementos/pos-docs/issues/144)) ([c8d4a55](https://github.com/developer-implementos/pos-docs/commit/c8d4a55837c9891eb5554721435d298638fcd6fb))

## [0.10.14](https://github.com/developer-implementos/pos-docs/compare/v0.10.13...v0.10.14) (2026-11-19)


### Contenido actualizado

* **decisions:** [TASK-444] exigir en el ADR-22 que el despliegue compare los archivos del servidor ([#143](https://github.com/developer-implementos/pos-docs/issues/143)) ([e323702](https://github.com/developer-implementos/pos-docs/commit/e323702ecb5c36cdd287c859be07c11764fc7e98))

## [0.10.13](https://github.com/developer-implementos/pos-docs/compare/v0.10.12...v0.10.13) (2026-11-19)


### Contenido actualizado

* **api:** [TASK-431] importar los contratos y el esquema del producto en 3561274 ([#141](https://github.com/developer-implementos/pos-docs/issues/141)) ([4df280d](https://github.com/developer-implementos/pos-docs/commit/4df280dffad490c79e4e849183a578b3f0cfe5dd))

## [0.10.12](https://github.com/developer-implementos/pos-docs/compare/v0.10.11...v0.10.12) (2026-11-19)


### Contenido actualizado

* **architecture:** [TASK-431] registrar los ADR-26 y ADR-27 de la carga comercial ([#139](https://github.com/developer-implementos/pos-docs/issues/139)) ([a8316aa](https://github.com/developer-implementos/pos-docs/commit/a8316aa1a1edb318a006d91fc47b7f1640e6d23c))

## [0.10.11](https://github.com/developer-implementos/pos-docs/compare/v0.10.10...v0.10.11) (2026-11-19)


### Contenido actualizado

* **api:** [TASK-406] importar los contratos y el esquema del producto en 76b8e11 ([352d559](https://github.com/developer-implementos/pos-docs/commit/352d55941ee0da8657c7aacb4b6a6c3f24be68ed))
* **implementation:** [TASK-406] las guías describen el modo único de operación y el ambiente local preparado igual que QA, y el ADR-25 pasa a implementado ([352d559](https://github.com/developer-implementos/pos-docs/commit/352d55941ee0da8657c7aacb4b6a6c3f24be68ed))

## [0.10.10](https://github.com/developer-implementos/pos-docs/compare/v0.10.9...v0.10.10) (2026-11-18)


### Contenido actualizado

* **decisions:** [TASK-406] registrar el modo único de operación sin laboratorio ni demo como ADR-25 ([#133](https://github.com/developer-implementos/pos-docs/issues/133)) ([fd7fafb](https://github.com/developer-implementos/pos-docs/commit/fd7fafb57e1e3c59f5b677381aa0b20aa8d5665f))

## [0.10.9](https://github.com/developer-implementos/pos-docs/compare/v0.10.8...v0.10.9) (2026-11-18)


### Contenido actualizado

* **decisions:** [TASK-416] registrar el ingreso con correo y códigos de activación como ADR-24 ([#130](https://github.com/developer-implementos/pos-docs/issues/130)) ([74eba5f](https://github.com/developer-implementos/pos-docs/commit/74eba5f7b06c6d7c855a153f040ca3bc104678ca))

## [0.10.8](https://github.com/developer-implementos/pos-docs/compare/v0.10.7...v0.10.8) (2026-11-18)


### Contenido actualizado

* **contracts:** [TASK-404] registrar en revisión la carga comercial desde archivo en la sucursal ([#129](https://github.com/developer-implementos/pos-docs/issues/129)) ([ffc902c](https://github.com/developer-implementos/pos-docs/commit/ffc902cda8cef4f75545e5ad777bf7f39f640571))

## [0.10.7](https://github.com/developer-implementos/pos-docs/compare/v0.10.6...v0.10.7) (2026-11-18)


### Contenido actualizado

* **decisions:** [TASK-412] registrar la activación de equipos con prueba de posesión como ADR-23 ([#127](https://github.com/developer-implementos/pos-docs/issues/127)) ([aaf53dc](https://github.com/developer-implementos/pos-docs/commit/aaf53dcd6636567f5295cf9aae7a18419bdee5cf))

## [0.10.6](https://github.com/developer-implementos/pos-docs/compare/v0.10.5...v0.10.6) (2026-11-17)


### Contenido actualizado

* **decisions:** [TASK-402] registrar los ambientes QA y producción como ADR-22 ([#124](https://github.com/developer-implementos/pos-docs/issues/124)) ([3de6bbc](https://github.com/developer-implementos/pos-docs/commit/3de6bbcc679e735da0a2dc884e0c742533b436e6))

## [0.10.5](https://github.com/developer-implementos/pos-docs/compare/v0.10.4...v0.10.5) (2026-11-17)


### Contenido actualizado

* **decisions:** [TASK-403] registrar el cliente web conectado como ADR-21 ([#123](https://github.com/developer-implementos/pos-docs/issues/123)) ([894d0d8](https://github.com/developer-implementos/pos-docs/commit/894d0d88f100d153fa11fb4a2a4d82207f9bdc05))

## [0.10.4](https://github.com/developer-implementos/pos-docs/compare/v0.10.3...v0.10.4) (2026-11-17)


### Contenido actualizado

* **api:** [TASK-389] importar los contratos y el esquema del producto en f3290b5 ([#120](https://github.com/developer-implementos/pos-docs/issues/120)) ([b331cc6](https://github.com/developer-implementos/pos-docs/commit/b331cc69fb1972fdaccdfe0e5f78fa6df74550b7))

## [0.10.3](https://github.com/developer-implementos/pos-docs/compare/v0.10.2...v0.10.3) (2026-11-17)


### Contenido actualizado

* **project:** [TASK-361] importar el corte f3290b5 de seguimientos y preguntas ([e738342](https://github.com/developer-implementos/pos-docs/commit/e7383425388db4bd4797655523634122bc84d774))

## [0.10.2](https://github.com/developer-implementos/pos-docs/compare/v0.10.1...v0.10.2) (2026-11-17)


### Correcciones

* **project:** [TASK-386] reconocer los commits que GitHub firma para la App de importación ([#114](https://github.com/developer-implementos/pos-docs/issues/114)) ([624767e](https://github.com/developer-implementos/pos-docs/commit/624767e1ab51e92cbf48c7c91103139696c9e9e5))


### Contenido actualizado

* **decisions:** [TASK-389] ADR-20 sigue en propuesta; su política pura de redondeo del efectivo existe sin consumidores ([abfb770](https://github.com/developer-implementos/pos-docs/commit/abfb770a38f3479264dd9630a12336ae89cd9d28))
* **payments:** [TASK-389] F02-01 y F02-06 explican el cobro con tarjeta en la caja conectada y el voucher manual ([abfb770](https://github.com/developer-implementos/pos-docs/commit/abfb770a38f3479264dd9630a12336ae89cd9d28))
* **payments:** [TASK-389] F02-07 explica la ejecutabilidad de los perfiles de pago y el canal de notificación del proveedor ([abfb770](https://github.com/developer-implementos/pos-docs/commit/abfb770a38f3479264dd9630a12336ae89cd9d28))
* **payments:** [TASK-389] F02-14 explica el estado y mantenimiento del terminal y el cierre de su lote sin tocar la caja ([abfb770](https://github.com/developer-implementos/pos-docs/commit/abfb770a38f3479264dd9630a12336ae89cd9d28))
* **recovery:** [TASK-389] F02-04 explica la bandeja de efectos sin resolver de Seguimiento de operaciones ([abfb770](https://github.com/developer-implementos/pos-docs/commit/abfb770a38f3479264dd9630a12336ae89cd9d28))

## [0.10.1](https://github.com/developer-implementos/pos-docs/compare/v0.10.0...v0.10.1) (2026-11-13)


### Correcciones

* **project:** [TASK-361] comprobar antes de publicar que la issue de la importación esté abierta ([#111](https://github.com/developer-implementos/pos-docs/issues/111)) ([2ba9d8f](https://github.com/developer-implementos/pos-docs/commit/2ba9d8f9713b02f7190a062e828f3aded97f88c7))

## [0.10.0](https://github.com/developer-implementos/pos-docs/compare/v0.9.4...v0.10.0) (2026-11-13)


### Novedades

* **project:** [TASK-356] separar en la agenda por rol lo que cada rol decide de los datos que aporta ([#107](https://github.com/developer-implementos/pos-docs/issues/107)) ([31f12c3](https://github.com/developer-implementos/pos-docs/commit/31f12c38ca7d6a55fe3a6580c96a19245b5622b2))

## [0.9.4](https://github.com/developer-implementos/pos-docs/compare/v0.9.3...v0.9.4) (2026-11-13)


### Contenido actualizado

* **odd:** [TASK-283] cerrar la primera corrida real de la importación automática ([#108](https://github.com/developer-implementos/pos-docs/issues/108)) ([cb0924e](https://github.com/developer-implementos/pos-docs/commit/cb0924e056da9630557d13f0ecc927048827e3a3))

## [0.9.3](https://github.com/developer-implementos/pos-docs/compare/v0.9.2...v0.9.3) (2026-11-13)


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (próxima acción): Obtener las decisiones de negocio del registro de preguntas y reglas de paridad ([0c93314](https://github.com/developer-implementos/pos-docs/commit/0c9331487a98c19aa709831e5e4359a41f0f180a))
* **project:** [TASK-283] importar el corte 2eaf8f6 de seguimientos y preguntas ([0c93314](https://github.com/developer-implementos/pos-docs/commit/0c9331487a98c19aa709831e5e4359a41f0f180a))

## [0.9.2](https://github.com/developer-implementos/pos-docs/compare/v0.9.1...v0.9.2) (2026-11-13)


### Contenido actualizado

* **project:** [TASK-258] importar el corte 0625f93 con cuatro reglas enlazadas a sus preguntas ([#102](https://github.com/developer-implementos/pos-docs/issues/102)) ([9e05a46](https://github.com/developer-implementos/pos-docs/commit/9e05a4672a880d6dd6b0dc4f1b5977399523f0bb))

## [0.9.1](https://github.com/developer-implementos/pos-docs/compare/v0.9.0...v0.9.1) (2026-11-13)


### Contenido actualizado

* **project:** [TASK-342] importar el corte ba1d279 con la segunda revisión de preguntas ([a9ec958](https://github.com/developer-implementos/pos-docs/commit/a9ec958e7e9ab562e81b38397506c56a36ac205f))

## [0.9.0](https://github.com/developer-implementos/pos-docs/compare/v0.8.0...v0.9.0) (2026-11-13)


### Novedades

* **project:** [TASK-258] mostrar las preguntas abiertas de cada rol y filtrar por prioridad ([#98](https://github.com/developer-implementos/pos-docs/issues/98)) ([1a7d77a](https://github.com/developer-implementos/pos-docs/commit/1a7d77ada04efe73696216eb478fe8b488a7994e))

## [0.8.0](https://github.com/developer-implementos/pos-docs/compare/v0.7.2...v0.8.0) (2026-11-13)


### Novedades

* **project:** [TASK-339] aceptar sólo el esquema 4 del registro de preguntas ([66a54ac](https://github.com/developer-implementos/pos-docs/commit/66a54ac9f2ede7a2c4090a9bd922d73ab0397846))
* **project:** [TASK-339] leer el esquema 4 de preguntas con roles y preguntas unidas ([#94](https://github.com/developer-implementos/pos-docs/issues/94)) ([8ecdbd9](https://github.com/developer-implementos/pos-docs/commit/8ecdbd9a343a45c3896bed35c65aaf934632cdf0))


### Correcciones

* **release:** [TASK-341] derivar de la versión candidata las versiones ajenas de las pruebas ([#97](https://github.com/developer-implementos/pos-docs/issues/97)) ([31b8294](https://github.com/developer-implementos/pos-docs/commit/31b82949861d2e42ad4771341446a0903cce8156))


### Contenido actualizado

* **evidence:** [TASK-258] publicar los hallazgos de seguridad del legacy sólo por identificador ([#87](https://github.com/developer-implementos/pos-docs/issues/87)) ([638363e](https://github.com/developer-implementos/pos-docs/commit/638363ea52eacf5887d6b1c5f45194b1a6333cd0))
* **follow-up:** FOLLOWUP-017 actualizado (impacto, próxima acción): Obtener las decisiones de negocio del registro de preguntas y reglas de paridad ([66a54ac](https://github.com/developer-implementos/pos-docs/commit/66a54ac9f2ede7a2c4090a9bd922d73ab0397846))
* **project:** [TASK-339] importar el corte 55ba70a con 108 preguntas, 17 unidas y el catálogo de roles ([66a54ac](https://github.com/developer-implementos/pos-docs/commit/66a54ac9f2ede7a2c4090a9bd922d73ab0397846))

## [0.7.2](https://github.com/developer-implementos/pos-docs/compare/v0.7.1...v0.7.2) (2026-11-12)


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (impacto): Obtener las decisiones de negocio del registro de preguntas y reglas de paridad ([a914586](https://github.com/developer-implementos/pos-docs/commit/a914586d980726d988b2e1032352af078df638c8))
* **project:** [TASK-280] publicar el índice de las reglas de negocio de la caja ([a914586](https://github.com/developer-implementos/pos-docs/commit/a914586d980726d988b2e1032352af078df638c8))
* **project:** [TASK-296] importar el corte 9cc8a3f con 122 preguntas y sus recomendaciones ([a914586](https://github.com/developer-implementos/pos-docs/commit/a914586d980726d988b2e1032352af078df638c8))

## [0.7.1](https://github.com/developer-implementos/pos-docs/compare/v0.7.0...v0.7.1) (2026-11-12)


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (resumen, impacto, próxima acción, criterio de cierre): Obtener las decisiones de negocio del registro de preguntas y reglas de paridad ([1ec0260](https://github.com/developer-implementos/pos-docs/commit/1ec0260543529e276f8665be8fbfccb525156f40))
* **project:** [TASK-333] Q-05, Q-17, Q-30, Q-34 y Q-36 muestran la decisión final que consta en las fichas del producto ([1ec0260](https://github.com/developer-implementos/pos-docs/commit/1ec0260543529e276f8665be8fbfccb525156f40))

## [0.7.0](https://github.com/developer-implementos/pos-docs/compare/v0.6.5...v0.7.0) (2026-11-12)


### Novedades

* **project:** [TASK-333] mostrar la decisión final y retirar el respaldo de las recomendaciones ([#88](https://github.com/developer-implementos/pos-docs/issues/88)) ([cc2709b](https://github.com/developer-implementos/pos-docs/commit/cc2709b617fc313763dc4d50d17bcbb4dbd5446b))

## [0.6.5](https://github.com/developer-implementos/pos-docs/compare/v0.6.4...v0.6.5) (2026-11-12)


### Correcciones

* **docs:** [TASK-314] enlazar el formato vigente de boletas del SII ([#84](https://github.com/developer-implementos/pos-docs/issues/84)) ([cfd37f9](https://github.com/developer-implementos/pos-docs/commit/cfd37f94aefc2a604004623d73aeab343ab070b8))

## [0.6.4](https://github.com/developer-implementos/pos-docs/compare/v0.6.3...v0.6.4) (2026-11-12)


### Contenido actualizado

* **project:** [TASK-324] importar el corte 661e2df con la recomendación de las 64 reglas abiertas ([#82](https://github.com/developer-implementos/pos-docs/issues/82)) ([5c8349d](https://github.com/developer-implementos/pos-docs/commit/5c8349d69749d075a8ebcbd4526e40728bc0e2d9))

## [0.6.3](https://github.com/developer-implementos/pos-docs/compare/v0.6.2...v0.6.3) (2026-11-12)


### Correcciones

* **project:** [TASK-314] rechazar localhost con punto final y aclarar el límite de 2000 caracteres ([#79](https://github.com/developer-implementos/pos-docs/issues/79)) ([c853c35](https://github.com/developer-implementos/pos-docs/commit/c853c356688c6deb7ea42e45f96a8a3e0974053a))

## [0.6.2](https://github.com/developer-implementos/pos-docs/compare/v0.6.1...v0.6.2) (2026-11-12)


### Contenido actualizado

* **progress:** F01-09 en GitHub pasa de Por clasificar a En validación ([a5ad016](https://github.com/developer-implementos/pos-docs/commit/a5ad016005a5f11b5c034b82f64f66d65791e1d8))
* **progress:** F01-09 pasa de En desarrollo a Verificado técnicamente ([a5ad016](https://github.com/developer-implementos/pos-docs/commit/a5ad016005a5f11b5c034b82f64f66d65791e1d8))
* **project:** [TASK-258] importar el corte 79a5111 con F01-09 verificado de nuevo, 15 de 71 ([a5ad016](https://github.com/developer-implementos/pos-docs/commit/a5ad016005a5f11b5c034b82f64f66d65791e1d8))

## [0.6.1](https://github.com/developer-implementos/pos-docs/compare/v0.6.0...v0.6.1) (2026-11-12)


### Contenido actualizado

* **project:** [TASK-314] importar el corte dc53521 con 35 recomendaciones multipaís ([#75](https://github.com/developer-implementos/pos-docs/issues/75)) ([d7af079](https://github.com/developer-implementos/pos-docs/commit/d7af0794ee601cbd71e08bde9099c5ec43e31112))

## [0.6.0](https://github.com/developer-implementos/pos-docs/compare/v0.5.10...v0.6.0) (2026-11-12)


### Novedades

* **project:** [TASK-314] mostrar la recomendación multipaís de cada pregunta de negocio ([#71](https://github.com/developer-implementos/pos-docs/issues/71)) ([caf2a80](https://github.com/developer-implementos/pos-docs/commit/caf2a80bbb89969a4a4a94f16edf6dfc2d6d2e89))

## [0.5.10](https://github.com/developer-implementos/pos-docs/compare/v0.5.9...v0.5.10) (2026-11-12)


### Contenido actualizado

* **progress:** F01-04 en GitHub pasa de Por clasificar a En validación ([d8763a6](https://github.com/developer-implementos/pos-docs/commit/d8763a6b13f040641b538006edab9415dab91c6d))
* **progress:** F01-04 pasa de En desarrollo a Verificado técnicamente ([d8763a6](https://github.com/developer-implementos/pos-docs/commit/d8763a6b13f040641b538006edab9415dab91c6d))
* **project:** [TASK-258] importar el corte 95e3419 con F01-04 verificado de nuevo, 14 de 71 ([d8763a6](https://github.com/developer-implementos/pos-docs/commit/d8763a6b13f040641b538006edab9415dab91c6d))

## [0.5.9](https://github.com/developer-implementos/pos-docs/compare/v0.5.8...v0.5.9) (2026-11-12)


### Correcciones

* **tooling:** [TASK-313] aislar del repositorio que las lanza las pruebas que crean fixtures git ([#69](https://github.com/developer-implementos/pos-docs/issues/69)) ([d1cd471](https://github.com/developer-implementos/pos-docs/commit/d1cd471ec836445fe7e8a57faab00579ac0dfead))

## [0.5.8](https://github.com/developer-implementos/pos-docs/compare/v0.5.7...v0.5.8) (2026-11-12)


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (impacto): Validar el registro de preguntas y reglas de negocio de paridad ([ab06645](https://github.com/developer-implementos/pos-docs/commit/ab0664541ab92efc29293a60b5b530cea9c9b4e2))
* **project:** [TASK-258] importar el corte 2ada3dc con diecinueve preguntas de paridad de F03 a F05 ([ab06645](https://github.com/developer-implementos/pos-docs/commit/ab0664541ab92efc29293a60b5b530cea9c9b4e2))

## [0.5.7](https://github.com/developer-implementos/pos-docs/compare/v0.5.6...v0.5.7) (2026-11-12)


### Contenido actualizado

* **api:** [TASK-148] documentar el relay de fallos de clientes y la cuota gratuita de Sentry ([#28](https://github.com/developer-implementos/pos-docs/issues/28)) ([9d99eb1](https://github.com/developer-implementos/pos-docs/commit/9d99eb17fa58f00fd3e282c4e25f5edd8139d2e7))

## [0.5.6](https://github.com/developer-implementos/pos-docs/compare/v0.5.5...v0.5.6) (2026-11-12)


### Contenido actualizado

* **api:** [TASK-298] declarar nx 24 en la base técnica del backend ([#64](https://github.com/developer-implementos/pos-docs/issues/64)) ([fa0c005](https://github.com/developer-implementos/pos-docs/commit/fa0c0054463b6fcd3f5bb155ca0e57bb0a172a7f))

## [0.5.5](https://github.com/developer-implementos/pos-docs/compare/v0.5.4...v0.5.5) (2026-11-11)


### Correcciones

* **content:** [F02-05] admitir enlaces a la vista de preguntas del portal desde la documentación ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))


### Contenido actualizado

* **decisions:** [F02-05] proponer el redondeo de efectivo como ajuste de pago en el ADR-20 ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **follow-up:** FOLLOWUP-019 nuevo · Decisión: Definir la contabilización del ajuste de redondeo de efectivo y su concepto en el ERP ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **follow-up:** FOLLOWUP-020 nuevo · Decisión: Aprobar la política de caja para el redondeo de efectivo ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **follow-up:** FOLLOWUP-021 nuevo · Decisión: Aprobar devoluciones y notas de crédito de ventas con redondeo ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **follow-up:** FOLLOWUP-022 nuevo · Decisión: Definir el redondeo en cobranzas, cuotas, anticipos y USD ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **follow-up:** FOLLOWUP-023 nuevo · Pregunta: Confirmar con asesor o SII la representación y el tratamiento tributario del redondeo ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **follow-up:** FOLLOWUP-024 nuevo · Investigación: Contrastar el redondeo del legacy con datos y con la lógica de AX ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))
* **questions:** [F02-05] Q-53 remite a FOLLOWUP-020, la política de caja del redondeo de efectivo ([4211185](https://github.com/developer-implementos/pos-docs/commit/4211185172c6bdb3061ec7faf47dd5795fba2410))

## [0.5.4](https://github.com/developer-implementos/pos-docs/compare/v0.5.3...v0.5.4) (2026-11-11)


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (impacto): Validar el registro de preguntas y reglas de negocio de paridad ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **progress:** F01-01 en GitHub pasa de Por clasificar a En validación ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **progress:** F01-01 pasa de En desarrollo a Verificado técnicamente ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **progress:** F01-05 en GitHub pasa de Por clasificar a Cerrada ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **progress:** F01-05 pasa de En desarrollo a Verificado técnicamente ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **progress:** F02-09 en GitHub pasa de Por clasificar a En validación ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **progress:** F02-09 pasa de En desarrollo a Verificado técnicamente ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))
* **project:** [TASK-258] importar el corte da7da6d con 13 de 71 verificados y quince preguntas de paridad nuevas ([5adb800](https://github.com/developer-implementos/pos-docs/commit/5adb800d05c719b5c739d132f8d5e0fa86003e89))

## [0.5.3](https://github.com/developer-implementos/pos-docs/compare/v0.5.2...v0.5.3) (2026-11-11)


### Contenido actualizado

* **progress:** F01-01 en GitHub pasa de En validación a Por clasificar ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-01 pasa de Verificado técnicamente a En desarrollo ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-04 en GitHub pasa de Cerrada a Por clasificar ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-04 pasa de Verificado técnicamente a En desarrollo ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-05 en GitHub pasa de Cerrada a Por clasificar ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-05 pasa de Verificado técnicamente a En desarrollo ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-09 en GitHub pasa de En validación a Por clasificar ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F01-09 pasa de Verificado técnicamente a En desarrollo ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F02-09 en GitHub pasa de En validación a Por clasificar ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **progress:** F02-09 pasa de Verificado técnicamente a En desarrollo ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))
* **project:** [TASK-258] importar el corte 667235e con el avance corregido a 10 de 71 entregables ([57b1b2f](https://github.com/developer-implementos/pos-docs/commit/57b1b2f68c3639fdbb17be0616229b4c114a231c))

## [0.5.2](https://github.com/developer-implementos/pos-docs/compare/v0.5.1...v0.5.2) (2026-11-11)


### Contenido actualizado

* **follow-up:** FOLLOWUP-017 actualizado (impacto): Validar el registro de preguntas y reglas de negocio de paridad ([00dcf50](https://github.com/developer-implementos/pos-docs/commit/00dcf5065b6de11269eef8caa75c07fcab8520e6))
* **project:** [TASK-258] importar el corte 02f8bdc con siete preguntas nuevas de paridad legacy ([00dcf50](https://github.com/developer-implementos/pos-docs/commit/00dcf5065b6de11269eef8caa75c07fcab8520e6))

## [0.5.1](https://github.com/developer-implementos/pos-docs/compare/v0.5.0...v0.5.1) (2026-11-11)


### Correcciones

* **release:** [TASK-258] desempatar por identificador las corridas de verificación creadas en el mismo segundo ([#53](https://github.com/developer-implementos/pos-docs/issues/53)) ([4bc931b](https://github.com/developer-implementos/pos-docs/commit/4bc931bbd045956a65813bb9e4d116b5a14e4e28))

## [0.5.0](https://github.com/developer-implementos/pos-docs/compare/v0.4.2...v0.5.0) (2026-11-10)


### Novedades

* **portal:** [TASK-258] mostrar por fase las preguntas y reglas de negocio pendientes de validar ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))


### Contenido actualizado

* **evidence:** [TASK-258] contrastar la operación de Chile con sus sistemas de QA y producción y los límites de paridad ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-001 actualizado (impacto, próxima acción): Completar acceso de lectura a Mountain ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-002 actualizado (próxima acción): Integrar y comprobar Transbank POS integrado ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-003 actualizado (impacto, próxima acción): Concretar el primer adaptador fiscal ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-004 actualizado (próxima acción): Integrar drivers y comprobar periféricos del puesto ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-005 actualizado (próxima acción): Validar el perfil operativo de pagos, promociones y resolución de excepciones ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-009 actualizado (próxima acción): Definir contrato ERP y extracción de maestros ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-016 nuevo · Investigación: Conciliar con el adquirente los pagos en curso del legacy ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-017 actualizado (impacto): Validar el registro de preguntas y reglas de negocio de paridad ([fb51ca4](https://github.com/developer-implementos/pos-docs/commit/fb51ca4f36819657920bc1a771e705fc2e247c57))
* **follow-up:** FOLLOWUP-017 nuevo · Validación: Validar el registro de preguntas y reglas de negocio de paridad ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **follow-up:** FOLLOWUP-018 nuevo · Investigación: Recorrer la interfaz legacy de QA con las cuentas aportadas ([ab2d370](https://github.com/developer-implementos/pos-docs/commit/ab2d370ab99e5763e24e41c44a6996001493dbd6))
* **project:** [TASK-258] importar el corte cab44e4 con dos preguntas de paridad respondidas y datos para cuatro reglas ([fb51ca4](https://github.com/developer-implementos/pos-docs/commit/fb51ca4f36819657920bc1a771e705fc2e247c57))

## [0.4.2](https://github.com/developer-implementos/pos-docs/compare/v0.4.1...v0.4.2) (2026-11-10)


### Contenido actualizado

* **follow-up:** FOLLOWUP-013 resuelto: Decisión registrada de no proveer capacidad propia de Windows ni de macOS: el responsable no tiene presupuesto para más máquinas (ADR-0006 D3) ([3dc039e](https://github.com/developer-implementos/pos-docs/commit/3dc039e0e8bc58e29b0568b01589499d24fd3442))
* **follow-up:** FOLLOWUP-014 actualizado (resumen, impacto, próxima acción, criterio de cierre): Aislar el fleet de CI con runners efímeros y un pool confiable ([3dc039e](https://github.com/developer-implementos/pos-docs/commit/3dc039e0e8bc58e29b0568b01589499d24fd3442))

## [0.4.1](https://github.com/developer-implementos/pos-docs/compare/v0.4.0...v0.4.1) (2026-11-10)


### Correcciones

* **release:** [TASK-255] tomar la primera oración del texto de un seguimiento en su entrada del historial ([#45](https://github.com/developer-implementos/pos-docs/issues/45)) ([0b44078](https://github.com/developer-implementos/pos-docs/commit/0b44078646ea79f7a8b6e535465bacc6dc1017ee))

## [0.4.0](https://github.com/developer-implementos/pos-docs/compare/v0.3.0...v0.4.0) (2026-11-09)


### Novedades

* **release:** [TASK-253] registrar en el historial cada cambio de avance, seguimientos y planificación ([#43](https://github.com/developer-implementos/pos-docs/issues/43)) ([0c7f0e9](https://github.com/developer-implementos/pos-docs/commit/0c7f0e9f034e3c1b913014eeab7591e02ce3bc0d))

## [0.3.0](https://github.com/developer-implementos/pos-docs/compare/v0.2.0...v0.3.0) (2026-11-09)


### Novedades

* **portal:** [TASK-253] mostrar qué cambió en la portada y en el resumen del proyecto ([#41](https://github.com/developer-implementos/pos-docs/issues/41)) ([62d6edc](https://github.com/developer-implementos/pos-docs/commit/62d6edc37e83df4be8acf66fb48a5d488db06539))

## [0.2.0](https://github.com/developer-implementos/pos-docs/compare/v0.1.0...v0.2.0) (2026-11-09)


### Novedades

* **release:** [TASK-253] versionar POS Docs y publicar su historial de cambios ([#37](https://github.com/developer-implementos/pos-docs/issues/37)) ([1b3cbd6](https://github.com/developer-implementos/pos-docs/commit/1b3cbd6261338e8e8dc941b88623c58aca0a35e3))


### Correcciones

* **release:** [TASK-253] integrar el PR de versión desde la rama que crea release-please ([#39](https://github.com/developer-implementos/pos-docs/issues/39)) ([5264250](https://github.com/developer-implementos/pos-docs/commit/5264250294ee371ab9df54b502ef4ec4fe46ed9e))

## 0.1.0 (2026-11-08)

Punto de partida del historial versionado: el contenido publicado en `main` hasta [2375b0e](https://github.com/developer-implementos/pos-docs/commit/2375b0e0cda6295b035807b066c196b9c897ca15). Los cambios anteriores están en el [registro de Git](https://github.com/developer-implementos/pos-docs/commits/2375b0e0cda6295b035807b066c196b9c897ca15).
