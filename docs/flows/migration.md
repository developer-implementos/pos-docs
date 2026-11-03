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
