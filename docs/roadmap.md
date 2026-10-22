# Roadmap de POS Platform

POS Platform parte de una demostración de interfaz y una base técnica de APIs y workers. El trabajo de entrega consiste en convertir esa base en recorridos completos y comprobables: persistir una venta, cobrar y emitir su documento, integrar una sucursal y conciliar una jornada, hasta probar la operación en tienda y su adaptación a otros países.

Cada fase tiene una página con **condiciones de entrada, entregables por aplicación y módulo, tareas, pruebas de aceptación y evidencia de cierre**. Esta visión general conecta esos planes y sus dependencias. El avance se decide por resultados verificados; las fechas y la capacidad del equipo deben acordarse antes de estimar el calendario.

<!-- roadmap:board -->

## Relación con los otros planes

Esta secuencia es la referencia compartida por Starlight y [la presentación de arquitectura](/presentations/architecture/). Los títulos, resultados y criterios de las seis fases proceden de `docs/roadmap.json`; las dos vistas se generan desde ese archivo. La fecha de revisión identifica esta propuesta editorial y no una entrega de producto.

La [base técnica y los recorridos de demostración](implementation-plan.md) describen las aplicaciones disponibles, la interfaz con datos sintéticos y los controles del monorepo. El roadmap define el trabajo pendiente y la aceptación funcional; disponer de esa base no completa ninguna fase.

La [validación de la entrega](validacion-y-decisiones.md#etapas-de-entrega) agrupa las condiciones de descubrimiento, prueba vertical, piloto y despliegue. La [migración al ERP común](propuesta-arquitectura.md#coexistencia-y-corte-de-erp) mantiene su propio programa: el piloto POS no acredita que un nuevo ERP esté listo ni requiere automáticamente sustituir el actual.

Las dependencias de las fases expresan el orden de aceptación del recorrido. La preparación de contratos, accesos, datos de prueba y dispositivos puede avanzar en paralelo desde el primer incremento. El alcance inicial de Chile y escritorio sigue siendo una hipótesis de priorización; producto y operaciones deben confirmar país, tienda, canal y proveedores.

## Evidencia para aceptar un incremento

La [evidencia del producto](product-repository.md) distingue lo implementado de la demostración. Para aceptar una fase se necesita un recorrido integrado con el alcance acordado; la presencia de carpetas, interfaces, pantallas o sondas no demuestra ese comportamiento.

Cada revisión debe registrar:

1. **Alcance probado:** país, sociedad, tienda, canal, operaciones, proveedor y configuración relevantes; separar simulador, sandbox y operación real.
2. **Resultado reproducible:** versión del producto, datos de prueba, escenario, resultado esperado y evidencia de ejecución. Incluir recuperación y errores, además del caso exitoso.
3. **Condiciones de aceptación:** criterios satisfechos, diferencias, defectos y dependencias pendientes, con responsables para resolverlos. La aprobación de una configuración no se extiende automáticamente a las demás.
4. **Habilitación operativa:** antes del piloto, identidad y permisos reales, modalidades fiscales y de pago autorizadas, protección de datos, soporte, carga y recuperación verificados para el alcance elegido.

Los [escenarios de validación](validacion-y-decisiones.md#escenarios-de-aceptación) especifican las pruebas propuestas. La [solicitud de información](solicitud-informacion-equipo.md) identifica decisiones, responsables sugeridos y evidencias pendientes. La estimación de esfuerzo y fechas requiere resolver las dependencias y conocer la capacidad del equipo.

## Casos por país que deben concretarse

Las reuniones y cuestionarios aportan escenarios para delimitar y probar las fases. Describen lo comunicado durante el levantamiento; sus afirmaciones no equivalen a requisitos aprobados, contratos técnicos comprobados ni validación normativa. La [síntesis por país](meeting-sources/country-comparison.md) conserva su procedencia y diferencias entre fuentes.

| País y caso informado | Qué debe precisarse antes de habilitarlo | Fases relacionadas | Fuente |
| --- | --- | --- | --- |
| **Chile: operación local e integración con AX.** Hay evidencia del ecosistema existente y una síntesis recibida de su operación. | Confirmar versiones desplegadas, autoridad de datos, pago/documento/registro ERP y comportamiento ante caída de Internet, LAN, servidor y ERP por separado. Contrastar el inventario de tiendas y cajas con los equipos que participarán en las pruebas. | [F3](#phase-03), [F5](#phase-05) | [Evidencia del código chileno](audit-chile-for-product.md) y [síntesis recibida](meeting-sources/country-comparison.md). |
| **Perú: venta desde ICS, precios de SIGE y operación en soles y dólares.** Se describen notas de venta y venta directa; el cuestionario informa que actualmente no usan promociones ni cupones. | Confirmar interfaces, autoridad y vigencia de precios, monedas permitidas por operación y tratamiento del cambio. Delimitar edición de notas de venta antes del cobro/facturación y definir restricciones y compensaciones posteriores. El alcance de promociones del producto sigue siendo una decisión de negocio. | [F1](#phase-01), [F3](#phase-03), [F6](#phase-06) | [Primera reunión](../materials/meetings/peru/first-meeting-2026-10-09.docx), [segunda reunión](../materials/meetings/peru/second-meeting-2026-10-13.docx) y [cuestionario](../materials/meetings/peru/requirements-questionnaire.docx). |
| **Perú: concurrencia y documentos incompletos o repetidos en ICS.** Las notas reportan conflictos de correlativos y reemisión después de fallos. | Reproducir los casos con TI de Perú y acordar identidad, consulta, unicidad y transacción en el destino. Probar generación simultánea y recuperación después de una respuesta perdida. La outbox del POS por sí sola no corrige esas garantías en ICS. | [F3](#phase-03), [F6](#phase-06) | [Segunda reunión, problemas sistémicos y operación multiusuario](../materials/meetings/peru/second-meeting-2026-10-13.docx). |
| **Perú: EFACT, Niubiz/POS, Yape, conciliación de transferencias y notas de crédito.** Se informa conciliación automática cuando el depósito coincide con la factura o nota de venta; almacén y jefatura intervienen antes de que caja emita la NC. | Confirmar capacidades de proveedores, autoridad de conciliación y tratamiento de parciales, excedentes y saldos a favor. Conservar las aprobaciones y evitar doble aplicación del pago o saldo. Acordar si caja chica entra al alcance. Starlink o Internet móvil son respaldos de conectividad, sin demostrar venta autónoma cuando ICS está indisponible. | [F2](#phase-02), [F3](#phase-03), [F4](#phase-04) | [Cuestionario](../materials/meetings/peru/requirements-questionnaire.docx) y [segunda reunión, conciliación y notas de crédito](../materials/meetings/peru/second-meeting-2026-10-13.docx). |
| **España: GIRA, efectivo mediante CashKeeper y pagos con proveedores locales.** Las fuentes señalan incidencias del servidor y del equipo de efectivo; el cuestionario amplía los medios de pago descritos en las reuniones. | Confirmar contratos, dispositivos y consulta del resultado después de fallos; distinguir la confirmación del software del movimiento físico de efectivo. Delimitar documentos, permisos y conciliación para cada medio habilitado. Verificar por separado los escenarios de pérdida de conectividad y de indisponibilidad del ERP. | [F2](#phase-02), [F3](#phase-03), [F4](#phase-04), [F6](#phase-06) | [Primera reunión](../materials/meetings/spain/first-meeting-alberto.docx), [segunda reunión](../materials/meetings/spain/second-meeting-alberto.docx) y [cuestionario](../materials/meetings/spain/requirements-questionnaire.docx). |

Los casos de Perú y España informan el diseño de contratos y las pruebas desde el inicio, aunque su habilitación comercial ocurra después del primer piloto. El orden de países y la selección de proveedores se acuerdan con los equipos responsables. Las tasas, umbrales y referencias fiscales recibidas se contrastan en la [validación fiscal por país](propuesta-arquitectura.md#fiscalidad-y-documentos-por-país).

## F01 · Venta persistida

<!-- roadmap:phase-01 -->

## F02 · Cobro y documento

<!-- roadmap:phase-02 -->

## F03 · Sucursal conectada

<!-- roadmap:phase-03 -->

## F04 · Jornada de tienda

<!-- roadmap:phase-04 -->

## F05 · Piloto controlado

<!-- roadmap:phase-05 -->

## F06 · Expansión validada

<!-- roadmap:phase-06 -->
