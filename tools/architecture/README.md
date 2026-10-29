# Explorador general de arquitectura

Este directorio mantiene el mapa compuesto de arquitectura y despliegue de POS Platform, publicado en [`/architecture/`](https://pos-docs-starlight.vercel.app/architecture/). Reúne aplicaciones, tecnologías, almacenes y relaciones de la propuesta. Las vistas C1, C2, C3 y dinámicas conservan sus modelos y galerías en `tools/diagrams/` y `docs/diagramas-excalidraw/`; este mapa no introduce otro nivel C4 ni acredita una instalación productiva.

## Modelo y salidas

| Archivo o ruta | Responsabilidad |
| --- | --- |
| `model.mjs` | Modelo editable del mapa general: elementos, relaciones, alcance y referencias |
| `render.mjs` | Representación SVG derivada del modelo |
| `views.mjs` | Proyecciones base, por zona y por paso; invariantes de autoridad y proceso |
| `build.mjs` | Generación del SVG versionado y publicación del explorador en el artefacto del sitio |
| `check.mjs` | Comprobaciones del explorador |
| `../../portal/architecture.js` y `architecture.css` | Interacción y presentación del explorador |
| `../../docs/architecture/pos-platform.svg` | SVG completo generado y versionado para consulta y descarga |
| `../../docs/architecture/pos-platform-base.svg` | Resumen derivado con las siete aplicaciones propuestas, bases e interfaces externas |
| `../../dist/architecture/` | Página pública generada; no se versiona ni se edita |
| `/docs/architecture/pos-platform.svg` | Ruta pública del mismo SVG completo |

Los cambios de contenido y relaciones se hacen en `model.mjs`; los ajustes de representación, en `render.mjs`. El SVG se regenera desde esas fuentes. No mantener una copia editada a mano: el archivo versionado y la descarga deben corresponder al mismo modelo revisado.

El mapa explicita las siete aplicaciones propuestas. Seis tienen base técnica o scaffolding; `device-agent` aún no está implementada. Las bibliotecas y mecanismos transversales se describen dentro de su responsabilidad; no se convierten en aplicaciones adicionales. Las capacidades de hardware requieren homologación y conservan ese estado tanto en el SVG como en el explorador.

La entrada muestra la **arquitectura base** con componentes agregados a su aplicación. La cabecera reúne el selector de vista, **Explorar** y **Opciones del mapa**. El índice se abre mediante Explorar; al seleccionar un nodo o conexión aparece su ficha. Las vistas de clientes, sucursal, país, integraciones y opciones amplían el mismo modelo; el mapa completo conserva todos los detalles. Una proyección mantiene IDs y contratos de origen, sin inventar otra relación ni copiar decisiones. `device-agent` es una aplicación C#/.NET propuesta para Windows, independiente de la ventana del POS, con diario técnico SQLite. RabbitMQ conserva una asociación de evaluación sin flecha: no asigna un productor o consumidor.

Ambos clientes solicitan capacidades a `branch-api`. El agente inicia HTTPS LAN para obtener trabajos y reportar evidencia, con un único controlador autorizado por periférico compartido. Su diario conserva `jobId`, hash, binding y observaciones; no es otra base de ventas. Los IDs públicos `bridge`, `device-command` y `bridge-evidence` se mantienen para conservar enlaces, pero sus fichas describen la aplicación y el contrato vigentes. La base y el recorrido de impresión incluyen agente, diario y dispositivo; los pagos mediante SDK local permanecen condicionados a homologación y no acreditan integración Transbank.

**Opciones del mapa** reúne recorridos guiados, copia del enlace, pantalla completa, centrado de selección, regreso a la vista base y recursos de consulta/descarga. Es un panel no modal: Escape o un clic fuera lo cierran sin bloquear el mapa. Los controles flotantes permiten reducir, ampliar, restaurar el tamaño real y encajar el mapa completo. Con el mapa enfocado, `+`/`−`, `1` y `0` ofrecen esas mismas acciones. El encuadre completo se conserva al redimensionar o abrir/cerrar el inspector.

El inspector permanece cerrado hasta solicitarlo. En escritorio se acopla a la derecha; en móvil comparte la altura con el mapa sin taparlo ni añadir desplazamiento al documento. Su cierre permanece visible al recorrer una ficha y devuelve el foco al botón Explorar. Las confirmaciones de copia son transitorias; las indicaciones para lectores de pantalla no ocupan espacio visual. Las pruebas protegen una cabecera de una sola fila y al menos un 85 % de altura disponible para el mapa en escritorio, 80 % en móvil, con el inspector cerrado.

Las URL conservan la vista, el recorrido y el paso (numeración desde uno). Recargar, Atrás/Adelante y **Copiar enlace** restauran ese contexto:

- `/architecture/?view=country`: zona de país.
- `/architecture/?scenario=country-erp&step=2`: commit de recepción anterior al ACK.
- `/architecture/?scenario=commercial-version&step=2`: entrega y finalización de una publicación.
- `/architecture/?scenario=recovery&step=3`: reconstrucción de custodia y detección de huecos.
- `/architecture/?scenario=shared-printing&step=2`: recepción durable de impresión solicitada desde móvil o escritorio.
- `/architecture/?view=options#detail-bullmq`: ficha de la alternativa de jobs.

Los enlaces existentes `#detail-ID` siguen funcionando. Parámetros desconocidos vuelven a una vista válida, y un paso fuera de rango queda acotado al recorrido. Sin JavaScript se mantienen el SVG base, las descargas y las fichas; las vistas interactivas requieren la mejora JavaScript.

## Fuentes que gobiernan el contenido

- [Propuesta de arquitectura](../../docs/propuesta-arquitectura.md): responsabilidades, perfil WAN, autoridades de datos y contratos de comunicación.
- [Modelo C4 y contratos](../../docs/c4-arquitectura-propuesta.md): fronteras de proceso, correspondencia de aplicaciones, caché opcional y límites de despliegue.
- [Monorepo](../../docs/monorepo.md): nombres, composición objetivo y diferencia con la base técnica disponible.
- [Mensajería: criterios de adopción](../../docs/investigacion-mensajeria-pos.md): condiciones para incorporar RabbitMQ o BullMQ y obligaciones que siguen perteneciendo al negocio.
- [Proveedores y dispositivos](../../docs/extensibilidad-proveedores-dispositivos.md): contratos de pagos, fiscalidad, impresión y puentes nativos sujetos a homologación.
- [Agente de dispositivos](../../docs/decisions/device-agent.md): aplicación autónoma, flujo móvil, diario técnico, restricciones de SDK y recuperación.

Una modificación de arquitectura requiere primero revisar la decisión y sus contratos en esas fuentes. El mapa resume esa decisión vigente. Las referencias a sistemas legacy conservan su alcance de evidencia; no demuestran que el conector objetivo esté implementado.

## Generación y revisión

Desde la raíz de `pos-docs`, con las dependencias instaladas, ejecutar primero `npm run build` para generar el sitio completo y sus recursos compartidos. Para regenerar y verificar sólo el explorador después de ese primer build:

```sh
npm run architecture:build
npm run architecture:check
node --test tools/architecture/model.test.mjs
```

El build genera `docs/architecture/pos-platform.svg`, la página `/architecture/` y su descarga dentro de `dist/`. El build completo del sitio debe generar el mapa antes de preparar el contenido Starlight, porque la documentación enlaza el SVG. Después de un cambio, revisar el diff del modelo y del SVG juntos; `dist/` es un artefacto publicable generado.

La publicación de maestros es una responsabilidad propuesta compartida: `erp-worker` prepara mediante `MasterDataSourcePort` en la red del origen homologado, con identidad, claims y presupuesto aislados de la ejecución financiera; `country-api` recibe porciones y valida/finaliza la versión. El modelo enlaza el contrato correspondiente y no atribuye esa capacidad al scaffold. El recorrido de restauración conserva escritor único, copia independiente, replay identificado y conciliación antes de reabrir; no dibuja un mecanismo de alta disponibilidad aprobado ni promete RPO cero.

Para verificar su integración con documentación, portal y presentaciones:

```sh
npm run verify
```

La revisión editorial y visual debe comprobar:

1. **Responsabilidades y autoridad:** siete aplicaciones propuestas con nombres consistentes y estado de implementación explícito; venta y outbox comparten el commit local; el acuse de país sucede después de inbox, efecto local pactado y outbox. SQLite pertenece exclusivamente a la evidencia técnica de `device-agent`. No confundir esos hitos con pago, aceptación fiscal o impresión física.
2. **Conexiones:** cada flecha identifica iniciador, destino, propósito y protocolo cuando está definido. Las conexiones a datos usan la etiqueta tecnológica PostgreSQL; sucursal o país se identifica en el almacén y su frontera. Atomicidad, cambios condicionales y permisos pertenecen al detalle del contrato, no a tipos distintos de conexión SQL. `branch-sync-worker` y `erp-worker` inician HTTPS hacia `country-api`; el worker ERP reside en su red autorizada, sin SQL remoto a la base de país.
3. **Opcionales:** Redis de caché se distingue del almacén de trabajos de BullMQ. La caché es reconstruible y tiene fallback acotado; si BullMQ utiliza Redis, sus requisitos de persistencia y `noeviction` requieren una instancia separada de la caché descartable. RabbitMQ necesita productores, consumidores, custodia y condiciones de adopción explícitos.
4. **Continuidad y límites:** el espejo comercial de sucursal es PostgreSQL versionado. El perfil WAN depende de LAN y servidor de sucursal. `device-agent` obtiene trabajo y reporta evidencia sin un relé de UI; perder LAN detiene nueva admisión, pero conserva los intentos y observaciones. Reinicio, respuesta perdida o lease vencido no autorizan repetir un efecto incierto. C# no garantiza compatibilidad de `PrintDocument` con un servicio Windows: SDK, driver y contexto de ejecución necesitan homologación.
5. **Lectura e interacción:** textos y conectores sin solapamientos; controles accesibles por teclado; foco visible; zoom y desplazamiento utilizables en escritorio y móvil; significado comprensible sin depender sólo del color. Revisar tanto el explorador como el SVG abierto directamente.
6. **Publicación:** fuentes de detalle alcanzables, descarga idéntica al SVG versionado y recursos locales bajo la política de seguridad del sitio. El explorador no debe ejecutar solicitudes a sistemas corporativos ni presentar una simulación como prueba de operación.

Estas comprobaciones verifican la representación documental. La aceptación del producto requiere las pruebas de los componentes reales descritas en el [roadmap](../../docs/roadmap.md).
