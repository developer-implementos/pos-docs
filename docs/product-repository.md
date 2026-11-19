# POS Platform

Esta página es una síntesis editorial del repositorio del producto, mantenida en POS Docs. La evidencia de código se identifica en `apps/starlight/src/data/product-evidence.json`; la revisión de esta guía es independiente de esa revisión de POS Platform. Los comandos de desarrollo de esta página se ejecutan en un checkout del producto, salvo la sección de documentación técnica.

Plataforma POS corporativa preparada para evolucionar a varios países: monorepo Nx con clientes de escritorio y móvil, backend de sucursal, backend de país y workers. El incremento operativo de Chile está integrado en `main`: conecta Angular, NestJS/Fastify y PostgreSQL real para administrar usuarios, roles y asignaciones propios de POS mediante HTTPS. Desde el [ADR-25](decisions/single-operational-mode.md) corre de una sola forma en local, CI, QA y producción: sin demo ni perfil de laboratorio, con las pruebas preparadas por las mismas puertas que QA. Conserva el lenguaje visual de **prime-showcase** (PrimeNG, Aura corporativo, Inter, tablas y navegación). La integración no implica aceptación de fase ni habilitación de una caja productiva.

Producto y repositorio: [POS Platform](https://github.com/developer-implementos/pos-platform). Los aliases internos usan `@pos-platform/*`. La [guía del monorepo](monorepo.md) explica aplicaciones, propietarios de datos, estructura por contexto y configuración del workspace.

## Repositorio del producto

Los clientes Angular con PrimeNG para escritorio (Tauri) y móvil (Capacitor) y la base del backend se mantienen en **pos-platform**. La guía Starlight, sus fuentes y diagramas pertenecen al repositorio editorial [POS Docs](https://github.com/developer-implementos/pos-docs).

El [estado de implementación por aplicación](monorepo.md#estado-de-implementación) y la [propiedad de datos por contexto](monorepo.md#propiedad-de-datos-por-contexto) se mantienen en la guía del monorepo. Usa esas referencias para localizar la responsabilidad del cambio.

Las aplicaciones comparten repositorio y contratos, con builds independientes. El cliente normal comienza en `unconfigured` y bloquea el acceso mientras su paquete no declare el origen HTTPS autorizado de la API. Con ese origen usa `branch`, el único perfil conectado, con identidad y permisos del servidor. Un perfil inválido o desconocido, como los retirados `demo` y `branch-lab`, detiene el arranque en vez de caer en otro modo. La [guía F01](phase-1-laboratory.md) describe el incremento operativo integrado y enlaza sus instrucciones de aprovisionamiento.

El [corte parcial F02 integrado](phase-2-payments-documents.md) incorpora persistencia de pagos/fiscalidad y el host de dispositivos con protocolo HTTPS y SQLite reales. La compilación y las pruebas no habilitan proveedores, numeración fiscal o hardware: esas capacidades conservan su homologación y entrega pendientes.

## Preparar una tarea

La [guía para empezar una tarea](/guide/implementation/start-a-task/) conecta la issue, las instrucciones del repositorio y el entorno que corresponde al cambio. Para trabajar con la API y PostgreSQL reales, empieza por el [incremento operativo F01](phase-1-laboratory.md#incremento-operativo-integrado), que enlaza el aprovisionamiento, o por el [corte F02](phase-2-payments-documents.md) para cobros, documentos y dispositivos. Sus guías identifican las pruebas y sus límites.

<span id="iniciar-la-demostración"></span>

## Iniciar

Requiere Node.js 22.19 o posterior en la rama 22, o Node.js 24, y pnpm 10.28.1.

El gestor y su versión exacta están declarados en `packageManager`. `corepack enable pnpm` usa esa declaración y evita fijar la versión en dos lugares; también sirve instalar `pnpm@10.28.1` por separado.

```sh
git clone https://github.com/developer-implementos/pos-platform.git
cd pos-platform
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm start
```

Abre **http://127.0.0.1:4300** para desarrollar la interfaz del cliente de escritorio. Sin un servidor configurado, el cliente muestra que falta su configuración: para recorrerla hay que preparar el [ambiente local](phase-1-laboratory.md#ambiente-local-y-comprobaciones), que aprovisiona una sucursal igual que QA con una publicación comercial ficticia, y entrar con el correo del administrador inicial. Este servidor local no es una aplicación web independiente ni un despliegue público. `pnpm run desktop:dev` abre Tauri y `pnpm run mobile:start` sirve la interfaz móvil para desarrollo. La [decisión de clientes nativos](decisions/native-clients.md) explica la separación y los límites.

Los RUT, clientes, productos y precios de la publicación ficticia son sintéticos. No hay cargos bancarios, DTE válidos ni conexiones corporativas; los permisos y las capacidades los decide el servidor.

## API de sucursal

```sh
pnpm run api:dev
```

La API requiere PostgreSQL migrado y aprovisionado, con su rol de ejecución, y siempre HTTPS. Para Chile incorpora cuentas POS, roles y asignaciones persistidos, con orígenes de cliente autorizados individualmente. No tiene otro perfil: `BRANCH_API_PROFILE=laboratory` detiene el arranque. La API publica contratos en `/api/v1`, sondas en `/health/live` y `/health/ready`, y OpenAPI JSON en `/api/openapi.json` cuando está habilitado. La [guía F01](phase-1-laboratory.md) enlaza el procedimiento de configuración; `api:dev` no crea una base ni usuarios automáticamente, y `local:api` usa el ambiente que prepara `local:provision`.

Los nombres backend expresan ámbito y proceso: `branch-api`, `branch-sync-worker`, `country-api` y `erp-worker`. La [configuración de las aplicaciones](api.md#configuración) identifica sus rutas, artefactos y variables de entorno. Los comandos `api:*` operan sobre la API de sucursal; `sync:check` verifica la composición y cierre del worker de sincronización.

La base sigue las convenciones verificadas de **Core**: composición de arranque separada, configuración tipada e inyectable, logging unificado con `nestjs-pino`, errores HTTP con contrato estable, versionado URI y pruebas Vitest/SWC. La [guía de la API](api.md#referencia-core) identifica el commit de referencia y las decisiones adaptadas al backend de sucursal.

El reporte de errores con Sentry es opcional y está deshabilitado en los ejemplos, con DSN vacío. Cada aplicación tiene un cliente privado que captura fallos en fronteras explícitas y admite solo metadatos técnicos y frames reducidos; no envía datos de clientes, cuerpos de operaciones ni logs completos. Consulta el [alcance de captura y configuración](api.md#reporte-opcional-de-errores-con-sentry). Los clientes Angular no incluyen el SDK ni reciben un DSN: envían un sobre técnico mínimo a `branch-api`, que lo reenvía dentro del presupuesto de ese proceso ([fallos de los clientes conectados](api.md#fallos-de-los-clientes-conectados)). No se ha conectado un proyecto real de Sentry.

La [decisión BullMQ + Redis de trabajos](decisions/job-processing.md) pertenece a la arquitectura objetivo: programación breve en `country-api` y ejecución/lotes/conciliación en `erp-worker`. El snapshot no acredita su instalación ni funcionamiento; los Redis de trabajos por entorno y la recuperación desde PostgreSQL siguen pendientes de implementar y probar.

Las apps backend comparten `libs/shared/backend/runtime`; la persistencia transaccional pertenece a `libs/shared/backend/persistence` y el negocio a sus contextos. `country-api` tiene base y sonda propias. `branch-sync-worker` y `erp-worker` conservan su composición sin trabajos operativos. El conector de lectura ERP es independiente: su contrato no acredita que los maestros o precios ya estén publicados en el POS ni que exista sincronización de extremo a extremo. Rspack/SWC empaqueta las apps Node y TSC comprueba tipos.

```sh
pnpm run api:check
pnpm run api:build
pnpm run api:smoke
```

Para comprobar el scaffold completo: `pnpm run backend:check`, `pnpm run backend:smoke` y `pnpm run structure:check`. `pnpm run country:dev` inicia la API de país en el puerto 3001; `pnpm run sync:check` y `pnpm run erp:check` verifican la composición y cierre de los workers sin ejecutar jobs. Consulta todos los [comandos del workspace](monorepo.md#comandos-del-workspace).

El backend y las librerías puras tienen lint con información de tipos para detectar promesas sin manejar y usos inseguros, además de fronteras Nx verificadas. Las [reglas y su alcance](monorepo.md#reglas-de-código-y-fronteras) distinguen esos controles de los del frontend; no sustituyen pruebas de comportamiento ni los requisitos pendientes de producción.

El incremento operativo permite gestionar cuentas, permisos y puestos en la sucursal, con autorización del servidor y PostgreSQL real; readiness comprueba conexión, ámbito y esquema. Catálogo, clientes y presupuestos permanecen sujetos a las capacidades informadas por el backend: sin maestros y publicación de precios verificados no se habilita cotización ni se sustituyen datos por fixtures. La entrega de outbox, contabilización ERP, fiscalidad, tarjetas y hardware siguen pendientes. Consulta [configuración, contratos y límites de la API](api.md).

## Publicar la documentación en Vercel

La configuración `vercel.json` del repositorio **pos-docs** publica el portal de recursos en `/`, la guía Starlight en `/guide/` y las presentaciones en `/presentations/`. Los clientes y el backend tienen sus artefactos y entregas en POS Platform. Consulta la [guía de publicación documental](vercel.md).

<span id="recorridos-de-demostración"></span>

## Recorridos del cliente conectado

El cliente ofrece las áreas que su sucursal habilita, según el rol de quien entra:

| Área                       | Qué cubre                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Mi caja                    | Turno y efectivo                                                                                                                  |
| Ventas y presupuestos      | Cliente, productos, cotización en servidor, promociones, descuento autorizado por supervisor, confirmación y recuperación         |
| Seguimiento de operaciones | Pagos, documentos fiscales, trabajos de impresión, expedientes y consultas al proveedor original                                  |
| Administración             | Usuarios y accesos, roles y permisos, y equipos de las cajas                                                                      |

Las pantallas que sólo existían en la demo retirada (inicio con indicadores, reportes, maestros, sincronización, cobranzas, devoluciones y otras) no tienen reemplazo hasta que su entregable del [roadmap](roadmap.md) las implemente contra la API. El inventario consultivo no cambia al vender: la caja de Chile no es la autoridad de stock.

## Arquitectura

Lo transversal se agrupa en `libs/shared/`, el negocio en `libs/backend/` y las pruebas de cliente en `tests/pos-clients-e2e`. El árbol conserva explícitamente los componentes futuros. La [guía del monorepo](monorepo.md#estado-de-implementación) delimita sus responsabilidades y estado.

<!-- monorepo:target:start -->
```text
apps/
  pos-desktop/                  # Aplicación completa: shell Tauri + frontend Angular
  pos-mobile/                   # Aplicación completa: shell Capacitor + frontend Angular
  device-agent/                 # Host .NET 10/SQLite por puesto; driver físico pendiente; red compartida en F06
  branch-api/                   # API y composición de negocio de sucursal
  branch-sync-worker/           # Proceso de entrega y recepción de sucursal
  country-api/                  # API de recepción y capacidades de país
  erp-worker/                   # Proceso de integración, traducción y conciliación ERP
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
    reporting/                  # Consultas, proyecciones y seguimiento operativo
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
  data-access/                  # Acceso a datos del cliente conectado; la demo se retiró con el ADR-25
    branch-api/                 # HTTP y estado de la operación conectada
tests/
  device-agent/                 # Pruebas .NET/SQLite, recuperación y helper de interoperabilidad HTTPS
  pos-clients-e2e/              # Playwright de los clientes contra la API real; proyecto Nx sin despliegue
    interface/                  # Contratos transversales de interfaz del cliente conectado
    mobile/                     # Cliente móvil conectado; no homologa Capacitor
    branch/                     # Recorridos Angular → API → PostgreSQL con recuperación
    operational/                # Administración, cobro y recuperación contra la API real
tools/                          # Herramientas de build, lint y pruebas del producto
.github/
  workflows/                    # Validaciones y entrega
```
<!-- monorepo:target:end -->

Core es solo referencia de organización y convenciones; no es dependencia ni servicio del POS. Las bibliotecas backend no importan Angular. Las carpetas compartidas conservan responsabilidades independientes y entradas públicas explícitas.

`features/branch-operation` consume el gateway de `data-access/branch-api`; los permisos y capacidades se vuelven a comprobar en el servidor en cada solicitud, y el cliente muestra los importes que éste calcula. Las operaciones conservan identificadores para reconocer reintentos. Pago, fiscalidad y ERP tienen ciclos separados.

El cliente `branch` utiliza cuentas y asignaciones propias de POS comprobadas por el servidor, entra con la llave del equipo activado y mantiene el token sólo en memoria. Al arrancar borra las claves `corporate-pos:demo:v1` y `corporate-pos:auth:v1`, que guardaban datos y sesiones simulados de la demo retirada.

Los límites de importación se verifican con Nx/ESLint. Se usan Angular con detección de cambios OnPush y signals, TypeScript estricto, carga diferida por área y componentes PrimeNG. La tipografía y los iconos se sirven localmente. No se utilizan `patch-package`, dependencias privadas de fuentes, telemetría ni servicios del proyecto de referencia.

## Validación

```sh
pnpm run lint
pnpm test
pnpm run build
pnpm exec playwright install chromium
pnpm run test:e2e
pnpm run desktop:info
```

Las pruebas cubren políticas, montos, persistencia, permisos, reintentos, calendarios y recorridos de navegador. `test:e2e` y los demás recorridos de navegador corren contra `branch-api` por HTTPS y un PostgreSQL efímero, así que necesitan `POS_TEST_ADMIN_URL` de loopback y OpenSSL. Los builds normales comienzan sin configurar cuando no reciben una política de despliegue. Las compilaciones nativas siguen un workflow separado y no corren en cada PR; la [guía de pruebas](testing.md#política-de-ci-del-producto) distingue su evidencia de instalación, firma de distribución y aceptación operativa. Las acciones de CI están fijadas por commit y sus permisos se declaran por job.

Validación tras la revisión de calidad (3 de octubre de 2026): **144 pruebas de lógica e infraestructura y 37 recorridos de navegador pasan**, junto con lint, formato y compilación web de producción. Los recorridos ejecutan el bundle productivo con la CSP de Tauri, incluyen tamaños de 375 y 1440 px y verifican controles de prime-showcase y accesibilidad del dashboard/reportes en claro y oscuro. El [informe de revisión](quality-review.md) detalla correcciones y condiciones pendientes para producción.

Las comprobaciones de CI se consultan en [Actions de pos-platform](https://github.com/developer-implementos/pos-platform/actions); la [guía del runner](https://github.com/developer-implementos/pos-platform/blob/main/tools/runner/README.md) mantiene su procedimiento, niveles y límites. El instalador se puede generar con `pnpm run desktop:build`.

## Clientes nativos

```sh
pnpm run desktop:dev
pnpm run desktop:build
```

El escritorio necesita Rust, MSVC/Windows SDK y WebView2. Consulta [preparación de Tauri](desktop.md). Para Android/iOS consulta [preparación de Capacitor](mobile.md); su compilación Angular no acredita apertura, permisos, periféricos ni distribución nativa. `pnpm run build` compila los dos clientes Angular secuencialmente; `desktop:build` empaqueta Tauri y los comandos móviles sincronizan o ejecutan sus proyectos nativos. La [guía F01](phase-1-laboratory.md) enlaza la preparación del paquete con su origen HTTPS exacto y la activación del equipo. El contenedor no tiene comandos para cobrar, imprimir físicamente o acceder libremente al sistema; no se acredita una distribución firmada para operación productiva.

## De maqueta a producto

El producto partió de una maqueta con datos en el navegador, retirada con el [ADR-25](decisions/single-operational-mode.md). Hoy F01 verifica operación y recuperación con API y PostgreSQL reales sobre una sucursal aprovisionada, y el incremento operativo de Chile añade administración de identidad propia de POS y configuración segura del cliente, integrado en `main` y pendiente de aceptación. **Estos estados no acreditan una caja habilitada para producción ni aceptación del roadmap.** Permanecen pendientes la integración verificada de maestros y precios, la contabilización ERP, conciliación bancaria, homologación fiscal, hardware y aceptación operativa. Los límites se describen en [arquitectura](architecture.md), [seguridad](security.md), [API](api.md) y [guía F01](phase-1-laboratory.md).

La cobertura de Chile y las referencias revisadas están en [inventario de la caja actual](audit-chile-for-product.md). Ese inventario distingue la funcionalidad de referencia, la simulación y lo que necesita integración real.

## Documentación técnica

La guía Starlight pertenece a [**POS Docs**](https://github.com/developer-implementos/pos-docs): aplicación `apps/starlight`, fuentes en `docs/` y herramientas de diagramas en `tools/diagrams/`. Su catálogo identifica la revisión de POS Platform que describe. [Mantenimiento y publicación](../apps/starlight/README.md).

```sh
git clone https://github.com/developer-implementos/pos-docs.git
cd pos-docs
npm --prefix apps/starlight ci
npm --prefix apps/starlight run dev
```

En **pos-docs**, `npm --prefix apps/starlight run build` produce el sitio estático en `dist/`, con `/guide/`, las descargas documentales y el snapshot público. La presentación existente consume un derivado fijado por revisión editorial; conserva su repositorio y no mantiene otra fuente editable de la guía.
