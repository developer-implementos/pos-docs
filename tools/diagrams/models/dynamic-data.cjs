'use strict';

// Vistas dinámicas: participantes C2 y contratos de interacción, sin añadir otro nivel C4.
module.exports = [
  {
    "id": "prices",
    "number": "06",
    "title": "D1 · Publicación y activación de precios",
    "scope": "Desde la fuente autorizada hasta una cotización con versión fijada. La misma publicación controlada atiende deltas, carga masiva programada y recuperación manual.",
    "note": "Secuencia objetivo recomendada, no implementación acreditada. El propietario de cada dato y su contrato se confirman por país. El espejo de sucursal es de lectura y no se convierte en un maestro independiente.",
    "participants": [
      {
        "id": "masters",
        "nodeId": "masters",
        "name": "Fuentes de maestros y precios",
        "type": "Sistema externo",
        "technology": "Interfaces por confirmar",
        "summary": "Entrega catálogo, impuestos, precios y promociones aprobados por su propietario."
      },
      {
        "id": "erpAdapter",
        "nodeId": "erpAdapter",
        "name": "erp-worker",
        "type": "Contenedor",
        "technology": "NestJS / Node.js · libs/backend/erp",
        "summary": "Prepara datos autorizados y sube porciones mediante HTTPS saliente; no activa versiones ni usa SQL WAN."
      },
      {
        "id": "countryDb",
        "nodeId": "countryDb",
        "name": "Datos operativos de país",
        "type": "Contenedor de datos",
        "technology": "PostgreSQL",
        "summary": "Conserva versiones inmutables, manifiestos y deltas con un corte consistente."
      },
      {
        "id": "countryApi",
        "nodeId": "countryApi",
        "name": "country-api",
        "type": "Contenedor",
        "technology": "NestJS + Fastify / Node.js",
        "summary": "Autentica sucursales y sirve publicaciones por contrato y cursor."
      },
      {
        "id": "syncWorker",
        "nodeId": "syncWorker",
        "name": "branch-sync-worker",
        "type": "Contenedor",
        "technology": "NestJS / Node.js · sin servidor HTTP",
        "summary": "Recibe, prepara y valida candidatas antes de activar un espejo local."
      },
      {
        "id": "branchDb",
        "nodeId": "branchDb",
        "name": "Datos de sucursal",
        "type": "Contenedor de datos",
        "technology": "PostgreSQL",
        "summary": "Guarda staging, inbox, cursores y versiones de lectura en la base compartida."
      },
      {
        "id": "branchApi",
        "nodeId": "branchApi",
        "name": "branch-api",
        "type": "Contenedor",
        "technology": "NestJS + Fastify / Node.js",
        "summary": "Cotiza y confirma operaciones con datos y políticas vigentes."
      },
      {
        "id": "client",
        "nodeId": "client",
        "name": "pos-desktop",
        "type": "Contenedor",
        "technology": "Angular (frontend) · Tauri (shell nativa)",
        "summary": "Solicita una cotización por LAN y presenta su versión y resultado."
      }
    ],
    "steps": [
      {
        "from": "erpAdapter",
        "to": "masters",
        "label": "Obtiene cambios o carga completa autorizada",
        "note": "Interfaz por confirmar; el contrato identifica origen, cobertura, versión y vigencia. La secuencia no presupone CDC ni un broker."
      },
      {
        "from": "erpAdapter",
        "to": "erpAdapter",
        "label": "Prepara porciones con corte consistente",
        "note": "MasterDataSourcePort valida el contrato de fuente y prepara una candidata. Claims, identidad y presupuesto separados de los comandos financieros. La publicación en país pertenece a country-api."
      },
      {
        "from": "erpAdapter",
        "to": "countryApi",
        "label": "Claim, upload y finalize · HTTPS saliente",
        "note": "Entrega porciones idempotentes y pide finalización; una respuesta perdida conserva identidad. No abre SQL remoto ni decide la publicación en país."
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Versión, manifiesto y outbox · commit SQL",
        "note": "Tras validar corte, cobertura e integridad, country-api confirma publicación y evento. Los paquetes siguen inmutables y una carga parcial nunca sustituye la versión activa."
      },
      {
        "from": "syncWorker",
        "to": "countryApi",
        "label": "Solicita deltas o snapshot · HTTPS autenticado",
        "note": "Usa identidad de sucursal y país, contrato y cursor durable. Una carga completa puede ser programada o solicitada como recuperación manual controlada."
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Lee la publicación y su corte consistente · SQL",
        "note": "Selecciona la cobertura autorizada para esa sucursal y entrega una versión identificable, con manifiesto y deltas compatibles."
      },
      {
        "from": "countryApi",
        "to": "syncWorker",
        "label": "Devuelve manifiesto, deltas o chunks · HTTPS",
        "note": "La respuesta permite verificar versión, esquema, cobertura, watermark y checksum. Recibir bytes no significa haber aplicado los datos."
      },
      {
        "from": "syncWorker",
        "to": "branchDb",
        "label": "Persiste recepción y staging · transacciones SQL cortas",
        "note": "Guarda inbox recibida, staging y cursor de recepción para reanudar. No cambia la versión activa ni el cursor aplicado."
      },
      {
        "from": "syncWorker",
        "to": "syncWorker",
        "label": "Prepara candidata aislada y reproduce deltas posteriores",
        "note": "Los deltas incluyen altas, cambios y bajas explícitas (tombstones). Parten de una base conocida; el snapshot recupera deltas posteriores a su watermark. Nunca se parchea la versión activa en servicio."
      },
      {
        "from": "syncWorker",
        "to": "syncWorker",
        "label": "Valida la candidata completa antes de publicarla",
        "note": "Comprueba checksum, cobertura, referencias, orden, compatibilidad y vigencia. Descarga y validación pesada ocurren fuera de la transacción final; la candidata validada queda identificada e inmutable."
      },
      {
        "from": "syncWorker",
        "to": "branchDb",
        "label": "Activa versión + inbox aplicada + cursor aplicado · commit SQL",
        "note": "Un commit corto revalida base y checkpoint; un snapshot atrasado no hace retroceder el puntero ni el cursor aplicado. Activa efecto y checkpoint juntos; conserva versiones todavía referenciadas."
      },
      {
        "from": "client",
        "to": "branchApi",
        "label": "Solicita cotización · HTTPS sobre LAN",
        "note": "Envía artículos, cantidades y contexto autorizado; no consulta directamente el SQL ni recalcula precios con autoridad propia."
      },
      {
        "from": "branchApi",
        "to": "branchDb",
        "label": "Lee la versión vigente y fija su referencia · SQL",
        "note": "Verifica cobertura, vigencia y política. La cotización conserva versión, origen y reglas para explicar el cálculo; fijar la versión no extiende su vigencia. Antes de iniciar el pago se revalida y, si corresponde recalcular según la política acordada, se confirma el importe revisado."
      },
      {
        "from": "branchApi",
        "to": "client",
        "label": "Devuelve importes y versión de la cotización · HTTPS",
        "note": "Las nuevas cotizaciones usan la versión activa autorizada. Una cotización abierta conserva trazabilidad, pero puede requerir recálculo y confirmación antes del pago. Una actualización no cambia importe, identidad ni referencia de un pago iniciado o incierto."
      }
    ],
    "notes": [
      {
        "title": "Recibido y aplicado son estados distintos",
        "body": "La inbox y el cursor de recepción permiten reanudar una descarga. Solo el commit de activación confirma inbox aplicada, efecto y cursor aplicado. Deltas y snapshots atraviesan el mismo control de publicación; deduplicar no autoriza a activar."
      },
      {
        "title": "Huecos, incompatibilidad o carga incompleta",
        "body": "Bloquean la nueva publicación. Se conserva evidencia, se solicita replay o snapshot y se reutiliza staging válido cuando proceda. No se salta un hueco ni se publica una mezcla parcial de versiones."
      },
      {
        "title": "Frescura y vigencia son límites distintos",
        "body": "El TTL de frescura y la vigencia comercial se validan por separado; ambos deben cumplirse. Una carga fallida conserva la versión previa solo mientras siga autorizada. Redescargar la misma versión no reinicia plazos. Sin datos válidos se bloquea la operación afectada."
      },
      {
        "title": "Reconciliación programada y recuperación manual",
        "body": "La frecuencia de carga completa es configurable. Ambas rutas usan manifiesto, corte consistente, retención de deltas, staging, validación y activación atómica. La reconciliación detecta divergencias sin convertir una sucursal en autora del maestro."
      },
      {
        "title": "WAN caída; LAN y servidor disponibles",
        "body": "La sucursal cotiza sobre su espejo autorizado mientras datos, permisos y capacidades sigan vigentes. Si cae la LAN o el backend se detienen los comandos dependientes; no aparece otra base ni otro escritor en cada terminal."
      },
      {
        "title": "Replay, bajas y restauración",
        "body": "La entrega puede repetirse y se deduplica. Tombstones, versiones referenciadas y evidencia se retienen durante el horizonte de replay y recuperación para no resucitar bajas. Un restore puede retroceder datos y cursores: se concilia con origen antes de declarar convergencia."
      },
      {
        "title": "Responsabilidades de publicación",
        "body": "erp-worker prepara mediante MasterDataSourcePort en la red autorizada del origen; country-api conserva versiones y confirma su publicación en país. Fuente, interfaz y acceso se homologan por país; la preparación tiene identidad, claims y presupuesto aislados del trabajo financiero."
      }
    ]
  },
  {
    "id": "sale",
    "number": "07",
    "title": "D2 · Confirmación de venta y entrega durable",
    "scope": "Venta con pago por API habilitada: intención durable, commit local y entrega a país. Luego erp-worker reclama trabajo por conexión saliente, integra y registra un resultado independiente.",
    "note": "Secuencia objetivo recomendada. Cada flecha es una interacción, no una transacción distribuida. Venta, pago, fiscalidad, entrega a país y resultado ERP conservan identidades y estados separados.",
    "participants": [
      {
        "id": "client",
        "nodeId": "client",
        "name": "pos-desktop",
        "type": "Contenedor",
        "technology": "Angular (frontend) · Tauri (shell nativa)",
        "summary": "Envía comandos identificados y presenta el resultado durable al operador."
      },
      {
        "id": "branchApi",
        "nodeId": "branchApi",
        "name": "branch-api",
        "type": "Contenedor",
        "technology": "NestJS + Fastify / Node.js",
        "summary": "Autoriza la operación y coordina negocio, pago y evidencia local."
      },
      {
        "id": "branchDb",
        "nodeId": "branchDb",
        "name": "Datos de sucursal",
        "type": "Contenedor de datos",
        "technology": "PostgreSQL",
        "summary": "Custodia intención, venta, caja, auditoría y outbox en un primario compartido."
      },
      {
        "id": "payments",
        "nodeId": "payments",
        "name": "Proveedor de pagos",
        "type": "Sistema externo",
        "technology": "API / SDK según proveedor",
        "summary": "Informa resultado y referencia; la consulta posterior está sujeta a homologación."
      },
      {
        "id": "syncWorker",
        "nodeId": "syncWorker",
        "name": "branch-sync-worker",
        "type": "Contenedor",
        "technology": "NestJS / Node.js · sin servidor HTTP",
        "summary": "Entrega outbox confirmada y conserva identidad durante reintentos."
      },
      {
        "id": "countryApi",
        "nodeId": "countryApi",
        "name": "country-api",
        "type": "Contenedor",
        "technology": "NestJS + Fastify / Node.js",
        "summary": "Valida el contrato y confirma inbox, efecto local y outbox antes de acusar aplicación."
      },
      {
        "id": "countryDb",
        "nodeId": "countryDb",
        "name": "Datos operativos de país",
        "type": "Contenedor de datos",
        "technology": "PostgreSQL",
        "summary": "Guarda proyección de la venta, deduplicación y trabajo posterior de integración."
      },
      {
        "id": "erpAdapter",
        "nodeId": "erpAdapter",
        "name": "erp-worker",
        "type": "Contenedor",
        "technology": "NestJS / Node.js · libs/backend/erp",
        "summary": "Consume trabajo; traduce y concilia con ERP."
      },
      {
        "id": "erp",
        "nodeId": "erp",
        "name": "ERP del país",
        "type": "Sistema externo",
        "technology": "CL: AX · ES: Gira · PE: custom",
        "summary": "Recibe y concilia documentos financieros."
      }
    ],
    "steps": [
      {
        "from": "client",
        "to": "branchApi",
        "label": "Solicita confirmar venta · HTTPS sobre LAN",
        "note": "Con commandId estable, contexto de caja y referencia de cotización. Un reintento conserva la identidad del comando."
      },
      {
        "from": "branchApi",
        "to": "branchDb",
        "label": "Lee y valida turno, permisos, precios y capacidad · SQL",
        "note": "Antes de iniciar el pago valida importes, versión de la cotización, vigencia, política offline, espacio, reloj y recursos fiscales. Si la política exige recalcular, se confirma el importe revisado antes de crear el intento; fijar una versión no extiende su vigencia. El cliente no decide la autorización ni el importe final. Un pago iniciado o incierto conserva su importe e identidad mientras se resuelve."
      },
      {
        "from": "branchApi",
        "to": "branchDb",
        "label": "Persiste intención de venta y pago · commit SQL",
        "note": "Asigna identidades estables antes del efecto externo y guarda importe, moneda, destino y contexto suficiente para recuperar el intento."
      },
      {
        "from": "branchApi",
        "to": "payments",
        "label": "Ejecuta el intento autorizado · API habilitada",
        "note": "Usa la referencia original; idempotencia y consulta dependen de capacidades disponibles y homologadas. La llamada ocurre sin mantener una transacción SQL abierta."
      },
      {
        "from": "payments",
        "to": "branchApi",
        "label": "Devuelve resultado conocido y referencia · API",
        "note": "La continuación mostrada requiere un resultado suficiente para confirmar según política. Rechazo o respuesta desconocida siguen su estado y recuperación propios."
      },
      {
        "from": "branchApi",
        "to": "branchDb",
        "label": "Confirma venta + caja + auditoría + outbox · un commit SQL",
        "note": "Revalida invariantes y deduplicación; persiste partidas, impuestos, referencias de pago y evidencia fiscal que deba ser simultánea. El commit no incluye al proveedor externo ni al ERP."
      },
      {
        "from": "branchApi",
        "to": "client",
        "label": "Confirma operación y documento permitido · HTTPS",
        "note": "Solo después del commit local. Muestra estados de pago, fiscalidad e integración; la entrega a país puede permanecer pendiente sin negar la venta ya confirmada."
      },
      {
        "from": "syncWorker",
        "to": "branchDb",
        "label": "Lee outbox confirmada y reclama lote acotado · SQL",
        "note": "El claim o lease técnico es recuperable. No mantiene una transacción abierta durante el envío ni altera libremente las ventas."
      },
      {
        "from": "syncWorker",
        "to": "countryApi",
        "label": "Envía lote con eventId y secuencia · HTTPS autenticado",
        "note": "Incluye país, sucursal, versión de contrato e identidad estable del evento. La entrega es al menos una vez; un reintento no fabrica otra venta."
      },
      {
        "from": "countryApi",
        "to": "countryApi",
        "label": "Valida emisor, contrato, orden e identidad",
        "note": "Autentica el ámbito y comprueba el contrato. La decisión definitiva de deduplicación y sus restricciones se aplica dentro del commit siguiente."
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Aplica inbox + efecto local + outbox · una transacción SQL",
        "note": "Registra la proyección requerida y el trabajo posterior junto con la deduplicación. Un duplicado ya aplicado conserva su resultado; igual ID con contenido distinto es conflicto, no éxito."
      },
      {
        "from": "countryDb",
        "to": "countryApi",
        "label": "Confirma commit y resultado durable · SQL",
        "note": "Solo este resultado permite afirmar aplicación local en país. Guardar únicamente recepción no basta para emitir el ACK de aplicación."
      },
      {
        "from": "countryApi",
        "to": "syncWorker",
        "label": "Devuelve ACK de aplicación por evento · HTTPS",
        "note": "Identifica eventos aplicados, duplicados equivalentes y rechazos. No declara pago liquidado, validez fiscal ni documento contabilizado en ERP."
      },
      {
        "from": "syncWorker",
        "to": "branchDb",
        "label": "Persiste acuse y avance de entrega · commit SQL",
        "note": "Actualiza estados técnicos y checkpoint de eventos realmente acusados. Mantiene pendientes no confirmados y evidencia durante el horizonte de retención y recuperación."
      },
      {
        "from": "client",
        "to": "branchApi",
        "label": "Consulta estado local e integración pendiente · HTTPS LAN",
        "note": "Consulta la venta local y distingue confirmación, entrega a país y resultado ERP. Las interacciones siguientes no forman parte de su transacción local."
      },
      {
        "from": "erpAdapter",
        "to": "countryApi",
        "label": "Solicita trabajo identificado · HTTPS saliente",
        "note": "erp-worker inicia la conexión desde la red autorizada del ERP. Presenta identidad y ámbito; country-api conserva la autoridad del registro durable. No hay SQL remoto ni llamada entrante obligatoria al worker."
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Reclama trabajo e intento con lease · commit SQL",
        "note": "Selecciona una operación confirmada y conserva país, destino, versión de contrato, intento y dueño/vencimiento del lease. Expirar el lease no detiene una llamada ERP ya iniciada ni autoriza repetir un efecto incierto."
      },
      {
        "from": "countryApi",
        "to": "erpAdapter",
        "label": "Devuelve trabajo, destino y referencia · HTTPS",
        "note": "El worker usa ese contexto en cada reintento y durante un cambio de ERP. Un pendiente conserva destino y versión; no se redirige silenciosamente."
      },
      {
        "from": "erpAdapter",
        "to": "erpAdapter",
        "label": "Fachada y ACL traducen el contrato POS",
        "note": "Son componentes TypeScript internos de libs/backend/erp. Traducción y adaptador respetan las capacidades verificadas de AX, custom o Gira; no son tres servicios HTTP obligatorios."
      },
      {
        "from": "erpAdapter",
        "to": "erp",
        "label": "Envía operación o consulta resultado · contrato homologado",
        "note": "Ejecuta la capacidad permitida con identidad estable. No mantiene una transacción SQL de país abierta mientras espera al ERP."
      },
      {
        "from": "erp",
        "to": "erpAdapter",
        "label": "Devuelve resultado o referencia · protocolo ERP",
        "note": "La respuesta puede confirmar, rechazar o dejar resultado incierto. Un timeout conserva el intento; se consulta o concilia cuando la capacidad exista, sin fabricar otro cargo/documento."
      },
      {
        "from": "erpAdapter",
        "to": "countryApi",
        "label": "Reporta resultado con identidad original · HTTPS saliente",
        "note": "Reentregar o consultar el resultado es independiente de reenviar la operación al ERP. Se preservan referencia, destino, versión y evidencia técnica."
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Persiste resultado y estado de integración · commit SQL",
        "note": "El resultado se registra con transiciones condicionales y deduplicación. ACK de aplicación de la venta, resultado ERP y contabilización definitiva siguen siendo hitos distintos."
      }
    ],
    "notes": [
      {
        "title": "Pago desconocido o aprobado sin commit local",
        "body": "Un timeout conserva el intento y su incertidumbre: consulta o conciliación según capacidad, sin recargar ni cambiar automáticamente de proveedor. Si el pago se aprobó y falla el commit local, se recuperan intención y evidencia; una reversa o intervención controlada conserva el intento original."
      },
      {
        "title": "SDK local es una ruta condicional",
        "body": "La vista muestra una API ejecutada desde backend. Si el proveedor exige SDK local homologado, el cliente transporta al puente de periféricos el comando original autorizado por backend y retorna evidencia. No inventa importe o permiso, ni ejecuta ambas rutas para un mismo intento."
      },
      {
        "title": "Fiscalidad e impresión tienen su propio resultado",
        "body": "Solo se confirman operaciones y documentos permitidos por la modalidad nacional habilitada. Las llamadas fiscales conservan referencia, estado y recuperación fuera de una transacción distribuida. Un fallo de impresión permite reimprimir el mismo documento; no genera otra venta ni otro cargo."
      },
      {
        "title": "Caída WAN frente a caída LAN",
        "body": "Sin WAN la outbox permanece durable y se permiten solo operaciones soportadas por datos, autenticación, pago y fiscalidad vigentes. Sin LAN, backend o escritor autorizado se detiene el comando dependiente. Ninguna terminal crea por ello una base o autoridad alternativa."
      },
      {
        "title": "ACK perdido, replay y restore",
        "body": "Un ACK perdido provoca reentrega del mismo eventId; país deduplica en la transacción del efecto. Un hueco o conflicto queda pendiente para resolver. La retención y conciliación cubren restauraciones que retrocedan inbox, datos o cursores; no se promete exactly-once universal."
      },
      {
        "title": "ERP posterior no es el ACK de país",
        "body": "erp-worker reclama trabajo mediante HTTPS saliente a country-api y ejecuta fachada, ACL y adaptadores dentro del mismo proceso. Country-api conserva intentos y resultados en PostgreSQL; no existe acceso SQL WAN desde el worker. Una respuesta incierta requiere consulta o conciliación antes de repetir efectos."
      }
    ]
  }
];
