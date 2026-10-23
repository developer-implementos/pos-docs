# Validación de comprensión de la propuesta

**Estado: protocolo propuesto; sesiones y resultados humanos pendientes.** Una compilación, un enlace correcto o una revisión automatizada no prueban que el equipo comprenda la arquitectura. Esta validación comprueba si la documentación permite tomar las decisiones de trabajo que necesita un desarrollador junior; no es una clase ni una evaluación de desempeño individual.

## Preparación y recorrido

Invitar al menos a dos integrantes que no hayan redactado la propuesta y a un referente de producto o arquitectura que contraste las respuestas. Registrar revisión de POS Docs y del producto consultadas, rol y experiencia del participante, sin publicar nombres ni grabaciones sin autorización. La persona puede usar búsqueda, glosario y diagramas: se evalúa la documentación disponible, no la memoria.

El recorrido inicial es [visión general](/guide/overview/) → [mapa y componentes](/guide/diagrams/) → [F01](/guide/roadmap/phase-01/). El contrato de [publicación de maestros](/guide/architecture/master-data-publication/) y el de [identidad](/guide/architecture/identity/) se consultan para las tareas correspondientes. El facilitador no adelanta las respuestas; anota el camino seguido, la página usada y cualquier contradicción o término que impida continuar.

## Tareas y criterio observable

| ID | Tarea de lectura | Evidencia de comprensión |
| --- | --- | --- |
| COMP-01 | Seguir una venta y una respuesta ERP perdida en el mapa | Identifica commit en sucursal, custodia de país y efecto ERP como estados distintos; no propone cobrar o contabilizar de nuevo sólo por falta de respuesta |
| COMP-02 | Ubicar dónde implementar F03-02 | Nombra extracción/preparación en `erp-worker`, autoridad/publicación en `country-api` y activación local; explica el origen autorizado y qué falta homologar |
| COMP-03 | Explicar qué sucede al perder Internet y después perder LAN | Distingue continuidad WAN de autonomía por puesto, y los permisos offline de una sesión central ilimitada |
| COMP-04 | Determinar si una capacidad está implementada | Usa la revisión del producto y el alcance de la página; no interpreta un scaffold, diagrama o fase propuesta como funcionamiento productivo |
| COMP-05 | Rastrear el caso de correlativos repetidos de Perú | Llega a OBS-PE-02, sus decisiones, paquetes y pruebas; distingue la observación recibida de una garantía del adaptador |
| COMP-06 | Elegir evidencia para cerrar una fase | Identifica versión, ámbito, entorno, resultado y aprobación pendiente; no usa sólo un build o una captura de la interfaz |

Cada respuesta se registra como **independiente**, **con ayuda** o **no resuelta**, junto con la explicación aportada y el enlace que la sustenta. Los errores sobre dinero, autoridad de datos, alcance offline o estado implementado son bloqueantes para declarar clara esa parte de la guía; una valoración promedio no los oculta. Los demás problemas se priorizan según su impacto y repetición. El objetivo propuesto es resolver las seis tareas sin explicación adicional del autor; el equipo debe acordar el criterio antes de registrar la aceptación.

## Registro y seguimiento

Mantener por sesión: identificador, fecha, revisiones, tareas realizadas, resultado por tarea, página/confusión observada y acción editorial asignada. No completar resultados estimados. Tras corregir un problema, repetir la tarea con otra persona o un escenario equivalente para reducir el efecto de memorizar la explicación. Conservar la evidencia interna autorizada y publicar sólo conclusiones agregadas.

| Sesión | Revisión | Participantes | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| Por programar | Se registra al ejecutar | Por invitar | Pendiente | Ninguna sesión acreditada |

La [auditoría documental](/guide/reference/documentation-audit/) registra los controles técnicos; este protocolo complementa esos controles con evidencia humana. Publicar el protocolo no acredita que las sesiones se hayan realizado.
