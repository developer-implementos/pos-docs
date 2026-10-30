# POS Docs

Repositorio editorial público de POS Platform. Contiene el portal de recursos, Starlight, fuentes técnicas, diagramas y presentaciones Reveal.js. El código operativo pertenece a `developer-implementos/pos-platform`.

## Trabajo coordinado

El backlog de producto y sus responsables están en GitHub Issues de `developer-implementos/pos-platform`; leer su `CONTRIBUTING.md` y la ficha `delivery/specs/Fxx-xx.md` antes de cambiar un contrato o el alcance. Enlazar cada PR documental al issue del producto mediante URL completa. No cerrar el entregable desde un PR editorial ni atribuir aceptación de producto a la publicación de documentación. Una sesión de agente trabaja en una rama propia y deja decisiones, validaciones y bloqueos en el issue o PR, no sólo en el chat.

`docs/roadmap.json` define el alcance versionado. Cambiar IDs, aplicaciones o aceptación exige coordinar `delivery/backlog.json`, fichas, issues y registro de avance del producto; no mantener un segundo backlog manual aquí. Importar el avance sólo desde una revisión limpia y verificable, siguiendo `docs/project-progress.md`.

## Convenciones editoriales

- Mantener rutas públicas en inglés y contenido en español. Conservar `/guide/` y sus enlaces permanentes.
- `/` es el portal: `portal/catalog.json` registra las presentaciones y descargas. Publicar originales de `materials/` sólo cuando estén catalogados; no copiar indiscriminadamente el directorio. Ver `materials/README.md`.
- `docs/` contiene las fuentes canónicas. `apps/starlight/src/content/docs/` combina páginas manuales con carpetas generadas que no se editan ni versionan.
- El build público debe funcionar con este checkout y sus lockfiles, sin Angular, Nest, Nx ni repositorios vecinos.
- Separar el repositorio editorial de la evidencia del producto. Identificar revisiones y distinguir propuesta, implementación, evidencia e historia. No atribuir cambios sin commit a una revisión limpia.
- Los catálogos de sistemas legacy contienen nombres y propósitos, nunca credenciales ni valores de despliegue. No publicar archivos locales, `.env`, estados de herramientas ni datos personales.
- Mantener CSP, scripts externalizados y la excepción WASM limitada a Pagefind bajo `/guide/`.
- Las presentaciones resumen la documentación y enlazan sus fuentes. No introducir decisiones diferentes ni duplicar fuentes de diagramas; no migrar video o narraciones sin alcance explícito.
- Documentar la decisión vigente, sus responsabilidades y su estado de implementación. Evitar relatos de renombres, traslados y alternativas descartadas del propio proyecto; el historial de cambios pertenece a Git. Conservar antecedentes originales y análisis de compatibilidad legacy cuando sustentan una decisión.
- Validar contenido, Astro, build y enlaces/navegador antes de publicar. Los generadores de diagramas conservan modelos, escenas y derivados verificables.
- Los cambios de publicación no deben alterar servicios, credenciales ni operaciones corporativas.
