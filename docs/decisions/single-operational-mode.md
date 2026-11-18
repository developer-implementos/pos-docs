# ADR-25 · Un solo modo de operación, sin laboratorio ni demo

**Estado:** decisión del responsable del producto del 18-11-2026, en implementación en [TASK-406](https://github.com/developer-implementos/pos-platform/issues/406) mediante PR encadenadas del producto, todavía sin integrar en `main`. Completa el [ADR-22](environments.md), que ya fijaba un solo modo de ejecución para QA y producción. No acredita despliegue en QA, homologación, operación productiva ni aceptación de QA.

**Decisión:** POS Platform corre de una sola forma en todas partes: en el equipo de un desarrollador, en la CI, en QA y en producción. `branch-api` siempre usa identidad operativa, HTTPS, una sucursal aprovisionada, y usuarios y roles propios del POS. Los clientes siempre se conectan a esa API. Se retiran el perfil `laboratory` de `branch-api`, el modo `branch-lab` de los clientes y la demo con datos en el navegador. Las diferencias entre ambientes quedan solo en la configuración y en los datos, y las pruebas cargan sus datos por las mismas puertas que QA y producción.

## Qué resuelve

El producto tenía tres formas de correr:

- **Operativa:** HTTPS, sucursal aprovisionada, usuarios, roles y activación de equipos.
- **Laboratorio:** solo en loopback y fuera de producción. Una semilla creaba la sucursal, dos cuentas sintéticas y el catálogo escribiendo tablas, y un login propio (`POST /auth/lab/login`) entraba sin activar el equipo.
- **Demo:** otra aplicación Angular entera con datos en el navegador, que simulaba pantallas del roadmap sin servidor.

Cada forma tenía su propio camino de identidad, sus propios datos y sus propias pruebas. Un recorrido verde en el laboratorio no demostraba que funcionara con la identidad y los datos de QA. La demo mostraba pantallas que el producto no implementa. El responsable lo pidió así:

> no entiendo eso de los perfiles. ya no deberia existir laboratorio yo creo. deberia funcionar con datos en db o quizas un hibrido. o quizas datos mock en db. total sera qa el ambiente. operacional me imagino que es como un backoffice. eso deberia estar en la misma app de caja pero ingresando con un perfil como admin u otro. los ambientes que usaremos seran solo qa y prod.

La administración ya vive en la misma app de caja y se habilita según el rol ([ADR-23](device-activation.md) y [ADR-24](email-sign-in.md)): lo que faltaba era quitar los otros modos.

## Un solo modo de servidor

- `branch-api` exige siempre HTTPS con certificado y llave explícitos, una sucursal aprovisionada y sesiones con prueba de posesión del equipo.
- Se retiran `POST /auth/lab/login` (`labLoginV1`), la identidad sintética, la restricción a loopback del laboratorio y los comandos `seed` y `purge-laboratory-security` de `database.js`.
- **Sin caída silenciosa.** `BRANCH_API_PROFILE=laboratory` hace fallar el arranque con un mensaje que nombra esta decisión. `BRANCH_API_PROFILE=operational` se acepta sin efecto mientras los servidores ya preparados la conserven, y la preparación de QA deja de escribirla. Ninguna configuración inválida hace que la API arranque en otro modo.
- **Contratos.** `GET /api/v1` informa `mode: operational` y la configuración efectiva, `profile: operational`. Ambos campos se conservan con un solo valor para que un cliente instalado antes de este cambio siga funcionando.

## Un solo catálogo de capacidades

El laboratorio ofrecía tres capacidades que el modo operativo no dejaba activar: solicitar un cliente (`customer.request`), aplicar promociones (`pricing.promotions`) y aplicar un descuento manual autorizado (`pricing.manual-discount`). Sin ellas, sus recorridos no podían pasar al modo operativo sin perder cobertura.

- **Soportar no es habilitar.** Las tres pasan a ser capacidades del único modo. Solo se habilitan por la activación explícita de cada caja (`database.js activate-checkout`), un documento que aprueba el administrador de la sucursal y que solo puede aplicar la cuenta propietaria de la base. El aprovisionamiento inicial sigue siendo de lectura y cotización.
- **Dependencias.** La activación rechaza promociones o descuento manual sin cotización, y la solicitud de cliente sin lectura de clientes.
- **Permisos.** Los permisos que el servidor ya implementa (`customer.request`, `pricing.discount.authorize`, `device.print`, `fiscal.request` y `fiscal.reconcile`) se pueden delegar con roles. Ningún rol por defecto los recibe; el administrador los obtiene solo si una activación se los concede.
- QA y producción no cambian de comportamiento mientras su activación no incluya esas capacidades.

## Cómo se prueban los recorridos

Las pruebas usan las mismas puertas que QA y producción:

| Qué | Puerta |
| --- | --- |
| Sucursal, cajas, equipos y administrador inicial | `database.js provision` |
| Capacidades de cada caja y permisos del administrador | `database.js activate-checkout` |
| Catálogo, precios, cupones, disponibilidad y clientes | `database.js import-commercial`, contrato `commercial-publication-v1` ([carga desde archivo](/guide/architecture/master-data-publication/#carga-desde-archivo-en-la-sucursal)) |
| Personas, roles y asignaciones | API de administración |
| Equipos | Activación con prueba de posesión ([ADR-23](device-activation.md)) |

- **Una publicación ficticia para todas las pruebas de venta.** Productos, precios, cupones y clientes sintéticos, con identidades RUT reservadas. Un cambio de precio se prueba publicando otra versión, como en producción.
- **Estados que ninguna puerta produce.** El resultado de un proveedor de pago ficticio, un historial de compensaciones o un trabajo de impresora pendiente se siguen sembrando desde fixtures exclusivos de prueba, con la cuenta propietaria y solo sobre bases generadas para la corrida. Nunca crean identidades ni datos comerciales. `libs/shared/backend/testing` sigue siendo exclusivo de pruebas.
- **Sin pérdida de cobertura.** Cada recorrido que usaba el laboratorio pasa al modo operativo. De las pruebas de la demo:
  - las que recorrían pantallas simuladas sin código de producto se retiran con esas pantallas, porque no probaban el producto: inicio, reportes, maestros, precios, sincronización, actividad, sucursales, dispositivos, integraciones, actualizaciones, documentos, cobranzas, devoluciones y la venta simulada;
  - las que verificaban contratos transversales de la interfaz pasan al cliente conectado, contra la API real: ayudas, foco de los diálogos, estados de interacción, contraste y alto contraste, accesibilidad, navegación por teclado, diseño a 375 px y el cliente móvil.
- **Dónde corre cada suite.** La suite de navegador de cada PR (`test:e2e`) deja de compilar la demo: corre contra `branch-api` por HTTPS y un PostgreSQL efímero. `test:e2e:mobile` prueba el cliente móvil conectado, y `test:e2e:branch` los recorridos de venta que antes usaban el laboratorio.

El inventario recorrido por recorrido, con el conteo de pruebas antes y después, está en la [ficha de la tarea](https://github.com/developer-implementos/pos-platform/blob/work/task-406-retirar-laboratorio/odd/tasks/retire-laboratory-demo.md).

## Clientes

- **Dos perfiles.** El archivo de despliegue del cliente admite `unconfigured` (sin servidor: el cliente muestra que falta su configuración) y `branch` (el origen HTTPS exacto de su API). `demo` y `branch-lab` se rechazan antes del arranque con un error de configuración; nunca se cae en otro modo.
- **Se retira la demo.** Se borran sus bibliotecas (`libs/data-access` de la demo, `libs/domain` y las features `access`, `checkout`, `insights` y `administration`), sus rutas, guards y tema en `client-shell`, y la configuración de build `demo` de escritorio y móvil.
- **Datos que deja la demo.** Al arrancar, el cliente borra las claves `corporate-pos:demo:v1` y `corporate-pos:auth:v1` del almacenamiento del navegador. Guardaban datos simulados que no son evidencia de nada y no deben quedar en un equipo de caja. Una versión posterior puede quitar esa limpieza.
- **Identidad de las aplicaciones.** El identificador de Tauri y el del cliente móvil no cambian: cambiarlos es una migración de identidad con su propio alcance.

## Datos y esquema

- **Las bases de laboratorio conservan su historial.** Ninguna migración aplicada se reescribe.
- **Migraciones nuevas, después de la 408.**
  - Una restricción `NOT VALID` y el valor por defecto `operational` impiden crear cuentas con perfil `laboratory` sin tocar las existentes. Se retira el disparador que separaba los dos perfiles.
  - `administration.lab_session`, que ya guardaba también las sesiones operativas, pasa a llamarse `administration.operator_session`.
- **Sin vista de compatibilidad.** Como establece el [ADR-22](environments.md), la API se detiene durante el despliegue, así que dos versiones no conviven y el cambio de nombre no necesita una vista.
- El diccionario de datos y el contrato exportado se actualizan en el producto y se importan aquí después de la integración.

## Ambiente local

`lab:*` y `compose.laboratory.yaml` se reemplazan por un ambiente local que se prepara igual que QA, sobre un PostgreSQL de loopback:

- roles separados de migración y de ejecución;
- `migrate`, `provision`, `activate-checkout` e `import-commercial` con la publicación ficticia;
- un certificado local y la API por HTTPS.

El desarrollador entra con el correo del administrador inicial y cambia su contraseña, como en QA.

## Relación con otras decisiones

- **[ADR-22](environments.md):** ya fijaba un solo modo para QA y producción; este ADR lo extiende al desarrollo local y a la CI y retira el código de los otros modos.
- **[ADR-23](device-activation.md) y [ADR-24](email-sign-in.md):** las pruebas activan cada equipo con prueba de posesión y entran con el correo, como cualquier persona.
- **[ADR-14](native-clients.md) y [ADR-21](web-client.md):** los tres clientes siguen siendo el mismo frontend conectado; ninguno conserva un modo sin servidor.
- **[ADR-19](postgresql-unit-of-work.md):** migraciones con la cuenta propietaria y roles separados, también para preparar las pruebas.

## Límites

- No habilita en QA ni en producción ninguna capacidad nueva: eso lo decide la activación de cada caja.
- Las pantallas que solo existían en la demo no tienen reemplazo hasta que su entregable del roadmap las implemente contra la API.
- No cambia los recorridos operativos ni los contratos de venta, pago, fiscalidad o ERP.
- Una prueba con datos sintéticos sigue sin acreditar integración con proveedores, homologación ni aceptación.

## Verificación

Pendiente: la implementación está en revisión en las PR encadenadas de [TASK-406](https://github.com/developer-implementos/pos-platform/issues/406). Su evidencia (pruebas de integración contra PostgreSQL, recorridos de navegador contra la API real y `ci:local`) se registrará aquí al integrarla.
