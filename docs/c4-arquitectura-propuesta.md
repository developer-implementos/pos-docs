# Modelo C4 de la arquitectura propuesta del POS

Fecha de revisión: 29 de octubre de 2026. Alcance: arquitectura de referencia para Chile, Perú y España; no certifica software, topología ni integraciones desplegadas.

La [propuesta y sus decisiones](propuesta-arquitectura.md) gobiernan la recomendación. Estas vistas explican sus límites, procesos y responsabilidades. **`pos-desktop` y `pos-mobile` representan aplicaciones completas: shell nativa Tauri o Capacitor, respectivamente, con el frontend Angular/PrimeNG dentro**. La [vista de composición](decisions/native-clients.md#shell-nativa-y-frontend) separa shell nativa, frontend y biblioteca `libs/client-shell` de composición Angular. La base técnica NestJS/Fastify y los scaffolds no acreditan los contratos comerciales, persistencia o integraciones aquí propuestos. El [estado del monorepo](monorepo.md#estado-de-implementación) delimita lo implementado; el [catálogo de integraciones](catalogo-integraciones-actuales.md) conserva la evidencia del legado.

## Explorador general de arquitectura

[Abrir el mapa interactivo](/architecture/) · [Abrir el SVG completo](/docs/architecture/pos-platform.svg).

El explorador reúne las siete aplicaciones, sus tecnologías, los almacenes y las integraciones en una vista de clientes, sucursal, plataforma de país y red autorizada del ERP. Es un **mapa compuesto de arquitectura y despliegue**; las vistas C1, C2 y C3 de esta página conservan su alcance propio. No representa el nivel de código de C4 ni una topología productiva comprobada.

Las conexiones explican quién inicia la interacción, su propósito y su contrato: API HTTPS, lectura o escritura de datos, entrega asíncrona y relación condicional. El mapa distingue el transporte del commit que confirma custodia y de los resultados de pago, fiscalidad o ERP. Redis para caché, BullMQ para trabajos y RabbitMQ para distribución mantienen su condición de candidatos según los [contratos de caché y mensajería](#caché-de-país-opcional); el espejo comercial durable de sucursal permanece en PostgreSQL.

El [manual del explorador](../tools/architecture/README.md) identifica el modelo, las salidas y las comprobaciones para mantener esta vista alineada con la propuesta. Las galerías editables de Excalidraw y draw.io permiten consultar por separado cada vista estructural y dinámica.

## Niveles y alcance

Los nombres funcionales de los diagramas se corresponden con los proyectos del [monorepo](monorepo.md#nombres-de-las-aplicaciones-backend): **Backend de sucursal** es `branch-api`, **Sincronizador de sucursal** es `branch-sync-worker`, **API de país** es `country-api` y el proceso de integración ERP es `erp-worker`. La existencia de estos proyectos no acredita las capacidades de negocio futuras representadas en las vistas.

También está disponible la [colección editable para draw.io](diagramas-drawio/README.md), con un [atlas de nueve pestañas](diagramas-drawio/00-atlas-completo.drawio), archivos individuales y un [paquete ZIP](diagramas-drawio/diagramas-c4-drawio.zip).

La [galería de Excalidraw](diagramas-excalidraw/index.html) ofrece siete vistas estructurales y dos dinámicas complementarias, con diagramas nativos editables, leyendas, responsabilidades, condiciones de fallo y fuentes. Incluye un [atlas completo](diagramas-excalidraw/00-atlas-completo.excalidraw) y un [paquete descargable](diagramas-excalidraw/diagramas-c4-excalidraw.zip). La [guía de edición](diagramas-excalidraw/README.md) explica cómo abrir y mantener la colección.

C4 distingue contexto, contenedores, componentes y código. Esta propuesta desarrolla C1, C2, cuatro ampliaciones C3 y despliegue. No hay suficiente diseño de implementación para dibujar clases como si ya estuvieran aprobadas. [Definición oficial de las vistas](https://c4model.com/diagrams).

| Vista | Pregunta | Alcance | Fuente editable |
| --- | --- | --- | --- |
| C1 · Contexto | ¿Quién usa el POS y con qué sistemas se relaciona? | Un sistema y su entorno | [c4-context.mmd](diagramas-excalidraw/mermaid/c4-context.mmd) |
| C2 · Contenedores | ¿Qué aplicaciones, procesos y datos lo componen? | Interior del POS corporativo, con colaboradores externos | [c4-containers.mmd](diagramas-excalidraw/mermaid/c4-containers.mmd) |
| C3 · Backend | ¿Cómo se organiza el backend local? | **Un proceso** NestJS + Fastify de sucursal | [c4-backend.mmd](diagramas-excalidraw/mermaid/c4-backend.mmd) |
| C3 · Sincronización | ¿Cómo entrega eventos y activa precios? | **Un proceso** de sincronización de sucursal | [c4-sync.mmd](diagramas-excalidraw/mermaid/c4-sync.mmd) |
| C3 · API de país | ¿Cómo recibe operaciones y entrega trabajo e información? | **Un proceso** `country-api` | [c4-country.mmd](diagramas-excalidraw/mermaid/c4-country.mmd) |
| C3 · Integración ERP | ¿Cómo traduce y concilia sin exponer el ERP? | **Un proceso** `erp-worker` dentro de su red autorizada | [c4-erp.mmd](diagramas-excalidraw/mermaid/c4-erp.mmd) |
| Complemento · Despliegue | ¿Dónde se ejecutan las instancias? | Una tienda y su plataforma de país, como referencia | [c4-deployment.mmd](diagramas-excalidraw/mermaid/c4-deployment.mmd) |

Un **contenedor C4** es una aplicación o un almacén de datos. No equivale necesariamente a un contenedor Docker. C2 muestra tecnología, comunicación y reparto de responsabilidades; clustering, failover y servidores pertenecen al despliegue. [Definición oficial de C2](https://c4model.com/diagrams/container).

C3 amplía un solo contenedor. Los componentes interiores de `branch-api`, `branch-sync-worker`, `country-api` y `erp-worker` llaman código del mismo proceso; no son microservicios. Los colaboradores fuera del borde conservan su tipo de contenedor o sistema externo. [Definición oficial de C3](https://c4model.com/diagrams/component).

**Despliegue es un diagrama complementario, no “C4 nivel 4”.** Representa instancias en nodos de ejecución. En este caso la infraestructura definitiva, sistema operativo, alojamiento de país y alta disponibilidad siguen pendientes de validación. El nivel cuatro de C4 sería código. [Definición oficial de despliegue](https://c4model.com/diagrams/deployment).

## Notación y lectura

Se usa Mermaid como notación para el modelo C4. Cada bloque arquitectónico lleva nombre, tipo, tecnología y responsabilidad. Las flechas dirigidas identifican al iniciador de la relación y nombran propósito/protocolo; una respuesta pertenece a ese mismo contrato. Los bordes discontinuos delimitan sistema, proceso o nodo según su título. Esta elección sigue el carácter independiente de notación de C4. [Guía oficial de notación](https://c4model.com/diagrams/notation).

- Azul `#0545BA`: software del POS. Violeta: almacén de datos. Gris: sistema externo. Azul oscuro: rol humano. Ámbar: infraestructura o condiciones. Los nombres y tipos mantienen el significado sin depender del color o de la forma.
- En C3, estar dentro de un borde significa compartir proceso, no estar en un clúster de microservicios.
- En despliegue, los bordes son equipos o entornos de ejecución; `x N` representa varios puestos, sin inventar una cantidad de cajas productivas.
- C1 identifica al producto y sus colaboradores, sin aplicaciones internas. C2 conserva la frontera del sistema y explicita las siete aplicaciones, los almacenes y las responsabilidades pendientes de asignación. Despliegue distingue puestos, móviles, servidor de sucursal, plataforma de país y red autorizada del ERP.
- LAN: red de sucursal. WAN: conexión a la plataforma de país. ACL: capa anticorrupción que traduce un contrato externo. ACK: acuse de aplicación tras el commit local requerido.
- Los conectores de datos nombran la operación y el motor: **PostgreSQL** para sucursal y país; **SQLite** para el diario técnico de `device-agent`. La ubicación se lee en el almacén y su frontera. La ficha o el flujo detallado especifica qué cambios comparten una transacción. Tanto `branch-api` como `branch-sync-worker` acceden al PostgreSQL de sucursal y utilizan transacciones para los cambios que deben confirmarse juntos: negocio, auditoría y outbox en la venta; inbox aplicada, puntero y cursor en la activación de una versión comercial. Las llamadas remotas, descargas y efectos físicos quedan fuera de esas transacciones; una conexión no implica que todo su trabajo sea una única transacción.
- “Por confirmar”, “condicional” y “por homologar” son límites del diseño. No declaran proveedor, contrato o SDK aprobado.

La galería presenta SVG con enlaces al archivo completo y a su fuente editable. Los diagramas incluyen fichas de responsabilidad, propiedad de datos, continuidad y fuentes. Son documentos de consulta; no ejecutan solicitudes a servicios corporativos.

## C1: límites del sistema

En la propuesta, el POS permite al cajero operar, al supervisor autorizar/revisar y a operación de plataforma supervisar recuperaciones. Esas personas representan responsabilidades objetivo, no un inventario de los perfiles activos del legacy. Los sistemas externos son la fuente autorizada de maestros/precios, el sistema financiero de cada país y los proveedores de pago/fiscalidad. El contexto no confunde esos sistemas con módulos internos ni con una base única de todos los países. [Propósito del contexto C4](https://c4model.com/diagrams/system-context).

**ERP por país.** Chile: Dynamics AX on-premise. España: Gira, según antecedente confirmado; interfaces y capacidades por validar. Perú: sistema custom, con contrato por relevar. El nodo representa el sistema que corresponda al país observado; no tres ERP dentro de un único proceso ni un adaptador común ya productivo. La migración a un ERP futuro exige preservar destino y versión de operaciones pendientes.

**Maestros y precios.** El propietario debe identificarse por dato y país. No se adjudica automáticamente al ERP ni al backend POS. Deben acordarse publicación, vigencia, correcciones y disponibilidad de deltas/cargas completas. El espejo local no convierte a cada sucursal en autora independiente de precios.

**Pago y fiscalidad.** Son efectos distintos de la confirmación local y de la integración ERP. Un pago incierto no se repite automáticamente; un acuse de sincronización no prueba aceptación fiscal. Operar sin WAN depende de capacidades y políticas validadas, no de disponer de disco local.

Los ejemplos dentro de los nodos concretan su significado: **Transbank POS, Niubiz y Mercado Pago Point** representan productos de pagos; **Acepta/Ingydev y EFACT**, soluciones de facturación. **SII y SUNAT son autoridades tributarias**, distintas del proveedor de software. La ficha de cada nodo y la [matriz de proveedores](extensibilidad-proveedores-dispositivos.md#ejemplos-reales-pagos-facturación-y-autoridad-tributaria) separan evidencia del legado/reuniones de ejemplos ilustrativos. Los nombres no acreditan integración, elección ni homologación en POS Platform; tampoco implican que una operación se envíe a todos ellos.

## C2: procesos, persistencia y propiedad

| Contenedor | Tecnología recomendada | Responsabilidad y autoridad |
| --- | --- | --- |
| `pos-desktop` | Shell nativa Tauri; frontend Angular/PrimeNG | Aplicación de escritorio completa: presentación y comandos del puesto, sin credenciales SQL ni otra base de ventas por defecto. |
| `pos-mobile` | Shell nativa Capacitor; frontend Angular/PrimeNG | Aplicación móvil completa: operaciones habilitadas bajo la autoridad de sucursal. Empaquetar la UI no habilita autonomía sin LAN. |
| `device-agent` | C#/.NET · Windows; adaptadores homologados por modelo | Aplicación autónoma propuesta, inicialmente instalada en el puesto Windows (F02/F05). Inicia HTTPS LAN hacia `branch-api`; dispositivos de red y acceso compartido de puestos/móvil se homologan después en F06. |
| Diario técnico de periféricos | SQLite local, propiedad de `device-agent` | Recepción, hashes, intentos y evidencia pendiente; sin autoridad de ventas ni credenciales PostgreSQL. No equivale a confirmación física. |
| `branch-api` | NestJS + Fastify / Node.js | Monolito modular, escritor de negocio de la tienda. Confirma operación, auditoría y outbox en una transacción. |
| Datos de sucursal | PostgreSQL | Negocio local, estado técnico de sincronización y espejo autorizado de catálogo/precios/promociones. `devices` conserva trabajos autorizados, asignación, auditoría y observaciones de periféricos. Un primario autorizado compartido por los puestos. |
| `branch-sync-worker` | Worker TypeScript / Node.js supervisado | Entrega outbox, aplica inbox/cursor y prepara publicaciones locales. Permisos acotados a datos técnicos y espejos; no reescritura libre de ventas. |
| `country-api` | NestJS + Fastify / Node.js | Recepción autenticada; confirma **inbox + efecto/proyección local + outbox** en un commit antes del ACK de aplicación. Sirve trabajo, resultados, deltas y versiones publicadas. |
| Publicación de maestros · capacidad propuesta | `erp-worker` prepara; `country-api` conserva autoridad de publicación | `MasterDataSourcePort` obtiene el corte del origen autorizado, prepara y envía paquetes inmutables por HTTPS. Identidad, claims y recursos separados de comandos financieros. El origen, conector y homologación siguen pendientes; no es una aplicación adicional. |
| Datos operativos de país | PostgreSQL | Inbox/outbox, proyección, publicaciones versionadas y referencias de integración. No otra autoridad simultánea para editar ventas originadas en tienda. |
| `erp-worker` | Worker NestJS / Node.js y adaptadores por contrato | En la red autorizada del ERP, solicita trabajo y entrega resultados mediante HTTPS saliente a `country-api`. Compone la ACL; no accede por SQL a la base de país. |
| Caché de país · opcional | Redis, candidato sujeto a medición | Acelera lecturas derivadas de `country-api`. Se reconstruye desde PostgreSQL; no conserva la única copia de dinero, pendientes ni autorizaciones financieras. |

“Un escritor” combina dos reglas: **un primario autorizado de la base por sucursal** y **una autoridad de negocio para cada dato**. No significa una única conexión SQL. El backend escribe negocio; el worker puede escribir su inbox/outbox, cursores, staging y publicaciones bajo un contrato acotado. Si una recepción requiere cambiar negocio local, debe pasar por su caso de uso autorizado; un job genérico no puede modificar dinero arbitrariamente.

El canal sucursal–país parte de **lotes HTTPS durables con identidades, versión de contrato y cursores**. El emisor conserva outbox. Para aceptar una operación en país, el receptor confirma **inbox, efecto local pactado y outbox en la misma transacción antes del ACK de aplicación**; guardar únicamente una recepción para aplicarla después no acredita ese hito. El efecto pactado es el registro operativo/proyección del evento, no la llamada al ERP ni toda proyección futura. La recepción por partes de maestros y de comandos de periféricos tiene otros acuses, definidos en el [contrato de sincronización](propuesta-arquitectura.md#sincronización-y-consistencia). RabbitMQ/Kafka no son requisitos iniciales ni sustituyen la atomicidad y deduplicación.

Las flechas hacia proveedores son contratos lógicos: una API remota puede ejecutarse desde backend; un SDK local homologado se ejecuta mediante `device-agent`. El agente obtiene trabajos y reporta evidencia directamente a `branch-api` mediante HTTPS LAN iniciado por el agente. Los clientes solicitan y consultan trabajos al backend, sin actuar como relés. El [ADR-17](decisions/device-agent.md) distingue perfil inicial por puesto F02/F05 y evolución de red/estación compartida F06, con acuses, SQLite y recuperación. Migrar impresión no acredita un adaptador de pagos.

### Aplicaciones, bibliotecas y estado

Las rutas siguientes expresan la composición objetivo del [monorepo](monorepo.md), incluidas capacidades pendientes; no describen todos los imports del scaffold actual. Las aplicaciones componen bibliotecas y fijan el arranque. Las bibliotecas no añaden procesos ni bases por existir en Nx.

| App | Rol y datos bajo su contrato | Composición objetivo | Estado verificable y objetivo |
| --- | --- | --- | --- |
| `pos-desktop` | Interfaz del puesto; estado de UI, sin autoridad SQL | `libs/client-shell`, `libs/features`, `libs/shared/frontend/ui` y adaptadores de cliente | UI demostrativa y host Tauri; backend real y hardware por integrar/homologar |
| `pos-mobile` | Interfaz móvil; mismo contrato de sucursal | Composición compartida de cliente y host Capacitor | UI demostrativa; capacidades Android/iOS por validar |
| `device-agent` | Recepción e intentos; SQLite técnico local | Host .NET y adaptadores Windows privados; contratos públicos de `devices` | Decisión acordada; proyecto, protocolo y homologación pendientes |
| `branch-api` | Casos de uso y negocio en PostgreSQL de sucursal | Contextos de `libs/backend/`, `libs/country-policies` y `libs/shared/backend/` | Arranque, configuración, logs y sondas; persistencia y operaciones comerciales pendientes |
| `branch-sync-worker` | Entrega, inbox, cursores y candidatas locales; negocio mediante su módulo dueño | `libs/backend/sync`, contratos de `catalog`/`pricing`, `libs/shared/backend/worker` | Scaffold de proceso; entrega durable, programación y activación pendientes |
| `country-api` | Recepción durable, registro operativo, publicaciones y resultados en PostgreSQL de país | `libs/backend/sync`, `catalog`, `pricing`, `reporting`, `administration`; contratos y casos de uso públicos de `erp`; base técnica compartida | Scaffold; composición ampliada, autenticación, recepción transaccional y APIs comerciales pendientes |
| `erp-worker` | Traducción, intentos y conciliación; preparación de paquetes de maestros en capacidad aislada; estado del POS mediante API de país | `libs/backend/erp`, contratos de `catalog`/`pricing` y sincronización, `libs/shared/backend/worker` | Scaffold sin conexión ERP/origen; contratos, adaptación, publicación y recuperación por implementar |

`libs/shared/backend/` agrupa arranque, configuración validada, adaptación HTTP, observabilidad, sondas y ciclo de vida de workers. Pino y la integración **opt-in** de Sentry pertenecen a esa base técnica; no son aplicaciones comerciales. `libs/shared/contracts` delimita sobres técnicos y `libs/shared/kernel` el modelo mínimo compartido, sin absorber todos los DTO o reglas de los contextos. La organización completa de esas bibliotecas y las capacidades objetivo conservan el estado indicado en el monorepo.

## C3 del backend: módulos de un único proceso

1. **API de comandos** valida entrada e identidad y entrega el contexto a acceso/permisos.
2. **Acceso y permisos** propone comprobar usuario, puesto, sucursal, vigencia y capacidad operativa en el backend. Evoluciona el login, los perfiles y los accesos a módulos/submódulos existentes; la matriz por operación, las aprobaciones y las autorizaciones offline requieren diseño y validación.
3. **Ventas/devoluciones** coordina el caso de uso; **turnos/caja** controla apertura, movimientos y cierre.
4. **Precios/ofertas** calcula desde una versión PostgreSQL local completa, validada e inmutable. Snapshot y deltas construyen candidatas aisladas; no se parchea la activa. La versión aplicada queda asociada a la cotización/venta.
5. **Pagos** y **fiscalidad** gestionan sus propios intentos, referencias y resultados. Su protocolo de recuperación depende de capacidades acreditadas.
6. **Persistencia transaccional** confirma cambios locales, auditoría y outbox juntos. Las llamadas externas no quedan dentro de una transacción SQL abierta.

La separación es de responsabilidades y contratos de código. No se despliega un proceso HTTP por cada bloque. El backend no consulta obligatoriamente el ERP ni un precio remoto al confirmar una venta habilitada para operar sin WAN.

La vista agrupa `sales`, `returns`, `collections` y `cash` para operación; `catalog` y `pricing` para consulta y cálculo comercial; `payments`, `fiscal` y `devices` para efectos y capacidades externas; `administration` y `reporting` para configuración y consulta. `sync` aporta el contrato de outbox dentro de la transacción de negocio; el transporte lo ejecuta `branch-sync-worker`. Son contextos de `libs/backend/`, con propiedad propia de datos. La base de `libs/shared/backend/` aporta configuración, logs Pino, Sentry opt-in y sondas sin asumir esas reglas de negocio.

El diseño de acceso incorpora los usuarios, perfiles y accesos vigentes del legacy; el [análisis de Mountain](analisis-repositorios/mountain-implementos.md#login-perfiles-y-alcance-de-los-permisos) documenta login/JWT, controles de menú y autenticación de rutas, además de una autorización de devolución solicitada por correo. La autorización granular de las operaciones propuestas requiere implementación y validación; el diagrama no acredita que ya exista.

## C3 de sincronización: entrega y activación de precios

**Salida de operaciones.** El planificador admite trabajo según calendario, límites y capacidad. El emisor reclama filas confirmadas de outbox y envía lotes con las mismas identidades en cada reintento. La API de país confirma **inbox + efecto/proyección local + outbox** antes de responder con el ACK de aplicación. Si se pierde el acuse, el reenvío no cambia la identidad: la deduplicación identifica lo ya aplicado. Este ACK local no es el resultado ERP; los workers integran posteriormente el trabajo ya confirmado.

**Entrada incremental.** El receptor consulta cambios y acuses con cursores durables. La deduplicación comprueba identidad, contrato y orden. **Inbox recibida, staging y cursor de recepción** permiten recuperar descargas; recibido no significa aplicado. Los deltas construyen una candidata aislada y completa que atraviesa el mismo validador que una carga masiva. No existe un camino directo de deduplicación a activación que salte ese validador.

**Carga masiva y recuperación manual.** Descarga y validación pesada quedan fuera de la transacción final. El activador de sucursal confirma **inbox aplicada, puntero de versión y cursor aplicado** en un commit corto; un paquete incompleto nunca cambia la versión activa. El contrato detallado y el ejemplo `v40` → `v41` se mantienen en [Publicación y activación de versiones comerciales](propuesta-arquitectura.md#publicación-y-activación-de-versiones-comerciales). La extracción/preparación en `erp-worker` y la publicación de país se precisan en el [contrato del productor](contracts/master-data-publication.md); no deben confundirse con esta activación local.

Una venta iniciada conserva la versión que explica su cálculo, pero fijarla no prolonga su vigencia. El backend revalida antes de comenzar el pago según la [política de cotización pendiente de acuerdo](propuesta-arquitectura.md#vigencia-de-la-cotización-y-comienzo-del-pago). Un intento ya iniciado conserva identidad e importe mientras se resuelve. Cargas y deltas deben tener fuente, resultado y versión auditables; el diseño no afirma que las fuentes actuales expongan ya esos contratos.

La entrega puede ser al menos una vez; el efecto local se protege mediante restricciones e inbox transaccional. No se promete exactamente una vez para efectos financieros o fiscales externos. Un restore puede retroceder negocio y deduplicación: retención, replay y conciliación deben ensayarse. [Casos adversos de recuperación](revision-resiliencia-datos-pos.md).

El proceso compone `libs/backend/sync` con los contratos de `catalog` y `pricing`. Su base técnica compartida aporta configuración, logs, correlación y cierre supervisado. No necesita un listener HTTP de negocio para ejecutar tareas y no escribe operaciones financieras evitando sus casos de uso.

## C3 de país: recepción, consulta y entrega de trabajo

`country-api` es un único proceso NestJS/Fastify. Sus módulos agrupan acceso por país/entidad, sincronización, consultas, publicaciones comerciales y seguimiento de integración:

1. **Entrada y autorización** valida identidad, contrato, país, entidad y límites del lote. La identidad autenticada determina el ámbito; no basta confiar en un campo del payload.
2. **Recepción transaccional** confirma inbox, efecto operativo requerido y siguiente outbox juntos en PostgreSQL antes del ACK. Los resultados por evento permiten reanudar entregas parciales sin duplicar efectos.
3. **Trabajo y resultados ERP** expone los contratos y casos de uso públicos de `libs/backend/erp`, propietario de destinos, referencias y estados ERP en PostgreSQL de país. Entrega operaciones con identidad, destino, versión y claim acotado; recibe los resultados del worker mediante cambios de estado condicionales. La expiración de un claim no cancela un efecto externo ya iniciado.
4. **Consultas y publicaciones** sirve proyecciones, acuses y versiones completas de maestros. `country-api` mantiene solicitudes, manifiestos y el puntero de publicación; `erp-worker` prepara paquetes mediante `MasterDataSourcePort` en la red autorizada del origen. La autoridad de publicar pertenece a `catalog`/`pricing`, con transporte `sync`; no se ejecutan extracciones pesadas en una petición HTTP. El [contrato de publicación](contracts/master-data-publication.md) separa claims, permisos y recursos del trabajo financiero.
5. **Acceso a datos y caché opcional** mantiene PostgreSQL como autoridad. Redis, si se adopta para lecturas medidas, sigue el contrato de caché siguiente.

La composición objetivo usa `libs/backend/sync`, `catalog`, `pricing`, `reporting` y `administration`, los contratos y casos de uso públicos de `erp`, y `libs/shared/backend/`. `sync` conserva transporte, acuses y deduplicación técnica; `erp` mantiene el trabajo y los resultados de integración. La ACL y los adaptadores se ejecutan solo en `erp-worker`, sin incorporarse a `country-api`. Esta ampliación y su persistencia están pendientes; no se atribuyen al scaffold actual. Configuración, Pino, Sentry opt-in, validación HTTP y sondas son soporte transversal. Una sonda saludable no acredita una integración ERP correcta ni ausencia de backlog.

## C3 de integración ERP: ejecución dentro de la red autorizada

`erp-worker` inicia una conexión HTTPS autenticada hacia `country-api` para solicitar trabajo y entregar resultados. Corre en la red autorizada del ERP; no necesita exponer AX a Internet ni conectarse por SQL a PostgreSQL de país. La respuesta a esa solicitud forma parte del mismo contrato saliente.

El proceso compone **admisión y límites por destino**, **cliente de trabajo/resultados**, **fachadas de integración**, **ACL y adaptadores**, y **consulta/conciliación de resultados inciertos**. `libs/backend/erp` conserva referencias, traducción de estados, moneda, impuestos y destino; los contratos técnicos y el ciclo de vida usan `libs/shared/`. La ACL es código dentro del worker, no otro servicio HTTP obligatorio.

La capacidad propuesta `masters.prepare` compone `MasterDataSourcePort` y los contratos de `catalog`/`pricing` para extraer y preparar un corte del origen autorizado, que puede ser ERP u otro maestro. Entrega paquetes por HTTPS a país, con identidad, claims y concurrencia independientes de `erp.execute`. Su despliegue exige acceso aprobado al origen; no se afirma que SIGE o los ERP actuales expongan el contrato necesario. Los perfiles de [identidad entre fronteras](contracts/identity-and-trust.md) gobiernan alta, rotación, revocación y prueba de posesión.

Cada intento conserva la identidad de negocio y el destino asignado. Ante un timeout, consulta o concilia según el contrato externo antes de repetir un efecto monetario. Reintentos, ventanas y concurrencia protegen al ERP; un lock local no demuestra que el remoto no haya ejecutado. La persistencia de resultados en país se confirma por API. Si se necesita una custodia técnica local adicional para un adaptador, debe diseñarse y validarse; el diagrama no inventa otra base de ventas.

Las interfaces de AX, Gira y el sistema peruano siguen por verificar. Los adaptadores legacy aportan evidencia y candidatos de compatibilidad, no acreditan el conector objetivo. [Contratos y adaptación por país](propuesta-arquitectura.md#integración-de-los-sistemas-actuales).

## Caché de país opcional

**Redis es un candidato opcional para caché de país, no una dependencia del perfil inicial.** Su consumidor propuesto es `country-api`, para lecturas derivadas y repetidas que toleren una frescura acordada. Antes de adoptarlo se identifica una consulta, carga, ahorro medido y dueño operativo. La base propuesta conserva PostgreSQL + HTTPS + workers; el [ADR de transporte](propuesta-arquitectura.md#decisiones-de-arquitectura) y los [gates de mensajería](investigacion-mensajeria-pos.md#5-matriz-de-decisión-provisional-por-carga-de-trabajo) gobiernan la incorporación de infraestructura.

| Contrato de caché propuesto | Regla |
| --- | --- |
| Autoridad y reconstrucción | PostgreSQL conserva el dato. Un fallo o vaciado de Redis no pierde operaciones; la API puede volver al origen con carga limitada. |
| Ámbito de claves | Incluir país, entidad legal, versión del dato/contrato y alcance de permisos cuando cambie el resultado. La autorización se comprueba antes de leer; un prefijo no constituye aislamiento de seguridad. |
| Frescura | Definir TTL por consulta e invalidación tras el commit. Los datos versionados usan claves de versión; una entrada obsoleta no autoriza una operación financiera. |
| Capacidad y concurrencia | Limitar memoria, tiempo de espera y accesos al origen. Coordinar llenados concurrentes, distribuir expiraciones y probar un arranque en frío para evitar saturar PostgreSQL. |
| Exclusiones | No conservar como única copia ventas, inbox/outbox, deduplicación monetaria, reservas o saldos autorizantes, ni resultados inciertos de pago. No usar una respuesta cacheada como aprobación de crédito, cupón o devolución. |
| Aislamiento y operación | Credenciales y ámbitos propios; medir latencia, aciertos, fallos, memoria y carga de recuperación. La separación lógica no protege de la caída de una instancia física compartida. |

La lectura con caché consulta el origen ante ausencia y reconstruye la entrada. Este patrón admite obsolescencia: se utiliza solo donde el contrato tolere esa ventana; no promete consistencia inmediata por añadir TTL. [Cache-aside, Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside).

El **espejo comercial de sucursal permanece en PostgreSQL**, completo, versionado y con activación atómica. Debe estar disponible durante la caída WAN; una caché remota o descartable no reemplaza ese contrato. Los cambios de precios no alteran el importe de un pago ya iniciado o incierto.

**BullMQ y RabbitMQ resuelven trabajo o transporte, no la caché comercial.** BullMQ es candidato para tareas delimitadas, con backend seleccionado y recuperación probada; hoy documenta Redis y PostgreSQL, siendo Redis la opción predeterminada y más probada. Compartir PostgreSQL no demuestra que el alta de un job participe en el commit de venta. La outbox se conserva salvo evidencia de atomicidad equivalente. [Backends de BullMQ](https://docs.bullmq.io/guide/postgresql).

Si se elige BullMQ con Redis, su almacén requiere persistencia, capacidad y política `noeviction`. Debe separarse de la instancia que descarta entradas de caché por capacidad; otra base lógica en el mismo proceso no aísla memoria ni fallos. Redis recomienda considerar instancias separadas para caché y claves persistentes. [BullMQ en producción](https://docs.bullmq.io/guide/going-to-production), [políticas de Redis](https://redis.io/docs/latest/develop/reference/eviction/).

RabbitMQ central se evalúa cuando haya consumidores independientes, routing o aislamiento que lo justifiquen. No se instala por sucursal ni se añade junto a BullMQ para duplicar la misma responsabilidad. Si se adopta, las vistas identificarán las colas, propietarios, productores y consumidores; un bloque genérico de broker no explica sus contratos. [Colas y topics en C4](https://c4model.com/abstractions/queues-and-topics).

## Despliegue complementario y continuidad

Los clientes de escritorio y móvil consumen por LAN `branch-api`, ubicado con sincronización y PostgreSQL en la sucursal. `device-agent` se instala inicialmente en el mismo puesto Windows que `pos-desktop` y conserva SQLite técnico (F02/F05); su ciclo de vida es independiente de la ventana. La estación compartida y los periféricos de red se habilitan después, en F06, con dispositivos y permisos homologados. Inicia HTTPS LAN hacia `branch-api`. La plataforma de país contiene `country-api`, datos aislados por país/entidad legal y autoridad de publicación. `erp-worker` reside en la red autorizada del ERP/origen e inicia HTTPS hacia país; preparación de maestros y ejecución financiera mantienen recursos e identidades separados. Redis sigue siendo caché opcional. El esquema no impone proveedor cloud ni Docker.

| Situación | Comportamiento objetivo |
| --- | --- |
| Sin WAN, LAN y servidor sanos | Ventas permitidas según versión local, permisos, límites, pago y modalidad fiscal. Outbox conserva pendientes. |
| Sin LAN o backend de sucursal | Se detienen nuevos comandos dependientes. No se crea otra base/escritor de ventas en el puesto. |
| Pago realizado y respuesta perdida | Se preserva identidad y evidencia; se consulta/conciliará si existe esa capacidad. No repetir automáticamente. |
| Plataforma de país o ERP indisponible | Crece atraso observable; se aplica backoff, límites y recuperación, manteniendo separados los estados. |
| Servidor o base restaurados | Se excluye al escritor anterior y se reconstruyen/conciliarán pendientes y resultados. Backup no equivale a failover. |

La autonomía ante pérdida de LAN es **otro perfil** que requiere resolver exclusión, permisos, datos, compensaciones y dispositivos. No forma parte del perfil WAN inicial. La propuesta tampoco acredita RPO/RTO ni alta disponibilidad sin pruebas de recuperación y dimensionamiento.

### Responsabilidades transversales y límites pendientes

- **Identidad y configuración:** autorización de usuario y dispositivo, enrolamiento, rotación y configuración validada deben tener contratos. No se ha seleccionado una nueva app de identidad ni un proveedor corporativo por el hecho de dibujar autenticación.
- **Observabilidad:** los procesos emiten logs correlacionados y métricas operativas; Sentry se habilita expresamente. Telemetría y alertas no son el registro financiero, y su indisponibilidad no debe bloquear commits locales.
- **Recuperación:** PostgreSQL de sucursal y país requieren copias independientes, retención de reconstrucción y ensayos. Las relaciones de backup no implican otro escritor activo; un failover exige excluir al anterior.
- **Publicación de maestros:** fijar propietario de origen, contrato de snapshot/deltas, proceso ejecutor y almacenamiento de artefactos. Redis no resuelve esas decisiones ni acredita que el legado ya exponga versiones consistentes.
- **Operación de país:** definir aislamiento físico, capacidad, supervisión y presupuesto por destino. Los nodos de despliegue representan fronteras propuestas, no servidores contratados o servicios ya operativos.

<span id="mantenimiento-del-modelo-y-del-visor"></span>

## Mantenimiento de los diagramas

Los siete `.mmd` enlazados, ubicados en `docs/diagramas-excalidraw/mermaid/`, son las fuentes de render estructural. No se duplican como bloques Mermaid en este documento. `tools/diagrams/models/c4-data.js` conserva el catálogo canónico de fichas, vistas, límites, IDs y relaciones; `dynamic-data.cjs` define los dos recorridos dinámicos. Cada actualización debe mantener correspondencia con las fuentes. Las escenas editables, los SVG y sus recortes se mantienen en `docs/diagramas-excalidraw/`. El [manual de autoría](../tools/diagrams/README.md) describe los modelos, la generación y sus comprobaciones.

La [presentación de arquitectura y roadmap](editorial/presentation.md) utiliza diagramas resumidos de la misma propuesta, con fuentes y generación propias. Las vistas detalladas de esta página se mantienen en el modelo C4 canónico.

Cada fuente exportable incluye su leyenda. El nodo técnico `legend` pertenece al inventario del render, no a la arquitectura. Los SVG locales se publican ya generados, sin depender de un CDN, cuentas externas ni servicios corporativos.

Validar tras cada cambio: correspondencia de IDs, flechas/contratos, fronteras de proceso, render sin solapamientos, teclado/zoom/desplazamiento, fichas y enlaces. Las decisiones de negocio y tecnología deben actualizarse primero en la propuesta vigente y luego propagarse a estas vistas.
