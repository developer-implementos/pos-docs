# Correcciones del ADR-31 con lo aprendido al implementarlo

Objetivo: corregir el ADR-31 (caja tomada por la persona) con los hallazgos de la implementación y la decisión sobre los roles.
Rama: `work/task-782-adr31-corrections`. Entrega: una PR editorial de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782); no acredita implementación ni aceptación.
Test runner: `node --test` mediante los scripts del repositorio y el build de Starlight.

## Specs

- S1. La época de la tenencia crece por caja y no se reinicia con cada turno. Checks: `npm run verify`.
- S2. Los periféricos del equipo se distinguen de las capacidades de la aplicación, y su falta no impide tomar una caja. Checks: `npm run verify`.
- S3. El tablero incluye la caja retenida por un cierre. Checks: `npm run verify`.
- S4. Un rol por persona en cada sucursal, y valores provisionales de lo que queda en curso al cambiar de equipo. Checks: `npm run verify`.

## Tasks

- [x] T1 · S1,S2,S3,S4 · route:inline · Corregir el ADR-31 · status:done · evidence: `docs/decisions/register-tenure.md`
- [x] T2 · S1,S2,S3,S4 · route:inline · Regenerar los derivados, verificar y abrir la PR · status:done · evidence: `npm run verify` sale 0 en `2d7282a`

## Log

- L1 · 2026-11-24 · Solicitud original del responsable, literal, sobre los roles:

> no deberia poder tener roles distintos. o que opinas tu?

La pregunta previa fue si una persona puede tener roles distintos en cajas distintas de la misma sucursal. Las demás correcciones salen de la implementación: hallazgos L24 y L25 de `odd/tasks/register-tenure.md` de pos-platform.
