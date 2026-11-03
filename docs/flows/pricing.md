# Publicar y aplicar precios

[Explorar una versión comercial](/explore/commercial-version/) sigue el diseño desde su origen autorizado hasta la activación en sucursal. El [contrato de publicación](/guide/architecture/master-data-publication/) es la fuente de responsabilidades, manifiesto, porciones, validación y activación; los campos no se mantienen de nuevo en este recorrido.

## Preparación y vigencia

`erp-worker` prepara los datos desde su red autorizada; `country-api` valida y publica la versión; `branch-sync-worker` prepara y activa el espejo local completo. `branch-api` cotiza sobre la versión válida para la operación. Una carga parcial o rechazada no reemplaza la versión activa.

La [evaluación de precios y ofertas](/guide/proposal/pricing-promotions/) distingue actualización de datos, vigencia de la cotización y comienzo del pago. Un evento perdido o un reinicio durante la descarga deben poder recuperarse sin mezclar versiones.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Publicación: fallos y límites](/guide/architecture/master-data-publication/#fallos-y-límites-que-deben-probarse) | Paquete incompleto, ámbito incorrecto, hashes y activación |
| [Motor local de precios](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/libs/backend/pricing/test/pricing-engine.test.ts) | Reglas de cálculo implementadas en la revisión indicada |
| [F03-02](https://github.com/developer-implementos/pos-platform/issues/38) | Publicación comercial y calendario durable |
| [BullMQ por ámbito](/explore/optional-jobs/) | Programación y ejecución propuestas con Redis dedicado |

Probar el motor local no acredita el circuito de distribución. La publicación completa y BullMQ conservan su estado de propuesta pendiente de implementación; su progreso se consulta en [F03](/guide/roadmap/phase-03/) y en el [registro del producto](/guide/implementation/progress/).
