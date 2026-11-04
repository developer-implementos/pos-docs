# Verificación editorial desde equipos de desarrollo

Issue: https://github.com/developer-implementos/pos-platform/issues/161

Objetivo: conservar evidencia local de la verificación editorial del candidato sin consumir GitHub Actions. Rama: `codex/task-161-local-only-ci`. Entrega: una unidad editorial revisable, coordinada con T3 (S2/S4/S5) de la ficha `odd/tasks/local-only-ci.md` del producto. Test runner: Node test runner y `npm run verify` existente.

## Specs

- S1. Invocar el verificador canónico, sin duplicar su lista de suites; conservar logs, hashes de locks, HEAD limpio y estable y estados reales de ejecución. Fallos, interrupciones y comprobaciones ausentes no equivalen a éxito.
- S2. Separar la ejecución del candidato de la política editorial online desde una base confiable; no ejecutar operaciones GitHub ni acreditar atestación independiente. Mantener Actions deshabilitado y las protecciones vigentes.
- S3. Documentar instalación, ejecución, recuperación y límites de evidencia. La verificación editorial no prueba plataformas nativas; iOS permanece no ejecutado porque no hay Mac disponible.

## Tasks

- [x] T1 · S1,S2 · route:delegated · Implementar wrapper y pruebas negativas sin modificar otras worktrees · status:done · evidence: suite 15/15 aprobada con Node 22.23.3/npm 11.6.0; después de añadir rechazo de escrituras parciales de log, pruebas de procesos 4/4 aprobadas. Se cubren fuente, logs, fallo, timeout, interrupción y terminación no confirmada.
- [ ] T2 · S2,S3 · route:delegated · Documentar recorrido local y ejecutar comprobaciones pertinentes · status:in_progress · evidence: guía y enlaces listos; editorial 28/28, ODD 33/33 y gobernanza 3/3 aprobados; ejecución completa sobre commit limpio pendiente de coordinación.

## Log

- L1 · 2026-11-04 · Solicitud original:

> lo otro que me interesa es correr ci solo local. no nos permiten gastar mas minutos de gha desde jefatura.

- L2 · 2026-11-04 · El usuario eligió "CI local desde nuestros equipos" y "No tenemos Mac disponible". Ambas Actions están deshabilitadas según la coordinación de issue161. Esta unidad no cambia rulesets, publica estados, fusiona ni cierra issues.
- L3 · 2026-11-04 · Inicio desde POS Docs main `409f3d4` en una worktree nueva. El servidor Engram no está disponible en este cliente: espejo pendiente. `npm run verify` es la fuente de suites; la comprobación de recorridos declarados requiere además el cuerpo de la PR como dato local.

- L4 · 2026-11-04 · Wrapper implementado con dos etapas reales, manifiesto durable, hashes y rechazo de fuente/cuerpo/logs cambiados. Diez pruebas de integración aprobaron también con Node 22.23.3/npm 11.6.0. Editorial (28), ODD (33), gobernanza (3), editorial:check, odd:check y diff-check aprobaron en Node 22.17.1/npm 10.9.2; esa ejecución previa no acredita el entorno recomendado completo. La guía distingue credenciales en disco, declaración local, política online y ausencia de Mac. No se ejecutó todavía verify completo ni se atribuye evidencia a un commit limpio del cambio. Sin commit, push, publicación de estados ni cambios de protección.
- L5 · 2026-11-04 · El adaptador local de Engram resolvió esta worktree y el proyecto pos-docs; se abrió la sesión pos-docs-local-ci-20261104 y no existía espejo local-only-ci. Se usa para guardar la ficha completa y contrastar su lectura; esto no acredita que Codex tenga conectado el servidor MCP en su inventario de herramientas.
- L6 · 2026-11-04 · Corrección del protocolo: el agente derivó y registró por su cuenta la identidad de sesión indicada en L5; no fue suministrada por el runtime. Eso contradice la instrucción upstream vigente. Se conserva la historia y no se reutiliza esa identidad: las siguientes escrituras omiten session_id cuando no existe una identidad autoritativa disponible.
- L7 · 2026-11-04 · La revisión coordinadora pidió límites de tiempo/logs, terminación acotada y errores sin texto arbitrario. Se incorporan consulta real de versiones npm/Node, captura limitada a 32 MiB por etapa, timeout de 30 minutos, escalamiento de terminación y observación explícita del cierre del hijo. La consulta de versiones usa 15 segundos/64 KiB y no afirma compatibilidad semántica con engines. Las regresiones iniciales nuevas aprobaron 14 pruebas; una comprobación adicional detectó limpieza prematura del fixture Windows cuando no se observaba cierre, corregida sin presentar terminación no confirmada como éxito. La unidad supera la referencia de 400 líneas para conservar juntos el ciclo de procesos, pruebas negativas y límites documentados; no se divide artificialmente ni se omiten pruebas.
- L8 · 2026-11-04 · Con la corrección del fixture aprobaron 15/15 pruebas locales. El último ajuste rechaza escrituras parciales del log; se verificó con 4/4 pruebas de procesos, incluyendo timeout, fallo de spawn y terminación no confirmada. Todas estas ejecuciones usaron Node 22.23.3/npm 11.6.0. odd:check y diff-check siguen aprobados. Sin commit/push ni verify completo del candidato; el coordinador conserva la revisión y validación posterior del corte limpio. El espejo se actualiza sin session_id inventado y se contrasta mediante lectura completa.
- L9 · 2026-11-04 · Revisión coordinadora y suite final: 16/16 pruebas aprobadas, incluidas escrituras parciales y terminación no confirmada, con Node22.23.3/npm11.6. Se añade el procedimiento a AGENTS para ambos clientes de IA. La instalación nueva se interrumpió por carga local; para la verificación editorial se reutilizan dependencias existentes de otra worktree con el mismo hash de package-lock de Starlight, sin atribuir una instalación congelada nueva. La ejecución completa sobre commit limpio continúa como validación separada.
