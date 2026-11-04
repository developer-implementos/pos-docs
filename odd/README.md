# Organic Driven Development en POS

El contrato se fija en [Gentle AI v4.3.1](https://github.com/Gentleman-Programming/gentle-ai/tree/v4.3.1), commit `2dba7784114fff57864519c4c0d067e952a8c98b`. ODD organiza el trabajo de una sesión; las [reglas de entrega](../CONTRIBUTING.md) conservan issues, responsabilidades, PR y progreso del equipo.

Los entrypoints del repositorio cargan las instrucciones originales de la [toolchain](../tools/odd/README.md). El workflow de política PR conecta su validador desde la base confiable; la activación remota requiere integrar esa base y observar su ejecución. Tener instrucciones versionadas no demuestra que todos los equipos hayan instalado o conectado las herramientas. El [revisor remoto](../tools/automated-review/README.md) está preparado y desconectado; su activación requiere autorización del proveedor y las comprobaciones documentadas.

## Elegir la unidad

Explorar antes de clasificar. Una corrección pequeña y comprendida admite ejecución inline. Un cambio sustancial, con incertidumbre relevante o que se retomará entre sesiones usa `odd/tasks/<feature-name>.md` **antes de implementar**. Una ficha puede abarcar PR coordinadas; cada una identifica el alcance que verifica. No crear un documento por archivo ni duplicar las 71 fichas del roadmap.

La ficha contiene:

1. Encabezado breve: objetivo, issue, rama, estrategia de entrega y test runner.
2. `## Specs`: S1, S2… con alcance, aceptación y checks; ejemplos y restricciones exactas. Enlazar contratos existentes. Identificar supuestos, no presentarlos como decisiones del cliente.
3. `## Tasks`: una línea por T#, referencias S#, ruta `inline` o `delegated`, estado y commit o evidencia RED/GREEN. Las tareas son pasos de esa unidad, no nuevas unidades de porcentaje.
4. `## Log`: L1 conserva literalmente la solicitud original. Añadir decisiones, correcciones y evidencia en entradas fechadas; no reescribir las anteriores. Si una solicitud contiene secretos, no versionarlos ni publicarlos: conservar sólo un alcance saneado confirmado y declarar esa limitación.

Los separadores de líneas T# y nombres de estado son convenciones de POS para validar los campos del autor; no se presentan como sintaxis obligatoria universal de ODD. Estados de ejecución de las líneas POS: `pending`, `in_progress`, `blocked`, `done`. Una línea completada exige evidencia real; no implica aprobación humana, merge, despliegue ni aceptación operativa. El validador comprueba forma y referencias, no demuestra que el pedido sea auténtico, que la clasificación sea adecuada ni que el código satisfaga una spec. Esas comprobaciones corresponden a la revisión.

## Memoria y continuidad

Guardar en Engram con proyecto del repositorio, topic `odd/<feature-name>/tasks`, el **documento completo y su ruta relativa**. Leer archivo y espejo al retomar; reconciliar diferencias usando las decisiones y evidencia más recientes, sin sobrescribir trabajo ajeno. Después de escribir, leer de vuelta ambos. Git y Engram no se actualizan atómicamente.

La ficha versionada es recuperable por el equipo. Engram es memoria local del desarrollador; no es otro tablero compartido y no se publica en POS Docs. Si no está disponible, registrar `espejo pendiente`, continuar lo independiente y sincronizar al recuperar acceso. No marcar memoria creada sin verificarla. No versionar `.engram`, autoridad privada de RDD, tokens ni transcripciones completas.

## Declaración y verificación

Toda nueva PR declara `ODD-Task: odd/tasks/<feature-name>.md`. Una PR editorial que comparte unidad con producto puede usar la URL `https://github.com/developer-implementos/pos-platform/blob/<SHA de 40 caracteres>/odd/tasks/<feature-name>.md`: debe ser accesible al validador y corresponde a una revisión inmutable. No sustituir el SHA por `main`.

Para un cambio pequeño: `ODD-Task: inline` y `ODD-Reason:` con el motivo concreto. La revisión decide si es proporcional; no usar inline para eludir una especificación necesaria. Ejecutar `npm run odd:test` y `npm run odd:check` para comprobar las herramientas, fichas locales, hashes y distribución. Los controles de PR ejecutan código de la base confiable y leen las fichas como datos; no ejecutan código de la rama autora. El historial de Log se contrasta con esa base, incluso para fichas modificadas que no se declaran como la unidad principal. Un control nuevo se activa después de observar rechazos y aprobación sobre una PR.

No reconstruir fichas ni aprobaciones de PR ya cerradas. Al retomar un trabajo abierto, crear la ficha del **alcance pendiente**, enlazar la evidencia previa y registrar cuándo se adopta ODD. Los porcentajes y aceptaciones históricas permanecen en sus fuentes.

## Verificar y revisar

Primero contrastar Specs con código y pruebas. Después utilizar RDD nativo para el candidato estable según la [toolchain](../tools/odd/README.md). Seguir STATUS y sus transiciones exactas; respetar el consentimiento para ese candidato. v2 no deja un recibo durable de aprobación: no fabricar `receipt.json`, tokens ni aprobaciones reutilizables. Un cambio posterior invalida la atribución al candidato anterior.

El [integrador de revisión remota](../tools/automated-review/README.md) se entrega sin autenticación configurada; su workflow debe mantenerse deshabilitado y no es un required check. Un check técnico, una revisión LLM, una aprobación de GitHub y la aceptación operativa son controles diferentes. Un revisor automático puede equivocarse; mantener las pruebas y revisión humana configuradas. Ningún mecanismo autoriza por sí solo operaciones reales, publicación, merge ni bypass.

Fuentes del autor: [ODD](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/docs/usage.md#organic-driven-development-odd), [enrutamiento y formato](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/internal/components/agentguidance/routing.go), [Engram](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/docs/engram.md), [RDD v2](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/docs/review-integration.md).
