# ADR-32 · Acceso de soporte sin suplantar a la persona

**Estado:** propuesta del 24-11-2026 de [TASK-782](https://github.com/developer-implementos/pos-platform/issues/782), aceptada por el responsable del producto el mismo día: «me parece todo bien». Se implementa por tareas registradas en la ficha de la issue; este ADR no acredita implementación, despliegue en QA, homologación ni aceptación.

**Decisión:** soporte nunca entra con la cuenta ni la contraseña de otra persona. Actúa siempre con su propia identidad y usa tres herramientas:

1. **Diagnóstico.** El cajero envía un diagnóstico técnico con un código; soporte lo busca en la [consola de operaciones](operations-console.md).
2. **Asistencia remota, solo para ver.** Con la herramienta corporativa aprobada y el permiso del cajero en el momento. No es código de este producto.
3. **Rol propio y temporal.** Para reproducir un error, soporte recibe un acceso con vencimiento a un rol de la sucursal. Lo que hace queda a su nombre, en su propio turno.

Observar la sesión de otra persona («ver como») no se construye en esta etapa.

## Qué resuelve

En el legacy no existe una función de soporte para entrar a la sesión de otro. Soporte reproduce los errores entrando a la sucursal con el perfil de cajero. El pedido del responsable del producto fue conservar la capacidad: «soporte se puede meter con la sesion del cajero para identificar problemas».

La necesidad es legítima; el mecanismo, no:

- **Atribución.** Lo que soporte hace con la cuenta del cajero queda a nombre del cajero: ventas, documentos tributarios, movimientos de caja. Un faltante en el arqueo se le atribuye a él.
- **Credenciales compartidas.** El POS no deja que nadie conozca ni elija la contraseña de otra persona ([ADR-24](email-sign-in.md), [ADR-29](password-recovery.md)).
- **Sin rastro.** No hay forma de distinguir lo que hizo el cajero de lo que hizo soporte.

## Diagnóstico

- **«Enviar diagnóstico»** está en la ayuda del encabezado ([ADR-30](workstation-session.md)) y no exige una caja elegida. Muestra exactamente lo que va a enviar y responde un código corto para citarlo a soporte.
- Lleva la aplicación, su versión, la plantilla de la pantalla, el estado de conexión y los últimos identificadores de solicitud y fallas, en una lista cerrada de campos. No lleva texto libre, capturas, direcciones, cuerpos, documentos, clientes ni credenciales. La sucursal, la persona, la caja y el equipo salen de la sesión.
- Viaja al país con la credencial de la sucursal, en un carril propio y después de las ventas: la bandeja de salida de las ventas es inmutable y no admite borrar. Se conserva 7 días en la sucursal y 30 en el país, valores provisionales.
- Si la sucursal no responde, el diálogo dice que no se envió y ofrece copiar la referencia.
- Los errores automáticos del cliente siguen en el monitoreo técnico, que no lleva identificadores.

## Por qué no observar la sesión desde la consola

- El país solo conoce totales de ventas y el estado de las cajas. Mostrar ahí las pantallas del cajero exigiría copiar al centro sus datos y los de los clientes, y aun así estarían atrasados.
- No existe un canal del país hacia la sucursal, y abrirlo para lecturas interactivas dejaría que un país comprometido leyera cualquier tienda.
- Una vista nueva no muestra lo que el cajero tiene sin guardar en su pantalla: la asistencia remota sí.

Si después de 30 días de uso en QA queda una necesidad sin cubrir, la observación se diseña dentro de la sucursal, iniciada por soporte con su propia cuenta, con las escrituras rechazadas por el servidor y sin tomar la tenencia de una caja.

## Rol propio y temporal

- Es un acceso temporal que se suma al rol base de la persona en la sucursal, con vencimiento obligatorio, motivo y auditoría ([ADR-31](register-tenure.md)).
- Se pide desde la consola con un código y lo aprueba en la sucursal alguien con el permiso de administración, distinto de quien lo recibe. La consola muestra «solicitado» hasta que la sucursal confirma.
- Dura como máximo una jornada y vence solo. En QA, soporte tiene una asignación normal.
- Soporte abre su propio turno en una caja libre. Nunca opera el turno de otra persona; cerrar un turno ajeno sigue el cierre con supervisor y testigo de [TASK-761](https://github.com/developer-implementos/pos-platform/issues/761).

## Lo que no se permite

- Suplantar a una persona con escritura.
- Conocer, elegir o recibir la contraseña de otra persona.
- Compartir cuentas entre personas.

## Relación con otras decisiones

- **[ADR-24](email-sign-in.md) y [ADR-29](password-recovery.md).** Se mantiene que nadie conoce la contraseña de otro.
- **[ADR-30](workstation-session.md).** «Enviar diagnóstico» vive en la ayuda del encabezado.
- **[ADR-31](register-tenure.md).** El acceso temporal es parte de la asignación por sucursal; soporte nunca toma la caja de otra persona.
- **[ADR-33](operations-console.md).** La consola aloja la búsqueda de diagnósticos y la solicitud de un acceso temporal.

## Límites

- La asistencia remota depende de la herramienta que apruebe la organización. Tomar el control del equipo del cajero no está permitido: lo hecho quedaría a su nombre.
- Los plazos de conservación y la jornada son provisionales hasta que los decidan seguridad y privacidad.

## Verificación

Cada tarea prueba con PostgreSQL real que un diagnóstico no acepta campos fuera de su lista, que su volumen no demora una venta, que se borra en su plazo y que un acceso temporal vence solo y queda en la auditoría.
