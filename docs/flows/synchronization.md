# Entregar operaciones a país y ERP

[Explorar entrega y resultado](/explore/country-erp/) diferencia tres hitos: commit de sucursal, recepción durable de país y efecto confirmado en ERP. El [contrato de sincronización](/guide/proposal/synchronization/) gobierna la identidad de los eventos, los acuses y la propiedad de los datos.

## Qué confirma cada frontera

La outbox registra lo pendiente en la misma transacción local acordada. El receptor confirma después de persistir la recepción y los efectos pactados. El resultado de ERP llega mediante otro contrato. Repetir una entrega con la misma identidad no autoriza repetir su efecto de negocio.

La [decisión de trabajos](/guide/architecture/job-processing/) explica qué conserva PostgreSQL y qué organiza BullMQ. [Explorar su recuperación](/explore/optional-jobs/) muestra Redis dedicado por entorno y trabajo reconstruible; no hay Redis ni SQL entre redes WAN. La [fachada y ACL](/guide/proposal/contracts/) conservan el contrato POS y traducen la interfaz del destino homologado.

## Qué está implementado

La sucursal entrega su outbox al país y el país lo recibe; nada más del circuito está implementado. `branch-sync-worker` envía los eventos `SaleConfirmed` en lotes `DeliverEvents` v1, en orden por agregado y con reintentos ([TASK-621](https://github.com/developer-implementos/pos-platform/pull/629), revisión [`6a082cb`](https://github.com/developer-implementos/pos-platform/commit/6a082cbe3c9d7b7c547e3211d082a7b96d476cdd)). `country-api` los recibe en `POST /api/v1/sync/deliveries` (`deliverEventsV1`) desde [TASK-636](https://github.com/developer-implementos/pos-platform/pull/645), revisión [`2f0cc55`](https://github.com/developer-implementos/pos-platform/commit/2f0cc556bdb8e9f7998151a06e07127b31e360f9).

- **Recepción durable.** Cada lote es una transacción. Cada evento nuevo se guarda en `sync.country_inbox`, por ámbito de país, sucursal de origen, consumidor y `eventId`, con el hash de su contenido y un trabajo pendiente en `sync.country_work`. El resultado de cada evento se responde sólo después del COMMIT.
- **Deduplicación estricta.** Mismo `eventId` y mismo hash es `duplicate`, sin fila nueva; un reenvío tras un acuse perdido también. Mismo `eventId` con otro hash, u otro `eventId` en una posición del agregado ya ocupada, es `conflict` (`EVENT_ID_REUSED`): nunca se deduplica por parecido. Falta la secuencia anterior del agregado, o la base falla, es `retryable`; un evento mal formado es `invalid` con su código fijo, sin rechazar a los demás del lote.
- **Lotes concurrentes.** Dos lotes idénticos a la vez dejan una sola fila. Desde [TASK-696](https://github.com/developer-implementos/pos-platform/pull/700), revisión [`ab44071`](https://github.com/developer-implementos/pos-platform/commit/ab44071f1befd3d6cd9d9663835e99066abf65ce), el segundo recibe `duplicate` y no un `conflict` falso: la clasificación lee identidad y posición en una sola consulta.
- **Admisión.** Un lote tiene de 1 a 100 eventos con `eventId` únicos y hasta 512 KiB; si no, 422 `VALIDATION_ERROR` y no se recibe nada.
- **Autenticación cerrada por defecto.** Sin configuración, la ruta responde 401. Una configuración explícita habilita una credencial por sucursal, provisional hasta la identidad de carga de [F03-06](https://github.com/developer-implementos/pos-platform/issues/42); el origen declarado debe ser el autenticado, o la respuesta es 403 `SCOPE_MISMATCH`. No hay mTLS.

**Límites.** `sync.country_work` no tiene consumidor: recibir no aplica el evento, no lo proyecta ni llama al ERP. Un evento rechazado de forma permanente sigue pendiente en la sucursal, sin cuarentena. Las pruebas usan PostgreSQL aislado y datos sintéticos; no hay entrega HTTPS probada contra un país desplegado. Cerrar estas tareas no verifica F03-01.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | API realmente exportada de país; su presencia no acredita un flujo ERP |
| [Pruebas del inbox de país](https://github.com/developer-implementos/pos-platform/blob/ab44071f1befd3d6cd9d9663835e99066abf65ce/libs/backend/sync/integration/country-inbox.test.ts) | Aceptado, duplicado, conflicto, lote parcial, predecesora, lotes concurrentes y aislamiento por sucursal |
| [F03-01](https://github.com/developer-implementos/pos-platform/issues/37) | Entrega, recepción, duplicados y acuses perdidos |
| [F03-03](https://github.com/developer-implementos/pos-platform/issues/39) | Trabajo ERP, claims, destino y resultado verificable |
| [Restauración](recovery.md) | Huecos, retención y conciliación antes de reabrir |

Salvo la entrega y la recepción descritas arriba, este circuito es arquitectura propuesta. Los procesos y la infraestructura de pruebas existentes no demuestran integración operativa con AX, ICS o Gira. Su contrato concreto y evidencia de integración deben quedar vinculados al entregable correspondiente.
