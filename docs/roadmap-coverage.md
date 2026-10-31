# Cobertura y criterios de finalización

El roadmap define una versión del alcance de POS Platform, no una promesa de que jamás aparecerán tareas nuevas. Completar sus entregables significa aceptar los resultados y escenarios acordados para los países, proveedores, dispositivos y configuraciones identificados en la evidencia. No equivale a ausencia de defectos, autorización fiscal automática ni soporte universal de hardware.

## Qué cubre la entrega

El plan mantiene seis fases, con entregables identificados por códigos estables. La implementación puede avanzar en paralelo cuando sus contratos están acordados; la aceptación integrada respeta las dependencias. Las [páginas de fase](/guide/proposal/roadmap/) contienen el alcance y las pruebas; las [issues de POS Platform](https://github.com/developer-implementos/pos-platform/issues?q=is%3Aissue%20label%3Aroadmap) contienen responsables, bloqueos, discusión y PR. El repositorio del producto requiere acceso de la empresa.

| Capacidad | Cobertura que debe comprobarse | Fase principal |
| --- | --- | --- |
| Trabajo del equipo | Issues, códigos, dependencias, ramas aisladas, revisión, CI, instrucciones comunes y evidencia de aceptación. | F01 |
| Persistencia y contratos | Propiedad de tablas, migraciones, restricciones, dinero decimal, transacciones, concurrencia, idempotencia, errores y compatibilidad. | F01 |
| Identidad y ámbito | Operador, permisos, sociedad, país, sucursal, puesto y turno; autorización del backend y denegaciones comprobables. | F01 y F03 |
| Experiencia de venta | Captura, clientes, borradores, presupuestos, precios, promociones, consulta de stock y recuperación del resultado. | F01 |
| Cobros y compensaciones | Instrumentos combinados, medios manuales, verificación, adaptadores, incertidumbre, cancelación y reversa sin repetición ciega. | F02 y F04 |
| Crédito y saldo del cliente | Cupo, bloqueos, cuotas, autorización concurrente y orden de compra cuando corresponda; vuelto como anticipo con consentimiento y conciliación. | F03 y F04 |
| Fiscalidad y documentos | Perfil, proveedor, material autorizado, numeración, estados independientes, consulta y evidencia por configuración. | F02 y F06 |
| Periféricos | Protocolo autorizado, servicio por puesto, recepción durable, SQLite técnico, impresión, lectores y resultado físico. | F02 |
| Sincronización | Outbox/inbox, acuse durable, deduplicación, cursores, límites, recuperación, cuarentena y conciliación. | F03 |
| Maestros, precios y ofertas | Extracción, publicación completa, transporte, staging, validación, activación atómica, vigencia y recuperación. | F03 |
| ERP y colas | Fachada, ACL, adaptador, BullMQ/Redis por entorno, trabajo durable, reconciliación y límites del reintento. | F03 |
| Continuidad y confianza | Identidades de servicio, enrolamiento, rotación, revocación, permisos de continuidad y políticas ante datos vencidos o WAN caída. | F03 |
| Jornada de tienda | Devoluciones, notas de crédito, cobranza, anticipos, arqueo, cierres parciales/finales, custodia y depósitos. | F04 |
| Administración y supervisión | Configuración, permisos, auditoría, aprobaciones, reportes, exportaciones y resolución de incidencias con controles. | F04 |
| Consumidores e integraciones existentes | Inventario de dependencias, contratos de fachada, conciliación de pagos/depósitos y destino explícito de funciones centrales y reportería. | F04 y F05 |
| Instalación y operación | Artefactos, infraestructura, TLS, secretos, observabilidad, soporte, copias, restauración y exclusión del escritor. | F05 |
| Calidad no funcional | Carga, capacidad, degradación, seguridad, privacidad, retención, accesibilidad, licencias y cadena de suministro. | F05 |
| Migración y piloto | Calidad de datos, ensayo de migración, corte, convivencia, reversión, formación, seguimiento y autorización de una tienda concreta. | F05 |
| Expansión | Evidencia separada para Chile, Perú y España, móvil, dispositivos de red, flota, versiones mixtas, aislamiento y retirada controlada del legacy. | F06 |

La cobertura se contrasta con la arquitectura, el inventario funcional de Chile, los catálogos de integración, los contratos de identidad y maestros, y las fuentes de reuniones de Perú y España. Las afirmaciones recibidas en una reunión siguen siendo evidencia de levantamiento: la implementación no debe convertir una referencia fiscal, una marca de dispositivo o una interfaz desconocida en un contrato inventado.

## Resultados que deben distinguirse

1. **Implementado:** existe código integrado para el comportamiento, con pruebas y límites conocidos. Un scaffold no satisface este estado.
2. **Verificado técnicamente:** se contrastan los criterios completos con la versión implementada, escenarios, datos, configuración y evidencia. Es lo que cuenta en el [porcentaje de avance](/guide/implementation/progress/).
3. **Aceptado manualmente:** el equipo registra una decisión humana independiente sobre una entrega verificada. Su ausencia no impide reflejar el avance técnico.
4. **Homologado:** el proveedor, hardware o responsable correspondiente valida una combinación concreta. Un simulador o sandbox no homologa producción.
5. **Habilitado:** operaciones autoriza el despliegue en un alcance concreto después de comprobar identidad, permisos, respaldo, recuperación, soporte, datos y preparación de la tienda.

Un build verde acredita compilación y las comprobaciones que realmente se ejecutaron. El cierre de una issue acredita una decisión de cierre en GitHub. Ninguno sustituye automáticamente los otros resultados.

## Qué debe contener cada issue

Cada entregable tiene un código `Fxx-xx`, una fase, aplicaciones y módulos, resultado, alcance y exclusiones, dependencias, contratos, modelo de datos lógico, pasos de implementación, aceptación y evidencia. Los esquemas lógicos de las fichas son propuestas para diseñar y revisar las migraciones; no describen tablas que ya existan.

Las fichas detallan claves e invariantes relevantes: ámbito de país/sociedad/sucursal, identificadores, unicidad e idempotencia, estados, versión/concurrencia y límites transaccionales. Los datos de pagos, fiscalidad y ERP conservan ciclos de vida independientes. En trabajos de instalación, validación o gobierno se explica por qué no hace falta una tabla de negocio nueva.

Los diagramas de secuencia o datos se incluyen donde aclaran un contrato o un efecto externo. No sustituyen escenarios de fallo: corte después de un commit, acuse perdido, resultado desconocido, duplicado, versión incompatible, restauración y revocación deben tener un resultado observable cuando apliquen.

Un entregable puede necesitar varios PR parciales. Si el trabajo se divide en entregas independientes, se revisan primero su código, dependencias y aceptación en el alcance compartido. No se crean copias del mismo paquete para cada desarrollador ni se cambia su significado conservando el código.

## Condiciones todavía por acordar

- País, tienda, canal, operaciones y proveedores del primer piloto; no hay calendario o capacidad de equipo confirmados en el roadmap.
- Contratos reales de ERP, proveedores fiscales y de pago, credenciales de sandbox y disponibilidad de hardware para homologación.
- Matriz autorizada de medios de pago, documentos, contingencias, permisos y aprobaciones por país.
- Objetivos operativos de disponibilidad, rendimiento, recuperación y pérdida de datos tolerable, con responsables y presupuesto.
- Datos y consumidores que deben migrarse, convivir o retirarse, y condiciones para revertir un corte.
- Responsables de aceptación funcional, arquitectura, seguridad, fiscalidad y operación en cada configuración.

Estas decisiones forman parte de los entregables y sus condiciones de entrada. Una dependencia externa pendiente se registra como bloqueo; no se reemplaza por una respuesta mock presentada como integración terminada.

## Límites del 100 %

El porcentaje expresa **entregables técnicamente verificados del alcance versionado**. La aceptación manual del equipo se registra por separado y no condiciona ese avance. Si cambia el alcance, se revisan el roadmap, las fichas, los issues y el denominador juntos. No se mantiene artificialmente un 100 % después de incorporar países, canales o capacidades nuevas.

La habilitación inicial no incluye por defecto todos los modelos de periféricos, proveedores alternativos ni futuros países. La IA y RFID documentados como extensiones opcionales, un programa de sustitución del ERP y una comercialización SaaS para terceros necesitan alcance, decisiones y criterios propios. Tampoco terminan la operación continua, las actualizaciones de seguridad, las incidencias y los cambios normativos al completar un roadmap.

Para autorizar una entrega, el equipo debe poder demostrar que no quedan criterios obligatorios pendientes en ese alcance, que sus dependencias externas están resueltas y que existe un responsable de operación. El registro de riesgos y defectos aceptados debe conservar aprobación explícita; no se consideran cerrados por dejar de mencionarlos.

## Coordinación entre repositorios y agentes

POS Docs mantiene la propuesta, el alcance y su explicación pública. POS Platform mantiene las fichas de implementación, los issues, los PR y la evidencia del producto. El [procedimiento de contribución de la revisión publicada](https://github.com/developer-implementos/pos-platform/blob/d32dfae98943309e55dea33813bad11833f0bed2/CONTRIBUTING.md) es la referencia para el equipo y los agentes; no se mantiene una segunda copia de ese procedimiento aquí.

Las instrucciones versionadas orientan a Codex y Claude Code. Los controles de GitHub, CI y revisión humana verifican condiciones de integración independientemente de la máquina o conversación utilizada. Los cambios de contrato coordinan los dos repositorios mediante un mismo issue del producto y PR enlazados.
