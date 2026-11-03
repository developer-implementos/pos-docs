/**
 * State projections reviewed against explicit guards and mutations in one product
 * revision. These describe source behavior, not provider/hardware certification.
 * Keep the predicates authoritative; do not generate transitions from enum values.
 */
const repository = 'https://github.com/developer-implementos/pos-platform';
const commit = '98f8987bfa8764ab77f6a55a7686f2ed7884d541';
const evidence = (path, line, end_line) => ({ path, line, end_line });
const node = (id, label, kind, description, ...sources) => ({ id, label, kind, description, evidence: sources });
const edge = (from, to, label, description, ...sources) => ({ from, to, label, description, evidence: sources });
const meta = (scope, limitations) => ({ repository, commit, evidenceKind: 'source-inspection', scope, limitations });

const drafts = 'libs/backend/sales/src/application/drafts.facade.ts';
const draftGuard = 'libs/backend/sales/src/infrastructure/draft-migration.ts';
const paidSale = 'libs/backend/sales/src/application/paid-sale.service.ts';
const paymentService = 'libs/backend/payments/src/application/payments.service.ts';
const paymentStore = 'libs/backend/payments/src/infrastructure/payment.store.ts';
const paymentGuard = 'libs/backend/payments/src/infrastructure/payment-migrations.ts';
const fiscal = 'libs/backend/fiscal/src/application/fiscal.facade.ts';
const fiscalEvidence = 'libs/backend/fiscal/src/domain/evidence.ts';
const device = 'libs/backend/devices/src/application/device.service.ts';
const deviceStore = 'libs/backend/devices/src/infrastructure/device.repository.ts';

export const lifecycles = [
  {
    id: 'state-sale', title: 'Cesta y confirmación de venta', status: 'implemented',
    source: '/guide/flows/sale/',
    description: 'Estados de la cesta de venta: pausarla, recuperarla o confirmarla conserva reglas distintas a pago, fiscalidad y ERP.',
    meta: meta('Proyección de Draft.status y de su confirmación; código de la revisión indicada.', 'La venta confirmada tiene estados separados de pago, fiscalidad y ERP. Este gráfico no representa devolución ni aceptación productiva.'),
    mainPath: ['active', 'confirmed'],
    states: [
      node('active', 'Activa', 'start', 'Cesta editable sujeta a versión, vencimiento, permisos y configuración del puesto.', evidence(drafts, 47, 97)),
      node('paused', 'Pausada', 'waiting', 'Revoca cotización y autorización de descuento. Reanudar exige volver a validar la operación.', evidence(drafts, 312, 360)),
      node('confirmed', 'Confirmada', 'success', 'La confirmación persiste la venta y su evidencia en la transacción. La cesta queda inmutable.', evidence(drafts, 285, 309), evidence(paidSale, 125, 195), evidence(draftGuard, 52, 70)),
      node('cancelled', 'Cancelada', 'failure', 'Cancelación de la cesta con motivo. No es una reversa de una venta ya confirmada.', evidence(drafts, 268, 270), evidence(drafts, 312, 360), evidence(draftGuard, 52, 70)),
    ],
    transitions: [
      edge('active', 'paused', 'Pausar', 'Sólo desde activa; exige vigencia y versión esperada, y revoca autorizaciones de la cesta.', evidence(drafts, 332, 360)),
      edge('paused', 'active', 'Reanudar o recuperar', 'Reanudar valida vigencia. Recuperar en otro puesto valida además configuración, destinatario y contexto autenticado.', evidence(drafts, 197, 260), evidence(drafts, 332, 360)),
      edge('active', 'confirmed', 'Confirmar venta', 'Bloquea la cesta activa, verifica cotización y requisitos de cobro y persiste la confirmación con control de versión.', evidence(drafts, 273, 309), evidence(paidSale, 125, 195)),
      edge('active', 'cancelled', 'Cancelar con motivo', 'Cancela la cesta editable; una venta confirmada no admite esta transición.', evidence(drafts, 268, 270), evidence(drafts, 332, 360)),
      edge('paused', 'cancelled', 'Cancelar con motivo', 'Una cesta pausada puede cancelarse sin ejecutarse; mantiene evidencia de la transición.', evidence(drafts, 268, 270), evidence(drafts, 332, 360)),
    ],
  },
  {
    id: 'state-payment', title: 'Intento de cobro al proveedor', status: 'implemented',
    source: '/guide/flows/payments/',
    description: 'El intento se despacha una vez. La incertidumbre se resuelve consultando el mismo cobro, sin autorizar otro cargo.',
    meta: meta('Proyección de PaymentIntent.state y de la evidencia de cargo/consulta.', 'No representa efectivo, plan de pagos ni compensaciones. Inspección del código; no acredita un adaptador bancario homologado. Se omiten actualizaciones que mantienen el mismo estado.'),
    mainPath: ['created', 'dispatching', 'approved'],
    states: [
      node('created', 'Creado', 'start', 'Identidad, importe y destino congelados. Aún puede cancelarse antes del despacho.', evidence(paymentStore, 201, 225), evidence(paymentService, 136, 151)),
      node('dispatching', 'Despachando', 'active', 'Existe un intento durable antes de llamar al proveedor. Un replay no vuelve a ejecutar el cargo.', evidence(paymentService, 180, 205), evidence(paymentStore, 314, 362)),
      node('approved', 'Aprobado', 'success', 'Evidencia coincidente y recibo reclamado sin duplicación. Un conflicto posterior exige conciliación.', evidence(paymentStore, 364, 421)),
      node('declined', 'Rechazado', 'failure', 'Resultado negativo del proveedor para este intento. Un resultado contradictorio posterior no lo reemplaza.', evidence(paymentStore, 364, 421)),
      node('uncertain', 'Incierto', 'waiting', 'No hay resultado concluyente. La consulta debe identificar la operación; no se permite volver a despachar.', evidence(paymentStore, 344, 377), evidence(paymentService, 180, 202)),
      node('reconciliation-required', 'Conciliación requerida', 'decision', 'Evidencia conflictiva o recibo ya atribuido. El terminal se pone en cuarentena; no hay salida automática de este estado.', evidence(paymentStore, 373, 419), evidence(paymentGuard, 43, 48)),
      node('cancelled', 'Cancelado', 'neutral', 'Cancelado antes de ejecutar el cargo; no se confunde con anulación o devolución de dinero.', evidence(paymentService, 136, 151)),
    ],
    transitions: [
      edge('created', 'dispatching', 'Ejecutar una vez', 'Admite únicamente created y registra el intento antes de invocar al proveedor.', evidence(paymentService, 180, 205), evidence(paymentStore, 314, 362)),
      edge('created', 'cancelled', 'Cancelar sin cargo', 'La cancelación sólo se admite mientras el intento permanece created.', evidence(paymentService, 136, 151)),
      edge('dispatching', 'approved', 'Evidencia válida', 'Importe, identidad y destino coinciden, y el recibo no pertenece a otro cobro.', evidence(paymentStore, 364, 421)),
      edge('dispatching', 'declined', 'Rechazo confirmado', 'Una observación válida declined establece el resultado negativo.', evidence(paymentStore, 364, 421)),
      edge('dispatching', 'uncertain', 'Sin resultado cierto', 'Respuesta desconocida/ausente o consulta de un despacho abierto: conserva incertidumbre.', evidence(paymentStore, 344, 377)),
      edge('uncertain', 'approved', 'Consultar y confirmar', 'Consulta por clave de operación y evidencia válida de aprobación; no ejecuta un cargo nuevo.', evidence(paymentService, 180, 202), evidence(paymentStore, 364, 421)),
      edge('uncertain', 'declined', 'Consultar y descartar', 'La consulta obtiene rechazo válido para la misma operación.', evidence(paymentService, 180, 202), evidence(paymentStore, 364, 421)),
      ...['dispatching', 'uncertain', 'approved', 'declined'].map(from => edge(from, 'reconciliation-required', 'Evidencia conflictiva', 'Una identidad, recibo o resultado incompatible exige conciliación. Un timeout tardío no revierte un resultado conocido.', evidence(paymentStore, 373, 419))),
    ],
  },
  {
    id: 'state-fiscal', title: 'Documento fiscal', status: 'implemented',
    source: '/guide/flows/fiscal/',
    description: 'Preparación, recepción del proveedor y aceptación fiscal son hechos separados; la recuperación consulta la misma identidad documental.',
    meta: meta('Proyección de FiscalDocument.status; validación de identidad y progresión de evidencia fiscal.', 'No acredita homologación fiscal, CAF productivo ni disponibilidad del original para impresión. Se omiten consultas que mantienen el estado y conflictos que se registran sin cambiar el documento.'),
    mainPath: ['prepared', 'dispatching', 'submitted', 'accepted'],
    states: [
      node('prepared', 'Preparado', 'start', 'Documento asociado a una venta e identidad fiscal; todavía no se ha emitido al proveedor.', evidence(fiscal, 56, 123)),
      node('dispatching', 'Despachando', 'active', 'Intento durable de emisión admitido; el replay no vuelve a invocar al proveedor.', evidence(fiscal, 275, 312)),
      node('submitted', 'Recibido por proveedor', 'waiting', 'Recepción del proveedor confirmada. No equivale a aceptación por la autoridad fiscal.', evidence(fiscal, 333, 381), evidence(fiscalEvidence, 21, 33)),
      node('unknown', 'Resultado desconocido', 'waiting', 'No se pudo establecer un resultado. Se consulta la identidad documental; no se emite otra vez.', evidence(fiscal, 280, 287), evidence(fiscal, 395, 407)),
      node('accepted', 'Aceptado fiscalmente', 'success', 'Evidencia terminal de aceptación; un evento tardío no puede sustituirla.', evidence(fiscalEvidence, 21, 33), evidence(fiscal, 333, 381)),
      node('rejected', 'Rechazado fiscalmente', 'failure', 'Evidencia terminal de rechazo. La corrección del negocio exige su operación correspondiente, no un cambio arbitrario de estado.', evidence(fiscalEvidence, 21, 33), evidence(fiscal, 333, 381)),
    ],
    transitions: [
      edge('prepared', 'dispatching', 'Emitir una vez', 'Sólo prepared admite submit; requiere identidad vigente y proveedor disponible.', evidence(fiscal, 275, 312)),
      edge('dispatching', 'unknown', 'Respuesta no concluyente', 'Un resultado inválido/ausente conserva el intento y marca desconocido; no prepara una nueva emisión.', evidence(fiscal, 322, 332), evidence(fiscal, 395, 407)),
      ...['dispatching', 'unknown'].map(from => edge(from, 'submitted', 'Confirmar recepción', 'Evidencia válida de recepción para la misma identidad. La consulta mantiene la emisión original.', evidence(fiscal, 280, 287), evidence(fiscal, 333, 381), evidence(fiscalEvidence, 21, 33))),
      ...['dispatching', 'unknown', 'submitted'].flatMap(from => [
        edge(from, 'accepted', 'Evidencia de aceptación', 'El resultado debe coincidir con proveedor, emisor, tipo, folio e importe del documento.', evidence(fiscalEvidence, 5, 33), evidence(fiscal, 333, 381)),
        edge(from, 'rejected', 'Evidencia de rechazo', 'Registra rechazo válido. La evidencia terminal no se reemplaza por eventos de transporte posteriores.', evidence(fiscalEvidence, 5, 33), evidence(fiscal, 333, 381)),
      ]),
    ],
  },
  {
    id: 'state-printing', title: 'Trabajo de impresión', status: 'implemented',
    source: '/guide/flows/printing/',
    description: 'Recepción, permiso de ejecución y resultado físico se conservan por separado para no repetir una impresión ante una respuesta perdida.',
    meta: meta('Proyección del trabajo en branch-api: camino de ejecución y recuperación de evidencia. El SQLite del host conserva su propio registro técnico.', 'No es un diagrama de estados del spooler ni prueba física de impresión. Se omiten fallos anteriores a recepción y actualizaciones sin cambio de estado; los predicados enlazados mantienen el contrato completo. No hay reejecución automática de un trabajo incierto.'),
    mainPath: ['queued', 'received', 'executing', 'spooled', 'succeeded'],
    states: [
      node('queued', 'En cola durable', 'start', 'Trabajo autorizado en PostgreSQL, con identidad, payload, controlador y vencimiento.', evidence(deviceStore, 97, 125)),
      node('received', 'Recibido por el host', 'active', 'Acuse de recepción válido. Aún no autoriza ejecutar el efecto físico.', evidence(device, 132, 155), evidence(deviceStore, 205, 217)),
      node('executing', 'Ejecución autorizada', 'active', 'Permiso de un uso asociado al intento; se revalida el destino al concederlo.', evidence(device, 158, 189), evidence(deviceStore, 222, 242)),
      node('spooled', 'Aceptado por spooler', 'waiting', 'Evidencia técnica de spooler. No demuestra que el papel se haya impreso.', evidence(device, 193, 238), evidence(deviceStore, 256, 275)),
      node('succeeded', 'Resultado confirmado', 'success', 'Resultado succeeded aceptado por el contrato. Su alcance depende de la evidencia del driver homologado.', evidence(device, 193, 238)),
      node('failed', 'Fallo confirmado', 'failure', 'Fallo del intento registrado sin contradecir evidencia previa más fuerte. Una copia intencional requiere otro trabajo.', evidence(device, 193, 238)),
      node('uncertain', 'Resultado incierto', 'waiting', 'Permiso previo o resultado incierto: se recupera evidencia del intento existente; no se autoriza otra ejecución.', evidence(device, 173, 189), evidence(device, 212, 238)),
      node('expired', 'Permiso vencido', 'neutral', 'El vencimiento impide iniciar el efecto; un acuse tardío sigue siendo reportable.', evidence(device, 123, 155), evidence(device, 180, 184)),
    ],
    transitions: [
      edge('queued', 'received', 'Acusar recepción', 'Identidad y hash coinciden y el trabajo sigue vigente; no constituye permiso de impresión.', evidence(device, 132, 155)),
      edge('received', 'executing', 'Conceder permiso único', 'Recibido, vigente y sin permiso previo; el destino se valida en la actualización atómica.', evidence(device, 158, 189), evidence(deviceStore, 222, 242)),
      edge('queued', 'expired', 'Vencer antes de recibir', 'La consulta o un acuse tardío marca vencido sin crear otra identidad de trabajo.', evidence(device, 123, 155)),
      edge('received', 'expired', 'Vencer antes de ejecutar', 'Sin permiso previo y fuera de plazo: la API no autoriza el efecto.', evidence(device, 173, 186)),
      edge('executing', 'spooled', 'Registrar aceptación', 'Resultado coincidente con el intento autorizado y recepción válida; conserva el ID de evidencia.', evidence(device, 193, 238)),
      edge('executing', 'succeeded', 'Confirmar resultado', 'Puede informar éxito directamente si el driver entrega evidencia admitida por el contrato.', evidence(device, 193, 238)),
      edge('executing', 'failed', 'Registrar fallo', 'Resultado failed aceptado para el intento, sin un resultado anterior más fuerte.', evidence(device, 193, 238)),
      edge('executing', 'uncertain', 'Permiso ya concedido', 'Un replay del permiso o un resultado incierto no vuelve a autorizar el hardware.', evidence(device, 173, 189), evidence(device, 193, 238)),
      edge('uncertain', 'spooled', 'Recuperar evidencia', 'Evidencia posterior más fuerte del mismo intento; no se ejecuta de nuevo.', evidence(device, 212, 238)),
      edge('uncertain', 'succeeded', 'Confirmar mismo intento', 'El resultado concluyente sustituye incertidumbre conservando identidad y evidencia.', evidence(device, 212, 238)),
      edge('spooled', 'succeeded', 'Confirmar resultado', 'Sólo succeeded avanza un resultado spooled; una evidencia más débil se conserva como superseded.', evidence(device, 218, 238)),
    ],
  },
];
