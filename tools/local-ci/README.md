# Verificación editorial local

El equipo ejecuta CI desde sus PC; GitHub Actions permanece deshabilitado en ambos repositorios por [TASK-161](https://github.com/developer-implementos/pos-platform/issues/161). La CI local real aprobada, la política online fresca y la revisión humana exigida permiten integrar. El wrapper conserva evidencia del candidato sin llamar a GitHub ni cambiar protecciones. GitHub aplica las [reglas de PR y revisión](../../.github/rulesets/README.md), pero no comprueba la ejecución local: una persona verifica el recibo antes del merge. No se publican checks/estados sustitutos ni se incorpora una GitHub App.

## Preparar y ejecutar

Usar una cuenta o entorno sin credenciales accesibles al código del candidato. Filtrar variables no aísla el llavero de `gh`, archivos de configuración ni otros secretos del mismo usuario. No ejecutar el candidato en el entorno autenticado usado para revisar la política.

Desde un checkout limpio de `developer-implementos/pos-docs`, con Node 22.23.3 (o versión admitida por `package.json`) y npm 11.6.0:

```sh
npm run setup
npm --prefix apps/starlight exec playwright install chromium
```

En Linux, instalar también las dependencias del navegador mediante `npm --prefix apps/starlight exec playwright install --with-deps chromium`. La regeneración opcional de diagramas tiene [requisitos propios](../diagrams/README.md). Conservar los lockfiles; no usar instalaciones que los reescriban. Confirmar todos los cambios antes de generar evidencia.

Guardar el cuerpo exacto de la PR en un archivo externo al checkout, obtenido por el coordinador desde la consulta autenticada de sólo lectura. Luego ejecutar desde el entorno sin credenciales:

```sh
node tools/local-ci/run.mjs --output ../evidence/docs-attempt-001 --body-file ../evidence/pr-body.md
```

La carpeta de salida debe ser nueva y externa al checkout. Primero se consulta `npm --versions --json`; después se invoca `npm run verify`, cuya lista de suites vive exclusivamente en `package.json`, y `tools/editorial/journeys-check.mjs` sobre el cuerpo guardado y el sitio construido. `npm run local-ci:test` está incluido en `verify`; sus fixtures no invocan el wrapper sobre el repositorio, por lo que no existe recursión.

`manifest.json` conserva HEAD, hashes SHA-256 de los locks rastreados y `package.json`, comando canónico, ejecutable Node del wrapper, versiones Node/npm observadas por npm, requisitos declarados en `engines`/`packageManager`, cuerpo de PR, estados, códigos de salida y hashes de los tres logs. Las versiones se observan, pero la compatibilidad semántica con los requisitos se marca `not-validated`: el responsable debe contrastarla antes de aceptar la evidencia; no se atribuye un runtime fijado por ejecutar el wrapper. `pr-body.md` conserva la entrada usada. Un éxito exige fuente limpia e idéntica antes y después, cuerpo estable y todas las etapas aprobadas.

Cada etapa de verificación tiene un máximo de 30 minutos y 32 MiB de captura combinada stdout/stderr; la consulta de versiones admite 15 segundos y 64 KiB. Sobrepasarlos falla con `step-timeout` o `log-limit`; el log puede estar truncado y nunca se acepta como aprobado. Se solicita terminar el árbol/grupo y, tras 3 segundos, se fuerza la terminación. Si a los 6 segundos no se observa el cierre del hijo, se conserva `termination-unconfirmed` y `processExitObserved: false`; revisar y detener manualmente cualquier proceso superviviente antes de reintentar. Observar el cierre del hijo no prueba que todos sus descendientes hayan desaparecido.

El reporte guarda códigos de error fijos; los detalles stdout/stderr permanecen en logs locales que deben revisarse antes de compartir. Un fallo conserva las etapas no ejecutadas como `not_run`; SIGINT/SIGTERM deja `interrupted`. Un corte de energía o terminación forzada puede dejar `running` o un manifiesto incompleto: nunca aceptarlos como éxito. La ausencia del manifiesto tampoco es éxito.

Corregir el problema, confirmar el nuevo candidato y ejecutar otra vez con una carpeta nueva. No editar un manifiesto, completar pasos manualmente ni reutilizar logs. Revisar los logs antes de compartirlos; las capturas existentes permanecen en `test-results-*` y no están incluidas en los hashes de este manifiesto.

## Política de la PR por separado

En otro checkout limpio y confiable de **main**, con la sesión de lectura autorizada y sin ejecutar código del candidato:

```sh
node tools/editorial/pr-check.mjs --pr 123 --github --require-issue
```

Sustituir `123` por la PR real. Conservar el SHA de esa base, el resultado del comando y los metadatos consultados. El [control editorial](../editorial/README.md) valida declaración, historial ODD e issue real, y rechaza cambios de la PR durante su consulta. Sus pruebas unitarias y el modo `--body-file` no sustituyen esa consulta online. Antes de aceptar evidencia, contrastar el HEAD y el hash del cuerpo con la PR actual, y repetir la verificación cuando cambien. Esta unidad no automatiza la vinculación de este manifiesto a número de PR/base ni publica un check remoto.

## Comprobar antes de integrar

La persona responsable de integrar deja en la PR una referencia consultable al recibo y a la política online, con revisión y resultados. Antes del merge:

1. Consultar HEAD, cuerpo y base actuales de la PR, reglas efectivas y revisión. Contrastar el SHA y el hash del cuerpo con `manifest.json` y comprobar los hashes de logs, locks y `package.json`, las versiones admitidas y todos los resultados. Revisar los logs; un archivo que dice `passed` por sí solo no acredita ejecución.
2. Confirmar `npm run verify` y recorridos declarados aprobados para el candidato actual, sin fallos, interrupciones, `not_run` ni evidencia incompleta u obsoleta. Al cambiar HEAD o cuerpo, ejecutar de nuevo el wrapper en una carpeta nueva. Si cambia la base, actualizar el candidato sobre esa base cuando corresponda y repetir las comprobaciones aplicables; no reutilizar la política online anterior.
3. Repetir el control online desde la base confiable actual y conservar SHA de base, HEAD, cuerpo y resultado. Una política fallida o no consultada impide integrar, aunque el build haya pasado. Confirmar nuevamente que la PR no cambió después de estas comprobaciones.
4. Confirmar conversaciones resueltas, ausencia de conflictos y revisión independiente vigente con CODEOWNERS y aprobación del último push. Sólo @floxcristian puede omitir la revisión humana mediante PR, con autorización explícita para ese candidato; esa excepción conserva los controles locales y de política.

Con esa evidencia y la revisión requerida, se puede integrar manualmente mediante squash sin esperar Actions. Un resultado fallido, obsoleto o no ejecutado no autoriza merge. La configuración versionada no prueba el estado remoto: consultar las reglas efectivas. Auto-merge permanece deshabilitado para conservar la comprobación final de HEAD, base y evidencia antes de integrar.

El pedido de merge debe exigir el HEAD exacto revisado, por ejemplo `gh pr merge 123 --repo developer-implementos/pos-docs --squash --match-head-commit SHA_REVISADO`, sustituyendo número y SHA por los comprobados; no usar `--auto` ni `--admin`. Consultar otra vez la base justo antes de enviarlo: si cambió, detener la integración, renovar la política online y repetir las comprobaciones aplicables. `--match-head-commit` protege el HEAD del candidato, pero no ofrece una condición atómica sobre el SHA de la base; conservar ese límite explícito en la revisión de evidencia.

El reporte es una declaración del desarrollador: los hashes detectan cambios accidentales cuando se contrastan, pero un mismo usuario puede modificar código, logs y manifiesto. No prueba integridad independiente, dependencias instaladas, ausencia de cambios transitorios, revisión humana ni aceptación del producto. La política online tampoco convierte esa declaración en atestación.

## Alcance nativo

Docs comprueba contenido, build, enlaces y navegador; no compila aplicaciones nativas. Windows y Android conservan sus comandos y requisitos en el repositorio de producto. iOS queda **no ejecutado: no hay Mac disponible**; no se presenta como aprobado ni se sustituye por CI portable. Los criterios de release que requieren iOS siguen pendientes; no se impone una CI iOS alojada universal como requisito de merge. Una integración documental no cambia el roadmap ni habilita una release. Codex y Claude Code usan este mismo recorrido y registran resultado y límites en la ficha ODD y la PR.

## Workflows preparados para runners propios

`docs-quality.yml` y `editorial-policy.yml` declaran sólo runners propios de la organización, sin respaldo alojado, siguiendo la decisión de no consumir minutos alojados ([TASK-161](https://github.com/developer-implementos/pos-platform/issues/161)). El pool se declara en `POS_CI_LINUX_RUNS_ON` y, para la política editorial, en `POS_CI_TRUSTED_RUNS_ON` cuando exista un pool confiable ([TASK-207](https://github.com/developer-implementos/pos-platform/issues/207)), ambos como arreglos JSON de etiquetas. El navegador se instala sin `--with-deps`: un runner propio no concede sudo y las bibliotecas del sistema las aprovisiona el host. `tools/editorial/policy.test.mjs` impide reintroducir un runner alojado o un paso con sudo.

Los workflows siguen deshabilitados en GitHub y este procedimiento local sigue siendo el que autoriza integrar. Activarlos es una decisión del administrador con tres pasos, en este orden: habilitar los workflows, observar en una PR real que cada job corre en un runner propio (`runner_name`, nunca `GitHub Actions …`) y, recién entonces, exigir sus contextos en el ruleset y retirar el requisito de evidencia local. `automated-review.yml` es una copia distribuida desde POS Platform y adopta el mismo enrutamiento al refrescar la distribución desde una revisión integrada del producto.
