# ADR-23 · Activación de equipos con prueba de posesión

**Estado:** decisión del responsable del producto del 17-11-2026, implementada en [TASK-412](https://github.com/developer-implementos/pos-platform/issues/412) e integrada en `main` el 18-11-2026: el backend con [pos-platform#413](https://github.com/developer-implementos/pos-platform/pull/413) (`47e1461`) y los clientes, sus pruebas E2E y la guía de despliegue con [pos-platform#414](https://github.com/developer-implementos/pos-platform/pull/414) (`588e11c`). El [ADR-24](email-sign-in.md), en revisión, cambia el usuario por el correo y agrega la activación con un código de un solo uso. Concreta, para las instalaciones cliente, el alta y la prueba de posesión del [ADR-16](../contracts/identity-and-trust.md) y adelanta parte de [F03-06](/guide/roadmap/phase-03/#work-f03-06). No acredita homologación, operación productiva ni aceptación de QA.

**Decisión:** un equipo se identifica por una llave propia, no por identificadores que cualquiera puede copiar. La pantalla inicial del cliente es siempre el login. Una persona autorizada activa el equipo una sola vez: el equipo genera un par de llaves, el servidor guarda solo la pública vinculada a una instalación aprovisionada y cada login firma un desafío de un solo uso. Toda contraseña elegida por otra persona se cambia antes de operar. Nunca hay credenciales por defecto.

## Qué resuelve

Hasta ahora, un cliente conectado importaba un JSON con `registerId` e `installationId`, y `POST /auth/login` (`operationalLoginV1`) los aceptaba sin prueba de que el equipo fuera esa caja: un usuario autorizado que conociera esos dos UUID podía presentarse como ella desde cualquier equipo. Importar un archivo en la pantalla inicial era, además, una mala experiencia. El responsable pidió el modelo de los POS empresariales: primero el login, y la activación del equipo como acción administrativa.

## Activar un equipo

1. Una persona con el permiso `installation.activate`, en una asignación vigente de la sucursal, elige «Activar este equipo» e ingresa su usuario y su contraseña. El cliente declara su canal. Con el [ADR-24](email-sign-in.md), en revisión, este paso pide el correo, y la forma por defecto pasa a ser un [código de activación](email-sign-in.md#códigos-de-activación) generado desde otro equipo, sin escribir la contraseña en el equipo nuevo.
2. `POST /auth/activations` (`startInstallationActivationV1`) devuelve un token opaco de un solo uso que vence a los 5 minutos —el servidor guarda solo su hash— y las instalaciones de ese canal que la persona puede activar. Un navegador solo activa instalaciones `web`.
3. El cliente genera con WebCrypto un par ECDSA P-256 no extraíble y lo guarda en IndexedDB. Solo la llave pública sale del equipo.
4. `POST /auth/installation-credentials` (`activateInstallationV1`) recibe el token, la instalación elegida y la llave pública (SPKI). El servidor la guarda con su época, quién activó el equipo y cuándo.

Reglas:

- **La activación no crea instalaciones ni asignaciones.** Siguen saliendo del aprovisionamiento de la sucursal.
- **Un equipo por instalación.** Activar de nuevo una instalación sube su época, revoca la credencial anterior y cierra sus sesiones: dos copias de un equipo nunca quedan autorizadas a la vez. Una credencial revocada no vuelve a activarse.
- **El canal es una regla de emparejamiento.** Lo declara el cliente; no es una frontera frente a quien ya tiene `installation.activate`.
- **Se puede activar con la contraseña inicial pendiente.** Sin un equipo activado no hay sesión donde cambiarla.
- **Mismos controles que el login.** Ambos pasos usan su límite de intentos y su auditoría, y el token se consume en el primer intento.

## Iniciar sesión con prueba de posesión

1. `POST /auth/challenges` (`createLoginChallengeV1`) entrega un desafío que vence a los 60 segundos **sin guardarlo**: su `nonce` es un HMAC-SHA256 del servidor, con una llave propia de la base, sobre el identificador del desafío, la instalación, la época de su credencial y el vencimiento. Pedir muchos desafíos no consume nada, así que no deja a una caja sin login. Una instalación desconocida o sin credencial recibe uno de la misma forma que nunca verifica.
2. El cliente firma con la llave del equipo (ECDSA P-256 con SHA-256, firma en formato IEEE P1363) este mensaje canónico, una línea por campo:

   ```text
   pos-login-v1
   <challengeId>
   <nonce>
   <installationId>
   <epoch>
   ```

3. `POST /auth/installation-login` (`operationalLoginV2`) recibe usuario (correo con el [ADR-24](email-sign-in.md)), contraseña, instalación, el desafío tal como se recibió y la firma. El servidor autentica el desafío, registra su uso una sola vez (un segundo uso se rechaza, también en otra réplica), verifica la firma y deriva la caja de la instalación: el cliente no la declara.

Todo rechazo responde igual: firma de otra llave, desafío repetido, vencido o de otra instalación, época anterior, instalación desactivada o sin credencial. La causa queda solo en la auditoría (`authorization_audit.reason_code`). La sesión queda ligada a su credencial y deja de valer al revocarla.

`POST /auth/login` (`operationalLoginV1`) se retira: no queda un camino operativo sin prueba de posesión. El login de laboratorio (`/auth/lab/login`) no cambia; se retira con el laboratorio en [TASK-406](https://github.com/developer-implementos/pos-platform/issues/406).

## Cambio obligatorio de la contraseña

La contraseña que elige otra persona queda marcada para cambio obligatorio (`operator_account.password_change_required`): la del administrador inicial, la del alta de un operador y la de un restablecimiento. Mientras siga marcada, el servidor solo admite consultar la sesión, cambiar la contraseña y cerrar sesión; cualquier otra operación responde `PASSWORD_CHANGE_REQUIRED`. Lo impone el servidor en todos los endpoints, no la interfaz. El cambio propio exige una contraseña distinta y retira la marca.

No existen credenciales por defecto, conforme a [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html) y a la [guía de autenticación de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html). El administrador inicial que crea el aprovisionamiento queda asignado a todas las cajas de su sucursal, así que puede activar cualquiera de ellas.

## Administrar los equipos

Con el permiso `installation.manage`:

- `GET /administration/installations` (`listInstallationDevicesV1`) muestra, por caja, su instalación, canal, estado (`active`, `not-activated` o `deactivated`), época y quién activó el equipo.
- `POST /administration/installations/:installationId/deactivate` (`deactivateInstallationV1`) recibe la época esperada y desactiva el equipo: revoca su credencial y sus sesiones.

Si un equipo pierde su llave, por ejemplo porque se borraron los datos del navegador, se activa de nuevo, lo que revoca la anterior. Los dos permisos nuevos se conceden solo al rol protegido de administración; otro rol los recibe únicamente de forma explícita.

## Datos

La migración aditiva `254_installation_credentials` agrega:

| Cambio                                      | Qué guarda                                                                                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installation_credential`                   | La credencial de cada instalación: época, identificador y llave pública, algoritmo `ES256`, quién la activó y cuándo, y su revocación. Como máximo una activa por instalación; no se borra. |
| `installation_activation`                   | El token de activación (solo su hash), el canal, el vencimiento y su consumo.                                                                                                               |
| `login_challenge_key`                       | La llave de la base con la que el servidor autentica los desafíos. La genera la migración y la cuenta de ejecución solo la lee.                                                             |
| `login_challenge_use`                       | Los desafíos ya usados, para que cada uno sirva una sola vez. Emitir desafíos no escribe aquí; la cuenta propietaria purga los vencidos (`database.js purge-login-challenges`).             |
| `operator_account.password_change_required` | La marca de cambio obligatorio.                                                                                                                                                             |
| `authorization_audit.reason_code`           | La causa de un rechazo, sin revelarla a quien llama.                                                                                                                                        |
| `lab_session.credential_id`                 | La credencial a la que queda ligada una sesión operativa.                                                                                                                                   |

Aplicar la migración revoca las sesiones operativas abiertas. La [referencia de APIs](/guide/api/pos-platform/) y el [diccionario de datos](/guide/api/data-model/) del portal muestran todavía la revisión anterior a TASK-412: se actualizarán al importar desde `main` el artefacto del producto con `tools/product-reference/sync.mjs`.

## Clientes

Los tres clientes (`pos-web`, `pos-desktop` y `pos-mobile`) cambiaron en [pos-platform#414](https://github.com/developer-implementos/pos-platform/pull/414):

- La pantalla inicial es siempre el login.
- «Activar este equipo» se ofrece solo a quien tiene el permiso; a un cajero se le indica que pida la activación.
- Una contraseña marcada lleva al cambio obligatorio antes de cualquier otra pantalla.
- La administración muestra los equipos por caja, con «Desactivar equipo».
- El perfil conectado deja de importar el JSON con los identificadores de la caja.

La política de origen que fija el build (`client-deployment.json`) no cambia.

## Relación con otras decisiones

- **[ADR-16](../contracts/identity-and-trust.md).** Este ADR concreta su alta con desafío de un uso, su prueba de posesión y su revocación para las instalaciones cliente. La llave vive en el almacén WebCrypto del navegador o del WebView, no en un almacén nativo, y la posesión se prueba al iniciar sesión, no en cada petición. La sesión resultante es un token ligado en el servidor a la credencial: revocar la credencial la invalida. Vincular el token a la llave (DPoP) y el almacén nativo siguen siendo propuestas del ADR-16.
- **[ADR-14](native-clients.md) y [ADR-21](web-client.md).** Los tres clientes reemplazan el registro por JSON del perfil conectado por la activación del equipo. El canal sigue siendo parte inmutable de la instalación.
- **[ADR-22](environments.md).** En QA, jefatura abre el cliente web, elige «Activar este equipo» con el usuario y la contraseña inicial del administrador, elige su caja web, inicia sesión y cambia la contraseña inicial. Los archivos de registro de caja que generaba la preparación del servidor dejaron de usarse para el login; la guía de despliegue del producto lo describe desde #414. Con el [ADR-24](email-sign-in.md), en revisión, el administrador entra con su correo y los demás equipos se activan con códigos.
- **[ADR-24](email-sign-in.md).** En revisión: el correo reemplaza al usuario como identificador de ingreso y un código de un solo uso, generado por quien tiene `installation.activate`, activa un equipo con la misma prueba de posesión. La activación con la cuenta queda como alternativa para el primer equipo de cada sucursal.
- **[F03-06](/guide/roadmap/phase-03/#work-f03-06).** Conserva las identidades de workloads, mTLS, la rotación con solapamiento, la revocación distribuible y la homologación.

## Límites

- **Restaurar un respaldo** de la base anterior a una revocación puede devolver una credencial revocada después del respaldo. Excluir esa credencial tras un restore pertenece a F03-06 y a la [recuperación de una instalación](../flows/recovery.md).
- **La llave no es extraíble** desde JavaScript, pero su protección depende del navegador o del WebView y de la cuenta del sistema operativo. No es un módulo de hardware ni un almacén nativo homologado.
- **Activación y login requieren conexión** con `branch-api`. La operación sin conexión sigue en su propio contrato.

## Verificación

El producto prueba con PostgreSQL real cada rechazo de la issue: firma de otra llave; desafío repetido, vencido o de otra instalación; época anterior; instalación desactivada; activación sin permiso, de otro canal o de otra sucursal. También prueba que activar de nuevo cierra las sesiones del equipo anterior y que una sesión con cambio obligatorio no puede hacer otra cosa. La [ficha de la tarea](https://github.com/developer-implementos/pos-platform/blob/ebc4e5045d8a323077e75a194821ae4369a4cdb8/odd/tasks/device-activation.md) del producto, en `ebc4e50`, registra esa evidencia local, incluida la prueba de que pedir 50 desafíos para una caja no impide entrar al equipo legítimo. La [misma ficha](https://github.com/developer-implementos/pos-platform/blob/588e11c80d02a78f387b22babb9c0771957b1dc8/odd/tasks/device-activation.md), en `588e11c`, registra los recorridos E2E web y operacional de los clientes contra la API HTTPS y PostgreSQL reales. Los checks de #413 y #414 terminaron sin fallos antes de integrarse, con dos omitidos en cada una.

Esa evidencia no acredita:

- el despliegue en QA ni la entrada de jefatura sin importar archivos;
- la homologación del almacén de llaves en cada navegador, Tauri y Capacitor.
