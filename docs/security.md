# Seguridad y dependencias

POS Platform tiene un solo modo de operación ([ADR-25](decisions/single-operational-mode.md)): no hay perfil de laboratorio ni demo, y ningún camino de identidad sintética o de entrada sin la llave del equipo. F01 implementa los controles de servidor sobre una sucursal aprovisionada; no conecta identidad corporativa, pagos, fiscalidad o dispositivos productivos. La [guía F01](phase-1-laboratory.md) delimita el alcance en revisión.

<span id="perfil-conectado-de-laboratorio"></span>

## Cliente conectado

La API valida operador, caja, instalación, permisos y capacidades. Cada inicio de sesión prueba la posesión de la llave del equipo activado ([ADR-23](decisions/device-activation.md)). El token de sesión se conserva sólo en memoria en el cliente; el servidor almacena su hash y vencimiento. Cerrar sesión revoca el acceso remoto cuando hay conexión y siempre descarta el token local. Los errores de autenticación de un supervisor secundario no cambian la identidad del cajero. El permiso de aprobar se comprueba en servidor; el cliente no inventa roles ni conserva su contraseña.

La configuración requiere orígenes exactos para CORS y CSP. El cliente exige HTTPS, también en loopback, y `branch-api` no arranca sin certificado y llave TLS. PostgreSQL tiene roles separados de migración y runtime, grants explícitos y comprobación del ámbito/esquema. No hay auto-migraciones al arrancar. El [ADR-19](decisions/postgresql-unit-of-work.md) describe unidad de trabajo, durabilidad e idempotencia.

Antes de confirmar efectivo, el cliente conserva una referencia de recuperación y la solicitud mínima. No guarda tokens, credenciales ni datos completos de clientes en ese registro. Un timeout no autoriza crear otro `commandId`; se consulta o reenvía explícitamente el mismo contenido. La venta y el resultado terminal se confirman juntos en servidor.

<span id="controles-de-la-demostración"></span>

## Datos de prueba

Las pruebas y el ambiente local cargan sus datos por las mismas puertas que QA y producción: aprovisionamiento, activación de cada caja, publicación comercial, API de administración y activación de equipos. Los estados que ninguna puerta produce, como el resultado de un proveedor de pago ficticio, se siembran desde fixtures exclusivos de prueba, con la cuenta propietaria y sólo sobre bases generadas para la corrida; nunca crean identidades ni datos comerciales. Las contraseñas de prueba se generan por corrida y las trazas de red se desactivan donde podrían guardar contraseñas o tokens.

La demo retirada guardaba sesiones y datos simulados en el navegador. Al arrancar, el cliente borra esas claves (`corporate-pos:demo:v1` y `corporate-pos:auth:v1`) para que no queden en un equipo de caja. Los pagos con resultado desconocido requieren conciliación explícita; no se reintentan automáticamente. Los estados de pago, documento fiscal y ERP son independientes.

Las exportaciones CSV neutralizan celdas que pueden interpretarse como fórmulas y escapan delimitadores, comillas y saltos de línea. Hay pruebas específicas de esta transformación. Los valores se muestran mediante bindings de Angular; no se necesita insertar HTML de documentos o proveedores.

## Auditoría de dependencias

Ejecutar desde la raíz, con las versiones fijadas en el lockfile:

```powershell
pnpm install --frozen-lockfile
pnpm audit --omit=dev
pnpm audit
pnpm run check
```

El primer audit mide el árbol de dependencias de producción declarado en npm. El segundo incluye compiladores, generadores, linters y otras herramientas de desarrollo. Un resultado sin alertas en producción no significa que todo el toolchain esté libre de vulnerabilidades, ni demuestra por sí solo la seguridad de la aplicación.

Los resultados vigentes se obtienen del lockfile y la ejecución CI vinculada al commit; no se mantienen conteos manuales que puedan quedar obsoletos. CI bloquea el audit de runtime ante alertas de severidad baja o superior. El audit completo conserva su código de salida y artefacto; mientras exista una excepción no bloqueante para herramientas, debe permanecer visible y no permite declarar una distribución productiva aprobada.

Un aviso del toolchain y uno del runtime tienen superficies distintas, pero ambos necesitan revisión. Se inspeccionan la cadena de dependencias, condición vulnerable, versiones compatibles y corrección upstream. No se aplica un downgrade automático, `--force`, `--legacy-peer-deps` ni un override transitorio para ocultar el hallazgo. Tras cambiar dependencias se repiten los checks y artefactos afectados.

Los builds se ejecutan con entradas de confianza y sin credenciales de producción. El audit npm no cubre por sí solo Rust, SDK nativos, configuración, permisos, lógica comercial o restauración. La [guía de pruebas](testing.md) detalla esos límites; la evidencia y los riesgos pendientes pertenecen al issue/PR correspondiente.

## Host de escritorio

La [PR #94](https://github.com/developer-implementos/pos-platform/pull/94), integrada en [`d5d5e5f`](https://github.com/developer-implementos/pos-platform/commit/d5d5e5f30fe44f2c2c64fec3e45ba3fe7e3b6d01), incorpora el permiso exclusivo `allow-save-protected-pdf` para el comando `save_protected_pdf` en la ventana local `main`. No concede acceso genérico a archivos, shell, red externa, pagos o dispositivos. La [guía F02](phase-2-payments-documents.md#guardado-nativo-en-windows) delimita la exportación protegida y su evidencia; la prueba de interfaz nativa sigue pendiente. La CSP de producción limita scripts a los assets locales; la política de desarrollo permite además el servidor local. No hay claves de firma ni un updater conectado. La configuración del host está en [escritorio](desktop.md).

Los recorridos de navegador compilan el cliente para el origen HTTPS exacto de su API y sirven ese build con un servidor Node de lectura en `127.0.0.1`, tipos MIME explícitos, rutas confinadas al directorio del build y la CSP generada para él. No reescriben assets. `inlineCritical` está deshabilitado mediante la configuración de Angular para evitar su handler inline de carga de CSS, que esta CSP rechaza; la minificación sigue activa. El servidor comprueba también rutas codificadas y enlaces simbólicos que salgan del directorio público.

Estas pruebas verifican Chromium con la política CSP, no sustituyen una apertura ni una prueba de uso del ejecutable en WebView2. El audit npm tampoco cubre las dependencias de `Cargo.lock`; queda pendiente incorporar una auditoría de avisos Rust antes de distribuir el producto nativo.

El paso a producción requiere identidad corporativa y enrolamiento, contratos de sincronización/integración autenticados, retención, respaldo y restauración probados, firma de artefactos y homologación de equipos. La persistencia transaccional y sus pruebas con datos sintéticos son evidencia parcial, no aceptación operativa.
