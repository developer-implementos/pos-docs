# ADR-28 · Precios con impuesto incluido, declarados por cada país

**Estado:** decisión del responsable del producto del 19-11-2026: «sí, hazlo como el legacy». Implementada en [TASK-445](https://github.com/developer-implementos/pos-platform/issues/445), en revisión en la PR del producto y sin integrar en `main`. Resuelve el primer punto del seguimiento FOLLOWUP-025; los otros tres siguen abiertos. No acredita una carga en QA, homologación ni aceptación.

**Decisión:** cada país declara en su publicación comercial si los montos de su lista de precios incluyen el impuesto. Con `tax-included`, la cotización cobra lo que suman las líneas, como la caja legacy de Chile, y obtiene de ese total el neto y el impuesto. El motor aplica esa propiedad sin preguntar por el país. Chile la declara con impuesto incluido y con el neto y el IVA calculados por documento.

## Qué resuelve

El extractor del legacy publicaba un neto con 6 decimales derivado del precio bruto entero que entrega la fuente de precios, y la cotización redondeaba a pesos el subtotal neto de cada línea antes de sumar el IVA. En el 16 % de los precios brutos entre 1 y 300 000, el total de una unidad difería en un peso del que cobra la caja legacy; también en 3 de 11 precios reales sondeados: 58 990 se cobraba 58 989, 2 690 se cobraba 2 691 y 5 890 se cobraba 5 891.

## Cómo cobra la caja legacy de Chile

Leído en el repositorio legacy `mountain-implementos`, sin copiar su código:

| Paso | Regla | Evidencia |
| --- | --- | --- |
| Precio de la línea | El precio del cliente que responde la fuente de precios para la cantidad de la línea, en pesos enteros con IVA. La escala por cantidad ya viene aplicada en ese precio. | `backend/app/Services/ProductosService.js` 134–149; `frontend/src/app/modules/pos/components/pos-listado-productos/pos-listado-productos.component.ts` 408, 530–531, 877–902 y 965–972 |
| Total de la línea | Precio por cantidad, en bruto. Las promociones y los cupones restan un monto bruto de ese total. | `pos-listado-productos.component.ts` 684–694, 1412–1422 y 1492–1502 |
| Neto e IVA | Por documento. Cada línea se divide por uno más la tasa, sin redondear; se suman y se redondean una sola vez el neto y el IVA del documento. El total es la suma de los totales de línea. Es igual en boleta y en factura. | `backend/app/Services/ImpuestosService.js` 17–55 y 97–135; `backend/app/Controllers/Http/PuntoDeVentaController.js` 340 y 462–488; semilla de `general_impuestos_incluido` en `ConfiguracionVariableSeeder.js` 613–618 |
| Documento tributario | Neto, IVA y total del documento son los calculados arriba. El detalle de la factura usa el neto unitario redondeado, que puede no sumar el neto del documento. | `backend/app/Services/Facturacion/FacturacionAceptaService.js` 121–125 y 310–347 |

Con el 19 %, un total entero dividido por 1,19 nunca termina exactamente en ,5. Por eso, en el legacy, el neto redondeado más el IVA redondeado siempre dan el total.

## Cálculo

La cotización trata igual los dos casos hasta el impuesto: precio por unidad base por factor y cantidad, escalas, piso del precio mínimo, promociones y descuento manual, todos en la base que declara la lista. Después:

| Base | Total de la línea | Impuesto |
| --- | --- | --- |
| `net-of-tax` | lo que cobra la línea más su impuesto | la tasa sobre lo que cobra, por línea o por documento según el perfil |
| `tax-included` | lo que cobra la línea | etapa `document`: por código y tasa, `total − round(total / (1 + tasa))`, repartido entre las líneas sin superar lo que cobra cada una; etapa `line`: lo mismo por línea |

Para el 19 %, la etapa `document` da el mismo neto y el mismo IVA que el legacy. El impuesto se obtiene como lo que resta del total una vez redondeado el neto, así que neto más impuesto es exactamente el total también en tasas donde sí hay empates en ,5, como el 4 %.

La cotización conserva su forma: subtotal menos descuento más impuesto es igual al total, por línea y por documento, la misma igualdad que exige la venta confirmada. Con impuesto incluido, el total de cada línea es lo que cobra, su descuento se expresa sin impuesto y su subtotal completa la suma. El precio unitario y el monto de cada promoción quedan en la base de la lista, y la cotización lo declara con `priceBasis: tax-included`.

## Contratos

| Contrato | Cambio |
| --- | --- |
| `commercial-publication` v1 y v2 | `pricing.priceBasis` admite `net-of-tax`, el valor de siempre, o `tax-included`. Vale para precios, pisos, escalas, reglas y el descuento manual. Un archivo existente sigue siendo válido, sin otra versión del contrato. |
| Libro de precios de la sucursal | El perfil guarda la base solo cuando es `tax-included`. Un libro sin ella es neto, como todos los activados antes. |
| Cotización (`Quote`) | Propiedad opcional `priceBasis`, presente solo cuando la lista incluye el impuesto. Una cotización de un libro neto no cambia, ni en su forma ni en su huella. |
| Correspondencia del legacy | Declara la base de la publicación, que debe coincidir con la que declara el adaptador de la fuente de precios. |
| Fuente de precios | Cada precio observado declara su base. El adaptador de Chile publica los pesos enteros con IVA tal como los responde la fuente. |

El extractor no convierte entre bases. Si la fuente responde en otra base que la declarada, la corrida falla; un precio en otra base queda inactivo con su hallazgo. Convertir sería elegir un redondeo que la fuente no tomó.

## Por qué los montos en la base de cada país

- **El dato de la fuente es el bruto.** Guardarlo tal cual evita depender de que un neto de 6 decimales reconstruya el bruto, y deja el cálculo en un solo lugar. Es el modelo de las plataformas de comercio que publican precios con o sin impuesto incluido, como el comportamiento fiscal de un precio o la marca de impuestos incluidos de una tienda.
- **Los consumidores de la cotización no cambian.** Ventas, pagos, documentos tributarios y reportes leen subtotal, descuento, impuesto y total con la misma igualdad de siempre; la venta confirmada la exige en la base de datos. Expresar la cotización en bruto obligaría a cambiar esa restricción y a cada consumidor.
- **Una regla por país, no un caso de Chile.** La base y la etapa viajan en la publicación; el motor no tiene condiciones por país.

## Otros países

Perú y España publican habitualmente precios con impuesto incluido. Cada uno declara su base en la publicación que produzca su extractor:

- si su fuente responde precios con impuesto incluido, se publican así y el motor los cobra como en Chile, con la escala de su moneda y su tasa;
- la etapa de redondeo, por línea o por documento, es una decisión de cada país en su perfil;
- una fuente que responda netos para un país que exhibe precios con impuesto exige una decisión nueva sobre el redondeo del precio exhibido: el POS no lo resuelve en silencio.

## Convivencia de versiones y reversión

- **Orden de despliegue.** Los clientes del POS validan la cotización con objetos estrictos, así que un cliente de una versión anterior rechaza una cotización con `priceBasis`. Primero se despliegan `branch-api` y los clientes de esta versión; después se vuelve a correr el extractor y se activa el libro con impuesto incluido.
- **Libros activos.** Una publicación activada antes, sin la propiedad, se sigue cotizando sobre el neto hasta que se active la siguiente. El despliegue no invalida cotizaciones abiertas.
- **Reversión.** Una versión anterior de `branch-api` rechaza un libro o una publicación con impuesto incluido, y la cotización queda cerrada, en vez de cobrarlos sobre el neto. Los libros netos funcionan en las dos versiones. Para volver atrás después de activar un libro con impuesto incluido hay que activar antes un libro neto.

## Relación con otras decisiones

- [ADR-20](cash-rounding.md): el redondeo legal del efectivo sigue siendo un ajuste del pago y no cambia el total del documento.
- [ADR-26](price-book-rows.md) y [ADR-27](customer-projection-split.md): la base se guarda en el perfil del libro activado; las filas de precio guardan los montos en esa base.
- El [contrato de publicación](../contracts/master-data-publication.md) declara la base de la lista de precios.

## Límites

- El detalle por línea del documento tributario, precio unitario y monto de cada línea por tipo de documento, pertenece al contexto fiscal y espera los vectores de Tributario (VEN-043 y Q-61).
- Contra qué precio se calcula y muestra el ahorro en la caja sigue abierto (Q-62).
- Un único impuesto por línea: los impuestos adicionales siguen sin representación (Q-60).
- Los otros tres puntos de FOLLOWUP-025 siguen abiertos: el precio de referencia de una oferta, el grupo de precio y el crédito del cliente, y el bloqueo que solo impide facturar.
- No se volvió a correr el extractor contra el legacy ni se comparó con la caja legacy sobre datos de QA.

## Verificación

Pruebas del producto:

- para todo precio bruto entero de 1 a 300 000, una unidad cobra el bruto, y el neto y el IVA del documento son los del legacy;
- lo mismo con cantidades mayores, línea por línea;
- 2 000 carritos aleatorios, comparados con el cálculo del legacy transcrito con su misma aritmética;
- escalas, promociones, descuento manual y el piso del precio mínimo, en bruto;
- los tres precios reales que difieren hoy, y el vector 11 900 → neto 10 000 más IVA 1 900;
- un libro sin base cotiza igual que antes;
- con PostgreSQL real, una publicación con impuesto incluido se importa, su libro guarda la base y la cotización cobra el bruto, mientras el libro neto anterior conserva su forma.

El detalle está en la [ficha del producto](https://github.com/developer-implementos/pos-platform/blob/work/task-445-redondeo-legacy/odd/tasks/tax-included-pricing.md).
