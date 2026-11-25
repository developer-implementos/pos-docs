# Correcciones de los ADR-32 y ADR-33 tras el plan técnico

Objetivo: reemplazar «ver como» por diagnóstico, asistencia remota de solo vista y acceso temporal, y corregir lo que la consola puede afirmar.
Rama: `work/task-782-support-corrections`. Entrega: una PR editorial de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782); no acredita implementación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.

## Specs

- S1. El ADR-32 describe diagnóstico, asistencia remota y rol temporal, y por qué no «ver como». Checks: `npm run verify`.
- S2. El ADR-33 no afirma falta de conexión sin una señal, no envía comandos a la sucursal y describe la identidad provisional. Checks: `npm run verify`.
- S3. El ADR-31, la propuesta y el mapa de contenido dicen lo mismo. Checks: `npm run verify`.

## Tasks

- [x] T1 · S1,S2,S3 · route:inline · Corregir los ADR y sus índices · status:done · evidence: `docs/decisions/support-access.md`, `docs/decisions/operations-console.md`
- [ ] T2 · S1,S2,S3 · route:inline · Regenerar los derivados, verificar y abrir la PR · status:in_progress · evidence: en curso en esta rama.

## Log

- L1 · 2026-11-24 · Solicitud original del responsable, literal, ante la recomendación de reemplazar «ver como»:

> haz lo que me recomiendes como senior dev, arquitecto, ux/ui senior de una bigtech

Evidencia: el plan técnico sobre `779a12c4` de pos-platform. El país solo proyecta totales de ventas y el estado de las cajas; no hay canal hacia la sucursal; la bandeja de salida es inmutable; `country-api` no está desplegado en QA.
