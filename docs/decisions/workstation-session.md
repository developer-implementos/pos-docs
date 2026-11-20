# ADR-30 · Sesión del puesto, reautenticación y marco común de los clientes

**Estado:** diseño de [TASK-461](https://github.com/developer-implementos/pos-platform/issues/461) del 20-11-2026, base común de las tareas P0 y P1 de la [auditoría de pantallas y recorridos](https://github.com/developer-implementos/pos-platform/issues/451). El responsable del producto las pidió así: «queremos una solucion enterprise-grade, sin parches y como lo harian las bigtechs». La implementación llega en cinco tareas, todas sin integrar en `main`:

- [TASK-462](https://github.com/developer-implementos/pos-platform/issues/462): bloqueo del puesto por inactividad y cambio de usuario.
- [TASK-463](https://github.com/developer-implementos/pos-platform/issues/463): aviso y vuelta a la venta al llegar al tope de la sesión.
- [TASK-464](https://github.com/developer-implementos/pos-platform/issues/464): reautenticación para acciones sensibles.
- [TASK-465](https://github.com/developer-implementos/pos-platform/issues/465): bloqueo por intentos fallidos y desbloqueo por un administrador.
- [TASK-466](https://github.com/developer-implementos/pos-platform/issues/466): encabezado, «Mi cuenta», ayuda y «Acerca de este equipo».

Los valores de la política son los **provisionales de QA** que el responsable adoptó el 20-11-2026 a partir de la recomendación de [Q-58](/project/questions/#q-58), hasta que seguridad la decida. Este ADR no acredita la implementación, el despliegue en QA, la homologación ni la aceptación.

**Decisión:**

- La sesión de una persona en un puesto tiene dos plazos. Vence tras 15 min sin actividad y nunca dura más de 8 h desde el último ingreso con contraseña. Los fija una política de acceso versionada, no el código, y `branch-api` los impone.
- La actividad de la persona renueva la sesión con la prueba de posesión del equipo de [ADR-23](device-activation.md), y cada renovación rota el token.
- Antes de cada vencimiento, el cliente avisa con al menos 20 s. Al vencer, o cuando la persona lo pide, una capa opaca bloquea el puesto sin descartar nada.
- Desbloquear es volver a ingresar con contraseña y llave del equipo. Solo la misma persona sigue donde estaba; «Cambiar de usuario» descarta todo.
- Las acciones administrativas sensibles exigen reingresar la contraseña. Esa prueba vale 5 min, para esa sesión y esa acción.
- 5 fallos en 15 min bloquean por 30 min el ingreso con un correo, con un mensaje que no revela si la cuenta existe. Un administrador puede desbloquearlo tras verificar a la persona.
- El encabezado muestra siempre quién opera, con qué rol, en qué sucursal, caja y turno, y en qué ambiente. «Mi cuenta» reúne los datos, la contraseña y las sesiones propias.

## Qué resuelve

La auditoría encontró que el hueco del POS no estaba en las pantallas de negocio, sino en el marco común de los clientes:

- La sesión era absoluta, de una hora, sin vencimiento por inactividad, sin aviso y sin renovación.
- Al vencer, el cliente volvía al login y descartaba lo que tenía en memoria: el cajero entraba a la pantalla de inicio de su rol y buscaba su cesta.
- En un puesto compartido, una sesión de administración desatendida permitía crear usuarios, roles o códigos de activación sin ninguna prueba reciente.
- El bloqueo por intentos duraba 5 min, no se explicaba y nadie podía levantarlo.
- El encabezado no decía quién operaba, dónde ni en qué ambiente, y no había cuenta propia, ayuda ni versión visible.

Implementar cada hallazgo por separado habría dejado cinco temporizadores, cinco diálogos y cinco maneras de pedir la contraseña. Este ADR define un solo modelo.

## Estados del puesto

| Estado | Qué ve la persona | Qué impone `branch-api` | Dueño |
| --- | --- | --- | --- |
| Activo | La operación normal. Su actividad renueva la sesión. | Acepta la sesión hasta su vencimiento por inactividad y su tope. | Este ADR |
| Por vencer | Un `alertdialog` con cuenta regresiva, al menos 20 s antes de vencer por inactividad o por el tope. | Nada distinto: la sesión sigue vigente. | Este ADR |
| Bloqueado | Una capa opaca con su nombre y el motivo, que pide su contraseña y ofrece «Cambiar de usuario». La pantalla de abajo queda inerte, con sus diálogos abiertos. | Rechaza una sesión vencida con 401 `SESSION_EXPIRED`. | Este ADR |
| Sin conexión | Un indicador global; las escrituras se deshabilitan con su motivo. | — | [TASK-457](https://github.com/developer-implementos/pos-platform/issues/457) |
| Versión nueva | Un aviso que no bloquea; la recarga espera a que no haya una operación en curso. | — | [TASK-458](https://github.com/developer-implementos/pos-platform/issues/458) |
| Error | Un aviso con código de referencia, «Reintentar» y «Volver al inicio». | — | [TASK-458](https://github.com/developer-implementos/pos-platform/issues/458) |

Cómo se combinan:

- **Bloqueo y conexión.** Sin conexión, la renovación falla. Si llega el vencimiento sin una renovación confirmada, el cliente bloquea igual, con su propio reloj. Desbloquear necesita la sucursal: la capa dice que no está disponible y permite reintentar.
- **Bloqueo, versión nueva y errores.** La capa cubre los avisos. El token vive solo en memoria y una recarga termina la sesión, así que el cliente nunca recarga con el puesto bloqueado.
- **Cobro en curso.** Un cobro que espera al terminal cuenta como actividad: no aparece el aviso ni la capa, y se aplican al terminar.

## Política de acceso

### Parámetros

| Parámetro | Valor provisional | Rango aceptado | Fuente |
| --- | --- | --- | --- |
| `idleTimeoutSeconds` | 900 (15 min) | 60 a 3 600 | Q-58; PCI DSS 4.0.1, 8.2.8 |
| `expiryWarningSeconds` | 60 | 20 a 300, menor que los otros dos plazos | WCAG 2.2, 2.2.1 (al menos 20 s); la caja legacy avisa un minuto antes |
| `maxSessionSeconds` | 28 800 (8 h) | 300 a 28 800 | Q-58; OWASP sugiere de 4 a 8 h |
| `lockoutThreshold` | 5 | 3 a 10 | Q-58; PCI DSS 4.0.1, 8.3.4 (no más de 10) |
| `lockoutWindowSeconds` | 900 (15 min) | 60 a 86 400 | Q-58 |
| `lockoutDurationSeconds` | 1 800 (30 min) | 60 a 86 400 | Q-58; PCI DSS 4.0.1, 8.3.4 (al menos 30 min o hasta verificar la identidad) |
| `reauthenticationWindowSeconds` | 300 (5 min) | 60 a 900 | Este ADR; OWASP ASVS 4.0.3, V3.7.1 |

Las notas de aplicabilidad de PCI DSS 8.2.8 y 8.3.4 excluyen la cuenta de cajero de un terminal que accede a un solo número de tarjeta por transacción, y el POS solo guarda los últimos cuatro dígitos. Para el cajero, el fundamento son las reglas `CAJ-052`, `CAJ-071` y `CAJ-072` del producto y OWASP ASVS. El alcance PCI lo fija [F05-08](https://github.com/developer-implementos/pos-platform/issues/67).

### Revisiones versionadas

- La política vive en `administration.access_policy_revision`, en revisiones inmutables. Cada una guarda los valores, desde cuándo rige, quién la decidió (un rol, nunca una persona) y su fuente. Rige la más reciente cuya vigencia ya empezó.
- Es corporativa: Q-58 la propone igual en todos los países. Hay una sola por base de sucursal, con el mismo contenido en todas. No depende de la caja, porque el bloqueo por intentos se decide antes de saber desde qué equipo se entra. Un ajuste por caja ([F01-07](https://github.com/developer-implementos/pos-platform/issues/16)) queda para cuando operaciones lo pida.
- La migración publica la revisión 1 con los valores provisionales. La decidió el responsable del producto y su fuente es «Q-58, valor provisional de QA del 20-11-2026, pendiente de seguridad».
- Las revisiones siguientes las publica el dueño del servidor con `database.js publish-access-policy --file <documento>`, la misma puerta propietaria de `activate-checkout`. El documento se valida contra los rangos de la tabla, y repetirlo no publica nada nuevo.
- Cada sesión guarda la revisión que la rige al emitirse. Una revisión nueva aplica a las sesiones siguientes y no cambia las abiertas.
- `BRANCH_API_SESSION_TTL_MS` se retira. Si un servidor la conserva, `branch-api` no arranca y el mensaje nombra este ADR: así nadie cree que todavía tiene efecto.
- Cuando seguridad decida Q-58, se publica la revisión que corresponda, sin cambiar código.

## Contrato con branch-api

### Tope, inactividad y renovación

Al ingresar (`operationalLoginV2`), la sesión recibe dos plazos:

- `expiresAt`, el tope: el ingreso más `maxSessionSeconds`;
- `idleExpiresAt`: el ingreso más `idleTimeoutSeconds`, sin pasar el tope.

La respuesta del login y `GET /auth/session` agregan `sessionId`, `issuedAt`, `idleExpiresAt` y la política que rige la sesión (`accessPolicy`: su versión, la inactividad y el aviso).

`POST /auth/session/renewal` (`renewSessionV1`) renueva la sesión. Recibe el token vigente y una prueba de posesión del equipo: la firma, con la llave no extraíble del equipo, de un desafío de un solo uso de `POST /auth/challenges`, con su propio dominio de firma (`pos-session-renewal-v1`). En una transacción, el servidor:

1. comprueba que la sesión siga vigente y que firme la misma credencial con la que se ingresó;
2. rota el token, y el anterior deja de valer;
3. mueve `idleExpiresAt` a ahora más la inactividad, sin pasar el tope.

Una sesión vencida por inactividad no se renueva: hay que volver a ingresar.

Reglas del cliente:

- **Solo la actividad de la persona renueva:** teclado, puntero o toque, o un cobro en curso. Una consulta de fondo no renueva.
- **Cuándo:** después de la mitad de la ventana de inactividad desde la última renovación, si hubo actividad.
- **Sin carreras:** antes de renovar, el cliente espera que terminen las solicitudes en curso, y retiene las nuevas hasta tener el token rotado.
- **Reloj:** el cliente cuenta sus plazos desde que envió la renovación, con su reloj monotónico. Así nunca cree tener más tiempo que el servidor.

Respuestas:

- Con la sesión vencida, por inactividad o por el tope, cualquier operación responde 401 `SESSION_EXPIRED`.
- Con un token revocado o desconocido, sigue respondiendo 401 `UNAUTHORIZED`.
- El cliente bloquea el puesto en ambos casos.
- `logoutV1` acepta además una sesión vencida que no esté revocada, para que «Cambiar de usuario» la cierre igual.

### Bloqueo del puesto y desbloqueo

El cliente bloquea el puesto:

- por inactividad, al llegar a `idleExpiresAt` según su reloj;
- al llegar al tope;
- a pedido, con «Bloquear pantalla»;
- cuando el servidor responde 401 a cualquier operación.

La capa es opaca y queda sobre todo lo demás, también sobre los diálogos y avisos de PrimeNG, que viven en `body`. Lo que queda debajo se marca `inert`: no lo alcanzan el teclado ni los lectores de pantalla. La capa muestra el nombre de la persona y el motivo, pide su contraseña y ofrece «Desbloquear» y «Cambiar de usuario».

Desbloquear es un ingreso completo, con el mismo login y el mismo bloqueo por intentos: el correo de la sesión, que el cliente conserva en memoria, la contraseña y la prueba de posesión.

- Crea una sesión nueva con su propio tope de 8 h: el tope se cuenta desde la última vez que la persona probó su contraseña.
- Si la sesión nueva es de la misma persona (`subjectId`), el cliente retira la capa y todo sigue igual: ruta, cesta, turno y diálogos. Después cierra la sesión anterior.
- Si fuera otra persona, cierra la sesión nueva y descarta todo.

«Cambiar de usuario» cierra la sesión y destruye el shell con sus stores: la persona siguiente no ve nada de la anterior.

### Aviso y vuelta al lugar

- **Por inactividad,** el `alertdialog` aparece `expiryWarningSeconds` antes y cuenta hacia atrás. «Seguir trabajando», o Escape, renueva.
- **Por el tope,** el mismo aviso no puede extender la sesión. Ofrece «Confirmar mi contraseña ahora», que abre la capa de desbloqueo antes de tiempo, o seguir y confirmarla al vencer.
- WCAG 2.2.1 pide poder extender un límite de tiempo con una acción simple. Un tope de seguridad no se extiende sin reautenticarse; a cambio, tras reautenticarse se sigue sin perder datos, como pide 2.2.5 (AAA, de referencia).
- **La vuelta al lugar no navega.** El shell no se destruye mientras la persona sea la misma, así que no hay una URL de retorno que validar y la aplicación no sigue ninguna que reciba.
- **Una recarga termina la sesión,** porque el token vive solo en memoria: la persona vuelve al login y a la pantalla de inicio de su rol. Las cestas siguen guardadas en la sucursal.

### Reautenticación para acciones sensibles

El producto publica el catálogo `REAUTHENTICATION_REQUIRED_OPERATIONS` en los contratos de administración:

| Operación | Acción |
| --- | --- |
| `createOperatorV1` y `updateOperatorV1` | Crear un usuario y cambiar su correo, nombre o habilitación |
| `resetOperatorPasswordV1` | Cambiar la contraseña de otra persona |
| `revokeOperatorSessionsV1` | Cerrar las sesiones de otra persona |
| `createRoleV1` y `updateRoleV1` | Crear un rol y cambiar sus permisos |
| `createAssignmentV1` y `updateAssignmentV1` | Asignar o revocar un rol en una caja |
| `createInstallationActivationCodeV1` | Generar un código de activación |
| `deactivateInstallationV1` | Desactivar el equipo de una caja |
| `unlockOperatorSignInV1` | Desbloquear el ingreso de una persona |
| `revokeOwnSessionV1` | Cerrar otra sesión propia |

`POST /auth/session/reauthentications` (`reauthenticateSessionV1`) recibe:

- el token vigente;
- el `operationId` del catálogo;
- la contraseña;
- una prueba de posesión con el dominio `pos-session-reauthentication-v1`.

Concede una prueba ligada a esa sesión y a esa acción, que vale `reauthenticationWindowSeconds`. Dentro de esa ventana, la misma acción se repite sin volver a pedir la contraseña.

- Sin una prueba vigente, la acción responde 403 `REAUTHENTICATION_REQUIRED` antes de ejecutarse. Se usa 403 y no el 401 de RFC 9470, porque en esta API un 401 significa que la sesión ya no vale y el cliente bloquearía el puesto.
- Una contraseña equivocada responde 403 `REAUTHENTICATION_FAILED` y cuenta para el bloqueo por intentos.
- La auditoría registra cada reautenticación, concedida o rechazada, con su acción.
- El cliente pide la contraseña antes de enviar la acción y, si la prueba venció en el servidor, la vuelve a pedir una vez.

Queda fuera autorizar la acción con la credencial de un supervisor cuando el actor no tiene el permiso. Es doble control y pertenece a [F04-06](https://github.com/developer-implementos/pos-platform/issues/54); hoy solo el descuento manual lo usa.

### Bloqueo por intentos

- **Qué se cuenta.** El conteo es por la huella del correo normalizado, exista o no la cuenta. `lockoutThreshold` fallos dentro de `lockoutWindowSeconds`, contados desde el primero, bloquean el ingreso por `lockoutDurationSeconds`. Un ingreso correcto reinicia el conteo. Durante el bloqueo no se verifica la contraseña ni se cuenta otro fallo.
- **Dónde.** Cuentan los fallos del login (también el desbloqueo del puesto), de la activación con la cuenta, de la reautenticación y del cambio de la contraseña propia.
- **Respuesta.** 429 `SIGN_IN_LOCKED`, con `Retry-After` en segundos, que CORS expone. El login dice que el ingreso con ese correo está bloqueado hasta las HH:MM y que, para entrar antes, quien administra los usuarios puede verificar la identidad y desbloquearlo. Un correo que no existe recibe la misma respuesta.
- **Desbloqueo.** «Usuarios y accesos» muestra «Bloqueada hasta HH:MM» (`listSignInLocksV1`) y la acción «Desbloquear» (`unlockOperatorSignInV1`). Esta exige:
  - el permiso `administration.operators.manage`;
  - no tener menos permisos que la persona desbloqueada;
  - declarar que se verificó su identidad;
  - reautenticarse.

  Queda en la auditoría con el motivo.
- **Costo conocido.** Quien conozca un correo puede bloquearlo fallando a propósito. Es el precio del bloqueo por cuenta que documenta OWASP; el desbloqueo por un administrador lo mitiga y la auditoría lo deja a la vista.

### Cuenta y sesiones propias

- `GET /auth/account` (`getOwnAccountV1`) entrega los datos del encabezado y de «Mi cuenta»: nombre, correo, rol, sucursal, caja, canal, la sesión actual y el ingreso anterior.
- `GET /auth/sessions` (`listOwnSessionsV1`) lista las sesiones vigentes de la persona en la sucursal, con su caja, canal, inicio, última renovación y plazos, y marca la actual.
- `POST /auth/sessions/:sessionId/revoke` (`revokeOwnSessionV1`) cierra una sesión propia y está en el catálogo de acciones sensibles. Cerrar la actual es «Cerrar sesión».

### Errores públicos nuevos

| Código | Estado | Cuándo | Qué hace el cliente |
| --- | --- | --- | --- |
| `SESSION_EXPIRED` | 401 | La sesión venció por inactividad o por su tope | Bloquea el puesto |
| `REAUTHENTICATION_REQUIRED` | 403 | Una acción sensible sin prueba vigente | Pide la contraseña |
| `REAUTHENTICATION_FAILED` | 403 | La contraseña o la posesión no se comprobaron al reautenticar | Lo dice y permite reintentar |
| `SIGN_IN_LOCKED` | 429 | El ingreso con ese correo está bloqueado | Muestra hasta cuándo y a quién acudir |

`TOO_MANY_REQUESTS` sigue para los demás límites, como la admisión del catálogo. El contrato de error sigue siendo `{ code, message, category, timestamp }`, sin detalles.

## Encabezado y «Mi cuenta»

### Encabezado

De izquierda a derecha:

1. el logo, que lleva al inicio;
2. la etiqueta del ambiente, cuando el paquete del cliente la trae;
3. el lugar del indicador de conexión;
4. el turno;
5. el perfil;
6. «Cerrar sesión».

- **Ambiente.** El sello de compilación del cliente, `client-build.json`, se genera al empaquetar y puede traer una etiqueta, por ejemplo «QA». El cliente la muestra tal cual, con el color de advertencia del preset y en todos los anchos; sin etiqueta no muestra nada. El cliente no tiene lógica por ambiente.
- **Conexión.** El encabezado reserva el lugar por proyección de contenido (`[posHeaderStatus]`). [TASK-457](https://github.com/developer-implementos/pos-platform/issues/457) es dueña del indicador y de su store.
- **Turno.** Muestra «Turno abierto desde HH:MM» o «Sin turno abierto», solo a quien puede ver la caja.
- **Perfil.** Muestra un avatar tonal de 32 px, con radio de 8 px y las iniciales, el nombre y, debajo, el rol y la caja. Lleva 12 px de separación horizontal y 2 px entre líneas, según las reglas de diseño de `AGENTS.md`. Por debajo de 800 px queda solo el avatar, en un botón de 44 × 44 px.
  - Su etiqueta accesible nombra a la persona, su rol, la sucursal y la caja, también en móvil, y no muestra tooltip.
  - Abre un menú con ese contexto y las entradas «Mi cuenta», «Ayuda», «Acerca de este equipo» y «Bloquear pantalla».
- **Identidad visual.** Es la de prime-showcase: fondo de marca con su patrón, Inter, iconos Phosphor Bold de 24 px en botones de 44 px, el foco de 3,2 px y los tokens del preset.

### «Mi cuenta»

Es la ruta `/account`, con el título «Mi cuenta · POS Platform», y se abre desde el perfil en todos los anchos. Tiene cuatro secciones:

- «Tus datos»: nombre, correo, rol, sucursal, caja y equipo.
- «Esta sesión»: inicio, vencimiento por inactividad, tope e ingreso anterior.
- «Contraseña»: «Cambiar mi contraseña», que sale del menú lateral.
- «Sesiones abiertas»: las propias, con «Cerrar» en las otras, que pide la contraseña.

### Ayuda y «Acerca de este equipo»

- Son diálogos, no rutas: abrirlos no saca a la persona de la venta. «Ayuda» está siempre en el mismo lugar, el perfil, y también en el login (WCAG 2.2, 3.2.6).
- «Ayuda» trae una guía breve del puesto (bloqueo, vencimiento, cuenta bloqueada, contraseña olvidada y sin conexión) y el contacto de soporte del sello de compilación. Sin contacto configurado, indica pedir ayuda a quien administra la sucursal.
- «Acerca de este equipo» muestra la revisión del cliente, el canal, la caja, la instalación (un identificador que no es secreto), la versión de la API y la sucursal. «Copiar datos para soporte» copia esos datos, sin nombre, correo ni credenciales.

## Datos

- `administration.access_policy_revision`: tabla nueva, inmutable.
- `administration.operator_session` agrega la revisión de la política que la rige, `idle_expires_at` y la última renovación.
  - El token puede rotar mientras la sesión está vigente.
  - El inicio, el tope, la asignación y la credencial siguen inmutables.
  - Al migrar se cierran las sesiones abiertas.
- `administration.session_reauthentication`: tabla nueva, con la sesión, la acción, el momento y el vencimiento de cada prueba.
- `administration.login_throttle` agrega el inicio de la ventana de conteo.
- `administration.branch` agrega un nombre visible opcional, que se fija al aprovisionar o con un comando propietario.

Cada cambio actualiza el diccionario de datos del contexto.

## Compatibilidad y despliegue

- Los clientes y `branch-api` se publican juntos ([ADR-22](environments.md)). Los contratos nuevos son operaciones nuevas. Las respuestas que agregan campos, la sesión y el login, las leen los clientes de la misma versión; un cliente anterior que recibe un contrato distinto lo trata como versión nueva ([TASK-458](https://github.com/developer-implementos/pos-platform/issues/458)).
- Al migrar, las sesiones abiertas se cierran una vez: quien estaba operando vuelve a ingresar.
- En QA la revisión 1 llega con la migración: no hay que configurar nada para tener los valores provisionales. La etiqueta del ambiente, el contacto de soporte y el nombre de la sucursal se fijan según la guía de despliegue del producto.

## Alternativas descartadas

- **Desbloquear sobre la misma sesión.** Exigiría dos caminos, uno para la sesión inactiva y otro para la que pasó su tope, y dejaría el tope contado desde un ingreso de hace horas aunque la persona acabara de escribir su contraseña.
- **Que cualquier solicitud renueve.** Una consulta periódica mantendría viva una sesión abandonada.
- **Renovar sin rotar el token.** Un token copiado valdría lo mismo que la sesión, hasta 8 h.
- **Un token de refresco aparte.** El cliente no guarda credenciales fuera de memoria, y la llave no extraíble del equipo ya es la prueba de larga duración, sin exponer un segundo secreto.
- **Variables de entorno o constantes.** No tienen versión ni procedencia, y el responsable pidió configuración versionada.
- **La política dentro de la configuración por caja.** El bloqueo por intentos se decide antes de conocer la caja; una política por caja, además, permitiría deducir si un equipo existe por cómo responde.
- **Un PIN por persona.** Es [F03-07](https://github.com/developer-implementos/pos-platform/issues/43); hasta entonces el desbloqueo usa la contraseña.

## Relación con otras decisiones

- **[ADR-16](../contracts/identity-and-trust.md).** La sesión sigue siendo local a la sucursal y no reemplaza una identidad corporativa futura.
- **[ADR-22](environments.md).** QA y producción difieren solo en la configuración y los datos: la política se publica por la puerta propietaria y el sello de compilación lo genera el empaquetado de cada ambiente.
- **[ADR-23](device-activation.md).** La renovación y la reautenticación usan la llave no extraíble del equipo y sus desafíos de un solo uso, con dominios de firma propios. Desactivar un equipo revoca su credencial, y con ella cualquier renovación.
- **[ADR-24](email-sign-in.md).** El correo de ingreso identifica también el conteo de intentos; la recuperación de emergencia del servidor sigue limpiando ese conteo.
- **[ADR-25](single-operational-mode.md).** Las pruebas cargan la política por la misma puerta propietaria, o con la revisión inicial de la migración.
- **ADR-29**, en revisión en [TASK-450](https://github.com/developer-implementos/pos-platform/issues/450). Su límite de códigos de recuperación es independiente del bloqueo por intentos, y el cambio de contraseña que hace cierra las sesiones igual que hoy.

## Límites

- **La capa no protege contra el depurador.** Quien abre las herramientas de desarrollo del navegador puede ver lo que quedó en memoria debajo de la capa. El control es el servidor, que rechaza la sesión vencida; la capa protege la pantalla del puesto compartido.
- **El bloqueo por intentos es por correo:** ver el costo conocido arriba.
- **Una sola política por base.** No hay ajuste por caja ni distribución automática a todas las sucursales (F04 y F06): hoy cada revisión se publica en cada base.
- **Sin homologar en las cáscaras nativas.** El recorrido se prueba en el navegador; Tauri y Capacitor no están homologados.
- **Valores provisionales** hasta que seguridad decida Q-58.

## Verificación

Cada tarea entrega su evidencia en su PR y en la ficha `odd/tasks/workstation-session.md` del producto:

- **Integración con PostgreSQL desechable:** vencimiento por inactividad y por el tope, renovación con y sin posesión, rotación del token, reautenticación por acción, bloqueo por intentos y su desbloqueo, y sesiones propias.
- **Pruebas unitarias** del store de sesión, del transporte y de la actividad.
- **Recorridos Playwright** contra la API real, con el reloj del navegador adelantado:
  - el aviso;
  - el bloqueo y el desbloqueo que conserva la cesta;
  - «Cambiar de usuario»;
  - la reautenticación de una acción;
  - el bloqueo por intentos y su desbloqueo;
  - el encabezado a 375 y 1440 px.

Esa evidencia no acredita la decisión de Q-58, el despliegue en QA, la homologación en Tauri o Capacitor ni la aceptación de QA.
