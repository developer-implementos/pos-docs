# Decisiones de arquitectura

**Alcance:** esta guía describe la base de código revisada y distingue las capacidades implementadas del diseño objetivo. La estructura de producto agrupa lo transversal en `libs/shared/`, según la [guía del monorepo](monorepo.md). Los ejemplos ejecutables corresponden al snapshot identificado del producto; la estructura propuesta no acredita por sí sola su implementación. Core es únicamente referencia de organización, sin dependencia de código, paquetes o servicios.

## 1. Monorepo Nx con límites de dependencia

Un producto multipaís con siete aplicaciones: `pos-desktop`, `pos-mobile`, `branch-api`, `branch-sync-worker`, `country-api`, `erp-worker` y `device-agent`. Las apps componen librerías por responsabilidad; el corte F02 añade el host .NET/SQLite y su protocolo, con drivers físicos pendientes. La documentación Starlight pertenece al repositorio editorial [POS Docs](https://github.com/developer-implementos/pos-docs), separado del código operativo. La [guía del monorepo](monorepo.md) detalla el estado de cada aplicación y su propiedad de datos; la [guía F02](phase-2-payments-documents.md) delimita la implementación parcial integrada.

Las aplicaciones cliente `pos-desktop` y `pos-mobile` tienen entradas independientes. Cada una incluye un frontend Angular/PrimeNG alojado en una shell nativa (host): Tauri en escritorio y Capacitor en Android/iOS. Comparten `libs/client-shell`, la composición Angular de raíz, configuración, rutas, guards y layout, y `shared/frontend/ui`, que concentra componentes, activos y estilos. La [decisión de clientes nativos](decisions/native-clients.md) fija sus límites. Vercel publica el portal, la documentación y las presentaciones desde POS Docs.

El cliente conectado utiliza `data-access/branch-api` y `features/branch-operation`, con contratos puros. La demo y sus bibliotecas (`domain`, el `data-access` simulado y sus features) se retiraron con el [ADR-25](decisions/single-operational-mode.md). Las features no se importan entre sí; `libs/client-shell` compone sus rutas y no es el host nativo. `ui` contiene presentación y formatos, sin acceso a persistencia ni reglas de operación. El backend dispone de contextos en `libs/backend`, contratos y políticas puras en `shared/contracts`, `shared/kernel` y `country-policies`, y reutiliza la infraestructura técnica de `shared/backend/runtime`. ESLint verifica las direcciones de importación y Nx conoce los proyectos.

Las aplicaciones Node se empaquetan con Rspack/SWC y el plugin oficial de Nx para incluir las librerías fuente internas; TSC conserva la comprobación de tipos. Las dependencias externas se instalan desde el manifiesto y lockfile de cada artefacto, cuya ejecución se verifica fuera del workspace. Las bibliotecas internas se consumen desde el monorepo y no requieren publicación como paquetes independientes.

Prime-showcase aporta la referencia visual. Los formularios utilizan componentes PrimeNG nativos y las capacidades de Angular; no hay modificaciones a paquetes de terceros.

### Organización compartida objetivo

`shared/backend` agrupa mecanismos del servidor; `shared/frontend/ui`, presentación; `shared/kernel`, el modelo mínimo acordado; `shared/contracts`, sobres y metadatos comunes; `shared/backend/testing`, soporte exclusivamente de pruebas. Los contratos de ventas, pagos o caja pertenecen a su contexto. No existe un barrel universal ni se centralizan entidades de negocio.

El diagrama expresa **dependencias objetivo de código**. No representa nuevas conexiones de red ni reglas ya instaladas.

```mermaid
flowchart TB
    Apps["Apps: composición"] --> Context["Contextos: API, aplicación y adaptadores"]
    Context --> Domain["Dominio del contexto"]
    Context --> Technical["shared/backend"]
    Domain --> Kernel["shared/kernel"]
    Context --> Contracts["shared/contracts y contratos públicos del contexto"]
    Clients["pos-desktop / pos-mobile"] --> Shell["client-shell: composición Angular"]
    Shell --> Web["Features del frontend"]
    Web --> UI["shared/frontend/ui"]
    Web --> Contracts
    Tests["Suites de pruebas"] --> Support["shared/backend/testing"]
```

Las dependencias de servidor se limitan a adaptación/composición; el dominio permanece puro. Estos límites requieren reglas Nx/ESLint y pruebas negativas que rechacen imports prohibidos. El diseño incluye `tests/pos-clients-e2e` como proyecto de pruebas vinculado a ambas aplicaciones cliente; no amplía las siete aplicaciones objetivo. Su estado se detalla en la [guía de pruebas](testing.md).

## 2. Estado y puertos

El cliente no es autoridad de estado comercial. `data-access/branch-api` expone un gateway tipado y stores de sesión, caja, catálogo, venta y comprobantes que reflejan respuestas del servidor; los importes, permisos y capacidades los calcula y comprueba `branch-api`. Los fallos esperados del contrato se muestran como mensajes accionables. El token de sesión vive sólo en memoria. Antes de confirmar una venta, el cliente conserva únicamente la referencia de recuperación y la solicitud mínima, sin tokens ni contraseñas.

La operación se persiste en PostgreSQL de sucursal, con una unidad de trabajo por operación y resultados durables por comando ([ADR-19](decisions/postgresql-unit-of-work.md)). El almacenamiento del navegador no conserva datos de negocio: al arrancar, el cliente borra las claves que dejaba la demo retirada.

La dirección de producto propone un backend de sucursal NestJS/Fastify compartido por las cajas y conectado a PostgreSQL de sucursal. Ambas aplicaciones cliente consumen su API, sin acceso SQL directo ni una base transaccional por terminal en el perfil de continuidad ante caída de WAN. La LAN y el servidor de sucursal siguen siendo dependencias de ese perfil. La sincronización duradera y el planificador pasarían a procesos supervisados que no dependan de la pestaña abierta. SQLite por terminal es una alternativa del perfil adicional sin LAN/servidor, pendiente de validación; no es la persistencia seleccionada por defecto. Esta dirección sigue la [propuesta de arquitectura](propuesta-arquitectura.md) y sus [opciones tecnológicas](opciones-tecnologicas.md).

`apps/branch-api` compone la [API F01](api.md) con identidad operativa, configuración, caja, catálogo, clientes, cestas, precios y confirmación en efectivo en PostgreSQL, siempre por HTTPS y sobre una sucursal aprovisionada. El cliente `branch` conecta Angular con esos contratos. La [guía F01](phase-1-laboratory.md) delimita el recorrido en revisión y la recuperación; la producción permanece cerrada.

El [ADR-18](decisions/job-processing.md) selecciona BullMQ con Redis exclusivo para programación breve en `country-api` y ejecución, preparación de lotes y conciliación en `erp-worker`. Son dominios de cola aislados; PostgreSQL conserva solicitudes/resultados y permite reconstruir jobs. No añade Redis a sucursal ni cambia el protocolo PostgreSQL/HTTPS de `branch-sync-worker`. Colas, relay, consumidores y recuperación están pendientes de implementación.

`country-api` tiene base HTTP, PostgreSQL y comprobación de ámbito/esquema, sin recepción comercial; `branch-sync-worker` y `erp-worker` preparan procesos separados para entrega y adaptadores. Son puntos de implementación, no sincronizadores reales. Los contextos scaffold no exponen fachadas que simulen una operación exitosa: deben incorporar casos de uso y pruebas antes de habilitar endpoints o jobs comerciales.

## 3. Cuatro estados distintos

- **Venta local:** se guardan documento, líneas, pagos y eventos pendientes.
- **Pago:** confirmado, rechazado o desconocido. Un resultado desconocido exige conciliación; no se cobra de nuevo automáticamente.
- **Fiscal:** documento pendiente, emitido o fallido. Una impresión no demuestra emisión.
- **ERP:** pendiente, sincronizado o fallido. Una venta local no demuestra registro en Dynamics AX.

Una nota de crédito conserva las cantidades y valores del documento original. Emitirla y devolver el pago son acciones distintas. Los pagos con crédito de cliente y con NC no deben confundirse con tarjetas de crédito.

## 4. Sincronización

El diseño prevé flujos con dirección, entidades, programación, siguiente ejecución y ejecuciones históricas, que admiten ejecución manual, por intervalo y a una hora diaria con selección de días en `America/Santiago`, sin duplicar ejecuciones en curso y recuperando un cierre interrumpido como error revisable.

Ninguna parte del producto los ejecuta todavía: la demo que los simulaba en el navegador se retiró con el ADR-25. La arquitectura asigna la ejecución supervisada a `branch-sync-worker` y los contratos/progreso a `libs/backend/sync`. Persistencia durable, locks, transportes, programación fuera de la pestaña y conciliación entre aplicaciones quedan pendientes.

La cola de salida conserva la identidad de la operación y del evento durante los reintentos. Fiscal y ERP tienen confirmación independiente. El modo offline conserva el trabajo local autorizado y bloquea acciones que exigen un proveedor. La deduplicación debe existir también en el receptor; una simulación no prueba garantías de servicios externos.

## 5. Permisos y módulos

Los roles operativos contienen una lista explícita de permisos y los administra la propia sucursal; agregar un permiso al contrato no lo concede, y el rol inicial de administración está protegido. La navegación y las rutas del cliente muestran sólo lo que la sesión permite, y el servidor vuelve a comprobar permiso, asignación y capacidad en cada solicitud. Deshabilitar una capacidad conserva su historial. Las decisiones de autorización se auditan sin contraseñas ni tokens.

La identidad, las sesiones y la autorización por sucursal, caja e instalación se resuelven en el servidor, con la llave del equipo activado. La auditoría en PostgreSQL no se modifica desde el servicio; un registro remoto inmutable sigue pendiente.

## 6. Multisucursal y producto comercial

La interfaz separa operación de caja, gestión comercial y plataforma. Los maestros y políticas son compartidos, con filtros de sucursal en análisis y asignaciones en usuarios. El diseño debe evolucionar a configuración corporativa con herencia por sucursal, aprobaciones de cambios, despliegue gradual y contratos versionados. Esa administración remota no se simula como si hubiera dispositivos reales conectados.

`country-policies` concentra la variación nacional y `fiscal` delimita emisión/proveedores; las reglas comunes no se duplican en una app distinta por país. Los perfiles iniciales y contratos no acreditan homologación fiscal, pagos o reglas comerciales fuera de las reglas sintéticas de Chile. Una app de backoffice separada se evaluará si existe una experiencia o ciclo de despliegue que la requiera.

## 7. Escritorio seguro

La shell nativa Tauri aloja el build estático del frontend de `pos-desktop`. La navegación por hash funciona sin un servidor de rutas. La CSP limita conexiones y recursos; los assets y fuentes son locales. No se habilitan plugins genéricos de shell, filesystem o HTTP; el único comando nativo es el guardado protegido de PDF del [corte F02](phase-2-payments-documents.md#guardado-nativo-en-windows). Las futuras integraciones nativas necesitan comandos y capacidades específicas, cancelación y límites de tiempo, sin exponer credenciales al frontend.

La actualización del producto requiere firma de instaladores, firma de manifiestos, protección contra downgrade, canales y validación de compatibilidad de la base local. No hay un canal de actualización conectado ni una pantalla que instale binarios.

## 8. Calidad

Pruebas unitarias para dinero, permisos, eventos, calendario y recuperación; pruebas de navegador para recorridos; compilación estricta y límites Nx; CI en Linux y Windows. No se comunica “listo para producción” por tener una interfaz completa: pagos, fiscalidad, operación sin red y recuperación requieren pruebas de integración y operación real antes de habilitar una caja.

## Agente de periféricos

`apps/device-agent` es una aplicación C#/.NET para Windows, independiente de la ventana de los clientes. Su primera entrega F02 se instala en cada puesto de caja y controla sus periféricos locales; F05 pilota ese perfil. F06 añade después dispositivos de red y estación compartida, con aceptación propia antes del uso móvil compartido. Obtiene trabajos y reporta evidencia mediante HTTPS LAN iniciado hacia `branch-api`; conserva un diario técnico SQLite, sin autoridad sobre ventas. El [ADR-17](decisions/device-agent.md) define tecnología, conexiones, acceso móvil y recuperación. El host y cada adaptador requieren homologación de SDK, arquitectura y sesión Windows; no se migra `PrintDocument` sin revisar su incompatibilidad con servicios.
