# Migrar desde el POS actual

La migración conserva capacidades de negocio y verifica su reemplazo por ámbito. El [mapa de repositorios](/guide/evidence/repositories/) identifica lo observado en el legacy; la [evolución desde Chile](/guide/proposal/evolution/) explica la distribución objetivo. Las reuniones de [Chile, Perú y España](/guide/evidence/country-comparison/) conservan sus diferencias y pendientes.

## Contrastar capacidad y reemplazo

| Capacidad | Fuentes que deben acompañar el cambio |
| --- | --- |
| Venta, caja y permisos | [Mountain](/guide/evidence/mountain/), [venta](sale.md), [caja](cash.md) y contratos del POS |
| Impresión y periféricos | [API de impresión legacy](/guide/evidence/printing/) y [perfil por puesto](printing.md) |
| Integración central y maestros | [Concentrador](/guide/evidence/central-hub/), [sincronización](synchronization.md) y [precios](pricing.md) |
| Pagos y fiscalidad | [API de pagos actual](/guide/evidence/payments/), [cobro](payments.md) y [documentos](fiscal.md) |

## Coexistencia y corte

El [contrato de coexistencia y cambio de ERP](/guide/proposal/erp-migration/) define destino, versión y conciliación; conserva la identidad de las operaciones pendientes. El [recorrido de selección de destino](/guide/evidence/current-state/#7-v06--actividad-propuesta-elegir-destino-durante-la-migración-erp) representa la decisión propuesta, separada de la evidencia legacy de esa página.

La [fase piloto](/guide/roadmap/phase-05/) fija instalación, recuperación y aceptación del corte. Cada issue de migración debe identificar capacidad reemplazada, país/ámbito, evidencia del legacy, contrato nuevo, prueba de compatibilidad y reversión operativa. Que una aplicación ya tenga carpeta o binario no demuestra paridad funcional. Las fuentes de cada operación enlazan el trabajo pendiente y los límites de lo implementado.

## Contraste operativo antes del corte

El [contraste de Chile del 9 de noviembre](/guide/evidence/chile-operations/#10-contraste-de-reunión-y-lectura-del-9-de-noviembre-de-2026) encontró diferencias entre ramas informadas, árboles desplegados y contratos auditados. El manifiesto del piloto debe identificar revisión, modificaciones y artefactos efectivos, junto con las fuentes de usuarios/permisos, OVs, saldos y pendientes. Un proceso online, una cola registrada o acceso SQL no acredita contabilización, terminal conectado ni capacidad reemplazada.

Revisar los recorridos de [venta](sale.md), [cobro](payments.md), [caja](cash.md), [fiscalidad](fiscal.md) y [sincronización](synchronization.md) por acción y escenario de fallo. Preservar permisos de servidor, actor y referencia externa; distinguir maestro AX de contraseña local y consulta de NC de emisión, consumo de saldo y devolución. Las decisiones de campaña batería/OV y políticas de cierre se resuelven en las fuentes propietarias, sin copiar supuestos u omisiones del legacy al perfil productivo.

Al inspeccionar el legacy, clasificar efectos por implementación: cargar cliente puede actualizar maestros y validar cierre puede liberar OVs en AX. Esos recorridos se prueban en un entorno aislado y autorizado; una investigación de lectura no los ejecuta como sondas. La consulta de una sola sucursal tampoco sustituye el inventario de hardware y consumidores necesario para expandir o retirar componentes.
