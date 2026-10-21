# Presentaciones de POS Platform

Esta carpeta organiza las presentaciones Reveal.js del producto por tema, siguiendo la separación usada en [integration-presentations](https://github.com/developer-implementos/integration-presentations).

La presentación detallada existente continúa disponible en [Propuesta de POS Platform](https://presentation-gamma-rust.vercel.app/reveal), con sus fuentes en [pos-architecture](https://github.com/floxcristian/pos-architecture). La extracción de Starlight no traslada todavía ese reproductor, sus animaciones, el asistente ni el narrador.

Al incorporar una presentación aquí:

- Mantener las fuentes en una carpeta temática, por ejemplo `architecture/`.
- Enlazar las decisiones canónicas de la guía y reutilizar los diagramas de este repositorio.
- Fijar la revisión del snapshot documental que utiliza; no obtener `main` mutable durante el build.
- Definir su build y sus pruebas de navegación, accesibilidad y recursos antes de añadirla al despliegue.
- Conservar el alcance de propuesta: las animaciones ilustran secuencias y no acreditan ejecución del sistema.

Por ahora Vercel publica Starlight. No hay una ruta local de diapositivas que se presente como terminada.
