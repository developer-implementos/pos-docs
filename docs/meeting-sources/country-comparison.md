# Resumen comparativo de la operación de caja por país

Esta página conserva la **síntesis comparativa aportada por el equipo** sobre Chile, Perú y España. La tabla siguiente transcribe el resumen compartido y permite leerlo, buscarlo y enlazarlo; la imagen original se conserva al final. Se incorporó al portal el **21 de octubre de 2026**. La imagen no identifica la fecha de elaboración del resumen ni una reunión concreta.

El contenido describe lo comunicado durante el levantamiento. **No es la arquitectura propuesta, un catálogo de requisitos aprobados ni una comprobación del estado actual de producción.** Las cifras, proveedores, medios de pago y referencias fiscales mantienen el alcance de la síntesis recibida.

## Cómo se organiza la información

| Categoría | Qué contiene | Dónde consultarla |
| --- | --- | --- |
| **Fuentes originales** | Documentos recibidos: registros de reuniones, cuestionarios con respuestas y pendientes, y antecedentes. Se conservan sin modificar sus bytes. | [Fuentes de reuniones del portal](/#materials). |
| **Síntesis** | Comparaciones o resúmenes que organizan información aportada. Conservan su origen y señalan diferencias que requieren contraste. | Esta página y su imagen original. |
| **Propuestas** | Diseño objetivo, alternativas de solución y roadmap elaborados por el equipo. | [Arquitectura y roadmap](/presentations/architecture/) y [propuesta del producto](/guide/proposal/product/). |
| **Decisiones** | Acuerdos y alternativas con el estado indicado en su registro. La existencia de un documento no equivale a su aprobación. | [Registro de decisiones](/guide/proposal/decisions/). |

El formato no determina la categoría: un PowerPoint puede ser una fuente recibida o una propuesta. La presentación Reveal.js **Arquitectura y roadmap de POS Platform** pertenece a **Propuestas**.

## Comparación aportada

Transcripción de la imagen recibida; se han normalizado mayúsculas, espacios y saltos de línea para facilitar la lectura. Las afirmaciones de esta tabla se atribuyen a esa síntesis, sin convertirlas en reglas corporativas o legales validadas.

| Característica | Chile (referencia) | Perú | España |
| --- | --- | --- | --- |
| **Tiendas y cajas** | 33 sucursales. | 13 tiendas y 14 cajas operativas (3 en proceso de apertura). | 3 tiendas y 2 cajas por tienda. |
| **Sistema de caja** | Desarrollo propio local (Angular y AdonisJS). | Integrado directamente en su desarrollo interno (ICS). | Proveedor externo (GIRA) complementado con CashKeeper para efectivo. |
| **ERP e integración** | ERP AX. La caja usa base de datos local y sincroniza después vía bus WSO2. | ERP ICS. La caja registra la venta directo en el ERP al instante. | ERP GIRA. La caja registra la venta directo en el ERP al instante. |
| **Documentos emitidos** | Boleta (cliente genérico) y factura (exigida sobre $5.000.000). | Boleta, factura y nota de crédito. | Facturas, facturas rectificativas, facturas simplificadas (ticket), albaranes de crédito y presupuestos. |
| **Normativa y proveedor DTE** | Facturación electrónica con Acepta o Ingydev. IVA 19% en pesos chilenos. | SUNAT. Proveedor: EFACT. IGV 18% en soles y dólares. | Verifactur. Proveedor: GIRA. Aplican IVA y ecotasas en euros. |
| **Identificación de cliente** | Clientes con cuenta corriente y cliente genérico para ventas anónimas. | RUC (11 dígitos) o DNI (8 dígitos). Genérico: 99999999. | CIF, NIF o intracomunitario. Tienen cliente genérico para ticket simplificado. |
| **Medios de pago** | Efectivo, tarjeta (Transbank), cheque verificado, transferencia, crédito, nota de crédito. | Efectivo, tarjeta (Niubiz/POS), transferencia, crédito, Yape. | Efectivo (automatizado con CashKeeper), tarjeta (BBVA/Redsys portátiles), Bizum, transferencia, cheque. |
| **Continuidad ante caídas** | Sigue vendiendo con base local y kit de emergencia para Internet. | Cuenta con venta manual, respaldo por Starlink o Internet móvil. | No puede vender si se cae Internet o el ERP. Se recurre a venta manual. |
| **Principales dificultades** | No especificado. | Problemas de concurrencia multiusuario en el ERP y lentitud de base de datos. | Caídas del servidor GIRA, fallos en máquina CashKeeper y lentitud al verificar transferencias. |

## Documentos relacionados

Los Word se publican como originales recibidos, sin corregir ni completar sus respuestas. Los siguientes documentos acompañan al resumen; no se ha acreditado que cada celda de la imagen proceda de un documento específico.

- **Chile:** [Ecosistema de Caja Mountain](/docs/referencias/Ecosistema%20de%20Caja%20Mountain%204.pptx), antecedente recibido.
- **Perú:** [primera reunión, 9 de octubre de 2026](/materials/meetings/peru/first-meeting-2026-10-09.docx), [segunda reunión, 13 de octubre de 2026](/materials/meetings/peru/second-meeting-2026-10-13.docx) y [cuestionario de requerimientos](/materials/meetings/peru/requirements-questionnaire.docx).
- **España:** [primera reunión con Alberto](/materials/meetings/spain/first-meeting-alberto.docx), [segunda reunión con Alberto](/materials/meetings/spain/second-meeting-alberto.docx) y [cuestionario de requerimientos](/materials/meetings/spain/requirements-questionnaire.docx).

Las fechas de las reuniones de Perú se toman de los nombres de los archivos entregados. Las reuniones de España no incluyen una fecha verificable. Los cuestionarios contienen respuestas y pendientes: su fecha de plantilla no se utiliza como fecha de respuesta. En el cuestionario de España aparece «16/10/2026» bajo otra columna, con «Fecha de respuesta» vacía; por eso el catálogo no la asigna como fecha del documento.

## Diferencias que conviene conservar visibles

- **Proveedores de Perú:** la primera reunión escribe «EFAC» y «Newbis», mientras el cuestionario utiliza «EFACT» y «Niubiz». La tabla mantiene las grafías del resumen recibido. Los archivos originales permiten contrastarlas.
- **Notas de crédito en Perú:** la primera reunión describe a caja como gestora del proceso; la segunda detalla la validación de almacén, la aprobación de jefatura y la emisión final por caja. Se conservan ambas revisiones para leer el detalle posterior en su contexto.
- **Pagos en España:** las notas destacan tarjeta y efectivo; el cuestionario añade Bizum, transferencias y cheques. La síntesis incluye estos medios sin reducir la operación a los dos primeros.
- **Reglas fiscales:** el umbral de facturación mencionado para Chile, las tasas y las referencias a proveedores y normativa son afirmaciones de las fuentes. Su vigencia y aplicación se deben confirmar en la [validación fiscal de la propuesta](/guide/proposal/fiscal-compliance/).

## Observaciones trazables de las fuentes

Estos IDs identifican afirmaciones recibidas y su contexto. No representan requisitos aprobados ni resultados de pruebas. El [roadmap](/guide/proposal/roadmap/#trazabilidad-de-las-fuentes) conserva una sola relación entre observación, decisiones, paquetes, escenarios y evidencia de cierre.

| ID | Observación informada | Qué requiere validación | Fuente para contrastar |
| --- | --- | --- | --- |
| <span id="obs-cl-01"></span>OBS-CL-01 | **Chile: operación local e integración con AX.** Hay evidencia del ecosistema existente y una síntesis recibida de su operación. | Confirmar versiones desplegadas, autoridad de datos, pago/documento/registro ERP y comportamiento ante caída de Internet, LAN, servidor y ERP por separado. Contrastar el inventario de tiendas y cajas con los equipos que participarán en las pruebas. | [Evidencia del código chileno](../audit-chile-for-product.md) y [síntesis recibida](#imagen-original-del-resumen). |
| <span id="obs-pe-01"></span>OBS-PE-01 | **Perú: venta desde ICS, precios de SIGE y operación en soles y dólares.** Se describen notas de venta y venta directa; el cuestionario informa que actualmente no usan promociones ni cupones. | Confirmar interfaces, autoridad y vigencia de precios, monedas permitidas por operación y tratamiento del cambio. Delimitar edición de notas de venta antes del cobro/facturación y definir restricciones y compensaciones posteriores. El alcance de promociones del producto sigue siendo una decisión de negocio. | [Primera reunión](/materials/meetings/peru/first-meeting-2026-10-09.docx), [segunda reunión](/materials/meetings/peru/second-meeting-2026-10-13.docx) y [cuestionario](/materials/meetings/peru/requirements-questionnaire.docx). |
| <span id="obs-pe-02"></span>OBS-PE-02 | **Perú: concurrencia y documentos incompletos o repetidos en ICS.** Las notas reportan conflictos de correlativos y reemisión después de fallos. | Reproducir los casos con TI de Perú y acordar identidad, consulta, unicidad y transacción en el destino. Probar generación simultánea y recuperación después de una respuesta perdida. La outbox del POS por sí sola no corrige esas garantías en ICS. | [Segunda reunión, problemas sistémicos y operación multiusuario](/materials/meetings/peru/second-meeting-2026-10-13.docx). |
| <span id="obs-pe-03"></span>OBS-PE-03 | **Perú: EFACT, Niubiz/POS, Yape, conciliación de transferencias y notas de crédito.** Se informa conciliación automática cuando el depósito coincide con la factura o nota de venta; almacén y jefatura intervienen antes de que caja emita la NC. | Confirmar capacidades de proveedores, autoridad de conciliación y tratamiento de parciales, excedentes y saldos a favor. Conservar las aprobaciones y evitar doble aplicación del pago o saldo. Acordar si caja chica entra al alcance. Starlink o Internet móvil son respaldos de conectividad, sin demostrar venta autónoma cuando ICS está indisponible. | [Cuestionario](/materials/meetings/peru/requirements-questionnaire.docx) y [segunda reunión, conciliación y notas de crédito](/materials/meetings/peru/second-meeting-2026-10-13.docx). |
| <span id="obs-es-01"></span>OBS-ES-01 | **España: GIRA, efectivo mediante CashKeeper y pagos con proveedores locales.** Las fuentes señalan incidencias del servidor y del equipo de efectivo; el cuestionario amplía los medios de pago descritos en las reuniones. | Confirmar contratos, dispositivos y consulta del resultado después de fallos; distinguir la confirmación del software del movimiento físico de efectivo. Delimitar documentos, permisos y conciliación para cada medio habilitado. Verificar por separado los escenarios de pérdida de conectividad y de indisponibilidad del ERP. | [Primera reunión](/materials/meetings/spain/first-meeting-alberto.docx), [segunda reunión](/materials/meetings/spain/second-meeting-alberto.docx) y [cuestionario](/materials/meetings/spain/requirements-questionnaire.docx). |

## Imagen original del resumen

[Abrir o descargar la imagen recibida](/docs/meeting-sources/assets/country-comparison-provided.png).

![Resumen comparativo aportado con nueve características de la operación de caja en Chile, Perú y España. El contenido completo se transcribe en la tabla anterior.](/docs/meeting-sources/assets/country-comparison-provided.png)
