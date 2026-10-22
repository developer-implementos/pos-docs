# Caja corporativa — plan de entrega

El [roadmap de POS Platform](roadmap.md) define la secuencia funcional compartida por Starlight y Reveal. Este documento describe el alcance de la demostración y los criterios técnicos del producto. La organización del código y el scaffolding no representan fases funcionales completadas; cada entrega requiere la aceptación del recorrido correspondiente.

## Producto

Demostración de una caja corporativa para Chile, con recorridos conectados y datos sintéticos. Reutiliza la identidad visual de prime-showcase y separa operación, gestión comercial y administración técnica. La cobertura y las variantes del sistema anterior están detalladas en [el inventario de Chile](audit-chile-for-product.md).

<span id="reorganización-del-monorepo-acordada"></span>

## Organización y criterios de aceptación

POS Platform es un producto independiente, con Core solo como referencia. La [estructura objetivo](monorepo.md#estructura-objetivo-acordada) agrupa mecanismos transversales en `libs/shared/` y delimita los contextos de negocio. La siguiente tabla define responsabilidades y condiciones de aceptación; no certifica que todas estén implementadas.

| Área | Responsabilidad | Criterio de aceptación |
| --- | --- | --- |
| Documentación | Estructura del producto, propiedad DDD, proyectos de pruebas y evidencia identificada | Catálogo sincronizado, navegación, Astro, build y comprobación de navegador |
| Base backend | Mecanismos técnicos del servidor en `shared/backend`, con proyectos definidos por fronteras reales | Lint, tipos, tests y build backend; artefactos arrancan fuera del workspace |
| Contratos y kernel | Sobres técnicos en `shared/contracts` y modelo mínimo acordado en `shared/kernel` | Dominio puro; contratos comerciales conservan propietario; sin imports de frameworks |
| UI transversal | Componentes, tokens y activos de presentación en `shared/frontend/ui` | Builds de ambos clientes, iconografía, accesibilidad y recorridos de UI verificados |
| E2E y soporte | `pos-clients-e2e` declara dependencias de `pos-desktop` y `pos-mobile`; `shared/testing` reúne mecanismos usados por varias suites | CI prueba el build de producción; reportes y fixtures funcionan; producción no importa testing |
| Workspace y entrega | Aliases, tags, tsconfigs, targets, entradas de caché, scripts y CI describen dependencias comprobables | Imports públicos válidos, builds reproducibles y catálogo consistente con la evidencia del producto |

Las reglas de ventas, caja y pagos pertenecen a sus contextos; las variantes nacionales pertenecen al contexto que las evalúa. Compartir consumidores no convierte una regla comercial en infraestructura genérica. Las pruebas de fronteras deben rechazar dependencias de servidor desde navegador, frameworks desde dominio, producción hacia testing e imports privados entre contextos.

La aceptación utiliza `npm run icons:check` cuando afecte UI, `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` y los checks backend/estructura correspondientes. La [guía de pruebas](testing.md) diferencia los alcances y las capacidades aún pendientes de verificación.

Persistencia, identidad e integraciones se desarrollan por recorridos verificables. Una carpeta, un endpoint vacío o una prueba que devuelve éxito fijo no acreditan una capacidad comercial.

## Recorridos

1. Inicio: métricas, gráficos, actividad, alertas y accesos por rol.
2. Venta: cliente, productos, precios, descuentos, retiro/despacho, boleta/factura, pagos mixtos, cheque/Orsan, crédito, vuelto/anticipo, pausar/retomar y resultado local/fiscal/ERP.
3. Caja: apertura, movimientos, arqueo por denominaciones, cierre parcial/total, custodia, diferencias e impresión Z.
4. Documentos: búsqueda, detalle, reimpresión, estado fiscal/ERP; cobranzas, anticipos, NC y devolución de pago con trazabilidad.
5. Maestros: clientes/RUT, direcciones/contactos, productos, precios/ofertas, sucursales, empleados, bancos y motivos. Búsqueda, edición local simulada, exportación y validación.
6. Sincronización: flujos separados, cola durable simulada, progreso, errores/reintentos, ejecución manual, horarios por zona, pausa/mantenimiento e historial.
7. Reportes: ventas, recaudación, cierres, medios de pago, pendientes/conciliación y rendimiento; filtros, gráficos y exportación.
8. Administración: módulos/capacidades, perfiles/roles, usuarios, tiendas/cajas, política offline, dispositivos, integraciones y versiones.
9. Observabilidad: logs estructurados, auditoría, correlación y diagnósticos simulados.

## Base

Nx + Angular CSR + PrimeNG y tema derivado de prime-showcase. Tauri 2 como shell. Tipos/contratos, repositorio mock versionado, comandos auditados y políticas independientes de la UI. Sin patch-package ni integraciones heredadas.

## Comprobación

Compilar y comprobar límites Nx; probar importes, permisos, flags, idempotencia, pago incierto, programación y persistencia; recorrer UI en escritorio y móvil y verificar accesibilidad. Cada artefacto debe tener una revisión identificada e instrucciones reproducibles de construcción y ejecución.
