# Empezar una tarea

Este recorrido conecta la tarea del equipo con las instrucciones del repositorio, el entorno y las pruebas que le corresponden. Los comandos y las reglas de entrega se mantienen en **POS Platform**; esta página ayuda a encontrarlos.

## Ubicar el trabajo

Consulta el [próximo incremento](/project/plan/) y abre la issue enlazada. El panel conserva la fecha de su corte; confirma el estado, responsable y dependencias en GitHub antes de comenzar. Los [bloqueos y decisiones](/project/attention/) identifican las consultas externas y su siguiente acción.

Lee las [instrucciones de agentes](https://github.com/developer-implementos/pos-platform/blob/main/AGENTS.md) y el [procedimiento de contribución](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md) del checkout con el que trabajarás. Allí se definen asignación, rama o worktree, vínculo de PR, revisión y traspaso entre sesiones. Personas, Codex y Claude Code utilizan el mismo procedimiento.

La guía de [trabajo con Codex y Claude Code](/guide/implementation/agent-workflow/) explica cómo activar la skill compartida y mantener sus instrucciones sincronizadas.

Para una unidad sustancial, sigue [ODD](development-methodology.md) antes de implementar. La ficha enlaza la issue, conserva Specs/Tasks/Log y permite retomar el trabajo. La política de PR define las comprobaciones de trazabilidad; su resultado no sustituye revisar los criterios del cambio.

## Localizar el cambio

Empieza por el [recorrido de operación](/guide/flows/) afectado: cada ficha conecta diseño, contratos, código, datos y fallos. La [estructura del monorepo](/guide/implementation/monorepo/) sitúa las aplicaciones y bibliotecas; los [contratos HTTP](/guide/api/pos-platform/) y el [diccionario de datos con ERD](/guide/api/data-model/) permiten revisar sus fronteras. Las referencias de implementación muestran la revisión de código que describen.

## Preparar el entorno adecuado

| Trabajo | Punto de entrada |
| --- | --- |
| Administración y acceso de sucursal | [Incremento operativo F01](/guide/implementation/phase-1/#incremento-operativo-integrado), que enlaza la puesta en marcha con PostgreSQL, HTTPS y aprovisionamiento explícito. |
| Venta y recuperación | [Recorrido de venta F01](/guide/implementation/phase-1/#recorrido-de-venta-conectado), el [ambiente local y sus comprobaciones](/guide/implementation/phase-1/#ambiente-local-y-comprobaciones). |
| Cobros, fiscalidad o periféricos | [Corte F02](/guide/implementation/phase-2/): persistencia, protocolo, comprobaciones y límites de proveedores o equipos. |
| Interfaz con datos de ejemplo | [Ambiente local](/guide/implementation/phase-1/#ambiente-local-y-comprobaciones), que aprovisiona una sucursal igual que QA con una publicación comercial ficticia. |
| Empaquetado nativo | [Escritorio](/guide/implementation/desktop/) o [móvil](/guide/implementation/mobile/), según la aplicación. |

Las dependencias elegidas deben corresponder al comportamiento que se quiere verificar. El producto corre de una sola forma en local, CI, QA y producción ([ADR-25](/guide/architecture/single-operational-mode/)): los ambientes difieren sólo en configuración y datos, y los perfiles del cliente se describen en [F01](/guide/implementation/phase-1/#perfiles-del-cliente). La disponibilidad de un proveedor, una VPN o un equipo se confirma para la tarea; una prueba histórica de acceso no acredita acceso actual.

## Verificar y preparar la entrega

La [guía de pruebas](/guide/implementation/testing/) relaciona las suites con los componentes. Ejecuta los controles que exige el [procedimiento del producto](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md) y comprueba los criterios de la issue, incluyendo los escenarios de fallo del recorrido. Registra la revisión, los resultados y sus límites en la PR o issue.

Si cambia una responsabilidad, contrato, dato o comportamiento, utiliza el [procedimiento de fuentes documentales](/guide/reference/documentation-system/) para actualizar la fuente propietaria y regenerar sus vistas. Los diagramas, la presentación y el diccionario conservan sus fuentes compartidas.

El [procedimiento de contribución](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md) determina cuándo una PR es parcial o completa y cómo continuar desde otra sesión. La [metodología del avance](/guide/implementation/progress/) distingue verificación técnica, aceptación humana y habilitación operativa; conserva esa distinción al informar el resultado.
