# Fuentes y mantenimiento del conocimiento del POS

POS Docs reúne la explicación del sistema y sus fuentes. Starlight organiza la lectura; Archify permite explorar vistas; Reveal.js presenta una selección de la misma arquitectura. Los [recorridos de operación](/guide/flows/) conectan esos materiales con contratos, código y evidencia.

## Una fuente por responsabilidad

| Información | Fuente mantenida | Consumidores |
| --- | --- | --- |
| Decisiones y alcance objetivo | Documentos canónicos de `docs/` en POS Docs | Starlight y referencias de las vistas |
| Aplicaciones, relaciones y recorridos propuestos | Modelos compartidos de `tools/diagrams/` y `tools/architecture/` | SVG, Archify y Reveal.js |
| Estados de operación | Predicados del producto y proyecciones revisadas en `tools/architecture/lifecycles.mjs` | Vistas de estados con revisión, alcance y enlaces a cada predicado |
| Contratos HTTP implementados | Contratos y controladores de POS Platform | OpenAPI exportado, referencia de APIs y Apidog |
| Datos físicos implementados y significado | Migraciones aplicadas y `documentation/data-dictionary.json` del contexto propietario en POS Platform | Diccionario de datos de Starlight y fichas de las vistas Archify |
| Verificación técnica | Código, pruebas y registros de una revisión del producto | Evidencia enlazada y estado del portal |
| Trabajo y responsables | GitHub Issues de POS Platform | Enlaces desde recorridos y PR |
| Avance | `delivery/progress.json` del producto | Snapshot revisado del portal |

Las fuentes estructurales conservan IDs estables. La geometría, el tema y las rutas de presentación pueden variar por vista; no introducen otros nombres, contratos o conexiones. Un derivado se regenera desde su fuente. Si un dibujo editable necesita una corrección semántica, esa corrección debe volver al modelo antes de regenerar.

## Estado y procedencia

Cada publicación distingue **propuesta**, **implementación de una revisión** y **verificación de un escenario**. Una prueba tiene entorno, alcance y resultado; no concede automáticamente aceptación humana, homologación de proveedor ni habilitación productiva. Un nodo de la propuesta puede existir en código y mantener capacidades pendientes.

Los contratos y datos importados conservan repositorio, commit y hashes del artefacto. La documentación pública se construye desde archivos revisados en POS Docs: el build no consulta una rama mutable del producto ni accede a una base operativa. El esquema publicado describe estructura, no filas de clientes u operaciones. Los ejemplos usan datos sintéticos y los entornos/credenciales permanecen fuera del portal público.

Las referencias a una revisión anterior siguen siendo evidencia de esa revisión. Cuando cambia el contrato, se actualiza su snapshot y se revisan los recorridos afectados; no se reemplaza el SHA por el último commit sin verificar su contenido.

El [diccionario de datos](/guide/api/data-model/) reúne propósito de tablas, significado y uso de campos, tipos SQL, nulabilidad, valores predeterminados, ejemplos sintéticos y relaciones. El producto mantiene las descripciones junto a sus escritores y lectores; tipos, restricciones e índices proceden de PostgreSQL después de aplicar las migraciones. La exportación rechaza campos sin documentar y definiciones que ya no existen. Archify consume el mismo diccionario al seleccionar una tabla, sin mantener una segunda explicación.

Los ejemplos son valores por campo, no filas de prueba completas. Su validación comprueba tipos y precisión; no sustituye las pruebas de relaciones, triggers y reglas de negocio. Tokens y credenciales se omiten con una razón explícita. Las fuentes enlazadas permiten revisar el contrato completo de agregados JSON que no conviene abreviar. No editar `data/product-reference/database/schema.json` a mano: actualizar el catálogo de producto, exportar desde una revisión limpia e importar sus hashes.

## Cambio coordinado

1. La issue identifica el recorrido y la decisión o contrato que cambia. El agente y el desarrollador parten de las mismas fuentes enlazadas.
2. El PR declara impacto documental: contratos, datos, flujo, arquitectura o ninguno, con su motivo. Actualiza la fuente correspondiente y enlaza la PR editorial cuando afecta al otro repositorio.
3. Las comprobaciones exportan y validan los artefactos, referencias y vistas afectadas. Una diferencia de contratos o esquema exige revisión; no se corrige editando a mano la copia pública.
4. La revisión independiente comprueba comportamiento, límites y evidencia del recorrido. El [protocolo de comprensión](editorial/comprehension-validation.md) registra por separado si otra persona puede localizar y explicar ese cambio.
5. Se publica una revisión identificada. El resultado técnico y los pendientes quedan en la issue/PR; ninguna sesión necesita recuperar decisiones desde un chat privado.

Las entradas de agentes del producto comparten [AGENTS.md](https://github.com/developer-implementos/pos-platform/blob/main/AGENTS.md) y [CONTRIBUTING.md](https://github.com/developer-implementos/pos-platform/blob/main/CONTRIBUTING.md). El repositorio editorial mantiene sus reglas en [AGENTS.md](https://github.com/developer-implementos/pos-docs/blob/main/AGENTS.md). Mantener referencias compartidas evita copiar procedimientos distintos para cada herramienta.

La guía de [trabajo con Codex y Claude Code](agent-workflow.md) explica cómo usar `pos-delivery` para consultar esas fuentes, preparar una PR, registrar un bloqueo y traspasar la sesión. Su procedimiento se mantiene en POS Platform; POS Docs conserva una copia fijada por revisión y hashes, sin otro backlog ni política de avance.

## Apidog y presentaciones

Apidog consume el OpenAPI exportado en una sola dirección. Los cambios del contrato se revisan en POS Platform antes de sincronizarlo; los ejemplos, entornos internos y credenciales del equipo no se publican por importar una especificación. La conexión al proyecto de Apidog se realiza después de configurar el destino autorizado. Preparar un importador no acredita haber sincronizado una cuenta.

Reveal.js resume los mismos nodos y relaciones y enlaza su detalle. Starlight ofrece acceso a las vistas principales, recorridos y contratos; los formatos editables y exportaciones quedan como recursos secundarios. Una nueva vista se incorpora cuando responde una pregunta de trabajo que las existentes no resuelven, con fuente y responsable definidos.
