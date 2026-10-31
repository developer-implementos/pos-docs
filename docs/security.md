# Seguridad y dependencias

La seguridad distingue los perfiles `demo` y `branch-lab`. F01 implementa controles de servidor en un laboratorio con datos sintéticos; no conecta identidad corporativa, pagos, fiscalidad o dispositivos productivos. Su composición rechaza el arranque productivo. La [guía F01](phase-1-laboratory.md) delimita el alcance en revisión.

## Perfil conectado de laboratorio

La API valida operador, caja, instalación, permisos y capacidades. El token de sesión se conserva sólo en memoria en el cliente; el servidor almacena su hash y vencimiento. Cerrar sesión revoca el acceso remoto cuando hay conexión y siempre descarta el token local. Los errores de autenticación de un supervisor secundario no cambian la identidad del cajero. El permiso de aprobar se comprueba en servidor; el cliente no inventa roles ni conserva su contraseña.

La configuración requiere orígenes exactos para CORS y CSP. El perfil cliente exige HTTPS excepto loopback de laboratorio. PostgreSQL tiene roles separados de migración y runtime, grants explícitos y comprobación del ámbito/esquema. No hay auto-migraciones al arrancar. El [ADR-19](decisions/postgresql-unit-of-work.md) describe unidad de trabajo, durabilidad e idempotencia.

Antes de confirmar efectivo, el cliente conserva una referencia de recuperación y la solicitud mínima. No guarda tokens, credenciales ni datos completos de clientes en ese registro. Un timeout no autoriza crear otro `commandId`; se consulta o reenvía explícitamente el mismo contenido. La venta y el resultado terminal se confirman juntos en servidor.

## Controles de la demostración

Las reglas de permisos y módulos se aplican tanto a las rutas como a los comandos del store. El login verifica cuentas sintéticas activas con una contraseña pública de demostración; el selector de perfil sigue siendo una herramienta de prueba. Ninguno autentica personas contra un proveedor corporativo. El almacenamiento local puede ser modificado por quien controla el navegador o equipo. Estos mecanismos permiten comprobar el comportamiento del producto, pero no sustituyen identidad real, autorización en servidor, aislamiento entre clientes ni una auditoría inmutable.

La sesión de acceso guarda únicamente la versión y el ID del usuario, sin contraseña, en una clave independiente de los datos de caja. Por defecto dura en la pestaña; recordar la sesión usa almacenamiento local. Cerrar sesión limpia ambas ubicaciones y revoca los comandos en memoria; no cierra el turno, elimina el borrador ni interrumpe una sincronización ya autorizada. Si el navegador impide borrar la sesión persistida, se informa del fallo y la pestaña queda sin sesión. Las rutas exigen una identidad activa y las autorizaciones usan el rol actual del usuario exacto, sin escoger otro usuario por rol. El login restaura solo destinos locales válidos.

Los comandos persisten su resultado antes de publicar el nuevo estado. Un error de persistencia se muestra en la interfaz y evita confirmar el cambio. Los pagos con resultado desconocido requieren conciliación explícita; no se reintentan automáticamente. Los estados de pago, documento fiscal y ERP son independientes.

Las exportaciones CSV neutralizan celdas que pueden interpretarse como fórmulas y escapan delimitadores, comillas y saltos de línea. Hay pruebas específicas de esta transformación. Los valores se muestran mediante bindings de Angular; no se necesita insertar HTML de documentos o proveedores.

## Auditoría de dependencias

Ejecutar desde la raíz, con las versiones fijadas en el lockfile:

```powershell
npm ci
npm audit --omit=dev
npm audit
npm run check
```

El primer audit mide el árbol de dependencias de producción declarado en npm. El segundo incluye compiladores, generadores, linters y otras herramientas de desarrollo. Un resultado sin alertas en producción no significa que todo el toolchain esté libre de vulnerabilidades, ni demuestra por sí solo la seguridad de la aplicación.

Los resultados vigentes se obtienen del lockfile y la ejecución CI vinculada al commit; no se mantienen conteos manuales que puedan quedar obsoletos. CI bloquea el audit de runtime ante alertas de severidad baja o superior. El audit completo conserva su código de salida y artefacto; mientras exista una excepción no bloqueante para herramientas, debe permanecer visible y no permite declarar una distribución productiva aprobada.

Un aviso del toolchain y uno del runtime tienen superficies distintas, pero ambos necesitan revisión. Se inspeccionan la cadena de dependencias, condición vulnerable, versiones compatibles y corrección upstream. No se aplica un downgrade automático, `--force`, `--legacy-peer-deps` ni un override transitorio para ocultar el hallazgo. Tras cambiar dependencias se repiten los checks y artefactos afectados.

Los builds se ejecutan con entradas de confianza y sin credenciales de producción. El audit npm no cubre por sí solo Rust, SDK nativos, configuración, permisos, lógica comercial o restauración. La [guía de pruebas](testing.md) detalla esos límites; la evidencia y los riesgos pendientes pertenecen al issue/PR correspondiente.

## Host de escritorio

Tauri declara una capability local sin permisos y no registra comandos de negocio, acceso a archivos, shell, red externa o dispositivos. La CSP de producción limita scripts a los assets locales; la política de desarrollo permite además el servidor local. No hay claves de firma ni un updater conectado. La configuración y las limitaciones del entorno de compilación están en [desktop.md](desktop.md).

Los E2E de CI sirven el resultado exacto de `npm run build` con un servidor Node de lectura en `127.0.0.1`, tipos MIME explícitos, rutas confinadas a `dist/apps/pos-desktop/browser` y la CSP de producción leída de Tauri. No recompilan ni reescriben assets. `inlineCritical` está deshabilitado mediante la configuración de Angular para evitar su handler inline de carga de CSS, que esta CSP rechaza; la minificación sigue activa. El servidor comprueba también rutas codificadas y enlaces simbólicos que salgan del directorio público.

Para repetir el recorrido demo sobre el bundle optimizado (`production` de Angular), primero compilar y después ejecutar, por ejemplo en PowerShell: `$env:POS_E2E_PRODUCTION='1'; $env:POS_E2E_PORT='4301'; npm run test:e2e`. Sin esas variables, las pruebas locales siguen usando el servidor de desarrollo. El modo producción no reutiliza servidores previos. Estas pruebas verifican Chromium con la política CSP, no sustituyen una apertura ni una prueba de uso del ejecutable en WebView2. El audit npm tampoco cubre las dependencias de `Cargo.lock`; queda pendiente incorporar una auditoría de avisos Rust antes de distribuir el producto nativo.

El paso a producción requiere identidad corporativa y enrolamiento, contratos de sincronización/integración autenticados, retención, respaldo y restauración probados, firma de artefactos y homologación de equipos. La persistencia transaccional de laboratorio y sus pruebas son evidencia parcial, no aceptación operativa.
