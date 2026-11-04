# Método de desarrollo con IA

POS adopta **Organic Driven Development (ODD)** de Gentle AI **v4.3.1**, revisión `2dba7784114fff57864519c4c0d067e952a8c98b`, para conservar la intención y la evidencia del trabajo entre personas y sesiones de Codex o Claude Code. El protocolo de referencia es el de esa versión; cambiarlo requiere revisar la actualización.

La adopción se sigue en [TASK-122](https://github.com/developer-implementos/pos-platform/issues/122), que conserva las comprobaciones realizadas y sus pendientes. **La revisión automática remota está preparada para conectarla después.** La instalación local, la conexión MCP de cada cliente y las protecciones de GitHub se comprueban por separado; publicar esta guía no acredita su activación en todos los equipos.

## Una ficha por cambio sustancial

Tras explorar y antes de modificar fuentes, una implementación sustancial crea `odd/tasks/<nombre>.md`. El orden es fijo: encabezado breve, `## Specs`, `## Tasks` y `## Log` al final. El documento completo y su ruta se reflejan en Engram bajo el proyecto correspondiente y el tema `odd/<nombre>/tasks`.

| Sección | Contenido |
| --- | --- |
| `Specs` | Requisitos numerados `S1`, `S2`… con criterios y comprobaciones. Conservan literalmente las cadenas, mensajes de error y ejemplos indicados por el usuario. |
| `Tasks` | Una línea por tarea con ID estable, referencias a `S#`, ruta de ejecución y commit como evidencia cuando exista. |
| `Log` | `L1` contiene la solicitud original literal, salvo secretos o datos que no deban publicarse: se conserva el alcance saneado confirmado y se declara la omisión. Se añaden correcciones, decisiones y evidencia sin reescribir el historial. |

Una modificación del requisito actualiza la especificación afectada y reabre su tarea, preservando el trabajo válido. Los colaboradores reciben la ruta de la ficha y los IDs de tarea/especificación. [Formato y continuidad del autor](https://github.com/Gentleman-Programming/gentle-ai/blob/2dba7784114fff57864519c4c0d067e952a8c98b/odd/tasks/odd-spec-by-reference.md).

Specs/Tasks/Log y su espejo siguen el protocolo del autor. POS añade su vínculo con la issue y la PR, los metadatos `ODD-Task` y `ODD-Reason`, los validadores y las reglas de integración. Esos controles del equipo se definen en el [procedimiento del producto](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md); no son exigencias universales de ODD.

## Cuándo hace falta

El tamaño se determina por **cómo retomar el trabajo**: si la solicitud y `git diff` bastan para recuperar un cambio entendido y de riesgo contenido, no necesita una ficha ODD duradera. Si no bastan, necesita la ficha. Una consulta o propuesta mantiene su alcance de lectura. El número de archivos no decide la clasificación. El presupuesto de revisión es de unas 400 líneas propias por unidad; la skill `chained-pr` exige dividir las PR que lo superen o que un mantenedor acepte explícitamente `size:exception`. Primero se busca una división coherente; no se recortan pruebas ni se separa artificialmente un comportamiento para ajustar una cifra. [Protocolo ODD v4.3.1](https://github.com/Gentleman-Programming/gentle-ai/blob/2dba7784114fff57864519c4c0d067e952a8c98b/docs/usage.md#organic-driven-development-odd).

Por ejemplo, corregir un texto conocido puede ser pequeño. Incorporar asignación y cierre de expedientes con permisos, persistencia y concurrencia necesita continuidad entre sus decisiones, implementación y pruebas. En ambos casos siguen vigentes la issue y las reglas de PR del repositorio; ODD no concede una excepción de integración.

## Cómo se conecta con el trabajo del equipo

| Pregunta | Autoridad |
| --- | --- |
| ¿Quién lo hace, qué está pendiente y dónde se discute? | Issue de **POS Platform**, con su tipo, dependencias, ficha de alcance y PR. |
| ¿Cómo continúa este cambio sustancial entre sesiones? | Ficha `odd/tasks/`: requisitos concretos, tareas y registro de ejecución; referencia la issue y la ficha del entregable. |
| ¿Qué recuerda el asistente de ese cambio? | Espejo completo en Engram, reconciliado con el archivo y el código. No es otro tablero de equipo. |

Una ficha ODD describe el recorte ejecutable y enlaza sus contratos; el roadmap, los bloqueos y los porcentajes conservan sus fuentes según [Fuentes y mantenimiento](/guide/reference/documentation-system/) y la [metodología del avance](/guide/implementation/progress/). Completar `T#` no cierra automáticamente una issue ni verifica el entregable padre. Al retomar trabajo anterior, la ficha abarca lo pendiente y enlaza la evidencia previa; no se reconstruyen fichas, consentimientos o revisiones de trabajo ya cerrado.

## Retomar con Codex o Claude Code

Empieza por [la guía de tarea](/guide/implementation/start-a-task/) y activa la [skill compartida pos-delivery](/guide/implementation/agent-workflow/) en el repositorio correcto. Los dos asistentes siguen las mismas fuentes; una configuración personal no reemplaza el procedimiento versionado.

Engram mantiene memoria local y resuelve el proyecto desde el contexto del repositorio. Antes de retomarlo, se leen el archivo y su observación completa, se contrastan con el código y se reconcilian diferencias. Las escrituras del archivo y el espejo no son atómicas: se comprueban ambas. Si Engram falla, se conserva la ficha y se informa el espejo pendiente. No se mezclan proyectos ni se supone que otro equipo recibió una memoria local. [Memoria y ámbito del proyecto](https://github.com/Gentleman-Programming/gentle-ai/blob/2dba7784114fff57864519c4c0d067e952a8c98b/docs/engram.md).

En POS, publicar la ficha o una guía no autoriza exportar memorias privadas al repositorio público. El traspaso del equipo sigue en Git y la issue/PR, sin secretos ni transcripciones ajenas al alcance autorizado.

## Comprobar y revisar son pasos distintos

ODD conserva comprobaciones proporcionales. Cuando hay una prueba determinista ejecutable y un resultado definido, aplica prueba primero: observar el fallo, implementar y comprobar el resultado. Cuando no corresponde, se explica la excepción y la comprobación adecuada. Los comandos aplicables pertenecen al repositorio; consulta la [guía de pruebas](/guide/implementation/testing/) y su procedimiento, sin mantener otra lista aquí.

**Receipt-Driven Development (RDD)** es el mecanismo separado de revisión independiente sobre un candidato inmutable. ODD no lo activa por sí mismo. Si está habilitado, la evaluación nativa determina el siguiente paso; se ejecutan sus transiciones exactas. El consentimiento de riesgo medio/alto pertenece al candidato: habilitar RDD no equivale a concederlo. Una evaluación fallida no demuestra riesgo bajo. Se conservan resultado, límites e identidad del candidato; nunca se fabrica un recibo a partir de una casilla marcada o una CI aprobada. [Contrato RDD v2](https://github.com/Gentleman-Programming/gentle-ai/blob/2dba7784114fff57864519c4c0d067e952a8c98b/docs/review-integration.md).

Las pruebas acreditan escenarios; la revisión automatizada aporta su evaluación; una aprobación humana identifica a quien revisó. Ninguna sustituye la aceptación del equipo ni la habilitación operativa de proveedores, dispositivos o producción. El merge conserva las [reglas del producto](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md), aunque RDD esté deshabilitado o no disponible.

La política de POS separa protección técnica y revisión humana: sólo `floxcristian` puede omitir esta última mediante PR y autorización explícita para el candidato. Los owners de la organización conservan su administración heredada. Consulta la [configuración de las protecciones](https://github.com/developer-implementos/pos-platform/tree/main/.github/rulesets) y su evidencia en TASK-122; la preparación del revisor remoto no lo convierte en un control obligatorio activo.
