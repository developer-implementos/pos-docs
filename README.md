# POS Docs

Centro público de documentación de POS Platform: [abrir portal](https://pos-docs-starlight.vercel.app/). Reúne la guía Starlight, las propuestas de este repositorio y las fuentes originales de reuniones y antecedentes. Las síntesis se identifican y enlazan sus documentos relacionados.

El código de las aplicaciones pertenece a [POS Platform](https://github.com/developer-implementos/pos-platform). La documentación se mantiene aquí, sin instalar ni compilar Angular, NestJS, Tauri o Capacitor.

| Acceso público | Contenido |
| --- | --- |
| [`/`](https://pos-docs-starlight.vercel.app/) | Entrada breve a gestión, documentación, presentaciones y fuentes |
| [`/project/`](https://pos-docs-starlight.vercel.app/project/) | Resumen de avance técnico y aceptación manual, con distribución por fase o aplicación |
| [`/project/plan/`](https://pos-docs-starlight.vercel.app/project/plan/) | Próximo incremento: tipos de trabajo, orden, responsables, preparación y pruebas esperadas |
| [`/project/work/`](https://pos-docs-starlight.vercel.app/project/work/) | Entregables, estado técnico, ejecución, asignaciones y evidencia |
| [`/project/attention/`](https://pos-docs-starlight.vercel.app/project/attention/) | Bloqueos y decisiones con siguiente acción, contraparte, responsable y condición de cierre |
| [`/project/team/`](https://pos-docs-starlight.vercel.app/project/team/) | Equipo, asignaciones de desarrollo y responsabilidades de seguimiento |
| [`/guide/`](https://pos-docs-starlight.vercel.app/guide/) | Documentación técnica Starlight |
| [`/architecture/`](https://pos-docs-starlight.vercel.app/architecture/) | Mapa SVG interactivo de aplicaciones, tecnologías y contratos de integración |
| [`/guide/flows/`](https://pos-docs-starlight.vercel.app/guide/flows/) | Recorridos de negocio, límites y evidencia enlazada |
| [`/explore/`](https://pos-docs-starlight.vercel.app/explore/) | Vistas Archify derivadas de la arquitectura y de datos implementados |
| [`/guide/api/pos-platform/`](https://pos-docs-starlight.vercel.app/guide/api/pos-platform/) | Contratos HTTP generados del POS y descargas OpenAPI |
| [`/guide/api/data-model/`](https://pos-docs-starlight.vercel.app/guide/api/data-model/) | Tablas y restricciones extraídas de las migraciones del producto |
| [`/presentations/architecture/`](https://pos-docs-starlight.vercel.app/presentations/architecture/) | Arquitectura y roadmap en Reveal.js |
| [`/presentations/`](https://pos-docs-starlight.vercel.app/presentations/) | Catálogo de presentaciones |
| [`/materials/`](https://pos-docs-starlight.vercel.app/materials/) | Fuentes de reuniones y cuestionarios, filtrables por país y formato |
| [`/guide/evidence/country-comparison/`](https://pos-docs-starlight.vercel.app/guide/evidence/country-comparison/) | Síntesis comparativa aportada de Chile, Perú y España |

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| `docs/` | Fuentes técnicas canónicas en Markdown, decisiones y recursos públicos |
| `apps/starlight/` | Guía Starlight, navegación, componentes, búsqueda y validaciones |
| `portal/` | Portada, vistas de gestión, catálogos, filtros y visor de materiales |
| `materials/` | Originales y vistas previas PDF revisadas, publicados sólo mediante el catálogo |
| `apps/starlight/src/data/` | Catálogos revisados y procedencia de la evidencia |
| `presentations/` | Organización de presentaciones Reveal.js y referencias vigentes |
| `tools/diagrams/` | Modelos, generadores y comprobaciones C4, Excalidraw y draw.io |
| `tools/architecture/` | Modelo, SVG descargable y explorador interactivo de la propuesta |
| `tools/archify/` | Adaptadores y runtime fijado para vistas interactivas; consume el modelo compartido |
| `tools/product-reference/` | Importación, validación y publicación de contratos y esquema, sin acceso operativo |
| `data/product-reference/` | Snapshot revisado de OpenAPI y esquema con commit y hashes; no se edita a mano |
| `tools/export-documentation.mjs` | Snapshot documental derivado para consumidores como las presentaciones |
| `.github/workflows/` | Validación automática independiente del producto |

La separación de presentaciones y herramientas sigue la organización de [integration-presentations](https://github.com/developer-implementos/integration-presentations). Las decisiones técnicas del POS se editan en `docs/`; las diapositivas las resumen y enlazan, sin crear otra fuente normativa.

## Desarrollo local

Requiere Node.js 22.19 o posterior de la rama 22, o Node.js 24. La referencia de verificación local utiliza Node.js 22.23.3 y npm 11.6.0. GitHub Actions verifica cada PR con runners alojados ([por qué](.github/rulesets/README.md#github-actions-en-este-repositorio)); el [recorrido local](tools/local-ci/README.md) es opcional, para verificar antes de empujar y conservar evidencia del candidato.

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
npm run project:check
npm run follow-up:check
npm run viewer:check
npm run preview
```

`dev` sirve la guía Starlight. Para revisar el sitio completo, ejecutar `build` y `preview`, y abrir `http://127.0.0.1:4207/`. `npm run verify` ejecuta la validación completa. Los resultados y capturas se guardan en `test-results-docs/`, `test-results-presentations/`, `test-results-roadmap/`, `test-results-portal/`, `test-results-project/`, `test-results-follow-up/` y `test-results-viewer/`. El artefacto publicable se genera en `dist/`; no se versiona.

## Incorporar fuentes y materiales

Seguir [materials/README.md](materials/README.md): añadir el original y registrar su metadata en `portal/catalog.json`. El catálogo distingue país y función editorial, independientemente del formato. Admite PPTX, DOCX y PDF; no publica carpetas enteras ni inventa fechas de reunión. Las propuestas se consultan en `/presentations/` y los originales en `/materials/`. Las fuentes recibidas se conservan intactas; las síntesis y las decisiones se documentan en `docs/` con su alcance.

Cada archivo ofrece **Visualizar** y **Descargar**. Las vistas de lectura `/materials/view/<id>/` usan PDF.js local y PDF revisados vinculados al original por SHA-256. La conversión se hace antes de publicar; Vercel sólo construye el sitio y copia los derivados registrados. Para regenerarlos, consultar [los requisitos de conversión](materials/previews/README.md).

## Evidencia y actualización

Los recorridos enlazan una sola explicación de cada responsabilidad. Consultar [fuentes y mantenimiento](docs/documentation-system.md) antes de agregar una vista. Los diagramas de diseño y los datos implementados conservan su estado y procedencia; una vista generada no acredita operación real.

Para trabajar sobre una issue con Codex o Claude Code, consultar [el flujo con la skill pos-delivery](docs/agent-workflow.md). El procedimiento compartido viene versionado con el repositorio y enlaza las reglas, tareas y evidencias vigentes.

Para actualizar la referencia del producto, ejecutar `npm run documentation:export` en un checkout limpio de POS Platform con su PostgreSQL efímero de pruebas. Después, desde POS Docs:

```sh
node tools/product-reference/sync.mjs --workspace ../pos-platform
npm run reference:test
npm run build
npm run reference:check
npm run explore:check
```

Revisar el diff del snapshot antes de publicarlo. El importador sólo acepta los archivos declarados, hashes válidos y el commit exacto del checkout corporativo limpio. El build público consume esa copia local y no necesita credenciales, PostgreSQL ni el checkout del producto. Apidog consume estos OpenAPI en una sola dirección; la preparación local del producto no conecta ni sincroniza una cuenta.

Las páginas distinguen propuesta, implementación, investigación e historia. La revisión de código que sustenta el catálogo se registra aparte de la revisión de este repositorio editorial. El build usa archivos versionados y no consulta `main` del producto ni repositorios vecinos.

La actualización de evidencia es una operación explícita sobre un checkout limpio del producto. Revisar los cambios del catálogo, los documentos afectados y los diagramas antes de registrar una nueva revisión. Los detalles están en [mantenimiento](apps/starlight/README.md).

El registro de avance pertenece a `delivery/progress.json` en POS Platform. El portal calcula sus porcentajes a partir de entregables técnicamente verificados y muestra la aceptación manual por separado. Publica un snapshot revisado; no estima avances desde commits o carpetas ni accede al repositorio privado desde el navegador. Los registros antiguos de esquema 1 conservan su medición de aceptación hasta importar el esquema 2. Tras actualizar y confirmar el registro del producto, ejecutar `npm run progress:sync -- --workspace ../pos-platform`, validar y publicar el cambio en POS Docs. La metodología, evidencia requerida y actualización están en [Seguimiento del avance](docs/project-progress.md).

## Vercel

Importar **`developer-implementos/pos-docs`**, usar la raíz del repositorio y preset **Other**. `vercel.json` define instalación, build, salida, cabeceras y rutas. Definir `PUBLIC_SITE_URL` con el origen HTTPS público elegido, sin `/guide/`, para los enlaces canónicos y el snapshot.

Un único proyecto Vercel publica `/`, `/project/`, `/guide/`, `/presentations/`, `/materials/` y las descargas en el mismo artefacto. Los enlaces históricos de la portada y `/guide/project-status/` conservan acceso a sus destinos. No se requieren proyectos por presentación ni claves del producto, acceso a repositorios legacy o servicios corporativos. Consultar la [guía de publicación](docs/vercel.md).

El proyecto documental es `pos-docs-starlight`, con dominio `https://pos-docs-starlight.vercel.app` y rama de producción `main`. Definir `PUBLIC_SITE_URL=https://pos-docs-starlight.vercel.app` en Production y Preview. El monorepo de producto conserva su entrega independiente.

Este repositorio es público: los catálogos de configuración describen nombres y propósitos, nunca valores de despliegue o credenciales. Los cambios documentales no regeneran narraciones ni audio automáticamente.

## Presentación de arquitectura y roadmap

`presentations/architecture/` mantiene la presentación Reveal.js de Implementos y sus fuentes editables: una portada general independiente y capítulos con sus portadas y láminas de detalle. `npm run build` la incluye en `/presentations/architecture/` junto al portal; `npm run presentations:check` comprueba recursos, navegación, notas, impresión y lectura accesible. Tras el build, `npm run preview` permite abrir `http://127.0.0.1:4207/presentations/architecture/`.

El [manual de la presentación](presentations/architecture/README.md) explica la edición, las fuentes fijadas, la lectura continua y la impresión. La presentación anterior con laboratorios, video y narrador permanece en pos-architecture.
