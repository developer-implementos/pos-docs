# ADR-31 · Caja tomada por la persona y continuidad del turno entre equipos

**Estado:** propuesta del 24-11-2026 de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782), aceptada por el responsable del producto el mismo día. Su pedido fue: «debe funcionar como antes corrigiendo todos los problemas de seguridad y con mejoras». Reemplaza las partes del [ADR-23](device-activation.md), del [ADR-21](web-client.md) y del [ADR-30](workstation-session.md) que atan una caja a un equipo. Mantiene todo lo demás, en particular la prueba de posesión. Se implementa por tareas registradas en la ficha de la issue; este ADR no acredita implementación, despliegue en QA, homologación ni aceptación.

**Decisión:**

- **El equipo se inscribe en la sucursal, no en una caja.** La activación crea la instalación con su canal y sus capacidades, y conserva la llave no extraíble, el desafío de un solo uso y la época del [ADR-23](device-activation.md).
- **Las cajas son un maestro del ERP.** Llegan por la capa anticorrupción, como cualquier otro maestro. El POS no las crea; una caja nueva aparece cuando el ERP la publica.
- **La sesión es de la persona en el equipo. El turno es de la persona en la caja.** Al ingresar, la persona ve las cajas de la sucursal con su estado y elige una.
- **Una caja tiene una tenencia:** el equipo que hoy escribe en ella, con una época que solo crece. Continuar el propio turno en otro equipo transfiere la tenencia y sube la época, y el equipo anterior queda excluido: sus escrituras y sus sesiones en esa caja se rechazan aunque vuelva la conexión.

## Qué resuelve

En el legacy, un cajero continúa su trabajo en otro equipo cuando falla el suyo, se corta la luz o necesita moverse: ingresa desde cualquier equipo, incluso un celular, ve las cajas de la sucursal y elige la suya. Las cajas se descargan del ERP; una caja nueva se crea en el ERP y aparece después de la sincronización. El listado distingue las cajas disponibles, las ocupadas y la propia, que se puede continuar mientras no se cierre. Lo describen la regla CAJ-006 y los endpoints `/cajas/cajas-disponibles` y `/cajas-usuario` del [catálogo del legacy](/guide/api/mountain/).

El POS derivaba la caja de la instalación ([ADR-23](device-activation.md)) y fijaba el canal en ella ([ADR-21](web-client.md)). Eso dejaba un solo equipo posible por caja, impedía continuar un turno en otro equipo y obligaba a reiniciar el ambiente para agregar cajas. La prueba de posesión, en cambio, sí corrigió un problema real del modelo anterior: identificadores que cualquiera podía copiar. Esta decisión conserva esa corrección y devuelve el comportamiento de negocio.

## Conceptos

| Concepto | Qué es | De dónde sale |
| --- | --- | --- |
| Equipo (instalación) | Identidad de confianza de un dispositivo en una sucursal: llave, época, canal (`web`, `desktop`, `mobile`) y capacidades (gaveta, impresora, terminal de pago) | La activación, por una persona con `installation.activate` |
| Caja | Entidad de negocio de la sucursal: nombre, código del ERP, estado y medios de pago habilitados | El maestro de cajas del ERP |
| Turno | El trabajo de una persona en una caja, con su efectivo y su arqueo, desde la apertura hasta el cierre | La apertura en la caja |
| Tenencia | El equipo que hoy escribe en el turno abierto de una caja, con su época | Abrir la caja o continuar el turno |
| Sesión | Una persona en un equipo, con la caja elegida si ya eligió una | El inicio de sesión con prueba de posesión |

## Maestro de cajas

- Cada caja tiene su código del ERP, la sucursal, el nombre visible y un estado (`active` o `retired`).
- La capa anticorrupción del ERP la publica como un maestro versionado. Aplicar una revisión crea las cajas nuevas, actualiza los nombres y retira las que el ERP retiró.
- **Una caja con un turno abierto no se retira.** La revisión queda pendiente para esa caja hasta el cierre, y la consola de operaciones lo muestra.
- Mientras se construye la integración con el ERP, QA importa las cajas reales de la sucursal desde el legacy, con la extracción de solo lectura ya existente. La importación produce el mismo documento versionado que publicará la integración.
- El nombre de una caja deja de declararse en el despliegue: sale del maestro.

## Activar un equipo

1. Una persona con `installation.activate` en la sucursal genera un **código de activación de la sucursal para un canal**, o activa el equipo con su cuenta, como en el [ADR-24](email-sign-in.md).
2. El equipo genera su par de llaves y envía solo la pública, con su canal, sus capacidades y un nombre visible, por ejemplo «PC mesón 2».
3. El servidor **crea la instalación** en la sucursal, con época 1, y guarda la credencial.

Reactivar un equipo, desactivarlo y perder la llave funcionan como en el [ADR-23](device-activation.md). Lo que cambia es que reactivar sube la época de esa instalación, no la de una caja. Ningún paso de la activación declara una caja.

## Iniciar sesión y elegir la caja

1. El inicio de sesión no cambia: desafío de un solo uso, firma con la llave del equipo y contraseña. La sesión queda ligada a la persona y a la credencial del equipo, **sin caja**.
2. Con una sesión sin caja, la persona solo puede ver el tablero de cajas, ir a «Mi cuenta» y cerrar sesión. Las pantallas de administración no exigen caja.
3. El tablero muestra cada caja activa de la sucursal en uno de estos estados:

| Estado | Qué ve la persona | Qué puede hacer |
| --- | --- | --- |
| Disponible | Sin turno abierto | Abrirla, si su rol lo permite y no tiene otro turno abierto |
| Ocupada | Quién la tiene, desde qué hora y en qué equipo, con su última señal | Nada; un supervisor puede cerrar ese turno con testigo ([TASK-761](https://github.com/developer-implementos/pos-platform/issues/761)) |
| Tu turno | Su propio turno abierto, en este equipo o en otro | Continuar aquí |
| Arqueo pendiente | Un turno abierto de un día anterior | El arqueo antes de cualquier otra cosa |

4. Elegir una caja liga la sesión a la caja y a la época de su tenencia. Desde ahí, el servidor deriva la caja de la sesión: el cliente nunca la declara en una operación.

## Tenencia y exclusión del equipo anterior

- **Abrir** una caja disponible crea el turno y su tenencia con la época 1, en una sola transacción.
- **Continuar** el propio turno en otro equipo transfiere la tenencia: sube la época y la registra con el equipo nuevo, quién la transfirió y por qué (por ejemplo, «equipo anterior sin señal»). Exige la contraseña reciente del ingreso. También en una sola transacción, con el bloqueo de la caja.
- **Exclusión:** cada comando que escribe en la caja valida, dentro de su transacción, que la tenencia vigente sea la de su sesión: mismo equipo y misma época. Si no lo es, responde `REGISTER_TENURE_LOST`. Las sesiones del equipo anterior pierden la caja y vuelven al tablero. Un borrador o un pago a medio hacer en ese equipo no se aplica dos veces: las operaciones idempotentes rechazan otra caja o equipo.
- **Nadie toma el turno de otra persona.** Un turno ajeno solo se cierra con el cierre por supervisor y testigo. Una persona tiene como máximo un turno abierto en la sucursal ([Q-56](/project/questions/#q-56)).
- **El efectivo no se mueve.** Continuar en otro equipo es seguir en la misma caja. Mover un turno a otra caja exige suspensión y custodia, que corresponden a [F04](/guide/roadmap/phase-04/).
- Todo ocurre dentro de la sucursal: continuar el turno funciona sin conexión con el país.

## Capacidades del equipo

El equipo declara al activarse qué periféricos tiene. Las acciones que dependen de uno que falta, como abrir la gaveta o imprimir en una impresora térmica, se ofrecen deshabilitadas, con el motivo, y el servidor las rechaza. Así un cajero puede continuar su turno desde un celular y sabe qué no puede hacer ahí. La configuración de la caja deja de compararse con el equipo al activarlo: se compara con el equipo que toma la tenencia.

## Seguridad

| Garantía | Cómo se cumple |
| --- | --- |
| Un equipo no puede hacerse pasar por otro | La prueba de posesión del [ADR-23](device-activation.md) se mantiene en cada ingreso |
| El cliente no decide en qué caja escribe | El servidor deriva la caja de la sesión y valida la tenencia en cada comando |
| Dos equipos no escriben el mismo turno | La época de la tenencia excluye al anterior, también si vuelve la conexión |
| Cada movimiento de un turno tiene responsable | La auditoría registra cada apertura, transferencia y rechazo, con persona, equipo y época |
| Nadie opera el turno de otra persona | Un turno ajeno solo se cierra, con supervisor y testigo |

## Publicación al país

La sucursal publica a `country-api`, por el canal de sincronización, el estado de sus cajas, sus turnos y la última señal de cada equipo. La [consola de operaciones](operations-console.md) lee esa proyección. Nadie se conecta a la base de la sucursal.

## Datos

Diseño lógico; la implementación define tablas y nombres finales.

| Cambio | Qué guarda |
| --- | --- |
| Caja | Código del ERP, estado y revisión del maestro, además del nombre |
| Instalación | Sin caja: sucursal, canal, capacidades y nombre visible |
| Asignación operativa | La persona, su rol y la sucursal, sin caja ni instalación |
| Tenencia de la caja | La caja, el turno, el equipo y la época vigentes; una por caja |
| Historial de la tenencia | Cada apertura y transferencia, con persona, equipo, época y motivo |
| Sesión | La caja y la época de la tenencia elegidas, si ya eligió |
| Código de activación | La sucursal y el canal, sin instalación |

Las tablas de negocio siguen guardando la caja y el equipo que escribió cada registro. QA no tiene producción: el cambio se aplica con migraciones nuevas y un reinicio del ambiente, sin compatibilidad hacia atrás.

## Relación con otras decisiones

- **[ADR-16](../contracts/identity-and-trust.md).** Un cambio de equipo deja de ser solo administrativo: continuar el turno es una transferencia de tenencia con época, que cumple su regla de excluir al escritor anterior.
- **[ADR-21](web-client.md).** El canal sigue siendo inmutable, pero es del equipo, no de la caja. Un navegador puede operar cualquier caja.
- **[ADR-23](device-activation.md).** Se mantienen la llave, el desafío, la época de la credencial y la revocación. Cambian dos cosas: la activación crea la instalación en la sucursal, y el inicio de sesión ya no deriva la caja.
- **[ADR-24](email-sign-in.md).** El código de activación es de la sucursal y del canal.
- **[ADR-30](workstation-session.md).** El encabezado muestra la caja elegida; el bloqueo del puesto no libera la caja.
- **[ADR-32](support-access.md).** «Ver como» nunca toma la tenencia.
- **[ADR-33](operations-console.md).** La consola muestra el tablero de todas las sucursales.

## Límites

- La integración del maestro de cajas con el ERP depende de la capa anticorrupción de [F03](/guide/roadmap/phase-03/); mientras tanto, QA importa desde el legacy.
- Mover un turno a otra caja, el cierre parcial y la pausa quedan para F04.
- Un equipo excluido que nunca volvió a conectarse conserva sus datos locales; los borradores no confirmados se recuperan según su propio contrato.

## Verificación

Cada tarea prueba con PostgreSQL real que dos equipos operan cajas distintas, que continuar el turno en otro equipo rechaza después las escrituras del anterior con `REGISTER_TENURE_LOST`, que nadie toma el turno de otra persona y que una caja con turno abierto no se retira.
