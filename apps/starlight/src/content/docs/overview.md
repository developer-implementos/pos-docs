---
title: Visión general de la solución
description: Producto compartido, operación en sucursal, integración por país y estado real de implementación de POS Platform.
editUrl: false
prev: false
next:
  label: Producto, alcance y países
  link: /guide/proposal/product/
---

**POS Platform es un producto corporativo de punto de venta en desarrollo para Chile, Perú y España.** Su arquitectura comparte reglas y casos de uso de venta, caja, precios y pagos. Cada país selecciona su configuración e integraciones fiscales, bancarias y ERP. La continuidad durante una caída de Internet es uno de sus requisitos, junto con integridad de las operaciones, permisos, extensibilidad y mantenimiento común.

Esta página explica el diseño del conjunto. La [guía de implementación](/guide/implementation/repository/) identifica las capacidades integradas y sus límites; el [panel del proyecto](/project/) muestra la verificación técnica y los pendientes del corte publicado.

## Qué se comparte y qué cambia

El **núcleo común** son los módulos de negocio y sus contratos de código. Por ejemplo, una venta conserva su identidad, sus líneas, importes y estados en cualquier país. Ese núcleo se ejecuta en aplicaciones con responsabilidades diferentes; no significa un único servidor mundial.

El **perfil de país** selecciona moneda, reglas, documentos y proveedores compatibles para una entidad legal. Un **adaptador** implementa la conexión concreta con AX, Gira, un ERP custom o un proveedor fiscal. Cambiar un valor de configuración permite elegir un adaptador ya soportado; incorporar un proveedor nuevo requiere código, pruebas y homologación. Los perfiles de usuario —cajero, administrador u otros accesos— pertenecen a la autorización, no a esta configuración de país.

[Alcance del producto y variantes](/guide/proposal/product/) · [Contratos y adaptadores](/guide/proposal/contracts/)

## Dónde funciona cada responsabilidad

| Zona | Responsabilidad propuesta | Datos que conserva |
| --- | --- | --- |
| Puesto de caja | Presentar la operación con Angular; Tauri permite empaquetarla y acceder a capacidades nativas autorizadas. | Interfaz y preferencias; el servicio de periféricos conserva evidencia técnica durable de sus trabajos. La autoridad de ventas permanece en sucursal. |
| Servidor de sucursal | Validar permisos, calcular precios con datos locales y confirmar ventas, pagos registrados y movimientos de caja. | PostgreSQL guarda las operaciones y sus eventos pendientes en una misma transacción. |
| Sincronizador de sucursal | Entregar operaciones a central, recibir maestros y preparar versiones comerciales. | Identidades de mensajes, pendientes y avances persistidos en PostgreSQL de sucursal. |
| Plataforma de país | Aceptar operaciones, consolidar información, distribuir datos e integrar el ERP y los proveedores de su ámbito. | PostgreSQL operativo de país y estados de integración. El ERP conserva su responsabilidad financiera pactada. |

En el perfil inicial, **varias cajas comparten el servidor y la base de su sucursal**. Una caída de Internet permite continuar las operaciones expresamente habilitadas, mientras la red local, el servidor y las dependencias necesarias funcionen. La caída de ese servidor es otro escenario: autonomía por terminal requiere una decisión adicional y no se activa automáticamente.

[Aplicaciones, datos y contratos](/guide/proposal/architecture/) · [Diagramas C4](/guide/diagrams/) · [Condiciones de continuidad](/guide/proposal/continuity/)

## Una venta, de principio a fin

Ejemplo ilustrativo de una operación permitida con datos vigentes:

1. El operador prepara la venta en la caja. El backend valida su acceso y obtiene el precio desde una versión local completa de reglas y datos comerciales.
2. Antes del pago, valida vigencia, permisos y capacidades disponibles. Persiste la intención y la identidad del intento. El medio de pago sigue su contrato: se registra efectivo o se solicita y consulta la autorización correspondiente. Un resultado incierto queda pendiente de recuperación; no se vuelve a cobrar a ciegas.
3. Conforme al resultado y las reglas del medio de pago, el backend confirma los cambios locales de negocio y el evento pendiente en **la misma transacción PostgreSQL**. Ese commit es la confirmación de persistencia en la sucursal.
4. El sincronizador entrega el evento conservando su identidad. Si debe reenviarlo, central reconoce el duplicado y evita repetir el efecto local acordado.
5. Central confirma su aceptación durable. La integración ERP se procesa y concilia posteriormente. Venta local, resultado del pago, documento fiscal y registro ERP conservan estados separados.

La **outbox** es el registro de eventos pendientes junto al negocio; la **inbox** identifica mensajes recibidos y permite recuperar su procesamiento. Son registros persistidos, no aplicaciones adicionales. El [recorrido de venta](/guide/proposal/continuity/) muestra las etapas y el [contrato de sincronización](/guide/proposal/synchronization/) precisa los acuses y los fallos.

## Cómo encaja el código

Las aplicaciones de `apps/` arrancan procesos o interfaces. Las bibliotecas de `libs/` agrupan reglas, casos de uso, contratos e integraciones; una biblioteca no exige un despliegue propio. Nx organiza proyectos y tareas de construcción. Sus límites deben impedir que una función de ventas escriba directamente en los datos de otro módulo.

La [estructura del monorepo](/guide/implementation/monorepo/) relaciona aplicaciones, bibliotecas y rutas físicas con su estado de implementación. El [diseño de módulos](/guide/architecture/monorepo/) explica sus fronteras y la [correspondencia desde Mountain y otros repositorios](/guide/architecture/monorepo/#correspondencia-del-legacy-con-pos-platform). Para preparar un cambio, sigue la [guía para empezar una tarea](/guide/implementation/start-a-task/).

## Estado de la propuesta

| Necesidad | Fuente de referencia |
| --- | --- |
| Entender las decisiones | [Registro de decisiones](/guide/proposal/decisions/): diseño acordado, condiciones y recomendaciones. |
| Saber qué está integrado | [Repositorio del producto](/guide/implementation/repository/), [F01](/guide/implementation/phase-1/) y [F02](/guide/implementation/phase-2/): código, persistencia, perfiles y evidencia, separados de las capacidades por habilitar. |
| Consultar avance o impedimentos | [Gestión del proyecto](/project/) y [bloqueos y decisiones](/project/attention/): estados, responsables y siguientes acciones del corte publicado. |
| Contrastar el legacy | [Fuentes y snapshots revisados](/guide/evidence/audit/): comportamiento observado y límites de correspondencia con producción. |

La [validación del piloto](/guide/operations/validation/) define las evidencias operativas necesarias. Las simulaciones explican el comportamiento propuesto. La verificación técnica, la aceptación humana y la habilitación con proveedores y equipos reales se registran por separado.

El [roadmap de entrega](/guide/proposal/roadmap/) organiza el alcance en seis fases. Cada una detalla las condiciones de entrada, los entregables por aplicación y módulo, las tareas, los escenarios de aceptación y la evidencia para decidir su cierre. El [plan de F01: venta persistida](/guide/roadmap/phase-01/) concreta la primera integración de la interfaz con la API y la persistencia de sucursal. La presentación resume el mismo plan mantenido en esta guía.

[Mapa de contenidos](/guide/contents/) · [Glosario con el significado aplicado al POS](/guide/glossary/)
