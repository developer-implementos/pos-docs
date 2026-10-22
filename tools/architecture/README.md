# Explorador general de arquitectura

Este directorio mantiene el mapa compuesto de arquitectura y despliegue de POS Platform, publicado en [`/architecture/`](https://pos-docs-starlight.vercel.app/architecture/). Reúne aplicaciones, tecnologías, almacenes y relaciones de la propuesta. Las vistas C1, C2, C3 y dinámicas conservan sus modelos y galerías en `tools/diagrams/` y `docs/diagramas-excalidraw/`; este mapa no introduce otro nivel C4 ni acredita una instalación productiva.

## Modelo y salidas

| Archivo o ruta | Responsabilidad |
| --- | --- |
| `model.mjs` | Modelo editable del mapa general: elementos, relaciones, alcance y referencias |
| `render.mjs` | Representación SVG derivada del modelo |
| `build.mjs` | Generación del SVG versionado y publicación del explorador en el artefacto del sitio |
| `check.mjs` | Comprobaciones del explorador |
| `../../portal/architecture.js` y `architecture.css` | Interacción y presentación del explorador |
| `../../docs/architecture/pos-platform.svg` | SVG completo generado y versionado para consulta y descarga |
| `../../dist/architecture/` | Página pública generada; no se versiona ni se edita |
| `/docs/architecture/pos-platform.svg` | Ruta pública del mismo SVG completo |

Los cambios de contenido y relaciones se hacen en `model.mjs`; los ajustes de representación, en `render.mjs`. El SVG se regenera desde esas fuentes. No mantener una copia editada a mano: el archivo versionado y la descarga deben corresponder al mismo modelo revisado.

El mapa explicita las seis aplicaciones acordadas. Las bibliotecas y mecanismos transversales se describen dentro de su responsabilidad; no se convierten en aplicaciones adicionales. Las capacidades condicionales y los procesos cuya ejecución está por asignar deben conservar esa identificación tanto en el SVG como en el explorador.

## Fuentes que gobiernan el contenido

- [Propuesta de arquitectura](../../docs/propuesta-arquitectura.md): responsabilidades, perfil WAN, autoridades de datos y contratos de comunicación.
- [Modelo C4 y contratos](../../docs/c4-arquitectura-propuesta.md): fronteras de proceso, correspondencia de aplicaciones, caché opcional y límites de despliegue.
- [Monorepo](../../docs/monorepo.md): nombres, composición objetivo y diferencia con la base técnica disponible.
- [Mensajería: criterios de adopción](../../docs/investigacion-mensajeria-pos.md): condiciones para incorporar RabbitMQ o BullMQ y obligaciones que siguen perteneciendo al negocio.
- [Proveedores y dispositivos](../../docs/extensibilidad-proveedores-dispositivos.md): contratos de pagos, fiscalidad, impresión y puentes nativos sujetos a homologación.

Una modificación de arquitectura requiere primero revisar la decisión y sus contratos en esas fuentes. El mapa resume esa decisión vigente. Las referencias a sistemas legacy conservan su alcance de evidencia; no demuestran que el conector objetivo esté implementado.

## Generación y revisión

Desde la raíz de `pos-docs`, con las dependencias instaladas, ejecutar primero `npm run build` para generar el sitio completo y sus recursos compartidos. Para regenerar y verificar sólo el explorador después de ese primer build:

```sh
npm run architecture:build
npm run architecture:check
```

El build genera `docs/architecture/pos-platform.svg`, la página `/architecture/` y su descarga dentro de `dist/`. El build completo del sitio debe generar el mapa antes de preparar el contenido Starlight, porque la documentación enlaza el SVG. Después de un cambio, revisar el diff del modelo y del SVG juntos; `dist/` es un artefacto publicable generado.

Para verificar su integración con documentación, portal y presentaciones:

```sh
npm run verify
```

La revisión editorial y visual debe comprobar:

1. **Responsabilidades y autoridad:** seis aplicaciones con nombres consistentes; venta y outbox comparten el commit local; el acuse de país sucede después de inbox, efecto local pactado y outbox. No confundir esos hitos con pago, aceptación fiscal o registro ERP.
2. **Conexiones:** cada flecha identifica iniciador, destino, propósito y protocolo cuando está definido. `branch-sync-worker` y `erp-worker` inician HTTPS hacia `country-api`; el worker ERP reside en su red autorizada, sin SQL remoto a la base de país.
3. **Opcionales:** Redis de caché se distingue del almacén de trabajos de BullMQ. La caché es reconstruible y tiene fallback acotado; si BullMQ utiliza Redis, sus requisitos de persistencia y `noeviction` requieren una instancia separada de la caché descartable. RabbitMQ necesita productores, consumidores, custodia y condiciones de adopción explícitos.
4. **Continuidad y límites:** el espejo comercial de sucursal es PostgreSQL versionado. El perfil WAN depende de LAN y servidor de sucursal; los puentes, proveedores y procesos por asignar conservan sus condiciones de validación.
5. **Lectura e interacción:** textos y conectores sin solapamientos; controles accesibles por teclado; foco visible; zoom y desplazamiento utilizables en escritorio y móvil; significado comprensible sin depender sólo del color. Revisar tanto el explorador como el SVG abierto directamente.
6. **Publicación:** fuentes de detalle alcanzables, descarga idéntica al SVG versionado y recursos locales bajo la política de seguridad del sitio. El explorador no debe ejecutar solicitudes a sistemas corporativos ni presentar una simulación como prueba de operación.

Estas comprobaciones verifican la representación documental. La aceptación del producto requiere las pruebas de los componentes reales descritas en el [roadmap](../../docs/roadmap.md).
