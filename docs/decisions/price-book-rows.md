# ADR-26 · Libro de precios en filas y verificaciones registradas al activar

**Estado:** propuesta del 19-11-2026, en revisión en [TASK-431](https://github.com/developer-implementos/pos-platform/issues/431) con la PR [pos-platform#439](https://github.com/developer-implementos/pos-platform/pull/439), sin integrar. Completa la carga desde archivo de [TASK-404](https://github.com/developer-implementos/pos-platform/issues/404), descrita en el [contrato de publicación](../contracts/master-data-publication.md#carga-desde-archivo-en-la-sucursal). No cambia el formato del archivo ni sus topes, y no acredita una carga en QA, homologación ni aceptación.

**Decisión:** la sucursal guarda el libro de precios activado con una fila por precio. En la misma transacción de activación registra dos verificaciones: que el conjunto de productos activo cumple las reglas de venta, y qué clases de cliente cubre el libro para todos esos productos. Las lecturas de venta consultan esas verificaciones y solo las filas de precio de los productos de cada carrito. Ya no leen ni validan en cada operación el libro completo ni la lista de productos activos. Las reglas que dependen de los clientes siguen comprobándose en cada lectura, porque los clientes cambian fuera de una publicación, pero su costo no crece con el catálogo.

## Qué resuelve

La medición de TASK-431 ([registro en la issue](https://github.com/developer-implementos/pos-platform/issues/431#issuecomment-7012145286)) cargó publicaciones sintéticas con PostgreSQL limitado a 2 CPU. Con 60 003 productos, 120 002 precios y 250 002 clientes, cada operación que comprueba capacidades leía el libro completo (22,6 MB de texto) y la lista de productos activos, y la cotización lo volvía a leer:

- la configuración efectiva tardaba 1 976 ms y la cotización 4 990 ms, frente a 26–67 ms con un catálogo chico;
- durante la activación, los lectores esperaban hasta 4,6 s, más que su `lock_timeout` de 3 s, y una operación de venta fallaba.

Con los topes vigentes del contrato (10 000 productos y 100 000 clientes), la configuración efectiva ya tardaba 276–297 ms y la cotización 645–671 ms. Subir los topes sin cambiar la lectura habría dejado la venta fuera de sus propios presupuestos.

## Tablas nuevas

| Tabla | Una fila por | Qué guarda | Quién la escribe y quién la lee |
| --- | --- | --- | --- |
| `pricing.price_book_entry` | precio de un libro activado | producto, clase de cliente, precio neto por unidad base, piso, impuesto y escalas | la activación, desde el candidato; la cotización, solo para los productos del carrito |
| `pricing.price_book_verification` | libro activado | clases de cliente con precio para todos los productos activos de su versión | la activación; la disponibilidad de la cotización |
| `catalog.publication_verification` | sucursal | versión y publicación cuyo conjunto activo cumplió las reglas de venta | la activación; la compuerta de publicación. Un trigger la borra ante cualquier otra escritura en productos o unidades |

Las dos tablas de pricing son inmutables, como el libro al que pertenecen. Dos índices parciales sobre los clientes no bloqueados sostienen las comprobaciones que siguen en cada lectura. El rol de ejecución solo lee las tres tablas.

## Activación

La activación sigue siendo una sola transacción, ordenada por el bloqueo propio de activación. Lo pesado ocurre antes de tomar el bloqueo que comparten las lecturas de venta, y es invisible para ellas hasta el commit:

1. reescribir las proyecciones del catálogo desde el staging;
2. comprobar sobre las filas nuevas las reglas de producto que antes se evaluaban en cada lectura, y registrar la verificación del catálogo;
3. insertar el libro de precios y una fila por precio, en SQL y sin pasar el libro por el proceso;
4. calcular las clases cubiertas para los productos activos, rechazar si una clase que puede comprar no está cubierta, y registrar la cobertura.

Bajo el bloqueo de los lectores solo quedan la comprobación de la versión base, el cambio de puntero y la comprobación posterior con las mismas compuertas de la venta. Si cualquier paso falla, no hay commit. Al terminar, el comando actualiza las estadísticas del planificador de las tablas reescritas.

## Lectura de venta

| Lectura | Antes | Con esta decisión |
| --- | --- | --- |
| Compuerta de publicación del catálogo | lista de todos los productos activos y recorrido de productos, unidades y clientes | verificación del conjunto activo, más un sondeo por clase de cliente y dos rangos del índice de país |
| Disponibilidad de la cotización | libro completo, validado, y cobertura de cada producto | cabecera del libro y cobertura registrada, comparada con las clases que pueden comprar |
| Cotización | libro completo, también en su huella | cabecera, reglas y filas de los productos del carrito |

## Por qué registrar equivale a recalcular

- El conjunto de productos activo solo cambia al activar. Una escritura fuera de la activación borra la verificación y cierra la cotización hasta la próxima publicación.
- Las reglas de tiempo son monótonas: una observación que no era futura al activar no lo es después.
- La cobertura se registra como el conjunto de clases cubiertas, no como «cubre las clases que podían comprar al activar». Si después se proyecta un cliente de una clase sin cubrir, la cotización se cierra igual que antes.
- Las reglas de clientes siguen en cada lectura, porque las proyecciones de clientes cambian fuera de una publicación.

## Migración y convivencia

Las migraciones solo agregan tablas, índices y triggers. La activación sigue escribiendo la lista de precios en el libro, para que la versión anterior del producto lo lea tras una reversión. Una decisión posterior la retira cuando ninguna reversión la necesite.

No hay relleno retroactivo: una versión activada antes de la migración no tiene sus verificaciones y no habilita la cotización hasta cargar una publicación nueva. Además, la huella de la cotización cambia de formato, así que una cotización o autorización de descuento abierta durante el despliegue se vuelve a cotizar.

## Resultado medido

Medición sintética en una estación de trabajo, con PostgreSQL limitado a 2 CPU, el mismo arnés antes y después, y la mediana de 5 rondas:

| Operación | Topes vigentes, antes | Topes vigentes, después | 60 003 productos, antes | 60 003 productos, después |
| --- | --- | --- | --- | --- |
| Configuración efectiva | 276–297 ms | 73–75 ms | 1 976 ms | 37–89 ms |
| Cotización | 645–671 ms | 153–155 ms | 4 990 ms | 77–132 ms |
| Espera máxima de los lectores al activar | 271–307 ms | 48–64 ms | 1,97–4,58 s | 0,05–0,32 s |

## Relación con otras decisiones

- [ADR-19](postgresql-unit-of-work.md): la activación sigue siendo una transacción local con SQL explícito; las verificaciones son datos del contexto dueño, no un estado del proceso.
- [ADR-25](single-operational-mode.md): las pruebas cargan sus publicaciones por `import-commercial`, y la prueba que adelanta la observación de un producto sigue cerrando la compuerta.
- El [contrato de publicación](../contracts/master-data-publication.md) mantiene la activación por reemplazo de proyecciones; esta decisión acorta lo que esperan los lectores sin versionar las tablas de lectura.

## Límites

- No cambia los topes ni el formato del archivo. La memoria del comando sigue en 11 a 13 veces el tamaño del archivo, y con el volumen real la transacción de activación tarda 16–23 s, contra un presupuesto de 30 s. Ambos los trata el [ADR-27](customer-projection-split.md).
- Lo medido corresponde a una estación de trabajo, no al servidor de QA.
- Todo escritor futuro de productos o unidades debe pasar por la activación, o la cotización queda cerrada hasta la siguiente publicación.

## Verificación

Pruebas de integración del producto contra PostgreSQL real. Comprueban que:

- las filas son exactamente los precios publicados;
- la cotización lee solo las filas de su carrito;
- un libro sin cobertura registrada no abre la cotización;
- un cliente proyectado de una clase sin cubrir la cierra, y bloquearlo la reabre;
- una escritura en el catálogo fuera de la activación la cierra;
- las tablas son inmutables y de solo lectura para el rol de ejecución.

Siguen en verde las pruebas de concurrencia, reanudación y rechazo sin escritura de TASK-404 y la prueba de actualización de migraciones. El detalle está en la [ficha del producto](https://github.com/developer-implementos/pos-platform/blob/ee8c0ceeeed1d2a260d2c5b069525786d0a45c42/odd/tasks/price-book-rows.md).
