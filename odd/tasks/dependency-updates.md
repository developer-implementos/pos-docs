# Actualizaciones de dependencias de POS Docs con Renovate

Objetivo: que las dependencias del sitio publicado y las acciones de los workflows se actualicen solas, con revisión humana y sin abrir un camino para cambiar otra cosa sin la declaración editorial. Issue: https://github.com/developer-implementos/pos-platform/issues/399
Rama: `work/task-399-renovate`, desde `b331cc6`. Entrega: una PR de gobernanza que agrega `renovate.json`, la política `tools/dependencies/` y su conexión con `editorial-policy`.
Pruebas: `npm run dependencies:test`, `npm run governance:test`, `npm run editorial:test`, `npm run editorial:check` y `npm run verify`.
Clasificación: unidad sustancial, no inline. Agrega una segunda identidad exceptuada de la declaración editorial, una decisión de gobernanza que el responsable aprobó el 2026-11-17 («haz los puntos pendientes hasta el 4»; el punto 3 era esta propuesta).
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. Identidad: sólo una PR de `renovate[bot]` (tipo `Bot`), desde una rama `renovate/*` de este repositorio hacia `main`, toma el camino de dependencias. Aceptación: una persona, un usuario con ese nombre que no es bot, otra rama, un fork u otra base siguen el camino editorial completo.
- S2. Alcance por archivo: sólo `apps/starlight/package.json`, `apps/starlight/package-lock.json` y `.github/workflows/*.yml` existentes, modificados. Aceptación: cualquier otro archivo, o uno agregado, borrado o renombrado, rechaza la PR.
- S3. Alcance por contenido, leído por commit, árbol y blob inmutables. El manifiesto sólo cambia versiones del registro de dependencias que ya declara, sin tocar scripts, otros campos ni `overrides`. El lockfile resuelve cada paquete desde `https://registry.npmjs.org/` con un hash `sha512`. Un workflow sólo cambia el commit de un `uses:` existente. Aceptación: pruebas negativas de protocolos (`git+`, `file:`, `npm:`, URL), de un script agregado, de un `overrides` cambiado, de un registro ajeno, de un hash ausente o débil, de otra acción, de una etiqueta mutable y de una línea o un paso agregados.
- S4. No es una excepción de revisión: no hay auto-merge, y el cuerpo de la PR no puede traer el bloque de entradas del historial de cambios.
- S5. `renovate.json` coincide con la política: calendario mensual como POS Platform, 3 días de antigüedad mínima con `internalChecksFilter: strict`, sólo los gestores `npm` y `github-actions`, sólo `apps/starlight/package.json` y los workflows, acciones fijadas por SHA, `overrides` deshabilitado y alertas de vulnerabilidad fuera de la ventana. Aceptación: `repository-governance.test.mjs` fija estas invariantes y CODEOWNERS asigna `renovate.json` y `tools/dependencies/` al responsable de gobernanza.
- S6. Documentación: `tools/dependencies/README.md`, la política editorial y AGENTS.md describen el camino y su límite.

## Tasks

- [x] T1 · S1,S2,S3,S4 · route:inline · Política y lectura inmutable en `tools/dependencies/` y su conexión en `pr-check.mjs` · status:done · evidence: `dependencies:test` 7/7; el manifiesto real con Playwright 1.65.1 se acepta y el lockfile real de `main` pasa la regla del registro
- [x] T2 · S5 · route:inline · `renovate.json`, CODEOWNERS e invariantes de gobernanza · status:done · evidence: `governance:test` 11/11 y `editorial:check` con 32 patrones de responsables
- [x] T3 · S6 · route:inline · README de la herramienta, política editorial y AGENTS.md · status:done · evidence: ver L2
- [ ] T4 · S1,S2,S3,S4,S5 · route:inline · `npm run verify`, PR y primera PR real de Renovate · status:in_progress · evidence: la primera PR de Renovate llega en la próxima ventana mensual o con una alerta de vulnerabilidad; su `editorial-policy` es la prueba real del camino

## Log

- L1 · 2026-11-17 · Solicitud original, literal:

> haz los puntos pendientes hasta el 4. el 5 explicamelo de forma resumida. soy junior

El punto 3 de la lista anterior era: «#399, actualizaciones automáticas de dependencias en pos-docs: hoy no tiene ninguna, y por eso Playwright quedó 7 meses atrás. Renovate ya está instalado; falta configurarlo y aprobar una excepción acotada en la política editorial, para que sus PR no salgan en rojo».

- L2 · 2026-11-17 · Diseño. Se replica el camino de la App de versiones (`tools/release/pr.mjs`): la identidad decide el camino y cada archivo se lee por commit, árbol y blob inmutables con `gitReader`, sin token de escritura. A diferencia de esa App, Renovate no integra nada: no hay excepción de revisión. El alcance se limita al sitio publicado. Los runtimes fijados de `tools/` (Archify, cuyo cambio exige licencias y manifiesto del proveedor; diagramas; revisor automático), la raíz y `.nvmrc` quedan fuera. Al revisar el manifiesto real apareció `overrides` (`postcss-nested` → `postcss-selector-parser` 7.1.6), un fijado decidido por una persona: se deshabilita en Renovate y la política lo exige igual. La regla del lockfile se probó contra el de `main`: sus 652 paquetes resuelven desde el registro público con `sha512`.
