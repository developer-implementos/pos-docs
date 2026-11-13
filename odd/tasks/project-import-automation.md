# Importación automática de los snapshots del producto

Objetivo: que el portal publique avance, seguimientos, planificación y preguntas de POS Platform sin una importación manual, conservando la revisión humana de cada corte. Issue: [TASK-283](https://github.com/developer-implementos/pos-platform/issues/283).
Rama: `work/task-283-project-import`, desde `57b1b2f68c3639fdbb17be0616229b4c114a231c`. Entrega: `ask-on-risk`, porque la App y su clave las configura el administrador de la organización.
Checks: `project-import:test`, `governance:test`, pruebas de los cuatro importadores, `release:test`, `editorial:check`, `odd:check` y una corrida local del plan contra un checkout limpio del producto. Espejo Engram pendiente: MCP no disponible.

## Specs

- S1. «implementa el paso 4 de forma enterprise-grade, sin parches y como lo harian las bigtechs»: el paso 4 es la importación a POS Docs. Una automatización debe abrir o actualizar la PR de importación cuando cambian los hechos del producto o de sus issues, desde una revisión limpia e inmutable de `main`, sin abrir PR vacías ni duplicadas.
- S2. La PR automatizada cumple la misma política editorial que una manual, incluidas las entradas del historial, sin excepciones en la política. Nunca se integra sola: la integra una persona.
- S3. Mínimo privilegio y defensa en profundidad:
  - una App propia, separada de la App de versiones;
  - un token por repositorio con los permisos que usa;
  - la clave en un environment limitado a `main`;
  - endpoints acotados y ningún código de PR ejecutado;
  - abortar ante una rama o PR que la App no creó.
- S4. Ningún contenido privado del producto llega a los logs públicos.
- S5. El calendario se activa de forma explícita y la importación manual sigue documentada como alternativa.

## Tasks

- [x] T1 · S1 · route:inline · Error tipado `StaleSnapshotError` en los cuatro importadores, con el mismo mensaje y CLI · status:done · evidence: tools/project-import/stale-snapshot.mjs; pruebas de los importadores 17, 8, 5 y 5 aprobadas
- [x] T2 · S1,S2 · route:inline · Orquestador de importación, generador de PR y validación previa con la política editorial · status:done · evidence: tools/project-import/snapshots.mjs, pull-request.mjs y run.mjs
- [x] T3 · S1,S3 · route:inline · Publicación idempotente por la API de Git con cliente acotado y control de propiedad · status:done · evidence: tools/project-import/github.mjs; project-import.test.mjs
- [x] T4 · S3,S5 · route:inline · Workflow con tokens por repositorio, environment, calendario opcional y pruebas de gobierno · status:done · evidence: .github/workflows/project-import.yml; tools/repository-governance.test.mjs
- [x] T5 · S5 · route:inline · Guía de operación y alta de la App, procedimiento y política actualizados · status:done · evidence: tools/project-import/README.md; docs/project-progress.md; .github/rulesets/README.md; AGENTS.md
- [x] T6 · S1 · route:inline · Primera corrida real con la App configurada · status:done · evidence: tras #104 (`873c799`, historia completa), la corrida [43494095568](https://github.com/developer-implementos/pos-docs/actions/runs/43494095568) abrió #105 desde un checkout limpio de POS Platform en `2eaf8f6`. GitHub atribuye su commit `c4565ed` a `implementos-pos-docs-import[bot]`, con firma verificada, y #105 se integró como `0c93314` (L6)

## Log

- L1 · 2026-11-11 · Solicitud directa del usuario. El paso 4 es la importación a POS Docs; el paso 1 (la alarma) se explicó y quedó fuera del alcance.

> si, implementa el paso 4 de forma enterprise-grade, sin parches ycomo lo harian las bigtechs. el paso 1 no lo entendi. para que la alarma?

- L2 · 2026-11-11 · Decisiones:
  - **App propia:** se usa una App separada de la de versiones porque la de versiones tiene bypass de revisión. Darle lectura del repositorio privado ampliaría su alcance.
  - **API de Git:** la rama se escribe mediante la API de Git, para no dejar credenciales en git y para que GitHub firme los commits de la App.
  - **Cambios reales:** la importación decide por los hechos, con el modo de sólo lectura de cada importador, porque la importación normal siempre renueva la hora de observación.
  - **Calendario opcional:** el calendario es opcional porque, sin App, cada corrida programada fallaría.
- L3 · 2026-11-11 · Riesgos:
  - **Lectura del producto:** la App puede leer el repositorio privado del producto. Se mitiga con permisos mínimos por token, el environment limitado a `main` y sin ejecutar código de PR.
  - **Base desactualizada:** si `main` de POS Docs avanza mientras una PR de importación está abierta, la corrida siguiente la recalcula sobre la base nueva.
- L4 · 2026-11-11 · La prueba de punta a punta contra `main` del producto (`23bc0a7`) mostró que los cuatro snapshots quedan desactualizados con cualquier commit del producto, porque registran su revisión. Sin una regla propia, la automatización abriría una PR por cada integración del producto. Ahora decide por los datos publicados, sin `source.revision` ni `issues.observedAt`. Si sólo avanzó la revisión, descarta lo escrito y conserva el corte; si cambian los datos de alguno, importa los cuatro a la misma revisión y el cuerpo distingue cuáles cambian.
- L5 · 2026-11-13 · El administrador creó la App, la instaló en los dos repositorios y cargó su Client ID y su clave en el environment `project-import`, limitado a `main`. La primera corrida manual obtuvo los dos tokens y falló en `git show 4b1eac0:docs/roadmap.json`: el importador de avance lee el roadmap que fija `delivery/progress.json` (`scope.revision`), un commit antiguo de POS Docs, y el checkout tenía profundidad 1. Las corridas locales nunca lo vieron porque usan clones completos. Reproducido con un clon superficial: falla el mismo `git show`, y con la historia completa la importación queda «snapshot current». El checkout de POS Docs pasa a `fetch-depth: 0`, como ya tenía el del producto, y la prueba de gobierno exige historia completa en los dos.
- L6 · 2026-11-13 · La segunda corrida manual, con la historia completa, abrió #105 con los hechos de pos-platform `2eaf8f6`: la próxima acción de FOLLOWUP-017 y los roles consultados de Q-60. Los otros tres snapshots sólo cambiaron de revisión. La autoría del commit creado por la API es `implementos-pos-docs-import[bot]`, con firma verificada, así que la verificación de propiedad de la rama sirve tal como está. Con autorización del responsable («dejalo asi entonces. activalo»), se creó la variable de repositorio `PROJECT_IMPORT_ENABLED=true` y el workflow corre cada hora, en el minuto 23.
