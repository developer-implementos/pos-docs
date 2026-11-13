# Autoría de diagramas de POS Platform

Este directorio pertenece al repositorio editorial **POS Docs**. Sus modelos, escenas y fuentes se revisan junto a la arquitectura en `docs/`; el software operativo pertenece a **POS Platform**. Las presentaciones consumen una revisión fijada de los derivados; no mantienen otra fuente editable de estos diagramas.

## Fuentes y salidas

| Responsabilidad | Ubicación |
| --- | --- |
| Identidades, contratos, relaciones y fronteras C4 | `models/c4-data.js` |
| Inventario publicado, nombres permanentes y tipo de cada vista | `collection.json` |
| Texto y conexiones de las vistas estructurales | `../../docs/diagramas-excalidraw/mermaid/c4-*.mmd` |
| Geometría SVG revisada, derivada de esas vistas | `models/c4-layouts.json` |
| Participantes y pasos de precios y venta | `models/dynamic-data.cjs` |
| Composición de elementos nativos Excalidraw | `excalidraw-browser.js` |
| Rutas que evitan nodos y separación de etiquetas, derivadas de la geometría | `route-layout.js` |
| Escenas individuales, atlas, SVG, galería y distribución ZIP | `../../docs/diagramas-excalidraw/` |
| Recortes estructurales con procedencia y hashes | `../../docs/diagramas-excalidraw/previews/` |
| Conversión nativa draw.io, atlas y ZIP | `../../docs/diagramas-drawio/` mediante `export-drawio.py` |
| Bundles temporales, capturas y resultados | `../../tmp/diagrams/` |

`collection.json` es el inventario compartido por generación, validación, previews y exportación. Registra siete vistas estructurales —contexto, contenedores, sucursal, sincronización, despliegue, país y ERP— y dos dinámicas. Cada entrada vincula el ID del modelo con su nombre de archivo permanente; no se determina el tipo de vista a partir de su posición. Los nombres `01` a `09` y `00-atlas-completo` conservan los enlaces públicos.

El despliegue inicial F02 y su piloto F05 agrupan `pos-desktop`, `device-agent`, SQLite técnico y periféricos locales dentro del mismo puesto Windows. Los periféricos de red y el acceso móvil se distinguen como expansión F06: relaciones con `conditional: true` se dibujan discontinuas y conservan esa condición al exportar. Una instancia compartida certificada utiliza la misma aplicación `apps/device-agent`; no agrega otro proyecto ni convierte el servidor de sucursal en su ubicación predeterminada.

BullMQ es la librería elegida dentro de `country-api` y `erp-worker`, todavía no implementada. Los componentes C3 `countryQueue` y `erpQueue` no se muestran como nuevas aplicaciones C2. Sus almacenes obligatorios `countryJobStore` y `erpJobStore` pertenecen a fronteras de red distintas: país y red autorizada ERP. El Redis opcional `countryCache` es otra instancia. No se representan accesos Redis/SQL por WAN ni Redis obligatorio en sucursal. PostgreSQL conserva solicitudes, calendarios, outbox y resultados; relay y reconciliación reconstruyen jobs. Las comprobaciones semánticas verifican estas fronteras.

`c4-layouts.json` contiene las geometrías de las vistas estructurales registradas. Las geometrías son una salida revisada, no un lugar alternativo para editar contratos. Las vistas dinámicas se generan desde sus participantes y pasos.

Las escenas individuales y el atlas `.excalidraw` son editables. Una regeneración reemplaza esas escenas y los SVG: conservar y trasladar al modelo los cambios manuales que deban persistir antes de ejecutarla. Los cambios semánticos requieren actualizar coherentemente C4, Mermaid, flujos y notas; los controles geométricos no validan por sí solos la propuesta.

## Verificación sin instalaciones adicionales

Desde la raíz de **pos-docs**, usando Node compatible con el proyecto:

```sh
node tools/diagrams/render-c4.cjs --check
node tools/diagrams/check-excalidraw.cjs --static
node tools/diagrams/generate-architecture-previews.cjs --check
npm run diagrams:test
```

Estos comandos leen los modelos y artefactos versionados. No regeneran archivos, abren navegadores, descargan paquetes ni contactan sistemas externos. Comprueban inventario, contratos de nodos y relaciones, referencias nativas, bindings, fronteras, colisiones, contenido del atlas y procedencia de los recortes. Las aplicaciones deben coincidir con el catálogo del monorepo y tener su nombre visible; cada C3 identifica una aplicación y un proceso; sus componentes indican responsabilidades de código. Los participantes dinámicos conservan nombre, tipo y tecnología del catálogo C4. Estas comprobaciones no acreditan la ejecución del POS.

`diagrams:test` forma parte de `npm run verify` y del workflow `docs-quality.yml`. Ejecuta las pruebas de rutas y de selección de vistas: argumentos inválidos, colección incompleta y geometrías conservadas obsoletas deben fallar sin sustituir artefactos. Las pruebas usan copias temporales y no requieren el runtime de Excalidraw ni Playwright. El build de Starlight continúa consumiendo los derivados versionados; no instala ni ejecuta los renderizadores.

El ajuste de rutas utiliza una cuadrícula de visibilidad ortogonal alrededor de los nodos. Conserva las geometrías de nodos, identidades, puntos de conexión y bindings; solo desvía conectores que atraviesan nodos ajenos. Las etiquetas conflictivas se sitúan junto a segmentos de su relación y conservan texto y agrupación. El algoritmo no cambia contratos ni sustituye la revisión visual; las pruebas comprueban determinismo, estabilidad y preservación de contenido.

## Regeneración deliberada

La herramienta de autoría usa su paquete y lockfile propios en `runtime/`; no se instala durante el build de Starlight ni del producto. Conserva las versiones que produjeron los artefactos y mantiene React/Excalidraw fuera de las aplicaciones operativas. El renderizador Mermaid fijado en este runtime es 11.12.1; las geometrías migradas se preservaron tal como estaban y cualquier regeneración requiere revisión visual.

```sh
npm ci --prefix tools/diagrams/runtime
npm ci --prefix apps/starlight
npm exec --prefix apps/starlight -- playwright install chromium
```

Usar Playwright instalado para Starlight o indicar su ruta con `PLAYWRIGHT_MODULE_PATH`. Por ejemplo, en PowerShell:

```powershell
$env:PLAYWRIGHT_MODULE_PATH = (Resolve-Path apps/starlight/node_modules/playwright).Path
node tools/diagrams/render-c4.cjs --write
node tools/diagrams/generate-excalidraw.cjs
node tools/diagrams/check-excalidraw.cjs
node tools/diagrams/generate-architecture-previews.cjs --verify
python tools/diagrams/package-excalidraw.py
python tools/diagrams/export-drawio.py
```

La colección ZIP empaqueta también los documentos de `docs/`, y el sitio la publica para descargar: cualquier cambio en ellos exige volver a ejecutar `package-excalidraw.py`. `tools/diagrams/package-freshness.test.mjs`, dentro de `npm run diagrams:test`, falla si alguna copia del ZIP difiere de su fuente.

Si solo cambian notas o contratos del modelo y la geometría permanece válida, no hace falta volver a renderizar Mermaid. `EXCALIDRAW_RUNTIME` permite usar otro directorio instalado con el mismo lockfile. La exportación nativa usa Arial para medir el texto de Helvetica; la verificación completa se realizó originalmente en Windows y necesita esas fuentes. No asumir equivalencia visual entre sistemas operativos sin revisar los resultados.

### Regenerar una sola vista

Cuando el cambio afecta únicamente al backend de sucursal, conservar las otras ocho escenas y sus SVG:

```powershell
node tools/diagrams/render-c4.cjs --write --view backend
node tools/diagrams/generate-excalidraw.cjs --view backend
node tools/diagrams/render-c4.cjs --check
node tools/diagrams/check-excalidraw.cjs
node tools/diagrams/generate-architecture-previews.cjs --verify
python tools/diagrams/package-excalidraw.py
python tools/diagrams/export-drawio.py
```

`--view` acepta un ID de `collection.json`. El renderizador Mermaid admite las vistas estructurales; las dinámicas se regeneran directamente con `generate-excalidraw.cjs`. Sin `--view`, ambos generadores conservan su comportamiento de regeneración completa. `--check` verifica siempre la colección completa y no se combina con `--view`.

La generación selectiva reemplaza sólo el layout y los archivos individuales de la vista elegida. Antes de generar, carga las escenas conservadas; una colección incompleta o una vista inválida produce un error. El atlas se recompone con las nueve escenas, usando sus dimensiones reales mediante la API oficial de Excalidraw. Los previews, draw.io y ZIP se derivan de esa colección completa. Si cambia un componente compartido o el diseño del renderizador, regenerar todas las vistas afectadas o la colección completa; seleccionar una vista no detecta automáticamente el alcance del cambio.

### Prueba de integración con los renderizadores

Después de instalar el runtime y Chromium indicados arriba, ejecutar:

```powershell
$env:PLAYWRIGHT_MODULE_PATH = (Resolve-Path apps/starlight/node_modules/playwright).Path
npm run diagrams:test:integration
```

Esta prueba ejecuta Mermaid y Excalidraw reales en una copia temporal. Comprueba que el backend se reemplaza, las otras ocho escenas y sus SVG permanecen idénticos byte por byte, los seis layouts ajenos se conservan y el atlas contiene los elementos, textos y bindings de las nueve vistas. No se ejecuta dentro del build de Starlight ni del control estático de CI. Si falta el runtime, el navegador o una dependencia, falla explícitamente; no omite la prueba. Ejecutarla al modificar los generadores, junto con la comprobación completa y la revisión visual de los derivados.

La comprobación completa reimporta cada escena y el atlas en el editor oficial y arrastra un nodo para comprobar sus conectores. El ZIP es una distribución derivada: regenerarlo cuando cambien los documentos incluidos. Incluye las fuentes Mermaid estructurales junto a escenas, SVG y documentos de referencia. La galería HTML y su README se mantienen aparte y no se sobrescriben al generar escenas.

La conversión a draw.io usa solamente la biblioteca estándar de Python y toma las escenas individuales registradas en `collection.json`. Valida inventario, referencias, preservación de texto y páginas al exportar. Es una salida alternativa editable; los cambios manuales en draw.io no regresan automáticamente a Excalidraw ni al modelo C4. Su README se conserva al regenerar los archivos y su ZIP.
