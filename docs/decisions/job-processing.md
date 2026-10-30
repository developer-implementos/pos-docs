# ADR-18 · Trabajos con BullMQ y Redis

**Estado: decisión aceptada de la propuesta; implementación y aceptación operativa pendientes.** BullMQ con Redis dedicado a trabajos es la tecnología elegida para programar y ejecutar trabajo en segundo plano de país e integración ERP. El scaffold actual no acredita colas, consumidores, persistencia ni recuperación funcionando. RabbitMQ no forma parte de esta arquitectura objetivo.

## Responsabilidad y ubicación

| Dominio de trabajo | Aplicación que lo compone | Trabajos admitidos | Almacén y frontera |
| --- | --- | --- | --- |
| Programación de país | `country-api` · NestJS/Node.js + BullMQ | Disparos del calendario y creación breve e idempotente de solicitudes de publicación, fuera de una petición HTTP | Redis exclusivo de trabajos en el entorno de país; PostgreSQL conserva calendario, intervalos y solicitudes |
| Ejecución ERP y maestros | `erp-worker` · NestJS/Node.js + BullMQ | Ejecución de operaciones ERP, preparación por lotes de maestros y consulta/conciliación de resultados | Redis exclusivo de trabajos en la red autorizada del ERP; trabajo y resultado de negocio en país mediante HTTPS |
| Sincronización de sucursal | `branch-sync-worker` | Despachar outbox, descargar paquetes, conservar cursores y activar versiones | PostgreSQL de sucursal + HTTPS; este recorrido no necesita BullMQ ni Redis local |
| Periféricos | `device-agent` · C#/.NET | Recibir y ejecutar comandos autorizados por `branch-api`, conservar intentos y evidencia | SQLite técnico + HTTPS LAN; este recorrido no utiliza BullMQ |

BullMQ es una biblioteca compuesta por las aplicaciones, no una octava aplicación ni un servicio que sustituya a `country-api` o `erp-worker`. Los consumidores de país ejecutan únicamente coordinación breve. La extracción, transformación y preparación pesada se ejecutan en `erp-worker`, con concurrencia y recursos separados del trabajo financiero.

Los dos dominios usan instancias Redis independientes, credenciales propias y aislamiento por país, entidad legal y entorno autorizado. `erp-worker` no consume Redis de país ni abre SQL a PostgreSQL de país a través de WAN: solicita trabajo y entrega resultados mediante los contratos HTTPS de `country-api`. Los prefijos de claves o las bases lógicas Redis no sustituyen ese aislamiento operativo.

## Autoridad de negocio y entrega a la cola

PostgreSQL conserva operaciones, solicitudes, estados, outbox/inbox, evidencias y resultados. Redis conserva el estado de ejecución de los jobs y puede reconstruirse. Un `jobId` evita ciertas duplicaciones en cola; no sustituye la identidad ni la deduplicación durable de una venta, cobro o publicación.

1. El caso de uso confirma negocio y outbox en una transacción PostgreSQL. La respuesta al emisor acredita ese contrato, no la contabilización ERP.
2. Un relay lee registros confirmados y añade jobs con identidad estable. En país, reconcilia también el calendario y los intervalos pendientes. La escritura en PostgreSQL y `Queue.add()` son operaciones diferentes: ningún commit distribuido se presupone.
3. En la red ERP, `erp-worker` descubre referencias de trabajo autorizado por HTTPS y materializa tareas en su Redis local. El consumidor reclama el trabajo cuando tiene capacidad para comenzar, no antes de esperar en una cola. El claim, su propietario, vencimiento y versión de intento se conservan en país; perder un job no elimina el trabajo admitido. Una referencia en Redis no autoriza por sí sola a ejecutar.
4. El consumidor comprueba el estado y la autorización antes de actuar, renueva el claim durante la ejecución y respeta su fencing. Al finalizar, entrega el resultado y la evidencia mediante una transición condicional; solo entonces se considera cumplido el contrato de negocio.
5. Un reconciliador reconstruye trabajos faltantes a partir de solicitudes, outbox, claims y estados durables. Si no puede descartarse un efecto remoto ya ejecutado, programa consulta o conciliación, no una nueva ejecución ciega. Una pérdida de Redis no borra ese estado incierto ni autoriza a tratar el trabajo como nuevo.

La ventana entre encolar y registrar el progreso puede generar duplicados. Se admite entrega al menos una vez y se exige idempotencia de aplicación. Eliminar un job completado o restaurar Redis no debe permitir cobrar de nuevo ni perder trabajo previamente aceptado. La expiración de un claim o lock tampoco demuestra que el efecto externo se haya detenido.

## Calendario y publicación comercial

`country-api` conserva en PostgreSQL el calendario, la zona horaria, el ámbito, el dataset y la identidad única del intervalo. BullMQ dispara su procesamiento fuera de HTTP. El handler reclama el intervalo y crea `requestPublication` idempotentemente; dos réplicas o un reinicio no crean dos solicitudes de la misma ejecución. Los intervalos atrasados se recuperan con carga limitada y una política explícita de consolidación.

`erp-worker` reclama la solicitud por HTTPS, prepara porciones mediante `MasterDataSourcePort` y las sube a país. `country-api` valida la candidata y publica atómicamente el manifiesto/puntero y su outbox en PostgreSQL. Deshabilitar el calendario detiene nuevas solicitudes; no borra trabajos ya admitidos. El [contrato de publicación de maestros](../contracts/master-data-publication.md) define identidad, integridad y activación en sucursal.

## Reintentos y efectos externos

| Resultado del intento | Acción |
| --- | --- |
| Error transitorio antes de cualquier efecto | Reintento acotado con backoff, jitter y presupuesto por destino |
| Rechazo funcional definitivo | Registrar motivo y detener el reintento; resolución explícita por el dueño del proceso |
| Respuesta perdida tras posible ejecución ERP, pago o efecto físico | Estado incierto; consulta por identidad o conciliación antes de repetir |
| Job interrumpido o lock perdido | Recuperar con la misma identidad y comprobar el estado durable; no asumir que el intento anterior no ejecutó |
| Repetición manual | Comprobar permiso, motivo, estado, destino e identidad; conservar auditoría y evitar un segundo efecto |

## Operación de Redis de trabajos

- Instancias exclusivas de jobs, con persistencia, copias y restauración verificadas, capacidad reservada y política `maxmemory-policy=noeviction`. Al alcanzar el límite, alertar y aplicar contrapresión; no descartar pendientes silenciosamente.
- Redis de caché sigue siendo una capacidad opcional para lecturas reconstruibles de `country-api`. Si se incorpora, usa otra instancia y otra política de memoria. Una caída de esa caché no elimina jobs.
- Jobs con referencias e identificadores mínimos: no duplicar documentos sensibles, secretos ni respuestas completas de proveedores en la cola. Controlar credenciales, acceso de red y cifrado según el entorno.
- Separar colas y presupuestos de operaciones financieras, preparación de maestros y conciliación. Medir antigüedad del pendiente, fallos, bloqueos, duración, reconexión, memoria y demora entre commit, encolado y resultado.
- Fijar versiones compatibles de BullMQ, integración NestJS y Redis en el producto, con actualización y rollback probados. La decisión técnica no acredita una versión instalada.

## Aceptación antes de habilitar el flujo

Se requieren pruebas reproducibles de caída después del commit y antes del enqueue; enqueue confirmado con respuesta perdida; duplicación por pérdida de lock; borrado/restauración de Redis; reclamos vencidos; dos réplicas del calendario; reconexión masiva; contrapresión; resultado ERP incierto; separación entre colas financieras y lotes; recuperación de todas las solicitudes admitidas y ausencia de efectos duplicados. Los RPO/RTO y la capacidad se fijan con evidencia del piloto, no por los valores predeterminados de una biblioteca.

La [matriz de trabajo y aceptación](../investigacion-mensajeria-pos.md#5-matriz-de-decisión-provisional-por-carga-de-trabajo) y el [roadmap](../roadmap.md) distribuyen estas condiciones por recorrido. La venta local autorizada sigue independiente de la disponibilidad de Redis de país o ERP.

## Referencias técnicas

- [Modelo Queue/Worker de BullMQ](https://docs.bullmq.io/guide/introduction).
- [Operación en producción](https://docs.bullmq.io/guide/going-to-production).
- [Recuperación de jobs interrumpidos](https://docs.bullmq.io/guide/workers/stalled-jobs) y [jobs idempotentes](https://docs.bullmq.io/patterns/idempotent-jobs).
- [Políticas de reintento](https://docs.bullmq.io/guide/retrying-failing-jobs).
- [Persistencia Redis](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).
