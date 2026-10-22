# Arquitectura y roadmap · Implementos

16 diapositivas en español con la identidad de Implementos. Ruta tras el build: `/presentations/architecture/`.

## Uso

- Flechas o botones para avanzar. `O` abre la vista general de Reveal.js.
- `I` abre el índice y `N` las notas del expositor. Escape cierra el diálogo.
- Pantalla completa desde el botón o `F` cuando el navegador lo admite.
- «Lectura» ofrece todo el contenido como documento, sin depender del reproductor.
- «PDF» abre `?print-pdf`. En Chrome/Chromium imprimir como PDF, sin márgenes y con fondos. [Instrucciones de Reveal.js](https://revealjs.com/pdf-export/).
- «PowerPoint» descarga el archivo original de 16 diapositivas.
- «Ampliar diagrama» o `D` abre el diagrama de la lámina fuera del escalado de Reveal. Permite acercar, reducir, encuadrar y descargar el SVG. Las flechas y el desplazamiento actúan sobre el diagrama mientras está abierto; Escape lo cierra y devuelve el foco al control.

El reproductor respeta movimiento reducido. No activa reproducción automática, proveedores, voz, IA ni integraciones de negocio.

### Recorrido del monorepo

La diapositiva 4 tiene siete zonas: aplicaciones, negocio, interfaz, shared/backend, soporte común, código transitorio y entrega. Avanzar o retroceder recorre esas zonas mediante fragments de Reveal.js antes de cambiar de diapositiva. Los botones superiores permiten saltar directamente a una zona; el hash conserva el paso al recargar. El árbol se desplaza hacia las líneas resaltadas, con movimiento inmediato si el usuario prefiere movimiento reducido. No hay reproducción automática.

`../tools/monorepo.mjs` deriva carpetas, jerarquía y estados del bloque objetivo de `docs/monorepo.md`; añade descripciones breves y comentarios para exponer. La lectura continua incluye el árbol completo con estados. La impresión conserva el resumen estático en una sola página. El patrón de rangos procede de la [presentación de Integration Platform](https://github.com/developer-implementos/integration-presentations/blob/main/presentations/architecture/enterprise-integration-platform-detailed.md), adaptado al POS y a sus fuentes propias. [Fragments de Reveal.js](https://revealjs.com/fragments/).

## Fuentes y edición

| Archivo | Uso |
| --- | --- |
| `deck.json` | Textos, posiciones, diagramas editables, notas y enlaces por diapositiva |
| `theme.css` | Inter local, paleta y diseño de lectura y controles |
| `player.js` | Navegación Reveal.js, índice, notas y controles accesibles |
| `sources.json` | Revisión editorial base, hashes revisados y procedencia del PowerPoint |
| `assets/` | Logo suministrado y fuentes Inter con su licencia |
| `downloads/` | PowerPoint original trasladado, sin modificar su contenido |
| `../vendor/reveal/` | Reveal.js 5.1.0 con licencia MIT y manifiesto de integridad |
| `../tools/diagrams.mjs` | Deriva los SVG de las láminas marcadas con `diagram: true`, usando las posiciones y textos de `deck.json` |

El build es autónomo: usa Node, archivos de este repositorio y dependencias fijadas de Starlight. No necesita otro checkout, Python ni herramientas de PowerPoint. `npm run presentations:build` produce el HTML en `dist/`; no editar ese resultado. `npm run presentations:test` valida el generador SVG y `npm run presentations:check` verifica el reproductor en navegador. `npm run verify` comprueba el conjunto completo, incluidos Starlight y el portal.

El contenido proviene de la presentación revisada el 21-10-2026. La versión web actualiza el monorepo: `pos-docs` es un repositorio editorial separado de las seis aplicaciones operativas. El PowerPoint conserva la revisión original, identificada por SHA-256 en `sources.json`. Son revisiones documentales distintas, no exportaciones idénticas.

Los traslados a `shared/` y de las suites E2E siguen presentados como estructura objetivo. El roadmap es una propuesta para discutir con producto, operaciones y desarrollo, sin fechas ni implementación productiva implícitas. La evidencia del producto está fijada por `apps/starlight/src/data/product-evidence.json`.

Cuando cambien fuentes canónicas, revisar las diapositivas y actualizar explícitamente la revisión y hashes de `sources.json`. El build falla ante discrepancias para evitar que la presentación aparente resumir documentación todavía no revisada. No consultar una rama remota mutable ni actualizar hashes automáticamente durante el build.

Los diagramas de contexto, despliegue, infraestructura e integración se generan como SVG desde el mismo `deck.json` editable. El build usa Fontkit con las fuentes Inter locales para medir líneas y convertir las letras a trazados vectoriales: el SVG descargado conserva su tipografía sin cargar fuentes externas. No contiene imágenes raster ni `foreignObject`. Cada etiqueta conserva su texto accesible y la lectura continua ofrece los textos seleccionables junto al diagrama.

El visor amplía mediante dimensiones reales del SVG, fuera de la transformación global de Reveal. «Encuadrar» muestra el conjunto; para leer etiquetas pequeñas se puede acercar y desplazar el área. El formato vectorial evita perder resolución al ampliar, pero no vuelve legible por sí solo una lámina reducida a pocos píxeles.

Los modelos C4 detallados de referencia siguen en `tools/diagrams/` y sus escenas Excalidraw conservan su propio alcance. No se sustituyen automáticamente por los diagramas resumidos de esta presentación. Los SVG se regeneran durante `npm run presentations:build`; no editar los archivos derivados de `dist/presentations/architecture/diagrams/`.

Logo: [SVG indicado por el usuario](https://www.implementos.com.pe/assets/public/svg/logos/logo.svg). Colores y tipografía: Brand book Implementos 2026. [Configuración de Reveal.js](https://revealjs.com/config/).
