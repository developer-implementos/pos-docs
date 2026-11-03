# Protección de POS Docs

Dos rulesets acumulativos separan integración técnica y revisión humana:

| Fuente | Ruleset remoto | Propósito | Bypass |
| --- | --- | --- | --- |
| `main.json` | `26482639` · POS Docs protected main | PR, checks, conversaciones, historia lineal, impedir borrado y force push | Ninguno |
| `review.json` | `26482640` · POS Docs reviewed main | Una aprobación ajena vigente, CODEOWNERS, aprobación del último push | Sólo @floxcristian, `User` 28737734, mediante PR |

`../repository.json` permite squash, auto-merge opt-in, actualización de ramas y limpieza de ramas integradas. El equipo `pos-platform` conserva permiso `push` (escritura), no `maintain`. Los owners de la organización mantienen administración heredada y pueden gestionar las reglas; no son actores de bypass por ese hecho. No modificar sus roles de empresa para administrar POS.

Los archivos son estado deseado revisable, no prueba de activación. La configuración real y sus ejecuciones se consultan en GitHub. Los checks existentes usan GitHub Actions, app `15368`. Un agente no omite revisión humana sin autorización explícita de @floxcristian para la PR concreta. La excepción nunca omite controles técnicos ni representa aceptación operativa.

## Aplicar y comprobar

Antes de modificar, guardar respuestas de repositorio, rulesets y permiso del equipo en un directorio local ignorado. Conservar ese respaldo para restaurar una configuración accidentalmente incorrecta; no usarlo para eludir un control fallido.

```sh
gh api repos/developer-implementos/pos-docs/rulesets/26482639 --method PUT --input .github/rulesets/main.json -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs/rulesets/26482640 --method PUT --input .github/rulesets/review.json -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs/rules/branches/main
gh api repos/developer-implementos/pos-docs/rulesets/26482640
```

Comprobar `enforcement`, rama, todos los checks con emisor, revisión ajena, actores y modo de bypass; consultar también reglas heredadas. Verificar el permiso del equipo y las opciones de merge. No probar push, force push ni borrado contra `main`.

## Incorporar un control nuevo

1. Revisar e integrar su workflow y validador en la base confiable. Una PR no autoriza su propia política. `pull_request_target` no ejecuta ni instala código/configuración de la rama autora.
2. En una PR controlada, observar rechazo por entrada inválida y aprobación por entrada válida. Registrar URL, SHA y emisor; un fallo de infraestructura no prueba rechazo correcto.
3. Añadir el contexto exacto al ruleset técnico y consultar las reglas efectivas. Sólo entonces describirlo como obligatorio y activo.
4. Si necesita un servicio externo, configurar su identidad antes de declarar revisión automática disponible. Nunca fabricar checks, aprobaciones de bots o recibos RDD.

La adopción y la evidencia de activación se siguen en [TASK-122](https://github.com/developer-implementos/pos-platform/issues/122). La revisión automatizada remota tiene su [procedimiento propio](../../tools/automated-review/README.md). Los archivos de gobernanza son CODEOWNERS de @floxcristian; el resto del código conserva revisión del equipo.
