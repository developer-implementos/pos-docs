# POS Docs

Repositorio editorial público de POS Platform. Contiene Starlight, fuentes técnicas y diagramas; `presentations/` reserva la organización de presentaciones Reveal.js. El código operativo pertenece a `floxcristian/pos-platform`.

- Mantener rutas públicas en inglés y contenido en español. Conservar `/guide/` y sus enlaces permanentes.
- `docs/` contiene las fuentes canónicas. `apps/starlight/src/content/docs/` combina páginas manuales con carpetas generadas que no se editan ni versionan.
- El build público debe funcionar con este checkout y sus lockfiles, sin Angular, Nest, Nx ni repositorios vecinos.
- Separar el repositorio editorial de la evidencia del producto. Identificar revisiones y distinguir propuesta, implementación, evidencia e historia. No atribuir cambios sin commit a una revisión limpia.
- Los catálogos de sistemas legacy contienen nombres y propósitos, nunca credenciales ni valores de despliegue. No publicar archivos locales, `.env`, estados de herramientas ni datos personales.
- Mantener CSP, scripts externalizados y la excepción WASM limitada a Pagefind bajo `/guide/`.
- Las presentaciones resumen la documentación y enlazan sus fuentes. No introducir decisiones diferentes ni duplicar fuentes de diagramas; no migrar video o narraciones sin alcance explícito.
- Validar contenido, Astro, build y enlaces/navegador antes de publicar. Los generadores de diagramas conservan modelos, escenas y derivados verificables.
- Los cambios de publicación no deben alterar servicios, credenciales ni operaciones corporativas.
