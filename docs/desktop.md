# Host de escritorio Tauri

`apps/pos-desktop` contiene la aplicación cliente de escritorio: un frontend Angular/PrimeNG con arranque y build propios, alojado en la shell nativa (host) Tauri 2 para Windows. Comparte composición y funcionalidades con `pos-mobile` mediante `libs/client-shell`, la librería de composición Angular de raíz, configuración, rutas, guards y layout; esta librería no es el host nativo. Cada aplicación conserva su arranque independiente. La [decisión de clientes nativos](decisions/native-clients.md) delimita ambos clientes. El resultado histórico de un instalador no acredita el nuevo artefacto hasta comprobar su build y ejecución.

El cliente distingue `unconfigured`, `branch`, `branch-lab` y `demo`. El perfil operativo `branch` usa identidad propia POS y servicios persistidos de `branch-api`; el laboratorio y la demo mantienen sus fuentes aisladas. La [guía F01](phase-1-laboratory.md) identifica qué recorridos están comprobados en cada perfil. El perfil y CSP deben quedar configurados para el origen autorizado del artefacto antes de probar el host. Un build Angular no homologa el binario Tauri.

## Prerrequisitos Windows

- Node.js compatible con `package.json` y dependencias instaladas con `pnpm install --frozen-lockfile`.
- Rust mediante rustup con host MSVC. `rust-toolchain.toml` fija Rust 1.90.0, requerido por la versión de Tauri seleccionada.
- Microsoft C++ Build Tools con la carga **Desktop development with C++** y Windows SDK.
- Microsoft Edge WebView2 Runtime.

Los requisitos de Windows están descritos en la [documentación oficial de Tauri](https://v2.tauri.app/start/prerequisites/#windows). No se instalan herramientas del sistema automáticamente desde este repositorio.

## Ejecutar y compilar

Desde la raíz del workspace:

```powershell
pnpm run desktop:info
pnpm run desktop:dev
pnpm run desktop:build
```

`desktop:dev` inicia el frontend en `http://127.0.0.1:4300` antes de abrir la ventana nativa. No inicies otro servidor en ese mismo puerto. Para desarrollar la interfaz de escritorio en navegador, usa `pnpm start`; ese servidor no es una aplicación web independiente.

`desktop:build` ejecuta el build Angular e incorpora `dist/apps/pos-desktop/browser`. Los artefactos de Windows se generan en `apps/pos-desktop/src-tauri/target/release/bundle/nsis`.

Nx ejecuta Tauri desde `apps/pos-desktop`. Los hooks `beforeDevCommand` y `beforeBuildCommand` declaran `cwd: "../../.."`: Tauri los ejecuta después de cambiar al directorio `src-tauri`, por lo que apuntan explícitamente a la raíz del workspace. `frontendDist` también se resuelve desde `src-tauri`. Ver [configuración de Tauri](https://v2.tauri.app/reference/config/#buildconfig) y su [implementación del build](https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-cli/src/build.rs).

La navegación usa hash para que las rutas funcionen dentro del protocolo local del host. El enlace de salto al contenido enfoca la región principal sin cambiar ese hash.

<span id="frontera-del-prototipo"></span>

## Capacidades nativas

La [PR #94 · F02-12](https://github.com/developer-implementos/pos-platform/pull/94), integrada en [`d5d5e5f`](https://github.com/developer-implementos/pos-platform/commit/d5d5e5f30fe44f2c2c64fec3e45ba3fe7e3b6d01), incorpora únicamente `save_protected_pdf` para guardar un original validado mediante un diálogo de Windows. El permiso se restringe a ese comando y a la ventana local `main`; no habilita una API genérica de archivos, comandos shell, pagos o periféricos.

La [guía F02](phase-2-payments-documents.md#guardado-nativo-en-windows) describe validación binaria, límite de 10 MiB, SHA-256, creación sin sobrescritura y resultados separados de guardado, cancelación y descarga iniciada en navegador. El frontend no elige rutas ni usa el navegador como fallback de un error nativo. Su evidencia de compilación y uso real se informa por revisión; la interacción dentro de Tauri sigue pendiente de comprobación. La integración no habilita emisión fiscal, impresión o tarjeta.

La CSP productiva admite assets incorporados y el transporte interno de Tauri; la política de desarrollo permite además el servidor y WebSocket local de Angular. PrimeNG y Angular necesitan estilos dinámicos, por eso `style-src` conserva `unsafe-inline`; `script-src` productivo no lo admite. Referencia: [capabilities de Tauri](https://v2.tauri.app/security/capabilities/).

Los perfiles conectados usan la autoridad transaccional de `branch-api` y PostgreSQL. El almacenamiento local de la demo no es esa autoridad ni implementa sincronización con la aplicación cerrada. La distribución productiva conserva sus comprobaciones de instalador, firma, cierre con operaciones pendientes y equipos objetivo. Un updater futuro debe validar firmas, usar un canal autenticado de distribución, controlar el despliegue gradual y definir recuperación; no hay un canal de actualización productiva habilitado.

## Verificación y límite actual

La compilación y el empaquetado de Windows terminaron correctamente en el [job `windows-desktop` de GitHub Actions](https://github.com/floxcristian/corporate-pos/actions/runs/37151843645/job/111287161510), finalizado el **3 de octubre de 2026 a las 20:37:51 UTC**. Ejecutó `pnpm run desktop:build` con Rust 1.90.0 para el commit [`0d09abc01ca0d0314d51056e2f7d1eaf8027d256`](https://github.com/floxcristian/corporate-pos/commit/0d09abc01ca0d0314d51056e2f7d1eaf8027d256).

El artefacto **`corporate-pos-windows-demo`** contiene `Corporate POS_0.1.0_x64-setup.exe` (2.035.184 bytes) y el `Cargo.lock` generado por esa misma compilación. El lockfile fue recuperado sin modificaciones en `apps/pos-desktop/src-tauri/Cargo.lock`; fija también las dependencias transitivas del build exitoso. La copia de esta revisión está en `dist/installers/0d09abc/target/release/bundle/nsis/`, directorio ignorado por Git. El hash del lockfile del artefacto coincide con el versionado.

| Archivo del artefacto               | SHA-256                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `Corporate POS_0.1.0_x64-setup.exe` | `77b0a0a71ac10856c77a439e7970fdea48af64f1c212281a3d31ce59f013b1d4` |
| `Cargo.lock`                        | `d0de437f15583981a9420589b81eafdf0c746048a78aeed3d4a6d698f3d941e2` |

Ese artefacto de demostración constituye **evidencia histórica de compilación y empaquetado**, sin firma comercial ni prueba de instalación o uso nativo asociada. La [evidencia de paquetes F01](phase-1-laboratory.md#perfiles-del-cliente) y el [guardado nativo F02](phase-2-payments-documents.md#guardado-nativo-en-windows) se identifican por sus propias revisiones; no heredan una homologación de ese instalador.

Las versiones directas de Tauri están fijadas en `Cargo.toml`. Los iconos pertenecen al proyecto, se generan desde una figura geométrica propia y no incluyen Font Awesome Pro.

## Acceso a periféricos de sucursal

En F02, `device-agent` (C#/.NET Windows) se ubica en el mismo puesto que `pos-desktop` para controlar sus periféricos locales asignados. F05 pilota ese perfil; dispositivos de red y uso compartido se homologan después, en F06. El cliente solicita y consulta trabajos en `branch-api`; el agente inicia HTTPS LAN y conserva evidencia en SQLite técnico, sin depender de que `pos-desktop` permanezca abierto. El protocolo y la persistencia del host están comprobados en el [corte F02](phase-2-payments-documents.md#recorrido-durable-del-host); el runtime no contiene un driver físico habilitado. El [ADR-17](decisions/device-agent.md) describe acceso móvil, seguridad, estados y recuperación; los dispositivos conectados directamente al móvil requieren una integración Capacitor específica.
