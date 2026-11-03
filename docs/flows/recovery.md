# Recuperar una operación o instalación

La recuperación depende de qué se perdió. Una respuesta HTTP ausente, un resultado externo incierto y una base restaurada requieren acciones distintas. La [revisión de resiliencia](/guide/operations/resilience/) concentra las invariantes, el tratamiento de datos y los escenarios de fallo.

## Elegir el recorrido

| Situación | Punto de consulta |
| --- | --- |
| Necesito entender qué ocurrió en una operación | [Historial de evidencia por operación](/guide/implementation/phase-2/#historial-de-evidencia-por-operación): estados independientes y registros persistidos |
| Debo asignar seguimiento o documentar una conclusión | [Expediente operativo](/guide/implementation/phase-2/#autoridad-del-seguimiento-de-excepciones): responsable, evidencia y cierre sin modificar estados financieros |
| Se perdió la respuesta al confirmar | [Recuperar el comando original](/guide/implementation/phase-1/#resolver-un-resultado-incierto) |
| Hay cobro confirmado y venta pendiente | [Recuperación comercial y compensación explícita](/guide/implementation/phase-2/#recuperación-de-venta-y-compensación-explícita) |
| Se desconoce si hubo cobro externo | [Pago incierto](payments.md): conservar identidad, destino y reserva |
| El host no recibió el acuse de un resultado | [Trabajo de impresión](printing.md): recuperar evidencia sin repetir efecto |
| Se perdió el servidor o se restauró una copia | [Restauración y retorno controlado](/explore/recovery/) |

## Evidencia y límites

El [alcance F02](/guide/implementation/phase-2/) identifica la revisión y el estado de integración del historial común y los expedientes. Un expediente organiza el seguimiento; sus permisos no sustituyen los permisos del pago, documento o dispositivo ni habilitan una recuperación financiera.

La [prueba de recuperación comercial](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/test/commercial-recovery.integration.test.ts) cubre pérdida del acuse de commit, reinicio, exclusión entre venta y compensación y revisión durable. La [verificación F02-13](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/delivery/reviews/F02-13-verification.md) fija su alcance y resultados.

El recorrido de restauración de instalaciones es una propuesta operativa: exige copia independiente, exclusión del escritor anterior, retención y conciliación. No acredita RPO cero ni un ensayo de recuperación de sucursal. La [fase piloto](/guide/roadmap/phase-05/) conserva sus entregables y aceptación; ninguna acción documental debe marcar esos ensayos como ejecutados.

F02-04 mantiene las acciones por efecto y los runbooks que aún deben completarse y verificarse según su ficha. La revisión técnica de los incrementos y la aceptación humana conservan registros separados; disponer de historial y responsables no completa ese entregable.
