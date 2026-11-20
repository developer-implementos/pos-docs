# ADR-29 · Recuperación de contraseña por correo y control para mostrarla

**Estado:** decisión del responsable del producto del 20-11-2026, en implementación en [TASK-450](https://github.com/developer-implementos/pos-platform/issues/450). La implementación llega en PR apiladas del producto:

1. [pos-platform#452](https://github.com/developer-implementos/pos-platform/pull/452): el control para mostrar la contraseña, integrada en `main`.
2. [pos-platform#454](https://github.com/developer-implementos/pos-platform/pull/454): el envío de correo por SMTP, en revisión.
3. [pos-platform#455](https://github.com/developer-implementos/pos-platform/pull/455): el outbox y el aviso de cada cambio de contraseña, en revisión.
4. [pos-platform#469](https://github.com/developer-implementos/pos-platform/pull/469): la recuperación en el backend, en revisión.
5. [pos-platform#471](https://github.com/developer-implementos/pos-platform/pull/471): las pantallas y el recorrido Playwright, en revisión.

Completa el modelo de identidad del [ADR-23](device-activation.md) y del [ADR-24](email-sign-in.md). No acredita un buzón configurado, el despliegue en QA, la homologación ni la aceptación de QA.

**Decisión:** quien olvidó su contraseña la recupera desde la pantalla de ingreso de un equipo activado, con un código de 8 dígitos que el POS envía a su correo y que se escribe en esa misma caja. El pedido, la verificación del código y la nueva contraseña exigen la misma prueba de posesión del equipo que el login. La respuesta no revela si la cuenta existe. El POS envía sus correos desde un buzón corporativo propio, por SMTP con TLS obligatorio, a través de un outbox transaccional. Sin correo configurado, la recuperación no se ofrece y el login indica pedir el restablecimiento a quien administra los usuarios. Además, todo campo de contraseña de los clientes permite mostrar u ocultar lo escrito.

## Qué resuelve

Hasta ahora, una persona que olvida su contraseña solo podía pedirle a un administrador que le asignara una temporal (`resetOperatorPasswordV1`), que el POS obliga a cambiar. Si el olvidado era el último administrador, quedaba la recuperación de emergencia del [ADR-24](email-sign-in.md#administrador-inicial-y-recuperación-de-emergencia), con la credencial propietaria del servidor. Además, ningún campo de contraseña dejaba ver lo escrito, un error frecuente al teclear en una caja.

## El control para mostrar la contraseña

Todo campo de contraseña de los clientes usa el control de PrimeNG (`p-password` con `toggleMask`), como el login de prime-showcase:

- ingreso;
- cambio obligatorio y cambio propio;
- alta y reinicio por un administrador;
- activación con la cuenta de quien autoriza;
- autorización de un supervisor;
- recuperación.

PrimeNG 21 dibuja ese control como un SVG que solo responde al clic: sin nombre, sin rol y fuera del orden de tabulación. Un passthrough global, la vía que las reglas de diseño del producto fijan para los controles internos de PrimeNG, lo vuelve un botón:

- con nombre («Mostrar contraseña» u «Ocultar contraseña»);
- que Tab alcanza y que Enter o Espacio activan;
- con el tooltip compartido y `aria-controls` hacia su campo;
- que conserva el foco cuando PrimeNG dibuja el otro icono;
- con un objetivo de al menos 24 × 24 px.

El medidor de fuerza de PrimeNG queda apagado: califica por composición (minúsculas, mayúsculas y dígitos), y [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) pide no imponer reglas de composición. La política, de 12 a 256 caracteres, se muestra como texto junto al campo.

## Correo del POS

### Buzón y credencial

**Decisión del responsable (20-11-2026): buzón corporativo.** El POS envía con un remitente propio, por ejemplo `no-responder-pos@example.com`, en el mismo servicio SMTP corporativo que ya usan otros sistemas de la empresa, con una credencial separada.

- Infraestructura crea el buzón y entrega host, puerto, usuario y contraseña.
- La credencial va en un archivo de secretos del servidor de cada ambiente, nunca en un repositorio.
- Este portal no publica el dominio real.

### Puerto y adaptador

`EmailSenderPort` envía un mensaje sin conocer el negocio: un destinatario, asunto, texto, HTML y un `Message-ID` estable. No lanza por una entrega fallida, sino que la clasifica:

| Resultado | Cuándo | Qué hace el despachador |
| --- | --- | --- |
| `accepted` | El servidor tomó el mensaje | Lo cierra como enviado |
| `rejected` | Respuesta permanente (5xx, salvo 503) | Lo cierra como fallido, sin reintento |
| `deferred` | 4xx, red, TLS, tiempo, cuenta rechazada o cancelación | Lo reintenta hasta su plazo |

El motivo nunca lleva valores del mensaje ni de la respuesta del servidor.

El adaptador SMTP usa [nodemailer](https://nodemailer.com/), la misma librería de los otros sistemas corporativos (licencia MIT-0, sin dependencias). TLS es obligatorio:

- TLS implícito, o STARTTLS exigido antes de enviar la cuenta o el mensaje: no hay modo de texto plano;
- TLS 1.2 o más;
- el certificado se verifica contra las CA del sistema, o solo contra un archivo de CA configurado, para un relay con CA privada.

No accede a archivos ni a URL al componer y marca cada mensaje con `Auto-Submitted: auto-generated`, para que los buzones no respondan.

### Configuración

`branch-api` lee estos ajustes al arrancar, con el correo deshabilitado por defecto. Un ajuste de correo sin `BRANCH_API_MAIL_ENABLED=true` detiene el arranque, y los errores nombran el ajuste, nunca su valor.

| Ajuste | Uso |
| --- | --- |
| `BRANCH_API_MAIL_ENABLED` | `true` o `false` |
| `BRANCH_API_MAIL_FROM_ADDRESS`, `BRANCH_API_MAIL_FROM_NAME` | Remitente; el nombre es «POS Platform» por defecto |
| `BRANCH_API_SMTP_HOST`, `BRANCH_API_SMTP_PORT`, `BRANCH_API_SMTP_TLS` | Servidor, puerto (465 o 587 por defecto) y `implicit` o `starttls` |
| `BRANCH_API_SMTP_SERVICE` | En lugar de los tres anteriores, un servicio que nodemailer conoce por nombre, como `Gmail` u `Outlook365` |
| `BRANCH_API_SMTP_USER`, `BRANCH_API_SMTP_PASSWORD` | Cuenta del buzón; ambos o ninguno |
| `BRANCH_API_SMTP_CA_FILE` | CA del servidor SMTP, opcional |
| `BRANCH_API_PASSWORD_RECOVERY_SECRET` | Secreto de los códigos de recuperación; obligatorio con el correo habilitado |

### Outbox y despachador

Un correo se registra en un outbox (`administration.email_outbox`) dentro de la misma transacción que el hecho que lo origina. Si esa transacción no se confirma, no hay correo; si se confirma, el correo no se pierde aunque el servidor SMTP no responda o el proceso se reinicie.

Un despachador dentro de `branch-api`, el único proceso que hoy corre en cada sucursal:

- toma cada mensaje con un arrendamiento (`FOR UPDATE SKIP LOCKED`), así que dos instancias nunca envían el mismo a la vez;
- lo compone en ese momento y lo envía con un plazo menor que el del arrendamiento;
- reintenta con backoff exponencial y jitter hasta el plazo del mensaje;
- da a cada mensaje un `Message-ID` estable, que el receptor usa para descartar un duplicado si un reintento llega después de una entrega que no se confirmó;
- borra el destinatario al cerrar el mensaje.

No registra destinatarios, códigos ni cuerpos en los logs. Como el outbox es la frontera, el despachador puede pasar a `branch-sync-worker` sin cambiar el contrato.

### Aviso «tu contraseña cambió»

Cada cambio de contraseña de una cuenta, por cualquier vía, encola un aviso a su correo cuando el correo está habilitado:

- cambio propio;
- reinicio por un administrador;
- recuperación;
- recuperación de emergencia.

El aviso dice cuándo y por qué vía cambió, que se cerraron sus sesiones y a quién avisar si no fue la persona. No lleva enlaces ni códigos.

## Recuperación de la contraseña

### Dónde y para quién

«¿Olvidaste tu contraseña?» aparece en la pantalla de ingreso de un equipo activado. La recuperación solo envía un código a una cuenta:

- habilitada;
- con una asignación vigente en ese mismo equipo, la misma condición que el login;
- con un buzón que puede recibir correo, es decir, sin el dominio `.invalid` que el ADR-24 da a las cuentas migradas sin buzón.

Así, desde un equipo de la sucursal solo se pueden pedir códigos para quienes operan en él.

### Tres pasos con prueba de posesión

1. **Pedido** (`requestPasswordRecoveryV1`): el correo. La respuesta es siempre la misma, `200` con `{ accepted: true }`.
2. **Verificación** (`verifyPasswordRecoveryCodeV1`): el correo y el código. Si es correcto, lo canjea por una concesión de un solo uso que vence en 10 minutos.
3. **Confirmación** (`completePasswordRecoveryV1`): la concesión y la nueva contraseña.

Cada paso firma con la llave del equipo un desafío de un solo uso (`createLoginChallengeV1`). El enunciado lleva el dominio propio `pos-password-recovery-v1` y el paso, así que una firma de login no sirve para recuperar ni al revés. La verificación y la confirmación se hacen en el mismo equipo que pidió el código: un código escrito en otro equipo cuenta como intento fallido.

### El código

- **8 dígitos**, que se leen en un teléfono y se escriben en la caja.
- **No se guarda, ni en claro ni como hash.** Un outbox durable necesita el código para componer el correo, y el HMAC de un código de 8 dígitos no se puede invertir sin probar los 10⁸ valores. La base guarda un nonce aleatorio de 256 bits por recuperación, y el código es la salida de HMAC-SHA256 sobre ese nonce, reducida a 8 dígitos, como en HOTP ([RFC 4226](https://www.rfc-editor.org/rfc/rfc4226)). La llave deriva con HKDF ([RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)) de `BRANCH_API_PASSWORD_RECOVERY_SECRET`, que vive en la configuración y no en la base.
- **Sin el secreto, nada sirve:** una copia de la base o del outbox no permite calcular ni probar códigos. El despachador recalcula el código al componer el correo y no envía el de una recuperación que ya se cerró.

### Reglas

| Regla | Valor |
| --- | --- |
| Vigencia del código | 15 minutos |
| Usos | Uno: la verificación lo canjea |
| Intentos por código | 5; el quinto fallido lo cierra |
| Pedir otro | Cierra el anterior y su correo pendiente |
| Enfriamiento por cuenta | Un pedido por minuto |
| Tope por cuenta | 5 códigos en 24 horas |
| Tope por equipo | 10 pedidos por hora, de cualquier correo; el siguiente responde `TOO_MANY_REQUESTS` |
| Vigencia de la concesión | 10 minutos y un solo uso |

Con estos topes, quien insista sobre una cuenta prueba a lo más 25 códigos al día, de 10⁸ posibles. Cada intento queda en la auditoría, y la persona dueña de la cuenta recibe cada código pedido.

### Una sola respuesta, en el mismo tiempo

Un correo desconocido, una cuenta deshabilitada o sin asignación en ese equipo, un buzón `.invalid`, un pedido dentro del enfriamiento o sobre el tope reciben la misma respuesta que una cuenta válida. Esa respuesta no sale antes de 750 ms, un mínimo fijo muy por encima del trabajo del servidor, para que la duración tampoco lo revele.

Lo mismo en la verificación: un código equivocado, vencido, ya canjeado o sin recuperación abierta responde igual `UNAUTHORIZED`.

La causa queda solo en `authorization_audit.reason_code`. Solo el tope por equipo responde distinto, porque no depende del correo.

### Confirmación

La nueva contraseña cumple la misma política que el cambio propio: de 12 a 256 caracteres y distinta de la actual. Al confirmarla, en una transacción:

- se guarda su hash con el costo de producción;
- se limpia el cambio obligatorio y los intentos fallidos del login, como en un ingreso exitoso;
- se revocan todas las sesiones de la cuenta;
- se cierra la recuperación;
- se audita `password.recovery.complete`;
- se encola el aviso «tu contraseña cambió».

La persona vuelve al ingreso e inicia sesión con la nueva contraseña.

### Qué cierra una recuperación abierta

- Pedir otro código.
- Un cambio de contraseña por cualquier vía.
- Un cambio del correo de la cuenta: el código se envió a la dirección anterior.
- Deshabilitar la cuenta.
- El quinto intento fallido.

Los tres cambios de la cuenta los aplica un trigger de `operator_account`, así que ninguna vía, ni una corrección manual en la base, deja abierta una recuperación anterior. Un código o una concesión vencidos dejan de valer sin cerrar la recuperación; el pedido siguiente la cierra.

### Pantallas

Siguen la receta de recuperación de prime-showcase, con código en vez de enlace: el panel de marca simplificado y una sola ruta, `/password-recovery`, con cuatro pantallas:

1. el correo, con el que se escribió en el ingreso si había uno;
2. «Revisa tu correo», que no dice si la cuenta existe, con el campo del código, «Usar otro correo» y «Pedir otro código» pasado el minuto;
3. la contraseña nueva y su repetición, con la política a la vista;
4. la confirmación, con la vuelta al ingreso.

Cada pantalla lleva el foco a su título, para que un lector de pantalla anuncie dónde está la persona. El correo del ingreso viaja en el estado de la navegación, nunca en la dirección. La concesión vive solo en la memoria de la pantalla.

El código se escribe en un solo campo numérico con `autocomplete="one-time-code"`, como el código de activación, y no con `p-inputotp`. En PrimeNG 21.1.10 sus 8 casillas no tienen nombre accesible, y su pegado corta un código precedido de un espacio.

## Degradación honesta

`getPasswordRecoveryAvailabilityV1` dice si la recuperación está disponible: lo está solo con el correo habilitado. Sin correo:

- el pedido responde `CAPABILITY_UNAVAILABLE`;
- el despachador no corre y no se encolan avisos;
- el login no ofrece la recuperación como si funcionara: explica que hay que pedir el restablecimiento a quien administra los usuarios, que lo hace desde «Usuarios y accesos».

## Habilitación en un ambiente

La verificación técnica no habilita el correo de ningún ambiente. Para encenderlo en QA o en producción hacen falta:

1. **Infraestructura:** el buzón del POS, su credencial y la salida SMTP desde el servidor hacia el servicio corporativo. En sucursales, también la salida desde cada una.
2. **Configuración:** quien opera el ambiente agrega los ajustes de la tabla anterior al archivo de secretos del servidor, con un secreto de recuperación aleatorio de al menos 32 bytes, y reinicia `branch-api`.
3. **Comprobación:** la disponibilidad responde `true`, y un pedido de una cuenta de prueba llega al buzón.

El producto registra en su lista pública de seguimientos, sin responsable asignado todavía, el pedido a infraestructura (FOLLOWUP-027):

- el buzón y la credencial de QA y de producción;
- la apertura de la salida SMTP desde los servidores y las sucursales.

La decisión del remitente quedó resuelta por el responsable (FOLLOWUP-028).

## Datos

| Tabla | Qué guarda |
| --- | --- |
| `administration.password_recovery` | Cada recuperación: cuenta, equipo que la pidió, nonce del código, vencimiento, intentos fallidos, estado, huella de la concesión y su vencimiento, y cierre con su motivo. A lo más una abierta por cuenta. |
| `administration.password_recovery_throttle` | Pedidos de cada equipo en la ventana horaria vigente. |
| `administration.email_outbox` | Cada correo: tipo, destinatario mientras está pendiente, referencia al hecho que lo origina, plazo, intentos, próximo intento, arrendamiento, resultado y motivo, sin el cuerpo ni el código. |

La [referencia de APIs](/guide/api/pos-platform/) y el [diccionario de datos](/guide/api/data-model/) del portal se importan desde una revisión limpia de `main` del producto con `tools/product-reference/sync.mjs`. Las operaciones y tablas nuevas aparecerán al importar el artefacto después de que TASK-450 se integre.

## Relación con otras decisiones

- **[ADR-16](../contracts/identity-and-trust.md).** La recuperación es local a la sucursal y no reemplaza una futura identidad corporativa.
- **[ADR-22](environments.md).** QA y producción difieren solo en configuración: el correo se enciende con sus ajustes en cada ambiente.
- **[ADR-23](device-activation.md).** Reutiliza la llave no extraíble del equipo y sus desafíos de un solo uso. La contraseña que se recupera la elige la persona, así que no queda marcada para cambio obligatorio.
- **[ADR-24](email-sign-in.md).** El correo de ingreso es también el buzón de la recuperación. Las cuentas migradas con `.invalid` no reciben códigos. La recuperación de emergencia sigue disponible para el dueño del servidor y ahora también envía el aviso.
- **[ADR-30](workstation-session.md).** El bloqueo por intentos del ingreso es suyo. Completar una recuperación limpia los fallos del ingreso con la misma operación que un ingreso correcto: la contraseña que se intentaba adivinar ya no existe, y la persona probó su buzón y el equipo. Si la implementación del bloqueo ([TASK-465](https://github.com/developer-implementos/pos-platform/issues/465)) decide que solo un administrador lo levanta, la recuperación sigue esa regla.
- **[ADR-25](single-operational-mode.md).** Las pruebas cargan sus datos por las puertas oficiales y usan un servidor SMTP de prueba en loopback; nunca envían a un buzón real.

## Límites

- **El buzón no se verifica al crear la cuenta.** Si un administrador escribe mal un correo, los códigos y los avisos llegan a otra persona, que además necesitaría estar frente a un equipo activado donde esa cuenta opera. Confirmar el buzón al crear la cuenta queda como mejora.
- **Sin SMS, enlaces ni preguntas de seguridad.** Un enlace abierto desde el teléfono no alcanza al servidor on-prem de la sucursal, y las preguntas de seguridad no cumplen NIST SP 800-63B.
- **Un buzón comprometido** permite recuperar la cuenta desde un equipo donde opera. El aviso del cambio llega al mismo buzón: para la persona, la señal es no poder entrar con su contraseña.
- **Sin medidor de robustez.** Uno honesto con NIST SP 800-63B estima la contraseña contra diccionarios, como zxcvbn, y se apoya en la lista de contraseñas comprometidas que NIST pide comprobar en el servidor; uno que solo mida el largo llamaría fuerte a `aaaaaaaaaaaa`. Ese medidor y esa lista son una decisión aparte, con su dependencia y su fuente: el punto P2-6 de la [auditoría de pantallas](https://github.com/developer-implementos/pos-platform/issues/451).
- **La entrega depende del servicio corporativo.** El POS reintenta hasta el vencimiento del código. Un código que no llega se vuelve a pedir pasado el enfriamiento, o se pide el restablecimiento a un administrador.

## Verificación

La evidencia de cada eslabón está en la [ficha de la tarea](https://github.com/developer-implementos/pos-platform/blob/a3697293f025a767c984d443394fc7f3503d7370/odd/tasks/password-recovery.md) del producto:

- **El control para mostrar la contraseña:** pruebas unitarias del passthrough y un recorrido Playwright contra la API real, con teclado, foco, tooltip, objetivo mínimo y axe WCAG 2.2 AA sin violaciones.
- **El adaptador de correo:** pruebas contra un servidor SMTP de prueba en loopback:
  - entrega por STARTTLS y por TLS implícito;
  - rechazo de un servidor sin TLS antes de enviar la cuenta o el mensaje;
  - certificado no confiable y cuenta rechazada;
  - destinatario rechazado y diferido;
  - cancelación y servidor inalcanzable.
- **El outbox y los avisos:** pruebas contra PostgreSQL y el servidor SMTP de prueba:
  - un aviso entregado una vez y su destinatario borrado;
  - un reintento con el mismo `Message-ID`;
  - un rechazo permanente;
  - dos despachadores con un solo envío;
  - el vencimiento;
  - la fila inmutable;
  - eventos sin destinatarios.
- **La recuperación:** pruebas contra PostgreSQL y el servidor SMTP de prueba:
  - el recorrido completo con las sesiones revocadas;
  - la misma respuesta y el mismo tiempo mínimo para cada cuenta no elegible;
  - el quinto intento fallido, el código reemplazado, canjeado y vencido;
  - los topes por cuenta y por equipo;
  - firmas de otro paso, del login o de otra llave, y un desafío repetido;
  - el código y la concesión usados en otro equipo;
  - la contraseña actual rechazada sin gastar la concesión;
  - el cierre por cada cambio de la cuenta;
  - la API con y sin correo.
- **Las pantallas:** pruebas unitarias del store y del ingreso, y un recorrido Playwright que lee el código del servidor SMTP de prueba. Recorre el flujo completo con teclado, con axe WCAG 2.2 AA y sin desbordes a 375 y 1440 px. Lo corre la CI del producto sobre la PR.

Esa evidencia no acredita:

- la integración en `main` de las PR en revisión ni la importación del contrato y del diccionario;
- un buzón configurado ni el despliegue en QA;
- la entrega a un buzón real, que ninguna prueba hace;
- las compilaciones nativas de escritorio y móvil.
