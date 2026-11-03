'use strict';

// Shared semantic steps for detailed views of the device protocol. Layouts may
// group steps, but must not turn durable receipt into permission to act.
const steps = [
  {
    id: 'device-receipt', from: 'device', to: 'deviceJournal',
    label: 'Persiste recepción y deduplicación · SQLite',
    note: 'Conserva jobId, hash y destino antes del acuse. Una reentrega recupera el mismo trabajo; recibirlo no autoriza el efecto físico. SQLite no es una base de ventas.',
  },
  {
    id: 'device-receipt-ack', from: 'device', to: 'branchApi',
    label: 'Acusa recepción durable · HTTPS/LAN saliente',
    note: 'La API valida identidad, hash, destino y vigencia. Este acuse acredita recepción, todavía no ejecución.',
  },
  {
    id: 'device-permit-request', from: 'device', to: 'branchApi',
    label: 'Solicita permiso para el intento · HTTPS/LAN saliente',
    note: 'El host registra el intento y pide autorización de un uso. Un permiso previo, respuesta perdida o resultado incierto no permite repetir el efecto.',
  },
  {
    id: 'device-permit-consume', from: 'branchApi', to: 'branchDb',
    label: 'Consume permiso de un uso antes de responder · PostgreSQL',
    note: 'La actualización atómica valida trabajo recibido, intento, destino y vigencia. El permiso queda consumido antes de responder; restaurar SQLite no concede otro.',
  },
  {
    id: 'device-permit-grant', from: 'branchApi', to: 'device',
    label: 'Devuelve autorización nueva y vigente · HTTPS',
    note: 'Sólo una respuesta nueva authorized permite iniciar el efecto dentro de su vigencia. El host descuenta tránsito y espera usando el presupuesto monotónico; pérdida, vencimiento o replay impiden una ejecución nueva.',
  },
  {
    id: 'device-effect', from: 'device', to: 'peripherals',
    label: 'Ejecuta una vez el intento autorizado · driver/SDK homologado',
    note: 'Un único controlador serializa capacidades del mismo periférico. Hardware y bases no comparten transacción; aceptar el spooler no demuestra impresión física. La incertidumbre se recupera sin reimprimir automáticamente.',
  },
];

const permission = {
  title: 'Obtener permiso de ejecución único',
  protocol: 'HTTPS · LAN · iniciado por device-agent',
  protocolLabel: 'HTTPS · LAN saliente',
  summary: 'Recepción y permiso de ejecución son hechos distintos.',
  description: steps.slice(2, 5).map(step => step.note).join(' '),
  payload: ['Identidad de trabajo, intento, agente y dispositivo asignados.', 'Respuesta authorized y presupuesto de vigencia para un único efecto.'],
  guarantees: [steps[3].note, steps[4].note],
  failure: ['Permiso consumido, respuesta perdida o vencida: no repetir el efecto. Recuperar evidencia o escalar el resultado incierto.'],
};

const receipt = { title: 'Recibir y acusar sin ejecutar', description: steps.slice(0, 2).map(step => step.note).join(' '), steps: steps.slice(0, 2).map(step => step.id) };
const permit = { title: permission.title, description: permission.description, steps: steps.slice(2, 5).map(step => step.id) };
const effect = { description: steps[5].note, steps: [steps[5].id] };

function assertExecutionOrder(ids, context) {
  const expected = steps.map(step => step.id);
  const actual = ids.filter(id => expected.includes(id));
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) {
    throw new Error(`${context}: device execution requires durable receipt, acknowledgement and a consumed one-use permit before the physical effect`);
  }
}

module.exports = { steps, permission, receipt, permit, effect, assertExecutionOrder };
