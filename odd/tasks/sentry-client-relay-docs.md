# Documentación del relay de fallos de clientes y de la cuota gratuita de Sentry

Objetivo: que la guía de la API describa el reporte de errores que implementa TASK-148, incluyendo cómo se aprovecha la capa gratuita de Sentry sin exponer datos. Issue: https://github.com/developer-implementos/pos-platform/issues/148 (TASK-148). Responsable: @floxcristian.
Rama: `ccr-8c2439ee-blxowz`. Entrega: una PR editorial, que no cierra el entregable del producto ni acredita su aceptación.
La implementación está en las PR apiladas del producto [#151](https://github.com/developer-implementos/pos-platform/pull/151), [#152](https://github.com/developer-implementos/pos-platform/pull/152), [#153](https://github.com/developer-implementos/pos-platform/pull/153) y [#154](https://github.com/developer-implementos/pos-platform/pull/154), todavía sin integrar. Su ficha de producto es `odd/tasks/client-error-relay.md` en pos-platform.
Pruebas: `editorial:check`, `editorial:test`, `validate`, `odd:check`, `skills:check` y, en el workflow, `verify` completo.
Clasificación: unidad sustancial, no inline. Documenta un contrato HTTP nuevo, variables de configuración y una recomendación operativa con cifras de un proveedor que cambian con el tiempo.
Espejo Engram: pendiente. La herramienta no está disponible en esta sesión; la ficha versionada es la fuente recuperable.

## Specs

- S1. La sección «Reporte opcional de errores con Sentry» de `docs/api.md` debe describir lo que el código de las PR del producto hace:
  - El presupuesto por proceso, con sus variables y límites exactos.
  - El sobre `client-failure-v1` y sus campos.
  - `POST /api/v1/telemetry/client-failures` con sus respuestas 200, 401 y 422.
  - El tope por instalación y las variables `BRANCH_API_CLIENT_SENTRY_*`.
  - Los sourcemaps con Debug IDs.

  Aceptación: cada variable, valor por defecto, rango, código y comando citado coincide con el código y las pruebas de esas ramas.
- S2. La configuración recomendada de la capa gratuita debe citar las cifras del plan Developer con su fecha de consulta y separar lo que el producto implementa de lo que se configura en la interfaz de Sentry. No debe presentar como conectado un proyecto que no existe. Aceptación: fecha y fuente visibles; productos excluidos (traces, replays, logs y métricas) con su motivo.
- S3. La página conserva su ruta `/guide/implementation/api/` y el ancla `#reporte-opcional-de-errores-con-sentry`. Aceptación: `Reader-Journeys` y el build de Starlight validan la ruta.

## Tasks

- [x] T1 · S1 · route:inline · Describir presupuesto, relay, endpoint y sourcemaps contra el código de las PR del producto · status:done · evidence: variables, rangos, respuestas y comandos contrastados con las ramas `ccr-8c2439ee-blxowz-sentry-*`
- [x] T2 · S2 · route:inline · Redactar la configuración recomendada del plan Developer con fecha y fuente · status:done · evidence: plan consultado en sentry.io/pricing el 2026-11-04; productos excluidos con su motivo
- [ ] T3 · S3 · route:inline · Validar ruta, ancla y build en el workflow de calidad · status:pending · evidence: pendiente de `docs-quality` en la PR

## Log

- L1 · 2026-11-04 · Solicitud original, literal:

> Ayúdame a implementar sentry y test-Sprite de forma enterprise grade, sin parches y como lo harían las bigtechs. Considera que solo usaremos la capa gratuita de ambos así que sería aplicar la mejor práctica para aprovechar la capa gratuita al máximo de ambas.

- L2 · 2026-11-04 · La PR editorial declaró primero la ficha del producto mediante una URL fijada a `b72df7a`. `editorial-policy` respondió HTTP 404 porque el token de POS Docs no puede leer el repositorio privado del producto. Se sigue el patrón de la PR #27: ficha editorial local para la unidad documental, con enlace a la ficha y a las PR del producto.
