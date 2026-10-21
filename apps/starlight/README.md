# Documentación de POS Platform

<span id="documentación-pos-platform"></span>

Starlight vive en el repositorio editorial público [POS Docs](https://github.com/developer-implementos/pos-docs). Las decisiones, contratos, evidencias del legacy y guías de implementación están en `docs/`; la navegación, componentes y catálogos están en `apps/starlight/`. El software operativo se desarrolla en [POS Platform](https://github.com/floxcristian/pos-platform), con seis aplicaciones y sus bibliotecas.

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
- `monorepo-catalog.json` conserva por separado el inventario físico actual y `targetStructure`, la organización acordada con `shared/`. `npm --prefix apps/starlight run sync:catalog` genera la síntesis del repositorio del producto, la guía del monorepo, las opciones tecnológicas y la tabla de migración. El README de POS Docs describe el portal y no se genera desde ese catálogo.
- `product-evidence.json` identifica el repositorio y la revisión del producto usados como evidencia. Al actualizar el catálogo, contrastar esa revisión con `node apps/starlight/scripts/sync-monorepo-catalog.mjs --check --workspace <ruta-al-checkout-pos-platform>`; esta comprobación es deliberada y no participa en el build público. Las rutas futuras de `shared/` y E2E no se presentan como ya creadas.
- `docs/diagramas-excalidraw/` conserva las escenas editables y sus derivados. Los modelos y generadores canónicos están en `tools/diagrams/`.
- Las carpetas generadas de `src/content/docs/` no se editan ni se versionan. Los componentes Astro, estilos y páginas de entrada se mantienen a mano.

Actualizar fuentes y sus síntesis en el mismo cambio editorial. Cuando un cambio de código afecte la documentación, enlazar las revisiones de ambos repositorios y actualizar la evidencia del producto; no convertir el estado de `main` en una dependencia del build. Conservar la distinción entre propuesta, implementación, evidencia e historia. Una prueba de enlaces no acredita funcionamiento productivo ni comprensión por parte del equipo. La [auditoría documental](../../docs/auditoria-documentacion.md) describe esos límites.

<span id="publicación-y-controles"></span>

## Publicación

La salida estática autocontenida es `dist/`: incluye `/guide/`, las descargas de `/docs/` y `documentation.snapshot.json`. No requiere un checkout del producto o de la presentación, repositorios legacy, claves, video ni MP3. Los scripts inline se externalizan para conservar CSP; Pagefind usa WebAssembly solo bajo `/guide/`.

En POS Docs, `npm --prefix apps/starlight run build` construye el sitio documental para Vercel: `/` redirige a `/guide/`. `PUBLIC_SITE_URL` define el origen público para enlaces canónicos; su valor debe coincidir con el dominio verificado del proyecto Vercel. Los clientes nativos y el backend se construyen y distribuyen desde POS Platform. La [configuración de Vercel](../../docs/vercel.md) detalla instalación y publicación. El workflow `Documentation quality` valida esta aplicación de forma independiente.

La [presentación y narrador](https://presentation-gamma-rust.vercel.app/reveal) conservan por ahora el repositorio `pos-architecture`. `presentations/` reserva la organización de nuevas presentaciones Reveal.js en POS Docs; no implica que los videos, audios o presentaciones existentes ya se hayan trasladado. Las presentaciones consumen un snapshot derivado, identificado por revisión editorial y hashes, para compilar sin depender de `main` mutable ni de un checkout vecino. `tools/export-documentation.mjs` lo produce durante el build y conserva por separado la evidencia de revisión del producto. Una versión con cambios locales se marca como tal y no debe actualizar el consumidor publicado. El snapshot no es otra fuente editorial.

Mover documentación no modifica automáticamente el guion de la presentación ni regenera audio. Cuando cambie una decisión, revisar también las síntesis y narraciones que la explican.
