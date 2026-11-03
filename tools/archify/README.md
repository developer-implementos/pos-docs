# Diagramas explorables

Esta integración publica vistas de las fuentes canónicas; no introduce otro catálogo de aplicaciones, contratos o tablas.

| Vista | Fuente | Qué acredita |
| --- | --- | --- |
| Aplicaciones y despliegue | `tools/architecture/model.mjs` + `views.mjs` | Diseño propuesto, conservando los IDs y contratos originales. |
| Nueve recorridos | `architecture.scenarios` | Orden y explicación de los pasos propuestos. No infiere mensajes adicionales. |
| Venta, cobro, fiscalidad e impresión | `tools/architecture/lifecycles.mjs` | Predicados inspeccionados en una revisión enlazada del producto. No es evidencia de ejecución ni homologación. |
| Once contextos de datos | `data/product-reference/database/schema.json` | Tablas y restricciones extraídas de migraciones aplicadas a PostgreSQL efímero. No son datos de producción. |

La documentación del producto, el índice de diagramas y las fichas enlazan las mismas fuentes. Los cambios semánticos se hacen en esas fuentes. `project.mjs`, `lifecycle.mjs` y `database.mjs` sólo seleccionan y presentan datos, preservando identidades, estados, transiciones, columnas y restricciones. Las posiciones explícitas son decisiones de composición visual.

## Construcción y comprobación

Con las dependencias de Starlight y la referencia de producto ya importadas:

```sh
node tools/archify/build.mjs
node --test tools/archify/*.test.mjs
node tools/archify/check.mjs
```

El build es determinista, no descarga paquetes y no necesita una instalación global de Archify ni acceso al repositorio privado del producto. Ejecuta `deliver` y `check --require-provenance` para validar composición y geometría antes de empaquetar cada HTML. Escribe `dist/explore/<id>/`, `source.json`, los recursos locales y `dist/explore/catalog.json`. El build principal compone el índice `/explore/` a partir de ese catálogo.

El test de navegador usa Playwright y el servidor de previsualización con las cabeceras reales de Vercel. Requiere que el build principal haya creado `dist/.pos-docs-build`. Comprueba CSP, ausencia de peticiones externas y errores de consola/red, selección de elementos/conectores por teclado, restauración del foco, pantallas de 1440/375/320 píxeles y exportación SVG con fuentes incluidas. Capturas e informe quedan en `test-results-archify/`.

Para revisar cambios de composición con las cuatro puertas nativas de Archify:

```sh
node tools/archify/finalize.mjs
# Selección acotada:
node tools/archify/finalize.mjs applications state-payment data-branch-sales
```

Los recibos se conservan en `tmp/archify-review/`. `ARCHIFY_REVIEW_ROUND` distingue revisiones de un candidato y `ARCHIFY_CHROME` permite seleccionar un ejecutable Chrome/Chromium compatible. Los ERD de más de ocho tablas o cincuenta campos utilizan el perfil denso `standard`, como establece el contrato de autoría de Archify; las demás vistas usan `showcase`. El build no lanza un navegador: la revisión de autoría y las pruebas de la web son pasos independientes.

## Restricciones del formato

- Todos los campos físicos mantienen su tipo SQL. Columnas, valores predeterminados, comentarios, restricciones e índices se consultan también en la ficha y en Starlight.
- PK y UK pueden ser compuestas: la marca de una columna significa pertenencia, no unicidad individual. La cardinalidad se deriva exclusivamente de restricciones declaradas, nunca de índices únicos parciales.
- Un atributo Archify admite un destino FK. Si una columna participa en varias FK, se enlaza el primer destino real en orden alfabético y se explica visiblemente esta convención. Los conectores y la ficha conservan todas las FK del contexto y sus columnas compuestas.
- Archify no dibuja autorreferencias ERD. La FK de `administration.configuration_revision` hacia su revisión padre se conserva en una nota visible, en su ficha completa y en la referencia SQL; no se representa como otra tabla ficticia.
- Las tablas externas a un contexto son referencias directas. Sus dependencias completas se exploran en la vista de su contexto.
- El ciclo de impresión destaca la recuperación del mismo intento hasta recibir evidencia del spooler. Se conservan todas sus salidas, incluido el resultado final; no se confunde recepción del spooler con papel impreso.

## Runtime fijado y licencias

`vendor-manifest.json` fija Archify **3.2.0**, tag `v3.2.0`, commit `e62275b6373fa63436e195635835c313ce028b21`, y SHA-256 de cada archivo vendorizado. El build verifica estos hashes antes de ejecutar el renderer. El subconjunto incluye CLI, renderers, esquemas, recursos, catálogos de idioma y licencias; excluye ejemplos y documentación de autoría. No contiene cambios a upstream.

`vendor/archify/LICENSE` y `THIRD_PARTY_NOTICES.md` se publican junto con los recursos. Las fuentes embebidas conservan su licencia OFL. Para actualizar: revisar el tag y commit upstream, copiar el mismo subconjunto sin modificar sus bytes, regenerar los hashes, revisar cambios de formato, ejecutar pruebas y la revisión nativa y visual de todas las vistas antes del PR. Una actualización no debe relajar CSP ni omitir validaciones para acomodar fallos.

`package.mjs` convierte scripts ejecutables y hojas de estilo del HTML entregado en archivos locales identificados por hash. Las hojas dentro de SVG y la hoja de fuentes que consume el exportador permanecen en su namespace original. No añade `unsafe-eval`, scripts inline ejecutables ni dependencias remotas. `viewer.js` y `viewer.css` son la integración propia de marca, navegación y fichas; el runtime upstream permanece intacto.
