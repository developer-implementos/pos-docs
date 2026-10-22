# Presentaciones de POS Platform

Esta carpeta organiza las presentaciones Reveal.js del producto por tema, siguiendo la separación usada en [integration-presentations](https://github.com/developer-implementos/integration-presentations).

El [portal público](https://pos-docs-starlight.vercel.app/) reúne las presentaciones de este repositorio. La presentación de arquitectura y roadmap se abre en [`/presentations/architecture/`](https://pos-docs-starlight.vercel.app/presentations/architecture/). El deck anterior de pos-architecture pertenece a otro repositorio y no forma parte del catálogo del portal.

Al incorporar una presentación aquí:

- Mantener las fuentes en una carpeta temática, por ejemplo `architecture/`.
- Enlazar las decisiones canónicas de la guía y reutilizar los diagramas de este repositorio.
- Fijar la revisión del snapshot documental que utiliza; no obtener `main` mutable durante el build.
- Definir su build y sus pruebas de navegación, accesibilidad y recursos antes de añadirla al despliegue.
- Conservar el alcance de propuesta: las animaciones ilustran secuencias y no acreditan ejecución del sistema.
- Registrar el acceso en `portal/catalog.json` después de integrar su build; el portal rechaza accesos cuyo artefacto no existe.

## Arquitectura y roadmap de Implementos

La [presentación de arquitectura y roadmap](architecture/README.md) vive en `architecture/`. Abre con la portada «POS Platform» y continúa con cinco capítulos, cada uno con su portada de título y alcance. Los capítulos reúnen 15 láminas de detalle sobre capacidades, contexto C4, monorepo, despliegue, infraestructura, frontera ERP y roadmap por funcionalidades. La presentación Reveal.js y su impresión tienen 21 páginas.

```sh
npm run build
npm run presentations:check
npm run preview
```

Abrir `http://127.0.0.1:4207/presentations/architecture/`. El build publica Reveal.js, fuentes y logo locales con la CSP del portal, sin CDN ni llamadas a servicios de negocio. La lectura continua se ofrece en `reading.html`; las notas identifican fuentes canónicas. Para reconstruir solo las diapositivas: `npm run presentations:build`.

Cada presentación resume documentación identificada por revisión y hashes; sus diagramas son composiciones explicativas. Los modelos C4 canónicos siguen en `tools/diagrams/`. La secuencia del roadmap es una propuesta para acordar, sin fechas comprometidas.
