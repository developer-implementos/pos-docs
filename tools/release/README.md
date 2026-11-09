# Versiones e historial de cambios

POS Docs se versiona con [release-please](https://github.com/googleapis/release-please). Cada PR integrado en `main` entra en la próxima versión, y cada versión queda en [`CHANGELOG.md`](../../CHANGELOG.md), en la página [Historial de cambios](https://pos-docs-starlight.vercel.app/guide/changelog/), en un tag `vX.Y.Z` y en un [release de GitHub](https://github.com/developer-implementos/pos-docs/releases). Quien quiera un aviso por versión usa *Watch → Custom → Releases* en el repositorio.

El historial sirve para no tener que releer todo: dice qué cambió, cuándo y en qué PR. Su calidad depende enteramente de cómo se escriban los títulos de los PR.

## Qué entra y cómo sube la versión

| Tipo del PR | Sección del historial | Versión |
| --- | --- | --- |
| `feat` | Novedades: páginas, recorridos, vistas o secciones nuevas | menor |
| `fix` | Correcciones: contenido equivocado, enlaces rotos | parche |
| `docs` | Contenido actualizado: estado, alcance, fuentes o redacción | parche |
| `revert` | Reversiones | parche |
| `ci`, `build`, `test`, `chore`, `refactor`, `style`, `perf` | no aparecen | no publican versión |

Un cambio **incompatible** retira o renombra una ruta pública de `/guide/` o `/project/`, porque rompe los enlaces que el equipo ya compartió. Se marca con `!` en el título (`docs(flows)!: …`) o con un pie `BREAKING CHANGE: <ruta retirada y su reemplazo>`. Antes de `1.0.0` sube la versión menor.

## Cómo escribir una buena entrada

El título del PR **es** la entrada: `tipo(alcance): [TASK-N] qué cambió para quien lee`. El alcance nombra el área del sitio donde se nota el cambio: `project`, `follow-up`, `planning`, `progress`, `decisions`, `flows`, `architecture`, `api`, `data`, `roadmap`, `presentations`, `portal`.

Escribir el efecto, no la tarea. Nombrar el identificador cuando cambia un seguimiento, una pregunta abierta, una decisión o un entregable:

- Bien: `docs(follow-up): [TASK-260] FOLLOWUP-005 queda resuelta con la aprobación de Tesorería`.
- Mal: `docs(project): [TASK-260] actualizar seguimiento`.

### Un PR que cambia varias cosas

Cuando un PR cambia varios elementos, por ejemplo una importación de seguimientos donde cambian tres, cada uno merece su línea. Agregar al cuerpo del PR un bloque de entradas: reemplaza al título en el historial, así que el título no se repite solo.

```text
BEGIN_COMMIT_OVERRIDE
docs(follow-up): FOLLOWUP-005, pregunta abierta: Comercial aprueba las reglas de F01-10

docs(follow-up): FOLLOWUP-009 nuevo: falta el acceso al ambiente de pruebas del emisor

fix(decisions): ADR-14 vuelve a figurar como propuesta y no como vigente
END_COMMIT_OVERRIDE
```

Reglas, que `Editorial PR policy` comprueba:

- Una línea por entrada, `tipo(alcance): texto`, separadas por una línea en blanco.
- Sin `!`: release-please no lo reconoce dentro del bloque, y cuando hay bloque ignora el título. Un cambio incompatible va en un PR propio, sin bloque y con `!` en el título.
- Sin HTML: el historial se publica como página del sitio.
- Un solo bloque. release-please busca el marcador de apertura **en cualquier parte del cuerpo, comentarios HTML y comillas invertidas incluidos**, y si falta el de cierre toma como entradas todo lo que sigue. Basta nombrarlo en el texto para que la entrada del PR se pierda o salga equivocada: nunca escribas los marcadores en una plantilla, un ejemplo o una mención.

Sin bloque, release-please lee el título y el cuerpo como un solo mensaje, porque `main` integra con el cuerpo del PR como mensaje del commit. Un párrafo del cuerpo que empiece con `tipo(alcance): ` se convierte en otra entrada, y uno que empiece con `BREAKING CHANGE:` vuelve incompatible la versión. La política no lo comprueba: revisar el cuerpo antes de integrar.

release-please lee el cuerpo del PR al armar la versión, así que el bloque se puede corregir después de integrar mientras la versión no se haya publicado. Con la integración automática eso dura minutos: escribirlo bien antes de integrar.

## Cómo se publica una versión

1. Un push a `main` ejecuta [`release.yml`](../../.github/workflows/release.yml). release-please, con la identidad de la App, abre o actualiza el PR `chore(release): publicar versión X.Y.Z` desde la rama `release-please--branches--main`.
2. `Documentation quality` verifica ese PR como cualquier otro: construye el sitio con la página del historial, que el PR declara como `Reader-Journeys: /guide/changelog/`. `Editorial PR policy` reconoce el PR de release por su autor y su rama, y valida su alcance en lugar de la plantilla.
3. Cuando `Documentation quality` termina, [`release-merge.yml`](../../.github/workflows/release-merge.yml) ejecuta [`merge.mjs`](merge.mjs) desde el código de `main`, sin descargar el PR. Comprueba que el autor sea la App y la rama la de release, que solo cambien `CHANGELOG.md`, el manifiesto y la versión de `package.json`, que la versión suba, que el historial conserve su introducción y las entradas anteriores sin HTML, y que la **última** corrida de `Documentation quality` sobre ese mismo SHA haya aprobado. Integra por squash fijando ese SHA: si el PR avanzó, GitHub rechaza la integración y se espera la verificación de la revisión nueva.
4. Esa integración dispara otra vez `release.yml`: release-please crea el tag y el release, y cambia la etiqueta del PR a `autorelease: tagged`. Si un release integrado sigue con `autorelease: pending`, [`verify.mjs`](verify.mjs) hace fallar el workflow en lugar de dejarlo en verde.

Entre la integración de un PR y la versión publicada pasan unos 6 minutos, lo que tarda `Documentation quality`.

## Identidad y permisos

- **App:** `implementos-pos-docs-release`, de la organización, instalada solo en `pos-docs`, con permisos de escritura en *Contents*, *Pull requests* e *Issues* (las etiquetas de release-please). El token de cada job pide solo lo que usa: integrar no pide *Issues*.
- **Credenciales:** la variable `RELEASE_APP_ID` y el secret `RELEASE_APP_PRIVATE_KEY` viven en el environment `release`, que solo admite la rama `main` y no tiene excepción para administradores. Un miembro con escritura puede empujar una rama con un workflow propio, pero no leer la clave desde ella.
- **Excepción de revisión:** la App figura en `POS Docs reviewed main` en modo `pull_request`, igual que Renovate en core. `POS Docs protected main` sigue sin excepciones: también ella necesita PR, historia lineal y conversaciones resueltas. El auto-merge nativo de GitHub sigue deshabilitado; la integración la decide `merge.mjs`.
- **Riesgo aceptado:** quien obtenga la clave puede integrar cualquier PR sin revisión humana. Por eso la clave solo se lee desde `main`, el cliente de [`github.mjs`](github.mjs) solo alcanza los endpoints que necesita y solo escribe para integrar, y estos archivos son CODEOWNERS de @floxcristian.

Rotar la clave: generar una nueva en la configuración de la App, reemplazar el secret del environment y borrar la anterior.

## Operación

- Forzar una corrida: `gh workflow run release.yml -R developer-implementos/pos-docs` o `gh workflow run release-merge.yml -R developer-implementos/pos-docs`.
- Si `Documentation quality` falla sobre el PR de release, `release-merge.yml` falla y el PR queda abierto. Se corrige con un PR normal; release-please regenera el de release y se vuelve a verificar.
- Pausar las versiones: `gh workflow disable release-merge.yml` deja el PR de release abierto, acumulando cambios, para integrarlo a mano. `gh workflow disable release.yml` detiene todo.
- Retirar el mecanismo: quitar la App de `bypass_actors` en [`review.json`](../../.github/rulesets/review.json), aplicarlo con `PUT` según [la política de protección](../../.github/rulesets/README.md), deshabilitar los dos workflows y desinstalar la App. El historial ya publicado se conserva.

### Recuperar un release sin tag

No crear el release a mano sobre otro commit. Eso es lo que detuvo a devops-platform desde el 2025-12-23: su v2.2.0 apunta a un commit distinto del merge de su PR #26, el PR quedó en `autorelease: pending` y cada corrida aborta con «There are untagged, merged release PRs outstanding».

1. Volver a ejecutar `release.yml`; release-please crea el release que falte.
2. Si no puede, crear el release **sobre el commit de merge del PR de release** y después cambiar su etiqueta:

```sh
gh release create vX.Y.Z --target <merge_commit_sha> --title vX.Y.Z --notes "<la entrada de CHANGELOG.md>" -R developer-implementos/pos-docs
gh pr edit <número> --remove-label 'autorelease: pending' --add-label 'autorelease: tagged' -R developer-implementos/pos-docs
```

## Comprobaciones

`npm run release:test` cubre el validador del PR de release, la integración, la detección de un release sin tag y el bloque de entradas. `npm run release:check` contrasta configuración, manifiesto, `package.json` y `CHANGELOG.md`. Las dos forman parte de `npm run verify`.
