# Publicación de maestros y versiones comerciales

**Estado: propuesta de implementación — ADR-15.** Define el trabajo de [F03-02](/guide/roadmap/phase-03/#work-f03-02). No acredita un publicador operativo, una interfaz de SIGE/ERP ni reglas comerciales aprobadas. El dueño de cada dato debe confirmar su autoridad, cobertura y contrato de extracción antes de habilitarlo.

## Responsabilidades y ubicación

| Pieza | Responsabilidad propuesta | Límite |
| --- | --- | --- |
| Dueño comercial y sistema origen | Autorizar catálogo, precios, ofertas, bajas y vigencias; ofrecer un corte consistente o un mecanismo equivalente verificable | Puede ser ERP u otro maestro, como SIGE. No se deduce su autoridad de que exista un conector |
| `erp-worker`, capacidad de publicación | Ejecutar `MasterDataSourcePort`, extraer el corte autorizado, normalizarlo y preparar paquetes inmutables | Corre en una red autorizada con acceso al origen. No escribe SQL remoto en la base POS de país |
| `country-api`, módulos `catalog`/`pricing` con transporte `sync` | Mantener solicitudes, versiones, manifiestos y autorización de publicación; recibir paquetes y servir versiones publicadas | PostgreSQL de país conserva el registro durable. La preparación pesada no se ejecuta dentro de una petición HTTP |
| `branch-sync-worker` | Descargar, reanudar, construir y validar una candidata; activar mediante el contrato local del módulo dueño | Su acuse de descarga no equivale a versión aplicada |
| `branch-api`, módulos `catalog`/`pricing` | Leer una versión completa vigente, calcular y conservar la versión usada en cada operación | No consulta al origen para calcular cada venta ni cambia la autoridad comercial |

Son capacidades de las siete aplicaciones propuestas. La instancia de `erp-worker` que prepara maestros puede desplegarse separadamente de la que ejecuta comandos financieros, conservando el mismo artefacto y una configuración de capacidad distinta. Usa identidad, permisos, claims, límites de concurrencia y presupuesto de recursos separados: una carga grande no puede ocupar todos los recursos de contabilización. Si el origen no es accesible desde esa red, la ubicación y el acceso deben resolverse antes de aceptar F03; no se abre acceso SQL por WAN como alternativa implícita.

## Contratos de trabajo y paquete

Los nombres siguientes son contratos de aplicación propuestos, no endpoints que ya existan. Las llamadas entre procesos usan HTTPS e identidad de workload conforme al [contrato de identidad](/guide/architecture/identity/). La solicitud programada y la publicación de una candidata se ejecutan como contratos internos de `country-api`; no requieren una llamada HTTP del proceso a sí mismo.

| Operación | Entrada y resultado | Regla de recuperación |
| --- | --- | --- |
| `requestPublication` | Ámbito país/entidad, conjunto de datos, origen autorizado, motivo (`scheduled`, `event` o `manual`) e identidad de solicitud; crea `publicationId` | Repetir la misma solicitud devuelve el mismo trabajo; mismo ID con contenido diferente se rechaza |
| `claimPublication` | Capacidad `masters.prepare`, ámbito y worker autorizado; devuelve trabajo, token de fencing y lease | Renovar conserva el claim; un intento vencido no puede finalizar una publicación con un token anterior |
| `uploadChunk` | `publicationId`, intento, ordinal, hash y bytes de una porción | Reenvío idéntico es idempotente; hash distinto para la misma porción se rechaza. La recepción queda durable antes del acuse |
| `finalizeCandidate` | Manifiesto, evidencia del corte y validación del productor, versión base y token de fencing | Sólo finaliza con todas las porciones verificadas; no cambia la versión publicada ante un error o claim vencido |
| `publishVersion` | Candidata validada y autorización comercial/política de publicación vigente | Compare-and-set del puntero esperado, registro de auditoría y evento de publicación en una transacción; no pisa silenciosamente una publicación concurrente |
| `getManifest` / `getChunk` | Versión publicada, ámbito autorizado y porción | Respuestas reproducibles e inmutables; la sucursal reanuda sin mezclar versiones |

`MasterDataSourcePort` debe ofrecer un corte y cambios compatibles con ese corte: inicio de extracción, paginación estable, bajas explícitas y lectura de cambios posteriores. No se presupone CDC ni un endpoint de SIGE. Si el origen sólo permite exportación, debe demostrar que el archivo representa un corte consistente; no se anuncia actualización por eventos hasta comprobarlo. Consultas sucesivas sobre tablas mutables, sin ese contrato, no forman una carga consistente.

El manifiesto identifica `publicationId`, `dataset`, `countryId`, `legalEntityId`, `schemaVersion`, `rulesVersion`, `baseVersion` cuando hay deltas, `targetVersion`, `sourceCheckpoint`, secuencia cubierta, vigencia, cobertura y hash de cada porción. Declara moneda, referencias necesarias y cantidades de control para la validación; no incorpora secretos ni claves privadas. El instante de creación es informativo: no reemplaza el corte ni determina por sí solo el orden de cambios.

El registro y los manifiestos viven en PostgreSQL de país. Para el primer perfil, las porciones se almacenan mediante un puerto de almacenamiento durable del módulo, con una implementación inicial PostgreSQL y límites de tamaño/retención medidos en el piloto. Cambiar a almacenamiento de objetos exige su propia política de integridad, disponibilidad y recuperación; no se da por contratado ese servicio. Redis y el disco temporal del worker no son la única copia de una publicación servida.

## Un ciclo completo

1. `country-api` registra una solicitud durable por programación, cambio informado por el origen o reejecución autorizada. Dedupe evita trabajos equivalentes en paralelo para el mismo corte y ámbito.
2. El worker reclama el trabajo. `MasterDataSourcePort` captura el corte y conserva el punto de reanudación; prepara datos y reglas con la versión de transformación identificada.
3. El worker envía las porciones por HTTPS. País comprueba identidad, ámbito, cuota e integridad y confirma su persistencia. Los reintentos conservan publicación e intento.
4. El productor valida cobertura, bajas, referencias, importes y reglas; país verifica manifiesto, integridad, autorización y precondiciones antes de marcar la candidata publicable. Las validaciones costosas se programan como trabajo durable del productor, no como una petición bloqueante en país.
5. La publicación cambia el puntero de país atómicamente y emite la notificación. Si se pierde la respuesta, consultar la publicación por ID determina el resultado; no se crea otra versión para resolver la incertidumbre.
6. La sucursal prepara y valida su propia candidata y activa **inbox aplicada, puntero y cursor aplicado** en un commit local. Conserva la versión anterior si falta una porción, hay un hueco o falla una regla. El [contrato de activación y vigencia](/guide/proposal/pricing-promotions/#publicación-y-activación-de-versiones-comerciales) gobierna el cálculo y los pagos iniciados.

La programación periódica pertenece a una capacidad interna de `catalog`/`pricing` en `country-api`, fuera del ciclo de una petición. Conserva calendario, siguiente ejecución y avance en PostgreSQL. Cada ejecución reclama de forma condicional un intervalo identificado por horario/ámbito/dataset y crea `requestPublication` con una clave única; dos réplicas o un reinicio no crean dos solicitudes para el mismo intervalo. Los intervalos atrasados se recuperan con un límite de carga y una política explícita de consolidación, usando el reloj de país y una zona horaria configurada. Deshabilitar el calendario detiene nuevas solicitudes, sin borrar trabajos admitidos. BullMQ, con Redis exclusivo de trabajos de país, dispara estos intervalos y ejecuta el handler breve que crea la solicitud; el calendario y su identidad siguen en PostgreSQL. Un reconciliador reconstruye disparos o solicitudes faltantes después de perder estado de Redis. La extracción y preparación pesada se ejecuta en `erp-worker` con BullMQ y su Redis de trabajos en la red ERP, sin acceso WAN a Redis de país. La decisión y los fallos de enqueue se detallan en el [ADR-18](../decisions/job-processing.md); sus pruebas incluyen réplicas, reinicio y recuperación de intervalos.

Estados de publicación: `requested → preparing → uploaded → validated → published`; un rechazo conserva causa e intento y no modifica una versión ya publicada. `superseded` indica que existe una versión posterior; no permite borrar una versión todavía referenciada. Descargar, validar, publicar en país y activar en sucursal son hechos diferentes.

## Fallos y límites que deben probarse

| Caso | Resultado exigido | Evidencia de aceptación |
| --- | --- | --- |
| Cae el productor durante una carga | Reanudación desde su corte, o cancelación explícita y nueva solicitud si el origen ya no conserva ese corte | IDs, checkpoints y hashes antes/después del reinicio |
| Se pierde el acuse de una porción o de la publicación | Consulta/reenvío con identidad estable; ningún duplicado comercial ni mezcla de bytes | Registro del país y resultado de reintento |
| Se publican dos candidatas para la misma base | Sólo una transición compatible gana; la otra requiere recalcular o revisión | Token de fencing, versión esperada y conflicto registrado |
| Una carga manual contiene datos viejos o de otra entidad | Mismos controles que la programada; no elude permisos, secuencia ni vigencia | Rechazo visible y ausencia de activación |
| El origen no permite un corte consistente | La capacidad no se habilita; se solicita un contrato de exportación/deltas verificable | Limitación y responsable registrados, sin simular éxito |
| La carga compite con trabajo financiero | Límites independientes y cola/presupuesto de publicación acotados | Medición de ambos tipos de trabajo bajo carga representativa |
| País se restaura o se pierde el almacenamiento de paquetes | Manifiestos y porciones se recuperan de copia independiente o del origen con el mismo contenido validado; no se sirve una versión incompleta | Ensayo de restauración, retención y hashes de la versión servida |

La aceptación se vincula a [F03-V03](/guide/roadmap/phase-03/#f03-v03) y [F03-V08](/guide/roadmap/phase-03/#f03-v08); [F03-02](/guide/roadmap/phase-03/#work-f03-02) implementa el contrato. La observación [OBS-PE-01](/guide/evidence/country-comparison/#obs-pe-01) sustenta la necesidad de confirmar la autoridad de SIGE y las monedas; no demuestra que sus interfaces cumplan este diseño. Producto/comercial, el dueño del origen, integración y plataforma deben confirmar alcance, política de publicación, vigencia y retención. Esas aprobaciones siguen pendientes.
