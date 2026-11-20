# Errores con referencia, versión y arranque de los clientes

Objetivo: documentar en la guía de la API lo que ve la persona ante un fallo del cliente (código de referencia, aviso, módulo que no carga), cómo el cliente sabe que hay una versión nueva y cuándo recarga, y la pantalla de arranque fallido. Issue: https://github.com/developer-implementos/pos-platform/issues/458 (TASK-458). Responsable: floxcristian.
Rama: `work/task-458-errores-docs`. Entrega: una PR editorial coordinada con la PR del producto de TASK-458 (pos-platform#473), sin integrar. No cierra la issue del producto ni acredita integración, despliegue en QA ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad editorial acotada a una sección de una página, con ficha propia porque el control editorial no puede leer la ficha del producto, que vive en un repositorio privado.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/api.md`, sección de fallos de los clientes conectados, agrega dos subsecciones. «Lo que ve la persona»: el código de referencia, el aviso de error no controlado y el módulo que no carga. «Versión del cliente»: la identidad del artefacto, la comprobación de `pos-web`, la recarga que espera el trabajo en curso, escritorio y móvil, y la pantalla de arranque fallido. Aceptación: coincide con la ficha `odd/tasks/client-errors-and-releases.md` de pos-platform#473, deja claro que `client-failure-v1` no cambia y no afirma despliegue. Checks: revisión contra esa ficha.
- S2. La colección de Excalidraw empaqueta la página actualizada. Checks: `python tools/diagrams/package-excalidraw.py` y `npm run verify` (la CI `Documentation quality` de la PR).
- S3. El contenido es apto para un repositorio público: sin hosts, IP, cuentas ni valores de despliegue. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S2,S3 · route:inline · Redactar las subsecciones y regenerar la colección · status:done · evidence: `2e80ccd`
- [ ] T2 · S1,S2,S3 · route:inline · Verificar y abrir la PR · status:in_progress · evidence: la verificación local se interrumpió por un tiempo agotado del navegador en `architecture:check` (L2); la CI de la PR la repite.

## Log

- L1 · 2026-11-20 · Solicitud original del responsable, literal:

> faltan pantallas yo creo. se crítico. queremos una solucion enterprise-grade, sin parches y como lo harian las bigtechs

El alcance elegido fue «P0 y P1» de la auditoría pos-platform#451. Para la documentación, la sesión coordinadora pidió:

> si cambia un contrato o un comportamiento documentado en POS Docs, haz su PR editorial.

- L2 · 2026-11-20 · `npm run verify` sobre `2e80ccd` falló en `architecture:check`: `page.reload` agotó sus 10 s esperando `networkidle`, con el equipo cargado por compilaciones paralelas. Los pasos anteriores quedaron en verde. La CI de la PR, `Documentation quality`, repite la verificación completa en un runner alojado. Espejo Engram pendiente.
