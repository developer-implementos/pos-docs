# ADR-34 · Sincronizador corporativo de maestros multipaís

**Estado:** propuesta (RFC) del 25-11-2026 de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782), pendiente de aceptación del responsable del producto. Su pedido fue: «debes pensarlo en coorporativo. Chile sincroniza contra eso, pero perú y españa pueden tener o manejar otros campos quizas. Por eso debemos tener quizas un sincronizador corporativo multipaís», y después «haz todo lo necesario. crea un rfc detallado con el plan de trabajo». Extiende el [ADR-15](../propuesta-arquitectura.md#adr-15) y el [contrato de publicación de maestros](../contracts/master-data-publication.md); concreta la capa anticorrupción que el [ADR-31](register-tenure.md) exige para el maestro de cajas.

**Decisión propuesta:**

- **Un modelo canónico por maestro, sin nombres de ningún proveedor.** El núcleo del POS solo conoce cajas, sucursales, medios de pago, personas, productos y precios en su propio vocabulario. Lo propio de un país viaja como una **extensión tipada por país**, validada por su esquema, nunca como columnas del núcleo.
- **Un puerto de origen por maestro y un adaptador por país y sistema.** Cada adaptador traduce su origen al modelo canónico y declara sus capacidades (corte completo o por cambios, marca de agua, bajas explícitas o implícitas, límites). La configuración del país elige el adaptador, como ya hace la [fuente de precios](https://github.com/developer-implementos/pos-platform/tree/main/libs/backend/erp#fuente-de-precios-acl).
- **La sincronización corre en el país, no en cada sucursal.** `erp-worker` extrae y prepara en la red autorizada del origen; `country-api` es la autoridad de versiones y publica a las sucursales por el transporte existente. La sucursal solo aplica revisiones firmadas por el país.
- **La identidad entre sistemas es explícita y no se reutiliza.** Una correspondencia guarda `(país, sistema, tipo, clave del origen) → identificador del POS`. Cambiar la clave de origen de un registro es una reasignación explícita, nunca un retiro seguido de un alta.
- **Una revisión anómala se retiene.** Si un corte retira, crea o cambia más de lo que la política del país admite (por ejemplo, el origen devuelve cero cajas), la revisión queda retenida hasta que una persona la apruebe en la consola de operaciones.
- **El país sabe qué aplicó cada sucursal.** Cada sucursal acusa la revisión aplicada; el país detecta saltos, reenvía lo que falta y la [consola de operaciones](operations-console.md) muestra las sucursales atrasadas.
- **Conciliación y modo sombra.** Un proceso periódico compara el origen con lo publicado y con lo aplicado, y avisa cuando se separan. Antes de reemplazar al sincronizador vigente de un país, el nuevo corre en sombra y compara resultados sin publicar.

## Qué resuelve

El legacy de Chile sincroniza cada sucursal por separado: un bus de integración lee tablas intermedias de AX, divide los cambios por sucursal, deja un aviso en una cola por sucursal y cada sucursal descarga sus cambios por HTTP y los aplica con su propio servicio. Funciona en Chile, pero cada sucursal repite la traducción del ERP, la identidad de cada registro queda en columnas sueltas y nada impide que un corte erróneo dé de baja una sucursal entera. Perú y España no tienen ese flujo: sus sincronizadores actuales cargan reportes, comercio electrónico y reposición, no la caja.

El POS necesita un solo diseño que sirva a los tres países, a sus sistemas actuales (Dynamics AX en Chile, Gira en España, un sistema propio en Perú) y al ERP común que la empresa evalúa.

## Lo que se encontró en cada país

| País | Sistema | Cómo llegan hoy los maestros a la caja | Cajas | Evidencia |
| --- | --- | --- | --- | --- |
| Chile | Dynamics AX | Servicios de datos del bus leen tablas intermedias de AX con una marca de procesado; el concentrador divide por sucursal y deja un aviso en una cola por sucursal; la sucursal descarga, aplica y acusa | Sí. La identidad es el `RecId` de AX (`cajas.id_externo`); el punto de emisión, el nombre, la plaza y el grupo de banco son atributos; los medios de pago llegan en la misma caja | `mountain-sync-sucursal` `app/Services/Sync/CajasSyncService.js`; `mountain-concentrador` `DSConcentrador/dataservice/DSS_AX_Cajas.dbs` |
| Perú | Sistema propio; AX alimenta una base intermedia | Ninguno hacia la caja. El sincronizador vigente es una carga nocturna para la herramienta de reposición | No existe maestro de cajas ni de series fiscales | `sincronizadores-core-peru` |
| España | Gira | Ninguno hacia la caja. Los sincronizadores leen Gira en un solo sentido hacia un almacén de lectura para reportes y comercio electrónico | No existe entidad caja: la caja es un atributo de cada documento de venta, junto a empresa, almacén, serie y tipo | `sincronizadores-core` (módulos de España), `gira-sync` |

Detalles de Chile que el diseño conserva:

- **Dos identificadores de la caja.** La sincronización busca la caja por el `RecId` (`id_externo`), pero las ventas suben a AX con el **punto de emisión** (`id_externo_punto_emision`). El modelo canónico guarda los dos: el primero en la correspondencia de identidad, el segundo en la extensión de Chile, porque la salida al ERP lo necesita.
- **Los medios de pago pertenecen a la caja.** Llegan con la caja y se activan o desactivan con ella; el crédito no se desactiva por esa vía.
- **Las cajas nunca se borran.** El legacy solo crea y actualiza. El POS sí retira, con retiro diferido mientras haya un turno abierto ([ADR-31](register-tenure.md)).
- **Las personas llegan sin contraseña.** El legacy recibe de AX el trabajador, su correo y su clasificación; el POS conserva esa regla y sus credenciales siguen siendo propias ([ADR-24](email-sign-in.md)).

## Modelo

| Elemento | Qué es | Dónde vive |
| --- | --- | --- |
| Maestro canónico | Esquema versionado por maestro (`register-master-v1`, y los que siguen), con campos comunes y una extensión por país | Contratos del POS |
| Extensión de país | Campos propios validados por el esquema del país. Chile: punto de emisión, plaza, grupo de banco. Perú y España: por definir con el sistema que entregue el dato | Contratos del POS, por país |
| Correspondencia de identidad | `(país, sistema, tipo, clave del origen) → id del POS`, con historia de reasignaciones; una clave nunca se reutiliza | PostgreSQL del país |
| Corte | Lectura de un origen en un instante, con su marca de agua y su huella | `erp-worker` |
| Revisión | Diferencia canónica entre el corte y la última revisión publicada: altas, cambios, reasignaciones y retiros, con secuencia monótona por país y maestro | PostgreSQL del país |
| Política de retención | Umbrales por país y maestro: retiros, altas y cambios máximos por revisión; un corte vacío siempre se retiene | Configuración del país |
| Acuse de sucursal | Revisión aplicada por cada sucursal, con hora y resultado | PostgreSQL del país |

## Flujo

1. **Programar.** `country-api` programa la extracción de cada maestro y país (o la recibe por evento del origen cuando exista).
2. **Extraer.** El adaptador del país lee el origen en modo de solo lectura, con su marca de agua o un corte completo, y traduce cada registro al modelo canónico. Un registro que no valida va a cuarentena con su causa; la revisión no se publica a medias.
3. **Resolver identidad.** Cada clave de origen se busca en la correspondencia. Una clave nueva crea un identificador del POS; una reasignación declarada por el adaptador mueve la clave sin crear otra caja.
4. **Calcular la revisión** contra la última publicada, con su secuencia.
5. **Aplicar la política.** Si la revisión supera los umbrales, queda **retenida**; la consola muestra el detalle y una persona con permiso la aprueba o la descarta, con motivo y auditoría.
6. **Publicar.** `country-api` publica la revisión con el ciclo del [contrato de publicación](../contracts/master-data-publication.md) (`requested → preparing → uploaded → validated → published`).
7. **Distribuir y acusar.** Cada sucursal recibe las revisiones en orden, las aplica en una transacción (con las reglas locales, como el retiro diferido) y acusa. Una sucursal desconectada recibe lo pendiente al volver; un salto de secuencia pide lo faltante.
8. **Conciliar.** Un proceso compara periódicamente el origen, lo publicado y lo aplicado por cada sucursal, y abre un caso operativo ante una diferencia.

## Casos de borde

| Caso | Comportamiento |
| --- | --- |
| El origen devuelve cero registros o una fracción anómala | Revisión retenida; nada se retira sin aprobación |
| El origen cambia la clave de un registro existente | Reasignación explícita en la correspondencia; la caja conserva su identidad, turnos e historia |
| Una caja se retira con un turno abierto | Retiro diferido hasta el cierre ([ADR-31](register-tenure.md)) |
| Una caja cambia de sucursal | Retiro en la sucursal de origen y alta en la de destino con la misma identidad del POS, solo sin turno abierto; si lo hay, se retiene |
| Dos cajas activas con el mismo punto de emisión en la misma razón social (Chile) | El registro va a cuarentena; la revisión no se publica hasta resolverlo |
| Cambia el punto de emisión con un turno abierto | El cambio se aplica al cerrar el turno; los documentos ya emitidos conservan el anterior |
| Un registro no valida contra el esquema del país | Cuarentena con causa; el resto de la revisión espera según la política del maestro |
| La sucursal está desconectada durante varias revisiones | Las recibe en orden al volver; el país la muestra atrasada |
| Se pierde el acuse de una sucursal | La sucursal vuelve a acusar por identidad de revisión; aplicar dos veces no cambia nada |
| Se publican dos revisiones de la misma base | Gana una por secuencia y versión esperada; la otra se recalcula ([contrato](../contracts/master-data-publication.md)) |
| El origen está caído o lento | La extracción falla con causa y reintento; la última revisión publicada sigue vigente |
| Un país sin el maestro en su sistema (las cajas de España) | El adaptador declara que no lo provee; el maestro se administra por otra fuente autorizada del país, con el mismo modelo y la misma política |
| Se reemplaza el sistema de un país por el ERP común | Se agrega un adaptador y se corre en sombra; la correspondencia de identidad se conserva y nada cambia para las sucursales |
| Una persona deja de existir en el origen | Se deshabilita su acceso; su historia y sus documentos se conservan |

## Seguridad y operación

- **Solo lectura en el origen.** Cada adaptador usa una identidad propia del país, con el mínimo acceso, y lectura por servicio o captura de cambios cuando el origen lo permita.
- **Aislamiento por país.** Bases, credenciales, colas y trabajos separados por país; un adaptador de un país no lee el origen de otro.
- **Auditoría.** Toda aprobación o descarte de una revisión retenida, toda reasignación y todo cambio de política queda auditado con su autor y motivo.
- **Observabilidad.** Duración y volumen de cada corte, revisiones retenidas, cuarentena, sucursales atrasadas y diferencias de conciliación, visibles en la consola de operaciones.
- **Recuperación.** La correspondencia de identidad y el registro de revisiones se respaldan con el país; una revisión se puede reconstruir desde el origen con el mismo resultado.

## Alternativas descartadas

- **Replicar el modelo del legacy en cada sucursal.** Repite la traducción del ERP en cada sucursal y deja la identidad en columnas sueltas.
- **Columnas de cada país en el núcleo.** Cada país nuevo cambiaría el modelo común.
- **Leer las tablas internas del ERP desde la sucursal.** Expone el origen a la red de cada tienda y ata el POS al esquema del ERP.
- **Publicar el corte sin política de retención.** Un error del origen se convertiría en una baja masiva.

## Plan de trabajo

Cada unidad sale en su propia PR, con su issue hija de #782 y su verificación. Las marcadas con QA requieren el reinicio de QA ya autorizado por el responsable.

| Orden | Unidad | Resultado | Depende de |
| --- | --- | --- | --- |
| [M1](https://github.com/developer-implementos/pos-platform/issues/857) | Contrato `register-master-v1` con extensión por país y esquema de Chile | El maestro canónico de cajas y sus medios de pago, con punto de emisión, plaza y grupo de banco como extensión de Chile | Esta propuesta |
| [M2](https://github.com/developer-implementos/pos-platform/issues/858) | Correspondencia de identidad en el país | Tabla, reasignación explícita, historia y pruebas de no reutilización | M1 |
| [M3](https://github.com/developer-implementos/pos-platform/issues/859) | Puerto de origen del maestro de cajas y adaptador de Chile sobre el legacy | La importación de QA pasa a ser el primer adaptador, con `RecId` como clave y nombre, punto de emisión, plaza y grupo de banco | M1, M2 |
| [M4](https://github.com/developer-implementos/pos-platform/issues/860) | Revisión, política de retención y cuarentena | Diferencia canónica, umbrales por país, retención y su aprobación auditada | M2 |
| [M5](https://github.com/developer-implementos/pos-platform/issues/861) | Publicación y acuse por sucursal | Publicación por el ciclo existente, acuse, detección de saltos y reenvío | M4 |
| [M6](https://github.com/developer-implementos/pos-platform/issues/862) | Preparación de QA sin cajas por canal, importación y reinicio | QA con las cajas reales de una sucursal, publicadas por el país | M3, M5 e inscripción del equipo en la sucursal |
| [M7](https://github.com/developer-implementos/pos-platform/issues/863) | Consola: revisiones retenidas, cuarentena y sucursales atrasadas | Aprobar o descartar con motivo; ver el estado por sucursal | M4, M5, consola conectada |
| [M8](https://github.com/developer-implementos/pos-platform/issues/864) | Conciliación periódica | Comparación de origen, publicado y aplicado, con casos operativos | M5 |
| [M9](https://github.com/developer-implementos/pos-platform/issues/865) | Adaptador de Chile sobre AX y modo sombra | Lectura de la fuente autorizada de AX, en sombra contra el sincronizador vigente | M3 a M8; acceso autorizado de integración |
| [M10](https://github.com/developer-implementos/pos-platform/issues/866) | Extender a sucursales, medios de pago, personas, productos y precios | Cada maestro con su contrato y su adaptador de Chile | M5 |
| [M11](https://github.com/developer-implementos/pos-platform/issues/867) | Perú y España | Inventario con sus responsables de qué sistema entrega cada maestro, sus esquemas de país y sus adaptadores | M1 a M5; decisiones de cada país |

## Lo que queda abierto

- **La fuente autorizada de AX para producción** (servicio, vista o captura de cambios) y su identidad de integración. Lo decide el responsable de la integración.
- **Quién entrega las cajas en España y en Perú.** Hoy ningún sistema las entrega a la caja; lo deciden los responsables de cada país.
- **Los umbrales de retención por país y maestro.** Se proponen valores provisionales y se confirman con operaciones.
- **Las reglas fiscales de cada país sobre el punto de emisión o la serie** (por ejemplo, las series de Perú y la facturación de España), que su esquema de país debe validar.

## Relación con otras decisiones

- [ADR-15](../propuesta-arquitectura.md#adr-15): producción en `erp-worker` y autoridad de publicación en `country-api`; esta propuesta agrega identidad, política, acuse, conciliación y adaptadores por país.
- [ADR-18](job-processing.md): la programación y los trabajos usan BullMQ en el país.
- [ADR-31](register-tenure.md): las cajas son un maestro del ERP y su retiro se difiere con un turno abierto.
- [ADR-33](operations-console.md): la consola muestra y aprueba lo retenido.
