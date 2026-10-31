# Opciones tecnológicas del POS

Selección tecnológica y condiciones de adopción de la [propuesta de arquitectura](propuesta-arquitectura.md). **El cliente de escritorio `pos-desktop`, con frontend Angular/PrimeNG alojado en la shell nativa Tauri, y el uso de Nx son decisiones de producto. NestJS/Fastify y PostgreSQL son las tecnologías utilizadas en F01 de laboratorio; su habilitación operativa sigue sujeta a los gates de piloto.** Aceptar cliente y Nx no aprueba automáticamente backend, datos, topología, operación ni todos los dispositivos. Este documento no acredita implementación ni despliegue del producto POS objetivo.

**BullMQ con Redis exclusivo de trabajos es la decisión aceptada para país e integración ERP; implementación pendiente.** El [ADR-18](decisions/job-processing.md) delimita programación breve en `country-api` y ejecución, lotes y conciliación en `erp-worker`, con instancias separadas. PostgreSQL + outbox/inbox conserva autoridad y permite reconstruir jobs; HTTPS cruza los entornos. Redis de caché sigue siendo opcional y separado. La [guía de mensajería](investigacion-mensajeria-pos.md) explica los recorridos y la [revisión corporativa](revision-arquitectura-corporativa.md) conserva el contexto de mediación y retirada del legado.

La [revisión de la plataforma corporativa](analisis-repositorios/aportes-plataforma-corporativa.md) encontró precedentes de Nx, NestJS/Fastify, Pino y Sentry en Core. Core es referencia de organización y convenciones; el POS no consume sus bibliotecas ni servicios. La estructura del producto agrupa los mecanismos técnicos propios en `shared/`, con fronteras y controles definidos en la [guía del monorepo](monorepo.md).

La evaluación de **servicios de IA** está en [Propuestas de IA para el POS](servicios-ia-pos.md). Compara tareas y alternativas convencionales antes de seleccionar generación de texto, búsqueda semántica, OCR o modelos de anomalías. Los proveedores y runtimes son candidatos; se conservan contratos propios, autonomía del núcleo, autorización de datos y alternativas offline. Incorporar IA no obliga a otro motor de base ni a un modelo por caja.

## 1. Estado de las alternativas

**Evolución futura adicional:** [RFID y autoservicio](evolucion-rfid-autoservicio.md). Evaluar lectores/antenas/etiquetas junto con los productos y el entorno físico, detrás de contratos de captura. RFID no obliga a cambiar NestJS, Tauri o el motor de datos, ni a crear un POS distinto por fabricante. SDK, middleware del lector y configuración regional requieren homologación. El eventual conteo se integra con el dueño de inventario; no introduce autoridad de stock en caja por defecto.

| ID | Opción evaluada | Evaluación y recomendación inicial | Decisión pendiente |
| --- | --- | --- | --- |
| TEC-01 | NestJS con Fastify en lugar de Express | Backend recomendado de sucursal y país. Monolito modular en sucursal; workers supervisados según responsabilidad. | Aprobación técnica, compatibilidad, experiencia del equipo, recursos locales, versiones y alcance de migración. |
| TEC-02 | Usar `nestjs-pino` y Sentry | Pino para logging estructurado; Sentry para errores y trazas, con política de captura, correlación y operación desconectada. | Retención, datos permitidos, alojamiento, presupuesto de telemetría y validación de integración. |
| TEC-03 | Aplicación cliente de escritorio con shell nativa Tauri en lugar de navegador | Dirección de cliente aceptada: `pos-desktop`, con frontend Angular/PrimeNG alojado en Tauri, para puestos físicos de caja. Administración/reporting podrían continuar en navegador. | Homologación de periféricos, empaquetado, distribución y soporte Rust/WebView2; esta dirección no amplía el perfil offline. |
| TEC-04 | Usar Nx | Dirección indicada para organizar el producto, sus contratos y tareas de construcción/validación; se recomienda un monorepo POS con releases propios. | Alcance del repositorio, límites de proyectos, toolchains, CI, propiedad y estrategia de releases. |
| TEC-05 | Quizás usar un monolito modular | Recomendado como punto de partida del núcleo transaccional; plataforma central y workers mantienen límites operativos propios. | Módulos, autoridad de datos, transacciones y criterios para separar procesos/servicios. |
| TEC-06 | PostgreSQL o MongoDB para los datos del POS | Recomendar PostgreSQL de sucursal y PostgreSQL operativo por país; tablas relacionales más JSONB para datos variables acotados. MongoDB se conserva donde haya un caso vigente identificado, sin desplegarlo por defecto en tiendas. | Validación del modelo, carga, recuperación, aislamiento por país, versiones soportadas y transición de consumidores heredados. |
| TEC-07 | BullMQ + Redis exclusivo de trabajos | Decisión aceptada: programación breve en `country-api`; ejecución ERP, lotes y conciliación en `erp-worker`. Redis aislado por entorno y separado de caché. | Implementar y probar relay, reconstrucción desde PostgreSQL, identidad, límites y resultados inciertos; [ADR-18](decisions/job-processing.md). |

La adopción de un framework no demuestra por sí sola integridad de ventas, idempotencia de pagos ni autonomía offline. Esas garantías se establecen en contratos, transacciones, estados y recuperación, y se comprueban con pruebas.

## 2. NestJS y Fastify

**Planteamiento:** usar NestJS para organizar módulos, casos de uso, autorización e integraciones, y Fastify como proveedor HTTP mediante `@nestjs/platform-fastify`. Nest dispone de un adaptador oficial; los middleware específicos de Express requieren revisar compatibilidad o equivalentes Fastify. [Documentación oficial](https://docs.nestjs.com/techniques/performance).

El despliegue recomendado es concreto: **backend de sucursal NestJS + Fastify, compartido por sus cajas y conectado a PostgreSQL de sucursal; backend de país NestJS + Fastify, conectado a PostgreSQL operativo del país**. Los workers reutilizan módulos de aplicación en procesos supervisados y no necesitan exponer HTTP para realizar sus trabajos. Nest admite contextos de aplicación independientes de listeners de red. «Núcleo local» se denomina aquí backend de sucursal para que su ubicación y responsabilidad queden claras. [Aplicaciones independientes de Nest](https://docs.nestjs.com/standalone-applications).

El beneficio buscado es coherencia de código y límites de responsabilidad. No se promete una mejora porcentual del rendimiento del POS a partir de benchmarks HTTP: las consultas SQL, el fan-out entre sucursales y las integraciones remotas observadas pueden dominar la latencia total.

Organización propuesta:

- Módulos de ventas, caja/turnos, catálogo/precios/ofertas, pagos, devoluciones y conciliación.
- Reglas de negocio y casos de uso independientes de objetos HTTP y detalles Fastify.
- Fachadas y ACL para integrar ERPs y proveedores, manteniendo contratos propios del POS.
- Workers de sincronización y conciliación con ciclos de vida y recursos controlables. Compartir módulos no obliga a ejecutar todas las funciones en un proceso.
- Persistencia transaccional e inbox/outbox durables; cron y colas en memoria no sustituyen esos mecanismos.

**Alcance real de la migración:** `api-pagos-caja` usa Express directamente, mientras Mountain, el concentrador y el sincronizador usan AdonisJS. Pasarlos a NestJS exige revisar ORM, transacciones, validación, autenticación y jobs; no es solamente cambiar el servidor HTTP. Los adaptadores .NET y de dispositivos pueden conservarse donde cumplan los contratos.

**Criterio de piloto:** una operación representativa con persistencia, worker y telemetría en hardware de sucursal. Medir latencia de extremo a extremo, memoria, CPU, conexiones y recuperación. Comparar contratos y resultados con el sistema actual sin duplicar efectos externos.

### PostgreSQL en sucursal y país frente a MongoDB

**Recomendación:** una base PostgreSQL por sucursal en el perfil WAN y una base operativa PostgreSQL por país en la plataforma central. «Por país» fija separación de datos y autoridad; instancias, clústeres, réplicas y alojamiento se dimensionan después. No hay una base transaccional por terminal ni una conexión SQL desde la aplicación cliente. El cliente llama a la API; el backend y sus workers autorizados acceden a la persistencia.

| Criterio del POS | PostgreSQL propuesto | MongoDB como alternativa | Criterio de elección |
| --- | --- | --- | --- |
| Venta, partidas, pagos, turnos y devoluciones relacionados | Tablas con claves, referencias y restricciones explícitas; una transacción coordina los cambios locales | Se puede modelar con documentos embebidos o referencias, y usar transacciones cuando se modifican varios documentos | Recomendamos el modelo relacional para estas invariantes y consultas; no suponemos superioridad de rendimiento sin medir |
| Negocio y mensajes pendientes | Venta y outbox en la misma transacción de sucursal; inbox, efecto y outbox en la misma transacción de país | Es posible implementar también un outbox transaccional; requiere diseñar transacciones, sesiones, esquema y configuración de durabilidad | Mantener una sola frontera transaccional por nodo evita escrituras dobles entre motores |
| Reglas variables y payloads de integración | JSONB junto a columnas tipadas para IDs, dinero, estado, país y versión | El modelo documental puede ser adecuado para agregados autocontenidos y proyecciones de consulta | Necesitar JSON no basta para introducir otro motor; evaluar consultas, tamaños, índices y evolución del esquema |
| Operación y evolución del legado | Continúa el motor ya observado en sucursales; centraliza prácticas de migración, backup y recuperación en el objetivo POS | Puede seguir siendo dueño o proyección de datos en servicios existentes que lo justifiquen | La reducción de motores es un objetivo operativo; no autoriza retirar MongoDB ni alterar servicios vigentes sin inventario y transición |

PostgreSQL ofrece restricciones `PRIMARY KEY`, `UNIQUE`, `CHECK` y claves foráneas para expresar parte de esas invariantes. La aplicación sigue siendo responsable de reglas entre operaciones, autorización y recuperación. Las restricciones y pruebas de concurrencia deben diseñarse; instalar PostgreSQL no evita por sí solo una devolución doble. [Restricciones PostgreSQL](https://www.postgresql.org/docs/current/ddl-constraints.html).

JSONB permite consultas e índices sobre JSON, de modo que reglas y payloads variables pueden coexistir con datos relacionales. Se propone limitar su tamaño y darles un contrato/versionado; importes, referencias y estados que soporten invariantes no se ocultan en un documento sin controles. JSONB no conserva formato textual original ni orden de claves: el original firmado o evidencia que requiera bytes exactos se conserva separadamente. [Tipos JSON y diseño de documentos en PostgreSQL](https://www.postgresql.org/docs/current/datatype-json.html).

**MongoDB sí ofrece transacciones ACID multidocumento** en replica sets y clústeres fragmentados. Su documentación advierte que no sustituyen un modelo de datos adecuado y pueden costar más que las escrituras de un solo documento. Los servidores independientes no soportan esas transacciones; la topología, `read concern` y `write concern` forman parte de la evaluación. Esta es una diferencia operativa que debe probarse, no una razón para afirmar que MongoDB carece de transacciones. [Transacciones](https://www.mongodb.com/docs/manual/core/transactions/), [consideraciones de producción](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

La decisión podría revisarse para una **proyección documental delimitada**, con propietario, consultas y métricas que demuestren beneficio sobre PostgreSQL/JSONB, sin hacerla autoridad simultánea de la misma venta. No recomendamos dual write «venta en PostgreSQL, outbox o réplica obligatoria en MongoDB»; una proyección en otro motor se alimentaría después del commit por eventos y podría reconstruirse. Las fuentes MongoDB actuales de catálogo/precios no obligan a instalar MongoDB en sucursal: el adaptador publica contratos del dominio y el POS mantiene su espejo local autorizado.

### Schemas, transacciones y espejos locales

Los nombres siguientes describen propiedad lógica, no un esquema implementado. Se propone una sola base de sucursal con schemas/tablas por módulo y acceso a través de sus interfaces:

| Propietario | Datos propuestos | Escritura permitida |
| --- | --- | --- |
| Ventas y caja | Venta, partidas, aplicación de importes, turno, movimientos y referencias de devolución | Casos de uso del módulo; una unidad de trabajo comparte transacción cuando una invariante lo requiere |
| Pagos y fiscalidad | Intentos, referencias externas, resultados inciertos, respuestas y evidencias | Sus módulos y adaptadores por comandos; nunca equiparar commit de venta con pago autorizado o documento aceptado |
| Precios/maestros | Espejos de catálogo, clientes permitidos, precios y promociones, con versión, vigencia y origen | Consumidor de distribución autorizado; el uso local es lectura y cálculo, no edición implícita del maestro corporativo |
| Sincronización | Outbox, inbox, cursor, intentos, entrega y acuses | Productores insertan outbox dentro de la transacción de negocio; workers solo actualizan metadatos de entrega y llaman al módulo receptor |
| Módulos de país | Inbox y proyecciones consolidadas, distribución, conciliación y outbox por destino | Transacción propia de país; la copia de una venta de sucursal no habilita otro editor de su historia |

La inserción de outbox participa en **la misma conexión y transacción** de PostgreSQL que el cambio de negocio; no basta usar dos repositorios que apunten al mismo servidor. En recepción, una clave única de origen + consumidor + ID de evento y la verificación del contenido soportan deduplicación: mismo ID y otro contenido se rechaza. Inbox, efecto de recepción y nuevos mensajes se confirman juntos antes del ACK. Las garantías se prueban con reinicios, mensajes repetidos y acuses perdidos. [Transacciones PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html).

Para precios y promociones se recomienda un espejo de lectura PostgreSQL de sucursal con **deltas por eventos, carga masiva programada y conciliación manual controlada**. La carga se prepara y valida antes de activar un conjunto coherente; la venta registra la versión aplicada. El dueño de cada dato, la cobertura de eventos, vigencias y política de datos vencidos requieren contrato. Esto elimina la consulta central obligatoria del camino de venta permitido offline sin convertir a la sucursal en autora del precio corporativo. El funcionamiento se desarrolla en [Operación de caja y evolución](operacion-caja-y-evolucion.md).

## 3. Pino, `nestjs-pino` y Sentry

### Logging y correlación

Fastify utiliza Pino cuando se habilita su logger. `nestjs-pino` permite integrarlo con el logging de Nest y contexto de solicitudes. Se propone una política centralizada y un único mecanismo de logging automático HTTP, evitando duplicar registros. La opción `useExisting` requiere atender las diferencias entre contexto HTTP, ciclo de vida y otros contextos descritas por la biblioteca. [Fastify Logging](https://fastify.dev/docs/latest/Reference/Logging/), [nestjs-pino](https://github.com/iamolegga/nestjs-pino).

Campos propuestos, según disponibilidad y política de datos:

| Ámbito | Campos de referencia |
| --- | --- |
| Aplicación y despliegue | `service`, `release`, `environment` |
| Origen de la operación | `country`, entidad legal, `storeId`, `terminalId` |
| Diagnóstico | `requestId`, `traceId`, correlación y duración |
| Negocio e integración | `saleId`, `paymentId`, `eventId`, ID de intento y estado |

Los IDs de negocio permanecen estables aunque un reintento tenga otro request/trace ID. En workers se crea y propaga contexto explícitamente. Se propone JSON en producción y una vista legible durante desarrollo. La política debe excluir credenciales, tokens, datos de tarjeta y datos personales innecesarios; no registrar cuerpos completos por defecto.

### Sentry

Usar el SDK oficial `@sentry/nestjs`, inicializado antes de los módulos que debe instrumentar, con versión/release identificable y source maps. Integrar los filtros de excepciones y aislar el contexto de trabajos en segundo plano para no mezclar información entre operaciones. [Guía NestJS de Sentry](https://docs.sentry.io/platforms/javascript/guides/nestjs/).

Sentry ofrece integración con Pino para capturar logs y, opcionalmente, errores. Definir niveles, muestreo y quién captura cada excepción, evitando enviarla varias veces desde un filtro, el logger y una llamada manual. La selección de versiones debe respetar la compatibilidad del SDK y la integración; no se ha fijado aquí una combinación exacta. [Integración oficial Pino–Sentry](https://docs.sentry.io/platforms/javascript/guides/nestjs/configuration/integrations/pino/).

### Condiciones para operación offline

- Una caída de Internet o del destino de telemetría no debe bloquear ventas, commits locales ni workers.
- Logs locales con rotación, límites de disco/memoria y envío posterior controlado. Definir retención o descarte ante saturación.
- Verificar las garantías concretas de persistencia del transporte elegido; no asumir una cola durable por instalar el SDK.
- Conservar ventas, pagos y auditoría financiera en registros transaccionales. Logs y trazas muestreadas no son su fuente de verdad.
- Medir antigüedad del backlog, pendientes fiscales, pagos inciertos, demora de confirmación ERP y cobertura de sucursales, además de errores HTTP.
- Confirmar si Sentry puede alojarse como servicio externo o requiere otra modalidad según las restricciones del proyecto.

Con el cliente `pos-desktop` previsto, Pino cubre el proceso Node/NestJS; el frontend Angular/PrimeNG y el proceso Rust de la shell nativa Tauri necesitan instrumentación propia y correlación entre procesos, cuya compatibilidad debe comprobarse.

<span id="4-tauri-como-cliente-de-caja"></span>

## 4. Shell nativa de escritorio: Tauri

La dirección aceptada para el cliente de escritorio `pos-desktop` es **frontend Angular/PrimeNG alojado en la shell nativa (host) Tauri**. Tauri aloja la interfaz HTML/CSS/JavaScript y aporta un proceso nativo Rust y WebView; en Windows emplea WebView2. La aplicación cliente completa incluye ese frontend y su host nativo. Las reglas de negocio permanecen en el backend de sucursal y módulos de dominio, sin obligación de portarlas a Rust. La aceptación de esta dirección no acredita compatibilidad de todos los SDK o periféricos. [Modelo de procesos](https://v2.tauri.app/concept/process-model/), [configuración del frontend](https://v2.tauri.app/start/frontend/).

Se propone empaquetar los recursos necesarios de la interfaz para que pueda arrancar sin descargarlos de un servidor. Revisar navegación, rutas, configuración de endpoints, almacenamiento y autenticación. Angular 8 y las dependencias observadas requieren su propio plan de actualización aunque se empaqueten en Tauri.

### Distribución según el perfil offline

| Requisito | Distribución candidata | Consecuencia |
| --- | --- | --- |
| Sin Internet, sucursal disponible | Cliente `pos-desktop` en cajas; NestJS/Fastify y PostgreSQL en sucursal. | La sucursal sigue siendo el escritor compartido; perder LAN o servidor puede detener ventas. |
| Sin Internet y también sin LAN/servidor | Cliente `pos-desktop`, servicio transaccional y persistencia por caja; coordinación y sincronización posterior. | Requiere identidad por caja, reglas locales y políticas explícitas para stock, NC y otros recursos compartidos. |

```mermaid
flowchart LR
    subgraph Caja["Puesto de caja"]
        UI["pos-desktop<br/>Frontend Angular/PrimeNG<br/>Shell nativa Tauri"]
        Agent["device-agent<br/>C#/.NET · puesto Windows<br/>F02/F05 · adaptadores locales"]
        Journal[("SQLite técnico<br/>Recepción, intentos y evidencia")]
        Hardware["Impresora, Zebra o lector MICR"]
        Agent -->|"SQLite: registrar y recuperar intentos"| Journal
        Agent -->|"Driver / SDK: ejecutar capacidad"| Hardware
    end
    subgraph Sucursal["Servidor de sucursal · perfil WAN"]
        API["branch-api · NestJS + Fastify<br/>Negocio y trabajos autorizados de devices"]
        DB[("PostgreSQL de sucursal<br/>Negocio, trabajos, auditoría y outbox")]
        Worker["branch-sync-worker<br/>TypeScript / Node.js"]
        API -->|"PostgreSQL: confirmar operación y trabajos"| DB
        Worker -->|"PostgreSQL: entrega y activación de versiones"| DB
    end
    UI -->|"HTTPS LAN: solicitar operación y consultar estado"| API
    Mobile["pos-mobile · F06<br/>Angular/PrimeNG + Capacitor"] -->|"HTTPS LAN: solicitar operación y consultar estado"| API
    Agent -->|"HTTPS LAN: obtener trabajos y reportar evidencia"| API
    Worker -->|"HTTPS: entrega, consulta y acuses"| Central["country-api<br/>Recepción y trabajo durable"]
    ERPWorker["erp-worker en la red autorizada del ERP<br/>Fachada, ACL y adaptadores"] -->|"HTTPS saliente: solicitar trabajo y reportar"| Central
```

El diagrama corresponde al perfil WAN. Empaquetar el frontend en la shell nativa Tauri no resuelve la dependencia de precios online, contingencias fiscales ni autorización de pagos. El perfil de aislamiento por caja exige otro despliegue y garantías adicionales; no consiste en habilitar automáticamente otro escritor cuando falla la sucursal.

### Relación con NestJS y los dispositivos

`branch-api` ejecuta NestJS/Fastify en el servidor de sucursal, fuera del WebView. Su contexto `devices` autoriza, asigna y audita los trabajos. La ejecución física pertenece a **`apps/device-agent`, C#/.NET instalado por puesto Windows en F02/F05**, con ciclo de vida independiente de Tauri y Capacitor. La estación compartida y los dispositivos de red pertenecen a F06, después del piloto. El agente inicia HTTPS LAN hacia `branch-api`; el escritorio solicita trabajos del puesto al backend y el móvil accede a periféricos compartidos sólo al aceptar F06. El [contrato y despliegue del agente](decisions/device-agent.md) fija estas responsabilidades y las validaciones pendientes.

Migrar impresión, Zebra y cheque/MICR mediante adaptadores homologados. El legado revisado no implementa Transbank; cualquier SDK de pago constituye una capacidad futura por validar. SQLite conserva el diario técnico del agente, sin autoridad de ventas. La compatibilidad de drivers, arquitectura de proceso, sesión de Windows y modo de ejecución debe comprobarse antes de elegir el runtime y empaquetado de producción.

El requisito de variantes por país/sucursal se desarrolla en [Extensibilidad de proveedores y dispositivos](extensibilidad-proveedores-dispositivos.md). La selección se hace con perfiles aprobados y capacidades por operación; no con una bifurcación de la aplicación cliente por modelo. Un adaptador nuevo puede entregarse como proceso separado cuando el SDK lo requiera. Núcleo, interfaz y agentes mantienen contratos compatibles y ciclos de despliegue controlados; cerrar la ventana no debe borrar ni reiniciar intentos externos pendientes.

### Seguridad, distribución y soporte

- Capacidades nativas acotadas y comandos concretos. No exponer credenciales de PostgreSQL/ERP o ejecución genérica de comandos al frontend. Revisar origen, comunicación autenticada con agentes y permisos. [Capabilities de Tauri](https://v2.tauri.app/security/capabilities/).
- Instalador que contemple dependencias sin Internet. Tauri admite distribuir el instalador offline de WebView2 o un runtime fijo; la elección incluye responsabilidad de actualización y mantenimiento. [Instalador Windows](https://v2.tauri.app/distribute/windows-installer/).
- Paquetes firmados, actualización por grupos de tiendas y convivencia de versiones de cliente/backend/agentes. El updater verifica firmas; la política de despliegue y recuperación pertenece al proyecto. [Updater](https://v2.tauri.app/plugin/updater/).
- No actualizar durante una venta crítica ni revertir datos eliminando operaciones nuevas. Verificar compatibilidad de esquemas antes de permitir rollback de binarios.
- Incluir mantenimiento de Rust, WebView2, empaquetado, dispositivos y flota instalada en el coste y capacidades del equipo.

**Piloto propuesto:** caja Windows representativa con periféricos y proveedores de prueba. Verificar arranque sin Internet, impresión/reimpresión, lector y pago permitido en homologación; cortar WAN, LAN, servidor y agente por separado. Probar cierre inesperado, reinicio durante operación, convivencia de versiones y actualización fallida. Aprobar solo con recuperación trazable sin repetir cobros ni documentos, y con restricciones visibles en cada escenario.

## 5. Monorepo con Nx

El producto y su monorepo se llaman **POS Platform**, con aliases `@pos-platform/*`. El [repositorio del producto](https://github.com/floxcristian/pos-platform) reúne el software operativo. Esta propuesta, sus evidencias, los diagramas y Starlight se mantienen en el repositorio editorial [POS Docs](https://github.com/developer-implementos/pos-docs). Cada revisión documental identifica el código que describe.

**Estado de implementación:** la composición F01 en revisión conecta Angular/PrimeNG con NestJS/Fastify y PostgreSQL para operación de laboratorio. El perfil demo y las shells nativas conservan límites propios; los workers aún no ejecutan integraciones. La [guía F01](phase-1-laboratory.md) es la referencia del recorrido disponible. Esta implementación no acredita producción, homologación fiscal ni integración ERP.

Monorepo define cómo se organiza el código. Nx aporta un grafo de proyectos y tareas, caché y ejecución de tareas afectadas por cambios. Esto no determina cuántos procesos, bases o despliegues existen en producción. Su caché de compilación tampoco es una caché de datos del POS ni una solución offline de negocio. [Tareas Nx](https://nx.dev/docs/features/run-tasks), [caché de tareas](https://nx.dev/docs/features/cache-task-results), [tareas afectadas](https://nx.dev/docs/features/ci-features/affected).

Nx tiene integraciones para Angular y NestJS. Para Rust/Tauri y otros componentes, las tareas deben incorporar sus herramientas nativas; un comando Nx no sustituye Cargo, compilación Windows, firma o homologación. La guía oficial de Rust también contempla comandos personalizados y un plugin comunitario opcional. Los proyectos .NET existentes pueden continuar fuera del monorepo o integrarse después con su cadena de construcción validada. [Nx Angular](https://nx.dev/docs/technologies/angular/introduction), [Nx NestJS](https://nx.dev/docs/technologies/node/nest/introduction), [Rust en Nx](https://nx.dev/docs/kb/add-rust-to-nx-workspace).

### Organización ilustrativa

**Estructura objetivo acordada el 21 de octubre de 2026.** `apps/` reúne puntos de entrada operativos, documentación y proyectos de pruebas clasificados por separado. `libs/backend/` conserva los contextos de negocio; `libs/shared/` agrupa infraestructura técnica, presentación y conceptos mínimos compartidos. Core sirve únicamente como referencia, sin consumo de código, paquetes o servicios.

<!-- monorepo:target:start -->
```text
apps/
  pos-desktop/                  # Aplicación completa: shell Tauri + frontend Angular
  pos-mobile/                   # Aplicación completa: shell Capacitor + frontend Angular
  device-agent/                 # Agente C#/.NET Windows por puesto; red compartida en F06; implementación pendiente
  branch-api/                   # API y composición de negocio de sucursal
  branch-sync-worker/           # Proceso de entrega y recepción de sucursal
  country-api/                  # API de recepción y capacidades de país
  erp-worker/                   # Proceso de integración, traducción y conciliación ERP
tests/
  pos-clients-e2e/              # Playwright demo y API real; proyecto Nx sin despliegue
    mobile/                     # Suite Angular móvil; no homologa Capacitor
    branch/                     # Recorridos Angular → API → PostgreSQL con recuperación
libs/
  backend/
    sales/                      # Ventas y documentos comerciales
    cash/                       # Turnos y movimientos de caja
    payments/                   # Intentos, resultados y conciliación de pagos
    collections/                # Cobranzas y anticipos
    returns/                    # Devoluciones y referencias al documento original
    pricing/                    # Evaluación y versiones de precios y promociones
    catalog/                    # Maestros y proyecciones de consulta
    fiscal/                     # Documentos y estados fiscales por país/proveedor
    devices/                    # Contratos y coordinación de periféricos
    sync/                       # Protocolo y progreso de sincronización
    erp/                        # Contratos, ACL y adaptadores ERP
    reporting/                  # Consultas y proyecciones de reportes
    administration/             # Configuración y ámbito organizacional
  client-shell/                 # Composición Angular compartida; no es una aplicación desplegable
  features/                     # Funcionalidades de la interfaz
    branch-operation/           # Login, caja y venta conectados con componentes PrimeNG
  shared/
    frontend/
      ui/                       # Preset, tokens y componentes de presentación
    kernel/                     # Modelo mínimo acordado entre contextos; sin frameworks
    contracts/                  # Sobres y metadatos técnicos comunes; no todos los DTO de negocio
    backend/
      runtime/                  # Bootstrap, configuración, HTTP, observabilidad, sondas y ciclo de vida
      persistence/              # Driver pg, unidad de trabajo, migraciones y comandos durables
      testing/                  # Bases/roles sintéticos para integración real
  country-policies/             # Perfiles nacionales; reglas específicas bajo su contexto
  domain/                       # Reglas puras del prototipo frontend
  data-access/                  # Adaptadores demo y gateway branch-api en proyectos separados
    branch-api/                 # HTTP y estado de la operación conectada
tools/                          # Herramientas de build, lint y pruebas del producto
.github/
  workflows/                    # Validaciones y entrega
```
<!-- monorepo:target:end -->

El árbol expresa la organización del producto, con siete aplicaciones objetivo. `tests/pos-clients-e2e` contiene las pruebas de clientes, sin despliegue de negocio; POS Docs es un repositorio editorial independiente. La [guía del monorepo](monorepo.md) distingue responsabilidades, reglas DDD y estado de implementación.

`shared` es una agrupación, no una biblioteca universal. `shared/backend` contiene mecanismos técnicos; `shared/kernel`, conceptos de dominio mínimos acordados; `shared/contracts`, sobres y metadatos comunes. Los eventos y DTO de negocio conservan propietario en su contexto. El dominio permanece independiente de Nest, Angular, ORM y transporte.

El prototipo utiliza `libs/domain` y `libs/data-access` para reglas y adaptadores mock. Esa cobertura no acredita los contextos comerciales del backend. `country-policies` contiene perfiles puros; las reglas nacionales concretas pertenecen a fiscalidad, pagos o al contexto correspondiente.

### Estado de las aplicaciones

<!-- monorepo:applications:start -->
| Aplicación | Lugar previsto | Responsabilidad | Estado revisado |
| --- | --- | --- | --- |
| `pos-desktop` | Puesto Windows | Aplicación completa: shell nativa Tauri y frontend Angular | Composiciones Angular demo y branch-lab explícitas; pruebas de navegador no acreditan homologación nativa |
| `pos-mobile` | Dispositivo Android/iOS | Aplicación completa: shell nativa Capacitor y frontend Angular | Composiciones Angular demo y branch-lab explícitas; distribución y capacidades nativas por homologar |
| `device-agent` | PC Windows de cada puesto (F02/F05); estación de red compartida posterior (F06) | Agente C#/.NET por puesto; trabajos HTTPS con branch-api y diario SQLite; perfil de red compartido en F06 | Decisión acordada; app, protocolo y adaptadores pendientes de implementación y homologación |
| `branch-api` | Sucursal | API y composición de negocio de sucursal | Operación F01 en laboratorio con identidad, configuración, caja, catálogo, clientes, cestas, precios y efectivo en PostgreSQL; producción cerrada |
| `branch-sync-worker` | Sucursal | Proceso de entrega y recepción de sucursal | Esqueleto local; sin jobs ni sincronización real |
| `country-api` | País | API de recepción y capacidades de país | Base HTTP y PostgreSQL por ámbito con comprobación de esquema; sin recepción comercial |
| `erp-worker` | Red autorizada del ERP | Proceso de integración, traducción y conciliación ERP | Esqueleto local; sin conexión a ERP |
<!-- monorepo:applications:end -->

F01 implementa casos de uso de sucursal y persistencia PostgreSQL en laboratorio; el estado canónico se describe en la [guía F01](phase-1-laboratory.md). Los módulos de fases posteriores conservan su estructura sin operaciones reales. `shared/contracts`, `shared/kernel` y `country-policies` mantienen contratos y reglas puras; no acreditan homologación productiva. La base técnica de Node incorpora configuración, logging con `nestjs-pino` y reporte opcional de errores a Sentry; su política exacta se mantiene junto al código del producto.

`device-agent` es la séptima aplicación objetivo: C#/.NET Windows con diario técnico SQLite, sin implementación acreditada. Su host, adaptadores y ciclo de vida se definen en [ADR-17](decisions/device-agent.md). Un backoffice separado requiere su propia necesidad; Starlight pertenece a POS Docs. La administración de demostración se compone desde `client-shell` y sus features.

### Correspondencia del legacy con POS Platform

La migración se organiza por responsabilidad y recorrido. Copiar un repositorio legacy a una app nueva conservaría acoplamientos que esta estructura pretende separar.

| Pieza actual | Destino del trabajo | Separación que debe comprobarse |
| --- | --- | --- |
| `mountain-implementos/frontend` | `pos-desktop`, `pos-mobile`, `client-shell`, `features` y UI transversal en `shared/frontend/ui`; `data-access` transitorio | Migrar pantallas y sustituir adaptadores mock por contratos autorizados; no copiar secretos ni reglas de servidor al navegador. |
| `mountain-implementos/backend` | `branch-api` + contextos `libs/backend/{sales,cash,payments,collections,returns,pricing,catalog,fiscal,administration}` | El backend compone casos de uso y persistencia de sucursal; identidad, transacciones y autorización deben implementarse y probarse. |
| `mountain-implementos/backend-concentrador` | Capacidades de consulta/monitor en `country-api`, `reporting`, `administration` y pantallas autorizadas | Es el backend del monitor; no equivale al motor de transporte del repositorio `mountain-concentrador`. |
| `mountain-sync-sucursal` | `branch-sync-worker` + contexto `sync`, coordinado con `pricing` y `catalog` | El proceso entrega y recibe; los módulos propietarios validan cambios de negocio. Un worker no adquiere permiso para reescribir ventas. |
| `mountain-concentrador` | Recepción en `country-api` + `sync`; integración y preparación de maestros en `erp-worker`; autoridad de publicación en `country-api` | Separar acuse durable, procesamiento ERP y distribución. Los contratos del origen y sus capacidades necesitan validación; no sustituir todos sus procesos por un único endpoint genérico. |
| Adaptadores AX y APIs corporativas de `apis-implementos` | `erp-worker` + `erp`, y contratos del contexto correspondiente | Conservar o adaptar capacidades verificadas detrás de una ACL; no migrar todo el repositorio ni exponer tablas/identificadores de AX al dominio. |
| `api-pagos-caja` | Revisar capacidades de `payments`, `collections` y `returns` | La API histórica agrega datos y estados de notas de crédito; su nombre no demuestra autorización bancaria. |
| `api-impresion-caja` | `apps/device-agent` (C#/.NET Windows) y coordinación `libs/backend/devices` en `branch-api` | Migrar por capacidad homologada; conservar identidad, SQLite técnico y evidencia. Spooler no prueba impresión física y el legacy no acredita integración Transbank. |
| `core` | Referencia de organización para el código propio de `shared/backend` | No es origen de una migración de código, proveedor de paquetes ni servicio consumido por el POS. |
| `devops-platform` | Antecedente de herramientas de entrega, sujeto a una decisión independiente | La organización del monorepo no adopta automáticamente acciones o infraestructura corporativa. |

El [mapa de repositorios](mapa-repositorios-y-conexiones.md), los [informes con commits](analisis-repositorios/README.md) y el [inventario de reutilización corporativa](analisis-repositorios/aportes-plataforma-corporativa.md) sustentan este reparto. Es un destino propuesto, no una migración ya realizada.

### Del diagrama al código

| Bloque arquitectónico | Proyecto o responsabilidad de código | Estado de la correspondencia |
| --- | --- | --- |
| Aplicaciones cliente | `pos-desktop` con shell nativa Tauri y `pos-mobile` con shell nativa Capacitor | Frontends Angular/PrimeNG con arranques propios y composición Angular compartida en `libs/client-shell`; verificación nativa independiente. |
| Backend de sucursal | `branch-api` + contextos backend | Un proceso compone varios módulos; no existe una app por tabla o módulo. |
| Sincronizador de sucursal | `branch-sync-worker` + `sync` | El ciclo de vida del proceso es independiente de la ventana del cliente. |
| API de país | `country-api` + contextos de sus casos de uso | Base PostgreSQL y sonda por ámbito; recepción comercial e integración pendientes. |
| Adaptador ERP / ACL | `erp-worker` + `erp` como composición inicial | La vista C2 muestra una frontera lógica y una opción de proceso separado; un servicio HTTP de ACL separado no está creado ni es requisito del scaffold. |
| Publicación de maestros | Capacidad propuesta de `erp-worker` y `country-api` | El [contrato de publicación](contracts/master-data-publication.md) asigna extracción/preparación al worker en red autorizada y autoridad de versiones a país; no existe un publicador productivo acreditado ni una aplicación adicional. |
| PostgreSQL de sucursal y país | Persistencia con ámbitos y roles separados; F01 en laboratorio | Sucursal conserva la operación local; país tiene base y sonda sin recepción comercial. Ver [ADR-19](decisions/postgresql-unit-of-work.md). |
| `device-agent` | `apps/device-agent`, C#/.NET Windows; SQLite técnico | Aplicación acordada, sin implementar. Obtiene trabajo y reporta evidencia por HTTPS LAN a `branch-api`; adaptadores sujetos a homologación. |

Las vistas [C4](c4-arquitectura-propuesta.md) representan responsabilidades y topología objetivo. El árbol muestra proyectos de código y su estado; no debe interpretarse como un inventario de servicios desplegados.

### Recorrido de una solicitud por el código

Ejemplo **propuesto**, pendiente de implementar en el backend: confirmar una venta en efectivo con una versión de precios válida y una modalidad fiscal permitida.

1. El cliente autorizado (`pos-desktop` o `pos-mobile`) recoge la confirmación del operador y envía un comando identificado a `branch-api`. Su shell nativa, Tauri o Capacitor, aloja el frontend Angular/PrimeNG; el cliente no escribe SQL ni decide otro importe.
2. La entrada HTTP valida contrato e identidad. El caso de uso de `sales` comprueba ámbito, turno y condiciones comerciales mediante interfaces de los módulos propietarios.
3. `pricing` aporta un resultado y una versión; `cash` controla su estado. El caso de uso coordina sus efectos locales por una unidad de trabajo: compartir una transacción no permite acceder libremente a tablas ajenas.
4. Los adaptadores de persistencia escriben la venta, los cambios asociados, auditoría y outbox en **la misma transacción PostgreSQL**. Esa infraestructura aún no existe en el scaffold. No se llama al ERP dentro de la transacción.
5. Tras el commit, la API devuelve la confirmación local. `branch-sync-worker` entregará el evento posteriormente; la recepción de país y la confirmación ERP mantendrán estados independientes.

El flujo fija dirección de dependencia y autoridad. Los [contratos de confirmación](propuesta-arquitectura.md#confirmación-local-de-una-venta) y la [recuperación ante fallos](revision-resiliencia-datos-pos.md) definen qué ocurre si se pierde una respuesta o falla una dependencia. En la demostración actual este recorrido usa adaptadores mock; no está conectado a la base HTTP.

La disposición de carpetas no crea por sí sola proyectos Nx ni límites verificables. Se definirán proyectos en las fronteras que deban controlarse. Cada módulo puede separar dominio, aplicación e infraestructura sin generar una biblioteca por cada clase o función. Evitar una librería `shared` que exponga todos los modelos ORM y reglas de todos los dominios.

### Reglas para que el monorepo mantenga límites

| Regla propuesta | Aplicación |
| --- | --- |
| Dependencias controladas | Etiquetas por dominio, capa y entorno; reglas de importación y rechazo de ciclos en CI. |
| Dominio independiente | Reglas puras sin importaciones de Angular, Nest, Fastify, Tauri ni ORM. La composición concreta queda en las aplicaciones/adaptadores. |
| Frontend acotado | Consume contratos públicos y componentes UI; no importa repositorios de persistencia, credenciales ni implementaciones ERP. |
| Variación por país/ERP | Políticas y adaptadores explícitos; evitar propagar condiciones de país y campos AX por todo el núcleo. |
| Propiedad del código y datos | Responsables por módulo, interfaz pública y migraciones; revisiones de cambios de contrato con productores/consumidores. |
| Despliegues compatibles | Versionar contratos y artefactos aunque compartan commit; probar cajas antiguas contra servicios nuevos. |

La regla ESLint `@nx/enforce-module-boundaries` permite comprobar dependencias entre proyectos JavaScript/TypeScript mediante etiquetas. No verifica automáticamente consultas SQL, permisos en ejecución o el contrato con .NET/Rust; esos límites necesitan verificaciones adicionales. [Límites de módulos en Nx](https://nx.dev/docs/features/enforce-module-boundaries).

Nx se usa en desarrollo y CI; el runtime de caja ejecuta artefactos compilados y no debe necesitar Nx ni conectarse a Nx Cloud para vender. La caché local puede ser el inicio; el uso de caché remota requiere una decisión propia sobre datos, acceso y coste. Definir entradas/salidas de las tareas, toolchains y plataforma para no reutilizar resultados incompatibles. Deploy, migraciones de datos y operaciones con efectos externos no se tratarán como tareas reproducibles mediante caché.

La adopción se concentra en el producto objetivo. No se propone copiar sin selección los cinco repositorios a una carpeta nueva: contienen legados, configuraciones sensibles y capacidades corporativas fuera del POS. Los clones bajo `repos/` siguen siendo material de análisis y no forman por ello parte del código del nuevo producto.

## 6. Monolito modular y unidades de ejecución

**Recomendación:** comenzar con un monolito modular para el núcleo transaccional local y una plataforma central modular, acompañados por workers y adaptadores donde su ciclo de vida, dependencias o carga lo requieran. Es coherente con la propuesta previa de priorizar modularidad. No significa un único proceso mundial ni una base compartida entre todos los países.

| Unidad | Responsabilidad y autoridad |
| --- | --- |
| Cliente `pos-desktop`: frontend Angular/PrimeNG y shell nativa Tauri | Presentación y capacidades nativas acotadas. No se convierte en autoridad de la venta por compartir código. |
| Backend de sucursal NestJS + Fastify | Ventas, caja, precios/ofertas, coordinación de pagos y operaciones fiscales/devoluciones habilitadas. Escritor compartido por las cajas, con PostgreSQL de sucursal, en el perfil WAN recomendado. |
| Worker local | Entrega y recuperación de mensajes durables, con recursos acotados y supervisión independiente de la ventana. |
| Plataforma del país | Recepción, consolidación, maestros y conciliación. Mantiene las autoridades por dato acordadas; la proyección central de una venta no crea otro editor de su historia. |
| Workers ERP/proveedores | Aislar reintentos, límites y fallos externos; traducir mediante ACL y conservar resultados. |
| Adaptadores .NET existentes | Mantener los que cumplan contratos y homologación; repositorio común no obliga a reescribirlos. |

### Módulos con límites reales

Cada módulo controla sus datos y ofrece operaciones públicas. Otros módulos no modifican directamente sus tablas ni importan sus entidades ORM internas. La separación lógica puede usar schemas/tablas bajo una misma base local; no obliga a crear una base por módulo.

La confirmación local conserva la transacción que necesita el negocio: venta, cambios asociados y outbox se coordinan mediante interfaces y una unidad de trabajo común donde corresponda. No fragmentar esa garantía por convertir llamadas internas en mensajes asíncronos innecesarios. Los efectos externos —pago, fiscalidad o ERP— siguen sus protocolos de estados y recuperación; no se vuelven atómicos por estar en un monolito.

Compartir código entre POS y central permite reutilizar un motor puro de precios o tipos monetarios, pero cada instancia ejecuta una versión identificable. No sustituye distribución de reglas/datos, activación atómica ni pruebas de compatibilidad entre cajas atrasadas y servicios actualizados.

### Cuándo extraer un servicio

Separar cuando exista evidencia de escala independiente, aislamiento de fallos, frontera de seguridad, disponibilidad o ciclo de entrega autónomo, y estén claros contrato, datos y responsabilidad operativa. Integración ERP y trabajos pesados son candidatos por sus dependencias externas. Un aumento del número de carpetas, países o desarrolladores no basta por sí solo.

La autonomía local permanece como criterio de aceptación: extraer un servicio no puede introducir una llamada central obligatoria para una operación que deba funcionar offline. El coste de nuevas redes, colas, estados y observabilidad debe justificarse frente al beneficio medido.

### Validación de la organización propuesta

Probar que una dependencia prohibida/circular falla en CI; que un cambio de contrato ejecuta las verificaciones relevantes de productor/consumidores; que un cliente anterior funciona con la versión central candidata; y que cerrar la aplicación cliente o detener un worker no corrompe ventas persistidas. Medir builds completos y afectados, coste de mantenimiento del workspace y reproducibilidad de artefactos en las plataformas homologadas.

## 7. Información adicional para decidir

Core es únicamente una referencia; el POS tiene código, contratos, infraestructura y releases propios. La organización acordada se detalla en la [guía del monorepo](monorepo.md). Siguen pendientes responsables internos por contexto, autoridad de precios/ofertas y requisitos de entrega.

Ampliar Q08–Q10 de la [solicitud al equipo](solicitud-informacion-equipo.md) con: versiones/SO y recursos mínimos de cajas; modelos, drivers y SDK de periféricos; administración de dispositivos y permisos de instalación; experiencia NestJS/Rust; política de telemetría; capacidad de distribuir paquetes y soporte de sucursales desconectadas.

Para concretar Nx y el monolito modular propuesto, confirmar también propiedad/permisos de repositorios, responsables por dominio, toolchains, capacidad de CI Windows, estrategia de versiones, límites de compatibilidad y necesidades reales de despliegue/escala independiente. La organización del código indicada con Nx y la arquitectura de ejecución son decisiones distintas.

Las [validaciones del proyecto](validacion-y-decisiones.md) recogen los casos de adopción tecnológica. Las fuentes oficiales anteriores se consultaron durante la evaluación; al implementar se volverán a comprobar versiones y compatibilidad, sin convertir las recomendaciones en decisiones aprobadas por defecto.
