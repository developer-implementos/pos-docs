# Actualizaciones de dependencias

Renovate propone una vez al mes las actualizaciones del sitio publicado (`apps/starlight`) y de los SHA de las acciones de los workflows ([`renovate.json`](../../renovate.json)). Las alertas de vulnerabilidad no esperan la ventana. Ninguna versión se propone antes de cumplir 3 días publicada. Issue: [TASK-399](https://github.com/developer-implementos/pos-platform/issues/399).

Antes de esto, POS Docs no tenía ninguna automatización de dependencias. Playwright quedó siete meses atrás, y cuando `ubuntu-latest` pasó a Ubuntu 26.04 dejó de instalar Chromium ([TASK-392](https://github.com/developer-implementos/pos-platform/issues/392)).

## Qué valida la política

Una PR de Renovate no lleva la declaración editorial (`ODD-Task`, `Issue`, `Sources`…), igual que la PR de la App de versiones. **No es una excepción de revisión:** una persona la revisa y la integra después de que `Documentation quality` aprueba su revisión exacta. [`policy.mjs`](policy.mjs) decide el camino por identidad y alcance, nunca por el texto de la PR, y lee cada archivo por commit, árbol y blob inmutables ([`pr.mjs`](pr.mjs)).

**Identidad:** `renovate[bot]` (tipo `Bot`), desde una rama `renovate/*` de este repositorio hacia `main`. Cualquier otra PR sigue el camino editorial completo.

**Alcance por contenido:**

| Archivo | Qué puede cambiar |
| --- | --- |
| `apps/starlight/package.json` | La versión de una dependencia que ya existe, como versión o rango del registro. No puede agregar ni quitar dependencias, ni cambiar scripts, otros campos, `overrides` o el protocolo (`git+`, `file:`, `npm:`, URL). |
| `apps/starlight/package-lock.json` | Cualquier cosa, siempre que cada paquete se resuelva desde `https://registry.npmjs.org/` con un hash `sha512`. |
| `.github/workflows/*.yml` | Sólo el commit al que apunta un `uses:` existente, y su comentario de versión. La acción y todas las demás líneas quedan iguales. |

Además, el cuerpo de la PR no puede traer el bloque de entradas del historial de cambios: release-please lo leería del commit integrado.

## Fuera de alcance, a propósito

- **`overrides`:** es un fijado que decidió una persona, por ejemplo por una corrección de seguridad. Renovate no lo propone, y la política lo rechaza si cambia.
- **`tools/archify/vendor`, `tools/diagrams/runtime` y `tools/automated-review/cli`:** son runtimes fijados, con su propio procedimiento. En Archify, por ejemplo, actualizar implica también actualizar licencias y el manifiesto del proveedor.
- **La raíz y `.nvmrc`:** la versión de Node se fija igual en toda la organización.

## Operación

- **Revisar una PR de Renovate:** las notas de la versión que enlaza, el resultado de `Documentation quality` (`npm run verify` y los recorridos de navegador) y la revisión visual cuando cambia Astro, Starlight o Playwright.
- **Subir Playwright:** al hacerlo se puede pasar la imagen de los workflows de `ubuntu-24.04` a `ubuntu-26.04`. Va en una PR propia, porque Renovate no cambia `runs-on`.
- **Pausar Renovate:** desde el Dependency Dashboard, o quitando `renovate.json` en una PR.
- **Pruebas:** `npm run dependencies:test`. `repository-governance.test.mjs` fija las invariantes de `renovate.json`.
