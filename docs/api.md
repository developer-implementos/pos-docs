# API de sucursal y persistencia

**Implementación en revisión:** F01 conecta Angular con `branch-api` y PostgreSQL. El incremento operativo Chile incorpora identidad propia POS, administración de accesos, provisión y HTTPS, separado del laboratorio transaccional. La infraestructura técnica pertenece a `libs/shared/backend/runtime`, `persistence` y `testing`; los casos de uso conservan su contexto de negocio. La [guía F01](phase-1-laboratory.md) distingue ambos perfiles y sus límites.

> **Alcance:** el perfil operativo administra usuarios, roles, puestos y configuración persistentes. El laboratorio valida apertura, catálogo, clientes, cestas, cotización y efectivo con datos sintéticos. No se habilitan cobros operativos sin precios verificados, emisión fiscal, tarjetas ni envío ERP. La aceptación de F01 se registra en el producto; esta documentación y la CI no acreditan integración en `main` ni habilitación productiva.

`apps/branch-api` compone el backend modular de sucursal con NestJS 12, Fastify 5 y TypeScript. Publica contratos HTTP v1 desde las bibliotecas de cada contexto, valida solicitudes con Zod y ejecuta los casos de uso mediante puertos. PostgreSQL 18.6 y `pg` 8.23.1 conservan la operación y su resultado durable. El [ADR-19](decisions/postgresql-unit-of-work.md) fija transacciones, migraciones y privilegios.

Los clientes `pos-desktop` y `pos-mobile` distinguen `branch`, `branch-lab`, `demo` y el estado inicial `unconfigured`. El perfil conectado usa la API; no cambia a mocks ante un fallo. `country-api` tiene persistencia y sonda de ámbito propias, todavía sin recepción comercial. Los workers no procesan jobs de negocio; `erp-worker` incorpora una CLI separada de consultas Mountain que aún no alimenta el espejo ni la UI.

## Referencia Core

Las convenciones se contrastaron con [developer-implementos/core](https://github.com/developer-implementos/core/tree/b25164a50375845989a671cdc8e13360866c76af), commit `b25164a50375845989a671cdc8e13360866c76af`. La referencia es su código de arranque y sus contratos; no se incorpora Core como dependencia ni se conectan sus servicios.

| Referencia verificada en Core                                                                                                                                                                                                                                                                        | Aplicación en POS                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [Bootstrap y fábricas Nest/Fastify](https://github.com/developer-implementos/core/tree/b25164a50375845989a671cdc8e13360866c76af/apps/core-api/src/bootstrap)                                                                                                                                         | Separar creación, configuración HTTP/OpenAPI y listener en `shared/backend/runtime`; cada aplicación conserva su identidad y composición |
| [Módulo y servicio de configuración](https://github.com/developer-implementos/core/tree/b25164a50375845989a671cdc8e13360866c76af/apps/core-api/src/config)                                                                                                                                           | Validar una vez y publicar un snapshot inmutable mediante `RuntimeConfigModule` y `RuntimeConfigService`                           |
| [Logging con Pino](https://github.com/developer-implementos/core/tree/b25164a50375845989a671cdc8e13360866c76af/libs/shared/backend/observability/src/lib/logging)                                                                                                                                    | Unificar Nest y HTTP mediante `nestjs-pino`, conservar correlación y limitar los datos registrados                                 |
| [Filtro global de excepciones](https://github.com/developer-implementos/core/blob/b25164a50375845989a671cdc8e13360866c76af/apps/core-api/src/common/filters/global-exception.filter.ts)                                                                                                              | Respuesta plana con `code`, `message`, `category` y `timestamp`; la base POS omite `details` y oculta errores internos             |
| [Versionado URI del bootstrap](https://github.com/developer-implementos/core/blob/b25164a50375845989a671cdc8e13360866c76af/apps/core-api/src/bootstrap/bootstrap.ts) y [convenciones OpenAPI](https://github.com/developer-implementos/core/blob/b25164a50375845989a671cdc8e13360866c76af/AGENTS.md) | Prefijo `api`, versión URI `1`, sondas neutrales y documentación en español con `operationId` estables                             |
| [Helper Vitest/SWC](https://github.com/developer-implementos/core/blob/b25164a50375845989a671cdc8e13360866c76af/libs/shared/testing/src/config/vitest.helper.ts)                                                                                                                                     | Vitest con transformación SWC y metadata de decoradores para probar la inyección real de Nest                                      |

POS conserva npm, Nx 23 y NestJS 12. La incorporación de varias aplicaciones backend y librerías compartidas justifica Rspack/SWC con el plugin oficial de Nx para empaquetar fuentes internas, manteniendo TSC para comprobar tipos. Los artefactos incluyen manifiesto y lockfile de distribución; no necesitan resolver aliases desde el workspace. Se adapta el [empaquetado de Core](https://github.com/developer-implementos/core/blob/b25164a50375845989a671cdc8e13360866c76af/apps/core-api/rspack.config.js) sin copiar sus plugins correctivos ni su lista de dependencias cloud.

Para Sentry se toma como referencia la [inicialización y cierre de Core](https://github.com/developer-implementos/core/tree/b25164a50375845989a671cdc8e13360866c76af/apps/core-api/src/common/sentry), con una integración más acotada: un `NodeClient` privado de `@sentry/node` por aplicación, captura explícita y filtrado por campos permitidos. No se copia la inicialización global de `@sentry/nestjs`, el profiling ni las integraciones automáticas de Core. Pino sigue siendo el logger de Nest y HTTP; Sentry es un destino opcional para errores seleccionados.

La composición F01 no incorpora MongoDB, Redis, servicios cloud, OpenTelemetry ni la autenticación ecommerce de Core: no tiene esos consumidores ni contratos, y el backend de sucursal conserva el alcance de la propuesta POS. El [ADR-18](decisions/job-processing.md) selecciona BullMQ + Redis propio para trabajos de país y ERP, pendiente de implementación; no añade esa dependencia al backend de sucursal ni importa infraestructura de Core.

<span id="actualización-de-nombres-y-configuración"></span>

## Configuración

La aplicación HTTP de sucursal se llama `branch-api` y el worker de sincronización `branch-sync-worker`. La [convención de nombres](monorepo.md#nombres-de-las-aplicaciones-backend) distingue ámbito y tipo de proceso.

| Aplicación | Código fuente | Artefacto de distribución | Variables de entorno |
| --- | --- | --- | --- |
| `branch-api` | `apps/branch-api` | `dist/apps/branch-api` | `BRANCH_API_*` |
| `branch-sync-worker` | `apps/branch-sync-worker` | `dist/apps/branch-sync-worker` | `BRANCH_SYNC_WORKER_*` |

Los archivos `.env` de desarrollo y las variables del supervisor de procesos usan el prefijo de cada aplicación. Los ejemplos versionados documentan sus claves y valores predeterminados, sin secretos. La sección [Desarrollo](#desarrollo) detalla la carga y validación de esa configuración.

El campo `service` de `GET /api/v1`, logs y eventos Sentry de sucursal identifica `branch-api`; la salida de inspección, logs y eventos del worker identifican `branch-sync-worker`. Los comandos `api:*` operan sobre la API de sucursal y `sync:check` verifica la composición y cierre de su worker. `country-api` y `erp-worker` tienen configuración e identidad propias.

## Organización del runtime

La fábrica compone módulos y permite crear el servidor sin abrir un puerto para probarlo con Fastify. El arranque agrega escucha y cierre. `shared/backend/runtime` concentra configuración, HTTP/OpenAPI, logging, errores, sondas y ciclo de vida; `shared/backend/persistence` implementa conexiones y unidad de trabajo. Cada app conserva su identidad y manifiesto de migraciones.

Las librerías de `libs/backend` separan contratos, aplicación, dominio, infraestructura y adaptación HTTP donde existen esas responsabilidades. Las colaboraciones entre contextos usan contratos públicos; las apps componen sus adaptadores. La operación en efectivo coordina venta, caja y registro durable con la misma transacción. Los módulos de fases posteriores no devuelven éxitos comerciales ficticios.

## Desarrollo

Requiere Node.js `>=22.19.0 <23` o `>=24 <25` y npm 11.6.0, igual que el monorepo.

Desde la raíz:

```sh
npm ci
npm run api:dev
```

El laboratorio utiliza HTTP en loopback. La operación requiere perfil `operational`, HTTPS explícito, base migrada/aprovisionada y credencial runtime independiente de migración. Nx recompila cambios y reinicia la API; no aprovisiona una base automáticamente.

`npm run country:dev` inicia la base HTTP de país en `http://127.0.0.1:3001`. Las aplicaciones tienen identidades y composición separadas; iniciar ambas no establece una conexión entre ellas. Los [comandos del workspace](monorepo.md#comandos-del-workspace) también incluyen las verificaciones de los workers, que componen y cierran su contexto sin ejecutar trabajos de negocio.

Para configurar el entorno local, copia `apps/branch-api/.env.example` a `apps/branch-api/.env`. Nx carga ese archivo para sus tareas; las variables ya definidas en el entorno tienen prioridad. No versionar `.env` ni secretos. El arranque directo con Node no usa la carga de archivos de Nx: necesita variables del proceso o `node --env-file=/ruta/api.env main.js`.

La validación ocurre antes de escuchar conexiones. `RuntimeConfigModule` registra un snapshot inmutable y `RuntimeConfigService` lo expone a los módulos; los consumidores no necesitan consultar `process.env` ni reinterpretar valores.

| Variable               | Valor por defecto                                | Uso                                                                                            |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`             | `development`                                    | `development`, `test` o `production`                                                           |
| `BRANCH_API_HOST`         | `127.0.0.1`                                      | Dirección de escucha explícita; laboratorio HTTP sólo en loopback, operación con TLS configurado |
| `BRANCH_API_PORT`         | `3000`                                           | Puerto TCP del servicio                                                                        |
| `BRANCH_API_LOG_LEVEL`    | `info`                                           | `trace`, `debug`, `info`, `warn`, `error`, `fatal` o `silent`                                  |
| `BRANCH_API_DOCS_ENABLED` | `true` en desarrollo/test; `false` en producción | Habilita el documento OpenAPI JSON                                                     |
| `BRANCH_API_CORS_ORIGINS` | vacío                                            | Orígenes HTTP/HTTPS exactos separados por comas; sin permisos entre orígenes por defecto       |

Para el cliente conectado, `BRANCH_API_CORS_ORIGINS` admite únicamente orígenes autorizados exactos, incluidos los de los canales nativos configurados. CORS no constituye autenticación ni autorización. Se requieren `BRANCH_API_PROFILE` (`laboratory` u `operational`), `BRANCH_API_BRANCH_ID` y `BRANCH_API_DATABASE_URL`. La migración usa `BRANCH_API_MIGRATION_DATABASE_URL` con otra credencial. Las URLs y credenciales de instalaciones nunca se publican ni se registran en logs.

`BRANCH_API_DATABASE_TLS_MODE` usa `verify-full`; `disable-local` sólo se admite para una base en loopback, nunca para SQL remoto. HTTPS de la API utiliza `BRANCH_API_TLS_ENABLED`, `BRANCH_API_TLS_CERT_FILE` y `BRANCH_API_TLS_KEY_FILE`, con archivos externos protegidos. La sesión operativa usa `BRANCH_API_SESSION_TTL_MS`; el laboratorio conserva `BRANCH_API_LAB_SESSION_TTL_MS`. Los límites de búsqueda se configuran mediante `BRANCH_API_CATALOG_BURST` y `BRANCH_API_CATALOG_REFILL_PER_SECOND`. Los ejemplos del producto son la referencia de claves y defaults; la guía no conserva secretos ni replica la configuración de una instalación.

Estas variables corresponden a `branch-api`. `country-api` usa el prefijo `COUNTRY_API_` para las mismas opciones HTTP, con puerto predeterminado 3001. Los workers consumen `NODE_ENV`, su nivel de log (`BRANCH_SYNC_WORKER_LOG_LEVEL` o `ERP_WORKER_LOG_LEVEL`) y las opciones de reporte de errores descritas abajo; no configuran listener HTTP, CORS ni OpenAPI.

## Endpoints

| Método y ruta           | Responsabilidad                                        |
| ----------------------- | ------------------------------------------------------ |
| `GET /api/v1`           | Identifica el servicio y el alcance de esta base       |
| `GET /health/live`      | Comprueba que la aplicación responde                   |
| `GET /health/ready`     | Comprueba PostgreSQL, ámbito y migraciones/checksums compatibles |
| `GET /api/openapi.json` | Contrato OpenAPI, solo con `BRANCH_API_DOCS_ENABLED=true` |

```sh
curl http://127.0.0.1:3000/api/v1
curl http://127.0.0.1:3000/health/ready
```

Readiness de sucursal y país consulta su PostgreSQL correspondiente. Un esquema o ámbito incompatible impide declarar disponibilidad. La sonda no acredita ERP, dispositivos, pagos, permisos del operador o caja abierta; esas condiciones se validan en el caso de uso.

Las rutas llevan el prefijo `/api/v1`; cada perfil y capacidad limita su ejecución. El recorrido comercial completo siguiente está verificado con datos de laboratorio; la presencia de una ruta no habilita su uso comercial operativo. Los contratos de cada contexto son la fuente de sus DTO; OpenAPI se genera desde esa misma definición.

| Rutas | Responsabilidad |
| --- | --- |
| `POST /auth/lab/login`, `GET /auth/session`, `POST /auth/logout` | Crear, consultar y revocar una sesión limitada a actor, caja e instalación |
| `POST /auth/login`, `POST /auth/password` | Acceso operativo con usuario propio POS y cambio de contraseña; no acepta identidad de laboratorio |
| `GET /administration/access-options` | Consultar puestos autorizados y permisos otorgables |
| `GET/POST /administration/operators`, `PUT /administration/operators/:operatorId` | Consultar, crear y actualizar operadores propios del POS con permisos y versiones |
| `POST /administration/operators/:operatorId/password`, `/revoke-sessions` | Restablecer contraseña o revocar sesiones autorizadamente |
| `GET/POST /administration/roles`, `PUT /administration/roles/:roleId` | Administrar roles sin conceder privilegios superiores a los del administrador actuante |
| `GET /administration/operators/:operatorId/assignments`, `POST /administration/assignments`, `PUT /administration/assignments/:assignmentId` | Consultar y administrar asignaciones a puestos del ámbito |
| `GET /configuration/effective` | Recuperar configuración efectiva, procedencia, versión y capacidades |
| `GET /cash/shifts/current`, `POST /cash/shifts` | Consultar y abrir el turno autorizado |
| `GET /catalog/products`, `/catalog/product-codes/:code`, `/catalog/products/:productId/availability` | Buscar productos, resolver captura y consultar disponibilidad informativa |
| `GET /customers`, `/customers/:customerId` | Buscar y consultar clientes del maestro autorizado |
| `POST /customers/requests`, `GET /customers/requests/:requestId` | Solicitar alta/actualización y consultar su resultado durable |
| `GET/POST /sales/drafts`, `GET/PUT /sales/drafts/:cartId` | Listar, crear, recuperar y editar cestas con control de versión |
| `POST /sales/drafts/:cartId/pause`, `/resume`, `/cancel` | Gestionar la continuidad o cancelación de la cesta |
| `POST /pricing/quotes`, `/pricing/discount-authorizations` | Cotizar y registrar aprobación separada para un descuento limitado |
| `POST /sales/cash-confirmations` | Confirmar efectivo con identidad de comando, versión y cotización vigente |
| `GET /commands/:commandId` | Recuperar el resultado terminal `completed` o `rejected` de la confirmación |
| `GET /sales/:saleId` | Consultar el comprobante histórico de laboratorio, con detalle y reglas conservadas |

Los comandos usan `contractVersion`, `commandId` y versión esperada cuando existe un agregado. Los importes viajan como cadenas decimales; UUID y fechas se normalizan en contrato. La identidad, permisos y capacidades se verifican en el servidor, independientemente de lo que muestre la UI. Los tokens de sesión se conservan en memoria en el cliente; el servidor guarda su hash y vencimiento.

Las rutas de negocio usan el prefijo `api` y el versionado URI nativo de Nest, con versión inicial `1`. Las sondas se declaran neutrales a versión y quedan fuera de ese prefijo. OpenAPI describe operaciones y DTO en español y usa `operationId` explícitos y estables para los consumidores del contrato.

## Logging, errores y límites HTTP

Cada aplicación backend se ejecuta en un proceso Node independiente. Dentro de ese proceso, Nest y HTTP comparten Pino mediante `nestjs-pino`, cuyo logger raíz se comparte a nivel de proceso; no se admite alojar dos aplicaciones Nest con configuraciones de logging diferentes en el mismo proceso. Cada solicitud recibe un identificador generado por el servidor, devuelto en `x-request-id` y `x-correlation-id`; no se adopta el ID enviado por el cliente. Los registros incluyen contexto de servicio y ambiente, y el registro de finalización HTTP agrega correlación, método, ruta, estado y duración. Se excluyen query, cuerpos y cabeceras; no se habilita un segundo registro automático de Fastify.

La protección de campos estructurados elimina las claves configuradas de credenciales, datos personales y solicitudes/respuestas en la raíz y hasta dos niveles de anidación. Los serializadores explícitos de `err`, `error` y `context` también se aplican al logger HTTP, con `wrapSerializers: false` para impedir que `pino-http` reinstale su serializador de errores. Los errores conservan solo un tipo genérico, y el contexto admite un nombre técnico acotado.

El hook `logMethod` reconoce las sobrecargas con `Error`, campos `err`/`error` o un `context` no técnico antes de que Pino derive `msg` desde la excepción. Las convierte en un evento con campos técnicos permitidos y el mensaje fijo `Operation failed`. Las pruebas cubren las sobrecargas reales de `Logger` y `PinoLogger`. Esta protección no sanitiza recursivamente cualquier objeto ni detecta secretos escritos dentro de un mensaje libre arbitrario. Los consumidores deben registrar eventos y campos técnicos expresamente elegidos, sin pasar DTO, objetos de proveedores ni texto del usuario. La captura opcional de Sentry conserva únicamente frames reducidos para diagnóstico.

En aplicaciones y contextos se inyecta el logger de `nestjs-pino`. El adaptador de plataforma puede usar el puente `Logger` de Nest configurado con el mismo destino; no debe introducirse otro logger independiente. Las pruebas comprueban niveles, contexto y redacción de valores sintéticos.

Durante la construcción del contenedor Nest, su logger permanece desactivado para no almacenar ni imprimir excepciones originales antes de configurar la protección. Después se conecta Pino y se registra un evento técnico de composición terminada; los fallos de arranque mantienen un mensaje público genérico.

Los errores HTTP mantienen una respuesta plana con cuatro campos:

| Campo       | Contrato                                                      |
| ----------- | ------------------------------------------------------------- |
| `code`      | Código estable para identificar el error                      |
| `message`   | Mensaje público del error; genérico para errores internos 500 |
| `category`  | Clasificación del error                                       |
| `timestamp` | Momento de la respuesta en formato ISO 8601                   |

Esta base no devuelve `details`, stacks ni el mensaje de una excepción interna. La correlación viaja en las cabeceras; no se duplica en el cuerpo del error. Los futuros códigos de negocio requerirán un contrato explícito antes de incorporarse.

Fastify limita el cuerpo a 1 MiB y configura `requestTimeout` en 30 segundos para recibir la solicitud. Ese plazo no cancela por sí mismo un caso de uso ni una llamada externa: esas operaciones necesitarán sus propios límites y cancelación. La aplicación también activa validación de DTO y cabeceras de seguridad; estos controles no sustituyen autenticación ni autorización.

## Reporte opcional de errores con Sentry

Sentry está deshabilitado por defecto y los cuatro `.env.example` dejan el DSN vacío. Activarlo requiere configurar deliberadamente las variables de la aplicación; esta entrega no conecta ningún proyecto real de Sentry. No cambia el estado de disponibilidad de la API ni habilita operaciones de negocio.

| Sufijo de variable           | Valor por defecto | Uso                                                                   |
| ---------------------------- | ----------------- | --------------------------------------------------------------------- |
| `SENTRY_ENABLED`             | `false`           | Habilita el reporter; `true` exige un DSN válido                      |
| `SENTRY_DSN`                 | vacío             | Destino autorizado de los eventos, configurado fuera del repositorio  |
| `SENTRY_RELEASE`             | vacío             | Versión opcional del despliegue, sin datos personales ni credenciales |
| `SENTRY_SHUTDOWN_TIMEOUT_MS` | `2000`            | Límite de cierre y envío pendiente, entre 1 y 10000 ms                |

Cada sufijo lleva el prefijo del proceso: `BRANCH_API_`, `COUNTRY_API_`, `BRANCH_SYNC_WORKER_` o `ERP_WORKER_`. Por ejemplo, `BRANCH_API_SENTRY_ENABLED=false` y `BRANCH_API_SENTRY_DSN=` mantienen deshabilitado el reporter de sucursal. El ambiente se obtiene de `NODE_ENV` y la identidad del servicio la fija la aplicación.

La captura ocurre una vez en fronteras explícitas: errores HTTP 5xx inesperados, fallos al crear o iniciar la aplicación después de validar su configuración y errores al inspeccionar el contexto del worker. No se reportan errores de validación/cliente ni el 503 esperado de readiness. Los argumentos de comando inválidos y los fallos anteriores a disponer de configuración válida se registran localmente; no dependen de un cliente Sentry todavía no configurado. Los workers siguen sin procesar jobs. No hay captura global de toda excepción del proceso, trazas distribuidas, profiling, replay ni exportación automática de logs.

El reporter construye un evento mínimo y `beforeSend` vuelve a limitar sus campos. Conserva códigos técnicos propios, fase, servicio, ambiente, release opcional, identificadores UUID de solicitud/correlación y estado HTTP cuando correspondan. Conserva hasta 40 frames de error, reducidos al nombre base del archivo y sus números de línea/columna. No envía el mensaje original de la excepción, stack bruto, rutas completas, URL, query, cuerpos, cabeceras, cookies, usuario, breadcrumbs ni objetos arbitrarios en `extra` o `contexts`.

Cada aplicación tiene su cliente privado, sin instalar integraciones automáticas ni modificar un SDK global compartido. El cierre es idempotente y acotado por el timeout configurado. Ese envío es de mejor esfuerzo: no constituye una cola durable ni garantiza entrega durante caída de red o terminación forzada. Los tests usan un transporte en memoria y valores sintéticos; no acreditan la recepción en un proyecto real de Sentry.

## Verificación

```sh
npm run api:test
npm run api:check
npm run api:smoke
```

`api:check` ejecuta los targets Nx `lint`, `typecheck`, `test` y `build` de `branch-api`.

Las pruebas usan Vitest y SWC con metadata de decoradores para la inyección de Nest. Los casos HTTP de laboratorio y persistencia requieren PostgreSQL real aislado mediante `POS_TEST_ADMIN_URL`; las pruebas puras no requieren ese servicio. Se verifican permisos, ámbitos, versiones, concurrencia y recuperación. Rspack/SWC genera el bundle distribuible; TSC comprueba tipos por separado.

El smoke del artefacto lo instala fuera del monorepo con `npm ci --omit=dev`, para detectar dependencias resueltas accidentalmente desde el workspace. La composición de laboratorio usa base, roles y seed sintéticos; verifica los comandos de migración/comprobación y el arranque configurado. También comprueba que el perfil no abra operación productiva. La instalación requiere acceso al registro npm. Los checks de Sentry usan transporte en memoria y canarios sintéticos, sin enviar eventos a un servicio real.

El job `api` de CI ejecuta `backend:check`, `structure:check` y `backend:smoke`, separado de los jobs del frontend y escritorio. Cubre las cuatro aplicaciones backend y sus librerías; los comandos `api:*` siguen disponibles para trabajar solo sobre `branch-api`.

Para abarcar las cuatro aplicaciones backend y sus librerías, usar `npm run backend:check`, `npm run backend:build` y `npm run backend:smoke`. `npm run structure:check` verifica las reglas arquitectónicas. La comprobación de cada worker solo acredita su composición y cierre; todavía no hay transporte o jobs de negocio que probar.

La comprobación del artefacto también captura los logs del proceso: exige una sola entrada de finalización por solicitud, correlación compartida entre Nest y HTTP y ausencia de valores sensibles sintéticos enviados en headers, query, cuerpo y rutas desconocidas.

## Artefacto y ejecución

```sh
npm run api:build
```

El resultado se genera en `dist/apps/branch-api`: bundle de aplicación y librerías internas, `package.json` y lockfile con las dependencias externas del runtime. La entrega del servicio utiliza esa carpeta, sin copiar el `node_modules` completo del monorepo ni publicar las librerías fuente por separado. Las demás aplicaciones backend generan su propio artefacto bajo `dist/apps/<aplicación>`.

En el destino, desde la carpeta del artefacto:

```sh
npm ci --omit=dev
node --env-file=/ruta/api.env main.js
```

El comando requiere una base previamente migrada, credenciales runtime y un perfil explícito. `operational` usa la provisión de sucursal y usuarios propios POS; `laboratory` conserva sus semillas y restricciones de prueba. Cambiar `NODE_ENV` no habilita capacidades comerciales: las controla la configuración efectiva y sus contratos. El archivo de configuración es externo al artefacto y no se versiona. El CLI `database.js` ejecuta migraciones con la credencial separada; el servidor no hace auto-migraciones.

Esta API es un proceso Node independiente dentro de **pos-platform**. La configuración `vercel.json` del repositorio editorial **pos-docs** publica únicamente Starlight; no publica `branch-api` ni las demás aplicaciones backend. El despliegue del backend de sucursal necesita su propia supervisión de proceso, terminación TLS, identidad y política de acceso antes de incorporar operaciones reales.

## Evolución prevista

La organización distingue infraestructura compartida de propiedad de negocio: conexiones y ejecutores técnicos en `shared/backend`; modelos, repositorios y migraciones en cada contexto. Los contratos comerciales se publican desde su contexto; `shared/contracts` contiene sobres, metadatos y errores transversales, no un catálogo global de DTO de negocio.

La venta en efectivo de laboratorio tiene autenticación, autorización, PostgreSQL, migraciones y una unidad de trabajo que conserva sus efectos y outbox. El incremento operativo añade identidades propias y provisión real, sin reutilizar las semillas como fuente comercial. La CLI legacy de `erp-worker` consulta referencias puntuales mediante HTTPS y cuenta técnica propia; no publica maestros ni cotiza. La entrega de outbox, recepción de país, espejos completos, jobs BullMQ, ERP, fiscalidad y dispositivos permanecen en sus fases. Las reglas CL sintéticas no homologan Chile, Perú o España. Los clientes hablan con la API y nunca consultan SQL directamente.

La [propuesta de arquitectura](propuesta-arquitectura.md) y las [opciones tecnológicas](opciones-tecnologicas.md) explican la ubicación del backend y los límites del perfil sin WAN. El servicio no promete autonomía de una caja ante caída de la LAN o del servidor de sucursal.

## Referencias técnicas

- [Adaptador oficial Fastify de NestJS](https://docs.nestjs.com/techniques/performance): integración HTTP; los plugins y middleware deben ser compatibles con Fastify.
- [nestjs-pino](https://github.com/iamolegga/nestjs-pino): integración del logger de Nest y contexto de solicitudes.
- [Clientes y scopes aislados de Sentry](https://docs.sentry.io/platforms/javascript/best-practices/shared-environments/): patrón de cliente manual sin `Sentry.init()` global; su ejemplo de navegador se adapta aquí a `NodeClient` y se comprueba con el SDK Node instalado.
- [Integraciones de Sentry para Node](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/): instrumentación y contexto que pueden añadir los plugins; el cliente manual del POS usa una lista vacía y captura explícita.
- [Filtrado de eventos de Sentry](https://docs.sentry.io/platforms/javascript/guides/node/configuration/filtering/): uso de `beforeSend` antes de enviar eventos; la base POS reconstruye sus campos permitidos.
- [Opciones del servidor Fastify](https://fastify.dev/docs/latest/Reference/Server/): límites de cuerpo y tiempo de recepción de solicitudes.
- [Preparar aplicaciones para despliegue con Nx](https://nx.dev/docs/guides/ci-deployment): generación del manifiesto y lockfile del artefacto para instalar sus dependencias fuera del workspace.
- [Rspack con Nx](https://nx.dev/docs/technologies/build-tools/rspack/introduction): integración del empaquetador con el workspace y sus tareas.
- [Ejecutores TypeScript/Node de Nx](https://nx.dev/docs/technologies/typescript/executors): ejecución del resultado de compilación y tareas de empaquetado.
