const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const appNames = {
  'pos-desktop': 'POS de escritorio',
  'pos-mobile': 'POS móvil',
  'branch-api': 'API de sucursal',
  'branch-sync-worker': 'Sincronización de sucursal',
  'country-api': 'API de país',
  'erp-worker': 'Integración ERP',
  'device-agent': 'Servicio de dispositivos',
};
const stages = { prototype: 'Demostración', foundation: 'Base técnica', planned: 'Por implementar', functional: 'Implementación funcional', validated: 'Alcance validado' };
const statuses = { not_started: 'Pendiente', in_progress: 'En desarrollo', blocked: 'Bloqueado', verified: 'Verificado técnicamente', accepted: 'Aceptado' };
const date = value => new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));
export const formatProgressPercent = value => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);

function reviewEvidence(review, repository, label) {
  return `<p>${label} el ${date(review.reviewedOn)} por ${escape(review.reviewer)}. ${review.evidence.map(item => `<a href="${repository}/blob/${review.revision}/${escape(item.path)}">${escape(item.label)}</a>`).join(' · ')}</p>`;
}

export function renderProgress(progress) {
  const technical = progress.measurement === 'verification';
  const measured = technical ? 'verificados' : 'aceptados';
  const sourceHref = `${progress.source.repository}/blob/${progress.source.revision}/${progress.source.path}`;
  const appRows = progress.applications.map(app => {
    const name = escape(appNames[app.id] || app.id);
    return `<li class="progress-app" data-progress-app="${escape(app.id)}">
    <div class="progress-app-heading"><h3>${name}</h3><p class="progress-app-id"><code>${escape(app.id)}</code></p><span class="progress-stage">${stages[app.stage]}</span></div>
    <div class="progress-app-description"><p>${escape(app.summary)}</p><p class="progress-next"><strong>Siguiente:</strong> ${escape(app.nextStep)}</p></div>
    <div class="progress-app-value"><strong>${formatProgressPercent(app.percent)} %</strong><progress max="${app.total}" value="${app.completed}" aria-label="Entregables ${measured} de ${name}">${app.completed} de ${app.total}</progress><span>${app.completed} de ${app.total} ${measured}</span></div>
  </li>`;
  }).join('');
  const phaseRows = progress.phases.map(phase => `<li data-progress-phase="${phase.id}"><a href="${phase.href}"><span class="progress-phase-id">F${phase.id.slice(-2)}</span> ${escape(phase.title)}</a><div><strong>${formatProgressPercent(phase.percent)} %</strong><span>${phase.completed} de ${phase.total} ${measured}</span></div></li>`).join('');
  const packages = progress.workPackages.map(work => `<li><a href="${escape(work.href)}">${escape(work.id)} · ${escape(work.title)}</a><span class="progress-work-status" data-status="${work.status}">${statuses[work.status]}</span>${work.status !== 'not_started' ? `<p>${escape(work.summary)}</p>` : ''}${work.verification ? reviewEvidence(work.verification, progress.source.repository, 'Verificado') : ''}${work.acceptance ? reviewEvidence(work.acceptance, progress.source.repository, 'Aceptado manualmente') : work.status === 'verified' ? '<p class="progress-review-pending">Aceptación manual pendiente.</p>' : ''}</li>`).join('');
  const manualReview = technical ? `<aside class="progress-manual" aria-labelledby="progress-manual-title"><h3 id="progress-manual-title">Aceptación manual</h3><p><strong>${progress.accepted}</strong> entregables aceptados por el equipo · <strong>${progress.pendingAcceptance}</strong> verificados técnicamente pendientes de revisión manual.</p></aside>` : '<p class="progress-legacy-note">Este registro conserva la medición de aceptación del esquema 1. No contiene verificaciones técnicas separadas.</p>';
  return `<section id="progress" class="resource-section project-progress" data-measurement="${progress.measurement}" aria-labelledby="progress-title">
  <div class="section-heading"><div><h2 id="progress-title">Avance del proyecto</h2><p>${technical ? 'Entregables del roadmap implementados y verificados con evidencia.' : 'Entregables del roadmap aceptados por el equipo.'}</p></div></div>
  <div class="progress-overview"><div class="progress-overall"><span class="progress-label">${technical ? 'Avance técnico verificado' : 'Aceptación del roadmap'}</span><strong class="progress-percentage">${formatProgressPercent(progress.percent)}<span> %</span></strong><progress max="${progress.total}" value="${progress.completed}" aria-label="Entregables ${measured} del proyecto">${progress.completed} de ${progress.total}</progress><p><strong>${progress.completed} de ${progress.total}</strong> entregables ${measured}</p></div>
  <div class="progress-summary"><h3>Estado actual</h3><p>${escape(progress.summary)}</p><ul class="progress-counts" role="list"><li><strong>${progress.counts.in_progress}</strong> en desarrollo</li><li><strong>${progress.counts.blocked}</strong> bloqueados</li><li><strong>${progress.counts.not_started}</strong> pendientes</li></ul><p class="progress-review">Revisión: <time datetime="${progress.reviewedOn}">${date(progress.reviewedOn)}</time></p><a class="text-link" href="${escape(sourceHref)}">Registro en pos-platform</a></div></div>
  ${manualReview}
  <div class="progress-phase-section" aria-labelledby="progress-phases-title"><h3 id="progress-phases-title">Por fase</h3><ul class="progress-phases" role="list">${phaseRows}</ul></div>
  <h3 class="progress-apps-title">Por aplicación</h3><p class="progress-scope-note">El porcentaje mide entregables ${measured}, no horas invertidas ni cantidad de código.${technical ? ' La aceptación manual se registra por separado y no condiciona este avance.' : ''}</p>
  <ul class="progress-apps" role="list">${appRows}</ul>
  <details class="progress-method"><summary>Cálculo y detalle de entregables</summary><div><p>Avance general = (entregables ${measured} ÷ ${progress.total} entregables del roadmap) × 100. Cada entregable cuenta una vez. Por fase y aplicación se consideran sólo sus entregables asignados; un entregable compartido avanza cuando se ${technical ? 'verifica' : 'acepta'} el recorrido completo.</p><p>Todos los entregables tienen el mismo peso. ${technical ? 'Los porcentajes se muestran con hasta un decimal; el 100 % exige verificar todos los entregables.' : 'Los porcentajes se redondean hacia abajo.'} El trabajo parcial no se convierte en un porcentaje estimado. Esta medida no representa esfuerzo, fechas ni habilitación productiva.</p><p>Esta publicación refleja una revisión del registro de producto; no consulta el repositorio en tiempo real. <a href="/guide/implementation/progress/">Cómo actualizar y verificar el avance</a>.</p><ul class="progress-work-list">${packages}</ul></div></details>
  </section>`;
}
