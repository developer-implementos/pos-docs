# Presentación de la propuesta

La presentación de **arquitectura y roadmap de Implementos** se mantiene en `presentations/architecture/` de [**POS Docs**](https://github.com/developer-implementos/pos-docs). Abre con la portada «POS Platform» y organiza la propuesta en cinco capítulos: cada uno comienza con una portada que presenta su título y alcance, seguida de las láminas de detalle al bajar. Son 22 páginas: una portada general, cinco portadas de capítulo y 16 láminas de detalle, con notas y enlaces a las fuentes canónicas. El sitio ofrece también lectura continua, impresión y diagramas SVG ampliables.

<span id="pos-platform-presentación-web-interactiva"></span>
<span id="abrir"></span>
<span id="propuesta-en-revealjs"></span>
<span id="presentación-detallada-de-la-propuesta"></span>
<span id="mapa-de-repositorios"></span>

## Arquitectura y roadmap de Implementos

[Abrir la presentación](/presentations/architecture/) · [Lectura continua](/presentations/architecture/reading.html) · [Vista de impresión](/presentations/architecture/?print-pdf).

<span id="enfoque-de-la-propuesta"></span>

Incluye capacidades, contexto C4, monorepo, despliegue, infraestructura, desacoplamiento del ERP y seis fases de entrega funcional. Cada fase describe operación, construcción y aceptación. La secuencia se acuerda con el equipo, sin fechas comprometidas ni funcionalidades productivas implícitas.

<span id="alcance-de-la-evidencia"></span>

La presentación explica la arquitectura propuesta y distingue la base implementada del trabajo pendiente. Los diagramas resumen responsabilidades y contratos; no demuestran que las integraciones estén desplegadas. El [manual de arquitectura y roadmap](https://github.com/developer-implementos/pos-docs/blob/main/presentations/architecture/README.md) detalla los controles, las fuentes y el build.

<span id="arquitectura-c4-de-la-propuesta"></span>
<span id="profundizar-sin-repetir-el-recorrido"></span>

El [explorador general de arquitectura](/architecture/) complementa las láminas con un mapa de las seis aplicaciones, sus tecnologías, almacenes y conexiones. Conserva el alcance de propuesta y enlaza los [contratos y vistas C4](/guide/architecture/c4-model/).

## Recorrer la presentación

Los controles nativos de Reveal.js están abajo a la derecha: `←` y `→` recorren la portada general y las portadas de capítulo; `↑` y `↓` recorren las láminas y fragmentos dentro de cada capítulo. `Espacio` sigue el orden completo, incluidas las portadas, y `Shift` + `Espacio` retrocede. `I` abre el índice, `N` las notas y `O` la vista general.

«Ampliar diagrama» o `D` abre el SVG de la lámina con controles de zoom, encuadre y descarga. El recorrido del monorepo y las dos vistas del roadmap usan fragmentos; sus enlaces conservan el paso seleccionado. El reproductor respeta la preferencia de movimiento reducido.

«Recursos» reúne pantalla completa, documentación y acceso al portal; en móvil también incluye las notas.

La [lectura continua](/presentations/architecture/reading.html) presenta primero «POS Platform» y agrupa las 16 láminas de detalle bajo los cinco títulos de capítulo, sin depender de la navegación JavaScript. La [vista de impresión](/presentations/architecture/?print-pdf) prepara las 22 páginas, incluidas la portada general y las de capítulo, para imprimir en Chrome/Chromium con fondos y sin márgenes.

<span id="decisiones-de-diseño"></span>

## Editar el contenido

Los cambios de arquitectura se realizan primero en las fuentes de POS Docs y después se reflejan en las diapositivas, notas y diagramas que las resumen. Las afirmaciones sobre implementación conservan la revisión del producto que las sustenta.

| Fuente | Responsabilidad |
| --- | --- |
| `presentations/architecture/deck.json` | Capítulos, textos, posiciones, diagramas resumidos, notas y enlaces de las láminas |
| `docs/monorepo.md` | Estructura acordada que alimenta el recorrido del monorepo |
| `docs/roadmap.json` | Fases, resúmenes y criterios compartidos por Starlight, Reveal y lectura continua |
| `presentations/architecture/theme.css` y `player.js` | Diseño y comportamiento del reproductor |
| `presentations/tools/palette.mjs` | Colores compartidos por el reproductor, las láminas y los SVG |
| `presentations/architecture/sources.json` | Revisión de las fuentes documentales y hashes revisados |

El [modelo C4 detallado](/guide/architecture/c4-model/) conserva sus propias vistas y alcance. Los SVG de la presentación se generan desde `deck.json`; no se editan en `dist/`.

<span id="desplegar-en-vercel"></span>

El build genera `/presentations/architecture/` con recursos locales y scripts externalizados bajo la CSP del portal. Cuando cambia una fuente canónica, revisar su síntesis antes de actualizar la revisión y los hashes de `sources.json`; el build rechaza discrepancias. El [mantenimiento de la documentación](/guide/reference/maintenance/) explica la publicación conjunta de Starlight, Reveal y el portal.

## Verificar

Desde la raíz de POS Docs, con las dependencias instaladas:

```sh
npm run presentations:test
npm run build
npm run presentations:check
npm run roadmap:check
```

Estas comprobaciones cubren la generación de diagramas, la navegación por capítulos y fragmentos, los enlaces, la lectura, la impresión y la correspondencia del roadmap. Revisar además que los textos y diagramas expliquen la misma decisión. `npm run verify` ejecuta las comprobaciones del sitio completo antes de publicar.


## Material editorial con alcance propio

<span id="modo-narrador"></span>

El [narrador del material histórico](/guide/reference/narration-pipeline/) conserva su guion, audio y alcance; se consulta con la revisión de esa presentación.

<span id="video-público"></span>

El [video publicado y su producción](/guide/reference/video-publication/) son una entrega editorial con revisión propia.

<span id="atlas-y-materiales-anteriores"></span>
<span id="presentación-anterior-con-laboratorios"></span>
<span id="atlas-de-la-situación-actual-y-evolución"></span>

El [visor de aplicaciones y recorridos del antecedente](/guide/reference/explorer/) documenta su mapa de situación actual, simulaciones y controles.

<span id="asistente-para-preguntas"></span>

El [diseño de servicios de IA](/guide/architecture/ai/) describe las capacidades de asistencia propuestas y sus condiciones. La presentación no acredita un asistente habilitado ni una integración LLM productiva.
