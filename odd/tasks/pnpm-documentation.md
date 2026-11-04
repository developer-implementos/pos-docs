# Documentación del gestor y sus invariantes

Objetivo: que POS Docs describa el gestor que pos-platform usa realmente y registre las invariantes que sostienen esa elección. Issue: https://github.com/developer-implementos/pos-platform/issues/145 (TASK-145). Responsable: @floxcristian.
Rama: `work/task-145-pnpm-docs`. Entrega: una PR editorial; no cierra el entregable del producto ni acredita su aceptación.
Deriva de [pos-platform#131](https://github.com/developer-implementos/pos-platform/pull/131), que migró el workspace y declaró su impacto documental como `architecture` con esta actualización pendiente. Pruebas: `editorial:check`, `editorial:test`, `skills:check`, `validate`, `typecheck`, `build`, `presentations:check`, `roadmap:check`, `portal:check` y `check`.
Clasificación: unidad sustancial, no inline. Toca catorce páginas, añade una sección normativa y coordina dos repositorios con gestores distintos, lo que es exactamente donde un error pasa inadvertido.
Espejo Engram: pendiente. La herramienta no estaba disponible en esta sesión; la ficha versionada es la fuente recuperable y el espejo se sincroniza al recuperar acceso.

## Specs

- S1. Las páginas que documentan pos-platform deben citar `pnpm`, y cada comando citado debe existir en el `package.json` de la revisión integrada del producto. Aceptación: ninguna invocación inexistente, comprobada contra esa fuente y no de memoria. Checks: comparación del diff completo contra `package.json` de pos-platform.
- S2. Este repositorio conserva npm para sí mismo, con sus propios lockfiles y su CI. Aceptación: las páginas que documentan pos-docs mantienen `npm`, incluidas las mixtas que describen ambos repositorios. Checks: revisión página por página de `auditoria-documentacion.md`, `editorial/presentation.md`, `project-progress.md`, `product-repository.md` y `agent-workflow.md`.
- S3. `docs/monorepo.md` debe registrar **por qué** el workspace está así, no sólo el prefijo del gestor: el linker aislado, que los nativos generados por Capacitor no se versionan y el allowlist de scripts de instalación. Aceptación: un lector que vaya a cambiar el workspace encuentra ahí qué no debe deshacer. Checks: revisión editorial del contenido.
- S4. Las diferencias operativas que afectan a cualquier comando documentado quedan escritas: pnpm reenvía el separador `--` en vez de consumirlo, y no viene con Node. Aceptación: ningún comando citado conserva `--` como separador.
- S5. La presentación que resume las fuentes modificadas se revisa antes de refrescar sus hashes. Aceptación: `deck.json` contrastado contra las fuentes; si no afirma nada sobre el gestor, no cambia de contenido y sólo se refresca la revisión mediante el mecanismo del repositorio. Checks: `build` y `presentations:check`.

## Tasks

- [x] T1 · S1,S4 · route:inline · Convertir las páginas que documentan pos-platform y retirar el separador · status:done · evidence: 110 invocaciones verificadas contra el package.json del producto, ninguna inexistente.
- [x] T2 · S2 · route:inline · Conservar npm en las páginas de pos-docs y decidir las mixtas por contexto · status:done · evidence: decisión por propiedad del script comparando ambos package.json; seis nombres coincidentes resueltos por contexto declarado; ver L3.
- [x] T3 · S3 · route:inline · Registrar las invariantes de la migración en la guía del monorepo · status:done · evidence: sección nueva con el linker aislado, los nativos generados y el allowlist, más las dos diferencias operativas.
- [x] T4 · S5 · route:inline · Revisar la deck y refrescar la revisión de fuentes · status:done · evidence: `deck.json` no contiene afirmaciones sobre el gestor; hashes fijados con `review-sources.mjs` sobre árbol limpio.
- [x] T5 · S1,S2,S3,S5 · route:inline · Validar el conjunto e integrar la base confiable · status:done · evidence: diez suites editoriales correctas; ver L4 y L5.

## Log

- L1 · 2026-11-04 · Solicitud original, literal:

> Corrige, implementa, mejora todos tus hallazgos de forma enterprise grade, sin parches y como lo harían las bigtechs

- L2 · 2026-11-04 · El hallazgo que esta unidad cierra se declaró en pos-platform#131 como impacto `architecture` pendiente, por quedar este repositorio fuera de su alcance. Al medirlo resultó mayor que una página: doce documentan pos-platform, cinco son mixtas y `docs/api.md` afirmaba literalmente «POS conserva npm».
- L3 · 2026-11-04 · La conversión se decidió por propiedad del script, comparando los dos `package.json`; seis nombres existen en ambos repositorios y se resolvieron por contexto de página declarado explícitamente. Una verificación del diff completo —en vez de confiar en esa tabla— detectó un error: el bloque «Para actualizar POS Docs» de `agent-workflow.md` había quedado convertido y se revirtió a npm. Es el riesgo que S2 nombra y el punto donde conviene centrar la revisión humana.
- L4 · 2026-11-04 · El `build` rechazó el primer intento porque los hashes de `sources.json` ya no coincidían con las fuentes editadas. El guard funcionó como debía: obligó a revisar la presentación antes de publicar, no sólo a refrescar un número. `deck.json` no menciona gestor, lockfiles ni comandos del workspace, de modo que las láminas conservan su contenido.
- L5 · 2026-11-04 · `main` avanzó durante la sesión e incorporó la gobernanza ODD editorial, con `ODD-Task` obligatorio. El control remoto rechazó el candidato por su ausencia, ejecutando código de la base confiable y no de la rama autora; la validación local con la copia previa de esta rama no podía detectarlo. Se integró esa base resolviendo la colisión de `sources.json` mediante regeneración con el mecanismo del repositorio, no editando hashes a mano. Es la segunda vez en la sesión que `pull_request_target` expone esa diferencia; queda registrado para no repetirlo.
- L6 · 2026-11-04 · No se ejecutó `verify` completo: sus pasos adicionales de navegador no aportan evidencia nueva sobre un cambio de prosa y comandos. La revisión humana independiente del contenido editorial queda pendiente y estas comprobaciones no la sustituyen.
