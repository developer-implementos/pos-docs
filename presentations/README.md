# Presentaciones de POS Platform

Esta carpeta organiza las presentaciones Reveal.js del producto por tema, siguiendo la separación usada en [integration-presentations](https://github.com/developer-implementos/integration-presentations).

La presentación detallada existente continúa disponible en [Propuesta de POS Platform](https://presentation-gamma-rust.vercel.app/reveal), con sus fuentes en [pos-architecture](https://github.com/floxcristian/pos-architecture). La extracción de Starlight no traslada todavía ese reproductor, sus animaciones, el asistente ni el narrador.

Al incorporar una presentación aquí:

- Mantener las fuentes en una carpeta temática, por ejemplo `architecture/`.
- Enlazar las decisiones canónicas de la guía y reutilizar los diagramas de este repositorio.
- Fijar la revisión del snapshot documental que utiliza; no obtener `main` mutable durante el build.
- Definir su build y sus pruebas de navegación, accesibilidad y recursos antes de añadirla al despliegue.
- Conservar el alcance de propuesta: las animaciones ilustran secuencias y no acreditan ejecución del sistema.

## Arquitectura y roadmap de Implementos

La [presentación de 16 diapositivas](architecture/README.md) vive en `architecture/`. Incluye capacidades, contexto C4, monorepo, despliegue, infraestructura, frontera ERP y roadmap por funcionalidades. Su PowerPoint original está en `architecture/downloads/`.

```sh
npm run build
npm run presentations:check
npm run preview
```

Abrir `http://127.0.0.1:4207/presentations/architecture/`. El build publica Reveal.js, fuentes y logo locales con la CSP del portal, sin CDN ni llamadas a servicios de negocio. La lectura continua se ofrece en `reading.html`; las notas identifican fuentes canónicas. Para reconstruir solo las diapositivas: `npm run presentations:build`.

Cada presentación resume documentación identificada por revisión y hashes; sus diagramas son composiciones explicativas. Los modelos C4 canónicos siguen en `tools/diagrams/`. La secuencia del roadmap es una propuesta para acordar, sin fechas comprometidas.
