# ADR-20 · Redondeo de efectivo como ajuste de pago

**Estado:** propuesta del 6-11-2026, pendiente de revisión. No está implementada en el backend ni aprobada por Finanzas, Tributario o el dueño del ERP. No acredita homologación ni operación productiva.

**Decisión:** el total de la venta y el documento tributario no cambian. El redondeo legal es un ajuste con signo del pago en efectivo, que el servidor calcula una sola vez con una política versionada por país y congela junto a la operación. Los demás medios de pago van exactos y la caja registra sólo dinero real.

## Qué resuelve

En Chile, "en todos los pagos cuya solución se realice en dinero efectivo, las cantidades iguales o inferiores a $5 se depreciarán a la decena inferior, y las cantidades iguales o superiores a $6 se elevarán a la decena superior" ([Ley 20.956, art. 13](https://www.leychile.cl/Consulta/obtxml?opt=7&idLey=20956)). Rige desde el 1-11-2017 y no es un redondeo siempre al alza: $1.231 se cobra $1.230 y $1.237 se cobra $1.240.

El backend exige hoy cobrar el total exacto. Rechaza una venta de $1.004 pagada con $1.000 (`CASH_INSUFFICIENT`) y acepta $1.006 con $1.006, cuando corresponde cobrar $1.010. La regla existe sólo en la maqueta, y [F02-05](https://github.com/developer-implementos/pos-platform/issues/27) se verificó con el criterio "no redondear para ocultar diferencias". Hasta implementar esta decisión, el producto no debe operar efectivo real en Chile.

## Qué fija la norma y qué queda abierto

Lo que fija la norma se cumple: no es una decisión de negocio. Esta tabla resume la norma chilena leída en su texto; no sustituye una opinión legal.

| Tema | Qué fija la norma | Qué queda abierto |
| --- | --- | --- |
| Regla | 1–5 baja y 6–9 sube, sobre el monto final de la factura, boleta o documento de cobro ([Decreto 1266, art. 4°](https://www.bcn.cl/leychile/navegar?idNorma=1111243)) | Montos menores a $10: se aplica una lectura mecánica ([QF2](#qf2--cierre-con-0-en-efectivo)) |
| Medios | Sólo efectivo. Tarjetas, cheques y otros medios van exactos; un cheque cobrado en dinero por caja sí redondea (art. 3°) | Qué medios habilita cada perfil |
| Pago parcial | Se aplica "sólo respecto de ese pago parcial efectuado en dinero efectivo" (art. 4°) | Total terminado en 0 con una parte en efectivo que no termina en 0 (asesor) |
| Documentos | No se modifican documentos ni declaraciones, y no hay efecto tributario, salvo excepciones legales que determine el SII (art. 5°) | `VlrPagar`, `MontoNF` e impreso: sin respaldo expreso, consultar al SII |
| Alcance | Todos los pagos en efectivo, cualquiera que sea quien los efectúe o reciba (art. 2°) | Imputación en cuentas por cobrar ([QF7](#qf7--cobranzas-y-cuotas)) |
| Ajustes contables | Se permiten; "no producirán efecto tributario, por lo que no serán aceptadas tributariamente" (art. 6°) | Cuenta y reflejo en renta ([QF1](#qf1--contabilización-del-ajuste), [QF12](#qf12--conciliación-y-renta)) |
| Devoluciones | Sin regla expresa | Monto y algoritmo ([QF4](#qf4--devoluciones-parciales-en-efectivo), [QF5](#qf5--medio-y-tope-del-reembolso)) |
| Donación de vuelto | Sin norma específica | [QF13](#qf13--donaciones) |

La [Circular 44/2017 del SII](https://www.sii.cl/normativa_legislacion/circulares/2017/circu44.pdf) ordena reconocer como ingresos los montos de las facturas y boletas. Quien tributa sobre renta percibida reconoce lo efectivamente percibido, con tope en esos montos.

## Modelo

| Magnitud | Significado | T=1.005, recibe 2.000 | T=1.006, recibe 2.000 |
| --- | --- | ---: | ---: |
| `T` | Total de la venta y del documento | 1.005 | 1.006 |
| `N` | Porción nominal asignada a efectivo; es lo que salda la deuda | 1.005 | 1.006 |
| `C` | Efectivo cobrado, `C = R(N)`; es dinero real | 1.000 | 1.010 |
| `A` | Ajuste, `A = C − N`; negativo a favor de quien paga | −5 | +4 |
| `Rc` | Efectivo recibido | 2.000 | 2.000 |
| `V` | Vuelto, `V = Rc − C` | 1.000 | 990 |

La decisión se sostiene en seis invariantes:

1. **Las asignaciones siguen siendo nominales.** Su suma es `T`, de modo que el plan de pagos, el impuesto y el documento fiscal no cambian.
2. **El servidor calcula `C` y `A`.** El cliente muestra el efectivo a pagar que recibe del servidor y nunca envía `C` ni `A`. Ventas vuelve a calcularlos antes de confirmar.
3. **Se redondea una vez por pago en efectivo.** Una venta admite una sola asignación de efectivo: dos tramos de 1.005 se cobrarían 2.000 en vez de 2.010. El resultado depende del reparto declarado, no de la secuencia de ingreso.
4. **La caja sólo conoce dinero real.** El efectivo esperado es apertura más `ΣC`. Sumarle `A` lo contaría dos veces; en el cierre, el ajuste es una línea informativa.
5. **Todo queda congelado con su versión de política.** Cambiar la política no altera planes abiertos ni ventas históricas. Una reversión es un evento nuevo vinculado al original.
6. **Nadie ajusta `A` a mano**, ni cajero ni supervisor. Una corrección es una devolución.

`A = null` significa que la política no aplica y `A = 0` que aplicó sin efecto. Una venta sin efectivo no crea pago ni movimiento de caja.

## Propiedad y límites del código

| Contexto | Responsabilidad |
| --- | --- |
| `libs/country-policies` | Definición pura y versionada: algoritmo de lista cerrada, incremento, alcance y vigencia. Función `R` con vectores por país |
| `libs/backend/administration` | Activación y vigencia, sólo en la capa país: una obligación legal no se apaga por sucursal ni por puesto |
| `libs/backend/payments` | Calcula `C` y `A` al registrar el efectivo y expone el efectivo a pagar. Es dueño de recibido y vuelto |
| `libs/backend/sales` | Recalcula y rechaza si no coincide, en el plan de pagos y en `ConfirmCashSale`. Guarda copia inmutable en la venta |
| `libs/backend/cash` | Recibe sólo `C`. No registra movimientos de $0 ni movimientos por el ajuste |
| `libs/backend/pricing` | Sin cambios. Su `HALF_UP` es redondeo de precio a la escala de la moneda: reutilizarlo daría 1.010 para 1.005, que es incorrecto |
| `libs/backend/fiscal` | Sin cambios en Chile. Una prueba fija que el total fiscal es `T` |
| `erp`, `reporting`, `sync` | Consumen el ajuste mediante contratos versionados |

## Contratos y convivencia de versiones

Los importes siguen como cadenas decimales. `MoneySchema` no admite signo, por lo que el ajuste necesita un tipo propio. Los nombres usan `cashRounding*` para no confundirse con `Quote.rounding`, que ya significa otra cosa.

- **Conflictos reales:** `tendered >= total` y `received >= amount` en dominio y SQL, el importe que se escribe en caja y el retorno de un efectivo con `Rc = 0`. La igualdad de suma de `validatePaidSettlement` se conserva.
- **Datos:** columnas aditivas y nulas, sin editar migraciones aplicadas, con una restricción `collected = amount + adjustment` y una cota por política. Al cambiar tablas se actualiza el diccionario de datos del contexto en la misma PR.
- **Idempotencia:** el hash del comando no incluye `A` ni la versión de política, porque son salidas del servidor selladas en el resultado. Repetir un comando devuelve el ajuste original aunque la política haya cambiado.
- **Pantalla desactualizada:** la solicitud puede incluir el efectivo a pagar que vio el cajero; si difiere, responde conflicto antes del commit.
- **Eventos:** `SaleConfirmed` v3 con efectivo cobrado explícito, conservando los lectores de v1 y v2. Un lector de v2 que use `cashApplied` como dinero físico se desviaría en `A`.
- **Riesgo de despliegue:** los esquemas son `z.strictObject`. Un campo nuevo en una respuesta V1 hace que un cliente antiguo reporte `INVALID_RESPONSE` con la venta ya confirmada. Se requieren rutas V2 o respuesta condicionada a la capacidad, campos opcionales sin `default` y activación por sucursal sólo con todas sus instalaciones compatibles.

## Política por país

Chile y Perú difieren en el algoritmo, no sólo en un parámetro: llevar la regla chilena a Perú convertiría S/ 5,96 en S/ 6,00, un redondeo al alza prohibido sin aceptación expresa. Las celdas marcadas requieren confirmar con un asesor local y no se activan sin un caso aprobado por país.

| Parámetro | Chile | Perú | España |
| --- | --- | --- | --- |
| Estado | Obligatorio | Obligatorio | Sin regla localizada |
| Algoritmo e incremento | Más cercano con empate a la baja, 10 | Truncar, S/ 0,10 | Ninguno |
| Cota de `A` | −5 a +4 | −0,09 a 0 | Nula |
| Tarjeta y transferencia | Exactas | Exactas (a confirmar) | Exactas |
| Pago mixto | Sólo la porción en efectivo | Sin regla expresa (a confirmar) | Sin redondeo |
| Documento fiscal | Sin cambio | `PayableRoundingAmount` opcional, a probar con OSE o PSE | Una rebaja real reduciría la base (a confirmar) |
| Vigencia y base | 1-11-2017; Ley 20.956 y Decreto 1266 | Ley 29571, art. 44; [Circular 0033-2018-BCRP](https://busquedas.elperuano.pe/dispositivo/NL/1708052-1) | Sin norma localizada: resultado de búsqueda, no certificación |

Si Perú informa `PayableRoundingAmount`, el medio de pago debe conocerse antes de generar el XML; en Chile el documento es independiente del pago. "No tocar el documento" es por tanto un principio chileno, no una regla universal, y la representación fiscal debe poder variar por país.

## Alternativas descartadas

| Alternativa | Motivo |
| --- | --- |
| Redondear el total del documento | Contraviene la norma chilena, que prohíbe modificar los documentos, y alteraría cobros con tarjeta |
| Asignaciones en dinero, con `Σ = T + A`, como la maqueta | Obliga a redefinir el saldo pendiente y hace que las asignaciones de eventos dejen de sumar el total |
| Calcular sobre el saldo al abrir el cobro, como el legacy | El resultado depende del orden de los pagos y el cálculo queda en el cliente |
| Modelar el ajuste como forma de pago `RED` en el dominio | Mezcla medio de pago con diferencia financiera, y sólo cubre el signo negativo. Un adaptador ERP puede usar ese mapeo; el dominio no |
| Redondear sólo si se entrega cambio (Toast) | No cabe en "todos los pagos" del art. 13: quien paga el monto redondeado exacto también redondea |
| No redondear pagos mixtos (Xstore, acelerador Italia) | Contradice el art. 4° del Decreto 1266 |

## Respuestas propuestas a Finanzas

Las respuestas usan dos fuentes. Una es el código del legacy, leído en `mountain-implementos@f57d590` y `mountain-sync-sucursal@540ab9a`, sin ejecutarlo ni consultar datos de producción. La otra es la documentación pública de POS enterprise consultada el 6-11-2026, que muestra comportamiento documentado y no su implementación interna. Una segunda lectura independiente del código contrastó cada pregunta. La columna "Legacy" resume su resultado: **responde** indica que el código fija el comportamiento, **parcial** que fija una parte y **sin decisión** que el resultado es un efecto lateral. Mostrar qué hace el legacy no decide qué debe hacer el producto: es evidencia de operación, no una especificación, y sus inconsistencias no se replican.

**Cada respuesta es una recomendación de ingeniería hasta que la ratifique el rol indicado en su seguimiento. Ninguna está aprobada.** Quién debe responder, el impacto y el estado vigente se mantienen en [Bloqueos y decisiones](/project/attention/), no en esta página. Implementar el núcleo con la política apagada en laboratorio no depende de estas respuestas.

| # | Pregunta | Legacy | Respuesta propuesta | Seguimiento |
| --- | --- | --- | --- | --- |
| [QF1](#qf1--contabilización-del-ajuste) | ¿Cómo se contabiliza el ajuste? | Parcial | Dos cuentas dedicadas de resultado; evento por pago, sin netear | FOLLOWUP-016 |
| [QF2](#qf2--cierre-con-0-en-efectivo) | ¿Se cierra con $0 en efectivo? | Sin decisión | Sí, con acción explícita y alerta | FOLLOWUP-017 |
| [QF3](#qf3--límite-a-dividir-pagos) | ¿Se limita dividir pagos? | Sin decisión | No; se monitorea | FOLLOWUP-017 |
| [QF4](#qf4--devoluciones-parciales-en-efectivo) | ¿Cómo se calculan las devoluciones parciales? | Sin decisión | Pago acumulado sobre el nominal devuelto | FOLLOWUP-018 |
| [QF5](#qf5--medio-y-tope-del-reembolso) | ¿Qué medio y tope tiene el reembolso? | Parcial | Medio original primero; tope en el dinero recibido | FOLLOWUP-018 |
| [QF6](#qf6--nota-de-crédito-aplicada-a-otra-venta) | ¿Cuánto vale una NC aplicada a otra venta? | Responde | Lo financiado, sin saldos residuales | FOLLOWUP-018 |
| [QF7](#qf7--cobranzas-y-cuotas) | ¿Cómo se imputan cobranzas y cuotas? | Responde | Se salda el nominal, una vez por pago | FOLLOWUP-019 |
| [QF8](#qf8--anticipos-en-efectivo) | ¿Cómo se tratan los anticipos? | Responde | Se acredita lo recibido, sin ajuste | FOLLOWUP-019 |
| [QF9](#qf9--usd) | ¿Se admite USD? | Responde | Sigue bloqueado | FOLLOWUP-019 |
| [QF10](#qf10--tolerancia-y-responsabilidad-en-el-arqueo) | ¿Qué tolerancia tiene el arqueo? | Responde | `A` nunca es diferencia de caja; tolerancia inicial 0 | FOLLOWUP-017 |
| [QF11](#qf11--habilitación-sin-concepto-erp) | ¿Se habilita sin concepto ERP? | Parcial | No para el piloto | FOLLOWUP-016 |
| [QF12](#qf12--conciliación-y-renta) | ¿Cómo se concilia y se refleja en renta? | Parcial | Reporte con invariantes; la renta requiere asesor | FOLLOWUP-020 |
| [QF13](#qf13--donaciones) | ¿Hay programa de donaciones? | No responde | Fuera del primer corte | Sin seguimiento hasta que entre al alcance |

### QF1 · Contabilización del ajuste

- **Legacy:** es por transacción, no neto de turno. Sólo `A < 0` llega a AX, como línea de forma de pago `RED` en cada diario; `A > 0` queda dentro de la línea de efectivo, sin marca. La cuenta de `RED` no consta en el código. Un informe de AX de 2021, quizá de un sistema anterior, muestra `RED` junto a un depósito y por montos que la regla legal no produciría, de modo que no conviene asumir que esa forma de pago contiene sólo redondeo legal. Otra integración, de transferencias, envía a AX una línea de redondeo con signo, lo que sugiere que AX podría aceptar ambos signos (inferencia).
- **POS enterprise:** [D365 Commerce](https://learn.microsoft.com/en-us/dynamics365/commerce/tasks/store-configurations-retail-statements) usa una cuenta Rounding por tienda, con tope de diferencia. [Odoo](https://www.odoo.com/documentation/18.0/applications/sales/point_of_sale/pricing/cash_rounding.html) usa cuentas separadas de ganancia y pérdida. [Toast](https://support.toasttab.com/en/article/Use-Cash-Rounding) lo deja fuera de ventas netas, como cash over/short.
- **Respuesta:** dos cuentas de resultado dedicadas, ganancia y pérdida por redondeo, separadas de ventas y de sobrantes o faltantes de caja. Como las diferencias no se aceptan tributariamente, conviene disponer del bruto de cada signo para conciliar (inferencia). El POS publica un evento inmutable por pago, con signo y sin netear; el adaptador puede agregar, y la suma siempre concilia con el detalle. Usar una sola cuenta con signo sería configuración del adaptador y no cambia el modelo.
- **Queda abierto:** la cuenta vigente, y cómo trata AX `RED`, el exceso positivo y su total a pagar. Esa lógica X++ no está en los repositorios de la organización. Los datos de producción de AX pueden mostrar la cuenta y los asientos; no la decisión.

| Asiento ilustrativo | Caja (debe) | Pérdida (debe) | Venta con IVA (haber) | Ganancia (haber) |
| --- | ---: | ---: | ---: | ---: |
| T=1.005, C=1.000 | 1.000 | 5 | 1.005 | |
| T=1.006, C=1.010 | 1.010 | | 1.006 | 4 |

### QF2 · Cierre con $0 en efectivo

- **Legacy:** no tiene un flujo definido. Con saldo $3 calcula saldo 0 y ajuste −3, pero el formulario rechaza un monto de $0, así que sólo se llega a un neto de $0 digitando un monto y devolviéndolo como vuelto.
- **POS enterprise:** la documentación revisada no trata este caso.
- **Respuesta:** se admite. La venta cierra con `C = 0` y `A = −n`, sin movimiento de caja de $0, mediante una acción explícita y auditada, nunca con un pago de efectivo por `amount = 0`. Con tarjeta ya aprobada, revertir cuesta más que el ajuste, cuyo tope es −$5 por venta, y negar el efectivo tiene riesgo legal. Los reportes alertan estos cierres.
- **Queda abierto:** un asesor debe confirmar la lectura mecánica de la regla bajo $10.

### QF3 · Límite a dividir pagos

- **Legacy:** no hay límite. Sólo cuenta el ajuste de la primera línea de efectivo, y el orden cambia el resultado.
- **POS enterprise:** [Square](https://squareup.com/help/us/en/article/8595-beta-set-up-cash-rounding) redondea sólo la porción en efectivo y documenta que el orden cambia el total.
- **Respuesta:** no se limita. El ajuste tiene tope −$5 por venta y hay una sola asignación de efectivo. Con T=1.009, tarjeta 4 y efectivo 1.005, el cliente paga 1.004 en vez de los 1.010 de pagar todo en efectivo. Se monitorea el patrón y se fija un mínimo no efectivo sólo ante abuso medido.

### QF4 · Devoluciones parciales en efectivo

- **Legacy:** notas de crédito y devoluciones ignoran el redondeo original, y el dinero devuelto no se redondea.
- **POS enterprise:** [Shopify](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/cash-rounding-on-pos) revierte el importe original en devoluciones totales y redondea de nuevo las parciales. [Xstore](https://docs.oracle.com/en/industries/retail/retail-xstore-point-of-service/21.0/rpxug/currency-rounding.htm) devuelve sólo múltiplos de su denominación mínima. Ningún proveedor revisado documenta un tope acumulado.
- **Respuesta:** pago acumulado sobre el nominal devuelto, usando la política congelada de la venta:

  `pagado_k = R(Σ nominal devuelto hasta k) − Σ pagado hasta k−1`

  Como `R` no decrece, lo pagado nunca supera lo cobrado y la devolución total reintegra exactamente `C`. Cada pago es múltiplo del incremento y no negativo. Se comprobó por fuerza bruta con las políticas de Chile, Perú y sin redondeo.

| Venta | Devoluciones nominales | Efectivo devuelto | Total |
| --- | --- | --- | ---: |
| T=1.005, C=1.000 | 335 + 335 + 335 | 330 + 340 + 330 | 1.000 |
| T=1.006, C=1.010 | 503 + 503 | 500 + 510 | 1.010 |
| T=10.005, C=10.000 | 1 + 1 + 1 + 10.002 | 0 + 0 + 0 + 10.000 | 10.000 |

- **Queda abierto:** sin acumular, el primer caso devolvería 990 y el cliente perdería 10; a cambio, acumular se aparta de redondear cada pago por separado, y la norma no resuelve el importe. Debe confirmarlo un asesor. Si el acumulado da $0 y el cliente no volverá, se ofrece un medio exacto.

### QF5 · Medio y tope del reembolso

- **Legacy:** esta pantalla devuelve efectivo, sin seguir el medio original. El tope es el saldo de la nota de crédito y el efectivo en caja, sólo el mismo día del documento. El importe es nominal, no se redondea y no considera el redondeo original.
- **POS enterprise:** Shopify no redondea reembolsos a tarjeta regalo. Ninguna documentación revisada trata devolver a tarjeta una venta pagada en efectivo.
- **Respuesta:** primero el medio original; en ventas mixtas, primero los medios electrónicos y luego el efectivo. Los medios electrónicos van exactos y el efectivo con `R`. El tope por medio es el dinero recibido: `C`, no `N` ni `Rc`. La nota de crédito siempre es nominal. Una venta T=1.005 cobrada 1.000 y reembolsada por transferencia devuelve 1.000, con nota de crédito por 1.005, y revierte el ajuste.
- **Excepción:** devolver en efectivo una venta con tarjeta queda bloqueado por defecto. Con nota de crédito por 1.009 daría 1.010, uno más de lo financiado; por 1.005 daría 1.000, cinco menos de lo pagado.
- **Queda abierto:** si el reembolso por transferencia de ese caso es 1.000 o 1.005 (asesor).

### QF6 · Nota de crédito aplicada a otra venta

- **Legacy:** la nota de crédito vale el nominal, sin campo de redondeo. La respuesta se aparta del legacy para que el saldo refleje el dinero realmente recibido.
- **POS enterprise:** la documentación revisada no lo trata.
- **Respuesta:** el saldo disponible es el menor entre el nominal y lo financiado. Una nota por 1.005 financiada con 1.000 aporta 1.000, sin convertir el ajuste en saldo. Una nota por 1.006 financiada con 1.010 aporta 1.006; los 4 restantes siguen como ajuste de la venta original, para no crear microsaldos que no se pueden pagar en efectivo.

### QF7 · Cobranzas y cuotas

- **Legacy:** cobranzas y abonos reutilizan el mismo formulario y guardan el redondeo por pago. La deuda se reduce por el nominal, sin residuo, y `A` queda en la cabecera; `A < 0` viaja a AX como `RED`.
- **POS enterprise:** no se encontró documentación aplicable a cuentas por cobrar en lo revisado.
- **Respuesta:** la deuda baja por `N` y la caja recibe `C`, con una sola aplicación por pago y nunca por documento: una cobranza de 1.003 + 1.003 cobra 2.010, no 2.000. Una cuota de 335 salda 335 con `C = 330` y `A = −5`. El ERP sigue siendo autoridad de deuda: un saldo final de $3 se extingue sólo con su reconocimiento.
- **Queda abierto:** el tratamiento en cuentas por cobrar de los residuos y el soporte del ajuste positivo en AX.

### QF8 · Anticipos en efectivo

- **Legacy:** un anticipo en efectivo se redondea como cualquier efectivo, sin excepción, y el vuelto puede quedar como anticipo.
- **POS enterprise:** la documentación revisada no lo trata.
- **Respuesta:** se acredita exactamente el dinero recibido, sin ajuste. Un anticipo no tiene aún un monto final de documento sobre el cual redondear, así que el anticipo directo se captura en múltiplos del incremento y el vuelto convertido en anticipo se acredita tal cual. Aplicarlo a una venta es exacto y sólo redondea el resto en efectivo. Devolverlo en efectivo sigue la regla, y una transferencia es exacta. Se aparta del legacy para no acreditar dinero que no ingresó.
- **Queda abierto:** el art. 2° del Decreto 1266 alcanza a todos los pagos en efectivo, por lo que un asesor debe confirmar esta lectura.

### QF9 · USD

- **Legacy:** lo trata como efectivo en pesos. Redondea el equivalente sin dejar rastro en el campo de redondeo, USD 100 a 950,37 acredita 95.040, entrega el vuelto en pesos y no guarda el monto en USD. Por eso los datos no permiten medir estos pagos.
- **POS enterprise:** [SAP POS 2.3](https://help.sap.com/doc/saphelp_pos23/2.3/en-US/21/d5355360a4403889011ae5b484c6f4/content.htm?no_cache=true), un producto antiguo, cubre moneda extranjera con cambio en moneda local.
- **Respuesta:** sigue bloqueado, como exige F02-05. Si se habilita, el USD no redondea, porque el Decreto cubre billetes y monedas emitidos por el Banco Central de Chile (lectura propia), y la regla aplica sólo al efectivo en pesos. El vuelto en pesos de un exceso en USD queda por definir.

### QF10 · Tolerancia y responsabilidad en el arqueo

- **Legacy:** el esperado por forma de pago ya es dinero real y el ajuste no se carga al cajero. Cualquier diferencia descuadra la caja, sin tolerancia, aunque no bloquea el cierre. Las líneas informativas que suman el ajuste a un total ya ajustado son una inconsistencia, no un precedente.
- **POS enterprise:** D365 define topes separados de diferencia por contabilización, turno y transacción, además del de redondeo.
- **Respuesta:** `A` nunca forma parte de la diferencia de arqueo ni es imputable al cajero, porque el esperado es `ΣC`. La tolerancia sobre diferencias reales es un parámetro aparte, con valor inicial 0. Finanzas decide si cambia.

### QF11 · Habilitación sin concepto ERP

- **Legacy:** el POS sigue vendiendo y reintenta cuando AX responde con error. `RED` está fijo en el código para el signo negativo; el positivo no se envía. Qué haría AX sin `RED` no se puede saber desde el código ni desde los datos.
- **POS enterprise:** D365 separa la captura en tienda de la contabilización de sus extractos.
- **Respuesta:** no para el piloto. La regla es obligatoria en Chile, así que QF1 debe resolverse antes de operar efectivo real. Como contingencia acotada, la venta local continúa y el trabajo ERP queda retenido con su motivo. El ajuste nunca se oculta en un descuento o en la línea de efectivo.

### QF12 · Conciliación y renta

- **Legacy:** el documento tributario no cambia, pero sólo hay reportes internos y ninguna conciliación de `RED` entre el POS y AX. El total de redondeo del cierre suma sólo documentos de venta; no cubre cobranzas ni abonos.
- **POS enterprise:** Toast indica que "rounding is not considered a sale". [Peppol BR-CO-16](https://docs.peppol.eu/poacc/billing/3.0/rules/ubl-tc434/BR-CO-16/) separa el redondeo del total con IVA.
- **Respuesta:** un reporte por período y sucursal con `T`, no efectivo, `N`, `C` y ajustes de cada signo, que cumple `T = no efectivo + N` y `cobrado = T + ΣA`, con la suma de documentos igual a `T`.
- **No se puede responder con esta evidencia:** el reflejo en la renta líquida imponible y el régimen tributario aplicable. Requiere Tributario y asesor.

### QF13 · Donaciones

- **Legacy:** no se encontró lógica de donación en el código de frontend y backend revisado.
- **POS enterprise:** Square y Shopify no documentan una función nativa; se resuelve con artículos separados o aplicaciones de terceros, y la evidencia sobre impuestos y consentimiento es débil.
- **Respuesta:** queda fuera del primer corte. Si entra, es una operación aparte, con consentimiento explícito y sin preselección, calculada después de redondear y sin compartir campo ni cuenta con `A`. Si el cliente rechaza, recibe su vuelto completo, el documento no cambia y no se registra donación. Esto se interpreta desde el Código Civil (arts. 1386 y 1393) y la Ley 19.496 (art. 3° a), no desde una norma específica; requiere asesor. Perú exige aceptación expresa al pagar y carteles, y España, opción de inclusión.

## Vectores de aceptación

| Caso | Entrada | Resultado esperado |
| --- | --- | --- |
| Baja | T=1.004, recibe 1.000 | `C=1.000`, `V=0`, `A=−4` |
| Empate | N=1.005 | `C=1.000`; `HALF_UP` daría 1.010 |
| Sube | T=1.006, recibe 1.006 | Rechazo: faltan 4 |
| Vuelto | T=1.005, recibe 2.000 | `V=1.000`, no 995 |
| Mixto | T=1.005: tarjeta 500 + N=505 | `C=500`, `A=−5`; cobrado 1.000 |
| Sin efectivo | Sólo tarjeta, T=1.005 | `A=null`, sin movimiento de caja |
| Dos tramos | Efectivo 1.005 + 1.005, T=2.010 | Rechazo; un solo `N=2.010` |
| Resto bajo | T=1.003: tarjeta 1.000, resto 3 | `C=0`, `A=−3`, sin movimiento (según QF2) |
| Documento | Boleta T=1.005, `C=1.000` | Total fiscal 1.005; IVA sobre el nominal |
| Arqueo | `N=3.923`, `A=−3`, recibe 5.510, vuelto 1.590 | Físico 3.920; no se suma `A` |
| Repetición | Mismo comando tras cambiar la política | Devuelve el ajuste original |
| Perú | S/ 5,99 y S/ 5,96 | S/ 5,90 en ambos |
| España | €12,75, recibe €20 | `C=12,75`, `V=7,25`, `A=null` |

## Entrega

Este ADR no modifica fichas ni avance. La ruta recomendada, a decidir por el coordinador y el mantenedor del roadmap, es:

1. Enmendar F02-05. Según [el procedimiento de avance](https://github.com/developer-implementos/pos-platform/blob/main/delivery/README.md), un paquete que deja de cumplir sus criterios vuelve a `in_progress` con verificación nula, por lo que el avance pasaría de 15/71 a 14/71 hasta reverificar, en la misma revisión que agrega el criterio.
2. Ejecutar en una `TASK-N` hija de F02-05. F01-03 queda afectado en código y pruebas, porque `ConfirmCashSale` usa el mismo cálculo, aunque sus criterios sigan cumpliéndose.
3. Añadir los criterios de cierre, ERP, devoluciones y cobranzas a sus fichas sin iniciar, y los de recibo a F02-10.
4. Mantener las decisiones abiertas en `delivery/follow-ups.json`, publicadas en [Bloqueos y decisiones](/project/attention/), sin inventar responsable ni fecha. Al resolverse, cada seguimiento conserva su evidencia y este ADR se actualiza con la decisión.

Una unidad nueva como `F02-15` también es viable, pero fragmenta algo que el inventario ya pedía como P02. P02 no se marca como parcial: `audit-chile-for-product.md` es un inventario sin columna de estado, y basta enlazarlo con F02-05 y la tarea.

## Riesgos y reversión

- **Reversión:** apagar la política en un país detiene los cálculos nuevos, pero en Chile deja de cumplir la norma; es una medida de emergencia. Los datos son aditivos y las ventas confirmadas conservan su ajuste. Un binario anterior no lee eventos v3, de modo que volver atrás después de escribirlos no es compatible.
- **Experiencia en caja:** el total a pagar cambia al elegir efectivo, por lo que debe mostrarse antes de cobrar. T=6 cobra 10.
- **Conciliación:** el total de documentos y el dinero cobrado difieren de forma legítima en `ΣA`. Los reportes y los consumidores deben usar la definición correcta de cada cifra.
- **Sobrevalorar el legacy:** adoptar su comportamiento como requisito de paridad reintroduciría la dependencia del orden y la doble aplicación en sus totales informativos.

## Límites de la evidencia

Se leyeron en su texto la Ley 20.956, el Decreto 1266 y la Circular 44/2017. No se revisó la Circular 31/2021 del SII, que modificó la Circular 44, y las búsquedas en sitios del SII y del Congreso fueron limitadas. No se encontró pronunciamiento de SERNAC ni fallo específico, lo que no prueba que no existan. Parte de las fuentes de Perú, España y proveedores se leyó como extracto o por fuentes secundarias. Las trazas del legacy provienen de leer el código; su despliegue real y sus datos no se examinaron. El acceso de lectura a producción, sobre todo a AX, puede confirmar hechos como la cuenta de `RED` y medir frecuencias; los datos de QA sirven casi sólo para probar consultas y configuración. Ningún dato decide políticas, lecturas legales ni ramas de X++ que no se hayan ejercido.

Antes de aprobar, conviene consultar a un asesor o al SII sobre: campos e impreso del documento, importe de los reembolsos, total terminado en 0 con una porción en efectivo que no, montos bajo $10, reflejo en renta y donaciones.

## Fuentes

- **Norma:** [Ley 20.956](https://www.leychile.cl/Consulta/obtxml?opt=7&idLey=20956), [Decreto 1266](https://www.bcn.cl/leychile/navegar?idNorma=1111243), [Circular 44/2017 del SII](https://www.sii.cl/normativa_legislacion/circulares/2017/circu44.pdf), [regla de redondeo del Banco Central de Chile](https://www.billetesymonedas.cl/Monedas/ReglaRedondeo).
- **Producto, en `pos-platform@aa373b2`:** `libs/backend/sales/src/domain/cash-settlement.ts`, `libs/backend/sales/src/domain/paid-settlement.ts`, `libs/backend/payments/src/infrastructure/payment-plan-migrations.ts`, `delivery/specs/F02-05.md`, `delivery/README.md`.
- **Legacy, repositorios privados:** `mountain-implementos@f57d590`, en `frontend/src/app/shared/components/formas-de-pago/efectivo/efectivo.component.ts` y `frontend/src/app/services/punto-de-venta.service.ts`; `mountain-sync-sucursal@540ab9a`, en `app/Services/SyncUpload/PagoFacturaSyncUploadService.js`.
- **Otros proveedores:** [Shopify, API de redondeo](https://shopify.dev/changelog/new-cash-rounding-on-order-and-order-transaction), además de los enlazados en cada respuesta.
