# POS Docs

Documentación técnica pública de POS Platform: propuesta, decisiones, evidencia de los sistemas actuales, guías de implementación y diagramas. Starlight publica el portal en `/guide/`. Este repositorio también organiza las presentaciones Reveal.js del producto.

El código de las aplicaciones pertenece a [POS Platform](https://github.com/floxcristian/pos-platform). La documentación se mantiene aquí, sin instalar ni compilar Angular, NestJS, Tauri o Capacitor.

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `docs/` | Fuentes técnicas canónicas en Markdown, decisiones y recursos públicos |
| `apps/starlight/` | Portal, navegación, componentes, búsqueda y validaciones |
| `apps/starlight/src/data/` | Catálogos revisados y procedencia de la evidencia |
| `presentations/` | Organización de presentaciones Reveal.js y referencias vigentes |
| `tools/diagrams/` | Modelos, generadores y comprobaciones C4, Excalidraw y draw.io |
| `tools/export-documentation.mjs` | Snapshot documental derivado para consumidores como las presentaciones |
| `.github/workflows/` | Validación automática independiente del producto |

La separación de presentaciones y herramientas sigue la organización de [integration-presentations](https://github.com/developer-implementos/integration-presentations). Las decisiones técnicas del POS se editan en `docs/`; las diapositivas las resumen y enlazan, sin crear otra fuente normativa.

## Desarrollo local

Requiere Node.js 22.19 o posterior de la rama 22, o Node.js 24. CI utiliza Node.js 22.23.3 y npm 11.6.0.

```sh
npm run setup
npm run dev
```

Abrir `http://127.0.0.1:4207/guide/`. `setup` instala desde el lockfile de `apps/starlight`; el paquete raíz sólo agrupa comandos y no tiene dependencias propias.

```sh
npm run validate
npm run typecheck
npm run build
npm --prefix apps/starlight exec playwright install chromium
npm run check
npm run preview
```

`check` revisa enlaces, anclas, búsqueda, catálogos e interacciones bajo la CSP del despliegue. Los resultados se guardan en `test-results-docs/`. El artefacto publicable se genera en `dist/`; no se versiona.

## Evidencia y actualización

Las páginas distinguen propuesta, implementación, investigación e historia. La revisión de código que sustenta el catálogo se registra aparte de la revisión de este repositorio editorial. El build usa archivos versionados y no consulta `main` del producto ni repositorios vecinos.

La actualización de evidencia es una operación explícita sobre un checkout limpio del producto. Revisar los cambios del catálogo, los documentos afectados y los diagramas antes de registrar una nueva revisión. Los detalles están en [mantenimiento](apps/starlight/README.md).

## Vercel

Importar **`developer-implementos/pos-docs`**, usar la raíz del repositorio y preset **Other**. `vercel.json` define instalación, build, salida, cabeceras y rutas. Definir `PUBLIC_SITE_URL` con el origen HTTPS público elegido, sin `/guide/`, para los enlaces canónicos y el snapshot.

La entrada `/` redirige a `/guide/`. Las rutas documentales se conservan respecto de la ubicación anterior. No se necesitan claves del producto, acceso a repositorios legacy ni servicios corporativos. Consultar la [guía de publicación](docs/vercel.md).

El despliegue queda pendiente de importación por el equipo. Se puede reconectar el proyecto Vercel anterior a este repositorio para conservar su dominio. El monorepo de producto desactiva nuevos despliegues automáticos de su antigua guía; su último despliegue continúa disponible mientras se realiza el cambio.

Este repositorio es público: los catálogos de configuración describen nombres y propósitos, nunca valores de despliegue o credenciales. Los cambios documentales no regeneran narraciones ni audio automáticamente.

## Presentación de arquitectura y roadmap

`presentations/architecture/` mantiene la presentación de Implementos de 16 diapositivas, su PowerPoint original y las fuentes editables de Reveal.js. `npm run build` la incluye en `/presentations/architecture/` junto al portal; `npm run presentations:check` comprueba recursos, navegación, notas, impresión y lectura accesible. Tras el build, `npm run preview` permite abrir `http://127.0.0.1:4207/presentations/architecture/`.

El [manual de la presentación](presentations/architecture/README.md) explica la edición, las fuentes fijadas y la diferencia documental respecto al PowerPoint trasladado. La presentación anterior con laboratorios, video y narrador permanece en pos-architecture.
