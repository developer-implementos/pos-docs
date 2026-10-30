# Base técnica y recorridos de demostración

<span id="caja-corporativa--plan-de-entrega"></span>

El monorepo dispone de clientes con datos sintéticos y bases técnicas de APIs y workers. Esta página describe ese punto de partida, los recorridos de la interfaz y los controles para trabajar en el código. La [evidencia del producto](product-repository.md) identifica la revisión y los límites de lo disponible.

El [roadmap de POS Platform](roadmap.md) define la secuencia de entrega funcional, con un plan detallado por fase. Sus entregables, dependencias y pruebas de aceptación son la referencia para desarrollar el producto; la organización del código y los controles técnicos de esta página no acreditan esos resultados.

<span id="producto"></span>

## Alcance de la demostración

La interfaz permite recorrer una caja corporativa para Chile con datos sintéticos, separando operación, gestión comercial y administración técnica. Las políticas, los pagos, la fiscalidad, la persistencia local y las integraciones representadas por adaptadores mock sirven para desarrollar y revisar esos flujos. No prueban autenticación de servidor, durabilidad transaccional de sucursal ni integración con proveedores reales. La cobertura y las variantes del sistema anterior están detalladas en [el inventario de Chile](audit-chile-for-product.md).

<span id="base"></span>

## Aplicaciones y estado actual

El producto revisado tiene seis puntos de entrada. La estructura objetivo añade `device-agent` como séptima aplicación, pendiente de implementación. Sus nombres delimitan responsabilidades; disponer de un proyecto compilable no implica tener su comportamiento operativo implementado.

| Aplicación | Base disponible | Capacidad que requiere implementación y aceptación |
| --- | --- | --- |
| `pos-desktop` | Aplicación cliente de escritorio: frontend Angular/PrimeNG con arranque propio y shell nativa Tauri | Conexión con las APIs reales, identidad y permisos efectivos, periféricos y distribución nativa verificados para el alcance elegido |
| `pos-mobile` | Aplicación cliente móvil: frontend Angular/PrimeNG con arranque propio y shell nativa Capacitor | Integración real y verificación del recorrido, dispositivos y entrega en Android/iOS |
| `branch-api` | Base HTTP NestJS/Fastify, configuración, sondas y OpenAPI de desarrollo | Casos de uso de sucursal, autorización de servidor y persistencia transaccional de negocio |
| `branch-sync-worker` | Composición técnica de un proceso independiente | Entrega y recepción durables, reintentos y recuperación con los datos reales de sucursal |
| `country-api` | Composición técnica de la API de país | Recepción durable, consolidación y contratos de trabajo/resultados; BullMQ + Redis de trabajos de país para disparos y solicitudes breves, con calendario e identidad durables |
| `erp-worker` | Composición técnica del proceso de integración | BullMQ + Redis de trabajos en red ERP para ejecución, preparación de maestros y consulta/conciliación; contratos, reconstrucción e idempotencia comprobados |
| `device-agent` | Decisión acordada; proyecto aún no incorporado | Host C#/.NET en cada puesto Windows (F02/F05), diario SQLite y protocolo HTTPS LAN con `branch-api`; red compartida y móvil en F06 tras homologación |

Los dos clientes comparten bibliotecas de presentación y flujos. Las cuatro aplicaciones backend reutilizan mecanismos técnicos y delimitan sus contextos de negocio. La [arquitectura de la implementación](architecture.md), la [base de API](api.md) y los [contratos mock](mock-api.md) detallan sus alcances. El [catálogo del monorepo](monorepo.md) distingue la estructura objetivo de la evidencia del código.

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

La verificación técnica utiliza `npm run icons:check` cuando afecte UI, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` y los checks backend/estructura correspondientes. La [guía de pruebas](testing.md) diferencia los alcances y las capacidades aún pendientes de verificación.

Persistencia, identidad e integraciones se desarrollan por recorridos verificables. Una carpeta, un endpoint vacío o una prueba que devuelve éxito fijo no acreditan una capacidad comercial.

<span id="recorridos"></span>

## Recorridos de la interfaz

Estos recorridos describen la demostración con datos sintéticos. Su presencia en la UI no equivale a una integración comercial aceptada:

1. Inicio: métricas, gráficos, actividad, alertas y accesos por rol.
2. Venta: cliente, productos, precios, descuentos, retiro/despacho, boleta/factura, pagos mixtos, cheque/Orsan, crédito, vuelto/anticipo, pausar/retomar y resultado local/fiscal/ERP.
3. Caja: apertura, movimientos, arqueo por denominaciones, cierre parcial/total, custodia, diferencias e impresión Z.
4. Documentos: búsqueda, detalle, reimpresión, estado fiscal/ERP; cobranzas, anticipos, NC y devolución de pago con trazabilidad.
5. Maestros: clientes/RUT, direcciones/contactos, productos, precios/ofertas, sucursales, empleados, bancos y motivos. Búsqueda, edición local simulada, exportación y validación.
6. Sincronización: flujos separados, cola durable simulada, progreso, errores/reintentos, ejecución manual, horarios por zona, pausa/mantenimiento e historial.
7. Reportes: ventas, recaudación, cierres, medios de pago, pendientes/conciliación y rendimiento; filtros, gráficos y exportación.
8. Administración: módulos/capacidades, perfiles/roles, usuarios, tiendas/cajas, política offline, dispositivos, integraciones y versiones.
9. Observabilidad: logs estructurados, auditoría, correlación y diagnósticos simulados.

<span id="comprobación"></span>

## Comprobación técnica

Los controles del monorepo deben comprobar tipos, dependencias, builds, importes, políticas y recorridos de UI, además de accesibilidad en escritorio y móvil. Las pruebas sobre adaptadores mock verifican su comportamiento; la aceptación de persistencia, permisos, pagos y sincronización reales corresponde a los escenarios de cada fase del [roadmap](roadmap.md). Cada artefacto debe tener una revisión identificada e instrucciones reproducibles de construcción y ejecución.
