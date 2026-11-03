# Trabajar con Codex y Claude Code

La skill **pos-delivery** guía una tarea desde su issue hasta la verificación, la PR y el traspaso. Consulta las fuentes del proyecto para que distintas personas y sesiones puedan continuar el mismo trabajo sin reconstruirlo desde un chat.

Las reglas comunes siguen en [AGENTS.md del producto](https://github.com/developer-implementos/pos-platform/blob/main/AGENTS.md) y [CONTRIBUTING.md](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md); los cambios editoriales siguen además [AGENTS.md de POS Docs](https://github.com/developer-implementos/pos-docs/blob/main/AGENTS.md). La skill organiza su aplicación. No reemplaza esas reglas, la CI, la revisión ni la autorización necesaria para integrar cambios.

## Usarla en una tarea

Abre el checkout o worktree de `pos-platform` o `pos-docs` en el asistente. La skill viene versionada con el repositorio: no requiere instalación global, enlaces simbólicos ni una ubicación particular del otro checkout.

En Codex:

```text
$pos-delivery Analiza la issue https://github.com/developer-implementos/pos-platform/issues/119 y prepara el siguiente cambio revisable.
```

En Claude Code:

```text
/pos-delivery Analiza la issue https://github.com/developer-implementos/pos-platform/issues/119 y prepara el siguiente cambio revisable.
```

La selección automática también es posible cuando la petición coincide con la descripción de la skill. La invocación explícita permite elegirla al comenzar. Si no aparece, comprueba que abriste el repositorio correcto, que sus archivos están presentes y que la configuración del asistente no la deshabilita; reinicia la sesión para renovar su descubrimiento. Codex documenta [la invocación y carga local](https://learn.chatgpt.com/docs/build-skills); Claude Code documenta [las ubicaciones y la invocación](https://code.claude.com/docs/en/skills).

| Trabajo | Petición que puedes añadir | Resultado que revisar |
| --- | --- | --- |
| Iniciar una issue | «Lee la issue y sus dependencias, revisa las PR existentes y propone un incremento acotado con sus pruebas.» | Alcance, responsable confirmado, dependencias y plan basados en la issue vigente. |
| Consultar el avance | «Revisa el avance de F02 y separa implementación verificada, habilitación operativa y aceptación humana. Indica revisión y fecha de las fuentes.» | Evidencia enlazada y pendientes concretos; el estado del portal se distingue del estado consultado en GitHub. |
| Preparar una PR parcial | «Prepara una PR del cambio implementado y enumera lo que sigue pendiente del entregable.» | PR vinculada a la issue, alcance parcial y pruebas atribuibles a una revisión; la issue del entregable permanece abierta. |
| Registrar un bloqueo | «Identifica qué impide continuar, qué evidencia falta y cuál es la próxima acción. Prepara su actualización en el seguimiento.» | Causa, impacto, contraparte y condición de resolución; sin inventar responsables ni publicar información interna. |
| Traspasar la sesión | «Deja un traspaso para otro desarrollador: revisión, trabajo terminado, pruebas, riesgos y siguiente paso.» | Registro recuperable desde Git y la issue/PR, que distingue cambios locales de cambios publicados. |

Conserva el alcance y las autorizaciones de la sesión: seleccionar la skill, por sí solo, no autoriza acciones adicionales. Una consulta de estado es de lectura; una solicitud de implementación continúa el trabajo autorizado. Una instrucción cargada tampoco garantiza obediencia: revisa los resultados y conserva los controles del repositorio.

## Consultar una sola fuente

La skill no mantiene otra lista de tareas ni calcula un porcentaje propio. Para decidir qué hacer consulta el [próximo incremento](/project/plan/) y las [issues de POS Platform](https://github.com/developer-implementos/pos-platform/issues). El [panel de atención](/project/attention/) reúne los seguimientos publicados; la [metodología del avance](project-progress.md) explica sus fuentes y cortes de actualización.

El alcance de cada entrega y los campos de su PR se consultan en el [procedimiento de contribución](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md). Las decisiones y los contratos se actualizan siguiendo [Fuentes y mantenimiento](documentation-system.md), que identifica dónde se edita cada información. Una PR documental enlaza la issue del producto y conserva separado el resultado editorial del cumplimiento del entregable.

## Una skill compartida entre dos repositorios

| Ubicación | Responsabilidad |
| --- | --- |
| `pos-platform/.agents/skills/pos-delivery/` | Fuente editable del procedimiento y sus recursos; descubrimiento local de Codex. |
| `pos-platform/.claude/skills/pos-delivery/` | Copia generada de la misma skill para el descubrimiento de Claude Code. |
| `pos-docs/.agents/skills/pos-delivery/` y `pos-docs/.claude/skills/pos-delivery/` | Copias importadas desde una revisión explícita del producto, con hashes verificables. |

Los recursos necesarios acompañan a la skill. Cada clon conserva su versión y funciona sin consultar una rama remota para cargar instrucciones. Las diferencias entre producto y documentación se resuelven leyendo las reglas y fuentes del repositorio activo.

`CLAUDE.md` importa las instrucciones comunes mediante `@AGENTS.md`; así se mantiene una sola política por repositorio. Los archivos generados de la skill no se editan a mano. Esta distribución evita depender de la configuración de enlaces simbólicos en Windows, según las [condiciones documentadas por Claude Code](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools). El formato de recursos y referencias sigue [Agent Skills](https://agentskills.io/specification).

## Mantener el procedimiento

Los cambios de comportamiento se realizan en la fuente de `pos-platform`, vinculados a una issue y revisados como cualquier otro cambio del repositorio. Después se regeneran sus copias y se comprueba que coincidan:

```sh
npm run skills:sync
npm run skills:check
```

Para actualizar POS Docs, ejecuta desde su raíz una importación explícita. Sustituye los marcadores por el checkout limpio del producto y el SHA completo de su `HEAD` que se ha revisado:

```text
node tools/agent-skills/sync.mjs --source "<checkout-producto-limpio>" --revision <SHA40-HEAD> --write
npm run skills:check
```

La importación registra origen, revisión y hashes en `tools/agent-skills/source-lock.json`. Revisa el cambio en una PR editorial. En POS Docs, `skills:sync` sólo regenera el espejo local de la versión importada: no trae actualizaciones del producto ni admite desviaciones de esa revisión. `skills:check` comprueba la integridad de los archivos, no la calidad de las decisiones de un agente.

Al modificar el procedimiento, revisa ejemplos de inicio, PR parcial, bloqueo y traspaso en ambos asistentes. Comprueba qué fuente consultan y qué resultado producen; una validación de archivos no acredita que una sesión haya ejecutado el flujo correctamente.
