import fs from 'node:fs';
import vm from 'node:vm';

// Editorial build input, not browser code. Reuse the canonical C4 responsibility
// records without changing them or treating a scaffold as a deployed capability.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../diagrams/models/c4-data.js', import.meta.url), 'utf8'), sandbox, { timeout: 1000 });
const c4 = sandbox.window.POS_C4.nodes;

const source = {
  c4: { label: 'Modelo C4 y contratos', href: '/guide/architecture/c4-model/' },
  product: { label: 'Producto, alcance y países', href: '/guide/proposal/product/' },
  architecture: { label: 'Aplicaciones y autoridad de datos', href: '/guide/proposal/architecture/' },
  native: { label: 'Shells nativas y frontend Angular', href: '/guide/architecture/native-clients/' },
  devices: { label: 'Agente de dispositivos y recuperación', href: '/guide/architecture/device-agent/' },
  roadmap: { label: 'Roadmap y criterios de salida', href: '/guide/proposal/roadmap/' },
  monorepo: { label: 'Monorepo y estado de implementación', href: '/guide/implementation/monorepo/' },
  access: { label: 'Acceso, permisos y operación', href: '/guide/proposal/access-operations/' },
  pricing: { label: 'Publicación y vigencia comercial', href: '/guide/proposal/pricing-promotions/' },
  sync: { label: 'Sincronización y consistencia', href: '/guide/proposal/synchronization/' },
  integration: { label: 'Integración por país', href: '/guide/proposal/integration/' },
  contracts: { label: 'Contratos, fachada y ACL', href: '/guide/proposal/contracts/' },
  migration: { label: 'Coexistencia y cambio de ERP', href: '/guide/proposal/erp-migration/' },
  providers: { label: 'Proveedores y dispositivos', href: '/guide/architecture/providers/' },
  fiscal: { label: 'Fiscalidad y documentos', href: '/guide/proposal/fiscal-compliance/' },
  messaging: { label: 'Criterios de mensajería', href: '/guide/architecture/messaging/' },
  resilience: { label: 'Resiliencia y recuperación', href: '/guide/operations/resilience/' },
  technology: { label: 'Evaluación tecnológica', href: '/guide/architecture/technologies/' },
  meetings: { label: 'Fuentes de reuniones por país', href: '/guide/evidence/country-comparison/' },
  publication: { label: 'Contrato de publicación de maestros', href: '/guide/architecture/master-data-publication/' },
  identity: { label: 'Identidad y fronteras de confianza', href: '/guide/architecture/identity/' },
};
const sources = (...keys) => keys.map(key => source[key]);

// Short protocol captions are explicit per relationship; do not infer a selected
// provider, transport or deployment from the longer explanatory protocol text.
const protocolLabels = {
  'desktop-api': 'HTTPS · LAN',
  'mobile-api': 'HTTPS · LAN',
  'command-access': 'TypeScript',
  'quote-pricing': 'TypeScript',
  'commit-operation': 'TypeScript',
  'commit-local': 'PostgreSQL',
  'read-prices': 'PostgreSQL',
  'sync-local': 'PostgreSQL',
  'sync-country': 'HTTPS',
  'accept-country': 'PostgreSQL',
  'manage-work': 'TypeScript',
  'persist-work': 'PostgreSQL',
  'fetch-source': 'Interfaz por validar',
  'publish-version': 'PostgreSQL',
  'cache-policy': 'TypeScript',
  'cache-read': 'Redis',
  'cache-fallback': 'PostgreSQL',
  'claim-report': 'HTTPS saliente',
  'execute-adapter': 'TypeScript',
  'send-erp': 'Protocolo por validar',
  'payment-api': 'API por homologar',
  'fiscal-api': 'Contrato por validar',
  'device-command': 'HTTPS · LAN saliente',
  'device-jobs-local': 'PostgreSQL',
  'agent-journal': 'SQLite · local',
  'hardware-command': 'Driver / SDK',
  'network-hardware-command': 'LAN / driver',
  'payment-sdk': 'SDK / terminal',
  'worker-library': 'API Node.js',
  'queue-store': 'Redis · opcional',
  'queue-execution': 'Callback Node.js',
  'broker-candidate': 'AMQP · pendiente',
  'branch-diagnostic': 'Telemetría',
  'sync-diagnostic': 'Telemetría',
  'country-diagnostic': 'Telemetría',
  'erp-diagnostic': 'Telemetría',
  'bridge-evidence': 'HTTPS · LAN saliente',
  'prepare-masters': 'TypeScript',
  'submit-publication': 'HTTPS saliente',
  'finalize-publication': 'TypeScript',
};

function node(id, group, reference, options) {
  const base = reference ? c4[reference] : null;
  if (reference && !base) throw new Error(`Unknown C4 node: ${reference}`);
  return {
    id, group, title: options.title ?? base?.name,
    kind: options.kind, status: options.status ?? 'proposed',
    ...(options.owner ? { owner: options.owner } : {}),
    ...(reference ? { c4Ref: reference } : {}),
    technology: options.technology ?? base?.technology,
    summary: options.summary ?? base?.summary,
    description: options.description ?? base?.detail,
    responsibilities: options.responsibilities ?? [base.ownership],
    data: options.data,
    failure: options.failure ?? [base.offline],
    sources: sources(...(options.sources ?? ['c4'])),
  };
}

function edge(id, from, to, title, protocol, mode, options) {
  const protocolLabel = protocolLabels[id];
  if (!protocolLabel || [...protocolLabel].length > 30) throw new Error(`Missing or overlong short protocol: ${id}`);
  return {
    id, from, to, title, protocol, protocolLabel, mode, status: options.status ?? 'proposed',
    relation: options.relation ?? 'communication',
    summary: options.summary, description: options.description,
    payload: options.payload, guarantees: options.guarantees, failure: options.failure,
    sources: sources(...(options.sources ?? ['c4'])),
  };
}

export const architecture = {
  title: 'POS Platform · arquitectura propuesta',
  subtitle: 'Siete aplicaciones propuestas; device-agent por implementar. F02: agente Windows por puesto. F05: piloto de ese perfil. F06: red y uso compartido/móvil, sujetos a homologación.',
  groups: [
    { id: 'clients', title: 'Clientes y puesto', subtitle: 'Escritorio y móvil · sin autoridad SQL de ventas' },
    { id: 'branch', title: 'Sucursal', subtitle: 'LAN disponible · un escritor de negocio autorizado' },
    { id: 'country', title: 'Plataforma de país', subtitle: 'Recepción, publicaciones y trabajo durable aislados por ámbito' },
    { id: 'integrations', title: 'Integraciones y operación', subtitle: 'ERP en su red autorizada · proveedores y capacidades por homologar' },
  ],
  nodes: [
    node('desktop', 'clients', 'client', { kind: 'app', data: ['Estado de interfaz y referencias de operaciones; sin credenciales SQL.', 'Solicitudes de negocio y de dispositivos a branch-api; consulta de resultados.'], sources: ['native', 'monorepo', 'providers'] }),
    node('mobile', 'clients', 'mobileClient', { kind: 'app', data: ['Estado de UI y capacidades móviles habilitadas.', 'Mismo ámbito y autoridad de sucursal que el cliente de escritorio.'], sources: ['native', 'monorepo'] }),
    node('bridge', 'clients', 'device', {
      kind: 'app', summary: 'F02 · Windows por puesto; F06 · perfil compartido.',
      description: 'Aplicación propuesta, todavía sin scaffolding ni integración de hardware. F02 instala una instancia en cada puesto Windows que controla impresora USB/serie, Zebra o lector MICR homologado; F05 pilota ese perfil. F06 amplía la misma aplicación a periféricos de red y estación compartida, incluyendo solicitudes móviles autorizadas. No exige instalar el agente en el servidor de sucursal: una estación Windows compatible puede alojarlo tras homologación. Inicia HTTPS hacia branch-api para obtener trabajos y reportar evidencia sin depender de la UI. C# no garantiza compatibilidad de drivers, POS for .NET ni PrintDocument con un servicio Windows; un helper de sesión requiere evidencia del SDK. Los pagos por SDK permanecen condicionados y no acreditan integración Transbank.',
      responsibilities: ['Validar identidad, ámbito, binding y hash del trabajo antes de ejecutarlo.', 'Mantener un único controlador autorizado por periférico y serializar sus comandos.', 'Recuperar y reportar evidencia aunque el cliente se cierre; no confirmar ventas ni recalcular importes.'],
      data: ['jobId, commandId, hash, destino, intento y resultado técnico en su diario SQLite.', 'Sin autoridad de ventas, credenciales SQL de sucursal ni ejecución genérica de comandos.'],
      failure: ['Perder LAN detiene la admisión de nuevos trabajos; conserva intentos y evidencia pendientes.', 'Un reinicio o lease vencido no demuestra que un efecto físico no ocurrió ni autoriza repetirlo.'], sources: ['devices', 'roadmap', 'providers', 'resilience', 'identity', 'monorepo'],
    }),
    node('device-journal', 'clients', 'deviceJournal', {
      title: 'SQLite · diario del agente', kind: 'data', technology: 'Archivo local · propiedad de device-agent', summary: 'Recepción y evidencia técnica durables.',
      description: 'Persistencia propuesta del agente: registra recepción antes del acuse, contenido mínimo del trabajo, intentos y observaciones antes de reportarlos. No mantiene el registro comercial ni permite operar comercialmente sin branch-api. El dispositivo externo y SQLite no comparten una transacción; el registro conserva explícitamente efectos inciertos.',
      responsibilities: ['Deduplicar jobId/commandId y hash; rechazar la misma identidad con otro contenido.', 'Conservar observaciones hasta el acuse durable de sucursal y aplicar retención que cubra reentregas y recuperación.'],
      data: ['Identidad, binding, versión de plantilla, intento y estado de entrega.', 'Referencia del spooler/dispositivo, evidencia y acuses; payload mínimo necesario protegido según política.'],
      failure: ['Un ACK de recepción no significa impresión física.', 'Pérdida o restauración del diario exige conciliación; no reconstruir pendientes como nuevas ejecuciones.'], sources: ['devices', 'providers', 'resilience'],
    }),
    node('devices', 'clients', 'peripherals', {
      title: 'Periféricos del puesto · F02', kind: 'external', status: 'unresolved', technology: 'USB / serie / SDK · impresora · MICR',
      summary: 'Perfil inicial dedicado; homologación por modelo.',
      description: 'F02 conserva la ubicación física del legado: el agente vive en el puesto Windows conectado a la impresora, Zebra o lector MICR. El contrato nuevo autoriza trabajos en branch-api; no reproduce una API localhost anónima. Lectura, impresión y endoso del mismo equipo comparten exclusión física. F05 pilota ese perfil; compartir dispositivos y admitir solicitudes móviles se valida después en F06. Los terminales de pago requieren un contrato y homologación independientes.',
      responsibilities: ['Ejecutar la capacidad física contratada.', 'Conservar o consultar evidencia cuando el equipo lo permita.'],
      data: ['Comandos y respuestas del dispositivo, sin autoridad sobre el importe comercial.', 'Identificadores físicos y referencias según proveedor.'],
      failure: ['Una aceptación del spooler no prueba que exista papel impreso.', 'La respuesta perdida puede dejar un efecto físico incierto.'], sources: ['devices', 'roadmap', 'providers', 'meetings'],
    }),
    node('network-devices', 'branch', 'networkPeripherals', {
      title: 'Periféricos de red · F06', kind: 'external', status: 'conditional', technology: 'LAN / driver / SDK por homologar',
      summary: 'Evolución posterior: estación compartida y móvil.',
      description: 'F06 empieza por impresoras de recibos y etiquetas accesibles por red y el perfil de estación compartida. Usa la misma app device-agent en una estación Windows autorizada; puede coincidir con el servidor de sucursal sólo si su sistema operativo, drivers y operación son compatibles. Estar conectado a red no acredita uso compartido: se prueban protocolos, permisos, concurrencia y aislamiento por ámbito antes de habilitar solicitudes de escritorio o móvil. MICR, cajón y terminales de pago no quedan habilitados automáticamente por este perfil.',
      responsibilities: ['Ejecutar únicamente capacidades homologadas para uso en red o compartido.', 'Conservar un único controlador activo por dispositivo físico y un destino autorizado por trabajo.'],
      data: ['Identidad física, capacidad, binding y evidencias específicas del protocolo.', 'Sin puertos de control anónimos expuestos a clientes o Internet.'],
      failure: ['Una caída de red o resultado incierto no habilita cambiar de impresora ni repetir el efecto.', 'No sustituye el perfil de puesto del piloto ni implica soporte Bluetooth/USB directo en móvil.'], sources: ['devices', 'roadmap', 'providers', 'identity'],
    }),
    node('branch-api', 'branch', 'branchApi', { kind: 'app', data: ['Ventas, devoluciones, turnos, pagos y referencias fiscales mediante sus contextos.', 'Trabajos de dispositivos y observaciones vinculados a usuario, puesto, país, entidad legal y sucursal.'], sources: ['c4', 'monorepo', 'architecture', 'devices'] }),
    node('access', 'branch', 'access', { kind: 'component', owner: 'branch-api', data: ['Identidad, ámbito, capacidades y aprobaciones según la operación.', 'Evidencia de autorización; el menú no es la frontera de seguridad.'], sources: ['access', 'monorepo'] }),
    node('pricing', 'branch', 'pricing', { kind: 'component', owner: 'branch-api', data: ['Versión comercial completa, reglas, cobertura y vigencias.', 'Cotización explicable: origen, reglas, moneda y redondeos.'], sources: ['pricing', 'c4'] }),
    node('transaction', 'branch', 'unitOfWork', { kind: 'component', owner: 'branch-api', title: 'Confirmación local', data: ['Negocio, auditoría y outbox en la misma conexión/transacción.', 'Identidad del comando y restricciones de unicidad.'], sources: ['sync', 'architecture', 'resilience'] }),
    node('branch-db', 'branch', 'branchDb', { kind: 'data', title: 'PostgreSQL de sucursal', data: ['Negocio y auditoría de los contextos; inbox/outbox y cursores.', 'Espejo comercial durable, candidatas y puntero de versión activa.', 'devices conserva trabajos autorizados, binding, asignación y observaciones de device-agent.'], sources: ['architecture', 'sync', 'pricing', 'devices'] }),
    node('branch-sync', 'branch', 'syncWorker', { kind: 'app', data: ['Pendientes, intentos, cursores recibidos/aplicados y progreso de descarga.', 'No obtiene permiso genérico para cambiar tablas de negocio.'], sources: ['sync', 'pricing', 'resilience'] }),
    node('country-api', 'country', 'countryApi', { kind: 'app', data: ['Inbox, proyección pactada y outbox de país antes del ACK.', 'Publicaciones versionadas y contratos públicos de trabajo/resultados ERP.'], sources: ['c4', 'sync', 'monorepo'] }),
    node('country-work', 'country', 'countryJobs', { kind: 'component', owner: 'country-api', data: ['Destino, versión de contrato, intento, dueño/vencimiento del claim y referencia ERP.', 'Los estados ERP pertenecen a erp; transporte y deduplicación técnica a sync.'], sources: ['c4', 'monorepo', 'migration'] }),
    node('country-db', 'country', 'countryDb', { kind: 'data', title: 'PostgreSQL de país', data: ['Recepción, proyecciones operativas, outbox, publicaciones y trabajo ERP.', 'Identidades y resultados durables aislados por país y entidad legal.'], sources: ['c4', 'sync', 'resilience'] }),
    node('cache-port', 'country', 'countryCachePort', { kind: 'component', status: 'conditional', owner: 'country-api', title: 'Lecturas con caché', data: ['Consultas derivadas autorizadas; no decisiones monetarias exclusivas.', 'Clave con ámbito, versión y permisos cuando cambien el resultado.'], sources: ['c4', 'technology'] }),
    node('redis-cache', 'country', 'countryCache', { kind: 'data', status: 'conditional', title: 'Redis · caché', data: ['Entradas descartables reconstruibles desde PostgreSQL.', 'TTL técnico y vigencia comercial independientes; capacidad limitada.'], sources: ['c4', 'messaging'] }),
    node('publisher', 'country', null, { kind: 'component', owner: 'country-api', title: 'Publicación de maestros', technology: 'Contrato interno · catalog / pricing / sync', summary: 'Valida y publica versiones completas.', description: 'Country-api conserva la autoridad de publicaciones: admite porciones, valida una candidata completa y confirma versión, manifiesto y evento. La extracción y preparación pesada se ejecutan en erp-worker mediante un contrato de fuente homologado.', responsibilities: ['Autorizar claims de publicación y recibir porciones idempotentes.', 'Validar cobertura, integridad y corte antes de publicar una versión en país.'], data: ['Candidata, manifiesto, versión, cobertura, punto de corte y feed.', 'Paquetes inmutables; conservación y almacenamiento según contrato.'], failure: ['Una carga incompleta nunca sustituye la versión activa.'], sources: ['publication', 'pricing'] }),
    node('masters', 'country', 'masters', { kind: 'external', status: 'unresolved', data: ['Maestros, precios y promociones cuya autoridad se acuerda por dato y país.', 'No se atribuye automáticamente toda la autoría al ERP.'], sources: ['pricing', 'c4', 'meetings'] }),
    node('rabbitmq', 'country', null, {
      title: 'RabbitMQ · transporte', kind: 'infra', status: 'conditional', technology: 'AMQP · alternativa central',
      summary: 'Routing y consumidores independientes, si se justifican.',
      description: 'Capacidad candidata para la plataforma de país; no forma parte de la ruta base PostgreSQL + HTTPS. Colas, productores, consumidores y propietarios están por definir. Este mapa no asigna una suscripción AMQP al ERP ni instala un broker por sucursal.',
      responsibilities: ['Separar transporte y consumidores cuando exista una necesidad demostrada.', 'Definir retención, confirmaciones, rechazos y recuperación por cola antes de adoptarlo.'],
      data: ['Mensajes con identidad y contrato, si se selecciona ese transporte.', 'El broker no conserva la única autoridad financiera ni sustituye la inbox/outbox.'],
      failure: ['Publisher confirm no equivale a commit del consumidor ni resultado ERP.', 'Redelivery exige identidad estable y deduplicación; no promete exactamente una vez.'], sources: ['messaging', 'c4', 'resilience'],
    }),
    node('erp-worker', 'integrations', 'erpAdapter', { kind: 'app', data: ['Trabajo obtenido por API con destino y versión fijos.', 'Resultados y referencias se confirman en país mediante HTTPS; sin SQL WAN.'], sources: ['c4', 'integration', 'migration'] }),
    node('master-source', 'integrations', null, { kind: 'component', owner: 'erp-worker', title: 'Extracción de maestros', technology: 'MasterDataSourcePort · adaptador de origen', summary: 'Prepara cargas en la red del origen.', description: 'Responsabilidad propuesta dentro de erp-worker. El adaptador obtiene una carga o deltas con corte consistente, prepara porciones y las sube a country-api mediante HTTPS saliente. Red, interfaz y capacidades del origen necesitan homologación; no presupone que todos los maestros pertenezcan al ERP.', responsibilities: ['Extraer y preparar mediante un contrato de fuente por país.', 'Aislar identidad, claims y presupuesto de concurrencia de la ejecución financiera.'], data: ['Referencia de publicación, corte, porciones y progreso técnico.', 'La versión publicada permanece bajo autoridad de country-api.'], failure: ['Si el origen no acredita integridad o acceso, no finaliza la publicación.', 'Reintentar porciones conserva claim, versión e identidad; nunca usa SQL WAN.'], sources: ['publication', 'identity'] }),
    node('erp-acl', 'integrations', 'erpAcl', { kind: 'component', owner: 'erp-worker', title: 'Fachada, ACL y adaptador', description: `${c4.erpFacade.detail} ${c4.erpAcl.detail} ${c4.erpProtocol.detail}`, data: ['Contrato POS y traducción semántica a la instancia ERP elegida.', 'Referencias externas e historial de mapeo; detalles del proveedor no invaden ventas.'], responsibilities: ['Fachada: capacidades con vocabulario POS.', 'ACL (capa anticorrupción): traduce identidades, estados, monedas, impuestos y errores.', 'Adaptador: protocolo de envío y consulta homologado.'], sources: ['contracts', 'integration', 'migration'] }),
    node('erp', 'integrations', 'erp', {
      kind: 'external', title: 'ERP por país', technology: 'AX · ICS custom · Gira',
      description: 'Chile: Dynamics AX on-premise. Perú: sistema custom denominado ICS en las reuniones, con interfaces y garantías por relevar. España: Gira, con contrato por verificar. El nodo representa la instancia seleccionada por país; no tres destinos simultáneos para una operación ni una API común acreditada.',
      data: ['Identidades, documentos, referencias y resultados del ERP correspondiente.', 'Cada operación conserva destino y versión durante una transición de ERP.'],
      failure: ['Una respuesta parcial o perdida exige consulta/conciliación según capacidades verificadas.', 'La outbox del POS no corrige por sí sola unicidad o transacciones defectuosas del ERP.'], sources: ['integration', 'meetings', 'resilience'],
    }),
    node('bullmq', 'integrations', null, {
      title: 'BullMQ · librería de jobs', kind: 'component', status: 'conditional', owner: 'erp-worker', technology: 'Librería Node.js · opción Redis ilustrada',
      summary: 'Tareas internas del worker, sólo si se selecciona.',
      description: 'Se ilustra su posible uso dentro de erp-worker para tareas delimitadas, no una adopción ni una app adicional. La asignación y el backend definitivo requieren validación; BullMQ también documenta backend PostgreSQL. La ruta base puede operar con trabajo durable PostgreSQL y workers sin BullMQ.',
      responsibilities: ['Programar y ejecutar tareas internas con concurrencia y reintentos acotados.', 'Mantener las políticas comerciales y la incertidumbre del ERP fuera de un reintento automático genérico.'],
      data: ['Jobs con referencia a operación/intento; el estado comercial autoritativo permanece en PostgreSQL.', 'La escritura del job no se supone atómica con la venta ni con el commit de país.'],
      failure: ['Un job reintentado o recuperado no autoriza repetir un efecto externo incierto.', 'Adoptarlo exige probar persistencia, duplicados, cierre y reconstrucción.'], sources: ['messaging', 'c4', 'resilience'],
    }),
    node('redis-jobs', 'integrations', null, {
      title: 'Redis · cola de jobs', kind: 'data', status: 'conditional', technology: 'Instancia separada · persistencia · noeviction',
      summary: 'Opción de almacén para BullMQ, separada de caché.',
      description: 'Sólo existe si se elige la variante BullMQ con Redis. Se representa junto al entorno autorizado del worker como opción por dimensionar, sin abrir una dependencia Redis WAN hacia la base de país. Debe separarse físicamente de la instancia que descarta entradas de caché; otra base lógica no aísla memoria ni fallos.',
      responsibilities: ['Conservar el estado técnico de los jobs conforme a la política de persistencia elegida.', 'Limitar capacidad, accesos y recuperación sin expulsar silenciosamente trabajos.'],
      data: ['Jobs, reintentos y estado técnico de BullMQ.', 'No es la base de ventas, el ledger financiero ni el registro exclusivo del resultado ERP.'],
      failure: ['Si se llena, noeviction puede rechazar nuevas escrituras; requiere control de admisión y alertas.', 'Pérdida o restore exige reconstrucción verificada desde referencias durables, sin recobrar ni reemitir.'], sources: ['messaging', 'c4', 'resilience'],
    }),
    node('payments', 'integrations', 'payments', { kind: 'external', status: 'unresolved', data: ['Autorización, liquidación y referencias del medio/proveedor elegido.', 'POS conserva intención y evidencia; el proveedor conserva la autoridad de su efecto.'], sources: ['providers', 'resilience', 'meetings'] }),
    node('fiscal', 'integrations', 'fiscal', { kind: 'external', status: 'unresolved', data: ['Documentos, referencias y resultados conforme a la modalidad fiscal validada.', 'Aceptar una venta o imprimir no acredita aceptación fiscal.'], sources: ['fiscal', 'providers'] }),
    node('observability', 'integrations', 'observability', { kind: 'infra', status: 'conditional', title: 'Observabilidad', technology: 'Pino · destino por definir · Sentry opt-in', data: ['Metadatos técnicos, correlación y errores permitidos; sin payload financiero o secretos.', 'Pino pertenece al proceso; el destino externo y Sentry son opcionales.'], sources: ['monorepo', 'technology', 'c4'] }),
  ],
  edges: [
    edge('desktop-api', 'desktop', 'branch-api', 'Comandos y consultas', 'HTTPS · LAN autenticada', 'sync', {
      summary: 'El puesto solicita operaciones; branch-api decide y confirma.', description: 'La UI envía identidad y datos de entrada, no una autorización confiable ni el importe final. La API verifica ámbito, turno y reglas antes de actuar.',
      payload: ['Identidad de comando, usuario, puesto y ámbito.', 'Datos de venta y referencia de cotización.'], guarantees: ['La UI no recibe credenciales SQL.', 'Un reintento conserva la identidad del comando.'], failure: ['Sin LAN o backend se detienen comandos dependientes; no se crea otra base en el puesto.'], sources: ['architecture', 'access'],
    }),
    edge('mobile-api', 'mobile', 'branch-api', 'Operación móvil habilitada', 'HTTPS · LAN autenticada', 'sync', {
      summary: 'La aplicación móvil consume la API de sucursal.', description: 'El frontend Angular alojado en la shell nativa Capacitor utiliza contratos y permisos del backend para el alcance homologado; empaquetar la interfaz no otorga autonomía comercial sin LAN.',
      payload: ['Comando identificado y capacidades habilitadas.', 'Contexto de usuario y dispositivo.'], guarantees: ['Misma autoridad de negocio que escritorio.'], failure: ['Reconectar implica consultar el resultado, no generar otra operación.'], sources: ['native', 'access'],
    }),
    edge('command-access', 'branch-api', 'access', 'Validar identidad y permiso', 'Llamada TypeScript interna', 'local', {
      summary: 'Autorización de servidor antes del efecto comercial.', description: 'Componente del mismo proceso: verifica usuario, puesto, país, entidad, sucursal, capacidad y aprobaciones requeridas. Sesión de acceso y turno de caja son conceptos distintos.',
      payload: ['Identidad y alcance operativo.', 'Operación y aprobación solicitadas.'], guarantees: ['El menú o un prefijo de clave no sustituyen autorización.'], failure: ['Vigencia offline y revocación necesitan política expresa; no se concede acceso indefinido.'], sources: ['access'],
    }),
    edge('quote-pricing', 'branch-api', 'pricing', 'Cotizar y revalidar', 'Llamada TypeScript interna', 'local', {
      summary: 'El cálculo utiliza una versión local autorizada.', description: 'Catálogo y pricing pertenecen a sus contextos dentro del proceso. La cotización conserva trazabilidad y se revalida antes del pago; puede recalcularse conforme al flujo aprobado.',
      payload: ['Productos, cantidades, cliente y contexto.', 'Versión, reglas e importes explicables.'], guarantees: ['Sin consulta central obligatoria para las operaciones offline habilitadas.'], failure: ['Una versión vencida no queda autorizada por haber sido fijada antes.'], sources: ['pricing'],
    }),
    edge('commit-operation', 'branch-api', 'transaction', 'Confirmar operación local', 'Unidad de trabajo interna', 'local', {
      summary: 'Coordina negocio, auditoría y evento.', description: 'Los contextos conservan sus tablas y colaboran por interfaces públicas. La unidad de trabajo coordina las escrituras locales que deben quedar juntas, sin envolver llamadas a proveedores.',
      payload: ['Cambios comerciales y referencias de pago/documento.', 'Auditoría y evento de salida con identidad.'], guarantees: ['No se fragmenta el commit por convertir módulos internos en microservicios.'], failure: ['Un fallo del commit no se presenta como operación confirmada.'], sources: ['architecture', 'sync'],
    }),
    edge('commit-local', 'transaction', 'branch-db', 'Guardar negocio, auditoría y outbox', 'SQL · PostgreSQL', 'data', {
      summary: 'Todo el conjunto local se confirma o se revierte.', description: 'Negocio, auditoría y outbox usan la misma conexión y transacción PostgreSQL de sucursal, no dos repositorios independientes que apunten al mismo servidor. Se aplican restricciones de identidad y contenido. Las llamadas a proveedores quedan fuera de esta transacción.',
      payload: ['Venta y cambios de sus contextos.', 'Auditoría, outbox y resultado del comando.'], guarantees: ['Mismo ID y contenido permiten recuperar el resultado.', 'Mismo ID con otro contenido es conflicto.'], failure: ['El commit no garantiza sobrevivir a la destrucción del único disco; recuperación y backups son contratos adicionales.'], sources: ['sync', 'resilience'],
    }),
    edge('read-prices', 'pricing', 'branch-db', 'Leer versión comercial', 'SQL · PostgreSQL', 'data', {
      summary: 'El espejo durable está disponible sin WAN.', description: 'La lectura mediante repositorios autorizados usa una versión completa e inmutable y conserva su referencia. Las actualizaciones construyen otra candidata; no cambian filas de la activa durante el cálculo.',
      payload: ['Catálogo, reglas, cobertura y vigencias.', 'Identificador de versión activa o referenciada.'], guarantees: ['Una versión histórica permite explicar el cálculo, no prolongar su vigencia.'], failure: ['Sin conjunto válido se restringe la operación; una caché remota no reemplaza el espejo.'], sources: ['pricing', 'c4'],
    }),
    edge('sync-local', 'branch-sync', 'branch-db', 'Pendientes y versiones', 'SQL · PostgreSQL', 'data', {
      summary: 'Entrega outbox y prepara versiones comerciales.', description: 'El worker accede al mismo PostgreSQL de sucursal con permisos acotados. Modifica datos técnicos, cursores y publicaciones mediante contratos de sus contextos, con transacciones para los cambios que deben confirmarse juntos. La activación confirma inbox aplicada, puntero de versión y cursor aplicado en una transacción corta; la descarga queda fuera. No recibe autoridad para reescribir dinero o saltarse casos de uso de negocio.',
      payload: ['Outbox, inbox, intentos y cursores.', 'Staging, candidata validada y activación.'], guarantees: ['Recepción y aplicación conservan cursores distintos.', 'Activación confirma inbox aplicada, puntero y cursor juntos.'], failure: ['Restore, huecos o carga incompleta exigen recuperación; no se activa una mezcla parcial.'], sources: ['sync', 'pricing', 'resilience'],
    }),
    edge('sync-country', 'branch-sync', 'country-api', 'Lotes, acuses y publicaciones', 'HTTPS · contrato versionado', 'async', {
      summary: 'La sucursal inicia la entrega y consulta de país.', description: 'Los lotes conservan identidades en cada reintento. La respuesta y las consultas de publicaciones forman parte del mismo contrato autenticado; asíncrono significa fuera del commit de venta.',
      payload: ['Eventos, origen, secuencia y versión de contrato.', 'Resultados por evento, manifiestos, deltas y porciones de carga.'], guarantees: ['ACK de aplicación sólo después del commit requerido en país.', 'Al menos una vez requiere deduplicación durable.'], failure: ['Acuse perdido causa replay, no otra venta; los límites protegen al destino durante el drenaje.'], sources: ['sync', 'pricing', 'resilience'],
    }),
    edge('accept-country', 'country-api', 'country-db', 'Recepción y consultas durables', 'SQL · PostgreSQL', 'data', {
      summary: 'Inbox, proyección pactada y outbox preceden al ACK.', description: 'La recepción confirma inbox, efecto operativo pactado y outbox en la misma transacción PostgreSQL de país antes del ACK. El efecto local es el registro operativo acordado para ese evento, no el resultado ERP ni todas las proyecciones futuras. La API también consulta publicaciones completas en el almacén autoritativo.',
      payload: ['Inbox y efecto operativo identificado.', 'Outbox, publicaciones y resultados de consulta autorizada.'], guarantees: ['País no pasa a ser otro escritor libre de ventas de sucursal.'], failure: ['Si PostgreSQL no confirma, no hay ACK de aplicación; guardar sólo recepción no acredita aplicación.'], sources: ['sync', 'c4'],
    }),
    edge('manage-work', 'country-api', 'country-work', 'Trabajo y resultados ERP', 'Contrato público interno · erp/sync', 'local', {
      summary: 'La API expone trabajo sin incorporar la ACL del proveedor.', description: 'Composición objetivo: erp mantiene destino, referencia y estado ERP; sync mantiene transporte y deduplicación técnica. Estos casos de uso no se atribuyen al scaffold actual.',
      payload: ['Solicitud de trabajo, renovación y resultado.', 'Identidad, ámbito y versión del contrato.'], guarantees: ['ACL y adaptadores se ejecutan en erp-worker.'], failure: ['Una petición autenticada no permite reclamar trabajo de otro ámbito.'], sources: ['c4', 'monorepo'],
    }),
    edge('persist-work', 'country-work', 'country-db', 'Claim, intento y resultado', 'SQL · PostgreSQL', 'data', {
      summary: 'PostgreSQL conserva el historial de integración.', description: 'La asignación temporal de trabajo identifica propietario y vencimiento. Las transiciones condicionales preservan destino, versión e intento, incluso durante cambio de ERP.',
      payload: ['Lease, propietario, destino y versión.', 'Resultado, referencia externa e incertidumbre.'], guarantees: ['Expirar un lease no cancela un efecto externo en ejecución.'], failure: ['Un resultado no registrado se consulta o reentrega; no autoriza reenviar ciegamente el efecto.'], sources: ['c4', 'migration', 'resilience'],
    }),
    edge('fetch-source', 'master-source', 'masters', 'Obtener datos autorizados', 'Interfaz de origen por confirmar', 'sync', {
      status: 'unresolved', summary: 'La autoridad se acuerda por dato y país.', description: 'Debe validarse qué origen produce cada maestro/precio y cómo entrega cambios o cargas completas. No se presupone CDC, eventos ni que el ERP sea dueño de todos los datos.',
      payload: ['Datos comerciales, cobertura y bajas.', 'Versión, vigencias y punto de corte consistente.'], guarantees: ['La copia POS no transfiere la autoría a sucursales.'], failure: ['Sin contrato verificable de integridad no se publica una candidata completa.'], sources: ['pricing', 'c4', 'meetings'],
    }),
    edge('publish-version', 'publisher', 'country-db', 'Publicar versión completa', 'SQL · PostgreSQL', 'data', {
      summary: 'Una candidata validada se vuelve publicación distribuible.', description: 'El contexto de publicación de country-api finaliza la candidata completa con un commit atómico de publicación y conserva manifiesto, versión, corte y evento. El protocolo de carga no mantiene una transacción SQL abierta durante extracción o transferencia.',
      payload: ['Versión y manifiesto con cobertura.', 'Feed de cambios y referencias de artefactos.'], guarantees: ['No expone una mezcla parcial como versión vigente.'], failure: ['La carga fallida conserva la publicación anterior dentro de su vigencia y política.'], sources: ['pricing', 'publication'],
    }),
    edge('prepare-masters', 'erp-worker', 'master-source', 'Preparar publicación', 'Contrato interno de fuente', 'local', { summary: 'Extracción aislada del trabajo financiero.', description: 'El worker compone el adaptador de fuente con presupuesto, identidad y claims de publicación propios.', payload: ['Referencia de publicación, ámbito y corte requerido.'], guarantees: ['No bloquea ni reutiliza claims de comandos financieros.'], failure: ['Un origen no homologado mantiene la publicación pendiente.'], sources: ['publication'] }),
    edge('submit-publication', 'master-source', 'country-api', 'Claim, porciones y finalizar', 'HTTPS saliente autenticado · contrato de publicación', 'async', { summary: 'La preparación entrega datos; país decide su publicación.', description: 'Solicita claim, entrega porciones idempotentes y pide finalización. Country-api valida integridad, cobertura y corte antes del commit de publicación.', payload: ['Claim de publicación, manifiesto, porciones y hashes.'], guarantees: ['Sin SQL remoto ni autoridad del worker para publicar versiones en país.'], failure: ['Una respuesta perdida se consulta con la misma identidad; una candidata incompleta no se publica en país.'], sources: ['publication', 'identity'] }),
    edge('finalize-publication', 'country-api', 'publisher', 'Validar candidata completa', 'Contrato interno de publicación', 'local', { summary: 'La API delega en el contexto dueño de las versiones.', description: 'La finalización valida manifiesto y porciones antes de solicitar el commit de la publicación; no prepara una carga pesada dentro de la petición.', payload: ['Referencia de candidata, claim y manifiesto.'], guarantees: ['La versión publicada cambia sólo después de validación completa.'], failure: ['Claim vencido o contenido incompatible se rechaza sin cambiar la versión publicada.'], sources: ['publication'] }),
    edge('cache-policy', 'country-api', 'cache-port', 'Consulta derivada autorizada', 'Llamada interna · opcional', 'local', {
      status: 'conditional', summary: 'Sólo consultas con frescura tolerada y necesidad medida.', description: 'Se verifica identidad, ámbito y permisos antes de buscar datos. Se selecciona una consulta concreta y su política; no se convierte una respuesta cacheada en aprobación financiera.',
      payload: ['Consulta, país, entidad y alcance de permiso.', 'Versión de dato o contrato.'], guarantees: ['La autorización precede a la lectura.'], failure: ['Falta de autorización se rechaza aunque exista una entrada en Redis.'], sources: ['c4'],
    }),
    edge('cache-read', 'cache-port', 'redis-cache', 'Leer o reconstruir entrada', 'Protocolo Redis · cache-aside', 'data', {
      status: 'conditional', summary: 'Caché descartable con clave y TTL explícitos.', description: 'Las entradas se derivan de PostgreSQL y se aíslan por ámbito/versión. TTL técnico, invalidación y vigencia comercial son contratos distintos; otra clave no constituye aislamiento de seguridad.',
      payload: ['Clave de consulta y valor derivado.', 'TTL y versión de origen.'], guarantees: ['No es la copia única de negocio, pendientes o permisos autorizantes.'], failure: ['Expulsión, expiración o pérdida permiten reconstrucción con límites; no confirman ni revierten dinero.'], sources: ['c4', 'messaging'],
    }),
    edge('cache-fallback', 'cache-port', 'country-db', 'Volver al origen con límites', 'SQL · PostgreSQL', 'data', {
      status: 'conditional', summary: 'Un fallo de caché no elimina la autoridad durable.', description: 'La lectura autorizada al origen controla concurrencia, llenados y tiempos para no saturar PostgreSQL ante una caché fría. La API conserva su camino SQL cuando la opción de caché no se adopta.',
      payload: ['Consulta autorizada y versión requerida.', 'Dato para respuesta y eventual reconstrucción.'], guarantees: ['Límites y estado de origen determinan disponibilidad real.'], failure: ['No se promete fallback ilimitado ni se sirve como válido un resultado no autorizado.'], sources: ['c4', 'resilience'],
    }),
    edge('claim-report', 'erp-worker', 'country-api', 'Solicitar trabajo y reportar', 'HTTPS saliente · autenticado', 'async', {
      summary: 'El worker inicia la conexión desde la red ERP.', description: 'Obtiene trabajo, consulta o renueva asignación y entrega resultados mediante la API. No necesita un endpoint entrante desde país ni credenciales SQL de PostgreSQL de país.',
      payload: ['Operación, destino, contrato e intento.', 'Lease y resultado con referencia externa.'], guarantees: ['La respuesta de trabajo forma parte de la conexión iniciada por el worker.', 'Reporte de resultado es distinto de repetir la operación ERP.'], failure: ['Una respuesta perdida conserva incertidumbre e identidad hasta consulta o conciliación.'], sources: ['c4', 'integration', 'resilience'],
    }),
    edge('execute-adapter', 'erp-worker', 'erp-acl', 'Ejecutar capacidad POS', 'Llamada TypeScript interna', 'local', {
      summary: 'La fachada y ACL están dentro del mismo proceso.', description: 'Admisión, ventanas y límites del worker gobiernan ejecución; la ACL traduce significado y el adaptador resuelve protocolo. No se ubican reglas comerciales ni reintentos monetarios genéricos en la traducción AX.',
      payload: ['Comando POS y contexto persistido.', 'Destino e intento originales.'], guarantees: ['No crea tres servicios por separar fachada, ACL y adaptador.'], failure: ['Capacidad no homologada o traducción incompatible se rechaza con evidencia.'], sources: ['contracts', 'resilience'],
    }),
    edge('send-erp', 'erp-acl', 'erp', 'Enviar o consultar resultado', 'API / WCF / SDK por homologar', 'sync', {
      summary: 'Contrato específico de la instancia ERP elegida.', description: 'Chile AX, Perú ICS custom y España Gira requieren validar capacidades propias. La operación no se envía a todos los destinos y no abre tablas ERP a clientes o sucursales.',
      payload: ['Modelo traducido, referencia estable y ámbito ERP.', 'Resultado externo, rechazo o referencia consultable.'], guarantees: ['Destino y versión quedan fijados al intento.', 'La llamada externa no participa en una transacción SQL distribuida.'], failure: ['Timeout no significa rechazo; se consulta/conciliará antes de repetir efectos según la capacidad real.'], sources: ['integration', 'contracts', 'migration'],
    }),
    edge('payment-api', 'branch-api', 'payments', 'Pago por API habilitada', 'API del proveedor · por homologar', 'sync', {
      status: 'conditional', summary: 'Ruta elegible cuando el proveedor permite API de backend.', description: 'Payments persiste intención antes de invocar, preserva identidad e importe y registra el resultado después. La ruta SDK es una alternativa de proveedor, no otro cobro para el mismo intento.',
      payload: ['Intento autorizado, importe y moneda.', 'Referencia y resultado de pago.'], guarantees: ['Sin SQL abierto mientras espera al proveedor.'], failure: ['Resultado incierto exige consulta o resolución controlada, no cambio automático de proveedor.'], sources: ['providers', 'resilience'],
    }),
    edge('fiscal-api', 'branch-api', 'fiscal', 'Emitir y consultar documento', 'Contrato fiscal validado por país', 'sync', {
      status: 'conditional', summary: 'Modalidad fiscal independiente de venta y pago.', description: 'El contexto fiscal conserva solicitud, documento y estados del emisor. La ejecución local, central o remota depende del régimen y proveedor homologados; esta flecha expresa el contrato lógico.',
      payload: ['Documento identificado y datos fiscales autorizados.', 'Estado, referencia y respuesta del emisor.'], guarantees: ['Confirmación local o ACK de sincronización no acreditan aceptación fiscal.'], failure: ['Timeout o rechazo conservan referencia y excepción; no se borra la venta ni se reemite ciegamente.'], sources: ['fiscal', 'providers'],
    }),
    edge('device-jobs-local', 'branch-api', 'branch-db', 'Conservar trabajos y observaciones', 'PostgreSQL · contexto devices de sucursal', 'data', {
      summary: 'Devices es dueño del trabajo autorizado y su evidencia en sucursal.', description: 'El contexto devices de branch-api persiste jobId/commandId, hash, documento/versión, plantilla, binding, agente/dispositivo asignados y auditoría antes de hacer disponible un trabajo. Al recibir una observación identificada, la valida y confirma en PostgreSQL antes de devolver su acuse al agente. No reabre ventas ni reemite fiscalmente un documento por imprimirlo.',
      payload: ['Trabajo autorizado, destino, versión y estado de asignación.', 'Observaciones por intento, referencias de dispositivo, certeza y auditoría.'], guarantees: ['Unicidad de trabajo/observación y hash coherente permiten reconocer reentregas.', 'La transacción PostgreSQL no incluye SQLite, spooler ni dispositivo.'], failure: ['Si falla el commit no hay acuse durable ni trabajo disponible para ejecutar.', 'Una copia intencional usa un nuevo jobId autorizado y referencia al documento original.'], sources: ['devices', 'providers', 'resilience'],
    }),
    edge('device-command', 'bridge', 'branch-api', 'Obtener trabajos autorizados', 'HTTPS · LAN · iniciado por device-agent', 'async', {
      summary: 'El agente obtiene trabajo de sucursal con su propia identidad.', description: 'Device-agent inicia el canal autenticado hacia branch-api. La sucursal valida asignación y entrega trabajos persistidos con jobId/commandId, hash y binding fijo. F02 admite dispositivos asignados al puesto solicitante y rechaza destinos de otro puesto; F06 amplía la política a estaciones compartidas y clientes móviles homologados. Ningún cliente actúa como relé obligatorio. El agente registra recepción durable antes del acuse y limita admisión por capacidad y estado del dispositivo.',
      payload: ['Identidad de agente, sucursal y dispositivos asignados.', 'Trabajo autorizado, documento/versión, plantilla, hash, destino e intento.'], guarantees: ['La conexión es saliente desde el agente; no requiere exponer un puerto del PC a móviles.', 'Un solo controlador autorizado por periférico; un lease vencido no habilita otro ejecutor mientras el anterior pueda seguir activo.'], failure: ['Sin LAN no se admiten trabajos nuevos; recuperar el mismo ID no crea una nueva ejecución.', 'Cambiar destino exige resolver el intento previo; no reenrutar automáticamente una impresión incierta.'], sources: ['devices', 'providers', 'identity'],
    }),
    edge('agent-journal', 'bridge', 'device-journal', 'Persistir recepción y evidencia', 'SQLite · acceso local de device-agent', 'data', {
      summary: 'El diario técnico permite reconocer reentregas y recuperar resultados.', description: 'El agente confirma recepción después de persistir jobId/commandId, hash y binding; conserva intentos y observaciones para reenviarlos hasta el acuse durable de branch-api. Una transacción SQLite no incluye spooler, terminal ni efectos físicos. La retención cubre reentrega y recuperación; no se purga inmediatamente al recibir un acuse.',
      payload: ['Trabajo, intento, estado de recepción y hash.', 'Referencia del dispositivo, resultado observado y acuse de sucursal.'], guarantees: ['Mismo ID y hash recuperan el trabajo; mismo ID con contenido distinto se rechaza.', 'SQLite es evidencia técnica, no otra base de ventas.'], failure: ['Disco lleno o diario no disponible impiden admitir un efecto nuevo sin registro durable.', 'Una salida física sin evidencia suficiente queda incierta; no se reimprime automáticamente.'], sources: ['devices', 'providers', 'resilience'],
    }),
    edge('hardware-command', 'bridge', 'devices', 'F02 · ejecutar en el puesto', 'USB / serie / driver / SDK local homologado', 'local', {
      status: 'conditional', summary: 'Impresión y MICR dedicados al puesto Windows.', description: 'F02 device-agent ejecuta sólo capacidades asignadas a ese puesto y serializadas por periférico; F05 pilota el mismo perfil. El SDK, driver, arquitectura y contexto de servicio o sesión requieren pruebas reales: C# no vuelve compatible PrintDocument con un servicio Windows. Evidencia técnica y efecto físico se confirman en momentos distintos. El parecido con el legado es de ubicación física; la autorización y el trabajo durable pertenecen a branch-api. Compartir desde móvil o red se habilita después en F06.',
      payload: ['Comando identificado, binding de puesto y parámetros limitados.', 'Respuesta o evidencia que ofrezca el equipo.'], guarantees: ['Un comando técnico no crea otra venta.', 'El mismo dispositivo tiene un único controlador activo; impresión, lectura y endoso comparten exclusión.'], failure: ['Fallo o respuesta perdida conservan incertidumbre física; aceptar spooler no prueba impresión.', 'Un helper de sesión se incorpora únicamente cuando un SDK homologado lo exige.'], sources: ['devices', 'roadmap', 'providers'],
    }),
    edge('network-hardware-command', 'bridge', 'network-devices', 'F06 · ejecutar por red', 'LAN · protocolo / driver / SDK homologado', 'sync', {
      status: 'conditional', summary: 'Expansión posterior para recibos y etiquetas compartidos.', description: 'F06-05 homologa el protocolo del modelo, su descubrimiento/configuración y el perfil de estación compartida. La misma aplicación device-agent controla el dispositivo con identidad y asignación únicas; branch-api autoriza qué puestos o móviles pueden usarlo. La ubicación física del agente se certifica por instalación. No basta habilitar una dirección IP ni copiar un driver del puesto para declarar soporte de red.',
      payload: ['Trabajo autorizado, dispositivo fijo, formato y bytes limitados por contrato.', 'Referencia y estado técnico disponible en el periférico.'], guarantees: ['Un único controlador activo por dispositivo y exclusión compartida entre clientes.', 'Mismo jobId/hash y diario SQLite; no se agregan apps ni brokers obligatorios.'], failure: ['Timeout, reconexión o lease vencido conservan incertidumbre; no redirigen ni reimprimen por defecto.', 'MICR, cajón, pagos y USB/Bluetooth móvil directo necesitan homologación separada.'], sources: ['devices', 'roadmap', 'providers', 'identity'],
    }),
    edge('payment-sdk', 'bridge', 'payments', 'Pago mediante SDK local', 'SDK / terminal del proveedor', 'sync', {
      status: 'conditional', summary: 'Extensión por homologar, alternativa a la API remota.', description: 'Representa una futura capacidad de device-agent sólo cuando el proveedor exige SDK o terminal y se aprueba su contrato. No acredita una integración Transbank ni amplía el alcance de api-impresion-caja a pagos. El agente ejecuta el intento fijado por backend; para la misma operación no se activa también la API remota.',
      payload: ['Identidad de operación e intento, binding e importe autorizado.', 'Referencia técnica y resultado del proveedor.'], guarantees: ['Device-agent no concede permisos ni recalcula dinero.', 'Todos los intentos conservan proveedor, comercio y dispositivo originales mientras el efecto siga incierto.'], failure: ['Una caída LAN posterior al cobro requiere recuperar evidencia y conciliar, no cobrar otra vez.'], sources: ['devices', 'providers', 'resilience'],
    }),
    edge('worker-library', 'erp-worker', 'bullmq', 'Opción de jobs internos', 'API de librería Node.js', 'local', {
      status: 'conditional', summary: 'BullMQ se compone dentro del worker si se adopta.', description: 'Es una ubicación ilustrativa para tareas delimitadas; responsabilidad y backend siguen por validar. El trabajo comercial se reclama por HTTPS y conserva registro autoritativo en PostgreSQL.',
      payload: ['Referencia de trabajo e intento.', 'Opciones de concurrencia, programación y reintento acotadas.'], guarantees: ['No representa otra app ni elimina el protocolo de país.'], failure: ['Añadir un job no prueba atomicidad con negocio; se conserva la outbox y la recuperación del contrato.'], sources: ['messaging', 'c4'],
    }),
    edge('queue-store', 'bullmq', 'redis-jobs', 'Persistir estado del job', 'Protocolo Redis · opción seleccionable', 'data', {
      status: 'conditional', summary: 'Almacén de jobs separado de la caché descartable.', description: 'Esta flecha ilustra únicamente el backend Redis. Su persistencia y capacidad se configuran y prueban; BullMQ también ofrece un backend PostgreSQL que requiere evaluación propia.',
      payload: ['Jobs, progreso e intentos técnicos.', 'Metadatos necesarios para recuperar ejecución.'], guarantees: ['Instancia distinta de Redis caché; no basta otra base lógica.', 'Política noeviction para el almacén de jobs.'], failure: ['Sin capacidad se limita admisión; no se permite expulsar trabajos ni declarar éxito por encolarlos.'], sources: ['c4', 'messaging'],
    }),
    edge('queue-execution', 'bullmq', 'erp-acl', 'Ejecutar tarea admitida', 'Callback en el mismo worker', 'local', {
      status: 'conditional', summary: 'El job invoca la capacidad interna con identidad original.', description: 'Es una alternativa al ejecutor básico para la tarea asignada, no una segunda ejecución paralela. Las condiciones de negocio y el tratamiento de incertidumbre permanecen en el caso de uso.',
      payload: ['Referencia del trabajo confirmado y contexto original.'], guarantees: ['El callback no obtiene autoridad para cambiar destino o repetir un efecto desconocido.'], failure: ['Reintentar un job requiere distinguir reentrega de resultado de reejecución del efecto externo.'], sources: ['messaging', 'resilience'],
    }),
    edge('broker-candidate', 'country-work', 'rabbitmq', 'Transporte por definir', 'AMQP · contrato pendiente', 'async', {
      relation: 'evaluation',
      status: 'unresolved', summary: 'Relación de evaluación, no un flujo AMQP seleccionado.', description: 'Marca dónde evaluar distribución independiente de trabajo de país si aparece esa necesidad. No asigna a country-api el publicador ni a erp-worker un consumidor: productores, colas, consumidores y propietarios necesitan una decisión posterior.',
      payload: ['Contrato de mensaje y topología todavía por definir.'], guarantees: ['La ruta base sigue siendo PostgreSQL + HTTPS.', 'RabbitMQ no se añade junto a BullMQ para duplicar la misma tarea.'], failure: ['Confirmaciones de broker no sustituyen commit de consumidor, deduplicación ni conciliación ERP.'], sources: ['c4', 'messaging'],
    }),
    ...[
      ['branch-diagnostic', 'branch-api'], ['sync-diagnostic', 'branch-sync'],
      ['country-diagnostic', 'country-api'], ['erp-diagnostic', 'erp-worker'],
    ].map(([id, from]) => edge(id, from, 'observability', 'Diagnóstico y correlación', 'Salida técnica · destino aprobado', 'async', {
      status: 'conditional', summary: 'Telemetría técnica separada de la auditoría comercial.', description: 'Pino emite logs del proceso; un colector externo y Sentry se habilitan expresamente con datos permitidos y límites. El scaffold no acredita monitoreo productivo ni trazas distribuidas completas.',
      payload: ['Servicio, release, correlación y error técnico filtrado.'], guarantees: ['Sin secretos ni contenido comercial crudo.', 'Los logs no reemplazan auditoría, inbox/outbox ni backups.'], failure: ['La caída del destino de telemetría no confirma ni revierte negocio; buffers y descarte deben estar limitados.'], sources: ['monorepo', 'technology', 'c4'],
    })),
    edge('bridge-evidence', 'bridge', 'branch-api', 'Reportar evidencia y recuperar acuse', 'HTTPS · LAN · iniciado por device-agent', 'async', {
      summary: 'El resultado se reporta sin depender de la ventana del cliente.', description: 'Device-agent envía observaciones identificadas y conserva su diario hasta que branch-api confirma el commit vinculado al trabajo e intento. Si se pierde el acuse, reenvía la misma observación; no repite el efecto. Escritorio y móvil consultan el resultado en branch-api. Ni cerrar la UI ni perder una respuesta demuestra que el dispositivo no actuó.',
      payload: ['jobId/commandId, intento, observationId, hash y referencia del dispositivo.', 'Estado observado, certeza, error tipado y evidencia disponible.'], guarantees: ['La confirmación comercial permanece en backend.', 'El acuse de sucursal sucede después de persistir la observación; no significa impresión física.'], failure: ['Sin evidencia suficiente se conserva incertidumbre para consulta o conciliación.', 'Un reenvío de resultado no es un nuevo comando al dispositivo.'], sources: ['devices', 'providers', 'resilience'],
    }),
  ],
  scenarios: [
    { id: 'local-sale', title: 'Venta local autorizada', description: 'Recorrido de la operación local; pago, fiscalidad y continuidad dependen del alcance homologado.', steps: [
      { title: 'Identificar y autorizar', description: 'El cliente solicita el comando y branch-api valida identidad, ámbito, turno y permisos.', nodes: ['desktop', 'branch-api', 'access'], edges: ['desktop-api', 'command-access'] },
      { title: 'Cotizar con datos locales', description: 'Pricing consulta la versión PostgreSQL autorizada y revalida vigencia antes del pago.', nodes: ['branch-api', 'pricing', 'branch-db'], edges: ['quote-pricing', 'read-prices'] },
      { title: 'Confirmar con auditoría y outbox', description: 'Los efectos locales acordados comparten un commit. No se mantiene SQL abierto para esperar al ERP.', nodes: ['branch-api', 'transaction', 'branch-db'], edges: ['commit-operation', 'commit-local'] },
      { title: 'Conservar pendientes sin Internet', description: 'El worker continúa independiente de la ventana del cliente y retiene los eventos. Perder LAN o escritor detiene nuevos comandos dependientes.', nodes: ['branch-sync', 'branch-db'], edges: ['sync-local'] },
    ] },
    { id: 'country-erp', title: 'Recepción de país y resultado ERP', description: 'El ACK durable de país y el resultado ERP son hitos diferentes.', steps: [
      { title: 'Entregar con identidad estable', description: 'La sucursal inicia HTTPS y reintenta los mismos eventos si pierde el acuse.', nodes: ['branch-sync', 'country-api'], edges: ['sync-country'] },
      { title: 'Confirmar recepción aplicada', description: 'País confirma inbox, proyección pactada y outbox antes del ACK; no afirma contabilización ERP.', nodes: ['country-api', 'country-db'], edges: ['accept-country'] },
      { title: 'Reclamar trabajo desde la red ERP', description: 'erp-worker inicia HTTPS hacia country-api. El claim conserva ámbito, destino, versión y vencimiento.', nodes: ['erp-worker', 'country-api', 'country-work', 'country-db'], edges: ['claim-report', 'manage-work', 'persist-work'] },
      { title: 'Traducir y ejecutar', description: 'Fachada, ACL y adaptador internos invocan una capacidad homologada del ERP seleccionado.', nodes: ['erp-worker', 'erp-acl', 'erp'], edges: ['execute-adapter', 'send-erp'] },
      { title: 'Registrar o conciliar resultado', description: 'Respuesta perdida o lease vencido no autorizan repetir efectos. El worker consulta o concilia y reporta mediante la API.', nodes: ['erp', 'erp-acl', 'erp-worker', 'country-api', 'country-work', 'country-db'], edges: ['send-erp', 'claim-report', 'manage-work', 'persist-work'] },
    ] },
    { id: 'commercial-version', title: 'Precios: origen, publicación y activación', description: 'Deltas, carga programada y recuperación manual usan el mismo contrato de validación.', steps: [
      { title: 'Preparar desde el origen autorizado', description: 'El adaptador de maestros en erp-worker obtiene un corte consistente. Identidad, claims y presupuesto de publicación se aíslan de los comandos financieros.', nodes: ['masters', 'master-source', 'erp-worker'], edges: ['fetch-source', 'prepare-masters'] },
      { title: 'Publicar una versión completa', description: 'El worker entrega porciones por HTTPS. Country-api valida cobertura, integridad y vigencia antes de confirmar manifiesto, versión y evento; ninguna descarga parcial activa una versión.', nodes: ['master-source', 'country-api', 'publisher', 'country-db'], edges: ['submit-publication', 'finalize-publication', 'publish-version'] },
      { title: 'Descargar sin alterar la activa', description: 'La sucursal consulta versiones y persiste staging/cursor recibido. Recibir bytes no implica aplicación.', nodes: ['branch-sync', 'country-api', 'country-db', 'branch-db'], edges: ['sync-country', 'accept-country', 'sync-local'] },
      { title: 'Activar y cotizar', description: 'Tras validar, un commit corto cambia puntero, inbox aplicada y cursor aplicado. Las cotizaciones se revalidan; un pago iniciado conserva importe e identidad.', nodes: ['branch-sync', 'branch-db', 'pricing', 'branch-api'], edges: ['sync-local', 'read-prices', 'quote-pricing'] },
    ] },
    { id: 'local-printing', title: 'F02 · impresión en el puesto', description: 'Perfil inicial: device-agent C#/.NET y diario SQLite en cada puesto Windows conectado al hardware. F05 pilota este perfil; compartir dispositivos, red y móvil son expansión F06.', steps: [
      { title: 'Autorizar el destino del puesto', description: 'Pos-desktop solicita imprimir un documento existente mediante branch-api. La API valida usuario, turno, sucursal y el dispositivo asignado al puesto; rechaza destinos de otra caja. Devices conserva trabajo, hash y binding antes de entregarlo.', nodes: ['desktop', 'branch-api', 'access', 'branch-db'], edges: ['desktop-api', 'command-access', 'device-jobs-local'] },
      { title: 'Recibir sin depender de la UI', description: 'El agente del mismo puesto inicia HTTPS LAN a branch-api. Registra jobId, hash y recepción en SQLite antes del acuse. Cerrar la ventana Angular/Tauri no interrumpe su ciclo de recuperación; no se expone una API localhost anónima.', nodes: ['bridge', 'branch-api', 'device-journal'], edges: ['device-command', 'agent-journal'] },
      { title: 'Ejecutar en el hardware local', description: 'El agente usa el driver o SDK homologado de impresora USB/serie, Zebra o MICR local. Serializa todas las capacidades del mismo dispositivo. La aceptación por el spooler conserva su significado técnico y no acredita papel impreso.', nodes: ['bridge', 'device-journal', 'devices'], edges: ['agent-journal', 'hardware-command'] },
      { title: 'Recuperar y consultar evidencia', description: 'El agente conserva observaciones y las reporta directamente a branch-api; el acuse ocurre después del commit. Una respuesta perdida no provoca otra impresión. Una copia intencional exige un nuevo trabajo autorizado y su motivo.', nodes: ['bridge', 'device-journal', 'branch-api', 'branch-db', 'desktop'], edges: ['agent-journal', 'bridge-evidence', 'device-jobs-local', 'desktop-api'] },
    ] },
    { id: 'shared-printing', title: 'F06 · red, estación compartida y móvil', description: 'Evolución posterior al piloto F05: recibos y etiquetas en red, estación compartida y acceso móvil autorizado, con matriz de hardware y pruebas de concurrencia. Usa la misma aplicación device-agent; no es alcance inicial F02.', steps: [
      { title: 'Autorizar la estación compartida', description: 'Tras homologar F06, móvil o escritorio solicita imprimir un documento existente. Branch-api valida ámbito y permiso del destino compartido; devices conserva jobId, hash, documento/versión, plantilla y binding. MICR, cajón y pagos no se comparten automáticamente.', nodes: ['mobile', 'desktop', 'branch-api', 'access', 'branch-db'], edges: ['mobile-api', 'desktop-api', 'command-access', 'device-jobs-local'] },
      { title: 'Recibir con el agente asignado', description: 'La misma app device-agent corre en la estación Windows autorizada; sólo puede coincidir con el servidor si sus drivers y operación se homologan. Inicia HTTPS a sucursal y registra trabajo y hash en SQLite. Se conserva el protocolo durable de F02.', nodes: ['bridge', 'branch-api', 'device-journal'], edges: ['device-command', 'agent-journal'] },
      { title: 'Ejecutar en la impresora de red', description: 'El único controlador activo serializa solicitudes de clientes y utiliza el protocolo LAN/driver homologado para recibos o etiquetas. Registra intento y evidencia. Estar en red no acredita uso compartido ni convierte aceptación del spooler en impresión física.', nodes: ['bridge', 'device-journal', 'network-devices'], edges: ['agent-journal', 'network-hardware-command'] },
      { title: 'Recuperar evidencia sin reimprimir', description: 'Si se cierra la UI o se pierde LAN, el agente conserva observaciones y las reporta al reconectar. Branch-api acusa después del commit. Ante pérdida del acuse se reenvía la misma observación, nunca se vuelve a imprimir por defecto.', nodes: ['bridge', 'device-journal', 'branch-api', 'branch-db'], edges: ['agent-journal', 'bridge-evidence', 'device-jobs-local'] },
      { title: 'Consultar o solicitar una copia', description: 'Móvil y escritorio consultan el mismo resultado en branch-api. Una copia intencional requiere un nuevo trabajo autorizado con motivo y referencia al documento original. La reasignación de dispositivo exige resolver el efecto anterior.', nodes: ['mobile', 'desktop', 'branch-api'], edges: ['mobile-api', 'desktop-api'] },
    ] },
    { id: 'uncertain-payment', title: 'Pago y evidencia incierta', description: 'Extensión de pagos por SDK local sujeta a homologación; no es una integración Transbank implementada. La API remota es otra ruta según proveedor y no se ejecuta además para el mismo efecto.', steps: [
      { title: 'Autorizar y persistir la intención', description: 'El puesto solicita el pago. Branch-api valida permisos y conserva operación, intento, importe, moneda y binding antes del efecto; la transacción no abarca la espera del proveedor.', nodes: ['desktop', 'mobile', 'branch-api', 'access', 'transaction', 'branch-db'], edges: ['desktop-api', 'mobile-api', 'command-access', 'commit-operation', 'commit-local'] },
      { title: 'Ejecutar mediante el SDK local', description: 'Device-agent obtiene el comando de branch-api y registra su recepción en SQLite. Si la capacidad está homologada, invoca el SDK con la misma identidad e importe; no usa también la API remota para esa operación.', nodes: ['branch-api', 'bridge', 'device-journal', 'payments'], edges: ['device-command', 'agent-journal', 'payment-sdk'] },
      { title: 'Recuperar con la misma identidad', description: 'Si el cobro ocurrió y después cayó la LAN, el agente conserva evidencia y consulta el resultado cuando el contrato lo permite. Reporta directamente a branch-api sin esperar a la UI; la falta de evidencia mantiene incertidumbre, no autoriza otro cargo.', nodes: ['payments', 'bridge', 'device-journal', 'branch-api'], edges: ['payment-sdk', 'agent-journal', 'bridge-evidence'] },
      { title: 'Separar documento e impresión', description: 'Pago, documento fiscal y salida física conservan estados propios. Imprimir utiliza otro trabajo identificado obtenido por device-agent; una copia del documento no repite cobro ni emisión fiscal.', nodes: ['branch-api', 'fiscal', 'bridge', 'devices'], edges: ['fiscal-api', 'device-command', 'hardware-command'] },
    ] },
    { id: 'optional-cache', title: 'Caché opcional de país', description: 'Sólo para consultas derivadas medidas; PostgreSQL sigue siendo la autoridad.', steps: [
      { title: 'Autorizar antes de leer', description: 'País, entidad y permisos limitan el resultado antes de buscar una clave.', nodes: ['country-api', 'cache-port'], edges: ['cache-policy'] },
      { title: 'Usar o reconstruir la entrada', description: 'Redis conserva una copia descartable con versión y TTL; no un saldo autorizante ni el único registro de pendientes.', nodes: ['cache-port', 'redis-cache'], edges: ['cache-read'] },
      { title: 'Proteger al origen', description: 'Miss o caída derivan a PostgreSQL con límites de carga, espera y llenado. La ausencia de caché no equivale a capacidad ilimitada del origen.', nodes: ['cache-port', 'country-db'], edges: ['cache-fallback'] },
    ] },
    { id: 'optional-jobs', title: 'BullMQ y RabbitMQ: alternativas delimitadas', description: 'Se muestran para decidir con evidencia; ninguna es dependencia inicial ni prueba de exactly-once.', steps: [
      { title: 'Conservar el contrato base', description: 'erp-worker obtiene trabajo mediante HTTPS. PostgreSQL de país sigue conservando intentos, destino y resultados.', nodes: ['erp-worker', 'country-api', 'country-work', 'country-db'], edges: ['claim-report', 'manage-work', 'persist-work'] },
      { title: 'Evaluar tareas internas con BullMQ', description: 'Si se asigna una tarea a la librería dentro del worker, el backend definitivo debe validarse. Aquí se ilustra Redis separado de caché, con persistencia y noeviction.', nodes: ['erp-worker', 'bullmq', 'redis-jobs'], edges: ['worker-library', 'queue-store'] },
      { title: 'Ejecutar sin duplicar el efecto', description: 'El callback usa la misma capacidad e identidad. Reintentar un job no elimina la incertidumbre del ERP ni autoriza otro cargo.', nodes: ['bullmq', 'erp-acl', 'erp'], edges: ['queue-execution', 'send-erp'] },
      { title: 'Evaluar transporte independiente', description: 'RabbitMQ se considera sólo para routing o consumidores independientes. Productores, colas y consumidores no están seleccionados; no se agrega para duplicar la tarea de BullMQ.', nodes: ['country-work', 'rabbitmq'], edges: ['broker-candidate'] },
    ] },
    { id: 'recovery', title: 'Restauración y retorno controlado', description: 'Procedimiento propuesto: requiere copia independiente, retención, objetivos aprobados y ensayo. No acredita alta disponibilidad ni RPO cero.', steps: [
      { title: 'Detener y excluir al escritor anterior', description: 'Ante pérdida del servidor de sucursal se detienen comandos dependientes. Antes de habilitar un reemplazo se excluye al escritor anterior; una caja no crea otra base por su cuenta.', nodes: ['desktop', 'mobile', 'branch-api', 'branch-db'], edges: ['desktop-api', 'mobile-api'] },
      { title: 'Restaurar y comprobar integridad', description: 'Operación y DBA restauran desde una copia independiente y verifican esquema, identidad de instalación, secuencias, referencias y resultado de comandos. Una copia en el mismo disco no cubre su pérdida. La retención y RPO se contrastan con evidencia, no se deducen del commit.', nodes: ['branch-api', 'transaction', 'branch-db', 'branch-sync'], edges: ['commit-operation', 'commit-local', 'sync-local'] },
      { title: 'Reconstruir custodia sin repetir negocio', description: 'Se comparan acuses y cursores con país. Si país retrocedió respecto de un ACK, se reconstruye desde eventos de origen o archivo retenidos; se conservan IDs y se detectan huecos. No se purga la única copia recuperable.', nodes: ['branch-sync', 'branch-db', 'country-api', 'country-db'], edges: ['sync-local', 'sync-country', 'accept-country'] },
      { title: 'Conciliar efectos externos inciertos', description: 'ERP, pago o documento pueden haber avanzado más que la copia restaurada. Se consultan referencias originales o se aplica resolución controlada; perder un registro local no autoriza cobrar, emitir o contabilizar otra vez.', nodes: ['erp-worker', 'erp-acl', 'erp', 'country-api', 'branch-api', 'payments', 'fiscal'], edges: ['claim-report', 'execute-adapter', 'send-erp', 'payment-api', 'fiscal-api'] },
      { title: 'Reabrir por alcance con evidencia', description: 'Sólo después de verificar escritor único, datos, permisos y conciliación se habilitan las capacidades válidas. Se prueba un caudal limitado y se mide recuperación con tráfico nuevo; las capacidades aún inciertas siguen restringidas.', nodes: ['desktop', 'branch-api', 'access', 'branch-sync', 'country-api'], edges: ['desktop-api', 'command-access', 'sync-country'] },
    ] },
  ],
};
