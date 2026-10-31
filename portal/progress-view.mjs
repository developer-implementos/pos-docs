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
const statuses = { not_started: 'Pendiente', in_progress: 'En desarrollo', blocked: 'Bloqueado', accepted: 'Aceptado' };
const date = value => new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value + 'T00:00:00Z'));

export function renderProgress(progress) {
  const sourceHref = `${progress.source.repository}/blob/${progress.source.revision}/${progress.source.path}`;
  const appRows = progress.applications.map(app => {
    const name = escape(appNames[app.id] || app.id);
    return `<li class="progress-app" data-progress-app="${escape(app.id)}">
    <div class="progress-app-heading"><h3>${name}</h3><p class="progress-app-id"><code>${escape(app.id)}</code></p><span class="progress-stage">${stages[app.stage]}</span></div>
    <div class="progress-app-description"><p>${escape(app.summary)}</p><p class="progress-next"><strong>Siguiente:</strong> ${escape(app.nextStep)}</p></div>
    <div class="progress-app-value"><strong>${app.percent} %</strong><progress max="${app.total}" value="${app.accepted}" aria-label="Entregables aceptados de ${name}">${app.accepted} de ${app.total}</progress><span>${app.accepted} de ${app.total} aceptados</span></div>
  </li>`;
  }).join('');
  const packages = progress.workPackages.map(work => `<li><a href="${escape(work.href)}">${escape(work.id)} · ${escape(work.title)}</a><span class="progress-work-status" data-status="${work.status}">${statuses[work.status]}</span>${['in_progress', 'blocked'].includes(work.status) ? `<p>${escape(work.summary)}</p>` : ''}${work.acceptance ? `<p>Aceptado el ${date(work.acceptance.reviewedOn)} por ${escape(work.acceptance.reviewer)}. ${work.acceptance.evidence.map(item => `<a href="${progress.source.repository}/blob/${work.acceptance.revision}/${escape(item.path)}">${escape(item.label)}</a>`).join(' · ')}</p>` : ''}</li>`).join('');
  return `<section id="progress" class="resource-section project-progress" aria-labelledby="progress-title">
  <div class="section-heading"><div><h2 id="progress-title">Avance del proyecto</h2><p>Entregables del roadmap aceptados por el equipo.</p></div></div>
  <div class="progress-overview"><div class="progress-overall"><span class="progress-label">Aceptación del roadmap</span><strong class="progress-percentage">${progress.percent}<span> %</span></strong><progress max="${progress.total}" value="${progress.accepted}" aria-label="Entregables aceptados del proyecto">${progress.accepted} de ${progress.total}</progress><p><strong>${progress.accepted} de ${progress.total}</strong> entregables aceptados</p></div>
  <div class="progress-summary"><h3>Estado actual</h3><p>${escape(progress.summary)}</p><ul class="progress-counts" role="list"><li><strong>${progress.counts.in_progress}</strong> en desarrollo</li><li><strong>${progress.counts.blocked}</strong> bloqueados</li><li><strong>${progress.counts.not_started}</strong> pendientes</li></ul><p class="progress-review">Revisión: <time datetime="${progress.reviewedOn}">${date(progress.reviewedOn)}</time></p><a class="text-link" href="${escape(sourceHref)}">Registro en pos-platform</a></div></div>
  <h3 class="progress-apps-title">Por aplicación</h3><p class="progress-scope-note">El porcentaje mide entregables aceptados, no horas invertidas ni cantidad de código. La demostración y la base técnica se describen por separado.</p>
  <ul class="progress-apps" role="list">${appRows}</ul>
  <details class="progress-method"><summary>Cálculo y detalle de entregables</summary><div><p>Avance general = (entregables aceptados ÷ ${progress.total} entregables del roadmap) × 100. Cada entregable cuenta una vez. Por aplicación se consideran los entregables en los que participa; un entregable compartido avanza cuando se acepta el recorrido completo.</p><p>Todos los entregables tienen el mismo peso. Los porcentajes se redondean hacia abajo y el trabajo parcial no se convierte en un porcentaje estimado. Esta medida no representa esfuerzo, fechas ni habilitación productiva.</p><p>Esta publicación refleja una revisión del registro de producto; no consulta el repositorio en tiempo real. <a href="/guide/implementation/progress/">Cómo actualizar y verificar el avance</a>.</p><ul class="progress-work-list">${packages}</ul></div></details>
  </section>`;
}
