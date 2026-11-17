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
- [ ] T3 · S1,S2,S3 · route:inline · Ejecutar las comprobaciones editoriales y de build, y abrir la PR · status:in_progress · evidence: pendiente

## Log

- L1 · 2026-11-17 · Solicitud original, literal:

> quiero desplegar el POS y sus componentes (apps y db) en algun servidor para que jefatura pueda ver el avance de las fases 1 y 2 y pueda hacer qa manual. que opinas?
- L2 · 2026-11-17 · Decisión del responsable (@floxcristian), recibida por la sesión coordinadora: dos ambientes desplegados (QA y producción), un solo modo de ejecución, QA sin datos personales reales, QA en el servidor on-prem del QA del legacy, despliegue manual con el workflow `Deploy` (`authorize`, `build`, `deploy`), topología de QA con TLS verificado y dos riesgos aceptados. La fuente técnica es la rama de pos-platform#408 en `25b28d0`.
- L3 · 2026-11-17 · Los dos riesgos aceptados se publican por nombre y se enlazan a la guía de operación del producto, sin su clase de debilidad: `AGENTS.md` prohíbe publicar la clase de debilidad de un componente concreto, y el servidor de QA es el del QA del legacy. Tampoco se publican puertos ni cuentas.
