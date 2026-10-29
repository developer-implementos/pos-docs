# Roadmap de POS Platform

POS Platform parte de una demostración de interfaz y una base técnica de APIs y workers. El trabajo de entrega consiste en convertir esa base en recorridos completos y comprobables: persistir una venta, cobrar y emitir su documento, integrar una sucursal y conciliar una jornada, hasta probar la operación en tienda y su adaptación a otros países.

La arquitectura objetivo incluye `device-agent` en C#/.NET Windows, todavía sin implementación. F02 incorpora host, protocolo con `branch-api`, SQLite técnico y la primera impresión homologada; F05 comprueba entrega/recuperación y F06 el acceso móvil. El [ADR-17](decisions/device-agent.md) fija responsabilidades y criterios.

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

Las [observaciones trazables de las fuentes](/guide/evidence/country-comparison/#observaciones-trazables-de-las-fuentes) conservan el caso informado, lo que requiere validación y el documento de origen. La relación anterior «Trazabilidad de las fuentes» conecta sus IDs con decisiones, paquetes, pruebas y evidencia de cierre sin mantener otra tabla de asignación por país.

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
