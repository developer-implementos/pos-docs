# Entregar operaciones a país y ERP

[Explorar entrega y resultado](/explore/country-erp/) diferencia tres hitos: commit de sucursal, recepción durable de país y efecto confirmado en ERP. El [contrato de sincronización](/guide/proposal/synchronization/) gobierna la identidad de los eventos, los acuses y la propiedad de los datos.

## Qué confirma cada frontera

La outbox registra lo pendiente en la misma transacción local acordada. El receptor confirma después de persistir la recepción y los efectos pactados. El resultado de ERP llega mediante otro contrato. Repetir una entrega con la misma identidad no autoriza repetir su efecto de negocio.

La [decisión de trabajos](/guide/architecture/job-processing/) explica qué conserva PostgreSQL y qué organiza BullMQ. [Explorar su recuperación](/explore/optional-jobs/) muestra Redis dedicado por entorno y trabajo reconstruible; no hay Redis ni SQL entre redes WAN. La [fachada y ACL](/guide/proposal/contracts/) conservan el contrato POS y traducen la interfaz del destino homologado.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | API realmente exportada de país; su presencia no acredita un flujo ERP |
| [F03-01](https://github.com/developer-implementos/pos-platform/issues/37) | Entrega, recepción, duplicados y acuses perdidos |
| [F03-03](https://github.com/developer-implementos/pos-platform/issues/39) | Trabajo ERP, claims, destino y resultado verificable |
| [Restauración](recovery.md) | Huecos, retención y conciliación antes de reabrir |

Este circuito completo es arquitectura propuesta. Los procesos y la infraestructura de pruebas existentes no demuestran integración operativa con AX, ICS o Gira. Su contrato concreto y evidencia de integración deben quedar vinculados al entregable correspondiente.
