# ADR-27 · Proyección de clientes separada de la publicación comercial

**Estado:** propuesta del 19-11-2026, en revisión en [TASK-431](https://github.com/developer-implementos/pos-platform/issues/431) con una PR del producto apilada sobre la del [ADR-26](price-book-rows.md), sin integrar. El responsable del producto delegó la elección del formato en la recomendación medida. No acredita una carga en QA, homologación ni aceptación.

**Decisión:** con el volumen de una sucursal real, los clientes dejan de viajar dentro de la publicación comercial:

- **`commercial-publication-v2`** trae catálogo, precios y disponibilidad. Se activa de forma atómica, como v1.
- **`customer-projection-v1`** es un archivo de texto con una línea por cliente, que la sucursal lee línea a línea y aplica por porciones. Cada cliente cambia entero y el puntero de la proyección avanza al terminar.

Los topes de la publicación comercial suben a 90 000 productos, 180 000 precios y 180 000 disponibilidades, y los de la proyección a 400 000 clientes.

## Qué resuelve

La sucursal de QA del legacy tiene 59 600 productos y 242 812 clientes, frente a topes de 10 000 productos y 100 000 clientes. Con publicaciones sintéticas de ese volumen y PostgreSQL y el comando limitados a 1 CPU, como en el ambiente de QA:

- **Una publicación con todo**, de 154,9 MiB, necesitó 1,77 GB de memoria, y su activación llegó a 30,1 s y falló por el presupuesto de 30 s por transacción.
- **Separada en dos**, el catálogo activó en 8,8–12,8 s y los clientes en 15,6–16,8 s.

Se consideró también separar la publicación en un manifiesto con partes. Acotaba la memoria, pero mantenía una sola transacción para catálogo y clientes, que ya no cabe en el presupuesto con el volumen real.

## Por qué los clientes se aplican por porciones

Los clientes ya son una proyección con versión y secuencia propias: nunca se borran, cambian solo con una versión mayor y el escritor de proyección existente los aplica de a uno. Aplicarlos por porciones de 500 mantiene esa semántica:

- cada cliente cambia entero;
- la venta espera solo la porción en curso;
- el puntero de la proyección se mueve en la última transacción, y solo hacia adelante;
- una carga interrumpida se reanuda desde la porción siguiente.

Antes de escribir nada, el archivo se comprueba entero: esquema, forma canónica, hash, sucursal, reglas de cada cliente y unicidad. Antes de aplicar, se valida contra la proyección activa (secuencia, regresión y conflictos). Un archivo inválido o rechazado no cambia ningún cliente.

## Convivencia y orden de carga

v1 se sigue aceptando con sus topes actuales mientras lo usen las pruebas, el ambiente local y el recorrido de cobro. El extractor del legacy, todavía sin código, produce directamente v2 y la proyección de clientes. Se cargan primero los clientes y después la publicación comercial, para que la cobertura de precios del [ADR-26](price-book-rows.md) se compruebe contra las clases de cliente ya cargadas. Una decisión posterior retira v1.

## Resultado medido

Mismas condiciones, a 1 CPU y en dos rondas:

| Carga | Archivo | Memoria máxima | Tiempo total | Espera máxima de los lectores |
| --- | --- | --- | --- | --- |
| Clientes, 250 000 | 72,3 MiB | 0,29–0,33 GB | 52–66 s | 0,46–0,61 s |
| Clientes, 400 000 (tope) | 115,8 MiB | 0,31–0,32 GB | 85–107 s | 0,38–0,51 s |
| Catálogo v2 con el volumen real | 56,7 MiB | 0,86 GB | 27–34 s | 0,04–0,06 s |
| Catálogo v2 en sus topes | 105 MiB | 1,29 GB | 41–47 s, con 15–23 s de activación | 0,03–0,06 s |

Ninguna venta falló durante las cargas. Después, la configuración efectiva tarda 31–32 ms y una cotización 66–69 ms. El contenedor del comando en QA pasa a 2 GiB, con un heap de 1 536 MiB.

## Límites

- La publicación comercial sigue siendo un documento entero en memoria: 11 a 13 veces el tamaño del archivo.
- En sus topes, la activación del catálogo usa hasta el 76 % del presupuesto en una estación de trabajo. El servidor de QA tiene un CPU más lento, no medido. La siguiente palanca es acortar la activación o, con medición en ese hardware, darle un presupuesto propio al comando.
- Lo medido son cargas sintéticas en una estación de trabajo, no una carga en QA.

## Verificación

Pruebas de integración del producto contra PostgreSQL real. Comprueban que:

- una publicación v2 se activa sin tocar la proyección de clientes;
- un archivo de clientes adulterado, con duplicados, no canónico o de otra sucursal se rechaza sin escribir nada;
- la proyección se aplica por porciones, recupera su recibo y se reanuda tras una interrupción;
- una secuencia vieja se rechaza sin cambiar clientes;
- el staging no es legible por el rol de ejecución.

Siguen en verde las pruebas de TASK-404 y del ADR-26.
