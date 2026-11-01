/* Proposed C4 model. Local explanatory data: no credentials, SDK calls or requests. */
(() => {
  'use strict';
  const sources = {
  "proposal": {
    "label": "Propuesta y decisiones de arquitectura",
    "url": "../docs/propuesta-arquitectura.md"
  },
  "technology": {
    "label": "Opciones tecnológicas y límites",
    "url": "../docs/opciones-tecnologicas.md"
  },
  "resilience": {
    "label": "Integridad, recuperación y casos adversos",
    "url": "../docs/revision-resiliencia-datos-pos.md"
  },
  "providers": {
    "label": "Proveedores, periféricos y homologación",
    "url": "../docs/extensibilidad-proveedores-dispositivos.md"
  },
  "evidence": {
    "label": "Catálogo del sistema actual: evidencia por repositorio",
    "url": "../docs/catalogo-integraciones-actuales.md"
  },
  "operations": {
    "label": "Operación de caja y evolución",
    "url": "../docs/operacion-caja-y-evolucion.md"
  },
  "c4": {
    "label": "Guía de estas vistas C4",
    "url": "../docs/c4-arquitectura-propuesta.md"
  },
  "publication": {
    "label": "Contrato de publicación de maestros",
    "url": "../docs/contracts/master-data-publication.md"
  },
  "jobs": {
    "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
    "url": "../docs/decisions/job-processing.md"
  }
};
  const nodes = {
  "cashier": {
    "id": "cashier",
    "name": "Cajero",
    "type": "Persona",
    "technology": "Operación humana",
    "summary": "Vende, cobra y gestiona su turno.",
    "ownership": "Ejecuta operaciones con permisos; no administra la base.",
    "offline": "Acceso local y operaciones habilitadas según vigencia, permisos y política offline.",
    "detail": "Usa el cliente del puesto. Abrir o cerrar sesión de usuario no equivale a abrir o cerrar el turno de caja.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ]
  },
  "supervisor": {
    "id": "supervisor",
    "name": "Supervisor de sucursal",
    "type": "Persona",
    "technology": "Operación humana",
    "summary": "Autoriza excepciones y revisa cierres.",
    "ownership": "Responsable operativo; los comandos mantienen autorización y auditoría.",
    "offline": "Solo facultades previamente habilitadas; sin inventar autorización central.",
    "detail": "Consulta resultados, autoriza acciones permitidas y resuelve incidencias con evidencia.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ]
  },
  "support": {
    "id": "support",
    "name": "Operación de plataforma",
    "type": "Persona",
    "technology": "Soporte autorizado",
    "summary": "Supervisa sincronización y recuperación.",
    "ownership": "Administra configuración y reintentos auditados; no corrige dinero con SQL libre.",
    "offline": "Consulta evidencia local; la plataforma de país puede estar inaccesible sin WAN.",
    "detail": "Programa cargas y ventanas, supervisa atrasos, coordina restauraciones y conciliaciones.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ]
  },
  "pos": {
    "id": "pos",
    "name": "POS corporativo",
    "type": "Sistema de software",
    "technology": "Plataforma de caja",
    "summary": "Opera sucursales e integra cada país.",
    "ownership": "La venta nace en sucursal; país mantiene la proyección consolidada.",
    "offline": "Perfil inicial: WAN caída con LAN y escritor de sucursal disponibles.",
    "detail": "Sistema objetivo común para Chile, Perú y España. Aplicaciones completas con frontend Angular alojado por las shells nativas Tauri (escritorio) y Capacitor (móvil), aceptadas como dirección; backend, datos y topología son recomendaciones por validar. device-agent es la aplicación autónoma propuesta para operar periféricos desde un equipo Windows, bajo autorización del backend; su journal técnico no sustituye PostgreSQL. Primera entrega F02: agente dedicado en el puesto Windows con periféricos locales; piloto F05. Periféricos de red y estación compartida son expansión F06 condicionada a homologación.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ]
  },
  "erp": {
    "id": "erp",
    "name": "ERP del país",
    "type": "Sistema externo",
    "technology": "CL: AX · ES: Gira · PE: custom",
    "summary": "Recibe y concilia documentos financieros.",
    "ownership": "Autoridad financiera según contrato de cada país; no la base de ventas del POS.",
    "offline": "Su indisponibilidad deja integración pendiente; no revierte una venta local confirmada.",
    "detail": "Chile usa Dynamics AX on-premise. Gira en España y custom en Perú son antecedentes; versión, interfaces y capacidades deben confirmarse. No se afirma que exista el adaptador objetivo en producción.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Catálogo del sistema actual: evidencia por repositorio",
        "url": "../docs/catalogo-integraciones-actuales.md"
      }
    ]
  },
  "masters": {
    "id": "masters",
    "name": "Fuentes de maestros y precios",
    "type": "Sistema externo",
    "technology": "Interfaces por confirmar",
    "summary": "Publica datos y reglas autorizados.",
    "ownership": "Propietario por dato y país pendiente: no se asigna al ERP por defecto.",
    "offline": "Sin WAN se usa la versión local vigente dentro de la política autorizada.",
    "detail": "Catálogo, impuestos, precios y promociones deben tener responsable, contrato, versión y vigencia. La fuente de precios no se sustituye por una tabla editada libremente en cada caja.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Operación de caja y evolución",
        "url": "../docs/operacion-caja-y-evolucion.md"
      }
    ]
  },
  "payments": {
    "id": "payments",
    "name": "Proveedor de pagos",
    "type": "Sistema externo",
    "technology": "API / SDK según proveedor",
    "summary": "Ej.: Transbank POS · Niubiz · Mercado Pago Point.",
    "ownership": "El proveedor mantiene el efecto financiero; POS registra intento, referencia y resultado.",
    "offline": "Disponibilidad y modo offline por homologar. Un timeout puede dejar resultado desconocido.",
    "detail": "Autoriza o informa el resultado del pago. Transbank con terminal local en Chile y Niubiz en Perú proceden de las fuentes revisadas. Mercado Pago Point es un ejemplo presencial ilustrativo, sin adopción ni integración acreditadas; Webpay Plus es un ejemplo de pago online de Transbank, distinto de su terminal de tienda. En España se informan BBVA/Redsys con TPV portátiles sin conexión a Gira y conciliación contable; no se presume una API o SDK ya integrado. Cada ruta y capacidad requiere homologación. Pago, venta, documento fiscal e integración ERP tienen estados distintos. No repetir un cargo incierto ni cambiar de proveedor para resolverlo automáticamente.",
    "sources": [
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ]
  },
  "fiscal": {
    "id": "fiscal",
    "name": "Proveedor de facturación",
    "type": "Sistema externo",
    "technology": "Contrato por país y modalidad",
    "summary": "Ej.: Acepta / Ingydev (CL) · EFACT (PE).",
    "ownership": "La solución prepara, emite o transmite documentos por cuenta del contribuyente según su contrato. La autoridad tributaria es distinta: SII en Chile, SUNAT en Perú y la autoridad aplicable en España.",
    "offline": "Emitir offline exige modalidad y material fiscal válidos; no se promete universalmente.",
    "detail": "Acepta/Ingydev aparecen en el código legacy chileno y EFACT en las fuentes de Perú. Gira se informa como solución de España; su modalidad fiscal, interfaces y capacidades deben confirmarse. Estos ejemplos no seleccionan un proveedor corporativo ni acreditan adaptadores homologados para POS Platform. SII y SUNAT son autoridades tributarias, no estos proveedores de software; en España corresponde la autoridad del régimen y territorio aplicables. Emisión, aceptación y transmisión se modelan por separado. No se inventa un proveedor común ni una capacidad de consulta o idempotencia no acreditada.",
    "sources": [
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      },
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      }
    ]
  },
  "client": {
    "id": "client",
    "name": "pos-desktop",
    "type": "Contenedor",
    "technology": "Angular (frontend) · Tauri (shell nativa)",
    "summary": "Aplicación completa para caja y comandos.",
    "ownership": "No posee otra base de ventas ni credenciales SQL.",
    "offline": "Sin WAN usa la API por LAN. Sin LAN o backend, se detienen nuevos comandos dependientes.",
    "detail": "apps/pos-desktop entrega la aplicación completa: la shell nativa Tauri aloja el frontend Angular. Tiene arranque, configuración nativa y build propios. Comparte con pos-mobile libs/client-shell: raíz, configuración, rutas, guards y layout Angular; esta biblioteca no es la shell nativa ni un proceso adicional. Solicita capacidades de dispositivos a branch-api; no transporta trabajos a device-agent ni necesita mantenerse abierto para que éste opere. Distribución e integración nativa requieren homologación; no posee autoridad de ventas. F02 instala device-agent y su journal en el mismo puesto Windows; son procesos independientes. El perfil dedicado sólo recibe trabajos asignados a ese puesto.",
    "sources": [
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      },
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      }
    ],
    "appId": "pos-desktop",
    "projectPath": "apps/pos-desktop"
  },
  "mobileClient": {
    "id": "mobileClient",
    "name": "pos-mobile",
    "type": "Contenedor",
    "technology": "Angular (frontend) · Capacitor (shell nativa)",
    "summary": "Aplicación completa para Android/iOS.",
    "ownership": "Comparte interfaz y contratos; no otra autoridad de ventas.",
    "offline": "Requiere conexión autorizada al backend de sucursal. El móvil no incorpora autonomía sin LAN.",
    "detail": "apps/pos-mobile entrega la aplicación completa: la shell nativa Capacitor aloja el frontend Angular. Tiene arranque, configuración nativa y build propios. Comparte con pos-desktop libs/client-shell: raíz, configuración, rutas, guards y layout Angular; esta biblioteca no es la shell nativa ni un proceso adicional. Los adaptadores actuales son mock. Instalación, ciclo de vida, almacenamiento y capacidades nativas requieren pruebas Android/iOS; no hay acceso SQL ni permisos implícitos por empaquetar la interfaz. El acceso móvil a periféricos compartidos se habilita en F06 tras homologación y asignación explícita. Solicita capacidades a branch-api; no usa por defecto el agente dedicado a otro puesto ni depende de pos-desktop como relé.",
    "sources": [
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      },
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      }
    ],
    "appId": "pos-mobile",
    "projectPath": "apps/pos-mobile"
  },
  "branchApi": {
    "id": "branchApi",
    "name": "branch-api",
    "type": "Contenedor",
    "technology": "NestJS + Fastify / Node.js",
    "summary": "Valida y confirma la operación local.",
    "ownership": "Única autoridad de escritura del negocio de sucursal; módulos internos, un proceso.",
    "offline": "Opera por LAN con datos vigentes. Su caída exige recuperación del escritor autorizado.",
    "detail": "apps/branch-api compone los contextos operativos: sales/returns, cash/collections, pricing/catalog, payments/devices, fiscal, reporting y administration. sync aporta el contrato outbox que se confirma con negocio. El transporte pertenece a branch-sync-worker y la ACL ERP a erp-worker. Bibliotecas no equivalen a microservicios; las capacidades de negocio aún requieren implementación. devices autoriza y conserva trabajos, auditoría y observaciones de periféricos en PostgreSQL de sucursal. Recibe evidencia de device-agent por conexiones iniciadas por el agente; los clientes no actúan como relé. Registrar o imprimir un trabajo conserva la referencia del documento y no modifica la confirmación de la venta.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "appId": "branch-api",
    "projectPath": "apps/branch-api"
  },
  "branchDb": {
    "id": "branchDb",
    "name": "Datos de sucursal",
    "type": "Contenedor de datos",
    "technology": "PostgreSQL",
    "summary": "Guarda negocio, outbox y espejo local.",
    "ownership": "Base compartida por la tienda, un primario autorizado. API escribe negocio; worker escribe su esquema técnico y publica espejos por un contrato acotado.",
    "offline": "Persistencia local disponible sin WAN. No implica respaldo, alta disponibilidad ni recuperación automática.",
    "detail": "branch-api y branch-sync-worker acceden al mismo PostgreSQL de la sucursal con responsabilidades y permisos distintos. Ventas, caja, pagos y evidencia fiscal se conservan aquí. devices es propietario de los trabajos autorizados, su auditoría y las observaciones de periféricos recibidas del agente; estos registros conservan identidad y referencia al documento, sin formar parte de la misma transacción de confirmación de venta. El journal SQLite privado del agente sólo registra ejecución técnica. Inbox, outbox, cursores y staging tienen restricciones y transacciones según cada operación. Las llamadas de red quedan fuera de esas transacciones. Catálogo, precios y promociones son réplicas de lectura autorizadas, no maestros independientes.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ]
  },
  "syncWorker": {
    "id": "syncWorker",
    "name": "branch-sync-worker",
    "type": "Contenedor",
    "technology": "NestJS / Node.js · sin servidor HTTP",
    "summary": "Entrega eventos y actualiza espejos.",
    "ownership": "Proceso supervisado; modifica datos técnicos y versiones de maestros, nunca venta libremente.",
    "offline": "Retiene pendientes durables y reanuda al recuperar WAN; limita reintentos y trabajo en curso.",
    "detail": "apps/branch-sync-worker compone libs/backend/sync con pricing/catalog para preparar y activar versiones. Entrega outbox por HTTPS con identidad y cursor; confirma acuses durables. El proceso supervisado sigue activo aunque el cliente se cierre. Descarga, staging, validación y activación conservan límites transaccionales. No requiere Redis ni BullMQ por sucursal: el control de pendientes, calendario, cursores y activación utiliza PostgreSQL local y HTTPS.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "appId": "branch-sync-worker",
    "projectPath": "apps/branch-sync-worker"
  },
  "countryApi": {
    "id": "countryApi",
    "name": "country-api",
    "type": "Contenedor",
    "technology": "NestJS + Fastify / Node.js · BullMQ",
    "summary": "Recibe operaciones y sirve trabajo y versiones.",
    "ownership": "Autentica sucursal y país; confirma inbox, efecto local y outbox juntos antes del ACK de aplicación. Conserva autoridad de versiones, manifiestos y publicación de maestros.",
    "offline": "No participa en la transacción local de sucursal. Su caída genera atraso de sincronización.",
    "detail": "apps/country-api autentica el ámbito país/entidad/sucursal. Confirma inbox, proyección operativa y outbox en un único commit antes del ACK de aplicación. Expone trabajo y resultados al erp-worker mediante HTTPS saliente iniciado por ese worker. Valida, publica y sirve versiones preparadas mediante MasterDataSourcePort en erp-worker; no ejecuta la ACL ni carga masiva pesada en un endpoint. La caché opcional acelera lecturas reconstruibles, con PostgreSQL como fuente durable. BullMQ es la librería elegida dentro del mismo proceso para programar publicaciones y ejecutar tareas breves fuera de HTTP. Usa Redis de trabajos exclusivo de país; PostgreSQL conserva solicitudes, calendario, outbox y resultados para reconstruir jobs. La preparación pesada se ejecuta en erp-worker. La decisión está adoptada; su integración todavía no está implementada.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      },
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      }
    ],
    "appId": "country-api",
    "projectPath": "apps/country-api"
  },
  "countryWorker": {
    "id": "countryWorker",
    "name": "Publicación de maestros",
    "type": "Componente",
    "technology": "catalog / pricing / sync · TypeScript",
    "summary": "Valida y publica versiones comerciales.",
    "ownership": "country-api conserva la autoridad de candidata, versión, manifiesto, paquetes y publicación en país.",
    "offline": "Una carga incompleta no sustituye la publicación vigente. Las sucursales continúan según vigencia y políticas.",
    "detail": "Componente propuesto dentro de country-api. Recibe porciones idempotentes y finalización desde erp-worker por HTTPS, valida cobertura, corte e integridad y confirma versión, manifiesto y evento. La preparación pesada permanece en el adaptador de fuente del worker; no ocurre dentro de una petición. Los disparos programados y la creación breve de solicitudes se orquestan con BullMQ fuera de la petición HTTP; calendario, identidad de ejecución y estado de publicación permanecen en PostgreSQL.",
    "sources": [
      {
        "label": "Contrato de publicación de maestros",
        "url": "../docs/contracts/master-data-publication.md"
      },
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      }
    ],
    "codePaths": [
      "libs/backend/catalog",
      "libs/backend/pricing",
      "libs/backend/sync"
    ]
  },
  "countryDb": {
    "id": "countryDb",
    "name": "Datos operativos de país",
    "type": "Contenedor de datos",
    "technology": "PostgreSQL",
    "summary": "Consolida y conserva entrega durable.",
    "ownership": "Proyección de operaciones de sucursal; inbox, outbox, versiones y resultados de integración.",
    "offline": "No sustituye la autoridad local ni habilita consumo concurrente offline de saldos globales.",
    "detail": "Aislamiento lógico y recursos por país/entidad legal. Retención, backups y deduplicación deben cubrir el horizonte de replay y restauración. ACK de aplicación local no equivale a contabilización ERP. Conserva también calendarios, solicitudes de publicación, intentos y checkpoints durables. La outbox permite encolar tras el commit y un reconciliador reconstruye jobs pendientes sin confiar en la permanencia del historial Redis.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      },
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      }
    ]
  },
  "erpAdapter": {
    "id": "erpAdapter",
    "name": "erp-worker",
    "type": "Contenedor",
    "technology": "NestJS / Node.js · BullMQ",
    "summary": "Integra ERP y prepara maestros por contrato.",
    "ownership": "Proceso con fachada, ACL y adaptadores internos. Prepara maestros por MasterDataSourcePort con identidad y presupuesto aislados; country-api conserva publicaciones y resultados durables.",
    "offline": "Si país o ERP no responde, conserva identidad y resultado incierto. Consulta o concilia antes de repetir un efecto.",
    "detail": "apps/erp-worker se ejecuta en la red autorizada del ERP e inicia HTTPS autenticado hacia country-api para reclamar trabajo, renovar su lease y registrar resultados. Mantiene destino, versión de contrato e identidad de intento. Fachada, ACL y adaptadores son componentes de libs/backend/erp, no servicios HTTP separados obligatorios. Chile: AX; Perú: custom; España: Gira, con interfaces por homologar. No accede por SQL remoto a PostgreSQL de país. La preparación de maestros usa una identidad y presupuesto propios, conexión saliente a country-api y contrato de fuente homologado; no ejecuta SQL WAN. BullMQ organiza trabajos técnicos, preparación de maestros y consultas de conciliación dentro del mismo proceso. Utiliza Redis de trabajos exclusivo de la red ERP y obtiene el estado durable por HTTPS de country-api. La cola puede reentregar: antes de actuar revalida estado y autorización; un resultado financiero incierto se consulta o concilia, no se repite automáticamente. La integración BullMQ está elegida, aún no implementada.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Catálogo del sistema actual: evidencia por repositorio",
        "url": "../docs/catalogo-integraciones-actuales.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      },
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      }
    ],
    "appId": "erp-worker",
    "projectPath": "apps/erp-worker"
  },
  "entry": {
    "id": "entry",
    "name": "API de comandos",
    "type": "Componente",
    "technology": "Controllers NestJS / Fastify",
    "summary": "Valida entrada e identidad del comando.",
    "ownership": "Contrato del backend; no escribe tablas por fuera de los casos de uso.",
    "offline": "API local por LAN; rechaza comandos cuando falta una capacidad requerida.",
    "detail": "Autentica el puesto, valida esquema, propaga commandId y contexto de usuario/sucursal, aplica límites y entrega un resultado inequívoco o pendiente.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "apps/branch-api"
    ]
  },
  "access": {
    "id": "access",
    "name": "Acceso y administración",
    "type": "Componente",
    "technology": "libs/backend/administration",
    "summary": "Autoriza usuario, puesto y ámbito operativo.",
    "ownership": "Permisos y evidencia de sesión según política local autorizada.",
    "offline": "La vigencia offline y revocación requieren política expresa; no acceso indefinido.",
    "detail": "Compone autorización y configuración operativa por usuario, sucursal y país. La identidad de usuario y puesto se comprueba en servidor; el menú no es frontera de autorización. Las reglas offline, revocación y aprobaciones requieren implementación y acuerdo.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/administration"
    ]
  },
  "sales": {
    "id": "sales",
    "name": "Ventas y devoluciones",
    "type": "Componente",
    "technology": "libs/backend/sales + returns",
    "summary": "Coordina el ciclo de la operación.",
    "ownership": "Escritor de ventas y devoluciones; conserva referencias, versiones y estados.",
    "offline": "Permite solo operaciones soportadas por datos, límites y política vigentes.",
    "detail": "Fija versión de precios al preparar la venta, registra intención y resultado de pagos y documentos; compensaciones y devoluciones son nuevas operaciones auditables.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/sales",
      "libs/backend/returns"
    ]
  },
  "pricing": {
    "id": "pricing",
    "name": "Catálogo, precios y ofertas",
    "type": "Componente",
    "technology": "libs/backend/pricing + catalog",
    "summary": "Cotiza sobre una versión vigente.",
    "ownership": "Lector del espejo PostgreSQL; no redefine el maestro corporativo.",
    "offline": "No depende de una consulta de precio remoto para las ventas offline autorizadas.",
    "detail": "Lee una versión completa validada e inmutable. Los deltas construyen una nueva candidata aislada a partir de la versión base; nunca parchean la activa. La cotización conserva versión, origen y reglas para explicar su cálculo; fijarla no prolonga su vigencia. Antes de iniciar el pago se revalida y, si la política exige recalcular, se confirma el importe revisado. Una actualización no altera el importe, identidad ni referencia de un pago iniciado o incierto.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Operación de caja y evolución",
        "url": "../docs/operacion-caja-y-evolucion.md"
      }
    ],
    "codePaths": [
      "libs/backend/pricing",
      "libs/backend/catalog"
    ]
  },
  "cash": {
    "id": "cash",
    "name": "Caja, cobranzas y anticipos",
    "type": "Componente",
    "technology": "libs/backend/cash + collections",
    "summary": "Coordina turnos, movimientos y cobranzas.",
    "ownership": "Libro de movimientos y turnos de sucursal, con autorización y auditoría.",
    "offline": "Opera localmente; excepciones y límites requieren una política aprobada.",
    "detail": "Los módulos cash y collections conservan límites distintos dentro del mismo proceso. Gestionan apertura/cierre y movimientos de caja, además de cobranzas y anticipos habilitados. Turno de caja, sesión de acceso, saldo, abono y depósito no son equivalentes. Cada efecto conserva identidad, autorización y auditoría; no se consume crédito global offline sin política explícita.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/cash",
      "libs/backend/collections"
    ]
  },
  "payPort": {
    "id": "payPort",
    "name": "Pagos y dispositivos",
    "type": "Componente",
    "technology": "libs/backend/payments + devices",
    "summary": "Gestiona intentos, trabajos y evidencia.",
    "ownership": "Conserva identidad de intento y referencia del proveedor; no inventa resultado.",
    "offline": "Si el proveedor no responde: pendiente/desconocido, consulta o resolución operativa.",
    "detail": "Payments conserva intentos y estados financieros; devices autoriza trabajos por capacidad, equipo y agente, con jobId y hash del contenido, y procesa evidencia técnica. device-agent inicia HTTPS autenticado para obtener trabajos y reportar resultados. F02/F05: pos-desktop solicita a branch-api operaciones para su puesto dedicado. La estación compartida y el acceso móvil a periféricos son expansión F06 sujeta a homologación. No mantiene una transacción PostgreSQL abierta al esperar al hardware o proveedor. Pagos por SDK local son una capacidad futura por homologar, independiente de la impresión; API remota y SDK no se ejecutan simultáneamente para un mismo intento.",
    "sources": [
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/payments",
      "libs/backend/devices"
    ]
  },
  "fiscalPort": {
    "id": "fiscalPort",
    "name": "Fiscalidad y adaptadores",
    "type": "Componente",
    "technology": "libs/backend/fiscal",
    "summary": "Aplica modalidad fiscal por país.",
    "ownership": "Conserva identidad del documento y estados de emisión/aceptación/transmisión.",
    "offline": "Solo modalidades legal y técnicamente habilitadas; falta de capacidad bloquea esa acción.",
    "detail": "Separa confirmación de venta de validez fiscal. Un timeout fiscal mantiene la referencia original y la incertidumbre hasta consultar o conciliar.",
    "sources": [
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/fiscal"
    ]
  },
  "unitOfWork": {
    "id": "unitOfWork",
    "name": "Persistencia transaccional",
    "type": "Componente",
    "technology": "Repositorios + contrato outbox (sync)",
    "summary": "Confirma negocio, auditoría y outbox.",
    "ownership": "Un commit sobre PostgreSQL de sucursal; restricciones e idempotencia de comandos.",
    "offline": "La operación no se confirma si el commit falla. Falta de disco exige política de bloqueo.",
    "detail": "Confirma negocio, auditoría y contrato outbox de libs/backend/sync en la misma transacción de PostgreSQL de sucursal. Cada módulo conserva propiedad de sus datos. No engloba llamadas a proveedores ni ERP. Los logs de Pino no sustituyen la auditoría persistida en este commit.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync"
    ]
  },
  "schedule": {
    "id": "schedule",
    "name": "Planificador y supervisor",
    "type": "Componente",
    "technology": "Worker TypeScript",
    "summary": "Admite trabajos con límites y ventanas.",
    "ownership": "Checkpoint y calendario por flujo; operación auditada.",
    "offline": "Cierra admisión, drena o conserva checkpoint; no convierte timeout en rechazo.",
    "detail": "Carga incremental continua según política, bulk programable y recuperación manual usan el mismo pipeline validado. Zona horaria IANA, límites, backoff y jitter son configuración explícita.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Operación de caja y evolución",
        "url": "../docs/operacion-caja-y-evolucion.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync"
    ]
  },
  "sender": {
    "id": "sender",
    "name": "Emisor de outbox",
    "type": "Componente",
    "technology": "Worker TypeScript / HTTPS",
    "summary": "Envía lotes con identidad estable.",
    "ownership": "Reintento de los mismos eventos; claim/lease técnico con recuperación.",
    "offline": "Conserva cola durable; no elimina pendientes por pérdida de conexión.",
    "detail": "Lee outbox confirmada, arma lotes acotados y mantiene commandId/eventId, país, sucursal, versión de contrato y secuencia. La entrega es al menos una vez, no exactly once universal.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync"
    ]
  },
  "receiver": {
    "id": "receiver",
    "name": "Receptor de deltas y acuses",
    "type": "Componente",
    "technology": "Worker TypeScript / HTTPS",
    "summary": "Valida contratos y cursores de entrega.",
    "ownership": "Distingue ACK de aplicación local de resultado financiero/fiscal/ERP.",
    "offline": "Reanuda desde cursor durable; si hay huecos, solicita recuperación.",
    "detail": "Los acuses del país llegan por respuestas o consulta autenticada. Un acuse perdido provoca replay con identidad original; nunca inventa un número ERP.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync"
    ]
  },
  "dedup": {
    "id": "dedup",
    "name": "Inbox y deduplicación",
    "type": "Componente",
    "technology": "Transacciones SQL / TypeScript",
    "summary": "Deduplica y prepara una candidata.",
    "ownership": "Inbox recibida, staging y cursor de recepción son durables; no equivalen a inbox aplicada ni cursor aplicado.",
    "offline": "Replay repetido no duplica el efecto local. Restore exige conciliar evidencia.",
    "detail": "Detecta duplicados, desorden y huecos. Aplica deltas a una candidata aislada y la entrega al validador. Descarga y preparación quedan fuera de la transacción final; al activar se confirman inbox aplicada, efecto y cursor aplicado juntos.",
    "sources": [
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      },
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync"
    ]
  },
  "snapshot": {
    "id": "snapshot",
    "name": "Carga de snapshot",
    "type": "Componente",
    "technology": "Descarga HTTPS / TypeScript",
    "summary": "Prepara una versión fuera de servicio.",
    "ownership": "Staging aislado; datasetVersion y watermark de origen identificables.",
    "offline": "La versión activa sigue sirviendo mientras se descarga o falla una carga.",
    "detail": "Carga masiva programada o manual; recibe manifiesto, versión, cobertura y watermark. Verifica chunks/checksum y recupera deltas posteriores antes de declarar una versión lista.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Operación de caja y evolución",
        "url": "../docs/operacion-caja-y-evolucion.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync",
      "libs/backend/catalog",
      "libs/backend/pricing"
    ]
  },
  "validation": {
    "id": "validation",
    "name": "Validador de publicación",
    "type": "Componente",
    "technology": "Reglas TypeScript / SQL",
    "summary": "Revisa integridad, cobertura y vigencia.",
    "ownership": "Impide activar lotes parciales o incompatibles.",
    "offline": "Si no pasa validación se mantiene la versión previa, dentro de su vigencia autorizada.",
    "detail": "Verifica checksum, referencias, monotonicidad, watermark, cantidad, fechas y compatibilidad fuera de la transacción final de activación. La candidata validada permanece identificada e inmutable; no se retiene una transacción durante la descarga.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Operación de caja y evolución",
        "url": "../docs/operacion-caja-y-evolucion.md"
      }
    ],
    "codePaths": [
      "libs/backend/catalog",
      "libs/backend/pricing"
    ]
  },
  "activation": {
    "id": "activation",
    "name": "Activación de versión",
    "type": "Componente",
    "technology": "Transacción SQL / TypeScript",
    "summary": "Cambia atómicamente la versión activa.",
    "ownership": "Commit corto de inbox aplicada, efecto/puntero y cursor aplicado; conserva versiones aún referenciadas.",
    "offline": "Nuevas cotizaciones usan la versión activa autorizada. Las abiertas conservan trazabilidad y se revalidan antes del pago; un pago iniciado o incierto mantiene importe e identidad.",
    "detail": "Recibe una candidata completa e inmutable validada, de snapshot o deltas. Recomprueba precondiciones y cambia el puntero en un commit corto, sin descarga ni validación pesada dentro de SQL. Recibido no significa aplicado.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Operación de caja y evolución",
        "url": "../docs/operacion-caja-y-evolucion.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync",
      "libs/backend/catalog",
      "libs/backend/pricing"
    ]
  },
  "device": {
    "id": "device",
    "name": "device-agent",
    "type": "Contenedor",
    "technology": "C# / .NET · Windows",
    "summary": "F02: ejecuta periféricos del puesto Windows.",
    "ownership": "F02: agente dedicado al puesto y sus dispositivos; branch-api autoriza sólo trabajos del puesto asignado. F06 amplía a una estación compartida homologada con un único controlador por dispositivo físico.",
    "offline": "Sin LAN no obtiene trabajos nuevos. Conserva evidencia del trabajo en curso para reanudar su reporte; un resultado incierto no autoriza repetir el efecto.",
    "detail": "apps/device-agent implementa el host .NET 10/SQLite y protocolo durable en revisión F02; el driver físico está no disponible. El perfil inicial es el mismo puesto Windows que pos-desktop, con proceso independiente y HTTPS saliente hacia branch-api. Conserva recepción, intento y evidencia; consume un permiso de ejecución de un uso antes del efecto y no repite un trabajo al restaurar SQLite. La interoperabilidad real no homologa instalación, SDK ni hardware. F05 valida el perfil dedicado. F06 incorpora impresoras de recibos y etiquetas en red y una estación compartida certificada, con la misma aplicación y contratos de propiedad; no habilita automáticamente MICR, cajón, pagos ni acceso móvil a cualquier caja. El servidor de sucursal no aloja el agente por defecto. Spool aceptado no acredita impresión física.",
    "sources": [
      {
        "label": "Agente autónomo de dispositivos",
        "url": "../docs/decisions/device-agent.md"
      },
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      },
      {
        "label": "F06: periféricos de red y estación compartida",
        "url": "../docs/decisions/device-agent.md#network-expansion"
      }
    ],
    "appId": "device-agent",
    "projectPath": "apps/device-agent",
    "appState": "Host y protocolo en revisión F02; driver físico pendiente",
    "inReviewedWorkspace": true
  },
  "backup": {
    "id": "backup",
    "name": "Respaldo y recuperación",
    "type": "Infraestructura",
    "technology": "Backups PostgreSQL / herramienta por definir",
    "summary": "Conserva y ensaya restauraciones.",
    "ownership": "Operaciones define retención, RPO/RTO y reconstrucción de evidencia.",
    "offline": "No es un segundo escritor activo ni garantiza continuidad inmediata.",
    "detail": "Backups externos a la instancia, pruebas de restore y exclusión del escritor anterior. Una réplica no sustituye un backup; alta disponibilidad requiere diseño y ensayos separados.",
    "sources": [
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      },
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      }
    ]
  },
  "legend": {
    "id": "legend",
    "name": "Leyenda",
    "type": "Clave de lectura",
    "technology": "Notación C4",
    "summary": "Azul: POS. Violeta: datos. Gris: externo.",
    "ownership": "Borde discontinuo: sistema, proceso o nodo según título. Opcional/por asignar se indica expresamente.",
    "offline": "Flecha: iniciador, propósito y protocolo. Respuesta por el mismo contrato.",
    "detail": "Persona: rol. Contenedor: aplicación o almacén. Componente: módulo de un proceso. Las apps usan su nombre de monorepo. Redis de trabajos país y ERP son obligatorios para BullMQ; sólo la caché de país y la telemetría externa son condicionales; publicación y extracción son responsabilidades internas de las aplicaciones indicadas.",
    "sources": [
      {
        "label": "Guía de estas vistas C4",
        "url": "../docs/c4-arquitectura-propuesta.md"
      }
    ]
  },
  "countryCache": {
    "id": "countryCache",
    "name": "Redis · caché de país (opcional)",
    "type": "Contenedor de datos",
    "technology": "Redis · datos reconstruibles",
    "summary": "Acelera consultas; no confirma operaciones.",
    "ownership": "Country-api lee y escribe entradas identificadas por país, entidad y versión. PostgreSQL conserva la autoridad y el estado durable.",
    "offline": "Un miss, expiración o caída permite consultar PostgreSQL con límites de carga y espera. La ausencia de caché no es condición del commit; la capacidad del origen sigue siendo necesaria.",
    "detail": "Ampliación opcional sujeta a medición, capacidad y operación. La API comprueba identidad, ámbito y autorización antes de leer. Las claves incluyen país, entidad legal, versión y alcance de permisos cuando afecte al resultado; un prefijo no sustituye autorización. TTL y vigencia comercial son independientes. El fallback limita concurrencia, esperas y llenados para proteger PostgreSQL. No es la inbox, outbox, base de ventas ni único registro de permisos, dinero o trabajos; se despliega en una instancia separada de Redis de trabajos y no implica Redis en cada sucursal. Las versiones inmutables evitan mezclar publicaciones y PostgreSQL resuelve la versión autorizada.",
    "conditional": true,
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ]
  },
  "observability": {
    "id": "observability",
    "name": "Observabilidad operativa (opcional)",
    "type": "Sistema externo",
    "technology": "Recolector de logs / Sentry opt-in",
    "summary": "Recibe diagnóstico y correlación técnica.",
    "ownership": "Operación administra acceso, retención y datos permitidos. La auditoría de negocio permanece en PostgreSQL.",
    "offline": "La indisponibilidad de telemetría no confirma ni revierte operaciones; buffers y descarte tienen límites.",
    "detail": "Pino produce logs estructurados y correlacionados en los procesos. Un destino de recolección y Sentry sólo se habilitan con configuración aprobada y datos sensibles filtrados. La telemetría ayuda a diagnosticar; no reemplaza auditoría transaccional, inbox/outbox, backups ni conciliación financiera.",
    "conditional": true,
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ]
  },
  "reporting": {
    "id": "reporting",
    "name": "Reportes operativos",
    "type": "Componente",
    "technology": "libs/backend/reporting",
    "summary": "Consulta operaciones y estados locales.",
    "ownership": "Sólo lectura/proyecciones autorizadas; no corrige dinero desde un reporte.",
    "offline": "Los reportes locales reflejan la información disponible y su estado de sincronización.",
    "detail": "Consultas de ventas, turnos, pagos y pendientes respetan ámbito y permisos. Una proyección consultable no constituye otra autoridad para editar la operación.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/reporting"
    ]
  },
  "technicalBase": {
    "id": "technicalBase",
    "name": "Base técnica compartida",
    "type": "Componente",
    "technology": "shared/backend · composición objetivo",
    "summary": "Configuración, salud, Pino y Sentry opt-in.",
    "ownership": "Mecanismos de proceso: configuración validada, errores y correlación. No contiene reglas monetarias ni auditoría de negocio.",
    "offline": "Falla cerrada ante configuración inválida. La ausencia de telemetría no altera el resultado de negocio.",
    "detail": "Composición de bootstrap, config, http/worker, health y observability. Pino registra diagnóstico estructurado; Sentry es opt-in y requiere filtrado. El objetivo organizacional es libs/shared/backend; la evidencia del producto identifica la base actualmente implementada. No se presume un proyecto Nx por subcarpeta.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/shared/backend"
    ]
  },
  "countryEntry": {
    "id": "countryEntry",
    "name": "Entrada y autorización",
    "type": "Componente",
    "technology": "administration + sync · NestJS",
    "summary": "Valida emisor, ámbito y contrato HTTP.",
    "ownership": "Autentica sucursal o worker; propaga identidad y límites de país/entidad.",
    "offline": "Rechaza contratos o capacidades no autorizadas; no confunde recepción con aplicación.",
    "detail": "Controllers y guards de country-api validan identidad, país, entidad, sucursal y versión de contrato. Componen administration y sync; un token no habilita acceso a otros países ni a SQL.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "apps/country-api",
      "libs/backend/administration",
      "libs/backend/sync"
    ]
  },
  "countryInbox": {
    "id": "countryInbox",
    "name": "Recepción de operaciones",
    "type": "Componente",
    "technology": "libs/backend/sync",
    "summary": "Deduplica y aplica el efecto local pactado.",
    "ownership": "Inbox, proyección operativa y outbox se confirman juntos antes del ACK.",
    "offline": "Un duplicado equivalente conserva resultado; igual ID con otro contenido es conflicto.",
    "detail": "Verifica orden, identidad y contrato; usa restricciones y una transacción para confirmar inbox, efecto/proyección local y outbox. El ACK certifica ese commit, no contabilización ERP, liquidación de pago ni aceptación fiscal.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync"
    ]
  },
  "countryJobs": {
    "id": "countryJobs",
    "name": "Trabajo y resultados ERP",
    "type": "Componente",
    "technology": "sync + erp · contratos públicos propuestos",
    "summary": "Asigna trabajo y registra su resultado.",
    "ownership": "Country-api conserva intentos, lease, destino, versión y referencias durables.",
    "offline": "Lease vencido no demuestra que una llamada externa se haya detenido; resultado incierto exige consulta/conciliación.",
    "detail": "Composición objetivo con contratos y casos de uso públicos de sync y erp: atiende solicitudes HTTPS salientes de erp-worker, reclama trabajo mediante transiciones condicionales y un lease limitado, preservando destino y versión. Registra resultados e incertidumbre con la identidad original. La ACL y los adaptadores de proveedor se ejecutan sólo en erp-worker; esta vista no afirma que estos imports estén implementados en la base actual.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync",
      "libs/backend/erp"
    ]
  },
  "countryPublications": {
    "id": "countryPublications",
    "name": "Publicaciones y consultas",
    "type": "Componente",
    "technology": "catalog + pricing + reporting",
    "summary": "Sirve versiones y estado operativo.",
    "ownership": "Lee publicaciones completas y autorizadas; la extracción y preparación pesada se ejecutan en erp-worker.",
    "offline": "Sólo sirve versiones compatibles y vigentes; una caché no cambia su autoridad.",
    "detail": "Expone manifiestos, deltas, chunks y consultas de estado por ámbito. PostgreSQL identifica la versión autorizada y su watermark. Catalog/pricing/reporting conservan sus contratos; country-api no construye cargas masivas dentro de la solicitud HTTP.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/catalog",
      "libs/backend/pricing",
      "libs/backend/reporting"
    ]
  },
  "countryCachePort": {
    "id": "countryCachePort",
    "name": "Puerto de caché opcional",
    "type": "Componente",
    "technology": "Adaptador TypeScript / cache-aside",
    "summary": "Acelera lecturas reconstruibles.",
    "ownership": "Claves por país, entidad y versión; PostgreSQL conserva la verdad durable.",
    "offline": "Miss, expiración o fallo permite leer PostgreSQL con carga y espera limitadas; la caché no es condición del commit.",
    "detail": "Consulta Redis sólo cuando está habilitado y después de comprobar autorización, país, entidad y alcance de permisos. Comprueba versión y vigencia; TTL controla retención/frescura técnica, no autoriza una versión comercial vencida. Reconstruye entradas desde PostgreSQL con límites de concurrencia, espera y llenados para evitar saturar el origen. Una clave o prefijo no es una frontera de seguridad. No contiene leases, outbox ni resultados financieros únicos.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/catalog",
      "libs/backend/pricing",
      "libs/backend/reporting"
    ]
  },
  "countryUow": {
    "id": "countryUow",
    "name": "Persistencia de país",
    "type": "Componente",
    "technology": "Repositorios TypeScript / SQL",
    "summary": "Confirma estado y trabajo en PostgreSQL.",
    "ownership": "Transacciones y restricciones por país/entidad; no otro escritor libre de ventas de sucursal.",
    "offline": "Un commit fallido no produce ACK de aplicación ni resultado definitivo.",
    "detail": "Composición objetivo de persistencia para sync y los contratos públicos de erp: coordina inbox, proyección y outbox; conserva trabajo ERP, leases, intentos y resultados mediante transiciones condicionales. Las respuestas HTTP y la caché no reemplazan el registro durable. La llamada ERP y sus adaptadores quedan fuera de esta transacción y del proceso country-api.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/sync",
      "libs/backend/erp"
    ]
  },
  "erpExecution": {
    "id": "erpExecution",
    "name": "Admisión y ejecución ERP",
    "type": "Componente",
    "technology": "libs/backend/erp + worker",
    "summary": "Revalida trabajo e intento antes de actuar.",
    "ownership": "Respeta lease, identidad, destino y versión fijados al crear el intento.",
    "offline": "Backoff y ventanas limitan reintentos; lease expirado no autoriza duplicar un efecto incierto.",
    "detail": "El consumidor BullMQ solicita o renueva el claim por HTTPS cuando dispone de capacidad de ejecución; no retiene leases de negocio en una cola larga. Aplica límites por contrato y destino, preserva identidad y versión, y no ejecuta fuera del lease autorizado. Un job reentregado consulta el estado durable y la evidencia antes de actuar; no repite un efecto financiero incierto.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      },
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      }
    ],
    "codePaths": [
      "apps/erp-worker",
      "libs/backend/erp",
      "libs/shared/backend"
    ]
  },
  "erpClient": {
    "id": "erpClient",
    "name": "Cliente de country-api",
    "type": "Componente",
    "technology": "HTTPS autenticado · contrato POS",
    "summary": "Reclama trabajo y registra resultados.",
    "ownership": "Inicia conexiones salientes; no abre SQL remoto ni una API entrante obligatoria.",
    "offline": "Reconecta con la misma identidad; un reporte sin acuse se reentrega o consulta.",
    "detail": "Solicita trabajo, renueva leases cuando el contrato lo permite, obtiene estado y reporta resultados a country-api. Un resultado no confirmado permanece incierto hasta consultar o reconciliar; no fabrica otra operación.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/erp"
    ]
  },
  "erpFacade": {
    "id": "erpFacade",
    "name": "Fachada de integración POS",
    "type": "Componente",
    "technology": "libs/backend/erp · TypeScript",
    "summary": "Expone casos de uso con lenguaje POS.",
    "ownership": "Contrato canónico desacoplado de tablas, identificadores y SDK del ERP.",
    "offline": "Declara capacidades y resultados permitidos por integración; no promete equivalencias inexistentes.",
    "detail": "Recibe la operación y el contexto persistidos. Encapsula emisión, consulta y conciliación bajo contratos del POS; delega traducción y protocolo sin compartir detalles del ERP con ventas o caja.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/erp"
    ]
  },
  "erpAcl": {
    "id": "erpAcl",
    "name": "ACL por país y contrato",
    "type": "Componente",
    "technology": "libs/backend/erp · TypeScript",
    "summary": "Traduce identidades, estados e importes.",
    "ownership": "Mapeos versionados, destino fijo y referencias de correlación; no reglas monetarias inventadas.",
    "offline": "Una traducción incompatible se rechaza con evidencia; no cambia silenciosamente de país ni ERP.",
    "detail": "Traduce modelos POS a modelos ERP y viceversa: identificadores, documentos, moneda, unidades, impuestos, estados y errores. AX, custom y Gira requieren contratos propios; compartir fachada no vuelve intercambiables sus capacidades.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/erp"
    ]
  },
  "erpProtocol": {
    "id": "erpProtocol",
    "name": "Adaptadores AX / custom / Gira",
    "type": "Componente",
    "technology": "Protocolo de cada ERP por homologar",
    "summary": "Ejecuta envío y consulta autorizados.",
    "ownership": "Usa el destino y las credenciales del entorno autorizado; registra referencias técnicas.",
    "offline": "Timeout o respuesta perdida no equivale a rechazo; consulta cuando la capacidad exista.",
    "detail": "Chile usa AX on-premise; no se presupone API Dynamics 365. Perú custom y España Gira tienen interfaces por relevar. REST, WCF, SDK o acceso permitido se encapsulan según evidencia; no se habilita SQL directo desde sucursales o clientes.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/erp"
    ]
  },
  "erpRecovery": {
    "id": "erpRecovery",
    "name": "Resultado y conciliación",
    "type": "Componente",
    "technology": "libs/backend/erp · TypeScript",
    "summary": "Distingue éxito, rechazo e incertidumbre.",
    "ownership": "Preserva intento y referencia del ERP al registrar el resultado en país.",
    "offline": "No repite automáticamente un efecto financiero de resultado desconocido.",
    "detail": "Clasifica respuestas y errores. Si el resultado es incierto, mantiene identidad y consulta/conciliación según capacidad homologada; una intervención operativa conserva evidencia. Entrega el resultado al cliente de country-api para persistirlo.",
    "sources": [
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "codePaths": [
      "libs/backend/erp"
    ]
  },
  "erpMasterSource": {
    "id": "erpMasterSource",
    "name": "Extracción de maestros",
    "type": "Componente",
    "technology": "MasterDataSourcePort · TypeScript",
    "summary": "Prepara cargas en la red del origen.",
    "ownership": "erp-worker compone un adaptador de fuente con identidad, claims y presupuesto aislados de las operaciones financieras.",
    "offline": "Sin origen homologado, claim válido o corte íntegro no finaliza la publicación. Reintenta porciones identificadas sin SQL WAN.",
    "detail": "Obtiene snapshot o deltas con corte consistente desde la fuente autorizada del país, prepara porciones y solicita claim, upload y finalize a country-api mediante el cliente HTTPS. La autoridad de publicación permanece en país. Acceso de red y capacidades de la fuente deben homologarse.",
    "codePaths": [
      "libs/backend/erp",
      "libs/backend/catalog",
      "libs/backend/pricing",
      "libs/backend/sync"
    ],
    "sources": [
      {
        "label": "Contrato de publicación de maestros",
        "url": "../docs/contracts/master-data-publication.md"
      },
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
      }
    ]
  },
  "deviceJournal": {
    "id": "deviceJournal",
    "name": "Journal técnico de dispositivos",
    "type": "Contenedor de datos",
    "technology": "SQLite",
    "summary": "Guarda trabajos, deduplicación y evidencia.",
    "ownership": "Privado de device-agent en el puesto Windows inicial. No contiene ventas, caja, precios ni autoridad financiera.",
    "offline": "Conserva jobId, hash y estados técnicos durante cortes de LAN; al reconectar reporta con la misma identidad.",
    "detail": "F02/F05: diario técnico local del puesto; F06: diario propio de cada instancia certificada, nunca una SQLite compartida por red. Persistencia técnica propuesta. Registra recepción durable, identidad de agente y equipo, hash del contenido, intento y evidencia del driver/spooler. Mismo jobId con distinto hash es conflicto. Guarda evidencia antes de reportarla; no interpreta spool accepted como impresión física. Restore o pérdida del journal exige reconciliar antes de repetir efectos; un lease vencido no prueba que el hardware no actuó.",
    "sources": [
      {
        "label": "Agente autónomo de dispositivos",
        "url": "../docs/decisions/device-agent.md"
      }
    ]
  },
  "peripherals": {
    "id": "peripherals",
    "name": "Periféricos del puesto",
    "type": "Hardware externo",
    "technology": "USB / serie · driver / SDK",
    "summary": "F02: impresoras y lectores locales del puesto.",
    "ownership": "Un único device-agent autorizado opera cada equipo físico. La aplicación solicita capacidades a branch-api.",
    "offline": "La capacidad depende del equipo, driver y estado físico. Un timeout puede dejar resultado incierto.",
    "detail": "Perfil inicial F02 y piloto F05: impresora de recibos, etiquetas o lector MICR conectado al puesto Windows mediante USB/serie y driver o SDK homologado. No se ofrece a otros puestos o móviles por defecto. La impresión conserva referencia de documento y trabajo; el spooler sólo informa recepción técnica. La reimpresión requiere autorización explícita. Compartir dispositivos por red es una expansión F06 con homologación por modelo; cajón, MICR y terminales de pago no heredan esa capacidad.",
    "sources": [
      {
        "label": "Agente autónomo de dispositivos",
        "url": "../docs/decisions/device-agent.md"
      }
    ]
  },
  "networkPeripherals": {
    "id": "networkPeripherals",
    "name": "Periféricos de red · F06",
    "type": "Hardware externo",
    "technology": "TCP/IP · driver / SDK homologado",
    "summary": "Expansión: impresoras de recibos y etiquetas.",
    "conditional": true,
    "ownership": "Un controlador activo por dispositivo físico, asignado a una instancia certificada de la misma apps/device-agent. No es otra aplicación del monorepo.",
    "offline": "Sin LAN no se aceptan trabajos nuevos. Cortes, reconexión o cambio de controlador no autorizan repetir un efecto incierto.",
    "detail": "Expansión F06 posterior al piloto F05 del puesto dedicado. Homologar impresoras de recibos y etiquetas accesibles por red y, cuando se requiera, una estación compartida Windows que ejecute la misma apps/device-agent. La línea discontinua representa una capacidad futura; no instala otro agente en el servidor por defecto. Mantener protocolo HTTPS con branch-api, propiedad exclusiva, configuración, diagnóstico, journal local y control de concurrencia. Homologar el acceso de móviles por permisos y destino explícitos. MICR, cajón y pagos requieren evaluación propia; una impresora de red no los habilita.",
    "sources": [
      {
        "label": "F06: periféricos de red y estación compartida",
        "url": "../docs/decisions/device-agent.md#network-expansion"
      }
    ]
  },
  "countryJobStore": {
    "id": "countryJobStore",
    "name": "Redis · trabajos de país",
    "type": "Contenedor de datos",
    "technology": "Redis dedicado · BullMQ",
    "summary": "Colas y programación de country-api.",
    "ownership": "Instancia exclusiva del dominio país; separada del Redis de caché. PostgreSQL conserva calendario, solicitudes, outbox y resultados de negocio.",
    "offline": "Si falla, se detiene la programación y ejecución de jobs del país. Los pendientes durables se conservan en PostgreSQL; no revierte ventas confirmadas ni habilita ACK sin commit.",
    "detail": "Dependencia obligatoria de la arquitectura elegida, aún no implementada. Red privada, autenticación y TLS según despliegue; sin conexión desde sucursales ni desde la red ERP. Persistencia Redis y política noeviction para proteger jobs, capacidad y retención acotadas. El relay encola después del commit PostgreSQL y la reconciliación reconstruye pendientes por identidad estable. Perder Redis no autoriza repetir efectos; BullMQ no ofrece exactamente una vez sobre sistemas externos.",
    "sources": [
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ]
  },
  "erpJobStore": {
    "id": "erpJobStore",
    "name": "Redis · trabajos de ERP",
    "type": "Contenedor de datos",
    "technology": "Redis dedicado · BullMQ",
    "summary": "Colas técnicas dentro de la red ERP.",
    "ownership": "Instancia exclusiva de erp-worker en la red autorizada del ERP. No comparte Redis con país ni con su caché; el estado de negocio reside en PostgreSQL de país.",
    "offline": "Sin Redis local se detiene la admisión de jobs ERP. Al recuperar, consulta por HTTPS trabajo, intentos y resultados durables antes de reconstruir pendientes.",
    "detail": "Dependencia obligatoria de la arquitectura elegida, aún no implementada. BullMQ almacena colas, retrasos y metadatos técnicos en esta instancia con noeviction y persistencia operada. Límites separados para preparación masiva y operaciones/consultas de conciliación. La recuperación usa country-api por HTTPS; no abre Redis ni PostgreSQL a través de WAN. El job técnico no sustituye el lease de negocio ni el resultado ERP y nunca habilita reenviar ciegamente una operación incierta.",
    "sources": [
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ]
  },
  "countryQueue": {
    "id": "countryQueue",
    "name": "Programación de trabajos",
    "type": "Componente",
    "technology": "BullMQ · librería Node.js",
    "summary": "Programa disparos y solicitudes breves.",
    "ownership": "Componente interno de country-api; ejecuta fuera de HTTP. PostgreSQL gobierna calendario, ámbito, solicitud e identidad estable; el trabajo pesado pertenece a erp-worker.",
    "offline": "El relay reintenta después del commit. Tras pérdida de Redis, reconstruye programaciones y pendientes desde PostgreSQL sin crear otra solicitud equivalente.",
    "detail": "Librería elegida para country-api, no una octava aplicación. Usa Redis de trabajos de país para scheduling, reintentos y concurrencia técnica. Configuración IANA, ventanas y checkpoints de ejecuciones esperadas permanecen en PostgreSQL; un scheduler por sí solo no prueba que una ventana se haya ejecutado. El consumidor realiza tareas breves y registra solicitudes durables para ERP. Relay y reconciliación cubren el hueco entre commit y encolado; handlers idempotentes validan identidad, versión y ámbito. Implementación pendiente.",
    "codePaths": [
      "apps/country-api",
      "libs/backend/sync",
      "libs/backend/catalog",
      "libs/backend/pricing"
    ],
    "sources": [
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      },
      {
        "label": "Contrato de publicación de maestros",
        "url": "../docs/contracts/master-data-publication.md"
      }
    ]
  },
  "erpQueue": {
    "id": "erpQueue",
    "name": "Ejecución de trabajos técnicos",
    "type": "Componente",
    "technology": "BullMQ · librería Node.js",
    "summary": "Distribuye ejecución y consultas seguras.",
    "ownership": "Componente interno de erp-worker. Separa concurrencia y presupuesto de preparación masiva y tareas financieras; Redis está dentro de la red ERP.",
    "offline": "Sin país no obtiene autorización nueva. Una reentrega o un job stalled conserva identidad y exige consultar el estado antes de repetir efectos externos.",
    "detail": "Librería elegida, aún no implementada. Programa extracción/preparación de maestros, consultas de conciliación y tareas técnicas con backoff, jitter, límites de intentos y cierre controlado. El consumidor reclama el trabajo durable al iniciar la ejecución; el lock BullMQ y el lease de negocio cumplen funciones distintas. Reconciliación por HTTPS reconstruye jobs desde solicitudes/resultados de país. La deduplicación por jobId reduce reentregas técnicas, pero las restricciones de negocio y las capacidades homologadas del ERP resuelven efectos inciertos.",
    "codePaths": [
      "apps/erp-worker",
      "libs/backend/erp"
    ],
    "sources": [
      {
        "label": "ADR-18 · Procesamiento de trabajos con BullMQ",
        "url": "../docs/decisions/job-processing.md"
      },
      {
        "label": "Integridad, recuperación y casos adversos",
        "url": "../docs/revision-resiliencia-datos-pos.md"
      }
    ]
  }
};
  const views = [
  {
    "id": "context",
    "key": "c4-context",
    "level": "C1 · Contexto",
    "title": "El POS y su entorno",
    "scope": "Un sistema POS corporativo; personas y sistemas externos. Representación lógica aplicable a cada país.",
    "note": "La integración financiera, el precio autorizado, el pago y la fiscalidad tienen propietarios distintos. Los sistemas externos no se dan por homologados.",
    "nodeIds": [
      "cashier",
      "supervisor",
      "support",
      "pos",
      "erp",
      "masters",
      "payments",
      "fiscal",
      "peripherals",
      "networkPeripherals",
      "legend"
    ],
    "boundaries": [],
    "relationships": [
      {
        "from": "cashier",
        "to": "pos",
        "label": "Opera ventas y turnos · interfaz de caja"
      },
      {
        "from": "supervisor",
        "to": "pos",
        "label": "Autoriza y revisa · interfaz de operación"
      },
      {
        "from": "support",
        "to": "pos",
        "label": "Supervisa y recupera · herramientas autorizadas"
      },
      {
        "from": "masters",
        "to": "pos",
        "label": "Entrega datos y reglas · contrato por confirmar"
      },
      {
        "from": "pos",
        "to": "erp",
        "label": "Integra y concilia documentos · adaptador por país"
      },
      {
        "from": "pos",
        "to": "payments",
        "label": "Solicita pago y consulta resultado · API/SDK por validar"
      },
      {
        "from": "pos",
        "to": "fiscal",
        "label": "Solicita emisión/transmisión · contrato fiscal por validar"
      },
      {
        "from": "pos",
        "to": "peripherals",
        "label": "F02 · operación local · USB/serie/SDK"
      },
      {
        "from": "pos",
        "to": "networkPeripherals",
        "label": "F06 · ejecución en red · protocolo homologado",
        "conditional": true
      }
    ]
  },
  {
    "id": "containers",
    "key": "c4-containers",
    "level": "C2 · Contenedores",
    "title": "Aplicaciones, procesos y datos",
    "scope": "Siete aplicaciones de POS Platform, sus datos y sistemas externos. F02 incorpora el host .NET/SQLite y protocolo durable en revisión; drivers físicos pendientes.",
    "note": "Siete apps con estados distintos: F01 operativo/laboratorio; F02 host y protocolo en revisión, sin hardware habilitado. F05 valida el puesto dedicado. F06: red y estación compartida por homologar. PostgreSQL conserva el negocio. BullMQ y dos Redis de trabajos son obligatorios en el diseño elegido, aún no implementados; caché país opcional separada. Entre redes sólo HTTPS.",
    "nodeIds": [
      "cashier",
      "client",
      "mobileClient",
      "device",
      "deviceJournal",
      "branchApi",
      "branchDb",
      "syncWorker",
      "countryApi",
      "countryDb",
      "countryJobStore",
      "erpJobStore",
      "countryCache",
      "erpAdapter",
      "erp",
      "masters",
      "payments",
      "fiscal",
      "peripherals",
      "networkPeripherals",
      "legend"
    ],
    "boundaries": [
      {
        "id": "systemScope",
        "label": "POS Platform · aplicaciones y datos propuestos",
        "nodes": [
          "client",
          "mobileClient",
          "device",
          "deviceJournal",
          "branchApi",
          "branchDb",
          "syncWorker",
          "countryApi",
          "countryDb",
          "countryCache",
          "erpAdapter",
          "countryJobStore",
          "erpJobStore"
        ]
      }
    ],
    "relationships": [
      {
        "from": "cashier",
        "to": "client",
        "label": "Opera caja · interfaz de escritorio"
      },
      {
        "from": "cashier",
        "to": "mobileClient",
        "label": "Funciones habilitadas · interfaz móvil"
      },
      {
        "from": "client",
        "to": "branchApi",
        "label": "Comandos y consultas · HTTPS/LAN"
      },
      {
        "from": "mobileClient",
        "to": "branchApi",
        "label": "F06 · comandos habilitados · HTTPS/LAN",
        "conditional": true
      },
      {
        "from": "device",
        "to": "branchApi",
        "label": "Obtiene trabajos y reporta evidencia · HTTPS/LAN saliente"
      },
      {
        "from": "device",
        "to": "payments",
        "label": "Pago local futuro · SDK por homologar"
      },
      {
        "from": "branchApi",
        "to": "branchDb",
        "label": "Negocio + auditoría + outbox · PostgreSQL"
      },
      {
        "from": "branchApi",
        "to": "payments",
        "label": "Pago remoto si aplica · API homologada"
      },
      {
        "from": "branchApi",
        "to": "fiscal",
        "label": "Emisión y consulta fiscal · contrato por país"
      },
      {
        "from": "syncWorker",
        "to": "branchDb",
        "label": "Outbox, inbox, cursores y espejo · PostgreSQL"
      },
      {
        "from": "syncWorker",
        "to": "countryApi",
        "label": "Lotes, deltas y acuses · HTTPS"
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Recepción, publicaciones, trabajo y resultados · PostgreSQL"
      },
      {
        "from": "countryApi",
        "to": "countryCache",
        "label": "Lecturas versionadas · Redis opcional"
      },
      {
        "from": "erpAdapter",
        "to": "countryApi",
        "label": "Trabajo, resultados y porciones de maestros · HTTPS saliente"
      },
      {
        "from": "erpAdapter",
        "to": "erp",
        "label": "Envía, consulta y concilia · contrato ERP"
      },
      {
        "from": "erpAdapter",
        "to": "masters",
        "label": "Obtiene carga o deltas · contrato de fuente homologado"
      },
      {
        "from": "device",
        "to": "deviceJournal",
        "label": "Deduplicación y evidencia técnica · SQLite"
      },
      {
        "from": "device",
        "to": "peripherals",
        "label": "F02 · ejecuta en el puesto · USB/serie/SDK"
      },
      {
        "from": "device",
        "to": "networkPeripherals",
        "label": "F06 · ejecución en red · protocolo homologado",
        "conditional": true
      },
      {
        "from": "countryApi",
        "to": "countryJobStore",
        "label": "Programa y procesa jobs breves · BullMQ/Redis privado"
      },
      {
        "from": "erpAdapter",
        "to": "erpJobStore",
        "label": "Ejecuta jobs y consultas · BullMQ/Redis privado"
      }
    ]
  },
  {
    "id": "backend",
    "key": "c4-backend",
    "level": "C3 · branch-api",
    "title": "Negocio de sucursal en un proceso",
    "scope": "apps/branch-api compone módulos de negocio y base técnica. Las bibliotecas agrupadas comparten proceso, sin convertirse en servicios independientes.",
    "note": "sales/returns, cash/collections, pricing/catalog, payments/devices, fiscal, reporting, administration y outbox de sync. devices conserva trabajos autorizados; device-agent los obtiene y reporta evidencia. No depende del cliente de escritorio.",
    "nodeIds": [
      "client",
      "mobileClient",
      "device",
      "entry",
      "access",
      "sales",
      "pricing",
      "cash",
      "payPort",
      "fiscalPort",
      "reporting",
      "unitOfWork",
      "technicalBase",
      "branchDb",
      "payments",
      "fiscal",
      "legend"
    ],
    "boundaries": [
      {
        "id": "backendScope",
        "label": "apps/branch-api · UN proceso NestJS + Fastify",
        "nodes": [
          "entry",
          "access",
          "sales",
          "pricing",
          "cash",
          "payPort",
          "fiscalPort",
          "reporting",
          "unitOfWork",
          "technicalBase"
        ]
      }
    ],
    "relationships": [
      {
        "from": "client",
        "to": "entry",
        "label": "Comandos identificados · HTTPS/LAN"
      },
      {
        "from": "mobileClient",
        "to": "entry",
        "label": "Comandos identificados · HTTPS/LAN"
      },
      {
        "from": "device",
        "to": "entry",
        "label": "Obtiene trabajos y reporta evidencia · HTTPS/LAN saliente"
      },
      {
        "from": "entry",
        "to": "access",
        "label": "Autoriza ámbito y operación · TypeScript"
      },
      {
        "from": "entry",
        "to": "sales",
        "label": "Venta o devolución · TypeScript"
      },
      {
        "from": "entry",
        "to": "cash",
        "label": "Turnos, cobranza o anticipo · TypeScript"
      },
      {
        "from": "entry",
        "to": "reporting",
        "label": "Consulta autorizada · TypeScript"
      },
      {
        "from": "entry",
        "to": "payPort",
        "label": "Autoriza trabajo o registra evidencia · TypeScript"
      },
      {
        "from": "entry",
        "to": "technicalBase",
        "label": "Configura y correlaciona · TypeScript"
      },
      {
        "from": "sales",
        "to": "pricing",
        "label": "Cotiza y fija versión · TypeScript"
      },
      {
        "from": "sales",
        "to": "cash",
        "label": "Comprueba turno · TypeScript"
      },
      {
        "from": "sales",
        "to": "payPort",
        "label": "Intento de pago · TypeScript"
      },
      {
        "from": "sales",
        "to": "fiscalPort",
        "label": "Documento y estado · TypeScript"
      },
      {
        "from": "sales",
        "to": "unitOfWork",
        "label": "Confirma operación + outbox · TypeScript"
      },
      {
        "from": "cash",
        "to": "unitOfWork",
        "label": "Movimiento + auditoría · TypeScript"
      },
      {
        "from": "pricing",
        "to": "unitOfWork",
        "label": "Lee versión autorizada · repositorio"
      },
      {
        "from": "reporting",
        "to": "unitOfWork",
        "label": "Lee estado local · repositorio"
      },
      {
        "from": "payPort",
        "to": "unitOfWork",
        "label": "Intención y resultado separados · TypeScript"
      },
      {
        "from": "fiscalPort",
        "to": "unitOfWork",
        "label": "Referencia y resultado · TypeScript"
      },
      {
        "from": "unitOfWork",
        "to": "branchDb",
        "label": "Negocio + auditoría + outbox · PostgreSQL"
      },
      {
        "from": "payPort",
        "to": "payments",
        "label": "API remota cuando aplique · contrato validado"
      },
      {
        "from": "fiscalPort",
        "to": "fiscal",
        "label": "Emisión/consulta · contrato validado"
      }
    ],
    "containerId": "branchApi"
  },
  {
    "id": "sync",
    "key": "c4-sync",
    "level": "C3 · branch-sync-worker",
    "title": "Entrega durable y activación local",
    "scope": "apps/branch-sync-worker compone sync con las reglas de catálogo/precios. PostgreSQL de sucursal y country-api están fuera del proceso.",
    "note": "Deltas y cargas completas comparten validación. Snapshot + watermark + staging + checksum + activación atómica; las ventas abiertas mantienen su versión.",
    "nodeIds": [
      "schedule",
      "sender",
      "receiver",
      "dedup",
      "snapshot",
      "validation",
      "activation",
      "branchDb",
      "countryApi",
      "legend"
    ],
    "boundaries": [
      {
        "id": "syncScope",
        "label": "apps/branch-sync-worker · UN proceso supervisado",
        "nodes": [
          "schedule",
          "sender",
          "receiver",
          "dedup",
          "snapshot",
          "validation",
          "activation"
        ]
      }
    ],
    "relationships": [
      {
        "from": "schedule",
        "to": "sender",
        "label": "Admite lote / reintento acotado · TypeScript"
      },
      {
        "from": "sender",
        "to": "branchDb",
        "label": "Claim y lectura de outbox · PostgreSQL"
      },
      {
        "from": "sender",
        "to": "countryApi",
        "label": "Envía lote con eventId/contrato · HTTPS"
      },
      {
        "from": "schedule",
        "to": "receiver",
        "label": "Programa consulta incremental · TypeScript"
      },
      {
        "from": "receiver",
        "to": "countryApi",
        "label": "Consulta acuses y deltas con cursor · HTTPS"
      },
      {
        "from": "receiver",
        "to": "dedup",
        "label": "Entrega unidad validada · TypeScript"
      },
      {
        "from": "dedup",
        "to": "branchDb",
        "label": "Guarda recibido/staging; no avanza aplicado · PostgreSQL"
      },
      {
        "from": "schedule",
        "to": "snapshot",
        "label": "Carga programada o recuperación manual · TypeScript"
      },
      {
        "from": "snapshot",
        "to": "countryApi",
        "label": "Descarga manifiesto/chunks y watermark · HTTPS"
      },
      {
        "from": "snapshot",
        "to": "branchDb",
        "label": "Guarda staging aislado · PostgreSQL"
      },
      {
        "from": "snapshot",
        "to": "validation",
        "label": "Solicita validación de versión completa · TypeScript"
      },
      {
        "from": "validation",
        "to": "branchDb",
        "label": "Verifica checksum, referencias y vigencia · PostgreSQL"
      },
      {
        "from": "validation",
        "to": "activation",
        "label": "Autoriza versión y watermark válidos · TypeScript"
      },
      {
        "from": "dedup",
        "to": "validation",
        "label": "Entrega candidata completa desde deltas · TypeScript"
      },
      {
        "from": "activation",
        "to": "branchDb",
        "label": "Activa versión + inbox aplicada + cursor aplicado · PostgreSQL"
      }
    ],
    "containerId": "syncWorker"
  },
  {
    "id": "deployment",
    "key": "c4-deployment",
    "level": "Complemento · Despliegue",
    "title": "Sucursal, país y red autorizada del ERP",
    "scope": "F02/F05: pos-desktop, device-agent, journal SQLite y hardware local comparten el puesto Windows. Backend y PostgreSQL viven en el servidor de sucursal. Red, estación compartida y acceso móvil a periféricos son expansión F06.",
    "note": "Siete apps con estados distintos: F01 operativo/laboratorio; F02 host y protocolo en revisión, sin hardware habilitado. F05 valida el puesto dedicado. F06: red y estación compartida por homologar. PostgreSQL conserva el negocio. BullMQ y dos Redis de trabajos son obligatorios en el diseño elegido, aún no implementados; caché país opcional separada. Entre redes sólo HTTPS.",
    "nodeIds": [
      "client",
      "mobileClient",
      "device",
      "deviceJournal",
      "branchApi",
      "branchDb",
      "syncWorker",
      "countryApi",
      "countryDb",
      "countryJobStore",
      "erpJobStore",
      "countryCache",
      "erpAdapter",
      "erp",
      "payments",
      "fiscal",
      "backup",
      "observability",
      "masters",
      "peripherals",
      "networkPeripherals",
      "legend"
    ],
    "boundaries": [
      {
        "id": "terminalNode",
        "label": "Puesto Windows x N · perfil dedicado F02 / piloto F05",
        "nodes": [
          "client",
          "device",
          "deviceJournal",
          "peripherals"
        ]
      },
      {
        "id": "mobileNode",
        "label": "F06 · dispositivos móviles · Android/iOS por homologar",
        "nodes": [
          "mobileClient"
        ]
      },
      {
        "id": "serverNode",
        "label": "Servidor de sucursal · entorno por homologar",
        "nodes": [
          "branchApi",
          "syncWorker",
          "branchDb"
        ]
      },
      {
        "id": "countryNode",
        "label": "Plataforma de país · alojamiento por decidir",
        "nodes": [
          "countryApi",
          "countryDb",
          "countryCache",
          "countryJobStore"
        ]
      },
      {
        "id": "erpNode",
        "label": "Red autorizada del ERP · entorno por país",
        "nodes": [
          "erpAdapter",
          "erp",
          "erpJobStore"
        ]
      }
    ],
    "relationships": [
      {
        "from": "client",
        "to": "branchApi",
        "label": "Comandos autenticados · HTTPS/LAN"
      },
      {
        "from": "mobileClient",
        "to": "branchApi",
        "label": "F06 · comandos habilitados · HTTPS/LAN",
        "conditional": true
      },
      {
        "from": "device",
        "to": "branchApi",
        "label": "Obtiene trabajos y reporta evidencia · HTTPS/LAN saliente"
      },
      {
        "from": "branchApi",
        "to": "branchDb",
        "label": "Negocio + auditoría + outbox · PostgreSQL"
      },
      {
        "from": "syncWorker",
        "to": "branchDb",
        "label": "Outbox, inbox, cursores y espejo · PostgreSQL"
      },
      {
        "from": "syncWorker",
        "to": "countryApi",
        "label": "Lotes y publicaciones · HTTPS/WAN"
      },
      {
        "from": "countryApi",
        "to": "countryDb",
        "label": "Recepción, publicaciones, trabajo y resultados · PostgreSQL"
      },
      {
        "from": "countryApi",
        "to": "countryCache",
        "label": "Consultas reconstruibles · Redis opcional"
      },
      {
        "from": "erpAdapter",
        "to": "countryApi",
        "label": "Trabajo, resultados y porciones de maestros · HTTPS saliente"
      },
      {
        "from": "erpAdapter",
        "to": "erp",
        "label": "Envío y consulta · interfaz homologada"
      },
      {
        "from": "device",
        "to": "payments",
        "label": "Pago local futuro · SDK por homologar"
      },
      {
        "from": "branchApi",
        "to": "fiscal",
        "label": "Emisión/transmisión · contrato fiscal"
      },
      {
        "from": "branchDb",
        "to": "backup",
        "label": "Respaldo y restore · mecanismo por definir"
      },
      {
        "from": "countryDb",
        "to": "backup",
        "label": "Respaldo aislado por país · mecanismo por definir"
      },
      {
        "from": "branchApi",
        "to": "observability",
        "label": "Logs correlacionados / errores opt-in · canal aprobado"
      },
      {
        "from": "countryApi",
        "to": "observability",
        "label": "Logs correlacionados / errores opt-in · canal aprobado"
      },
      {
        "from": "erpAdapter",
        "to": "observability",
        "label": "Intentos técnicos / errores opt-in · canal aprobado"
      },
      {
        "from": "erpAdapter",
        "to": "masters",
        "label": "Obtiene carga o deltas · contrato de fuente homologado"
      },
      {
        "from": "device",
        "to": "deviceJournal",
        "label": "Deduplicación y evidencia técnica · SQLite"
      },
      {
        "from": "device",
        "to": "peripherals",
        "label": "F02 · ejecuta en el puesto · USB/serie/SDK"
      },
      {
        "from": "device",
        "to": "networkPeripherals",
        "label": "F06 · ejecución en red · protocolo homologado",
        "conditional": true
      },
      {
        "from": "countryApi",
        "to": "countryJobStore",
        "label": "Programa y procesa jobs breves · BullMQ/Redis privado"
      },
      {
        "from": "erpAdapter",
        "to": "erpJobStore",
        "label": "Ejecuta jobs y consultas · BullMQ/Redis privado"
      }
    ]
  },
  {
    "id": "country",
    "key": "c4-country",
    "level": "C3 · country-api",
    "title": "Recepción, trabajo y consultas de país",
    "containerId": "countryApi",
    "scope": "Un proceso apps/country-api: HTTP y consumidores BullMQ internos para disparos y solicitudes breves. PostgreSQL conserva trabajo y publicaciones; la ACL y preparación pesada se ejecutan en erp-worker.",
    "note": "ACK tras commit de inbox + efecto + outbox. Relay y reconciliación encolan o reconstruyen jobs BullMQ. Redis de trabajos es obligatorio; Redis caché es opcional y separado. Implementación pendiente.",
    "nodeIds": [
      "syncWorker",
      "erpAdapter",
      "countryEntry",
      "countryInbox",
      "countryJobs",
      "countryPublications",
      "countryWorker",
      "countryCachePort",
      "countryUow",
      "technicalBase",
      "countryDb",
      "countryCache",
      "legend",
      "countryQueue",
      "countryJobStore"
    ],
    "boundaries": [
      {
        "id": "countryScope",
        "label": "apps/country-api · UN proceso NestJS + Fastify + BullMQ",
        "nodes": [
          "countryEntry",
          "countryInbox",
          "countryJobs",
          "countryPublications",
          "countryWorker",
          "countryCachePort",
          "countryUow",
          "technicalBase",
          "countryQueue"
        ]
      }
    ],
    "relationships": [
      {
        "from": "syncWorker",
        "to": "countryEntry",
        "label": "Lotes, acuses y publicaciones · HTTPS"
      },
      {
        "from": "erpAdapter",
        "to": "countryEntry",
        "label": "Claim, consulta y resultado · HTTPS saliente"
      },
      {
        "from": "countryEntry",
        "to": "countryInbox",
        "label": "Recibe evento identificado · TypeScript"
      },
      {
        "from": "countryEntry",
        "to": "countryJobs",
        "label": "Asigna trabajo / recibe resultado · TypeScript"
      },
      {
        "from": "countryEntry",
        "to": "countryPublications",
        "label": "Consulta versión y estado · TypeScript"
      },
      {
        "from": "countryEntry",
        "to": "technicalBase",
        "label": "Configura, limita y correlaciona · TypeScript"
      },
      {
        "from": "countryInbox",
        "to": "countryUow",
        "label": "Inbox + efecto + outbox · una transacción"
      },
      {
        "from": "countryJobs",
        "to": "countryUow",
        "label": "Lease, intento y resultado · transiciones condicionales"
      },
      {
        "from": "countryPublications",
        "to": "countryCachePort",
        "label": "Lee por ámbito y versión · TypeScript"
      },
      {
        "from": "countryCachePort",
        "to": "countryCache",
        "label": "Cache-aside · Redis opcional"
      },
      {
        "from": "countryCachePort",
        "to": "countryUow",
        "label": "Miss o fallo: lectura durable · TypeScript"
      },
      {
        "from": "countryUow",
        "to": "countryDb",
        "label": "Persistencia y lectura autorizada · PostgreSQL"
      },
      {
        "from": "countryEntry",
        "to": "countryWorker",
        "label": "Claim, porciones y finalización · TypeScript"
      },
      {
        "from": "countryWorker",
        "to": "countryUow",
        "label": "Versión, manifiesto y evento · una transacción"
      },
      {
        "from": "countryQueue",
        "to": "countryJobStore",
        "label": "Programa y consume jobs · Redis privado"
      },
      {
        "from": "countryQueue",
        "to": "countryUow",
        "label": "Lee calendario/outbox y confirma solicitud · TypeScript"
      },
      {
        "from": "countryQueue",
        "to": "countryWorker",
        "label": "Dispara publicación fuera de HTTP · TypeScript"
      }
    ]
  },
  {
    "id": "erp",
    "key": "c4-erp",
    "level": "C3 · erp-worker",
    "title": "Contrato POS, ACL y recuperación ERP",
    "containerId": "erpAdapter",
    "scope": "Un proceso apps/erp-worker con BullMQ y Redis de trabajos en la red autorizada del ERP. Fachada, ACL, protocolo y preparación son componentes internos; trabajo durable y resultados se consultan por HTTPS en país.",
    "note": "BullMQ y Redis de trabajos elegidos, aún no implementados. Un job no reemplaza el lease ni el resultado durable. Reentrega e incertidumbre exigen consulta/conciliación; nunca se abre Redis o SQL por WAN.",
    "nodeIds": [
      "countryApi",
      "erpExecution",
      "erpClient",
      "erpMasterSource",
      "erpFacade",
      "erpAcl",
      "erpProtocol",
      "erpRecovery",
      "technicalBase",
      "erp",
      "masters",
      "legend",
      "erpQueue",
      "erpJobStore"
    ],
    "boundaries": [
      {
        "id": "erpScope",
        "label": "apps/erp-worker · UN proceso NestJS + BullMQ",
        "nodes": [
          "erpExecution",
          "erpClient",
          "erpMasterSource",
          "erpFacade",
          "erpAcl",
          "erpProtocol",
          "erpRecovery",
          "technicalBase",
          "erpQueue"
        ]
      }
    ],
    "relationships": [
      {
        "from": "erpExecution",
        "to": "erpClient",
        "label": "Solicita trabajo / renueva lease · TypeScript"
      },
      {
        "from": "erpClient",
        "to": "countryApi",
        "label": "Claim y resultados · HTTPS saliente"
      },
      {
        "from": "erpExecution",
        "to": "erpFacade",
        "label": "Ejecuta con destino e intento fijos · TypeScript"
      },
      {
        "from": "erpExecution",
        "to": "technicalBase",
        "label": "Configura y correlaciona · TypeScript"
      },
      {
        "from": "erpFacade",
        "to": "erpAcl",
        "label": "Contrato POS y contexto · TypeScript"
      },
      {
        "from": "erpAcl",
        "to": "erpProtocol",
        "label": "Modelo traducido por país · TypeScript"
      },
      {
        "from": "erpProtocol",
        "to": "erp",
        "label": "Envía o consulta · protocolo homologado"
      },
      {
        "from": "erpProtocol",
        "to": "erpRecovery",
        "label": "Respuesta, error o incertidumbre · TypeScript"
      },
      {
        "from": "erpRecovery",
        "to": "erpFacade",
        "label": "Consulta/conciliación según capacidad · TypeScript"
      },
      {
        "from": "erpRecovery",
        "to": "erpClient",
        "label": "Registra resultado con misma identidad · TypeScript"
      },
      {
        "from": "erpExecution",
        "to": "erpMasterSource",
        "label": "Preparación con presupuesto aislado · TypeScript"
      },
      {
        "from": "erpMasterSource",
        "to": "masters",
        "label": "Snapshot o deltas · contrato de fuente homologado"
      },
      {
        "from": "erpMasterSource",
        "to": "erpClient",
        "label": "Claim, upload y finalize · TypeScript"
      },
      {
        "from": "erpQueue",
        "to": "erpJobStore",
        "label": "Programa y consume jobs · Redis privado"
      },
      {
        "from": "erpQueue",
        "to": "erpExecution",
        "label": "Entrega job; revalida intento y lease · TypeScript"
      },
      {
        "from": "erpClient",
        "to": "erpQueue",
        "label": "Reconstruye pendientes por identidad · TypeScript"
      },
      {
        "from": "erpRecovery",
        "to": "erpQueue",
        "label": "Programa consulta segura de estado · TypeScript"
      }
    ]
  }
];
  window.POS_C4 = { sources, nodes, views, legend: [
  "Persona: rol humano. Sistema externo: responsabilidad fuera del POS.",
  "Contenedor: aplicación/proceso o almacén de datos. Componente: módulo de un proceso.",
  "Azul: software POS. Violeta: datos. Gris: externo. Ámbar: infraestructura; borde discontinuo: límite indicado.",
  "Las apps muestran su nombre de monorepo. Una biblioteca no equivale a un proceso desplegable.",
  "Opcional o F06 indica una capacidad condicionada. Conector discontinuo: expansión futura; no instalación inicial.",
  "Flecha: iniciador, propósito y protocolo. LAN: sucursal. WAN: enlace a país. ACL: capa anticorrupción.",
  "ACK de aplicación: commit durable local, distinto de resultado ERP, pago o fiscalidad. Despliegue no es el nivel C4 de código."
] };
})();
