# Arquitectura y roadmap · Implementos

16 diapositivas en español con la identidad de Implementos. Ruta tras el build: `/presentations/architecture/`.

## Uso

- Flechas o botones para avanzar. `O` abre la vista general de Reveal.js.
- `I` abre el índice y `N` las notas del expositor. Escape cierra el diálogo.
- Pantalla completa desde el botón o `F` cuando el navegador lo admite.
- «Lectura» ofrece todo el contenido como documento, sin depender del reproductor.
- «PDF» abre `?print-pdf`. En Chrome/Chromium imprimir como PDF, sin márgenes y con fondos. [Instrucciones de Reveal.js](https://revealjs.com/pdf-export/).
- «PowerPoint» descarga el archivo original de 16 diapositivas.

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

El build es autónomo: usa Node, archivos de este repositorio y dependencias fijadas de Starlight. No necesita otro checkout, Python ni herramientas de PowerPoint. `npm run presentations:build` produce el HTML en `dist/`; no editar ese resultado. Para comprobar el conjunto usar `npm run validate`, `npm run typecheck`, `npm run build`, `npm run check` y `npm run presentations:check`.

El contenido proviene de la presentación revisada el 21-10-2026. La versión web actualiza el monorepo: `pos-docs` es un repositorio editorial separado de las seis aplicaciones operativas. El PowerPoint conserva la revisión original, identificada por SHA-256 en `sources.json`. Son revisiones documentales distintas, no exportaciones idénticas.

Los traslados a `shared/` y de las suites E2E siguen presentados como estructura objetivo. El roadmap es una propuesta para discutir con producto, operaciones y desarrollo, sin fechas ni implementación productiva implícitas. La evidencia del producto está fijada por `apps/starlight/src/data/product-evidence.json`.

Cuando cambien fuentes canónicas, revisar las diapositivas y actualizar explícitamente la revisión y hashes de `sources.json`. El build falla ante discrepancias para evitar que la presentación aparente resumir documentación todavía no revisada. No consultar una rama remota mutable ni actualizar hashes automáticamente durante el build.

Los diagramas HTML son transcripciones editables del PowerPoint y enlazan la documentación de la que derivan; los modelos C4 de referencia siguen en `tools/diagrams/`. La web mantiene texto seleccionable y no usa capturas como diapositivas.

Logo: [SVG indicado por el usuario](https://www.implementos.com.pe/assets/public/svg/logos/logo.svg). Colores y tipografía: Brand book Implementos 2026. [Configuración de Reveal.js](https://revealjs.com/config/).
