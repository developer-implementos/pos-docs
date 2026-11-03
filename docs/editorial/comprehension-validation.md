# Revisión de comprensión de los recorridos

**Estado: protocolo disponible; sesiones y resultados humanos pendientes.** La revisión comprueba si otra persona puede localizar una operación, explicar sus límites y ubicar el cambio en el producto. Sus resultados complementan las pruebas automáticas y se registran aparte de la verificación técnica del roadmap.

## Revisión breve de un cambio

Para un equipo de cuatro desarrolladores, una persona distinta de quien dirigió la implementación revisa el recorrido afectado. Reservar aproximadamente diez minutos por cambio significativo de contratos, datos o comportamiento. El agente puede preparar los enlaces y la evidencia; la persona revisora registra lo que pudo comprobar y la duda que sigue abierta.

1. Partir del issue y abrir su [recorrido de operación](/guide/flows/). Identificar el resultado esperado y la revisión de producto/documentación.
2. Seguir el camino normal y un fallo relevante. Explicar qué quedó persistido y qué efecto todavía se desconoce.
3. Localizar el contrato o contexto donde se implementa el cambio y una prueba que protege su garantía principal.

Si hace falta una explicación que no está en las fuentes, registrar esa ausencia como trabajo editorial en el mismo issue. Si se descubre una duda de comportamiento, tratarla en el PR del producto; cambiar el dibujo no corrige la implementación.

Para la incorporación inicial de Archify, revisar [aplicaciones](/explore/applications/), [venta y recuperación](/guide/flows/sale/) y [publicación de precios](/guide/flows/pricing/). Evaluar si permiten seguir el flujo y reconocer qué sigue propuesto. No se mide la calidad por el número de diagramas publicados.

## Preparación y recorrido

Invitar al menos a dos integrantes que no hayan redactado la propuesta y a un referente de producto o arquitectura que contraste las respuestas. Registrar revisión de POS Docs y del producto consultadas, rol y experiencia del participante, sin publicar nombres ni grabaciones sin autorización. La persona puede usar búsqueda, glosario y diagramas: se evalúa la documentación disponible, no la memoria.

La revisión amplia usa [recorridos de operación](/guide/flows/) y [mapa de aplicaciones](/guide/diagrams/). El contrato de [publicación de maestros](/guide/architecture/master-data-publication/) y el de [identidad](/guide/architecture/identity/) se consultan para las tareas correspondientes. El facilitador no adelanta las respuestas; anota el camino seguido, la página usada y cualquier contradicción o término que impida continuar.

## Tareas y criterio observable

| ID | Tarea de lectura | Evidencia de comprensión |
| --- | --- | --- |
| COMP-01 | Seguir una venta y una respuesta ERP perdida en el mapa | Identifica commit en sucursal, custodia de país y efecto ERP como estados distintos; no propone cobrar o contabilizar de nuevo sólo por falta de respuesta |
| COMP-02 | Ubicar dónde implementar F03-02 | Nombra extracción/preparación en `erp-worker`, autoridad/publicación en `country-api` y activación local; explica el origen autorizado y qué falta homologar |
| COMP-03 | Explicar qué sucede al perder Internet y después perder LAN | Distingue continuidad WAN de autonomía por puesto, y los permisos offline de una sesión central ilimitada |
| COMP-04 | Determinar si una capacidad está implementada | Usa la revisión del producto y el alcance de la página; no interpreta un scaffold, diagrama o fase propuesta como funcionamiento productivo |
| COMP-05 | Rastrear el caso de correlativos repetidos de Perú | Llega a OBS-PE-02, sus decisiones, paquetes y pruebas; distingue la observación recibida de una garantía del adaptador |
| COMP-06 | Elegir evidencia para verificar un entregable | Identifica versión, ámbito, entorno, resultado y criterios cubiertos; distingue verificación técnica, aceptación humana y habilitación operativa |

Cada respuesta se registra como **independiente**, **con ayuda** o **no resuelta**, junto con la explicación aportada y el enlace que la sustenta. Los errores sobre dinero, autoridad de datos, alcance offline o estado implementado son bloqueantes para declarar clara esa parte de la guía; una valoración promedio no los oculta. Los demás problemas se priorizan según su impacto y repetición. El objetivo propuesto es resolver las seis tareas sin explicación adicional del autor; el equipo debe acordar el criterio antes de registrar la aceptación.

## Registro y seguimiento

Mantener por sesión: identificador, fecha, revisiones, tareas realizadas, resultado por tarea, página/confusión observada y acción editorial asignada. No completar resultados estimados. Tras corregir un problema, repetir la tarea con otra persona o un escenario equivalente para reducir el efecto de memorizar la explicación. Conservar la evidencia interna autorizada y publicar sólo conclusiones agregadas.

Para la revisión breve, el comentario del PR puede usar este formato, completado únicamente después de la revisión:

```text
Recorrido y revisiones consultadas:
Resultado del camino normal y del fallo:
Contrato/contexto y prueba localizados:
Duda pendiente y issue de seguimiento:
Persona revisora y fecha:
```

Si no hubo revisión humana, registrar «revisión humana pendiente». La aprobación de un agente o de CI conserva su identidad técnica y no completa los campos de persona revisora.

| Sesión | Revisión | Participantes | Resultado | Evidencia |
| --- | --- | --- | --- | --- |
| Por programar | Se registra al ejecutar | Por invitar | Pendiente | Ninguna sesión acreditada |

La [auditoría documental](/guide/reference/documentation-audit/) registra los controles técnicos; este protocolo complementa esos controles con evidencia humana. Publicar el protocolo no acredita que las sesiones se hayan realizado.
