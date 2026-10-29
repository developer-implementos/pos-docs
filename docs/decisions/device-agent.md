# ADR-17 · Agente autónomo de periféricos

**Decisión acordada; implementación pendiente.** `apps/device-agent` es la séptima aplicación de la arquitectura objetivo de POS Platform. Se desarrolla en **C#/.NET para Windows**, con ciclo de vida independiente de `pos-desktop` y `pos-mobile`. La revisión de producto contiene seis aplicaciones con interfaz mock o base técnica; todavía no contiene este agente, su protocolo ni sus adaptadores homologados.

## Responsabilidad y ubicación

`device-agent` ejecuta trabajos autorizados de impresión térmica, etiquetas y lectura/impresión de cheques. Se instala en el equipo con acceso al periférico: PC de caja para USB/SDK local o equipo autorizado para un dispositivo de red. Una instancia puede servir a varios clientes y dispositivos. Cada equipo físico tiene un único agente controlador activo; sus colas lógicas de recibos, cheques, endoso o MICR pueden compartir mecanismos y requerir exclusión mutua.

El agente recibe trabajo de `branch-api`, conserva recepción e intentos, ejecuta adaptadores y entrega evidencia. El backend conserva permisos, documentos y autoridad de negocio. Imprimir un documento existente no emite otro DTE, no confirma una venta ni vuelve a cobrar. La migración de `api-impresion-caja` no acredita integración con Transbank u otro terminal de pago. Un futuro adaptador de pagos requiere su contrato y homologación propios.

| Pieza | Tecnología y ubicación | Propiedad |
| --- | --- | --- |
| `pos-desktop` | Angular/PrimeNG dentro de Tauri; puesto | Presentación, solicitud y consulta del trabajo |
| `pos-mobile` | Angular/PrimeNG dentro de Capacitor; Android/iOS | Mismo contrato autorizado de sucursal, con destinos permitidos |
| `branch-api` / `libs/backend/devices` | NestJS/Fastify; servidor de sucursal | Autorización, registro de dispositivos, asignación, trabajo y auditoría en PostgreSQL |
| `device-agent` | C#/.NET; equipo Windows conectado al hardware | Recepción durable, ejecución exclusiva, adaptadores y evidencia |
| Diario técnico del agente | SQLite local, privado del agente | Identidades, hashes, intentos y resultados pendientes; sin tablas de ventas, precios o credenciales SQL de sucursal |
| Periférico | Driver/SDK/protocolo del modelo homologado | Efecto físico y capacidades de consulta realmente disponibles |

El backend usa su módulo `devices` para coordinar. Ese módulo no es otro proceso ni contiene los drivers Windows. La aplicación C# conserva sus adaptadores privados; se extraen bibliotecas cuando exista reutilización comprobada. Los contratos públicos de `devices` usan esquemas versionados y fixtures para validar TypeScript y C#; compartir repositorio no permite importar tipos TypeScript desde .NET. Los sobres técnicos comunes pertenecen a `shared/contracts` en la estructura objetivo.

## Tecnología y ejecución nativa

La base del agente será .NET en una versión soportada, seleccionada junto con la matriz de SDK, sistema operativo y arquitectura del dispositivo. El host supervisado conserva el trabajo aunque se cierre la ventana del POS. Su compilación y pruebas nativas se ejecutan en Windows; Nx coordina las tareas .NET sin convertirlas en proyectos NestJS. El artefacto firmado se instala en los equipos autorizados de sucursal.

El legacy depende de .NET Framework 4.7.2, Microsoft POS for .NET, APIs Win32 y una referencia x86. Esto no demuestra compatibilidad con .NET moderno, x64 o un servicio sin sesión de usuario. En particular, **Microsoft no soporta `System.Drawing.Printing` dentro de servicios Windows/ASP.NET**. No se traslada `PrintDocument` al nuevo host sin cambiar y validar la vía de impresión.

Se selecciona una API/SDK compatible con servicio para cada adaptador. Si un fabricante exige otro runtime, arquitectura o sesión interactiva, se aísla en un ejecutor supervisado con IPC privado y permisos restringidos. Su presencia depende de esa evidencia; no constituye otra aplicación de negocio por defecto. La indisponibilidad de la sesión o driver se informa como capacidad no disponible.

NestJS permanece en la coordinación de `branch-api`. El agente .NET evita añadir un segundo host Node para envolver los mismos SDK Windows. Tauri y Capacitor siguen siendo las shells de los clientes; no son el dueño del ciclo de vida del agente compartido.

## Conexiones y recorrido de un trabajo

```mermaid
flowchart TB
    Desktop["pos-desktop · Angular + Tauri"] -->|"Solicitar / consultar trabajo · HTTPS LAN"| API
    Mobile["pos-mobile · Angular + Capacitor"] -->|"Solicitar / consultar trabajo · HTTPS LAN"| API
    API["branch-api · NestJS/Fastify<br/>devices: permisos, asignación y auditoría"] -->|"Trabajos autorizados y evidencia · PostgreSQL"| DB[("PostgreSQL de sucursal")]
    Agent["device-agent · C#/.NET · Windows"] -->|"Obtener trabajos y reportar evidencia<br/>HTTPS LAN iniciado por agente"| API
    Agent -->|"Recepción e intentos durables · SQLite"| Journal[("Diario técnico local")]
    Agent -->|"Driver / SDK homologado"| Hardware["Impresora · Zebra · lector MICR"]
```

| Iniciador → destino | Propósito | Transporte y garantía |
| --- | --- | --- |
| Cliente → `branch-api` | Solicitar impresión/lectura y consultar estado | HTTPS autenticado por LAN; backend valida operador, puesto, ámbito, destino y capacidad |
| `branch-api` → PostgreSQL de sucursal | Guardar trabajo, autorización y auditoría | SQL/PostgreSQL; commit anterior a declarar aceptada la solicitud |
| `device-agent` → `branch-api` | Obtener trabajos asignados | HTTPS LAN saliente, inicialmente consulta prolongada; respuesta contiene el comando autorizado, no una nueva conexión entrante al puesto |
| `device-agent` → SQLite | Guardar recepción, intento y evidencia | Transacción local antes del acuse durable; no hay transacción distribuida con PostgreSQL o hardware |
| `device-agent` → periférico | Ejecutar capacidad física | Driver/SDK del modelo; serialización por dispositivo físico y grupos excluyentes |
| `device-agent` → `branch-api` | Reportar recepción y resultado identificado | HTTPS LAN autenticado; agente conserva evidencia hasta acuse posterior a persistencia del backend |

1. El cliente solicita imprimir un documento existente en un destino permitido. El backend deriva identidad y ámbito de la sesión autenticada.
2. `branch-api` guarda `jobId`, documento/versión, hash, capacidad, agente/dispositivo asignados y autorización. Una copia intencional requiere permiso y motivo propios.
3. El agente solicita trabajo con su identidad de instalación. Guarda recepción y hash antes de acusar; un duplicado idéntico obtiene el estado existente, un contenido distinto con el mismo ID se rechaza.
4. El agente registra el intento antes de ejecutar el adaptador. Conserva identificador del spooler, bytes/resultado y evidencia que ofrezca el dispositivo, sin inferir salida física por aceptación de software.
5. El backend persiste el resultado y confirma su recepción. El cliente consulta ese estado aunque se haya cerrado la ventana que originó el trabajo.

El móvil utiliza la red de sucursal y el mismo contrato; no llama al `localhost` del PC. Su acceso requiere enrolamiento, permisos nativos de red y confianza TLS homologados. Una impresora conectada directamente por Bluetooth/USB al móvil requiere un plugin Capacitor y SDK móvil específicos, con autorización e identidad equivalentes; no es una capacidad acreditada por el agente Windows.

## Estados, duplicados e incertidumbre

| Estado | Significado y siguiente acción |
| --- | --- |
| Pendiente | Backend registró el trabajo; el agente aún no acredita recepción durable |
| Recibido | Agente conservó el comando y su hash; todavía no afirma efecto físico |
| En ejecución | Intento registrado; el adaptador puede estar produciendo un efecto |
| Enviado al spooler | Cola de Windows aceptó el trabajo; no demuestra papel impreso |
| Confirmado | Existe evidencia compatible con el contrato del dispositivo; se indica qué confirma |
| Fallido | Fallo conocido y clasificado; reintento sólo si el contrato acredita que es seguro |
| Incierto | El efecto pudo ocurrir; consultar/conciliar o resolver autorizadamente, sin repetición ciega |
| Cancelado / vencido | Se impidió la ejecución antes del efecto; cancelar una solicitud no deshace un efecto ya iniciado |

La recepción, la entrega al spooler y la salida física son hitos diferentes. Un registro local no puede hacer atómica una llamada al hardware. Si se pierde energía después del envío y antes de guardar su resultado, se recupera evidencia del dispositivo/spooler cuando sea posible; si no alcanza, se conserva incertidumbre. Una reimpresión es otro trabajo autorizado que referencia el documento y trabajo originales, sin nuevo pago o emisión fiscal.

La asignación a otro agente requiere excluir al dueño anterior y resolver intentos en curso. El vencimiento de un lease no prueba que el proceso anterior dejó de imprimir. Las lecturas de cheque requieren sesión de interacción acotada, cancelación, liberación de recursos y exclusión compatible con la impresión/endoso del mismo equipo; no se ejecutan lecturas antiguas al reaparecer un agente.

SQLite conserva un diario técnico recuperable y acotado. Los payloads necesarios para el trabajo tienen retención y acceso restringidos; los resultados MICR no se vuelcan en logs. Después del acuse de backend se aplica la retención acordada, conservando deduplicación durante toda la ventana de reentrega. PostgreSQL es la autoridad de trabajos y auditoría de sucursal; el agente no modifica ventas por SQL ni mantiene un espejo de negocio.

BullMQ y RabbitMQ no son dependencias de este recorrido inicial. Una futura incorporación requiere un problema medido y conserva estas garantías de identidad, custodia e incertidumbre física.

## Identidad y operación

- El agente tiene identidad propia de instalación, credencial protegida y capacidades limitadas a sus dispositivos/sucursal. Usa HTTPS con autenticación mutua según el [contrato de identidad](../contracts/identity-and-trust.md); la identidad del móvil no se convierte en credencial del agente.
- El backend verifica permiso sobre documento, dispositivo y operación. El agente valida contrato, integridad, destino, vigencia y asignación antes del efecto. Una dirección IP conocida o CORS no concede autoridad.
- Los comandos permiten capacidades concretas. No aceptan desde la UI rutas arbitrarias, instrucciones shell, URLs de descarga libres ni RAW sin validación. Contenido y plantillas están versionados y vinculados al trabajo autorizado.
- Sin WAN puede continuar el perfil local autorizado si LAN, sucursal y dispositivos están disponibles. Sin LAN se conserva evidencia; sólo se completan trabajos ya autorizados cuya vigencia, estado y política permitan ejecución. No se habilitan nuevas ventas autónomas en el agente.
- La salud distingue proceso vivo, configuración válida y capacidad del dispositivo. Una prueba que imprime o mueve hardware es un comando explícito, nunca una sonda GET.
- Instalación, actualización y rollback preservan diario e identidad; se detiene admisión, se drena con límite y se conservan estados inciertos. Versiones de protocolo y esquema admitidas se comprueban antes del despliegue.

## Entrega y aceptación

La entrega se integra en [F02: pagos, fiscalidad y dispositivos](/guide/roadmap/phase-02/), con acceso móvil comprobado en [F06](/guide/roadmap/phase-06/). No se crea un scaffold que declare operaciones físicas exitosas sin un adaptador real.

| Validación | Evidencia requerida |
| --- | --- |
| Compatibilidad | Modelo/firmware, conexión, SDK, licencia, runtime, x86/x64, cuenta y sesión compatibles |
| Trabajo completo | Documento autorizado → recepción durable → adaptador → estado visible en escritorio y móvil |
| Recuperación | ACK perdido, reinicio de agente/spooler, pérdida de LAN y mismo ID con contenido distinto |
| Hardware | Sin papel, tapa abierta, desconexión USB, escritura parcial y resultado no consultable |
| Exclusión | Solicitudes simultáneas desde móvil/escritorio y capacidades del mismo equipo físico |
| MICR | Timeout real, cancelación, formato por país, lectura inválida y liberación de recursos |
| Entrega | Instalador firmado, privilegios mínimos, actualización/rollback con pendientes y rotación de credencial |

## Evidencia y referencias

La [auditoría de api-impresion-caja](../analisis-repositorios/api-impresion-caja.md) sustenta las capacidades y riesgos actuales. La revisión estática corresponde a `2e74b2d64985902f5fdfb52902016a5f65d7b577`; no acredita el binario instalado ni homologación productiva.

- [Microsoft: restricciones de System.Drawing.Printing](https://learn.microsoft.com/en-us/dotnet/api/system.drawing.printing?view=windowsdesktop-9.0).
- [Microsoft: host Windows Service con .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/windows-service).
- [Microsoft: StartDocPrinter e identificador del trabajo](https://learn.microsoft.com/en-us/windows/win32/printdocs/startdocprinter).
- [Capacitor: plugins y APIs nativas](https://capacitorjs.com/docs/plugins).
- [Nx: tareas de herramientas externas](https://nx.dev/docs/kb/run-commands-executor).
