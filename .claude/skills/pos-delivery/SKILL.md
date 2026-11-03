---
name: pos-delivery
description: Gestionar tareas, issues, PR, documentación, bloqueos y evidencia de avance de POS Platform y POS Docs con las fuentes canónicas del equipo. Usar al iniciar o retomar una entrega, preparar su PR, revisar progreso o dejar un traspaso. No usar para una explicación técnica aislada sin seguimiento de trabajo.
---

# Entregar trabajo de POS

Orquesta el procedimiento del repositorio para el alcance solicitado. La skill no concede permisos para publicar, fusionar, aceptar entregables ni operar servicios reales. Conserva la autorización ya dada en la sesión; no solicites aprobaciones adicionales para trabajo autorizado.

## Resolver el contexto

Obtén la raíz con `git rev-parse --show-toplevel`; resuelve las rutas siguientes desde esa raíz, no desde el directorio de la skill ni desde una carpeta vecina. Comprueba remoto, rama, `HEAD` y cambios pendientes. Lee `AGENTS.md`, las instrucciones aplicables a los archivos afectados y el procedimiento pertinente:

| Checkout                             | Procedimiento que consultar                                                                                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `developer-implementos/pos-platform` | `CONTRIBUTING.md`; después la issue real, sus relaciones y sólo la ficha/plan necesarios.                                                                                                                                                                    |
| `developer-implementos/pos-docs`     | `AGENTS.md` y `docs/documentation-system.md`; el trabajo se vincula mediante URL completa a la issue del producto. Para modificar contratos, alcance o integración del producto, consulta también su `CONTRIBUTING.md` y ficha en una revisión identificada. |

Si el remoto identifica un fork, confirma su relación con el repositorio corporativo antes de publicar. Si no puedes identificar el proyecto, avanza sólo el análisis que no depende de esa identidad. No adivines repositorio, issue o responsables por el nombre de la carpeta. Conserva los cambios de otras sesiones y usa el aislamiento que prescribe `CONTRIBUTING.md`.

Una consulta de estado es de lectura: invocar la skill no toma tareas, crea issues ni altera etiquetas. Consulta GitHub mediante el conector disponible o `gh` con repositorio explícito; lee el cuerpo completo, comentarios relevantes, asignación, dependencias y PR existentes. Una referencia en el chat no acredita su estado actual. Si falta acceso, declara qué no pudiste comprobar, identifica la revisión local disponible y continúa el trabajo independiente; no inventes un estado remoto.

## Elegir la fuente según la decisión

| Pregunta                                         | Fuente propietaria                                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Qué hacer, quién lo lleva y en qué estado está? | Issue y PR de POS Platform; `delivery/planning.md` y `delivery/planning.json` orientan la selección y preparación.                             |
| ¿Qué exige el entregable y de qué depende?       | `delivery/specs/`, `delivery/backlog.json` y sus registros de issues.                                                                          |
| ¿Qué está técnicamente verificado?               | `delivery/progress.json`, con la evidencia exigida por `delivery/README.md`.                                                                   |
| ¿Qué acceso, respuesta o decisión falta?         | Issue para ejecución; `delivery/follow-ups.json` para el seguimiento público curado, según `delivery/README.md`.                               |
| ¿Qué explica el sistema y qué se publica?        | POS Docs: `docs/documentation-system.md`; `docs/project-progress.md` para snapshots, y el procedimiento propietario de cada contrato/diagrama. |

No cargues todas las fichas ni mantengas otra lista de pendientes. Las copias publicadas son instantáneas: compara sus revisiones y fechas con el producto antes de explicar una diferencia. La ausencia de un dato no significa cero, terminado o desbloqueado.

## Aplicar Organic Driven Development

Sigue ODD de Gentle AI **v4.3.1**, fijado por `tools/odd/toolchain.lock.json`, y el contrato de `odd/README.md`. Clasifica el trabajo después de explorar: una corrección pequeña y bien comprendida se resuelve inline; una unidad sustancial o que deba retomarse conserva antes de implementar `odd/tasks/<feature-name>.md`. No crear una ficha por comando ni convertir toda consulta en un proyecto.

La ficha lleva un encabezado breve (objetivo, rama, estrategia de entrega, test runner), `## Specs` con S1… y criterios comprobables, `## Tasks` con una línea por T# vinculada a S#, ruta inline/delegated, estado y commit o evidencia RED/GREEN, y `## Log` append-only. L1 conserva la solicitud original literalmente; nuevas decisiones y correcciones se añaden con evidencia. No publicar secretos ni transcripciones ajenas al alcance. Enlaza issue y fichas canónicas; no copies el backlog, porcentajes o especificaciones completas ya propietarias de otra fuente.

Antes de retomar, reconcilia Git, issue y el documento con su espejo completo en Engram, proyecto del repositorio, topic `odd/<feature-name>/tasks`; incluye la ruta relativa del archivo. Después de actualizar, lee ambos para comprobar que coinciden: no son una transacción atómica. Si Engram no está disponible, conserva el archivo y declara la sincronización pendiente; no inventes memoria ni atribuyas hechos históricos a ODD. No subas bases de memoria, credenciales ni historiales del asistente al repositorio público.

Explora, resuelve incertidumbres que cambien el contrato, implementa y verifica cortes pequeños contra S#. Delega con ownership explícito y verifica el resultado recibido. Una casilla marcada no acredita calidad. Mantén los cambios de intención en Log, actualiza Tasks y vincula la evidencia real; no reescribas decisiones pasadas para aparentar un proceso perfecto.

RDD es una revisión posterior distinta de tests, aprobación humana y aceptación operativa. Usa el protocolo nativo de la versión fijada: capacidades, STATUS y únicamente sus transiciones/argumentos exactos; respeta el consentimiento que solicite para el candidato concreto. Nunca reconstruyas tokens, inventes un recibo `approved`, reutilices aprobación de otro diff ni presentes ausencia de lentes como revisión LLM. RDD no autoriza push, PR o merge. La revisión automática de GitHub es un control remoto separado; consulta su ejecución para el SHA actual.

## Preparar y ejecutar una unidad revisable

Para una solicitud de implementación, revisa preparación, dependencias, responsable humano confirmado y trabajo concurrente antes de elegir el alcance. Si aún no hay issue, busca primero una existente; crea una unidad del tipo real sólo dentro del trabajo autorizado. Sigue el plan y el catálogo actuales para el código, padre, fase y aplicaciones; no inventes un entregable del roadmap para una tarea técnica independiente. No confundas una obligación de fase con prioridad de ejecución.

Para una unidad sustancial, registra intención y ejecución en su ficha ODD; la issue o PR enlaza esa ficha y resume resultado y límites. Para trabajo inline, registra resultado, alcance y pruebas previstas en la issue o PR de trabajo. Actualiza ese registro al cambiar el alcance o aparecer un impedimento, sin publicar cada comando ni transcripciones del chat. Un bloqueo debe decir qué falta, a qué criterio afecta, la siguiente acción y quién la coordina si está confirmado. Continúa las partes independientes; una VPN ausente o un contrato pendiente no bloquean automáticamente toda la fase.

Contrasta cada criterio de la unidad con implementación y evidencia, usando una tabla breve cuando facilite la revisión:

| Criterio                  | Implementación / revisión        | Prueba y resultado             | Límite o pendiente             |
| ------------------------- | -------------------------------- | ------------------------------ | ------------------------------ |
| Criterio real de la issue | Archivo o contrato y SHA probado | Comando, escenario y artefacto | Lo que esa prueba no demuestra |

Elige los checks desde `CONTRIBUTING.md`, `package.json` y los workflows actuales, según el diff; no uses una lista de comandos congelada en esta skill. Registra fallos y comprobaciones no ejecutadas. Distingue prueba con fixtures, integración real, compilación nativa y habilitación operacional. Si cambió la revisión después de probar, determina qué evidencia sigue siendo aplicable y vuelve a ejecutar lo necesario; no atribuyas resultados de otro SHA al actual.

## Coordinar documentación y avance

Actualiza la fuente propietaria antes de su representación. Los contratos HTTP, esquema físico y diccionario se originan en POS Platform; POS Docs importa artefactos comprobados siguiendo su procedimiento. Las decisiones editoriales y diagramas se actualizan en sus modelos canónicos. No edites manualmente HTML/SVG generados, snapshots de avance ni porcentajes para reflejar una PR nueva.

Una unidad terminada no verifica automáticamente a su padre. Cuando el alcance completo de un entregable esté implementado y todos sus criterios técnicos tengan evidencia, registra la verificación según `delivery/README.md`; no la retrases por una aceptación humana distinta. Conserva esa aceptación sin atribuir hasta que ocurra realmente. Si sólo está lista una parte, registra esa parte y los criterios faltantes. La revisión humana, el estado de la PR, la habilitación operativa y el avance técnico son datos distintos.

En POS Docs, importa desde el corte limpio e identificado que requiere `docs/project-progress.md`, con el estado de GitHub observado en fecha concreta. Si el producto aún no está integrado, identifica la vista como revisión previa y conserva la dependencia de publicación; no la describas como desplegada. No cambies el denominador ni resuelvas preguntas pendientes para aumentar el porcentaje.

## Preparar PR y traspaso

Usa la plantilla vigente y `CONTRIBUTING.md` para el título, metadatos, relaciones y cierre. Declara `ODD-Task` con la ficha real; sólo el trabajo pequeño usa `inline` con `ODD-Reason` concreto. Una PR editorial puede enlazar la ficha del producto fijada a un commit, siguiendo `odd/README.md`. Revisa el diff completo y los vínculos efectivos de GitHub, no sólo el cuerpo. Una PR parcial no cierra entregables; una hija completa sólo cierra su propio alcance. Una PR editorial enlaza la issue del producto sin cerrarla. No modifiques bloques administrados de issues al margen de su publicador.

Antes de integrar, consulta la revisión actual, los checks requeridos y el estado de revisión. Aplica la política existente, incluida su excepción administrativa cuando corresponda: una autorización para otra PR no sirve y disponer de credenciales no la sustituye. No cambies reglas, publiques checks aprobados ficticios ni presentes una comprobación omitida como superada. La skill no crea una nueva exigencia de aprobación para las acciones que el usuario ya autorizó.

Después de una integración o cierre autorizado, vuelve a consultar la PR y la issue: confirma el commit integrado y los cierres efectivos. GitHub no elimina las etiquetas al cerrar una issue; retira las etiquetas de ejecución activa que quedaron obsoletas en la tarea cerrada, conservando tipo, fase y alcance. No cierres ni cambies el estado del padre por esa limpieza. En una consulta de lectura, informa la discrepancia sin corregirla automáticamente.

Al terminar una implementación o realizar un traspaso, deja en la issue/PR pertinente un resumen reutilizable: resultado comprobado, enlaces de issue y PR, rama/revisión, evidencia, pendientes con impacto y siguiente acción. Una consulta de estado o evaluación de lectura se responde sin publicar comentarios ni modificar registros. Distingue trabajo local, PR publicada, integración y despliegue. No cierres una issue sólo para dejar la sesión ordenada. La memoria privada del asistente no es el registro del equipo.
