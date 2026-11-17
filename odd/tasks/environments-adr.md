# ADR de los ambientes QA y producción

Objetivo: registrar como ADR-22 la decisión de tener dos ambientes desplegados, QA y producción, con un solo modo de ejecución, QA on-prem y despliegue manual por GitHub Actions. Issue: https://github.com/developer-implementos/pos-platform/issues/402 (TASK-402). Responsable de la sesión: floxcristian.
Rama: `work/task-402-ambientes`. Entrega: una PR editorial coordinada con la PR del producto (pos-platform#408); no cierra la issue del producto ni acredita operación productiva ni aceptación de QA.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.
Clasificación: unidad sustancial, no inline. Introduce una decisión de arquitectura sobre ambientes, modo de ejecución y despliegue.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. `docs/decisions/environments.md` registra estado, decisión, ambientes, modo de ejecución único, datos de QA, topología de QA, despliegue, riesgos aceptados, relación con otras decisiones y verificación. Aceptación: no afirma operación productiva, aceptación de QA ni una corrida del workflow desde `main`; distingue la decisión de su implementación en TASK-402 y presenta el retiro del laboratorio y la demo (TASK-406) como consecuencia pendiente. Checks: revisión contra la guía de operación y la ficha del producto en `25b28d0`.
- S2. La decisión es localizable: fila ADR-22 en `docs/propuesta-arquitectura.md`, entrada `architecture/environments` en `apps/starlight/content-map.mjs` y su barra lateral, y la fila «Ambiente» del glosario. Aceptación: la página se construye y los enlaces resuelven. Checks: `validate`, `typecheck`, `build`, `check`.
- S3. El contenido es apto para un repositorio público: sin IP, hosts, cuentas, puertos, rutas de secretos, credenciales ni valores de despliegue. Los riesgos de seguridad aceptados se nombran sin su clase de debilidad y se enlazan a la guía del producto, según la regla de hallazgos de seguridad de `AGENTS.md`. Checks: revisión del diff completo.

## Tasks

- [x] T1 · S1,S3 · route:inline · Redactar el ADR-22 · status:done · evidence: `docs/decisions/environments.md`
- [x] T2 · S2 · route:inline · Registrar la decisión en la tabla de decisiones, el mapa de contenidos y el glosario · status:done · evidence: `docs/propuesta-arquitectura.md`, `apps/starlight/content-map.mjs`, `apps/starlight/src/content/docs/glossary.md`
- [x] T3 · S1,S2,S3 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:done · evidence: `082437f`; fuentes del deck revisadas en `705bdd6` (L4); ZIP de la colección reempaquetado en `1fbbbdd` y `npm run verify` completo en verde (L5)

## Log

- L1 · 2026-11-17 · Solicitud original, literal:

> quiero desplegar el POS y sus componentes (apps y db) en algun servidor para que jefatura pueda ver el avance de las fases 1 y 2 y pueda hacer qa manual. que opinas?

- L2 · 2026-11-17 · Decisión del responsable (@floxcristian), recibida por la sesión coordinadora: dos ambientes desplegados (QA y producción), un solo modo de ejecución, QA sin datos personales reales, QA en el servidor on-prem del QA del legacy, despliegue manual con el workflow `Deploy` (`authorize`, `build`, `deploy`), topología de QA con TLS verificado y dos riesgos aceptados. La fuente técnica es la rama de pos-platform#408 en `25b28d0`.
- L3 · 2026-11-17 · Los dos riesgos aceptados se publican por nombre y se enlazan a la guía de operación del producto, sin su clase de debilidad: `AGENTS.md` prohíbe publicar la clase de debilidad de un componente concreto, y el servidor de QA es el del QA del legacy. Tampoco se publican puertos ni cuentas.
- L4 · 2026-11-17 · Sobre `705bdd6`, con Node 22.23.3:
  - `editorial:check`, `editorial:test` 28/28 y `odd:check` en verde.
  - `validate` (120 rutas alcanzables), `typecheck` (0 errores), `build` (121 páginas) y `check` (24 124 enlaces, sin errores) en verde.
  - Existen en `dist` las rutas `/guide/architecture/environments/`, `/guide/glossary/` y `/guide/proposal/decisions/#adr-22`; `pr-check` y `journeys-check` validan el cuerpo de la PR.
  - El build exigió revisar el deck de arquitectura porque cambió `docs/propuesta-arquitectura.md`. El deck no enumera ADR y su flujo de entrega (QA y producción por país, misma versión aprobada y flota por anillos) sigue siendo coherente. `sources.json` se refrescó con `presentations/tools/review-sources.mjs`.
  - La propuesta y el deck nombran un anillo «laboratorio» antes de la tienda piloto; el ADR no lo redefine, porque los anillos pertenecen a F06-03.
  - No se corrió `npm run verify` completo: falta, entre otros, `project:check`, que depende del snapshot del producto.
  - Revisión de agente; falta la revisión humana.
- L5 · 2026-11-17 · El job `documentation` de la PR falló en `diagrams:test` (`package-freshness.test.mjs`): el ZIP publicado de la colección Excalidraw empaqueta `docs/*.md` y `docs/decisions/*.md`, y quedó sin el ADR-22. Se regeneró con `python tools/diagrams/package-excalidraw.py` en `1fbbbdd`. Sobre `1fbbbdd`, con Node 22.23.3, `npm run verify` completo terminó en verde, incluido `project:check`.
- L5 · 2026-11-17 · El ADR-21 se integró antes (`894d0d88`, pos-docs#123) y la rama se actualizó con `main` por merge. Resolución de los conflictos esperados:
  - Tabla de decisiones de `docs/propuesta-arquitectura.md`: quedan las filas ADR-21 y ADR-22, en ese orden.
  - Barra lateral de `content-map.mjs`: la entrada `architecture/web-client` de `main` y `architecture/environments` después de «Tecnología y despliegue».
  - El ZIP de Excalidraw se regeneró con ambos ADR y `presentations/architecture/sources.json` se refrescó con `review-sources.mjs` sobre el árbol limpio.
  - El ADR-22 enlaza ahora la página del ADR-21 (`web-client.md`) en vez de la PR.
