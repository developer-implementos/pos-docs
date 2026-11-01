# POS Platform · Diagramas editables de la arquitectura propuesta

Esta colección reúne **siete vistas estructurales y dos dinámicas** del POS corporativo para Chile, Perú y España. Son documentos de diseño para revisar y evolucionar; no acreditan una implementación, un proveedor homologado ni una topología productiva.

Abre [la galería local](index.html) para recorrer los diagramas. Funciona sin dependencias externas y muestra los SVG mediante vistas desplazables. Los textos conservan su tamaño de lectura; cada vista incluye un enlace al SVG completo.

## Archivos

| Vista | Archivo editable | Consulta visual |
| --- | --- | --- |
| 01 · C1: contexto del sistema | [01-contexto.excalidraw](01-contexto.excalidraw) | [SVG](01-contexto.svg) |
| 02 · C2: contenedores | [02-contenedores.excalidraw](02-contenedores.excalidraw) | [SVG](02-contenedores.svg) |
| 03 · C3: backend de sucursal | [03-backend-sucursal.excalidraw](03-backend-sucursal.excalidraw) | [SVG](03-backend-sucursal.svg) |
| 04 · C3: sincronizador de sucursal | [04-sincronizador.excalidraw](04-sincronizador.excalidraw) | [SVG](04-sincronizador.svg) |
| 05 · Complemento: despliegue | [05-despliegue.excalidraw](05-despliegue.excalidraw) | [SVG](05-despliegue.svg) |
| 06 · Dinámica: publicación y activación de precios | [06-flujo-precios.excalidraw](06-flujo-precios.excalidraw) | [SVG](06-flujo-precios.svg) |
| 07 · Dinámica: venta e integración | [07-flujo-venta.excalidraw](07-flujo-venta.excalidraw) | [SVG](07-flujo-venta.svg) |
| 08 · C3: API de país | [08-country-api.excalidraw](08-country-api.excalidraw) | [SVG](08-country-api.svg) |
| 09 · C3: worker ERP | [09-erp-worker.excalidraw](09-erp-worker.excalidraw) | [SVG](09-erp-worker.svg) |

- [Atlas completo](00-atlas-completo.excalidraw): las nueve vistas en un único archivo de Excalidraw.
- [Colección ZIP](diagramas-c4-excalidraw.zip): paquete para descargar y compartir.

Los `.excalidraw` contienen formas, textos y relaciones editables. Los SVG son exportaciones para consultar la composición completa. Para editar, utiliza el archivo nativo correspondiente. Al compartir o extraer la colección, conserva juntos el HTML, los SVG y los archivos editables para que funcionen los enlaces relativos.

## Abrir y editar

1. Descarga un `.excalidraw` individual o el atlas completo.
2. Abre Excalidraw y elige **Abrir** en el menú, o utiliza **Ctrl + O** (**⌘ + O** en macOS), para seleccionar el archivo.
3. Edita formas, etiquetas o relaciones y guarda una copia para conservar tus cambios. El archivo nativo permite seguir trabajando sobre los elementos del dibujo.

La galería no necesita conexión. Para usar el editor, utiliza tu instalación local disponible o [Excalidraw web](https://excalidraw.com). La disponibilidad sin conexión del editor depende de esa instalación; no forma parte de esta galería.

## Lectura y alcance

La colección usa **#0545BA** como color primario. Azul identifica software POS, azul oscuro a personas, violeta a almacenes de datos, gris a sistemas externos y ámbar a infraestructura o condiciones. Los nombres y estereotipos también identifican cada tipo; el significado no depende solo del color.

- **Contexto** identifica actores, el POS y los sistemas externos.
- **Contenedores** explica las siete apps objetivo, los almacenes, la preparación/publicación de maestros en `erp-worker`/`country-api`, sus Redis de trabajos obligatorios y la caché opcional de país. BullMQ es una librería interna de esas dos apps. Son capacidades por implementar; un contenedor C4 no implica Docker.
- **Componentes** amplía cuatro procesos: `branch-api`, `branch-sync-worker`, `country-api` y `erp-worker`. Muestra grupos de bibliotecas y soporte técnico dentro de cada aplicación; no microservicios por módulo.
- **Despliegue** agrupa escritorio, agente, journal y hardware local en el puesto Windows inicial; separa el servidor de sucursal, la plataforma de país y la red autorizada del ERP. Móvil y periféricos de red se indican como expansión F06. Es una vista complementaria; el cuarto nivel de C4 sería código.
- **Dinámicas** numeran interacciones de precios y venta, con condiciones, fallos y recuperación. Complementan las vistas estructurales.

Los diagramas mantienen separadas las autoridades y los estados de venta, pago, fiscalidad, precios e integración ERP. La sucursal conserva su autoridad de negocio local; la plataforma de país recibe y consolida bajo el contrato definido. El ACK de aplicación requiere el commit de inbox, efecto local y outbox, y no certifica el resultado de un sistema externo.

Las aplicaciones completas `pos-desktop` y `pos-mobile` alojan su frontend Angular en las shells nativas Tauri y Capacitor, respectivamente. `libs/client-shell` comparte la composición Angular —raíz, configuración, rutas, guards y layout—; no es la shell nativa ni otra aplicación. [F01](../phase-1-laboratory.md) implementa PostgreSQL y la venta local recuperable en laboratorio, con pruebas Angular → API → base de datos; aún requiere aceptación. Los diagramas representan además sincronización, integración y topología productiva pendientes. La propiedad de maestros por dato y país, contratos de proveedores, infraestructura, dimensionamiento y objetivos de recuperación siguen pendientes de definición o validación.

`device-agent` es la séptima aplicación, con host C#/.NET para Windows y SQLite implementados en el corte F02 en revisión. Su protocolo HTTPS con `branch-api` conserva recepción, permiso de ejecución de un uso, intentos y evidencia, sin autoridad de ventas. La [guía F02](../phase-2-payments-documents.md) distingue la interoperabilidad comprobada de los drivers físicos pendientes. El perfil inicial es el mismo puesto Windows que `pos-desktop`; F05 lo valida en el piloto. F06 incorpora impresoras de red, estación compartida y acceso móvil tras homologación, conservando la misma aplicación. El servidor de sucursal no es la ubicación predeterminada. La aceptación del spooler no acredita impresión física. Pagos por SDK requieren homologación independiente de la impresión. Véase la [decisión del agente de dispositivos](../decisions/device-agent.md).

`erp-worker` inicia HTTPS hacia `country-api` desde la red autorizada del ERP; no accede por SQL ni Redis a país. **BullMQ y Redis exclusivo de trabajos son obligatorios en el diseño elegido, aún no implementados**: una instancia Redis para tareas breves y programación de `country-api`; otra dentro de la red ERP para preparación, ejecución técnica y consultas de conciliación de `erp-worker`. PostgreSQL conserva solicitudes, outbox y resultados; relay y reconciliación reconstruyen jobs sin repetir efectos inciertos. La sucursal mantiene PostgreSQL + HTTPS y los dispositivos SQLite. La [decisión de trabajos](../decisions/job-processing.md) define estos límites. La caché opcional de país usa una tercera instancia separada, conforme al [contrato de caché](../c4-arquitectura-propuesta.md#caché-de-país-opcional).

La continuidad inicial contempla pérdida de WAN con LAN, backend y PostgreSQL de sucursal disponibles. No incorpora una base de ventas independiente por puesto. Las capacidades efectivas de pago y fiscalidad, vigencia de precios y permisos limitan las operaciones habilitadas.

## Fuentes y mantenimiento

La [guía del modelo C4](../c4-arquitectura-propuesta.md) define niveles, notación, responsabilidades y contratos. La [propuesta de arquitectura](../propuesta-arquitectura.md) gobierna las decisiones. También sustentan la colección:

- [Opciones tecnológicas](../opciones-tecnologicas.md).
- [Operación de caja y evolución](../operacion-caja-y-evolucion.md).
- [Resiliencia y recuperación de datos](../revision-resiliencia-datos-pos.md).
- [Extensibilidad, proveedores y dispositivos](../extensibilidad-proveedores-dispositivos.md).
- [Catálogo de integraciones actuales](../catalogo-integraciones-actuales.md), para distinguir antecedentes de diseño propuesto.

Las fuentes, los modelos y la generación de estos diagramas pertenecen al repositorio editorial `pos-docs`; describen el producto `pos-platform` y su arquitectura propuesta. El [manual de herramientas de diagramas](../../tools/diagrams/README.md) describe los comandos para generar Excalidraw, exportar SVG, comprobar las vistas y empaquetar la colección. Los modelos viven en `tools/diagrams/models`; las vistas recortadas de Starlight están en `docs/diagramas-excalidraw/previews` y las fuentes Mermaid en `docs/diagramas-excalidraw/mermaid`.

Los diagramas deben evolucionar junto con estos documentos. Una edición visual no modifica automáticamente la propuesta ni las fuentes que generan otros artefactos del repositorio. Antes de regenerar o integrar cambios, conserva tu copia editada y propaga las decisiones al modelo correspondiente.

La colección se genera localmente mediante las API de Excalidraw; no necesita un MCP ni servicios remotos para abrirse o consultarse.

Referencias primarias para el formato y la notación:

- [Diagramas y niveles del modelo C4](https://c4model.com/diagrams).
- [Formato JSON de Excalidraw](https://docs.excalidraw.com/docs/codebase/json-schema/).
- [Creación programática de elementos](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton).
- [Exportación de SVG y otros formatos](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export).

Fecha de revisión: 29 de octubre de 2026.
