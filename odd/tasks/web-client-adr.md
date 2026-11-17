# ADR del cliente web conectado

Objetivo: registrar como ADR-21 la decisión de agregar `pos-web`, el cliente web conectado, ampliando el ADR-14 de clientes de escritorio y móvil. Issue: https://github.com/developer-implementos/pos-platform/issues/403 (TASK-403). Responsable de la sesión: floxcristian.
Rama: `work/task-403-canal-web`. Entrega: una PR editorial coordinada con la PR del producto; no cierra la issue del producto ni acredita homologación de navegadores ni publicación en un servidor.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Introduce una decisión de arquitectura que cambia la composición de clientes declarada por el ADR-14.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/web-client.md` registra estado, decisión, composición de los tres clientes, reglas (canal verdadero, solo cliente conectado, registro por navegador, publicación y telemetría), límites y verificación. Aceptación: no afirma homologación, publicación ni operación productiva, y distingue la decisión de su implementación en TASK-403. Checks: revisión contra el diff del producto.
- S2. La decisión es localizable: fila ADR-21 en `docs/propuesta-arquitectura.md`, entrada `architecture/web-client` en `apps/starlight/content-map.mjs` y su barra lateral, nota de ampliación en el ADR-14 y la fila del glosario. Aceptación: la página se construye y los enlaces resuelven. Checks: `validate`, `typecheck`, `build`, `check`.
- S3. El contenido es apto para un repositorio público: sin IP, hosts, credenciales ni valores de despliegue. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-21 · status:done · evidence: `docs/decisions/web-client.md`
- [x] T2 · S2 · route:inline · Registrar la decisión en la tabla, el mapa de contenido, el ADR-14 y el glosario · status:done · evidence: `233cf7f`; fuentes del deck revisadas en `8f4dbb8` (L2)
- [x] T3 · S1,S2,S3 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:done · evidence: L2

## Log

- L1 · 2026-11-17 · Solicitud original, literal:

> si. haz todo lo necesario. la idea es ir desplegando la app por partes y que nuestro jefe pueda ver la app corriendo, conectarse a la db, etc. para el pos front no solo queremos desktop y app movil, tambien queremos web. nose si eso esta incluido en el roadmap o como tarea. sino hazlo e implementalo tambien

- L2 · 2026-11-17 · Sobre `8f4dbb8`, con Node 22.23.3:
  - `editorial:check`, `editorial:test` 28/28 y `odd:check` en verde.
  - `validate` (120 rutas alcanzables), `typecheck` (0 errores), `build` (122 páginas de la guía) y `check` (sin enlaces rotos) en verde.
  - Existen en `dist` las rutas `/guide/architecture/web-client/`, `/guide/architecture/native-clients/`, `/guide/glossary/` y `/guide/proposal/decisions/#adr-21`.
  - El build exigió revisar el deck de arquitectura porque cambió `docs/propuesta-arquitectura.md`. El deck no enumera ADR y lo que afirma de `pos-desktop` y `pos-mobile` sigue siendo correcto. No menciona `pos-web`: corresponde agregarlo cuando el producto integre TASK-403. `sources.json` se refrescó con `presentations/tools/review-sources.mjs`.
  - No se corrió `npm run verify` completo: falta, entre otros, `project:check`, que depende del snapshot del producto.
  - Revisión de agente; falta la revisión humana.
- L3 · 2026-11-17 · La CI de la PR #123 falló en `documentation`: la colección Excalidraw (`docs/diagramas-excalidraw/diagramas-c4-excalidraw.zip`) empaqueta todos los `docs/decisions/*.md` y no traía el ADR-21. Se regeneró con `python tools/diagrams/package-excalidraw.py`, igual que en la PR del ADR-22 (#124). Si las dos PR se integran, la segunda vuelve a regenerar el ZIP al resolver el conflicto.
