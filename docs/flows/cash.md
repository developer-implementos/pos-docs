# Abrir y operar una caja

El operador necesita una identidad autorizada y un ámbito de país, sucursal, caja y puesto. La configuración efectiva y el permiso del backend determinan qué comandos puede ejecutar. Consultar [acceso y operación](/guide/proposal/access-operations/) y [fronteras de identidad](/guide/architecture/identity/) para el contrato completo.

## Apertura y jornada

La guía [F01](/guide/implementation/phase-1/) describe la apertura persistida y el perfil conectado. El [flujo de venta](sale.md) parte del turno habilitado; la interfaz no concede permisos por mostrar una caja seleccionada.

La [operación de caja](/guide/operations/cash-management/) conserva la separación entre venta, cobranza de deuda, devolución y movimientos de efectivo. Abrir un turno no acredita el cierre completo, custodia o conciliación de toda la jornada.

## Dónde trabajar y comprobar

| Fuente | Qué revisar |
| --- | --- |
| [Contratos del POS](/guide/api/pos-platform/) | Operaciones efectivamente exportadas del contexto de caja |
| [Controlador de caja](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/libs/backend/cash/src/api/cash.controller.ts) | Apertura y consulta del turno en la revisión inspeccionada |
| [Identidad y caja con PostgreSQL](https://github.com/developer-implementos/pos-platform/blob/98f8987bfa8764ab77f6a55a7686f2ed7884d541/apps/branch-api/integration/identity-cash.test.ts) | Persistencia, ámbito y autorización |
| [Jornada de tienda](/guide/roadmap/phase-04/) | Entregables y criterios de movimientos, cierre y conciliación |

Ante pérdida de LAN o del servidor local, consultar [recuperación](recovery.md). La continuidad sin Internet presupone que la LAN y la autoridad de sucursal siguen disponibles.
