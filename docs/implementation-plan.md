# Base técnica y recorridos de la interfaz

<span id="caja-corporativa--plan-de-entrega"></span>

El monorepo dispone de identidad y administración operativas propias de POS y de un recorrido de venta conectado a PostgreSQL, y corre de una sola forma en local, CI, QA y producción ([ADR-25](decisions/single-operational-mode.md)). Esta página distingue los recorridos de la interfaz, las bases de APIs y workers y los controles para trabajar en el código. La [guía F01](phase-1-laboratory.md) delimita la implementación; la [evidencia del producto](product-repository.md) identifica su revisión y sus límites.

El [roadmap de POS Platform](roadmap.md) define la secuencia de entrega funcional, con un plan detallado por fase. Sus entregables, dependencias y pruebas de aceptación son la referencia para desarrollar el producto; la organización del código y los controles técnicos de esta página no acreditan esos resultados.

<span id="producto"></span>

<span id="alcance-de-la-demostración"></span>

## Alcance de la interfaz

El cliente conectado recorre una caja para Chile contra `branch-api`: turno y efectivo, venta y presupuesto, seguimiento de operaciones y administración de accesos, según el rol y las capacidades activadas en cada caja. En el ambiente local y en las pruebas usa una sucursal aprovisionada igual que QA, con productos, precios y clientes sintéticos de una publicación comercial ficticia. Las pantallas que sólo existían en la demo retirada no tienen reemplazo hasta que su entregable las implemente contra la API. La cobertura y las variantes del sistema anterior están detalladas en [el inventario de Chile](audit-chile-for-product.md).

<span id="base"></span>

## Aplicaciones y estado actual

El corte F02 contiene siete aplicaciones y añade `device-agent` con persistencia SQLite y protocolo HTTPS. La [guía F02](phase-2-payments-documents.md) delimita la implementación parcial integrada. Sus nombres delimitan responsabilidades; disponer de un proyecto compilable no implica tener su comportamiento operativo completo ni su homologación.

| Aplicación | Base disponible | Capacidad que requiere implementación y aceptación |
| --- | --- | --- |
| `pos-desktop` | Angular/PrimeNG, perfiles conectados y dos ejecutables Windows Tauri con política embebida comprobada en F01-04 | Homologación nativa, periféricos y distribución en sus fases |
| `pos-mobile` | Angular/PrimeNG, Capacitor y perfiles explícitos; APK Android y política embebida comprobados | Dispositivos, operación instalada y entrega de cada plataforma en sus fases correspondientes |
| `branch-api` | NestJS/Fastify, OpenAPI JSON y F01 en PostgreSQL: acceso, configuración, caja, catálogo, clientes, cotización y venta recuperable | Aceptación funcional y controles productivos; recorridos posteriores según roadmap |
| `branch-sync-worker` | Composición técnica de un proceso independiente | Entrega y recepción durables, reintentos y recuperación con los datos reales de sucursal |
| `country-api` | Composición técnica, persistencia y sonda PostgreSQL por ámbito | Recepción durable, consolidación y contratos de trabajo/resultados; BullMQ + Redis de trabajos de país para disparos y solicitudes breves, con calendario e identidad durables |
| `erp-worker` | Composición técnica y CLI de consultas HTTPS acotadas a Mountain; acceso corporativo pendiente | BullMQ + Redis de trabajos en red ERP para ejecución, preparación de maestros y consulta/conciliación; contratos, reconstrucción e idempotencia comprobados |
| `device-agent` | Host .NET 10, SQLite y protocolo HTTPS con `branch-api`; publicación Windows x64 e interoperabilidad real comprobadas | Instalación de servicio y primer driver/modelo; red compartida y móvil en F06 tras homologación |

Los dos clientes comparten bibliotecas de presentación y flujos. Las cuatro aplicaciones backend reutilizan mecanismos técnicos y delimitan sus contextos de negocio. La [arquitectura de la implementación](architecture.md) y la [base de API](api.md) detallan sus alcances. El [catálogo del monorepo](monorepo.md) distingue la estructura objetivo de la evidencia del código.

<span id="reorganización-del-monorepo-acordada"></span>

## Organización y criterios de aceptación

POS Platform es un producto independiente, con Core solo como referencia. La [estructura objetivo](monorepo.md#estructura-objetivo-acordada) agrupa mecanismos transversales en `libs/shared/` y delimita los contextos de negocio. La siguiente tabla define responsabilidades y condiciones de aceptación; no certifica que todas estén implementadas.

| Área | Responsabilidad | Criterio de aceptación |
| --- | --- | --- |
| Documentación | Estructura del producto, propiedad DDD, proyectos de pruebas y evidencia identificada | Catálogo sincronizado, navegación, Astro, build y comprobación de navegador |
| Base backend | Mecanismos técnicos del servidor en `shared/backend`, con proyectos definidos por fronteras reales | Lint, tipos, tests y build backend; artefactos arrancan fuera del workspace |
| Trabajos BullMQ | Programación breve de `country-api` y ejecución/lotes/conciliación de `erp-worker`, con Redis exclusivo por entorno | [ADR-18](decisions/job-processing.md): persistencia, relay tras commit, reconstrucción tras pérdida de Redis, pérdida de lock, identidad e incertidumbre externa; pendiente de implementar |
| Periféricos | `devices` autoriza y audita en `branch-api`; `device-agent` ejecuta en el equipo Windows conectado al hardware | Contratos TypeScript/C#, pruebas de recuperación y hardware, instalación firmada y exclusión por dispositivo; criterios en [ADR-17](decisions/device-agent.md) |
| Contratos y kernel | Sobres técnicos en `shared/contracts` y modelo mínimo acordado en `shared/kernel` | Dominio puro; contratos comerciales conservan propietario; sin imports de frameworks |
| UI transversal | Componentes, tokens y activos de presentación en `shared/frontend/ui` | Builds de ambos clientes, iconografía, accesibilidad y recorridos de UI verificados |
| E2E y soporte | `pos-clients-e2e` declara dependencias de `pos-desktop` y `pos-mobile`; `shared/testing` reúne mecanismos usados por varias suites | CI prueba el build de producción; reportes y fixtures funcionan; producción no importa testing |
| Workspace y entrega | Aliases, tags, tsconfigs, targets, entradas de caché, scripts y CI describen dependencias comprobables | Imports públicos válidos, builds reproducibles y catálogo consistente con la evidencia del producto |

Las reglas de ventas, caja y pagos pertenecen a sus contextos; las variantes nacionales pertenecen al contexto que las evalúa. Compartir consumidores no convierte una regla comercial en infraestructura genérica. Las pruebas de fronteras deben rechazar dependencias de servidor desde navegador, frameworks desde dominio, producción hacia testing e imports privados entre contextos.

La verificación técnica utiliza `pnpm run icons:check` cuando afecte UI, `pnpm run lint`, `pnpm test`, `pnpm run build`, `pnpm run test:e2e` y los checks backend/estructura correspondientes. La [guía de pruebas](testing.md) diferencia los alcances y las capacidades aún pendientes de verificación.

Persistencia, identidad e integraciones se desarrollan por recorridos verificables. Una carpeta, un endpoint vacío o una prueba que devuelve éxito fijo no acreditan una capacidad comercial.

<span id="recorridos"></span>

## Recorridos de la interfaz

El cliente conectado ofrece las áreas que su sucursal habilita, según el rol de quien entra. Su presencia en la UI no equivale a una integración comercial aceptada:

1. Mi caja: apertura de turno y efectivo.
2. Ventas y presupuestos: cliente, productos, cotización en servidor, promociones, descuento autorizado por supervisor, confirmación y recuperación.
3. Seguimiento de operaciones: pagos, documentos fiscales, trabajos de impresión, expedientes y consultas al proveedor original.
4. Administración: usuarios y accesos, roles y permisos, y equipos de las cajas.

Inicio con indicadores, documentos, cobranzas, devoluciones, maestros, sincronización, reportes y observabilidad sólo existían en la demo, con datos simulados; se implementan con su entregable del [roadmap](roadmap.md).

<span id="comprobación"></span>

## Comprobación técnica

Los controles del monorepo deben comprobar tipos, dependencias, builds, importes, políticas y recorridos de UI, además de accesibilidad en escritorio y móvil. Las pruebas de navegador corren contra la API real y una sucursal aprovisionada; la aceptación de persistencia, permisos, pagos y sincronización reales corresponde a los escenarios de cada fase del [roadmap](roadmap.md). Cada artefacto debe tener una revisión identificada e instrucciones reproducibles de construcción y ejecución.
