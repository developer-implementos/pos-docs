# Protección de POS Docs

Dos rulesets acumulativos separan integración técnica y revisión humana:

| Fuente | Ruleset remoto | Propósito | Bypass |
| --- | --- | --- | --- |
| `main.json` | `26482639` · POS Docs protected main | PR, conversaciones, historia lineal, impedir borrado y force push | Ninguno |
| `review.json` | `26482640` · POS Docs reviewed main | Una aprobación ajena vigente, CODEOWNERS, aprobación del último push | Sólo @floxcristian, `User` 28737734, mediante PR |

`../repository.json` permite squash manual, actualización de ramas y limpieza de ramas integradas. Auto-merge permanece deshabilitado para que la integración ocurra después de comprobar la evidencia local vigente. El equipo `pos-platform` conserva permiso `push` (escritura), no `maintain`. Los owners de la organización mantienen administración heredada y pueden gestionar las reglas; no son actores de bypass por ese hecho. No modificar sus roles de empresa para administrar POS.

Los archivos son estado deseado revisable, no prueba de activación. La configuración real se consulta en GitHub, incluidas reglas heredadas. Por [TASK-161](https://github.com/developer-implementos/pos-platform/issues/161), el ruleset técnico no exige checks de Actions y Actions permanece deshabilitado. El merge sigue el [procedimiento de CI local](../../tools/local-ci/README.md): evidencia real aprobada del candidato, política online fresca desde una base confiable y revisión humana vigente. GitHub aplica PR y revisión; no verifica el recibo ni la ejecución local. Una persona comprueba esa evidencia antes de integrar, sin publicar checks/estados sustitutos ni incorporar una GitHub App.

Un agente no omite revisión humana sin autorización explícita de @floxcristian para la PR concreta. La excepción nunca omite CI local, política online ni controles técnicos y no representa aceptación operativa. GitHub no repite la comprobación local cuando cambia el candidato; integrar manualmente mediante squash después de contrastar HEAD y base actuales.

## Aplicar y comprobar

Antes de modificar, guardar respuestas de repositorio, rulesets y permiso del equipo en un directorio local ignorado. Conservar ese respaldo para restaurar una configuración accidentalmente incorrecta; no usarlo para eludir un control fallido.

Deshabilitar auto-merge y comprobar el resultado **antes** de retirar los checks requeridos, para evitar que una integración pendiente se ejecute al cambiar la regla. Aplicar después sólo el ruleset técnico autorizado; el ruleset de revisión se consulta para verificar que permanece intacto.

```sh
gh api repos/developer-implementos/pos-docs --method PATCH -F allow_auto_merge=false -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs --jq .allow_auto_merge
gh api repos/developer-implementos/pos-docs/rulesets/26482639 --method PUT --input .github/rulesets/main.json -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs/rules/branches/main
gh api repos/developer-implementos/pos-docs/rulesets/26482640
```

Comprobar `enforcement`, rama, ausencia de `required_status_checks`, PR, conversaciones resueltas, historia lineal, prohibición de borrado/force push, revisión ajena, CODEOWNERS, aprobación del último push y actores/modo de bypass; consultar también reglas heredadas. Verificar el permiso del equipo, squash manual, `allow_auto_merge: false`, actualización/limpieza de ramas conservadas y que Actions siga deshabilitado. Si una regla efectiva todavía exige checks de Actions, registrar la discrepancia y corregir sólo la configuración autorizada; no fabricar un éxito. No probar push, force push ni borrado contra `main`.

## Incorporar un control nuevo

1. Revisar el validador y su comando local antes de incorporarlo a la base confiable. Una PR no autoriza su propia política; el control online no ejecuta código/configuración del candidato.
2. Observar rechazo por entrada inválida y aprobación por entrada válida. Registrar comando, revisión y evidencia; un fallo de infraestructura no prueba rechazo correcto.
3. Incorporar el control al recorrido local y a la comprobación humana de evidencia. Un fallo o una comprobación ausente impide aceptar el candidato; no se añade un check alojado al ruleset.
4. La reactivación de Actions o la incorporación de un servicio externo requiere otra decisión explícita. Nunca fabricar checks, aprobaciones de bots o recibos RDD.

La adopción inicial conserva su evidencia en [TASK-122](https://github.com/developer-implementos/pos-platform/issues/122); TASK-161 registra la política de CI local y la consulta de su configuración remota. La revisión automatizada remota permanece desconectada y tiene su [procedimiento propio](../../tools/automated-review/README.md). Los archivos de gobernanza son CODEOWNERS de @floxcristian; el resto del código conserva revisión del equipo.
