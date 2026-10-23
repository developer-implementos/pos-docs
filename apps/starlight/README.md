# Documentación de POS Platform

<span id="documentación-pos-platform"></span>

Starlight vive en el repositorio editorial público [POS Docs](https://github.com/developer-implementos/pos-docs). Las decisiones, contratos, evidencias del legacy y guías de implementación están en `docs/`; la navegación, componentes y catálogos están en `apps/starlight/`. El software operativo se desarrolla en [POS Platform](https://github.com/developer-implementos/pos-platform), con seis aplicaciones y sus bibliotecas.

<span id="comandos"></span>

## Desarrollo y comprobación

El compilador documental tiene su propio `package.json` y lockfile: no instala Angular, Nest ni Nx y no necesita un checkout vecino. Requiere Node 22.19 o posterior en la rama 22, o Node 24. Desde la raíz de **pos-docs**:

```sh
npm --prefix apps/starlight ci
npm --prefix apps/starlight run dev
```

Para verificar y previsualizar la entrega:

```sh
npm --prefix apps/starlight run validate
npm --prefix apps/starlight run typecheck
npm --prefix apps/starlight run build
npm --prefix apps/starlight exec playwright install chromium
npm --prefix apps/starlight run check
npm --prefix apps/starlight run preview
```

El build usa este repositorio y sus dependencias fijadas. No importa bibliotecas del producto ni forma parte de los procesos de caja, sucursal o país. El catálogo describe las seis aplicaciones de **pos-platform**: escritorio, móvil y cuatro entradas backend. Starlight pertenece a otro repositorio y no se cuenta como una séptima aplicación del producto. El catálogo distingue la demostración frontend, la base HTTP y los esqueletos de workers; seis entradas operativas no acreditan seis servicios productivos ni sus integraciones.

<span id="fuente-de-cada-contenido"></span>
<span id="diagramas-e-interacción"></span>
<span id="revisión-y-mantenimiento-de-cambios"></span>

## Fuentes y mantenimiento

- `content-map.mjs` gobierna las rutas en inglés, el menú, el recorrido principal y el alcance de cada página.
- Los documentos técnicos de `docs/` son fuentes editables. El generador divide las fuentes extensas sin perder ni duplicar líneas, mantiene anclas y comprueba referencias.
- Los catálogos en `src/data/` conservan el snapshot revisado, las descripciones de endpoints y la configuración del legacy, sin valores de despliegue.
- `monorepo-catalog.json` registra el inventario físico verificado y `targetStructure`, la organización acordada con `shared/`. `npm --prefix apps/starlight run sync:catalog` genera las vistas de estructura y aplicaciones para la síntesis del producto, la guía del monorepo y las opciones tecnológicas. El README de POS Docs describe el portal y no se genera desde ese catálogo.
- `product-evidence.json` identifica el repositorio y la revisión del producto usados como evidencia. Al actualizar el catálogo, contrastar esa revisión con `node apps/starlight/scripts/sync-monorepo-catalog.mjs --check --workspace <ruta-al-checkout-pos-platform>`; esta comprobación es deliberada y no participa en el build público. Las rutas futuras de `shared/` y E2E no se presentan como ya creadas.
- `docs/diagramas-excalidraw/` conserva las escenas editables y sus derivados. Los modelos y generadores canónicos están en `tools/diagrams/`.
- Las carpetas generadas de `src/content/docs/` no se editan ni se versionan. Los componentes Astro, estilos y páginas de entrada se mantienen a mano.
- La búsqueda usa `search-profile.mjs`, derivado de los tipos de `content-map.mjs`: cada resultado expone su alcance y permite filtrar propuesta, implementación, fuentes/legado, evaluación, referencias y antecedentes. Los antecedentes conservan acceso, con menor ponderación; las pruebas consultan el índice real de Pagefind.
- El mapa general abre `/architecture/`, con vistas por zona y enlaces a recorridos/pasos. Los SVG estáticos y Mermaid comparten `src/scripts/diagram-viewport.ts`: ajuste al espacio disponible, tamaño real, zoom, teclado y desplazamiento, sin duplicar el controlador.

Actualizar fuentes y sus síntesis en el mismo cambio editorial. Cuando un cambio de código afecte la documentación, enlazar las revisiones de ambos repositorios y actualizar la evidencia del producto; no convertir el estado de `main` en una dependencia del build. Conservar la distinción entre propuesta, implementación, evidencia e historia. Una prueba de enlaces no acredita funcionamiento productivo ni comprensión por parte del equipo. La [auditoría documental](../../docs/auditoria-documentacion.md) describe esos límites.

<span id="publicación-y-controles"></span>

## Publicación

La salida estática autocontenida es `dist/`: incluye el portal `/`, la guía `/guide/`, las presentaciones `/presentations/`, las descargas catalogadas y `documentation.snapshot.json`. No requiere un checkout del producto o de otra presentación, repositorios legacy, claves, video ni MP3. Los scripts inline se externalizan para conservar CSP; Pagefind usa WebAssembly solo bajo `/guide/`.

En POS Docs, `npm run build` desde la raíz construye el sitio completo para Vercel. `/` es el catálogo de recursos y `/guide/` conserva la documentación. `PUBLIC_SITE_URL` define el origen público para enlaces canónicos; su valor debe coincidir con el dominio verificado del proyecto Vercel. Los clientes nativos y el backend se construyen y distribuyen desde POS Platform. La [configuración de Vercel](../../docs/vercel.md) detalla instalación y publicación. El workflow `Documentation quality` valida Starlight, Reveal.js y el portal.

La [presentación de arquitectura y roadmap](/presentations/architecture/) vive en `presentations/architecture/` de este repositorio, con fuentes identificadas por revisión y hashes. El deck anterior con narrador conserva su propio repositorio `pos-architecture` y no forma parte del catálogo del portal. `tools/export-documentation.mjs` produce además un snapshot derivado durante el build y conserva por separado la evidencia de revisión del producto. Una versión con cambios locales se marca como tal y no debe actualizar el consumidor publicado. El snapshot no es otra fuente editorial.

Mover documentación no modifica automáticamente el guion de la presentación ni regenera audio. Cuando cambie una decisión, revisar también las síntesis y narraciones que la explican.
