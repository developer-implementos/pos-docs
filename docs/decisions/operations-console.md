# ADR-33 · Consola de operaciones central

**Estado:** propuesta del 24-11-2026 de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782), aceptada por el responsable del producto el mismo día. Es la decisión de arquitectura que exige [F04-06](/guide/roadmap/phase-04/#work-f04-06) antes de crear otra aplicación desplegable. Se implementa por tareas registradas en la ficha de la issue; este ADR no acredita implementación, despliegue en QA, homologación ni aceptación.

**Decisión:** soporte y administración tienen una aplicación web propia, la consola de operaciones (`ops-console`). Se sirve centralmente y lee de `country-api` la vista de todas las sucursales, sus cajas y sus equipos. Vive en el mismo monorepo que el POS y comparte su tema, sus componentes y sus contratos. El POS conserva la administración de la propia tienda, porque debe funcionar sin conexión con el país.

## Qué resuelve

Hoy cada sucursal solo se ve a sí misma, y `country-api` recibe ventas pero no muestra nada. Soporte necesita ver el estado de todas las cajas del país, los errores de cada equipo y los pendientes de integración sin conectarse a la base de ninguna sucursal, como pide [LS-051](/guide/roadmap/phase-04/#work-f04-10).

## Por qué una aplicación aparte

| | POS (`pos-web`, `pos-desktop`, `pos-mobile`) | Consola de operaciones |
| --- | --- | --- |
| Dónde corre | En la tienda, contra el `branch-api` de su sucursal | Central, contra `country-api` |
| Qué ve | Su sucursal | Las sucursales de su ámbito |
| Identidad | Equipo activado y persona ([ADR-23](device-activation.md)) | Cuenta corporativa con segundo factor ([F03-07](/guide/roadmap/phase-03/#work-f03-07)), sin equipo de caja |
| Sin conexión con el país | Sigue operando | No aplica |
| Publicación | Con los equipos de tienda | Independiente |

Meter la vista del país en el POS obligaría a cada equipo de tienda a hablar con el centro y a cargar permisos de país. Una aplicación aparte mantiene cada superficie chica y con su propia frontera de seguridad.

## Qué comparte con el POS

- **Tema y componentes:** `@pos-platform/ui` (paleta de Implementos sobre PrimeNG, encabezados de página, métricas, etiquetas de estado, estados vacíos, selectores de fecha y formato de dinero).
- **Contratos:** las librerías de contratos del backend, con los esquemas que validan cada respuesta.
- **Estructura:** una aplicación delgada como `pos-web`, con su propio arranque y sus rutas. Las reglas de límites de módulos le impiden depender de las pantallas o del acceso a datos de la sucursal.

## Qué muestra

- **Sucursales y cajas:** cada caja con su estado ([ADR-31](register-tenure.md)), quién la tiene y desde qué hora, en qué equipo, la última señal de ese equipo y la versión del cliente.
- **Equipos:** canal, capacidades, estado de la credencial y última señal.
- **Errores y diagnósticos:** por sucursal, caja, equipo y persona, con el identificador de la solicitud ([ADR-32](support-access.md)).
- **Pendientes de integración con el ERP:** con antigüedad e intentos ([F04-10](/guide/roadmap/phase-04/#work-f04-10)).
- **Acciones de soporte:** «ver como» de solo lectura y la solicitud de una asignación temporal ([ADR-32](support-access.md)).

Cada dato muestra la hora de su última actualización. Una sucursal sin conexión aparece como «sin señal desde las 10:42», no como cajas vacías.

## Cómo llegan los datos

- La sucursal publica al país, por el canal de sincronización durable de [F03-01](/guide/roadmap/phase-03/#work-f03-01), eventos de estado: tenencia y turnos de sus cajas, señales de sus equipos, errores y diagnósticos.
- `country-api` los recibe con la identidad de la sucursal y los proyecta en una vista de lectura. La proyección es eventualmente consistente.
- La consola nunca consulta la base de una sucursal. Una acción que cambia algo en la tienda viaja como comando autorizado hacia la sucursal, y la sucursal decide con sus propias reglas.

## Ámbitos y permisos

- La consola exige una asignación con ámbito de sucursal o de país.
- Soporte de una sucursal ve solo la suya; soporte del país ve todas.
- Cada consulta y cada acción quedan en la auditoría del país.

## Relación con otras decisiones

- **[ADR-31](register-tenure.md).** La consola muestra el tablero de cajas que publica cada sucursal.
- **[ADR-32](support-access.md).** Aloja el diagnóstico, «ver como» y las asignaciones temporales.
- **[ADR-21](web-client.md).** El cliente web del POS sigue sirviéndose desde cada sucursal; la consola es la única aplicación web central.
- **[F04-06](/guide/roadmap/phase-04/#work-f04-06) y [F04-10](/guide/roadmap/phase-04/#work-f04-10).** Este ADR es su decisión de arquitectura para la administración central y la consola de pendientes.

## Límites

- La identidad corporativa con segundo factor depende de [F03-07](/guide/roadmap/phase-03/#work-f03-07). Mientras no exista, QA usa cuentas locales de `country-api` con los mismos permisos y la misma auditoría.
- La consola no reemplaza la administración de la tienda: usuarios, equipos y cierres con supervisor siguen en el POS.

## Verificación

Cada tarea prueba que la consola solo lee de `country-api`, que una persona con ámbito de sucursal no ve otras sucursales y que una sucursal sin conexión se muestra con la hora de su último dato.
