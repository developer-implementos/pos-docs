# Monorepo POS Platform

> **Alcance del código:** el monorepo **pos-platform** reúne los clientes Angular/PrimeNG para escritorio (Tauri) y móvil (Capacitor) y la base NestJS/Fastify. La documentación Starlight se mantiene en [POS Docs](https://github.com/developer-implementos/pos-docs), con una referencia identificada al estado del producto. La interfaz mantiene adaptadores mock; la base backend aporta configuración, observabilidad, sondas y puntos de composición. Los módulos comerciales y workers todavía no ejecutan operaciones reales.

POS Platform es la base de un producto corporativo para varios países. El monorepo reúne clientes de escritorio y móvil, backend de sucursal, backend de país y workers con ciclos de ejecución propios. La demostración funcional actual cubre Chile; la estructura multipaís permite organizar la evolución sin afirmar que las reglas fiscales o integraciones de otros países estén implementadas.

`apps/pos-desktop` y `apps/pos-mobile` tienen arranques Angular independientes y comparten `libs/client-shell`, que define configuración por plataforma, rutas, guards y navegación. La [decisión de clientes nativos](decisions/native-clients.md) describe los artefactos Tauri y Capacitor. La API de sucursal está en `apps/branch-api`. Todos se versionan en [pos-platform](https://github.com/developer-implementos/pos-platform), con builds separados: compartir repositorio no implica compartir proceso ni persistencia.

## Nombres de las aplicaciones backend

Las aplicaciones se nombran por ámbito o responsabilidad y tipo de proceso: `branch-api`, `branch-sync-worker`, `country-api` y `erp-worker`. `branch` identifica la sucursal y `country` el ámbito de país; `api` identifica la entrada HTTP y `worker` un proceso de trabajo separado. Los contextos DDD (`sales`, `cash`, `payments`, etc.) conservan sus nombres y límites dentro de las bibliotecas: una aplicación puede componer varios contextos sin convertirlos en microservicios.

La [guía de API](api.md#configuración) detalla los artefactos, prefijos de entorno y configuración de cada aplicación.

## Estructura objetivo acordada

El código transversal se agrupa en `libs/shared/` y los contextos de negocio en `libs/backend/`. Core es una referencia de organización y convenciones; POS Platform es independiente y no consume su código, paquetes ni servicios.

La estructura define seis aplicaciones operativas y el proyecto de pruebas `pos-clients-e2e`, sin artefacto de despliegue. La documentación se publica desde POS Docs. El [estado de implementación](#estado-de-implementación) indica el alcance disponible.

<!-- monorepo:target:start -->
```text
apps/
  pos-desktop/                  # Aplicación completa: shell Tauri + frontend Angular
  pos-mobile/                   # Aplicación completa: shell Capacitor + frontend Angular
  branch-api/                   # API y composición de negocio de sucursal
  branch-sync-worker/           # Proceso de entrega y recepción de sucursal
  country-api/                  # API de recepción y capacidades de país
  erp-worker/                   # Proceso de integración, traducción y conciliación ERP
  pos-clients-e2e/              # Pruebas de la UI; proyecto Nx de pruebas, sin despliegue
    mobile/                     # Suite Angular móvil; no prueba el host Capacitor
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
  shared/
    backend/                    # Base técnica del servidor; división de proyectos por definir
      bootstrap/                # Creación, arranque y cierre
      config/                   # Configuración validada e inyectable
      http/                     # Adaptación HTTP, errores y contrato técnico
      observability/            # Pino, correlación y Sentry opcional
      health/                   # Sondas del proceso y disponibilidad comprobada
      worker/                   # Ciclo de vida de procesos de trabajo
    frontend/
      ui/                       # Preset, tokens y componentes de presentación
    kernel/                     # Modelo mínimo acordado entre contextos; sin frameworks
    contracts/                  # Sobres y metadatos técnicos comunes; no todos los DTO de negocio
    testing/                    # Soporte técnico extraído cuando existan consumidores comunes
  country-policies/             # Perfiles nacionales; reglas específicas bajo su contexto
  domain/                       # Reglas puras del prototipo frontend
  data-access/                  # Estado y adaptadores mock de las funcionalidades
tools/                          # Herramientas de build, lint y pruebas del producto
.github/
  workflows/                    # Validaciones y entrega
```
<!-- monorepo:target:end -->

Las carpetas internas de `shared/backend` representan responsabilidades; la separación en proyectos Nx depende de sus consumidores y límites de dependencia.

<span id="correspondencia-con-el-checkout-actual"></span>
<span id="inventario-físico-actual"></span>

## Estado de implementación

Los clientes funcionan con adaptadores mock. El backend dispone de arranque, configuración, observabilidad y sondas; los contextos comerciales y workers son scaffolds sin operación real. La organización completa de `libs/shared/` y el proyecto `pos-clients-e2e` están pendientes.

La [guía de API](api.md), la [guía de pruebas](testing.md) y la [evidencia del producto](product-repository.md) describen las rutas y comandos disponibles en la revisión verificada. El árbol objetivo no acredita nuevos imports ni capacidades ya implementadas.

Las bibliotecas se consumen por entradas públicas `@pos-platform/<nombre>`; las pantallas usan `@pos-platform/features/<nombre>`. El grafo Nx y las reglas de importación expresan sus fronteras. Una carpeta no equivale a un servicio desplegado.

## Composición de los clientes

`pos-desktop` y `pos-mobile` son aplicaciones completas: cada una incluye una shell nativa y su frontend Angular/PrimeNG. Tauri aloja el frontend de escritorio y Capacitor el móvil. Cada frontend tiene arranque y build propios; comparten código de interfaz. La [composición de las aplicaciones](decisions/native-clients.md#shell-nativa-y-frontend) muestra qué contiene cada shell. La ejecución nativa y homologación no se deducen de un build Angular.

`libs/client-shell` comparte componente raíz, configuración, rutas, guards y marco de navegación Angular; `libs/features` mantiene las funcionalidades. Esta biblioteca de composición de interfaz se incluye en los bundles Angular, mientras que las shells nativas se configuran en sus respectivas aplicaciones. La composición del producto permanece fuera de la infraestructura genérica de `shared/frontend`.

La UI reutilizable pertenece a `shared/frontend/ui`. Los contratos puros pueden ser consumidos por ambos clientes; las implementaciones Nest, SQL y SDK de servidor permanecen fuera de sus dependencias.

## Límites DDD de shared

`shared/` agrupa bibliotecas con responsabilidades independientes. No será una biblioteca universal ni tendrá un barrel `@pos-platform/shared` que exporte todo. Cada biblioteca tendrá una entrada pública y dependencias verificables; un proyecto Nx adicional se justifica por su responsabilidad, consumidores o aislamiento, no por el número de carpetas.

| Grupo objetivo | Contenido permitido | Propietario y límite |
| --- | --- | --- |
| `shared/backend` | Arranque, configuración, HTTP, observabilidad y mecanismos técnicos | No conoce reglas comerciales ni importa implementaciones de los contextos |
| `shared/frontend/ui` | Tokens, preset y componentes de presentación | No accede a persistencia ni decide descuentos, permisos comerciales o pagos |
| `shared/kernel` | Conceptos mínimos con semántica e invariantes acordadas entre contextos | TypeScript puro; cambios coordinados con sus consumidores; no un modelo global de entidades |
| `shared/contracts` | Sobres de mensajes y metadatos transversales de intercambio | Sin Nest, Angular ni modelos ORM; no absorbe todos los contratos de negocio |
| `shared/testing` | Relojes controlables, fixtures técnicas y soporte reutilizable | Solo consumidores de pruebas; producción no puede importarlo |

Un contrato como `SaleConfirmedV1` pertenece a ventas y se expone desde una entrada pública de contratos del contexto, independiente de Nest y de sus entidades internas. El sobre técnico puede pertenecer a `shared/contracts`. Compartir un contrato no transfiere la propiedad del negocio al grupo compartido.

Un tipo `Money` solo pertenece al kernel si sus consumidores acuerdan la misma semántica. Los tipos iniciales actuales no implementan por sí solos validación de importes, redondeo o políticas comerciales. `Customer`, `Product` y `Sale` no se centralizan porque compartan nombres o campos: cada contexto conserva el modelo que necesita.

### Direcciones de dependencia objetivo

- Las apps componen módulos; los controladores delegan casos de uso.
- El dominio de cada contexto depende únicamente de código puro y, cuando proceda, del kernel acordado. No importa infraestructura técnica, Nest, Angular ni ORM.
- Aplicación define los puertos; infraestructura los implementa con mecanismos de `shared/backend`. La composición conecta esas piezas.
- Los contextos colaboran mediante contratos públicos y puertos explícitos; no importan repositorios, tablas ni implementaciones privadas ajenas.
- El frontend consume contratos públicos y presentación; no importa bibliotecas de servidor.
- Las bibliotecas de producción no importan `shared/testing` ni proyectos E2E. Las pruebas pueden consumir sus APIs públicas.

Los límites se comprueban mediante tags Nx, restricciones de importación y pruebas de arquitectura. Las reglas actuales separan navegador, servidor y bibliotecas puras; la cobertura completa de la clasificación objetivo está pendiente.

### Infraestructura pendiente y propiedad de datos

Autenticación/autorización, persistencia, migraciones, mensajería durable, idempotencia y resiliencia requieren implementación. No se crean módulos vacíos para dar por resueltas esas capacidades. Caché, alertas y controles operativos se incorporan con un consumidor, contrato y criterio de aceptación concretos.

La conexión y el ejecutor técnico de transacciones pueden compartirse; las tablas, repositorios y migraciones de ventas siguen perteneciendo a ventas. La escritura comercial y su outbox deben compartir la transacción correspondiente. Una utilidad de reintentos no decide repetir un pago de resultado desconocido: esa política pertenece a pagos.

## Proyectos de pruebas y herramientas

`apps/pos-clients-e2e/` agrupa las pruebas Playwright de las interfaces Angular, con dependencias explícitas de `pos-desktop` y `pos-mobile`. Incluye fixtures, reportes, arranque local y ejecución contra el build de producción en CI. Es un proyecto de pruebas; no cuenta como aplicación operativa.

Las pruebas HTTP permanecen junto a cada API; las pruebas unitarias y de integración se mantienen cerca de su código. `shared/testing` solo extrae soporte técnico compartido: las fábricas de ventas o pagos conservan su propietario. `tools/backend` sigue siendo herramienta del workspace, no una dependencia de runtime.

Una suite `pos-system-e2e` requerirá un recorrido real sucursal–persistencia–país. `pos-desktop-e2e` se justificará con capacidades nativas de Tauri: probar Angular en Chromium no verifica instalación ni periféricos. Esas suites son futuras y no forman parte del inventario existente. La [guía de pruebas](testing.md) detalla alcances y criterios.

## Aplicaciones y ubicación propuesta

<!-- monorepo:applications:start -->
| Aplicación | Lugar previsto | Responsabilidad | Estado revisado |
| --- | --- | --- | --- |
| `pos-desktop` | Puesto Windows | Aplicación completa: shell nativa Tauri y frontend Angular | Frontend con adaptadores mock; integración nativa real pendiente |
| `pos-mobile` | Dispositivo Android/iOS | Aplicación completa: shell nativa Capacitor y frontend Angular | Frontend con adaptadores mock; ejecución y distribución nativas por verificar |
| `branch-api` | Sucursal | API y composición de negocio de sucursal | Base HTTP local; sin persistencia ni operaciones comerciales |
| `branch-sync-worker` | Sucursal | Proceso de entrega y recepción de sucursal | Esqueleto local; sin jobs ni sincronización real |
| `country-api` | País | API de recepción y capacidades de país | Base HTTP local; sin recepción de ventas ni consolidación |
| `erp-worker` | Red autorizada del ERP | Proceso de integración, traducción y conciliación ERP | Esqueleto local; sin conexión a ERP |
<!-- monorepo:applications:end -->

Los workers tienen ciclo de vida propio. No se añade un listener HTTP de negocio solo para ejecutar tareas. Un futuro backoffice separado o un worker adicional de país requiere una necesidad concreta; no forma parte de estas seis aplicaciones operativas. Starlight se compila desde el repositorio editorial POS Docs y no integra el grafo Nx del producto.

## Comandos del workspace

| Comando                   | Alcance                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `npm start` | Interfaz Angular de escritorio en `http://127.0.0.1:4300` |
| `npm run build` | Compila los bundles Angular de escritorio y móvil secuencialmente |
| `npm run desktop:bundle` | Compila sólo el bundle Angular de escritorio |
| `npm run desktop:dev` | Abre Tauri con servidor de desarrollo |
| `npm run desktop:build` | Empaqueta Tauri, incluido su bundle Angular |
| `npm run mobile:start` | Interfaz Angular móvil en `http://127.0.0.1:4301` |
| `npm run mobile:build` | Compila sólo el bundle Angular móvil |
| `npm run mobile:sync:android` / `mobile:sync:ios` | Construye y sincroniza el proyecto nativo |
| `npm run mobile:android` / `mobile:ios` | Ejecuta el cliente en el entorno nativo disponible |
| `npm run api:dev`         | API de sucursal en `http://127.0.0.1:3000`                                       |
| `npm run country:dev`     | API de país en `http://127.0.0.1:3001`                                           |
| `npm run sync:check`      | Compone y cierra el contexto del worker de sincronización; no ejecuta jobs       |
| `npm run erp:check`       | Compone y cierra el contexto del worker ERP; no envía operaciones                |
| `npm run backend:check`   | Lint, tipos, pruebas y build de proyectos backend y librerías puras del producto |
| `npm run backend:build`   | Genera los artefactos de las cuatro aplicaciones backend                         |
| `npm run backend:smoke`   | Verifica los cuatro artefactos fuera del monorepo con dependencias de producción |
| `npm run structure:check` | Comprueba las reglas arquitectónicas del scaffold                                |
| `npm run graph`           | Muestra el grafo de proyectos Nx                                                 |

Estos comandos se ejecutan desde **pos-platform**. Los comandos `api:*` trabajan únicamente con `branch-api`. Los checks de workers comprueban composición y cierre; no equivalen a tener un consumidor, calendario o cola funcionando. El [mantenimiento de Starlight](../apps/starlight/README.md) describe los comandos independientes que se ejecutan en POS Docs.

## Propiedad de datos por contexto

Esta tabla fija la responsabilidad propuesta para implementar los módulos. No describe tablas o repositorios ya creados. La misma librería puede aportar contratos y casos de uso a más de una aplicación, pero una operación conserva una autoridad de escritura definida.

| Contexto         | Datos y decisiones bajo su responsabilidad                                                     | Frontera que debe conservar                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `sales`          | Venta, líneas, importes y referencias comerciales; versión de precios aplicada                 | El escritor de sucursal confirma la operación; la copia de país no reescribe su historia                   |
| `cash`           | Turno, fondo, movimientos, arqueo, custodia y cierre                                           | Solo el módulo modifica el libro de caja; pagos y ventas aportan hechos mediante contratos                 |
| `payments`       | Intento de pago, referencia externa, resultado confirmado/rechazado/desconocido y conciliación | Un timeout no autoriza un segundo cobro; la evidencia bancaria sigue perteneciendo al proveedor            |
| `collections`    | Aplicaciones de cobros y anticipos, referencias a deuda y reservas autorizadas                 | Leer un saldo no concede exclusividad para consumirlo; se debe acordar la autoridad de reserva             |
| `returns`        | Cantidades devueltas y vínculo con las líneas e importes originales                            | Devolución comercial, documento fiscal y devolución de dinero son operaciones diferentes                   |
| `pricing`        | Espejo versionado, vigencias, reglas, conjunto activo y resultado explicable                   | La sucursal evalúa datos autorizados; no pasa a ser autora del precio corporativo                          |
| `catalog`        | Proyecciones de productos, clientes y maestros necesarios para operar                          | Cada dato conserva su dueño; el stock consultivo de Chile no se modifica al vender                         |
| `fiscal`         | Solicitudes de emisión, referencias y estados del proveedor fiscal                             | El estado local y la impresión no acreditan aceptación fiscal; homologación por país                       |
| `devices`        | Configuración y estado de comandos de periféricos a través de puertos                          | SDK, drivers y capacidades nativas quedan en adaptadores; entregar al spooler no prueba impresión física   |
| `sync`           | Inbox/outbox, cursor, intento, entrega, programación y acuses                                  | Los productores insertan outbox en la transacción de negocio; el worker no escribe tablas ajenas           |
| `erp`            | Traducciones, referencias externas, entrega y resultado del ERP                                | DTO y estados externos quedan detrás de ACL/adaptadores; un acuse de transporte no equivale a registro ERP |
| `reporting`      | Proyecciones y consultas para indicadores, reportes y exportaciones                            | No modifica operaciones de origen; distingue información incompleta o pendiente                            |
| `administration` | Ámbito empresa/país/sucursal/caja, módulos, políticas y asignaciones                           | Identidad y autorización necesitan integración real; configuración no reemplaza controles de servidor      |

PostgreSQL de sucursal es la persistencia recomendada para negocio y mensajes durables del perfil sin WAN. PostgreSQL operativo por país mantiene sus propias recepciones y proyecciones. Los clientes no acceden a SQL directamente. Esos motores y migraciones están pendientes; no se instala una base por caja como consecuencia de crear el monorepo.

En la composición objetivo, `country-api` expone trabajo y resultados de integración mediante contratos y casos de uso públicos del contexto `erp`; ese contexto conserva la propiedad de destinos, referencias y estados ERP en PostgreSQL de país. `sync` gobierna el transporte, los acuses y la deduplicación técnica. La ACL y los adaptadores de proveedor se ejecutan dentro de `erp-worker`, que inicia HTTPS autenticado hacia `country-api` desde la red autorizada del ERP. Estos casos de uso y su persistencia están pendientes; el scaffold actual no implementa ese circuito. El [C3 de país y de ERP](c4-arquitectura-propuesta.md#c3-de-país-recepción-consulta-y-entrega-de-trabajo) detalla los límites.

```mermaid
flowchart LR
    Client["pos-desktop / pos-mobile"] -->|"API propuesta"| Branch["branch-api"]
    Branch -->|"Transacción propuesta"| Local[("PostgreSQL sucursal")]
    Sync["branch-sync-worker"] -->|"Entrega / recepción propuesta"| Country["country-api"]
    Sync -->|"Inbox / outbox"| Local
    Country --> Central[("PostgreSQL país")]
    ERP["erp-worker"] -->|"Trabajo y resultados · HTTPS saliente"| Country
    ERP -->|"ACL + adaptador"| External["ERP externo"]
```

El diagrama muestra la topología objetivo. En esta entrega no existen las conexiones entre aplicaciones, bases y proveedores. El frontend sigue usando el mock. La continuidad ante caída de WAN depende de la LAN y del servidor de sucursal; autonomía ante caída de ambos sería un perfil adicional con decisiones propias.

## Capas y reutilización interna

Los contextos se crean como un esqueleto explícito para dar ubicación y propietario al trabajo. Sus módulos y contratos iniciales no constituyen una implementación de negocio. No se añaden fachadas que devuelvan éxitos ficticios, repositorios vacíos presentados como persistencia ni endpoints de mutación sin casos de uso.

Cuando se implemente una capacidad, la organización interna sigue su complejidad:

- `api`: controladores, DTO y validación del contrato de entrada.
- `application`: casos de uso, coordinación y puertos requeridos.
- `domain`: reglas e invariantes puras cuando exista dominio que lo justifique.
- `infrastructure`: adaptadores de datos, proveedores o dispositivos.
- `config`: composición y configuración específica del contexto.

Un módulo de consulta simple no necesita fabricar entidades o cinco proyectos Nx separados. Los contextos se comunican por fachadas o interfaces públicas cuando esa interacción exista; no importan repositorios ni modelos privados de otro contexto. `shared/kernel` contiene únicamente conceptos estables compartidos; `shared/contracts` describe intercambios transversales versionados, y `country-policies` contiene perfiles nacionales explícitos. Ninguna de esas tres librerías puras depende de Nest o Angular.

Las aplicaciones Node comparten configuración, HTTP, errores, logging y ciclo de vida. La app compone sus módulos y selecciona su identidad; la infraestructura técnica no conoce reglas comerciales de los contextos.

El logging permanece en Pino mediante `nestjs-pino`. El reporte opcional con Sentry también pertenece a esta frontera técnica y usa un cliente privado por aplicación: DSN vacío y deshabilitado por defecto, sin instrumentación global, captura automática de solicitudes o trazas distribuidas. Los contextos no deben importar el SDK ni duplicar capturas que ya resuelve la frontera HTTP o de proceso. El [contrato de observabilidad](api.md#reporte-opcional-de-errores-con-sentry) describe datos permitidos, exclusiones, cierre y límites de entrega; estas capacidades no reemplazan identidad, persistencia ni auditoría de negocio.

## Compilación y distribución

### Reglas de código y fronteras

ESLint tiene alcances explícitos; una comprobación sintáctica no se presenta como análisis de tipos de todo el frontend.

| Alcance                                                                                                      | Controles                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aplicaciones y librerías TypeScript                                                                          | Sin `any` explícito, `console`, `debugger`, evaluación dinámica ni supresiones de tipos sin justificar; imports y variables comprobados                                        |
| Cuatro apps Node, `libs/backend`, `libs/platform/backend`, `contracts`, `shared-kernel` y `country-policies` | Lint con tipos mediante `tsconfig.eslint.backend.json`, incluyendo sus tests y configuración: promesas, uso inseguro de valores, manejo de errores y exhaustividad de `switch` |
| Aplicaciones y contextos backend                                                                             | Configuración de entorno en la frontera de arranque/configuración; logging por inyección de `nestjs-pino`; sin SDK Sentry ni creación de loggers propios                       |
| Interfaz Angular                                                                                             | Contratos visuales y reglas Angular existentes, junto con las reglas sintácticas comunes; el análisis tipado anterior no cubre el frontend                                     |

Las promesas deben esperarse o manejarse explícitamente: escribir `void` no desactiva la regla. Los tests no deben quedar enfocados u omitidos mediante `only`/`skip`. En backend y librerías puras, `noInlineConfig` impide desactivar reglas con comentarios en el código; las excepciones deben definirse en la configuración central, con alcance preciso y revisión. En el resto del TypeScript, una supresión necesita regla y motivo, y falla si deja de ser necesaria. `@ts-ignore` y `@ts-nocheck` están prohibidos; `@ts-expect-error` exige una descripción de al menos diez caracteres. El bootstrap Angular conserva una excepción acotada para informar un fallo anterior a la inyección mediante `console.error`.

`@nx/enforce-module-boundaries` separa navegador, servidor y librerías puras; también impide que los contextos backend importen otros contextos o que la plataforma técnica dependa de negocio. La app compone módulos. Introducir una futura colaboración requiere definir su contrato y dirección de dependencia; no se habilitan imports internos ni se desactiva el límite por conveniencia. Las pruebas de arquitectura ejercitan la configuración real de ESLint y el grafo Nx.

`npm run lint` comprueba aplicaciones y librerías; `npm run backend:check` incluye los targets de lint del backend. El análisis estático no prueba autorización, atomicidad, privacidad de cualquier texto arbitrario ni corrección comercial; esas garantías requieren contratos y pruebas del comportamiento implementado.

### Artefactos

Las aplicaciones backend consumen librerías fuente del workspace. Rspack y el plugin oficial de Nx empaquetan ese código con SWC y metadata de decoradores; Nest/Fastify y las demás dependencias de runtime se instalan desde el manifiesto y lockfile del artefacto. TSC conserva la comprobación de tipos y Vitest/SWC ejecuta las pruebas. No se publican todas las librerías como paquetes npm solo para desplegar una aplicación.

Cada artefacto debe instalarse y arrancar fuera del monorepo, con sus dependencias declaradas. El empaquetado incluye las bibliotecas internas que necesita la aplicación; la resolución accidental desde el `node_modules` raíz no valida su distribución.

Los clientes tienen bundles Angular independientes y empaquetado nativo por plataforma. POS Docs publica el portal en `/`, Starlight en `/guide/` y las presentaciones en `/presentations/`. Su despliegue en Vercel es independiente del producto.

## Evidencia que orienta los límites

Core se inspeccionó en el commit `531f9aa80bc0f9b60ca29bfa38e6694453af99ba`. Las evidencias del legado provienen del [inventario de repositorios](analisis-repositorios/README.md) de la propuesta. Es un análisis de código; no certifica qué artefactos están desplegados. Los enlaces de los repositorios corporativos requieren sus permisos habituales y no incluyen valores de configuración sensibles.

| Fuente y snapshot                                              | Rutas de evidencia                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Decisión que informa                                                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core · `531f9aa80bc0f9b60ca29bfa38e6694453af99ba`              | [`apps/core-api/src/bootstrap`](https://github.com/developer-implementos/core/tree/531f9aa80bc0f9b60ca29bfa38e6694453af99ba/apps/core-api/src/bootstrap), [`apps/core-api/rspack.config.js`](https://github.com/developer-implementos/core/blob/531f9aa80bc0f9b60ca29bfa38e6694453af99ba/apps/core-api/rspack.config.js), [`libs/ecommerce-payment`](https://github.com/developer-implementos/core/tree/531f9aa80bc0f9b60ca29bfa38e6694453af99ba/libs/ecommerce-payment) | Apps que componen módulos, librerías por contexto y empaquetado de código interno; convenciones de API detalladas en [api.md](api.md#referencia-core) |
| Mountain · `711f97fd7948c696bf45c992c5b121683bdbacd7`          | [`backend/app/Controllers/Http/PuntoDeVentaController.js`](https://github.com/developer-implementos/mountain-implementos/blob/711f97fd7948c696bf45c992c5b121683bdbacd7/backend/app/Controllers/Http/PuntoDeVentaController.js#L152-L233), [`backend/app/Services/ProductosService.js`](https://github.com/developer-implementos/mountain-implementos/blob/711f97fd7948c696bf45c992c5b121683bdbacd7/backend/app/Services/ProductosService.js#L134-L205)                   | Conservar transacción comercial y separar fiscalidad; sustituir dependencia online del cálculo de precio mediante una capacidad local validada        |
| Sincronizador · `540ab9a70e7befbca27a2f7eb88b87b25109e4d1`     | [`app/Services/ColaMensajeService.js`](https://github.com/developer-implementos/mountain-sync-sucursal/blob/540ab9a70e7befbca27a2f7eb88b87b25109e4d1/app/Services/ColaMensajeService.js#L17-L199), [`app/Services/MensajeDetalleService.js`](https://github.com/developer-implementos/mountain-sync-sucursal/blob/540ab9a70e7befbca27a2f7eb88b87b25109e4d1/app/Services/MensajeDetalleService.js#L79-L780)                                                               | Separar entrega, aplicación y confirmación, con recuperación durable y autoridad de cada módulo                                                       |
| APIs corporativas · `8fbe2f1b4d4e464a403aa3daca63ffe712a9dd70` | [`apiMountainPosCaja/Controllers/CajaController.cs`](https://github.com/developer-implementos/apis-implementos/blob/8fbe2f1b4d4e464a403aa3daca63ffe712a9dd70/apiMountainPosCaja/Controllers/CajaController.cs#L164-L304), [`ServiciosAX/mountainPosCajaServices/RespuestaAx.cs`](https://github.com/developer-implementos/apis-implementos/blob/8fbe2f1b4d4e464a403aa3daca63ffe712a9dd70/ServiciosAX/mountainPosCajaServices/RespuestaAx.cs#L9-L50)                      | Mantener traducción semántica de resultados ERP en `erp`, sin exponer `RecId` o resultados por tabla como estados propios del POS                     |

La evaluación de [pagos y notas de crédito](analisis-repositorios/api-pagos-caja.md), snapshot `33cd625f029aa78798f0baf307c41e17ebee92e1`, y la de [impresión/MICR](analisis-repositorios/api-impresion-caja.md), snapshot `2e74b2d64985902f5fdfb52902016a5f65d7b577`, completan los límites de `payments`, `collections`, `returns` y `devices`. La API histórica de pagos es agregadora de datos/estados de NC, no autorización bancaria; el spooler de Windows tampoco acredita la impresión física.

En esta revisión también se contrastó el checkout `desarrollo` del sincronizador (`97e6d59bfe5e529c941baafa351507a93715d712`) con el informe de `master` citado arriba. Para delimitar la recepción de país se revisó el concentrador (`b2fd1ec266d131abb54b7076d41acce30f045119`), especialmente [`api-lectura/app/Controllers/Http/MensajeSalidasController.js`](https://github.com/developer-implementos/mountain-concentrador/blob/b2fd1ec266d131abb54b7076d41acce30f045119/api-lectura/app/Controllers/Http/MensajeSalidasController.js): sus estados de recibido/procesado justifican separar el acuse durable del resultado ERP. Ninguno de estos snapshots acredita la versión desplegada.

## Estado y siguientes incrementos

| Estado       | Alcance                                                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementado | UI mock de Chile compartida por Tauri/Capacitor, base técnica Nest/Fastify, configuración validada, logging y errores comunes, pruebas y empaquetado                    |
| Scaffold     | Aplicaciones y librerías por responsabilidad, puntos de composición, contratos y perfiles iniciales sin operación comercial real                           |
| Pendiente    | Identidad y permisos de servidor, PostgreSQL/migraciones, transacciones, reglas completas de país, protocolos, jobs durables, integraciones y homologación |

Los [criterios técnicos de la base](implementation-plan.md#organización-y-criterios-de-aceptación) definen las comprobaciones para la estructura y sus dependencias.

La implementación comercial avanza por recorridos comprobables:

1. Acordar contrato, propietario de datos y criterios de aceptación de una capacidad; contrastar casos de Chile con el legado sin ejecutar efectos externos duplicados.
2. Implementar identidad/ámbito y persistencia de sucursal con migraciones y recuperación; probar una transacción de negocio y su outbox en la misma conexión.
3. Reemplazar un adaptador mock del frontend por la API autorizada, manteniendo los demás recorridos explícitamente mock hasta completar sus contratos.
4. Implementar precio local reproducible: paquetes versionados, eventos incrementales, carga masiva programada, ejecución manual controlada y activación atómica.
5. Conectar recepción de país y ERP con inbox/efecto atómicos, deduplicación, acuses precisos y conciliación; verificar reinicios, duplicados, backlog y respuestas inciertas.
6. Homologar un segundo perfil nacional mediante políticas/adaptadores y pruebas de compatibilidad, sin duplicar el producto. Habilitar cada capacidad mediante criterios de piloto y operación acordados.

La ordenación no obliga a completar un módulo entero antes de probar una capacidad; cada incremento debe atravesar contrato, caso de uso, persistencia, interfaz y recuperación cuando correspondan.

<span id="nombre-y-compatibilidad"></span>

## Repositorio e identidad de instalación

El repositorio corporativo es [developer-implementos/pos-platform](https://github.com/developer-implementos/pos-platform). El paquete raíz y los aliases usan `pos-platform` y `@pos-platform/*`.

```sh
git clone https://github.com/developer-implementos/pos-platform.git
```

Las claves de almacenamiento de la demostración son `corporate-pos:demo:v1` y `corporate-pos:auth:v1`. El identificador Tauri `com.floxcristian.corporatepos` determina la identidad instalada y el directorio de datos del WebView. Son identificadores técnicos persistentes; cualquier cambio requiere comprobar la compatibilidad de datos y la actualización del instalador en Windows.
