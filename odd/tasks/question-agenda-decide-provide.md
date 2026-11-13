# Decidir o aportar datos en la agenda de preguntas por rol

Objetivo: que **Preguntas abiertas por rol**, en `/project/questions/`, muestre a cada rol por separado lo que debe decidir y los datos que debe aportar. Así sirve de punto de partida para las reuniones con los involucrados de FOLLOWUP-017. Issue: https://github.com/developer-implementos/pos-platform/issues/356 (TASK-356).

Rama: `work/task-356-agenda-decidir-aportar`, rebasada sobre `873c799`.

Entrega: una PR a `main`, sin snapshots. El corte de POS Platform con pos-platform#357 lo importa el workflow Project import en su propia PR (ver L3). En ese corte, el catálogo de roles queda como propuesta, cambia FOLLOWUP-017 y Q-60 consulta también a Soporte.

Pruebas: `questions.test.mjs`, `project:test`, `portal:test`, `diagrams:test` y `npm run verify` completo, con `build` y `project:check` incluidos.

Espejo Engram: pendiente. El servidor MCP no conectó en esta sesión, así que esta ficha versionada es la fuente recuperable.

## Specs

- S1. **Separar decidir de aportar.** Cada fila de la tabla separa:
  - **Por decidir:** las reglas abiertas que el rol decide, en total y por prioridad (P1, P2 y P3).
  - **Datos por aportar:** los hechos abiertos que el rol confirma o para los que se le consulta.

  Un hecho figura en cada rol que tiene sus datos, y un rol que sólo aporta datos también aparece. Un rol que sólo se consulta sobre reglas no figura. Primero van los roles con más decisiones P1, después los que tienen más decisiones y más datos y, a igual cifra, por nombre.
- S2. **Cada cifra abre su lista.** Cada cifra abre la lista filtrada con su mismo criterio, para que no puedan discrepar:
  - las decisiones, por rol que decide, tipo regla, estado abierto y, si corresponde, prioridad;
  - los datos, por rol que participa, tipo hecho y estado abierto.

  El nombre del rol abre todo lo abierto en que participa. La vista agrega los filtros **Tipo** y **Rol que participa**, que se combinan con los demás y se guardan en la URL.
- S3. **Un hecho se confirma, no se decide.** En un hecho, la tarjeta muestra **Quién confirma** y **Aportan datos** en vez de **Quién decide** y **Se consulta a**.
- S4. **Los roles son una propuesta.** La tabla y la documentación dicen que los roles son el catálogo del registro, una propuesta que el negocio aún debe confirmar (FOLLOWUP-017). Se excluyen las hojas por rol para cada reunión, porque se basarían en roles sin confirmar.

## Tasks

- [ ] T1 · S1,S4 · route:inline · `agenda` y `participants` en `portal/questions.mjs`, con sus pruebas · status:in_progress · evidence: `questions.test.mjs` 21/21, con un hecho que cuenta en el rol que lo confirma y en el consultado, y desempates por decisiones, datos y nombre
- [ ] T2 · S1,S2,S3 · route:inline · Tabla, filtros **Tipo** y **Rol que participa**, atributos de cada tarjeta, etiquetas del hecho, estilos y pruebas · status:in_progress · evidence: `project-view.test.mjs` 27/27 y `project.test.mjs` 15/15
- [ ] T3 · S2 · route:inline · Comprobación de navegador y revisión visual a 1440, 1151 y 390 px · status:pending · evidence: pendiente de `build` y `project:check`
- [ ] T4 · S1,S2,S3,S4 · route:inline · `docs/project-progress.md` y el paquete Excalidraw · status:in_progress · evidence: `package-freshness.test.mjs` aprobado tras regenerar el ZIP con `tools/diagrams/package-excalidraw.py`

## Log

- L1 · 2026-11-13 · Solicitud original, literal. A la propuesta de separar «por decidir» de «datos por aportar», mostrar cada hecho en los roles que tienen el dato y preparar una hoja por rol para cada reunión, el responsable respondió:

> haz todas tus recomendaciones. no hagas una hoja por rol de momento porque eso son solo suposiciones. no sabes si esos son los roles reales aun.

- L2 · 2026-11-13 · Antes de cambiar la vista, la sesión que la construyó en pos-docs #98 confirmó que no tenía trabajo en curso sobre estos archivos. Dejó tres advertencias:
  - la comprobación de navegador debe seguir cada cifra nueva hasta su lista;
  - la grilla de filtros sólo cabe seis selectores;
  - el móvil depende de `.project-agenda-table tbody th:first-child`.

  Con ocho selectores, la grilla pasa a dos filas de cinco a partir de 1151 px, sin tocar la regla base que comparte la página de reglas. En móvil, «Datos por aportar» ocupa su propia fila.

- L3 · 2026-11-13 · pos-platform#357 se integró en `2eaf8f6`. Esta rama llegó a importar ese corte en un commit local sin publicar. La sesión que mantiene la importación automática avisó que despachaba el workflow Project import (TASK-283), que abre su propia PR con los snapshots. Para no abrir dos PR de importación, se retiró ese commit y se retiró T5. Esta PR queda sólo con la vista, que funciona con cualquiera de los dos cortes, y la importación de `2eaf8f6` llega por la PR del workflow.
