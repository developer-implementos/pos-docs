# Controles editoriales

La política valida declaraciones de PR, propiedad por área y evidencia consultable. No evalúa automáticamente la verdad de una explicación ni concede revisión humana.

## Comprobación local

```sh
node tools/editorial/check.mjs
node --test tools/editorial/*.test.mjs
node tools/editorial/pr-check.mjs --body-file /ruta/pr.md
```

El cuerpo debe incluir los campos y secciones de `.github/pull_request_template.md`. `Sources` enumera archivos canónicos rastreados; `Reader-Journeys`, rutas públicas permanentes. `Review-Evidence` identifica las comprobaciones y la revisión, o describe concretamente qué falta. No escribir sólo «pendiente». `Documentation-Impact: none` exige el campo adicional `Impact-Reason` con el motivo por el que el cambio no altera arquitectura, comportamiento, contratos o datos.

Las listas de `Sources` y `Reader-Journeys` usan comas como delimitador. Los nombres de fuentes admiten Unicode, espacios y paréntesis; se comprueba su coincidencia exacta con el archivo rastreado. Para un original cuyo nombre contenga comas, declarar su catálogo canónico en `Sources` y enlazar el original en la sección de fuentes de la PR.

Después de construir el sitio, `node tools/editorial/journeys-check.mjs --body-file /ruta/pr.md` comprueba que las rutas y anclas declaradas existan en el HTML de `dist`. El workflow normal de calidad lo ejecuta con el cuerpo de la PR, también al editarlo. Admite páginas nuevas sin ejecutar código de la PR en el contexto privilegiado de la política.

Para verificar una PR real y su issue con una sesión de lectura autorizada, usar `node tools/editorial/pr-check.mjs --pr NUMERO --github --require-issue`. El cliente lee `GH_TOKEN` o `GITHUB_TOKEN` del entorno; nunca pasar credenciales como argumento, copiarlas a archivos o mostrarlas en logs. La comprobación local de cuerpo es offline y declara explícitamente que no consultó la issue.

## Ejecución local y workflows conservados

GitHub Actions permanece deshabilitado por TASK-161. El [recorrido local](../local-ci/README.md) invoca `npm run verify` como entrada canónica y comprueba además los recorridos declarados. Los workflows versionados conservan su configuración para revisión; su presencia no acredita ejecución remota ni autoriza reactivarlos. El wrapper no consulta la política online: ejecutar el comando de PR real desde una base confiable en un entorno separado.

`editorial-policy.yml` ejecuta sólo la política de la base confiable con `pull_request_target`: lee metadatos de la PR, archivos cambiados y, si el token tiene acceso, la issue de POS Platform. No ejecuta código de la PR, instala paquetes, recupera cachés ni descarga sus artefactos. Las credenciales tienen sólo lectura y los destinos HTTP están limitados a los dos repositorios; no se siguen redirecciones. Los títulos y cuerpos nunca se interpolan en shell.

El `GITHUB_TOKEN` de POS Docs puede no leer el repositorio privado del producto. Un 403/404 se presenta como **issue no verificada**, sin afirmar que existe, está abierta o que el permiso es su única causa. La revisión con acceso al producto debe comprobarla; `--require-issue` permite exigir esa evidencia y falla si no está disponible. Errores de servicio o una issue cerrada/PR equivocada fallan. No se configura un secreto adicional ni se cambia ninguna regla de merge con esta política.

El workflow y CODEOWNERS son efectivos desde su integración en la rama base. El check de declaración no sustituye una aprobación ni activa por sí solo un check requerido: esa exigencia pertenece a las reglas del repositorio. `.github/CODEOWNERS` es la fuente única de responsables por área; usa rutas explícitas del repositorio y una regla general de respaldo. La [política de protección](../../.github/rulesets/README.md) mantiene la configuración prevista, los permisos y el procedimiento para contrastarlos con GitHub. Validar este archivo no acredita permisos remotos ni revisiones realizadas.

## Referencias

- [GitHub: contexto y riesgos de pull_request_target](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target).
- [GitHub: uso seguro de código no confiable](https://docs.github.com/en/actions/reference/security/secure-use#mitigating-the-risks-of-untrusted-code-checkout).
- [GitHub: propietarios de código y requisitos de permisos](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
