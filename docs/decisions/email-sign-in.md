# ADR-24 · Ingreso con correo y códigos de activación

**Estado:** decisión del responsable del producto del 18-11-2026, en implementación en [TASK-416](https://github.com/developer-implementos/pos-platform/issues/416). La implementación (backend, clientes, pruebas E2E y guía de despliegue) está en revisión en [pos-platform#418](https://github.com/developer-implementos/pos-platform/pull/418) (borrador, `76cf139`), todavía sin integrar en `main`. Completa el modelo de identidad del [ADR-23](device-activation.md) y prepara [F03-07](/guide/roadmap/phase-03/#work-f03-07) sin implementarla. No acredita despliegue en QA, homologación, operación productiva ni aceptación de QA.

**Decisión:** la persona ingresa al POS con su correo y su contraseña. El correo es un dato normalizado y único de la cuenta, no su llave: `operatorId` sigue siendo la identidad inmutable. Cada cuenta declara su origen, `local` o `erp`, y puede guardar la referencia del trabajador del ERP como dato. Un equipo se activa por defecto con un código de un solo uso que genera una persona autorizada desde su sesión, sin que nadie escriba una contraseña de administrador en el equipo nuevo; la activación con la cuenta del [ADR-23](device-activation.md) queda como alternativa. El administrador inicial se fija en el aprovisionamiento y su recuperación de emergencia es un comando propietario: no hay cuentas ni correos por defecto.

## Qué resuelve

La caja legacy identifica a las personas por correo y contraseña. Sus cuentas vienen de dos orígenes: empleados de AX, sincronizados con su RecId de trabajador y su número de personal, y cuentas administrativas que no existen en AX y que el legacy conserva fuera de esa sincronización. El POS pedía un nombre de usuario propio: obligaba a capacitar de nuevo, no correspondía al origen de los datos y no es el identificador de un futuro login corporativo, que usa el correo. Además, activar un equipo exigía que un administrador escribiera su contraseña en ese equipo.

## El correo como identificador

- **Normalizado.** Sin espacios alrededor y en minúsculas, por el contrato, el servicio y una restricción de la base. El formato es el de un campo `type=email` del navegador, con al menos un punto en el dominio porque los buzones son reales, y hasta 254 caracteres. El login no valida el formato: un correo mal escrito recibe la misma respuesta que uno inexistente.
- **Único entre todas las cuentas.** Las cuentas nunca se borran y una deshabilitada puede volver a habilitarse, así que su correo sigue reservado. Para reutilizar un buzón, se cambia el correo de la cuenta anterior. Un correo repetido al crear o editar una cuenta se rechaza con `OPERATOR_EMAIL_TAKEN`.
- **No es la llave.** `operatorId` (UUID) sigue identificando la cuenta. Cambiar el correo conserva el historial, la auditoría y las sesiones abiertas, que pertenecen a la cuenta y no a su identificador de ingreso.
- **Respuesta indistinguible.** Un correo inexistente y una contraseña equivocada dan la misma respuesta HTTP; la causa queda en `authorization_audit`.

El correo se usa en el login operativo (`operationalLoginV2`), en la activación con la cuenta (`startInstallationActivationV1`), en el alta y la edición de operadores, en el aprovisionamiento y en el login de laboratorio, que entra con identidades sintéticas hasta que [TASK-406](https://github.com/developer-implementos/pos-platform/issues/406) lo retire. El responsable confirmó que los buzones son reales.

## Retiro del nombre de usuario

El usuario se retira; no convive con el correo. Dos identificadores de ingreso duplicarían la normalización, la unicidad y el límite de intentos. Una serie de migraciones nuevas, sin reescribir ninguna aplicada, deja cada paso auditable:

1. `255_operator_email_expansion` agrega el correo, el origen y la referencia del trabajador.
2. `256_operator_email_transition` da a cada cuenta previa el correo `<usuario>@migrated.invalid`, en un dominio reservado ([RFC 6761](https://www.rfc-editor.org/rfc/rfc6761)) que nunca entrega correo, hasta que un administrador registre su buzón real. Después exige e indexa el correo, y la protección de la cuenta deja cambiar el correo pero no la identidad, el perfil ni el origen.
3. `257_operator_username_retirement` retira la columna del usuario.

El producto prueba la actualización desde una base antigua hasta el manifiesto completo. Un documento de aprovisionamiento anterior, con usuario en vez de correo, se rechaza: en QA corresponde reiniciar el ambiente y aprovisionarlo de nuevo.

## Origen de la cuenta y referencia del trabajador

- **`origin`** vale `local` (creada por un administrador en el POS: administración, soporte o TI) o `erp` (empleado del ERP). Es inmutable, y el POS solo crea cuentas `local`.
- **Referencia del trabajador, opcional:** `worker_rec_id`, el RecId del trabajador de AX, y `personnel_number`, su número de personal. Son datos, nunca llave ni credencial. Una cuenta `erp` exige el RecId, un trabajador tiene a lo más una cuenta, y la administración del POS no cambia la referencia de una cuenta `erp`.

Una sincronización futura de empleados solo podrá tocar cuentas `erp`. La protección de las cuentas `local` es un atributo de datos, no una excepción en el código. Esta decisión no implementa esa sincronización, que pertenece a los maestros y al ERP.

## Códigos de activación

### Generar un código

Una persona con `installation.activate`, en una asignación vigente de la sucursal, abre **Equipos de las cajas** en un equipo ya activado y elige «Generar código de activación» en una caja. `POST /administration/installations/:installationId/activation-codes` (`createInstallationActivationCodeV1`) acepta solo una instalación habilitada de la sucursal y devuelve el código, la caja, su canal y el vencimiento. El código se muestra una sola vez; generar otro para la misma caja anula el anterior.

### Formato y almacenamiento

- **Doce caracteres en base32 de Crockford (60 bits),** mostrados como `XXXX-XXXX-XXXX`. Al escribirlo no importan las mayúsculas, los espacios ni los guiones, y se aceptan las letras que Crockford lee como dígitos (O como 0; I y L como 1).
- **Selector y verificador.** Los seis primeros caracteres seleccionan el código y los seis últimos se verifican. Gracias al selector, los intentos fallidos se cuentan en ese código; sin él solo habría un límite global.
- **Solo el HMAC.** La base guarda un HMAC-SHA256 del código, con una llave derivada con HKDF ([RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)) de la llave de la base que autentica los desafíos de login (`login_challenge_key`) y una etiqueta propia, `pos-activation-code-v1`. Una copia de la tabla sin esa llave no permite probar códigos, y un código nunca puede presentarse como desafío ni al revés. La comparación es en tiempo constante.

### Reglas

- **Diez minutos y un solo uso.** Activa una sola instalación y solo desde un cliente de su canal.
- **Cinco intentos por código:** el quinto fallido lo cierra.
- **Un código abierto por caja** y un selector único entre los abiertos, garantizados por índices únicos parciales.
- **Límite por origen:** en el despliegue, nginx limita por IP las rutas de identidad sin sesión, incluido el canje.
- **Sin bloqueo global por fallos.** Dejaría a cualquiera en la red sin poder activar equipos, el mismo defecto de disponibilidad que el ADR-23 evitó en los desafíos de login. Con a lo más un código abierto por caja, acertar al azar tiene una probabilidad de (cajas abiertas)/2⁶⁰ por intento, y quien conozca un selector tiene cinco intentos sobre 2³⁰ verificadores.

### Canjear un código

En el equipo nuevo, «Activar este equipo» pide el código. `POST /auth/activation-code-redemptions` (`redeemInstallationActivationCodeV1`) recibe el código, el canal del cliente y la llave pública del equipo, y conserva la prueba de posesión del ADR-23: el cliente genera un par ECDSA P-256 no extraíble y solo la llave pública sale del equipo. El servidor vincula esa llave a la instalación para la que se generó el código, en nombre de quien lo generó. Como cualquier activación, sube la época, revoca la credencial anterior y cierra sus sesiones. El canje toma el candado de la sucursal y bloquea el código: un segundo canje concurrente lo encuentra cerrado.

### Una sola respuesta

Un código vencido, cerrado (canjeado, reemplazado o agotado), mal escrito, de otro canal, de otra sucursal (su base tiene otra llave y otros códigos) o cuyo emisor perdió el permiso o fue deshabilitado recibe la misma respuesta `UNAUTHORIZED`. La causa queda solo en `authorization_audit.reason_code`. Un canal equivocado cuenta como intento pero no consume el código, para que la persona lo use en el equipo correcto. Una llave pública inválida o ya usada responde `VALIDATION_ERROR` sin tocar el código, porque no revela nada de él.

### Auditoría

- `installation.activation-code.issue` registra quién generó el código y para qué caja.
- `installation.activation-code.redeem` registra cada canje, aceptado o rechazado, con quien generó el código como actor. Un canje aceptado enlaza la credencial nueva del equipo.

Los códigos no se borran: quedan cerrados, con su motivo (`redeemed`, `superseded` o `attempts-exhausted`) y la credencial que los canjeó.

## Por qué se mantiene la activación con la cuenta

El primer equipo de una sucursal no puede activarse con un código: no hay otro equipo con sesión desde donde generarlo. Una sucursal con todos sus equipos desactivados dependería, además, de la credencial propietaria del servidor. Por eso el código es la forma por defecto en la pantalla y la activación con la cuenta de quien autoriza (ADR-23, ahora con correo) queda como alternativa explícita.

Riesgo residual: con la contraseña robada de un administrador se puede activar un equipo sin poseer otro ya activado. Queda auditado y limitado por el límite de intentos por cuenta y por el de nginx. Lo cerraría una política de sucursal que exija código después del primer equipo, que no forma parte de esta decisión.

## Administrador inicial y recuperación de emergencia

**Aprovisionamiento.** `bootstrap.sh` exige `--admin-email` y `--admin-name`, sin valor por defecto, y el documento de aprovisionamiento lleva `administrator.email`. Así se resuelve el problema del huevo y la gallina sin una cuenta fija: la primera cuenta la crea, fuera de banda, quien tiene la credencial propietaria del servidor, con una contraseña de un solo uso que el POS obliga a cambiar ([ADR-23](device-activation.md#cambio-obligatorio-de-la-contraseña)).

**Recuperación de emergencia.** Si ningún administrador puede entrar, quien tiene la credencial propietaria ejecuta `database.js recover-administrator --email <correo>` (en QA, `deploy recover-admin --email <correo>`). El comando:

- solo sirve para una cuenta existente, habilitada y con una asignación vigente del rol protegido de administración: no crea cuentas, no usa una cuenta fija y no amplía accesos;
- emite una contraseña aleatoria de un solo uso y la muestra una vez: sola en la salida estándar o en un archivo nuevo de acceso privado (en QA, en un archivo nuevo del directorio de secretos, sin mostrarla);
- marca el cambio obligatorio, cierra las sesiones de la cuenta y levanta su bloqueo por intentos;
- deja `administrator.recover` en la auditoría, sin actor, porque la credencial propietaria opera fuera de banda.

La cuenta de ejecución de la API no puede ejecutarlo, y la llave de despliegue de QA tampoco puede invocarlo.

## Datos

En la rama en revisión, las migraciones aditivas 255 a 258 cambian:

| Cambio | Qué guarda |
| --- | --- |
| `operator_account.email` | Correo de ingreso, normalizado y único entre todas las cuentas (255 y 256). |
| `operator_account.username` | Se retira (257). |
| `operator_account.origin` | `local` o `erp`; inmutable (255). |
| `operator_account.worker_rec_id`, `operator_account.personnel_number` | Referencia opcional del trabajador del ERP: RecId (`bigint`) y número de personal. Una cuenta `erp` exige el RecId; a lo más una cuenta por trabajador (255). |
| `installation_activation_code` | Cada código: selector, HMAC del verificador, instalación, quién lo generó y cuándo, vencimiento, intentos fallidos, cierre y su motivo, y la credencial que lo canjeó. A lo más uno abierto por instalación; no se borra (`258_installation_activation_codes`). |

Los números de migración son los de la rama; si otra serie se integra antes en `main`, la PR del producto los renumera.

**Contrato y diccionario de datos: importación pendiente.** La [referencia de APIs](/guide/api/pos-platform/) y el [diccionario de datos](/guide/api/data-model/) del portal se importan desde una revisión limpia de `main` del producto con `tools/product-reference/sync.mjs`, nunca a mano. Las operaciones `createInstallationActivationCodeV1` y `redeemInstallationActivationCodeV1`, los cambios de `email` en los contratos existentes, la tabla `installation_activation_code` y las columnas nuevas aparecerán al importar el artefacto después de que TASK-416 se integre en `main`.

## Clientes

`pos-web`, `pos-desktop` y `pos-mobile` comparten las pantallas, y en la misma PR del producto:

- el login pide correo y contraseña;
- «Activar este equipo» ofrece primero el código y, como alternativa, la cuenta de quien autoriza;
- **Equipos de las cajas** agrega «Generar código de activación», con el código, su vencimiento y «Copiar código»;
- **Usuarios y accesos** muestra y edita el correo, muestra el origen y registra el vínculo opcional con el trabajador;
- la autorización de un descuento pide el correo del supervisor.

## Relación con otras decisiones

- **[ADR-16](../contracts/identity-and-trust.md).** Fija el identificador de ingreso del operador. La federación corporativa sigue siendo una propuesta del ADR-16.
- **[ADR-22](environments.md).** En QA, el administrador inicial se aprovisiona con `--admin-email`, el primer equipo web se activa con su cuenta y los demás con códigos. La recuperación de emergencia tiene su comando en el servidor de QA.
- **[ADR-23](device-activation.md).** Conserva la llave no extraíble, la prueba de posesión en cada login y el cambio obligatorio de la contraseña. Agrega el canje de un código como segunda forma de activar un equipo, y la activación con la cuenta pide el correo.
- **[F03-07](/guide/roadmap/phase-03/#work-f03-07).** La identidad corporativa podrá usar el correo como identificador común; esta decisión no la implementa.
- **[F04-08](/guide/roadmap/phase-04/#work-f04-08).** La atribución del vendedor de una venta, distinto del operador de caja y configurable (P-06 y Q-07 de su ficha en el producto), queda en F04-08. Esta decisión solo deja el vínculo con el trabajador para que sea posible.

## Límites

- **Invitaciones por correo:** necesitan un proveedor de correo y quedan fuera. El código, la contraseña inicial y la de recuperación se entregan por un canal privado.
- **El código es un secreto al portador** durante diez minutos: lo puede canjear quien lo lea en un equipo de su canal. Se dicta o se copia solo a la persona que está frente al equipo nuevo.
- **PIN de cajero** para el cambio rápido de persona: mejora futura.
- **Sincronización de empleados de AX:** no se implementa; hasta entonces, el POS no tiene cuentas `erp`.
- **Laboratorio:** el perfil `laboratory` se retira en [TASK-406](https://github.com/developer-implementos/pos-platform/issues/406).

## Verificación

El producto prueba con PostgreSQL real, en `account-identity.test.ts`: la misma respuesta HTTP para un correo inexistente y una contraseña equivocada; la unicidad y el cambio de correo con la sesión intacta; el origen y la referencia del ERP; la emisión y el canje con solo el hash y su auditoría; el código vencido, desconocido, de otro canal, reemplazado, agotado y repetido con la misma respuesta; el canje concurrente; el emisor sin permiso; otra sucursal en otra base, y la recuperación de emergencia. La prueba de actualización de migraciones cubre la transición de las cuentas previas. La [ficha de la tarea](https://github.com/developer-implementos/pos-platform/blob/76cf13969c19b5b0e1730498d63e955d7815f9a9/odd/tasks/email-identity-activation-codes.md) del producto, en `76cf139`, registra esa evidencia local; la CI de #418 todavía no la acredita.

Esa evidencia no acredita:

- la integración en `main` ni la importación del contrato y del diccionario de datos;
- los recorridos Playwright de login, activación y «Usuarios y accesos», que la ficha deja en curso (T5);
- el despliegue en QA ni la entrada de jefatura con correo y código;
- la homologación del almacén de llaves en cada navegador, Tauri y Capacitor, que sigue pendiente según el ADR-23.
