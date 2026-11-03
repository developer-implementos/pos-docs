import { architecture } from '../architecture/model.mjs';
import { lifecycleCatalog } from './lifecycle.mjs';

/** Stable navigation, derived from the existing proposal rather than a second graph. */
export const exploreCatalog = [
  {
    id: 'applications', title: 'Aplicaciones y despliegue', type: 'architecture',
    href: '/explore/applications/', status: 'proposed',
    description: 'Aplicaciones y almacenes de la arquitectura objetivo. Las capacidades implementadas se consultan en la referencia de producto.',
    source: '/guide/proposal/architecture/',
  },
  ...architecture.scenarios.map(scenario => ({
    id: scenario.id, title: scenario.title, description: scenario.description,
    type: 'workflow', href: `/explore/${scenario.id}/`, status: 'proposed',
    source: `/architecture/?scenario=${scenario.id}&step=1`,
  })),
  ...lifecycleCatalog,
];
