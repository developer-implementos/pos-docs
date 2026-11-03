# Sincronización del skill de entrega

POS Platform mantiene la fuente en `.agents/skills/pos-delivery/`. La copia exacta de `.claude/skills/pos-delivery/` se genera para Claude Code. Ambos directorios contienen exclusivamente `SKILL.md` y `agents/openai.yaml`; no requieren enlaces simbólicos ni configuración personal.

```sh
node tools/agent-skills/sync.mjs --check
node tools/agent-skills/sync.mjs --write
node --test tools/agent-skills/sync.test.mjs
```

Sin argumentos se ejecuta `--check`, sin cambios ni acceso a red. `--write` local sólo regenera el espejo de Claude desde la fuente. Las comprobaciones rechazan archivos ausentes, adicionales, enlaces simbólicos/junctions y diferencias de bytes. Los repositorios fijan LF mediante `.gitattributes`, incluso con `core.autocrlf=true`.

La fuente exige frontmatter exclusivamente con `name: pos-delivery` y `description` no vacía, ambos como cadenas en una línea. Se admiten cadenas simples o entre comillas; se rechazan campos adicionales, referencias, valores estructurados y bloques multilínea. No se interpreta YAML arbitrario. Validar la estructura no acredita el comportamiento del agente: las evaluaciones de lectura, decisión y traspaso son independientes.

## Importación editorial

Desde la raíz de POS Docs, importar una revisión limpia, revisada y confirmada de POS Platform:

```sh
node tools/agent-skills/sync.mjs --source ../pos-platform --revision SHA_COMPLETO_DE_40_CARACTERES --write
```

Para la primera importación puede invocarse el `sync.mjs` del checkout del producto conservando POS Docs como directorio de trabajo. La herramienta identifica el destino mediante `package.json.name`, nunca mediante rutas personales. El checkout fuente debe estar limpio, su `HEAD` debe ser exactamente el SHA indicado y `origin` debe identificar `developer-implementos/pos-platform` por HTTPS o SSH. Esta comprobación verifica la identidad configurada, no sustituye la revisión del origen o de sus commits.

La importación sólo lee blobs de Git de una lista explícita: los dos archivos del skill y `sync.mjs`, `sync.test.mjs`, `README.md` de esta carpeta. No ejecuta código de la fuente, no ejecuta hooks ni consulta servicios. Copia la fuente, su espejo y estas herramientas, y escribe `source-lock.json` con revisión, repositorio y SHA-256 por archivo. La allowlist y los paths del manifiesto no admiten extensiones arbitrarias ni recorridos fuera de los directorios administrados.

La verificación posterior en POS Docs es completamente offline: contrasta su fuente y herramientas contra el lock, y su espejo contra la fuente. `--write` local puede reparar sólo el espejo; no puede legitimar cambios locales en la fuente o en las herramientas. Actualizar el contenido exige otra importación explícita desde el producto. El lock fija procedencia e integridad, pero no certifica decisiones, pruebas, permisos ni porcentajes.

Toda la entrada y los destinos se validan antes de escribir. No se borran archivos extra ni se resuelven conflictos automáticamente. Una interrupción de disco durante la copia puede dejar una importación incompleta: `--check` la rechaza; revisar el diff y repetir la misma importación válida para recuperarla. No se anuncia atomicidad entre múltiples archivos. Revisar y confirmar juntos fuentes, espejo, herramientas y lock en la PR editorial.

Los tests crean repositorios temporales aislados y comprueban drift, importación fijada, identidad y limpieza del origen, entradas inválidas sin escrituras, archivos faltantes/adicionales, symlinks/junctions, comprobación sin checkout vecino y clones con autocrlf. No acceden a GitHub, no ejecutan builds ni modifican issues, progreso, estados o reglas de integración.
