# Registrar una venta

Este recorrido conecta la intención del operador con la confirmación local. [Explorar la venta](/explore/local-sale/) muestra el diseño objetivo; la entrega a país y ERP se consulta en [sincronización](synchronization.md).

## Contrato y límites

La [confirmación local](/guide/proposal/continuity/#confirmación-local-de-una-venta) define qué efectos deben compartir el commit. La [unidad de trabajo PostgreSQL](/guide/architecture/postgresql-transactions/) fija cómo se recupera un comando cuyo resultado se desconoce. Venta, pago, documento fiscal e integración mantienen estados propios.

El [ciclo de la cesta y su confirmación](/explore/state-sale/) enlaza los predicados del código `98f8987`: activa, pausada, confirmada y cancelada. Permite inspeccionar cada transición; no presenta los estados del cobro o del ERP como estados de la cesta.

Si la respuesta desaparece después de confirmar, recuperar el resultado del comando original evita crear otra venta. El cierre de la ventana o el reintento HTTP no deben cambiar su identidad. Las [reglas de vigencia comercial](/guide/proposal/pricing-promotions/) se consultan antes de iniciar el pago.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | Operaciones de ventas, cotización y pagos de la revisión exportada |
| [Confirmación con PostgreSQL](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/test/cash-sale.integration.test.ts) | Concurrencia, outbox fallida y respuesta descartada con reinicio |
| [Recuperación comercial](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/test/commercial-recovery.integration.test.ts) | Pago confirmado con venta pendiente y recuperación sin duplicación |
| [F02-13](https://github.com/developer-implementos/pos-platform/issues/35) | Alcance y evidencia de recuperación y compensación |

La evidencia enlazada corresponde a `98f8987`; consultar [F02](/guide/implementation/phase-2/) para su alcance. La devolución de una venta finalizada pertenece a [F04-01](https://github.com/developer-implementos/pos-platform/issues/49), con documento y dinero separados; no se deduce de la compensación de un cobro incompleto.
