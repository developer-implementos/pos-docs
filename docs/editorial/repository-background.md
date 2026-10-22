# Repositorios y publicación

POS Platform y POS Docs tienen responsabilidades y entregas independientes. El código operativo se desarrolla en **POS Platform**; la documentación y las presentaciones se mantienen en [**POS Docs**](https://github.com/developer-implementos/pos-docs).

| Repositorio | Responsabilidad | Entrega |
| --- | --- | --- |
| POS Platform | Clientes Angular/Tauri y Angular/Capacitor, aplicaciones backend, workers y bibliotecas del producto | Artefactos de las aplicaciones y sus comprobaciones. La [guía del producto](../product-repository.md) describe comandos y alcance implementado. |
| POS Docs | Fuentes técnicas, documentación Starlight, diagramas, presentaciones Reveal.js y materiales de referencia | Sitio estático público: portal en `/`, guía en `/guide/` y presentaciones en `/presentations/`. |

<span id="consulta-de-los-antecedentes"></span>

## Fuentes y responsabilidades editoriales

En POS Docs, `docs/` contiene las decisiones y fuentes técnicas; `apps/starlight/` organiza su navegación y presentación; `tools/diagrams/` mantiene los modelos y generadores de diagramas; y `presentations/architecture/` contiene la presentación de arquitectura y roadmap. El catálogo `portal/catalog.json` identifica las presentaciones y los materiales publicados.

Cada tema tiene una fuente canónica. Starlight la organiza para consulta y Reveal resume la propuesta para exponerla al equipo. Los documentos originales de reuniones son fuentes de evidencia; sus conclusiones se integran en las páginas técnicas con procedencia explícita.

- [Objetivo y propuesta de arquitectura](../propuesta-arquitectura.md).
- [Mapa de repositorios y conexiones](../mapa-repositorios-y-conexiones.md).
- [Arquitectura actual de Chile y flujos](../vistas-arquitectura-y-flujos.md).
- [Evidencia de Mountain y su alcance](../analisis-repositorios/mountain-implementos.md).
- [Información pendiente de validación](../solicitud-informacion-equipo.md).
- [Mantenimiento de Starlight](../../apps/starlight/README.md).

## Publicación y revisión

El build de POS Docs genera `dist/` usando sus dependencias fijadas y los archivos del propio repositorio. No necesita ejecutar el producto ni acceder a sistemas corporativos. La [guía de Vercel](../vercel.md) describe la publicación del sitio; los clientes nativos y los servicios backend tienen su propia distribución.

Los cambios de propuesta se realizan en las fuentes canónicas y se reflejan en las vistas que las resumen. Las afirmaciones sobre código se contrastan con la revisión de POS Platform identificada en la evidencia del producto. Documentar una capacidad propuesta no acredita su implementación ni su validación productiva.

<!-- Stable deep links supported by this reference page. -->
<span id="pos-platform-para-chile-perú-y-españa"></span>
<span id="estado-del-documento"></span>
<span id="mapa-de-la-documentación"></span>
<span id="1-objetivo-y-alcance"></span>
<span id="2-sistemas-informados-por-país"></span>
<span id="evolución-prevista-del-erp"></span>
<span id="3-arquitectura-actual-de-chile"></span>
<span id="31-distribución-por-sucursal"></span>
<span id="32-venta-emisión-de-dte-y-registro-en-ax"></span>
<span id="33-sincronización-y-significado-de-los-estados"></span>
<span id="34-componentes-visibles-en-la-imagen"></span>
<span id="4-aplicaciones-y-tecnologías"></span>
<span id="5-persistencia-y-datos"></span>
<span id="6-ofertas-situación-actual-y-requisito"></span>
<span id="7-estandarización-y-desacoplamiento-a-evaluar"></span>
<span id="8-información-pendiente-para-la-propuesta"></span>
<span id="9-fuentes"></span>
<span id="10-mantener-y-verificar-este-material"></span>
<span id="ampliación-repositorios-y-concentrador-central"></span>
