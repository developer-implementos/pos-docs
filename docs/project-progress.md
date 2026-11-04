# Seguimiento del avance

El [resumen del proyecto](/project/) presenta el avance técnico y la aceptación manual, con distribución por fase y aplicación. [Próximo incremento](/project/plan/) presenta trabajo acotado y su preparación. [Entregables](/project/work/) permite consultar qué falta, su ejecución, asignación y evidencia. [Bloqueos y decisiones](/project/attention/) explica qué acceso o información se necesita, quién impulsa la acción y qué permite resolverla. [Equipo](/project/team/) reúne las asignaciones de desarrollo y los responsables de seguimiento. Las vistas se generan desde los mismos registros revisados; no se editan porcentajes ni listas de tareas en páginas independientes.

Los indicadores enlazan al detalle filtrado. Los filtros se guardan en la URL y los enlaces permanentes identifican cada entregable o acción; pueden compartirse y recorrerse con Atrás y Adelante. Sin JavaScript, permanecen disponibles los registros, sus enlaces y la navegación entre vistas. La portada conserva un acceso breve y los catálogos completos se consultan en [presentaciones](/presentations/) y [fuentes](/materials/).

## Dónde se mantiene cada dato

| Información | Fuente responsable |
| --- | --- |
| Alcance y criterios del entregable | Roadmap y fichas del producto. |
| Orden del próximo incremento, tipo de trabajo, alcance y condiciones | `delivery/planning.json` en POS Platform; las identidades se vinculan con `delivery/planning-issues.json`. |
| Estado de ejecución, desarrollador asignado y conversación | GitHub Issues de POS Platform. |
| Verificación técnica, evidencia y aceptación manual | `delivery/progress.json` en POS Platform. |
| Accesos, preguntas, decisiones y condiciones pendientes | `delivery/follow-ups.json` en POS Platform. |
| Publicación | Snapshots revisados en POS Docs; sin consultar GitHub desde el navegador. |

Un seguimiento describe una acción concreta que requiere información, acceso, decisión o validación. Enlaza los entregables afectados; no reemplaza sus tareas de desarrollo. El **responsable de seguimiento** impulsa la acción; **información de** identifica la contraparte necesaria. No son equivalentes al desarrollador asignado en GitHub. Si no se acordó responsable, se muestra **Por asignar**.

Cada acción distingue si afecta la verificación técnica, la habilitación operativa o una revisión del equipo. Una fase futura pendiente no constituye un bloqueo actual. Un contrato de proveedor sin validar puede impedir completar su adaptador sin detener el resto del software. La fecha del seguimiento, la revisión técnica y la consulta a GitHub se muestran separadas.

Para resolver una acción se registra explicación, fecha y evidencia. Las preguntas se concretan con el contacto apropiado; nunca se solicita publicar contraseñas, direcciones internas ni datos comerciales. La evidencia técnica y las conversaciones privadas se enlazan, no se copian automáticamente al portal público.


## Cómo se prepara el próximo incremento

Los entregables del roadmap son compromisos de alcance de cada fase. Su obligatoriedad no determina qué debe tomar un desarrollador primero. El plan del próximo incremento establece un orden por dependencias, riesgo y valor, con una razón explícita por unidad. P0 se reserva para urgencias críticas; P1 identifica el siguiente incremento y P2 el trabajo posterior. No se asignan fechas ni estimaciones a partir del orden.

El trabajo puede ser historia, error, tarea técnica, investigación o mantenimiento. Cada unidad enlaza un entregable padre y conserva resultado, límites, condiciones de entrada, criterios, pruebas y evidencia esperada. Una investigación añade la pregunta y un límite de exploración: su resultado puede ser una decisión documentada o un impedimento concreto; no exige simular funcionalidad terminada. Las fases lejanas conservan sus entregables generales hasta contar con contratos y decisiones suficientes.

El responsable humano y el estado de ejecución proceden de GitHub. Una ficha detallada no está automáticamente lista: el panel exige una persona asignada, una sola etiqueta `status:ready` y dependencias cerradas con motivo `completed`. Cierres `not_planned`, sin motivo, o dependencias abiertas no satisfacen esa condición. El responsable debe comprobar las condiciones de entrada antes de iniciar; el panel no puede verificar por una etiqueta que se recibió un contrato o un permiso real.

Los seguimientos relacionados conservan su fuente y sus condiciones de resolución. Una investigación puede tener como objetivo resolver una pregunta abierta, por lo que el enlace no se convierte automáticamente en un bloqueo de ejecución. La coordinación del incremento y la asignación de una tarea son responsabilidades diferentes; ambas permanecen sin confirmar hasta que exista acuerdo.

Las unidades pequeñas no agregan peso ni nuevos elementos al porcentaje del roadmap. Cerrarlas en GitHub no verifica automáticamente al entregable padre ni registra aceptación humana o habilitación operativa. Al finalizar un trabajo, se deja evidencia en su issue y se revisa por separado si el paquete padre cumple todos sus criterios.

## Qué significa el porcentaje

El denominador corresponde a todos los paquetes del [roadmap versionado](/guide/proposal/roadmap/). El resumen del proyecto muestra su cantidad actual. Todos tienen el mismo peso en esta métrica:

- **Proyecto:** paquetes únicos verificados / paquetes del alcance × 100.
- **Fase:** paquetes verificados de la fase / paquetes de esa fase × 100.
- **Aplicación:** paquetes verificados en los que participa / paquetes que tiene asignados × 100.

Un paquete compartido cuenta una sola vez en el total del proyecto. Aparece también en cada aplicación que participa, por lo que **el avance general no es la media de los porcentajes de las apps**. Los porcentajes se muestran con hasta un decimal; el 100 % requiere que todos los paquetes correspondientes estén verificados. Por ejemplo, tres entregables verificados de 71 representan 4,2 % del proyecto; si pertenecen a una fase con 13 entregables, representan 23,1 % de esa fase. Es un ejemplo del cálculo, no una declaración del estado publicado.

Esta medida expresa implementación y verificación de los entregables acordados, que incluyen capacidades funcionales, infraestructura, gobierno del desarrollo y validaciones. No expresa esfuerzo consumido, tiempo restante, cantidad de código ni preparación para producción. Un paquete aporta cuando la evidencia cubre todos sus criterios dentro del alcance definido, incluido el recorrido integrado si participan varias aplicaciones. El trabajo parcial conserva su resumen y estado, pero no recibe un porcentaje estimado.

El resumen de cada app señala el alcance comprobado y sus límites: una prueba de navegador no acredita instalación nativa, una consulta local de contrato no acredita el proveedor y una CI verde no acredita por sí sola todos los criterios del entregable. La integración en `main` no verifica automáticamente una tarea ni registra aceptación manual. El resumen del proyecto muestra cuántos entregables están verificados, cuántos aceptó el equipo y cuántos verificados esperan esa revisión manual.

## Estados y evidencia

| Estado del registro | Significado | Aporta al porcentaje |
| --- | --- | --- |
| `not_started` | Entregable pendiente según la revisión registrada. | No |
| `in_progress` | Trabajo en curso descrito en el resumen. | No recibe un porcentaje parcial automático. |
| `blocked` | Trabajo bloqueado; el resumen identifica la dependencia. | No |
| `verified` | Entregable implementado y comprobado con revisión técnica y evidencia versionada. | Sí, aunque la aceptación manual esté pendiente. |

El esquema 2 exige `verification` para `verified`: commit del producto, fecha de revisión, revisor técnico y rutas de evidencia versionada. El revisor identifica quién realizó la comprobación, incluida una sesión de agente cuando corresponda; no se presenta como aprobación humana. El informe debe describir el alcance probado y los resultados de los criterios correspondientes, incluidos fallos y recuperación. La presencia de carpetas, un build exitoso o una captura de una pantalla mock no sustituyen esa verificación.

`acceptance` es una revisión manual independiente con los mismos campos. Puede permanecer en `null` después de verificar el entregable. Cuando el equipo la registra, debe revisar una versión que incluya la verificación técnica y una fecha igual o posterior. Sólo los entregables `verified` pueden tener aceptación manual. Los demás estados mantienen ambos campos en `null`. El indicador de aceptación humana muestra las aceptaciones y los verificados pendientes de revisión; no añade una segunda barra ni modifica el avance técnico.

Los snapshots de esquema 1 conservan su medición histórica de aceptación, identificada como **Aceptación del roadmap**. No se convierten en verificación técnica automáticamente: el porcentaje principal cambia a la nueva medición al importar un registro de esquema 2.

Las validaciones comprueban el formato, las referencias y la correspondencia con el roadmap. **No determinan automáticamente que el comportamiento esté implementado correctamente.** La revisión técnica y funcional sigue siendo responsabilidad del equipo.

El registro separa tres revisiones: el código al que se refiere la evidencia de las aplicaciones (`productRevision`), el commit del roadmap que define el alcance (`scope.revision`) y el commit que contiene el registro importado (`source.revision` en POS Docs). `productRevision` admite un SHA completo o el valor exacto `source`: este último significa **la revisión fuente del registro, resuelta al SHA publicado**. La importación fija ese SHA inmutable en `source.revision` y comprueba los paths de evidencia en ese árbol Git; no consulta después una rama mutable.

El snapshot conserva el contenido original, incluido `productRevision: "source"`, para comprobar su hash contra el JSON del producto. Las salidas derivadas resuelven ese valor al SHA de `source.revision`; los snapshots anteriores con SHA explícito siguen siendo válidos. Así, un squash puede cambiar el SHA del registro sin dejar la evidencia de aplicaciones apuntando a un commit de rama que ya no pertenece al historial integrado.

`verification.revision`, `acceptance.revision` y `scope.revision` siempre requieren un SHA completo; no admiten `source`. La verificación debe pertenecer al historial del producto efectivo. Si hay aceptación, su revisión debe incluir la verificación y pertenecer también a ese historial. Las evidencias se comprueban en el commit de cada revisión y deben ser archivos o directorios versionados, sin enlaces simbólicos. Si un squash deja una verificación o aceptación fuera de ese historial, la importación la rechaza; no la reubica automáticamente. Actualizar el panel o resolver `source` tampoco cambia por sí solo el revisor, la fecha o los estados.

## Actualizar el seguimiento

1. En POS Platform, registrar el resultado de la sesión en la issue. Actualizar `delivery/progress.json` si cambia el alcance comprobado y `delivery/follow-ups.json` si aparece o se resuelve una acción. Conservar preguntas ya respondidas como decisiones/evidencia y no reabrirlas por cambiar de sesión. Ejecutar los controles de progreso y entrega; confirmar los archivos en Git.
2. Publicar el resumen de ejecución desde ese checkout limpio. `pnpm run delivery:status` muestra el plan; `pnpm run delivery:status --apply` actualiza únicamente comentarios administrados de seguimiento. Conserva conversación, estado, asignados y etiquetas. `--check` detecta comentarios desactualizados.
3. Importar desde POS Docs, usando el checkout limpio y la revisión del producto que se quiere publicar:

   ```sh
   node tools/sync-project-progress.mjs --workspace ../pos-platform
   node tools/sync-project-follow-up.mjs --workspace ../pos-platform
   node tools/sync-project-planning.mjs --workspace ../pos-platform
   ```

   Los importadores de seguimiento y planificación consultan GitHub de forma explícita con la sesión autorizada del mantenedor. Importan sólo código, número/enlace de issue, estado abierto/cerrado, etiquetas de ejecución, asignados y fecha de actualización. La planificación añade el motivo de cierre para distinguir trabajo completado de descartado. No importan cuerpos, comentarios, tokens ni credenciales.

4. Revisar los tres snapshots de `portal/data/`. Sus hashes y revisiones identifican las fuentes; el progreso técnico debe coincidir con el producto importado. Revisar cualquier diferencia de seguimiento: issue cerrada con etiqueta activa, etiquetas contradictorias o bloqueo técnico sin acción registrada.
5. Ejecutar las comprobaciones y publicar la PR documental:

   ```sh
   node tools/sync-project-progress.mjs --workspace ../pos-platform --check
   node tools/sync-project-follow-up.mjs --workspace ../pos-platform --check
   node tools/sync-project-planning.mjs --workspace ../pos-platform --check
   npm run progress:test
   npm run follow-up:test
   npm run planning:test
   npm run validate
   npm run typecheck
   npm run build
   npm run portal:check
   npm run follow-up:check
   npm run project:check
   ```

`--check` no escribe. En seguimiento compara el contenido y estado observado; no falla sólo por transcurrir el reloj. La importación normal registra una nueva fecha de consulta. La fuente debe ser un commit del repositorio corporativo y un checkout limpio; las referencias de evidencia del progreso deben pertenecer a su historial. Un clon superficial necesita recuperar esos commits.

El build de Vercel es autónomo y usa los snapshots confirmados. **Un push a POS Platform o un cambio de issue no actualizan automáticamente POS Docs.** Publicar un corte requiere importar, revisar y fusionar la PR de documentación. El equipo debe hacerlo al actualizar entregables, resolver impedimentos o preparar una revisión de avance. La fecha visible permite reconocer qué corte se está consultando.

Los enlaces de POS Platform requieren acceso al repositorio privado. Los datos de seguimiento incluidos en el snapshot son públicos: no incluir información que sólo deba circular dentro de la empresa.

## Cambios de alcance

Si se añaden, eliminan o reasignan entregables, revisar conjuntamente `docs/roadmap.json` y el registro de POS Platform. Actualizar la revisión y hash del alcance, incluir todos sus IDs y reevaluar las verificaciones y aceptaciones afectadas antes de importar el nuevo snapshot. No eliminar pendientes para elevar el porcentaje ni conservar un denominador antiguo después de ampliar el alcance.

El roadmap mantiene la propuesta y sus criterios; POS Platform mantiene el avance técnico y las aceptaciones manuales. POS Docs calcula y presenta una copia revisada de esos datos, con trazabilidad a ambas fuentes.
