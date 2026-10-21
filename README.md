# POS Docs

Centro público de documentación de POS Platform: [abrir portal](https://pos-docs-starlight.vercel.app/). Reúne la guía Starlight, las propuestas de este repositorio y las fuentes originales de reuniones y antecedentes. Las síntesis se identifican y enlazan sus documentos relacionados.

El código de las aplicaciones pertenece a [POS Platform](https://github.com/developer-implementos/pos-platform). La documentación se mantiene aquí, sin instalar ni compilar Angular, NestJS, Tauri o Capacitor.

| Acceso público | Contenido |
| --- | --- |
| [`/`](https://pos-docs-starlight.vercel.app/) | Punto de entrada y catálogo de materiales |
| [`/guide/`](https://pos-docs-starlight.vercel.app/guide/) | Documentación técnica Starlight |
| [`/presentations/architecture/`](https://pos-docs-starlight.vercel.app/presentations/architecture/) | Arquitectura y roadmap en Reveal.js |
| [`/#materials`](https://pos-docs-starlight.vercel.app/#materials) | Fuentes de reuniones y cuestionarios, filtrables por país y formato |
| [`/guide/evidence/country-comparison/`](https://pos-docs-starlight.vercel.app/guide/evidence/country-comparison/) | Síntesis comparativa aportada de Chile, Perú y España |

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `docs/` | Fuentes técnicas canónicas en Markdown, decisiones y recursos públicos |
| `apps/starlight/` | Guía Starlight, navegación, componentes, búsqueda y validaciones |
| `portal/` | Portada estática, catálogo de recursos, filtros y comprobaciones |
| `materials/` | Nuevos originales de reuniones, publicados sólo mediante el catálogo |
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
npm run presentations:check
npm run portal:test
npm run portal:check
npm run preview
```

`dev` sirve la guía Starlight. Para revisar el sitio completo, ejecutar `build` y `preview`, y abrir `http://127.0.0.1:4207/`. `npm run verify` ejecuta la validación completa. Los resultados y capturas se guardan en `test-results-docs/`, `test-results-presentations/` y `test-results-portal/`. El artefacto publicable se genera en `dist/`; no se versiona.

## Incorporar fuentes y materiales

Seguir [materials/README.md](materials/README.md): añadir el original y registrar su metadata en `portal/catalog.json`. El catálogo distingue país y función editorial, independientemente del formato. Admite PPTX, DOCX y PDF; no publica carpetas enteras ni inventa fechas de reunión. Arquitectura y roadmap, tanto en Reveal.js como en PowerPoint, aparece sólo bajo **Propuestas**. Las fuentes recibidas se conservan intactas; las síntesis y las decisiones se documentan en `docs/` con su alcance.

## Evidencia y actualización

Las páginas distinguen propuesta, implementación, investigación e historia. La revisión de código que sustenta el catálogo se registra aparte de la revisión de este repositorio editorial. El build usa archivos versionados y no consulta `main` del producto ni repositorios vecinos.

La actualización de evidencia es una operación explícita sobre un checkout limpio del producto. Revisar los cambios del catálogo, los documentos afectados y los diagramas antes de registrar una nueva revisión. Los detalles están en [mantenimiento](apps/starlight/README.md).

## Vercel

Importar **`developer-implementos/pos-docs`**, usar la raíz del repositorio y preset **Other**. `vercel.json` define instalación, build, salida, cabeceras y rutas. Definir `PUBLIC_SITE_URL` con el origen HTTPS público elegido, sin `/guide/`, para los enlaces canónicos y el snapshot.

Un único proyecto Vercel publica `/`, `/guide/`, `/presentations/` y las descargas en el mismo artefacto. No se requieren proyectos por presentación ni claves del producto, acceso a repositorios legacy o servicios corporativos. Consultar la [guía de publicación](docs/vercel.md).

El proyecto documental es `pos-docs-starlight`, con dominio `https://pos-docs-starlight.vercel.app` y rama de producción `main`. Definir `PUBLIC_SITE_URL=https://pos-docs-starlight.vercel.app` en Production y Preview. El monorepo de producto conserva su entrega independiente.

Este repositorio es público: los catálogos de configuración describen nombres y propósitos, nunca valores de despliegue o credenciales. Los cambios documentales no regeneran narraciones ni audio automáticamente.

## Presentación de arquitectura y roadmap

`presentations/architecture/` mantiene la presentación de Implementos de 16 diapositivas, su PowerPoint original y las fuentes editables de Reveal.js. `npm run build` la incluye en `/presentations/architecture/` junto al portal; `npm run presentations:check` comprueba recursos, navegación, notas, impresión y lectura accesible. Tras el build, `npm run preview` permite abrir `http://127.0.0.1:4207/presentations/architecture/`.

El [manual de la presentación](presentations/architecture/README.md) explica la edición, las fuentes fijadas y la diferencia documental respecto al PowerPoint trasladado. La presentación anterior con laboratorios, video y narrador permanece en pos-architecture.
