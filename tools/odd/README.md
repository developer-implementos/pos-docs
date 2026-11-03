# Herramientas ODD del equipo

`bootstrap.ps1` instala únicamente herramientas fijadas para Windows x64. Requiere PowerShell 7 y descarga los archivos oficiales definidos en `toolchain.lock.json`. No activa ODD en los clientes ni modifica sus instrucciones, credenciales, configuración global o PATH persistente.

Las instrucciones raíz cargan los recursos oficiales y la política de metadatos PR conecta su validador desde la base confiable. Su incorporación versionada no acredita por sí sola instalación en todos los equipos ni una ejecución remota: la primera activación requiere integrar la base y observar rechazos y aprobación. Los tests y checks de integridad se ejecutan en CI. La revisión RDD del candidato permanece pendiente de su consentimiento específico; el [revisor remoto](../automated-review/README.md) está preparado, pendiente de autorización y conexión del proveedor. Su workflow debe mantenerse deshabilitado hasta esa conexión; no es un required check ni acredita revisiones reales.

```powershell
pwsh -NoProfile -File tools/odd/bootstrap.ps1 -Mode Plan
pwsh -NoProfile -File tools/odd/bootstrap.ps1 -Mode Install
pwsh -NoProfile -File tools/odd/bootstrap.ps1 -Mode Verify
node --test tools/odd/bootstrap.test.mjs
```

El destino es `%LOCALAPPDATA%/POS-Platform/odd-toolchain/`. Las versiones tienen directorios separados; las descargas y cachés pertenecen a ese destino. `Plan` sólo describe el cambio. `Install` descarga, verifica, extrae y compila. `Verify` comprueba las versiones, compara los ejecutables distribuidos con sus ZIP verificados y contrasta el módulo de Gentle AI con su checksum fijado. Imprime hashes locales para identificar los binarios observados; no son firmas del proveedor.

## Procedencia y mantenimiento

- **Go 1.25.10**: ZIP oficial y SHA256 publicado en [Go Downloads](https://go.dev/dl/?mode=json&include=all).
- **Engram 3.6.1**: [release oficial](https://github.com/Gentleman-Programming/engram/releases/tag/v3.6.1), ZIP Windows x64 y SHA256 del asset. Su memoria permanece local; el bootstrap no inicia un servidor ni exporta `.engram/`.
- **Gentle AI 4.3.1**: [release oficial](https://github.com/Gentleman-Programming/gentle-ai/releases/tag/v4.3.1), commit `2dba7784114fff57864519c4c0d067e952a8c98b`. La distribución oficial de binarios Windows está suspendida; se compila el módulo publicado con Go y la [base de checksums de Go](https://sum.golang.org/lookup/github.com/gentleman-programming/gentle-ai/v4@v4.3.1). No se descarga un ejecutable Windows de terceros.

La compilación usa cachés aisladas, `GOTOOLCHAIN=local`, `GOENV=off`, `GOWORK=off`, el proxy oficial y `sum.golang.org`. Las variables se aplican sólo al proceso y se restauran. Los archivos con hash incorrecto, rutas de archivo inseguras o junctions/symlinks se rechazan antes de usarlos. Una instalación simultánea no obtiene el lock. Si una descarga falla, su archivo `.partial` puede quedar en el directorio de descargas para diagnóstico; no se utiliza como archivo válido.

Actualizar una versión requiere una PR que cambie el lock, contraste la procedencia y ejecute instalación, pruebas y diagnóstico de las versiones nuevas. No usar `@latest`, `@main`, auto-upgrade ni instaladores remotos canalizados al shell para reproducir esta configuración. El script no desinstala versiones anteriores ni borra memoria. Tampoco demuestra compatibilidad con todas las versiones futuras de Codex, Claude Code o Engram.

## Activación y revisión nativa

La activación se coordina con las instrucciones del repositorio. El parámetro upstream `--scope workspace` no garantiza aislamiento completo: algunas integraciones siguen siendo globales y el routing de Codex/Claude tiene diferencias entre install y sync. No ejecutar el instalador contra el perfil personal para intentar reparar una prueba.

### Instrucciones upstream dentro del repositorio

La simulación del instalador 4.3.1 pasó en Windows con un perfil temporal. La aplicación real en ese mismo fixture falló al abrir su directorio de compatibilidad con un error de reparse point. No se alteraron sus guardas ni la configuración personal. **Esto no acredita una instalación global exitosa de Gentle AI.**

`upstream-render.go` es un punto de entrada mínimo que invoca las funciones originales `InjectRoutingWithOptions`, `ReviewExecutionContractFor` y el extractor del protocolo Engram. `upstream.mjs --render` verifica el hash Go del módulo completo, crea una copia aislada y añade únicamente ese punto de entrada. No modifica código del proveedor ni ejecuta su instalador. Sus salidas se conservan sin editar en `upstream/`, junto con release, commit, hash del módulo, hashes de entradas y salidas y licencia MIT. Las skills conservan su declaración Apache-2.0; el texto de esa licencia está en `APACHE-2.0.txt` ([origen](https://www.apache.org/licenses/LICENSE-2.0.txt)).

```powershell
node tools/odd/upstream.mjs --render  # Requiere toolchain Windows verificada; recompila el renderer original
node tools/odd/upstream.mjs --write   # Distribuye bytes versionados; no usa red ni Go
node tools/odd/upstream.mjs --check   # Comprueba hashes, copias y registro local
node --test tools/odd/upstream.test.mjs
```

Las salidas completas `upstream/codex.md`, `upstream/claude-code.md` y `upstream/engram.md` se cargan mediante los puntos de entrada del repositorio. No basta con guardarlas en una carpeta: `AGENTS.md` dirige a esos recursos y `CLAUDE.md` importa la entrada común; `pos-delivery` enlaza ODD con las fuentes del equipo. `work-unit-commits`, `chained-pr` y `_shared/skill-resolver.md` se copian literalmente a `.agents/skills/` y `.claude/skills/`. El índice `.atl/skill-registry.md` contiene rutas, activadores y alcance; no resume ni reemplaza las instrucciones. La referencia global del routing al protocolo compartido se resuelve a esa copia local desde los puntos de entrada del proyecto. No se crea ninguna carpeta de skills en el perfil personal.

`runtime-profile.json` declara parámetros del renderer oficial: `gpt-6-astra` / `high` para los tres roles ODD. Reutiliza la selección configurada y disponible en este equipo durante la adopción; no es el preset predeterminado de Gentle AI ni acredita disponibilidad en otras cuentas. El renderer no llama al modelo ni modifica su configuración. Si otro equipo necesita otro modelo, debe comprobar disponibilidad y actualizar el perfil por PR; no hacer fallback silencioso. Los modelos de revisión RDD pertenecen al adaptador nativo y no se cambian con este perfil.

La memoria se conecta mediante `tools/odd/engram.mjs` y las configuraciones de proyecto revisadas por el equipo. El bootstrap y el exportador no guardan memoria, tokens, recibos ni configuración personal en Git. Las copias temporales de render permanecen bajo el directorio aislado de herramientas para diagnóstico. El check portátil acredita integridad y distribución; el render reproducible contrasta además todas las fuentes del proveedor y vuelve a ejecutar sus funciones.

### Activar el MCP del proyecto

Instalar primero la toolchain y abrir **la raíz del checkout** en el cliente. La configuración portable usa `node tools/odd/engram.mjs`; no contiene rutas personales ni necesita copiar el servidor a la configuración global. No iniciar esta configuración desde una subcarpeta del monorepo.

- **Codex:** `.codex/config.toml` declara `pos_engram`. Aprobar la confianza del repositorio mediante el flujo normal de Codex después de revisar sus archivos. En un worktree, Codex puede consultar la confianza del repositorio Git principal: en esta prueba fue `pos-platform`, aunque el directorio de trabajo era `pos-odd-adoption`. Seguir el repositorio que identifica el cliente. La capa de proyecto permanece deshabilitada mientras no exista esa confianza; `codex mcp get pos_engram --json` puede responder que no existe el servidor por ese motivo. Ver [configuración por proyecto de Codex](https://learn.chatgpt.com/docs/config-file/config-advanced).
- **Claude Code:** `.mcp.json` declara el mismo servidor. Revisar y aprobar el MCP de proyecto cuando el cliente lo solicite. La detección de la declaración no equivale a haber aprobado ni conectado el servidor.

El transporte de Codex omite `cwd` para heredar el directorio de la sesión. En Codex `0.166.0-alpha.5.1` se verificó que `cwd = ".."` se pasa directamente al proceso MCP y no se interpreta como la raíz relativa a `.codex`; ocasionaba un fallo de handshake. Se comprobó la corrección mediante un thread efímero del app-server, iniciado desde la raíz: `pos_engram` reportó `connected`, Engram `3.6.1`, 23 herramientas y ningún error de descubrimiento. No se envió un prompt, no se invocó un modelo y el hash de la configuración personal permaneció idéntico. La confianza usada para ese diagnóstico fue temporal, únicamente del proceso; **no quedó activada para las próximas sesiones del usuario**.

Claude Code `2.1.296` detectó la configuración de proyecto; su aprobación y conexión en una sesión nueva siguen pendientes. Al iniciar cualquiera de los clientes, comprobar `mem_current_project` antes de leer memoria y contrastar su directorio con el checkout abierto, según el protocolo Engram. No inferir que otra máquina está configurada por haber superado la prueba de este equipo.

Para invocar la herramienta fijada sin modificar PATH:

```powershell
$gentle = Join-Path $env:LOCALAPPDATA 'POS-Platform/odd-toolchain/gentle-ai/4.3.1/gentle-ai.exe'
& $gentle version
```

Una revisión real empieza con una base y candidato concretos. Los siguientes comandos son de evaluación y descubrimiento; `<repo>` y `<base-sha>` se sustituyen por el repositorio autorizado y su revisión base:

```text
gentle-ai review assess --cwd <repo> --agent codex --base-ref <base-sha> --committed-only --json
gentle-ai review status --cwd <repo> --contract gentle-ai.review-integration/v2 --agent codex --next-transition --base-ref <base-sha> --committed-only
```

Desde ese momento se siguen las operaciones y argumentos exactos de `next_transition`, manteniendo los tokens de candidato. No construir comandos a partir de narración del modelo ni usar `Invoke-Expression`. Si se solicita consentimiento por candidato, debe responderlo la persona; habilitar RDD no equivale a dar ese consentimiento. Las capturas nativas ejecutan los revisores independientes y admiten sus resultados. Al aprobarse, se ejecuta el acknowledgement exacto que devuelve el proveedor.

RDD v2 elimina la autoridad y sus artefactos al reconocer el resultado. No produce un recibo durable de aprobación para GitHub; `FINALIZE` y los recibos antiguos son compatibilidad histórica. Un informe de ejecución de POS debe identificarse como tal, conservar el commit y resultados observados y jamás hacerse pasar por un recibo nativo. Revisión, CI, aprobación humana, aceptación funcional y autorización de merge son controles diferentes. Una revisión sin lentes no acredita una inspección semántica por un LLM.

Contratos upstream fijados:

- [Instalación no interactiva y scopes](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/docs/non-interactive.md).
- [Protocolo ODD y documento de feature](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/docs/usage.md#organic-driven-development-odd).
- [Revisión nativa v2 y consentimiento](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/docs/review-integration.md).
- [Transporte Claude](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/internal/reviewerprovider/claude_adapter.go) y [transporte Codex](https://github.com/Gentleman-Programming/gentle-ai/blob/v4.3.1/internal/reviewerprovider/codex_adapter.go).

Los adaptadores nativos invocan los CLI instalados, con procesos nuevos y contexto delimitado. Claude evita `--bare`, que no admite la sesión OAuth de suscripción. Codex conserva su autenticación al usar `--ignore-user-config`. No copiar credenciales de un desarrollador a GitHub Actions; una sesión local autenticada no acredita que exista un servicio remoto de revisión.
