# Arquitectura y roadmap · Implementos

Presentación Reveal.js en español con la identidad de Implementos. Abre con la portada «POS Platform» y continúa con cinco capítulos, cada uno con una portada de título y alcance seguida de sus láminas de detalle. Son 23 páginas: una portada general, cinco portadas de capítulo y 17 láminas de detalle. Ruta tras el build: `/presentations/architecture/`.

## Uso

- Los controles nativos de Reveal.js se muestran abajo a la derecha. `←`/`→` recorren la portada general y las portadas de capítulo; `↑`/`↓` recorren las láminas y fragmentos dentro de cada capítulo. La numeración indica posición horizontal y vertical (`4.3`), contando cada portada como primera lámina de su columna.
- `Espacio` recorre todo el contenido en orden, incluidos fragmentos y láminas verticales; `Shift` + `Espacio` retrocede. `O` abre la vista general de Reveal.js.
- `I` abre el índice y `N` las notas del expositor. Escape cierra el diálogo.
- «Recursos» reúne pantalla completa y enlaces a la documentación y al portal; en móvil también incluye las notas. Se cierra con Escape o al pulsar fuera; sus teclas no avanzan la presentación.
- Pantalla completa desde «Recursos» o `F` cuando el navegador lo admite.
- «Lectura» ofrece todo el contenido como documento, sin depender del reproductor. En móvil está visible en la barra; las notas pasan a «Recursos».
- La [vista de impresión](https://pos-docs-starlight.vercel.app/presentations/architecture/?print-pdf) presenta 23 páginas: la portada general, las cinco portadas de capítulo y las 17 láminas de detalle. En Chrome/Chromium imprimir como PDF, sin márgenes y con fondos. [Instrucciones de Reveal.js](https://revealjs.com/pdf-export/).
- «Ampliar diagrama» o `D` abre el diagrama de la lámina fuera del escalado de Reveal. Permite acercar, reducir, encuadrar y descargar el SVG. Las flechas y el desplazamiento actúan sobre el diagrama mientras está abierto; Escape lo cierra y devuelve el foco al control.

El reproductor respeta movimiento reducido. No activa reproducción automática, proveedores, voz, IA ni integraciones de negocio.

El índice destaca la lámina actual y la enfoca al abrir. Sólo su lista se desplaza, de modo que el título y el botón de cierre permanecen visibles. Las flechas nativas habilitadas mantienen contraste completo. Los controles exteriores tienen un área mínima de 44 px y la barra cabe desde 320 px sin desplazamiento horizontal.

La portada «POS Platform» es la lámina 1. Los capítulos son Propuesta y alcance (posiciones 2–4), Código y responsabilidades (5–6), Despliegue e infraestructura (7–9), Integración y evolución (10–12), y Entrega y roadmap (13–18). Los IDs de las láminas son permanentes: la nueva vista C2 usa `slide-17` y aparece antes de `slide-4`. `deck.json` declara sus títulos, alcance y agrupación; `../tools/navigation.mjs` comprueba que cada lámina aparezca una vez y en el orden declarado. La lectura continua presenta primero «POS Platform» y organiza las 17 láminas de detalle bajo los cinco títulos de capítulo.

La ruta `/presentations/architecture/` abre la portada general, identificada también por `#/slide-1`. Los enlaces `#/slide-2` a `#/slide-18` identifican las láminas de detalle. `#/slide-17` muestra las siete aplicaciones objetivo y los almacenes antes del monorepo; conserva todos los hashes anteriores. Las portadas de capítulo tienen enlaces propios: `#/chapter-proposal`, `#/chapter-structure`, `#/chapter-deployment`, `#/chapter-erp-integration` y `#/chapter-delivery-roadmap`. El índice permite acceder a la portada general, a los capítulos y a sus láminas de detalle.

### Recorrido del monorepo

La lámina `slide-4` tiene siete zonas: aplicaciones, negocio, interfaz, shared/backend, soporte común, prototipo y entrega. `↓` o `Espacio` recorre esas zonas mediante fragments de Reveal.js antes de pasar a la lámina siguiente del capítulo. `↑` retrocede por ellas. Los botones superiores permiten saltar directamente a una zona; el hash conserva el paso al recargar. El árbol se desplaza hacia las líneas resaltadas, con movimiento inmediato si el usuario prefiere movimiento reducido. No hay reproducción automática.

`../tools/monorepo.mjs` deriva carpetas y jerarquía del bloque objetivo de `docs/monorepo.md`; añade descripciones breves de sus responsabilidades y madurez. La lectura continua incluye el árbol completo. El recorrido explica la organización propuesta y distingue la UI demostrativa, la base técnica y la lógica comercial pendiente. La impresión conserva el resumen estático en una sola página. El patrón de rangos procede de la [presentación de Integration Platform](https://github.com/developer-implementos/integration-presentations/blob/main/presentations/architecture/enterprise-integration-platform-detailed.md), adaptado al POS y a sus fuentes propias. [Fragments de Reveal.js](https://revealjs.com/fragments/).

## Fuentes y edición

### Roadmap compartido con Starlight

La lámina `slide-12` organiza las seis fases en una matriz de operación, construcción y aceptación, inspirada en la [distribución del roadmap de PrimeNG](https://v21.primeng.org/roadmap). Usa fases en lugar de trimestres porque aún no hay fechas comprometidas. `↓` o `Espacio` recorre primero F01–F03 y F04–F06 mediante un fragment de Reveal; los botones permiten seleccionar el grupo y el hash conserva la vista. La impresión muestra las seis fases en una página.

`docs/roadmap.json` es la fuente de títulos, resúmenes, dependencias y criterios compartidos con `/guide/proposal/roadmap/`. `summary` alimenta la matriz; `slideDetail` resume cada frente en las láminas `slide-13`–`slide-15` y `detail` conserva su explicación completa en Starlight y lectura continua. Son síntesis editoriales explícitas, sin truncamiento automático. `tools/roadmap.mjs` valida el catálogo y genera las matrices; `presentations/tools/roadmap.mjs` adapta la navegación, lectura e impresión.

Al editar una fase, revisar sus tres niveles de texto y ejecutar `npm run verify`. `npm run roadmap:check` comprueba correspondencia de contenidos, navegación, persistencia del fragment, impresión, lectura sin JavaScript, accesibilidad básica y ajuste en varios tamaños de pantalla. Las capturas quedan en `test-results-roadmap/`.

| Archivo | Uso |
| --- | --- |
| `deck.json` | Capítulos, textos, posiciones, diagramas editables, notas y enlaces por diapositiva |
| `theme.css` | Inter local, paleta y diseño de lectura y controles |
| `player.js` | Navegación Reveal.js, índice, notas y controles accesibles |
| `sources.json` | Revisión editorial base y hashes revisados de las fuentes documentales |
| `assets/` | Logo suministrado y fuentes Inter con su licencia |
| `../vendor/reveal/` | Reveal.js 5.1.0 con licencia MIT y manifiesto de integridad |
| `../tools/diagrams.mjs` | Deriva los SVG de las láminas marcadas con `diagram: true`, usando las posiciones y textos de `deck.json` |
| `../tools/typography.mjs` | Escala tipográfica común por función del texto en los diagramas |

El build es autónomo: usa Node, archivos de este repositorio y dependencias fijadas de Starlight. `npm run presentations:build` produce el HTML en `dist/`; no editar ese resultado. `npm run presentations:test` valida el generador SVG y `npm run presentations:check` verifica el reproductor en navegador. `npm run verify` comprueba el conjunto completo, incluidos Starlight y el portal.

La presentación Reveal.js resume la arquitectura propuesta y el roadmap compartido con Starlight. POS Platform propone siete aplicaciones con arranque propio; POS Docs contiene la documentación y las presentaciones en un repositorio editorial independiente.

La lámina `slide-18` presenta la primera entrega F02: `device-agent` (.NET/C# sobre Windows) instalado por puesto para periféricos locales USB/serie/SDK. El escritorio solicita trabajos a `branch-api`; PostgreSQL conserva trabajos y auditoría, y SQLite el registro técnico del agente. La tarjeta F06 separa la evolución posterior al piloto F05: dispositivos de red o estación compartida y uso móvil de esos periféricos, con homologación específica de asignación, permisos y concurrencia. El agente inicia HTTPS autenticado para obtener trabajos y reportar evidencia; los adaptadores de impresión y MICR requieren homologación. Un trabajo aceptado por el spooler no acredita papel impreso. Esta aplicación es objetivo aprobado, pendiente de implementación; las otras seis tienen base técnica en la revisión de producto.

El árbol del monorepo expresa la estructura objetivo: aplicaciones, contextos de negocio, composición de interfaz y soporte técnico compartido, con pruebas E2E propias de los clientes. La base actual contiene una UI demostrativa y scaffolds de servidor; el roadmap propone la entrega de operaciones verificables por fases, sin fechas comprometidas ni implementación productiva implícita. La evidencia del producto está fijada por `apps/starlight/src/data/product-evidence.json`.

Cuando cambien fuentes canónicas, revisar las diapositivas y actualizar explícitamente la revisión y hashes de `sources.json`. El build falla ante discrepancias para evitar que la presentación aparente resumir documentación todavía no revisada. No consultar una rama remota mutable ni actualizar hashes automáticamente durante el build.

Los diagramas de contexto, despliegue, infraestructura e integración se generan como SVG. `deck.json` conserva la composición editorial; `../tools/architecture.mjs` deriva las vistas de contenedores, periféricos e integración desde `tools/architecture/model.mjs`, compartido con el explorador, para mantener nombres y relaciones canónicos. El build usa Fontkit con las fuentes Inter locales para medir líneas y convertir las letras a trazados vectoriales: el SVG descargado conserva su tipografía sin cargar fuentes externas. No contiene imágenes raster ni `foreignObject`. Cada etiqueta conserva su texto accesible y la lectura continua ofrece los textos seleccionables junto al diagrama.

Cada texto del diagrama declara `style.typographyRole`: `group` para encabezados de zona (24 px, negrita), `title` para títulos de elementos (22 px, negrita), `body` para descripciones (20 px) y `label` para conexiones o notas (16 px). Son coordenadas del lienzo de 1280 × 720. La escala se comparte entre todas las láminas, la lectura, la impresión y el SVG descargable. No se admiten tamaños ni pesos particulares por elemento: si el contenido no cabe, se ajusta su caja o la distribución. La generación comprueba el ancho y la altura sin reducir automáticamente las letras.

El visor amplía mediante dimensiones reales del SVG, fuera de la transformación global de Reveal. «Encuadrar» muestra el conjunto; para leer etiquetas pequeñas se puede acercar y desplazar el área. El formato vectorial evita perder resolución al ampliar, pero no vuelve legible por sí solo una lámina reducida a pocos píxeles.

Los modelos C4 detallados de referencia siguen en `tools/diagrams/` y sus escenas Excalidraw conservan su propio alcance. No se sustituyen automáticamente por los diagramas resumidos de esta presentación. Los SVG se regeneran durante `npm run presentations:build`; no editar los archivos derivados de `dist/presentations/architecture/diagrams/`.

Logo: [SVG indicado por el usuario](https://www.implementos.com.pe/assets/public/svg/logos/logo.svg). Tipografía: Brand book Implementos 2026. La presentación usa el primario `#0545BA` indicado para POS Platform; `../tools/palette.mjs` centraliza primario, tonos, acento y neutros para el reproductor, el HTML de las láminas y los SVG descargables. El build adapta los colores de origen sin reescribir `deck.json` ni el logo. `palette.css` es generado; no editar el derivado. Los pares de texto sobre las superficies de la paleta se comprueban con contraste mínimo de 4,5:1.

Las microinteracciones usan duraciones compartidas de 140–200 ms, sin bloquear la navegación. La preferencia de movimiento reducido se aplica también si cambia con la presentación abierta. [Configuración de Reveal.js](https://revealjs.com/config/).

### De la propuesta al detalle verificable

La vista C2 resume las siete aplicaciones objetivo y separa PostgreSQL de sus APIs. La vista de periféricos delimita F02 por puesto y F06 compartido después del piloto; detalla SQLite como registro técnico local, sin autoridad sobre ventas. Los diagramas mantienen el modelo de país y las conexiones salientes de `erp-worker`; las responsabilidades internas no se representan como servicios adicionales. El ejemplo de fachada/ACL usa identidades ilustrativas y conserva un resultado incierto tras timeout. La primera entrega identifica visiblemente laboratorio y documentos de prueba.

Los enlaces «Explorar este recorrido» abren la vista o paso correspondiente del mapa mediante `?view=base` y `?scenario=country-erp&step=3`. La lámina de periféricos abre `?scenario=local-printing&step=1` para F02; sus fuentes enlazan separadamente `?scenario=shared-printing&step=1` para la evolución F06. Las fases enlazan directamente a sus planes de entregables y aceptación en Starlight. Se conservan lectura continua, SVG descargable y navegación por capítulos.
