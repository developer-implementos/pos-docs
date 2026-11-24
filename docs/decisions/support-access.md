# ADR-32 · Acceso de soporte sin suplantar a la persona

**Estado:** propuesta del 24-11-2026 de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782), aceptada por el responsable del producto el mismo día: «me parece todo bien». Se implementa por tareas registradas en la ficha de la issue; este ADR no acredita implementación, despliegue en QA, homologación ni aceptación.

**Decisión:** soporte nunca entra con la cuenta ni la contraseña de otra persona. Actúa siempre con su propia identidad y usa tres herramientas, de menor a mayor privilegio:

1. **Diagnóstico.** Los errores y los diagnósticos que envía el cajero llegan a la [consola de operaciones](operations-console.md) con su contexto, sin entrar a ninguna sesión.
2. **«Ver como», de solo lectura.** Soporte ve las pantallas, los datos y los permisos efectivos de una persona; el servidor rechaza toda escritura.
3. **Rol propio y temporal.** Para reproducir un error, soporte recibe una asignación con vencimiento a un rol de la sucursal. Lo que hace queda a su nombre, en su propio turno.

## Qué resuelve

En el legacy no existe una función de soporte para entrar a la sesión de otro. Soporte reproduce los errores entrando a la sucursal con el perfil de cajero. El pedido del responsable del producto fue conservar la capacidad: «soporte se puede meter con la sesion del cajero para identificar problemas».

La necesidad es legítima; el mecanismo, no:

- **Atribución.** Lo que soporte hace con la cuenta del cajero queda a nombre del cajero: ventas, documentos tributarios, movimientos de caja. Un faltante en el arqueo se le atribuye a él.
- **Credenciales compartidas.** El POS no deja que nadie conozca ni elija la contraseña de otra persona ([ADR-24](email-sign-in.md), [ADR-29](password-recovery.md)).
- **Sin rastro.** No hay forma de distinguir lo que hizo el cajero de lo que hizo soporte.

## Diagnóstico

- Cada error del cliente lleva el identificador de la solicitud, la pantalla, la sucursal, la caja, el equipo, la versión del cliente y la hora. No lleva contraseñas, tokens, datos de tarjetas ni el contenido de los documentos.
- El cajero tiene la acción **«Enviar diagnóstico»** en la ayuda del encabezado ([ADR-30](workstation-session.md)): adjunta el estado técnico reciente del puesto y le muestra el código del envío para citarlo a soporte.
- Los diagnósticos viajan al país por el canal de sincronización y soporte los consulta en la consola por persona, caja, equipo y hora. Nadie se conecta a la base de una sucursal.

## «Ver como»

- Requiere el permiso `support.view_as`, que no tiene ningún rol de tienda. Lo da una asignación con ámbito: una sucursal o el país.
- Se inicia desde la consola con la persona, el motivo y un ticket. Dura como máximo 30 minutos y se puede cerrar antes.
- El servidor calcula los permisos efectivos de la persona observada y los aplica a las lecturas. **Toda escritura se rechaza en el servidor** con `SUPPORT_VIEW_READ_ONLY`, no solo en la interfaz.
- Una franja fija muestra «Viendo como \<persona\> · solo lectura» y el tiempo restante.
- No toma la tenencia de ninguna caja ni sube su época ([ADR-31](register-tenure.md)): el cajero sigue vendiendo sin interrupción.
- Queda en la auditoría al iniciar y al terminar, con quién observó a quién, el motivo, el ticket y cada vista abierta. La persona observada lo ve en «Mi cuenta».

## Rol propio y temporal

- Una asignación operativa con `valid_from` y `valid_to`, como las de [F04-06](/guide/roadmap/phase-04/#work-f04-06), da a la cuenta de soporte un rol de la sucursal, por ejemplo cajero.
- En QA, soporte la tiene de forma permanente para reproducir errores con datos de prueba.
- En producción, la asignación exige aprobación de otra persona con el permiso de administración, dura como máximo una jornada y vence sola.
- Soporte abre su propio turno en una caja libre. Nunca opera el turno de otra persona; cerrar un turno ajeno sigue el cierre con supervisor y testigo de [TASK-761](https://github.com/developer-implementos/pos-platform/issues/761).

## Lo que no se permite

- Suplantar a una persona con escritura.
- Conocer, elegir o recibir la contraseña de otra persona.
- Compartir cuentas entre personas.

## Relación con otras decisiones

- **[ADR-24](email-sign-in.md) y [ADR-29](password-recovery.md).** Se mantiene que nadie conoce la contraseña de otro.
- **[ADR-30](workstation-session.md).** «Enviar diagnóstico» vive en la ayuda del encabezado; «Mi cuenta» muestra las observaciones.
- **[ADR-31](register-tenure.md).** «Ver como» no toma la tenencia de una caja.
- **[ADR-33](operations-console.md).** La consola aloja el diagnóstico, «ver como» y la solicitud de una asignación temporal.

## Límites

- «Ver como» muestra los datos que la sucursal publicó al país; si la sucursal está sin conexión, la consola muestra la hora del último dato.
- Reproducir un error del equipo físico (impresora, gaveta, terminal de pago) necesita el equipo; para eso sirve el diagnóstico, no «ver como».
- Los valores de 30 minutos y una jornada son provisionales de QA hasta que seguridad los decida.

## Verificación

Cada tarea prueba con PostgreSQL real que una escritura durante «ver como» se rechaza en el servidor, que «ver como» no cambia la tenencia de la caja, que una asignación temporal vence sola y que todo queda en la auditoría.
