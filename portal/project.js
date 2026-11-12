export const normalizeSearch = value => String(value || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');

export function matchesProjectItem(data, text, values, type) {
  const query = normalizeSearch(values.query).trim();
  if (query && !normalizeSearch(text).includes(query)) return false;
  const loginMatch = (field, wanted) => !wanted || (wanted === 'unassigned' ? !field : normalizeSearch(field).split(' ').includes(normalizeSearch(wanted)));
  if (type === 'attention') {
    return ['scope', 'kind', 'state'].every(key => !values[key] || data[key] === values[key]) && loginMatch(data.owner, values.owner);
  }
  if (type === 'questions') {
    // A question is listed under its earliest phase but concerns every phase of its packages.
    return (!values.state || data.state === values.state) && (!values.phase || (data.phases || '').split(' ').includes(values.phase)) && (!values.decider || data.decider === values.decider) && (!values.recommendation || data.recommendation === values.recommendation) && (!values.scope || data.scope === values.scope);
  }
  if (type === 'rules') {
    return ['decision', 'phase', 'area', 'disclosure'].every(key => !values[key] || data[key] === values[key]);
  }
  const statusMatch = !values.status || (values.status === 'review' ? data.review === 'true' : values.status === 'active' ? data.active === 'true' : values.status === 'remaining' ? !['verified', 'accepted'].includes(data.status) : values.status === data.status);
  return statusMatch && (!values.phase || data.phase === values.phase) && (!values.app || (data.app || '').split(' ').includes(values.app)) && loginMatch(data.assignee, values.assignee);
}

function updateAddress(values, keys, mode = 'replace', clearHash = false) {
  const url = new URL(location.href);
  if (clearHash) url.hash = '';
  for (const key of keys) {
    if (values[key]) url.searchParams.set(key, values[key]);
    else url.searchParams.delete(key);
  }
  if (url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
}

export function initializeProject(root) {
  const provenance = root.querySelector('#project-sources');
  const revealSources = () => { if (location.hash === '#project-sources' && provenance) provenance.open = true; };
  root.addEventListener('click', event => {
    const link = event.target.closest('a[href="#project-sources"]');
    if (!link || !provenance || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    provenance.open = true;
    const url = new URL(location.href);
    url.hash = 'project-sources';
    if (url.href !== location.href) history.pushState(null, '', url);
    provenance.scrollIntoView({ block: 'start', behavior: 'instant' });
    provenance.querySelector('summary').focus({ preventScroll: true });
  });
  window.addEventListener('hashchange', revealSources);
  revealSources();
  const form = root.querySelector('[data-project-filters]');
  if (form) {
    const type = root.dataset.projectPage;
    const items = [...root.querySelectorAll('[data-project-item]')];
    const groups = [...root.querySelectorAll('[data-project-group]')];
    const subject = { work: 'entregables', questions: 'preguntas', rules: 'reglas' }[type] || 'acciones';
    const searchable = new Map(items.map(item => [item, item.textContent]));
    const controls = [...form.querySelectorAll('input[name],select[name]')];
    const keys = controls.map(control => control.name);
    const values = () => Object.fromEntries(new FormData(form));
    const filter = () => {
      const selected = values();
      for (const item of items) item.hidden = !matchesProjectItem(item.dataset, searchable.get(item), selected, type);
      // A group without visible records does not leave an empty heading behind.
      for (const group of groups) group.hidden = ![...group.querySelectorAll('[data-project-item]')].some(item => !item.hidden);
      const count = items.filter(item => !item.hidden).length;
      root.querySelector('[data-project-count]').textContent = `${count} de ${items.length} ${subject}`;
      root.querySelector('[data-project-empty]').hidden = count !== 0;
    };
    const fromAddress = () => {
      const params = new URLSearchParams(location.search);
      for (const control of controls) {
        const candidate = params.get(control.name) || '';
        control.value = control.tagName === 'SELECT' && ![...control.options].some(option => option.value === candidate) ? '' : candidate;
      }
      filter();
    };
    const clear = (mode = 'push', clearHash = true) => {
      for (const control of controls) control.value = '';
      filter();
      updateAddress({}, keys, mode, clearHash);
    };
    const revealAnchor = (scroll = true) => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target || !root.contains(target) || !target.matches('[data-project-item]')) return;
      if (target.hidden) clear('replace', false);
      const detail = target.querySelector('details');
      if (detail) detail.open = true;
      if (scroll) target.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    form.hidden = false;
    form.addEventListener('input', event => {
      if (event.target.tagName !== 'INPUT') return;
      filter();
      updateAddress(values(), keys, 'replace', true);
    });
    form.addEventListener('change', event => {
      if (event.target.tagName !== 'SELECT') return;
      filter();
      updateAddress(values(), keys, 'push', true);
    });
    form.addEventListener('submit', event => { event.preventDefault(); filter(); updateAddress(values(), keys, 'push', true); });
    form.addEventListener('reset', event => { event.preventDefault(); clear(); });
    root.querySelector('[data-project-reset]').addEventListener('click', () => { clear(); controls[0].focus(); });
    window.addEventListener('popstate', () => { fromAddress(); revealAnchor(); });
    window.addEventListener('hashchange', () => revealAnchor());
    fromAddress();
    revealAnchor();
  }

  if (root.dataset.projectPage === 'plan') {
    const revealPlan = () => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target || !root.contains(target) || !target.matches('[data-plan-item]')) return;
      const detail = target.querySelector('details');
      if (detail) detail.open = true;
    };
    window.addEventListener('hashchange', revealPlan);
    revealPlan();
  }

  const selector = root.querySelector('[data-breakdown-select]');
  if (selector) {
    const views = [...root.querySelectorAll('[data-breakdown]')];
    const show = value => {
      selector.value = value === 'apps' ? 'apps' : 'phases';
      for (const view of views) view.hidden = view.dataset.breakdown !== selector.value;
    };
    const restore = () => show(new URLSearchParams(location.search).get('view'));
    root.querySelector('[data-breakdown-control]').hidden = false;
    selector.addEventListener('change', () => { show(selector.value); updateAddress({ view: selector.value === 'apps' ? 'apps' : '' }, ['view'], 'push', true); });
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', () => {
      if (['#apps', '#phases'].includes(location.hash)) {
        show(location.hash.slice(1));
        updateAddress({ view: selector.value === 'apps' ? 'apps' : '' }, ['view']);
        root.querySelector(location.hash).scrollIntoView({ block: 'start' });
      }
    });
    restore();
    if (['#apps', '#phases'].includes(location.hash)) show(location.hash.slice(1));
  }
}

if (typeof document !== 'undefined') for (const root of document.querySelectorAll('[data-project-page]')) initializeProject(root);
