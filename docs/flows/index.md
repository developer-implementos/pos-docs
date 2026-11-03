# Recorridos de operación

Elige la operación que necesitas entender o modificar. Cada recorrido enlaza el diseño, los contratos y la evidencia correspondiente; el detalle permanece en su fuente. El [mapa de aplicaciones](/explore/applications/) sitúa los procesos y sus conexiones.

| Operación | Qué permite localizar |
| --- | --- |
| [Registrar una venta](sale.md) | Cotización, confirmación local, resultado del comando y entrega posterior |
| [Abrir y operar una caja](cash.md) | Identidad, turno, movimientos y alcance pendiente del cierre |
| [Cobrar y resolver un pago](payments.md) | Efectivo, transferencia, intento externo y resultado incierto |
| [Emitir y consultar un documento](fiscal.md) | Fuente comercial, identidad fiscal, envío y evidencia del emisor |
| [Imprimir y recuperar un trabajo](printing.md) | Autorización, recepción SQLite, permiso de ejecución y resultado |
| [Publicar y aplicar precios](pricing.md) | Origen, versión comercial, preparación, validación y activación |
| [Entregar operaciones a país y ERP](synchronization.md) | Outbox, recepción durable, trabajo y resultado externo |
| [Recuperar una operación o instalación](recovery.md) | Consulta del comando, conciliación y condiciones para reabrir |
| [Migrar desde el POS actual](migration.md) | Correspondencia de capacidades, coexistencia y aceptación del corte |

## Diseño, código y evidencia

Los diagramas de Archify representan el alcance indicado en cada vista. Un recorrido de **propuesta** incluye capacidades por construir; no describe automáticamente el comportamiento de la versión instalada. La [referencia del POS](/guide/api/pos-platform/) permite consultar los contratos exportados de una revisión del producto. Las guías [F01](/guide/implementation/phase-1/) y [F02](/guide/implementation/phase-2/) conservan el detalle de los incrementos integrados y sus límites.

Para cambiar una operación, parte de su issue en [POS Platform](https://github.com/developer-implementos/pos-platform/issues), consulta el recorrido afectado y sigue sus fuentes. El [procedimiento de documentación](../documentation-system.md) establece qué se actualiza y cómo se comprueba. La revisión humana se registra por separado en [validación de comprensión](../editorial/comprehension-validation.md).
