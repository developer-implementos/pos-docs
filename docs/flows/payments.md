# Cobrar y resolver un pago

El recorrido comienza en una cesta y cotización identificadas. La [guía de cobro combinado](/guide/implementation/phase-2/#cobro-combinado-y-transferencia-manual) concentra las reglas implementadas de efectivo y transferencia: importes aplicados, vuelto, reserva de saldo y verificación autorizada. El redondeo legal de efectivo está [propuesto en el ADR-20](/guide/architecture/cash-rounding/) y aún no está implementado.

## Resultado y recuperación

Un dato capturado por el cajero no confirma una transferencia. Un timeout tampoco demuestra que el proveedor rechazó un cobro. El intento conserva su identidad y destino; la consulta y la compensación tienen autorizaciones y efectos distintos.

El [ciclo del intento de cobro](/explore/state-payment/) muestra las transiciones implementadas en `98f8987` y sus predicados: una incertidumbre conduce a consulta o conciliación, sin habilitar otro despacho del mismo cargo. Su alcance es el intento externo; el plan de pagos y el efectivo tienen contratos propios.

[Explorar un pago incierto](/explore/uncertain-payment/) muestra una extensión **propuesta** por SDK local, sujeta a homologación. La [admisión de proveedores](/guide/implementation/phase-2/#admisión-de-proveedores) describe el control local disponible y sus límites. No hay un adaptador bancario operativo acreditado por este recorrido.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | Planes, intenciones, consultas y compensaciones exportadas |
| [Prueba HTTP del plan](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/test/payment-plan-http.integration.test.ts) | Efectivo/transferencia, verificador separado y recuperación tras reinicio |
| [Recuperación comercial](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/test/commercial-recovery.integration.test.ts) | Exclusión entre completar venta y reservar compensación; revisión durable |
| [F02-01](https://github.com/developer-implementos/pos-platform/issues/23) y [F02-13](https://github.com/developer-implementos/pos-platform/issues/35) | Primer proveedor externo y recuperación de cobros incompletos |

Las pruebas de software usan datos aislados y adaptadores de prueba donde corresponde. La [evidencia F02](/guide/implementation/phase-2/#evidencia-observada-y-pendientes) identifica lo verificado y lo que todavía requiere proveedor o dispositivo real.
