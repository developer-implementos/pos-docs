# Protección de POS Docs

Dos rulesets acumulativos separan integración técnica y revisión humana:

| Fuente | Ruleset remoto | Propósito | Bypass |
| --- | --- | --- | --- |
| `main.json` | `26482639` · POS Docs protected main | PR, conversaciones, historia lineal, impedir borrado y force push | Ninguno |
| `review.json` | `26482640` · POS Docs reviewed main | Una aprobación ajena vigente, CODEOWNERS, aprobación del último push | @floxcristian (`User` 28737734) y la App de versiones (`Integration` 5686471, `implementos-pos-docs-release`), ambos mediante PR |

`../repository.json` permite squash manual, actualización de ramas y limpieza de ramas integradas. El auto-merge nativo permanece deshabilitado para que la integración ocurra después de comprobar la evidencia vigente; el PR de release lo integra un workflow con esa misma condición ([versiones automáticas](#versiones-automáticas)). El equipo `pos-platform` conserva permiso `push` (escritura), no `maintain`. Los owners de la organización mantienen administración heredada y pueden gestionar las reglas; no son actores de bypass por ese hecho. No modificar sus roles de empresa para administrar POS.

Los archivos son estado deseado revisable, no prueba de activación. La configuración real se consulta en GitHub, incluidas reglas heredadas. El ruleset técnico no exige ningún check ([decisión](#github-actions-en-este-repositorio)). El merge se hace por squash manual, con la revisión humana vigente y después de leer los resultados de los workflows para el candidato actual. GitHub aplica PR y revisión; no verifica un recibo ni una ejecución local, y no se publican checks/estados sustitutos. La única GitHub App propia es la de versiones: no acredita checks ni revisión, sólo integra el PR de release.

Un agente no omite revisión humana sin autorización explícita de @floxcristian para la PR concreta. La excepción omite sólo esa revisión: no acredita los workflows ni representa aceptación operativa. Integrar manualmente mediante squash después de contrastar HEAD y base actuales.

## GitHub Actions en este repositorio

Decisión permanente del responsable, del 2026-11-06 ([TASK-219](https://github.com/developer-implementos/pos-platform/issues/219)): POS Docs se verifica en GitHub Actions con runners alojados estándar. Una sesión no la revierte por su cuenta, ni para ahorrar minutos ni para alinear este repositorio con POS Platform. Reabrirla corresponde al responsable, y tendría sentido si cae una de las premisas de abajo, por ejemplo si el repositorio deja de ser público.

| Workflow | Estado | Runner |
| --- | --- | --- |
| `docs-quality.yml` | `active` | `ubuntu-latest` |
| `editorial-policy.yml` | `active` | `ubuntu-latest` |
| `automated-review.yml` | `disabled_manually`, porque puede consumir la API de IA | `ubuntu-24.04`, si se autoriza |
| `project-import.yml` | `active`; el calendario corre sólo con `PROJECT_IMPORT_ENABLED=true` ([importación automática](../../tools/project-import/README.md)) | `ubuntu-latest` |

La corrida [42250964631](https://github.com/developer-implementos/pos-docs/actions/runs/42250964631) sobre `main` pasó en el grupo `GitHub Actions`, en unos 5 minutos.

**No tiene costo.** GitHub: «[Use of the standard GitHub-hosted runners is free and unlimited on public repositories](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job)». La factura de la organización lo confirma, mientras los repositorios privados ya pagaban. Consultada el 2026-11-06 con `gh api 'organizations/developer-implementos/settings/billing/usage/summary?year=2026&month=<mes>&repository=developer-implementos/pos-docs'`:

| Mes | Minutos Linux | Almacenamiento | Bruto | Descuento | Neto |
| --- | --: | --: | --: | --: | --: |
| Octubre de 2026 | 165 | 83,86 GB-h | 1,02 USD | 1,02 USD | 0 USD |
| Noviembre de 2026, hasta el día 6 | 522 | 341,88 GB-h | 3,25 USD | 3,25 USD | 0 USD |

**No hay cuota que agotar, así que no hace falta respaldo.** GitHub tampoco podría enrutar por cuota: `runs-on` no conoce el saldo de la cuenta.

**Este repositorio no puede usar los runners propios.** `gh api 'orgs/developer-implementos/actions/runner-groups?visible_to_repository=pos-docs'` responde vacío, porque los grupos tienen `allows_public_repositories: false`. Abrirlos expondría un equipo de la red interna a cualquier fork, y GitHub dice que los runners propios «[should almost never be used for public repositories](https://docs.github.com/en/actions/reference/security/secure-use)». Pasar a runners propios exigiría hacer privado este repositorio.

**POS Platform decide aparte.** Su repositorio es privado y los minutos alojados se facturan. Los checks obligatorios corren en runners propios; Windows e iOS sólo se compilan por despacho manual alojado con costo. Su [guía del runner](https://github.com/developer-implementos/pos-platform/blob/main/tools/runner/README.md) mantiene los niveles, comandos y límites; esta decisión editorial no los modifica.

**Ningún check es obligatorio.** Las reglas de `main` no incluyen `required_status_checks` y esta decisión no agrega ninguno: `Documentation quality` y `Editorial PR policy` informan en la PR, y GitHub no impide integrar si fallan o no corren. Quien integra lee esos resultados; un fallo o un workflow que no corrió no se presenta como aprobado. La [CI local](../../tools/local-ci/README.md) sigue disponible para verificar antes de empujar: es opcional y ya no es la única verificación.

## Versiones automáticas

Decisión del responsable del 2026-11-09 ([TASK-253](https://github.com/developer-implementos/pos-platform/issues/253)): POS Docs publica una versión por cada cambio integrado, sin un paso manual, para que el equipo sepa qué cambió sin releer la documentación. La [guía de versiones](../../tools/release/README.md) describe el flujo completo.

- La App `implementos-pos-docs-release` figura en `review.json` como excepción en modo `pull_request`, el mismo patrón que Renovate en core. `main.json` no cambia: sin excepciones, también para la App.
- Su clave vive en el environment `release`, que sólo admite `main` y no tiene excepción para administradores. Un miembro con escritura no puede leerla desde una rama propia.
- `release-merge.yml` sólo integra el PR de release después de validar autor, rama y archivos, y de que la última corrida de `Documentation quality` sobre ese SHA aprobó. Fija ese SHA al integrar.
- La App puede integrar cualquier PR sin revisión si alguien obtiene su clave. Ése es el riesgo aceptado, y la razón de las tres restricciones anteriores.

La excepción se aplicó el 2026-11-09 con la primera línea, después de respaldar el ruleset; GitHub devuelve los actores en el orden de `review.json`. Para retirarla, quitar la App de `review.json` y repetir el mismo `PUT`.

```sh
gh api repos/developer-implementos/pos-docs/rulesets/26482640 --method PUT --input .github/rulesets/review.json -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs/rulesets/26482640 --jq .bypass_actors
gh api repos/developer-implementos/pos-docs/environments/release --jq '{can_admins_bypass, deployment_branch_policy}'
gh api repos/developer-implementos/pos-docs/environments/release/deployment-branch-policies --jq '.branch_policies[] | {name, type}'
```

## Aplicar y comprobar

Antes de modificar, guardar respuestas de repositorio, rulesets y permiso del equipo en un directorio local ignorado. Conservar ese respaldo para restaurar una configuración accidentalmente incorrecta; no usarlo para eludir un control fallido.

Deshabilitar auto-merge y comprobar el resultado **antes** de retirar los checks requeridos, para evitar que una integración pendiente se ejecute al cambiar la regla. Aplicar después sólo el ruleset técnico autorizado; el ruleset de revisión se consulta para verificar que permanece intacto.

```sh
gh api repos/developer-implementos/pos-docs --method PATCH -F allow_auto_merge=false -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs --jq .allow_auto_merge
gh api repos/developer-implementos/pos-docs/rulesets/26482639 --method PUT --input .github/rulesets/main.json -H 'X-GitHub-Api-Version: 2026-03-10'
gh api repos/developer-implementos/pos-docs/rules/branches/main
gh api repos/developer-implementos/pos-docs/rulesets/26482640
gh api repos/developer-implementos/pos-docs/actions/workflows --jq '.workflows[] | "\(.state) \(.path)"'
```

Comprobar `enforcement`, rama, ausencia de `required_status_checks`, PR, conversaciones resueltas, historia lineal, prohibición de borrado/force push, revisión ajena, CODEOWNERS, aprobación del último push y actores/modo de bypass; consultar también reglas heredadas. Verificar el permiso del equipo, squash manual, `allow_auto_merge: false`, actualización/limpieza de ramas conservadas y el estado de los workflows: `docs-quality.yml`, `editorial-policy.yml`, `release.yml` y `release-merge.yml` en `active`, `automated-review.yml` en `disabled_manually`. Si una regla efectiva exige checks de Actions, registrar la discrepancia y corregir sólo la configuración autorizada; no fabricar un éxito. No probar push, force push ni borrado contra `main`.

## Incorporar un control nuevo

1. Revisar el validador y su comando local antes de incorporarlo a la base confiable. Una PR no autoriza su propia política; el control online no ejecuta código/configuración del candidato.
2. Observar rechazo por entrada inválida y aprobación por entrada válida. Registrar comando, revisión y evidencia; un fallo de infraestructura no prueba rechazo correcto.
3. Incorporar el control a `npm run verify`, que ejecutan `docs-quality.yml` y el recorrido local. Un fallo o una comprobación ausente no se presenta como aprobada; no se añade un check al ruleset.
4. Activar `automated-review.yml`, exigir un check en el ruleset o incorporar un servicio externo requiere otra decisión explícita. Nunca fabricar checks, aprobaciones de bots o recibos RDD.

La adopción inicial conserva su evidencia en [TASK-122](https://github.com/developer-implementos/pos-platform/issues/122); TASK-161 conserva la política anterior de CI local y la consulta de su configuración remota, y [TASK-219](https://github.com/developer-implementos/pos-platform/issues/219) registra la decisión vigente sobre Actions. La revisión automatizada remota permanece desconectada y tiene su [procedimiento propio](../../tools/automated-review/README.md). Los archivos de gobernanza son CODEOWNERS de @floxcristian; el resto del código conserva revisión del equipo.
