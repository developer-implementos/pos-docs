# Presentación de la propuesta

La presentación de **arquitectura y roadmap de Implementos** se mantiene en `presentations/architecture/` de **POS Docs**, junto al PowerPoint original de 16 diapositivas. Reveal.js resume la propuesta y enlaza sus fuentes. Esta guía pertenece al repositorio editorial [POS Docs](https://github.com/developer-implementos/pos-docs), separado del código de POS Platform. La presentación anterior con laboratorios, el explorador, los videos y el narrador continúan en pos-architecture.

## Arquitectura y roadmap de Implementos

[Abrir las 16 diapositivas](/presentations/architecture/) · [Lectura continua](/presentations/architecture/reading.html) · [Descargar PowerPoint original](/presentations/architecture/downloads/Implementos-POS-Platform-Arquitectura-y-Roadmap.pptx).

Incluye capacidades, contexto C4, monorepo, despliegue, infraestructura, desacoplamiento del ERP y seis fases de entrega funcional. Cada fase propone una demo al cliente, trabajo de desarrollo y criterio de salida. El orden y las fechas se acuerdan con el equipo; no acredita funcionalidades productivas.

La versión web refleja POS Docs como repositorio editorial separado. El PowerPoint descargable conserva la revisión original. Las fuentes y su revisión se describen en [el manual de arquitectura y roadmap](https://github.com/developer-implementos/pos-docs/blob/main/presentations/architecture/README.md).

Usar flechas para avanzar, `I` para el índice, `N` para notas y `O` para vista general. El modo lectura funciona sin navegación JavaScript. «PDF» abre la vista preparada para imprimir en Chrome/Chromium.

<span id="pos-platform-presentación-web-interactiva"></span>
<span id="abrir"></span>
<span id="asistente-para-preguntas"></span>
<span id="modo-narrador"></span>
<span id="enfoque-de-la-propuesta"></span>
<span id="atlas-y-materiales-anteriores"></span>

<span id="propuesta-en-revealjs"></span>

## Presentación anterior con laboratorios

[Abrir la presentación y el narrador](https://presentation-gamma-rust.vercel.app/presentation/pos-corporativo-reveal.html). Los laboratorios ilustran ventas, precios, sincronización e integración; no ejecutan servicios de negocio.

<span id="desplegar-en-vercel"></span>
<span id="video-público"></span>
<span id="presentación-detallada-de-la-propuesta"></span>
<span id="atlas-de-la-situación-actual-y-evolución"></span>

## Recorrer la presentación

La [guía canónica de la presentación](https://github.com/floxcristian/pos-architecture/blob/main/presentation/README.md#recorrer-la-presentación) describe sus modos y alcances. El [explorador del sistema](https://presentation-gamma-rust.vercel.app/presentation/index.html) conserva los recorridos de evidencia y antecedentes. Para leer el diseño vigente, comienza por la [visión general de POS Platform](/guide/overview/).

<span id="alcance-de-la-evidencia"></span>
<span id="profundizar-sin-repetir-el-recorrido"></span>
<span id="arquitectura-c4-de-la-propuesta"></span>

## Editar el contenido

La presentación de Implementos se edita en `presentations/architecture/deck.json`, con estilos en `theme.css` y controles en `player.js`. `sources.json` fija las fuentes revisadas y el hash del PowerPoint original. El build genera `/presentations/architecture/` con recursos locales y scripts externalizados bajo la CSP del portal.

Las fuentes de la presentación anterior viven en el [manual de pos-architecture](https://github.com/floxcristian/pos-architecture/blob/main/presentation/README.md#editar-el-contenido). Los cambios de arquitectura se registran primero en las fuentes de POS Docs. Las afirmaciones sobre implementación conservan además la revisión del producto que las sustenta.

## Verificar

Ejecutar `npm run build` y `npm run presentations:check` en POS Docs para verificar la presentación de Implementos. Las comprobaciones de Starlight se documentan en [Mantenimiento de la documentación](/guide/reference/maintenance/). El [manual de la presentación anterior](https://github.com/floxcristian/pos-architecture/blob/main/presentation/README.md#verificar) mantiene sus propias comprobaciones.

<span id="decisiones-de-diseño"></span>
<span id="mapa-de-repositorios"></span>
