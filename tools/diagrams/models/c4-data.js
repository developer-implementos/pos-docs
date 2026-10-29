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
    "detail": "Sistema objetivo común para Chile, Perú y España. Aplicaciones completas con frontend Angular alojado por las shells nativas Tauri (escritorio) y Capacitor (móvil), aceptadas como dirección; backend, datos y topología son recomendaciones por validar.",
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
    "detail": "apps/pos-desktop entrega la aplicación completa: la shell nativa Tauri aloja el frontend Angular. Tiene arranque, configuración nativa y build propios. Comparte con pos-mobile libs/client-shell: raíz, configuración, rutas, guards y layout Angular; esta biblioteca no es la shell nativa ni un proceso adicional. Hardware, SDK y distribución requieren homologación. Su registro técnico de periféricos no lo convierte en autoridad de ventas.",
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
    "detail": "apps/pos-mobile entrega la aplicación completa: la shell nativa Capacitor aloja el frontend Angular. Tiene arranque, configuración nativa y build propios. Comparte con pos-desktop libs/client-shell: raíz, configuración, rutas, guards y layout Angular; esta biblioteca no es la shell nativa ni un proceso adicional. Los adaptadores actuales son mock. Instalación, ciclo de vida, almacenamiento y capacidades nativas requieren pruebas Android/iOS; no hay acceso SQL ni permisos implícitos por empaquetar la interfaz.",
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
    "detail": "apps/branch-api compone los contextos operativos: sales/returns, cash/collections, pricing/catalog, payments/devices, fiscal, reporting y administration. sync aporta el contrato outbox que se confirma con negocio. El transporte pertenece a branch-sync-worker y la ACL ERP a erp-worker. Bibliotecas no equivalen a microservicios; las capacidades de negocio aún requieren implementación.",
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
    "detail": "branch-api y branch-sync-worker acceden al mismo PostgreSQL de la sucursal con responsabilidades y permisos distintos. Ventas, caja, pagos y evidencia fiscal se conservan aquí; inbox, outbox, cursores y staging tienen restricciones y transacciones según cada operación. Las llamadas de red quedan fuera de esas transacciones. Catálogo, precios y promociones son réplicas de lectura autorizadas, no maestros independientes.",
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
    "detail": "apps/branch-sync-worker compone libs/backend/sync con pricing/catalog para preparar y activar versiones. Entrega outbox por HTTPS con identidad y cursor; confirma acuses durables. El proceso supervisado sigue activo aunque el cliente se cierre. Descarga, staging, validación y activación conservan límites transaccionales.",
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
    "technology": "NestJS + Fastify / Node.js",
    "summary": "Recibe operaciones y sirve trabajo y versiones.",
    "ownership": "Autentica sucursal y país; confirma inbox, efecto local y outbox juntos antes del ACK de aplicación. Conserva autoridad de versiones, manifiestos y publicación de maestros.",
    "offline": "No participa en la transacción local de sucursal. Su caída genera atraso de sincronización.",
    "detail": "apps/country-api autentica el ámbito país/entidad/sucursal. Confirma inbox, proyección operativa y outbox en un único commit antes del ACK de aplicación. Expone trabajo y resultados al erp-worker mediante HTTPS saliente iniciado por ese worker. Valida, publica y sirve versiones preparadas mediante MasterDataSourcePort en erp-worker; no ejecuta la ACL ni carga masiva pesada en un endpoint. La caché opcional acelera lecturas reconstruibles, con PostgreSQL como fuente durable.",
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
    "detail": "Componente propuesto dentro de country-api. Recibe porciones idempotentes y finalización desde erp-worker por HTTPS, valida cobertura, corte e integridad y confirma versión, manifiesto y evento. La preparación pesada permanece en el adaptador de fuente del worker; no ocurre dentro de una petición.",
    "sources": [
      {
        "label": "Contrato de publicación de maestros",
        "url": "../docs/contracts/master-data-publication.md"
      },
      {
        "label": "Propuesta y decisiones de arquitectura",
        "url": "../docs/propuesta-arquitectura.md"
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
    "detail": "Aislamiento lógico y recursos por país/entidad legal. Retención, backups y deduplicación deben cubrir el horizonte de replay y restauración. ACK de aplicación local no equivale a contabilización ERP.",
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
  "erpAdapter": {
    "id": "erpAdapter",
    "name": "erp-worker",
    "type": "Contenedor",
    "technology": "NestJS / Node.js · libs/backend/erp",
    "summary": "Integra ERP y prepara maestros por contrato.",
    "ownership": "Proceso con fachada, ACL y adaptadores internos. Prepara maestros por MasterDataSourcePort con identidad y presupuesto aislados; country-api conserva publicaciones y resultados durables.",
    "offline": "Si país o ERP no responde, conserva identidad y resultado incierto. Consulta o concilia antes de repetir un efecto.",
    "detail": "apps/erp-worker se ejecuta en la red autorizada del ERP e inicia HTTPS autenticado hacia country-api para reclamar trabajo, renovar su lease y registrar resultados. Mantiene destino, versión de contrato e identidad de intento. Fachada, ACL y adaptadores son componentes de libs/backend/erp, no servicios HTTP separados obligatorios. Chile: AX; Perú: custom; España: Gira, con interfaces por homologar. No accede por SQL remoto a PostgreSQL de país. La preparación de maestros usa una identidad y presupuesto propios, conexión saliente a country-api y contrato de fuente homologado; no ejecuta SQL WAN.",
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
    "summary": "Gestiona intentos y evidencia de pago.",
    "ownership": "Conserva identidad de intento y referencia del proveedor; no inventa resultado.",
    "offline": "Si el proveedor no responde: pendiente/desconocido, consulta o resolución operativa.",
    "detail": "Payments conserva intentos y estados financieros; devices coordina capacidades y evidencia del dispositivo. No mantiene SQL abierto al esperar al proveedor. Persiste intención y resultado en momentos separados. Para SDK local, el cliente transporta al puente el comando original autorizado por backend y devuelve evidencia; no inventa importe, permiso ni otro intento.",
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
    "name": "Puente de periféricos",
    "type": "Contenedor condicional",
    "technology": "Proceso nativo según SDK",
    "summary": "Ejecuta capacidades del puesto.",
    "ownership": "Ejecuta identidad y autorización emitidas por backend; registro técnico de evidencia, sin base de ventas.",
    "offline": "Una caída de LAN tras un cobro exige recuperar evidencia; no autoriza otro cobro.",
    "detail": "El cliente transporta el comando autorizado por backend al agente; no inventa importe, permiso ni otro intento. Puede requerir .NET u otro runtime por contrato del proveedor. Se representa como límite por homologar, no como SDK aprobado.",
    "sources": [
      {
        "label": "Proveedores, periféricos y homologación",
        "url": "../docs/extensibilidad-proveedores-dispositivos.md"
      },
      {
        "label": "Opciones tecnológicas y límites",
        "url": "../docs/opciones-tecnologicas.md"
      }
    ],
    "conditional": true
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
    "detail": "Persona: rol. Contenedor: aplicación o almacén. Componente: módulo de un proceso. Las apps usan su nombre de monorepo. Redis de país y observabilidad son condicionales; publicación y extracción son responsabilidades internas de las aplicaciones indicadas.",
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
    "detail": "Ampliación opcional sujeta a medición, capacidad y operación. La API comprueba identidad, ámbito y autorización antes de leer. Las claves incluyen país, entidad legal, versión y alcance de permisos cuando afecte al resultado; un prefijo no sustituye autorización. TTL y vigencia comercial son independientes. El fallback limita concurrencia, esperas y llenados para proteger PostgreSQL. No es la inbox, outbox, base de ventas ni único registro de permisos, dinero o trabajos; no implica BullMQ ni Redis en cada sucursal. Las versiones inmutables evitan mezclar publicaciones y PostgreSQL resuelve la versión autorizada.",
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
    "name": "Planificador y ejecutor",
    "type": "Componente",
    "technology": "libs/backend/erp + worker",
    "summary": "Admite trabajo con límites por destino.",
    "ownership": "Respeta lease, identidad, destino y versión fijados al crear el intento.",
    "offline": "Backoff y ventanas limitan reintentos; lease expirado no autoriza duplicar un efecto incierto.",
    "detail": "El proceso supervisado obtiene trabajo mediante el cliente de country-api. Limita concurrencia por contrato/ERP, conserva el destino de pendientes durante una migración y drena o interrumpe admisión de forma controlada.",
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
      }
    ]
  },
  {
    "id": "containers",
    "key": "c4-containers",
    "level": "C2 · Contenedores",
    "title": "Aplicaciones, procesos y datos",
    "scope": "Aplicaciones de POS Platform, persistencia de sucursal y servicios de país. Cada nombre de app corresponde al monorepo; las capacidades son propuesta por implementar.",
    "note": "PostgreSQL conserva negocio y entrega durable. Country-api publica versiones; erp-worker prepara maestros mediante un contrato de origen y presupuesto aislados. Redis es caché opcional. Sin SQL WAN ni aplicación adicional.",
    "nodeIds": [
      "cashier",
      "client",
      "mobileClient",
      "device",
      "branchApi",
      "branchDb",
      "syncWorker",
      "countryApi",
      "countryDb",
      "countryCache",
      "erpAdapter",
      "erp",
      "masters",
      "payments",
      "fiscal",
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
          "branchApi",
          "branchDb",
          "syncWorker",
          "countryApi",
          "countryDb",
          "countryCache",
          "erpAdapter"
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
        "label": "Comandos y consultas · HTTPS/LAN"
      },
      {
        "from": "client",
        "to": "device",
        "label": "Comando autorizado y evidencia · IPC/loopback"
      },
      {
        "from": "device",
        "to": "payments",
        "label": "Terminal local si aplica · SDK homologado"
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
      }
    ]
  },
  {
    "id": "backend",
    "key": "c4-backend",
    "level": "C3 · branch-api",
    "title": "Negocio de sucursal en un proceso",
    "scope": "apps/branch-api compone módulos de negocio y base técnica. Las bibliotecas agrupadas comparten proceso, sin convertirse en servicios independientes.",
    "note": "sales/returns, cash/collections, pricing/catalog, payments/devices, fiscal, reporting, administration y contrato outbox de sync. El transporte vive en branch-sync-worker y la ACL en erp-worker.",
    "nodeIds": [
      "client",
      "mobileClient",
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
    "scope": "Perfil WAN: puestos y móviles usan el servidor de sucursal por LAN. País y red del ERP son entornos independientes, conectados mediante contratos autenticados.",
    "note": "PostgreSQL conserva negocio y entrega durable. Country-api publica versiones; erp-worker prepara maestros mediante un contrato de origen y presupuesto aislados. Redis es caché opcional. Sin SQL WAN ni aplicación adicional.",
    "nodeIds": [
      "client",
      "mobileClient",
      "device",
      "branchApi",
      "branchDb",
      "syncWorker",
      "countryApi",
      "countryDb",
      "countryCache",
      "erpAdapter",
      "erp",
      "payments",
      "fiscal",
      "backup",
      "observability",
      "masters",
      "legend"
    ],
    "boundaries": [
      {
        "id": "terminalNode",
        "label": "Puestos POS x N · Windows por homologar",
        "nodes": [
          "client",
          "device"
        ]
      },
      {
        "id": "mobileNode",
        "label": "Dispositivos móviles · Android/iOS por homologar",
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
          "countryCache"
        ]
      },
      {
        "id": "erpNode",
        "label": "Red autorizada del ERP · entorno por país",
        "nodes": [
          "erpAdapter",
          "erp"
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
        "label": "Comandos autenticados · HTTPS/LAN"
      },
      {
        "from": "client",
        "to": "device",
        "label": "Comando autorizado · IPC/loopback"
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
        "label": "Terminal local · SDK/API homologado"
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
      }
    ]
  },
  {
    "id": "country",
    "key": "c4-country",
    "level": "C3 · country-api",
    "title": "Recepción, trabajo y consultas de país",
    "containerId": "countryApi",
    "scope": "Un proceso HTTP apps/country-api. Recibe operaciones, ofrece trabajo al ERP y sirve publicaciones; no ejecuta la ACL ni construye cargas masivas dentro de una petición.",
    "note": "ACK sólo después del commit de inbox + efecto + outbox. Redis acelera lecturas opcionales con fallback SQL; no contiene el único estado de recepción, trabajo o resultados.",
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
      "legend"
    ],
    "boundaries": [
      {
        "id": "countryScope",
        "label": "apps/country-api · UN proceso NestJS + Fastify",
        "nodes": [
          "countryEntry",
          "countryInbox",
          "countryJobs",
          "countryPublications",
          "countryWorker",
          "countryCachePort",
          "countryUow",
          "technicalBase"
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
      }
    ]
  },
  {
    "id": "erp",
    "key": "c4-erp",
    "level": "C3 · erp-worker",
    "title": "Contrato POS, ACL y recuperación ERP",
    "containerId": "erpAdapter",
    "scope": "Un proceso apps/erp-worker en la red autorizada del ERP. Fachada, ACL, protocolo y conciliación son componentes internos de libs/backend/erp. MasterDataSourcePort prepara publicaciones con claims, identidad y presupuesto propios.",
    "note": "El worker inicia HTTPS hacia country-api. Lease, destino, versión e intento permanecen identificados; un timeout no autoriza duplicar efectos ni cambiar de ERP.",
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
      "legend"
    ],
    "boundaries": [
      {
        "id": "erpScope",
        "label": "apps/erp-worker · UN proceso supervisado",
        "nodes": [
          "erpExecution",
          "erpClient",
          "erpMasterSource",
          "erpFacade",
          "erpAcl",
          "erpProtocol",
          "erpRecovery",
          "technicalBase"
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
      }
    ]
  }
];
  window.POS_C4 = { sources, nodes, views, legend: [
  "Persona: rol humano. Sistema externo: responsabilidad fuera del POS.",
  "Contenedor: aplicación/proceso o almacén de datos. Componente: módulo de un proceso.",
  "Azul: software POS. Violeta: datos. Gris: externo. Ámbar: infraestructura; borde discontinuo: límite indicado.",
  "Las apps muestran su nombre de monorepo. Una biblioteca no equivale a un proceso desplegable.",
  "Opcional o por asignar indica una capacidad condicionada, no una instalación confirmada.",
  "Flecha: iniciador, propósito y protocolo. LAN: sucursal. WAN: enlace a país. ACL: capa anticorrupción.",
  "ACK de aplicación: commit durable local, distinto de resultado ERP, pago o fiscalidad. Despliegue no es el nivel C4 de código."
] };
})();
