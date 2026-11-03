const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');

export function initializeFollowUp(root) {
  const actionForm = root.querySelector('[data-action-filters]');
  const workForm = root.querySelector('[data-work-filters]');
  if (!actionForm || !workForm) return;
  const actions = [...root.querySelectorAll('[data-action]')];
  const works = [...root.querySelectorAll('[data-work]')];
  function filterActions() {
    const values = new FormData(actionForm);
    for (const item of actions) item.hidden = ['kind','scope','state'].some(key => values.get(key) && item.dataset[key] !== values.get(key));
    const count = actions.filter(item => !item.hidden).length;
    root.querySelector('[data-action-count]').textContent = `${count} de ${actions.length} acciones`;
    root.querySelector('[data-action-empty]').hidden = count !== 0;
  }
  function filterWorks() {
    const values = new FormData(workForm);
    const status = values.get('status');
    const query = normalize(String(values.get('query') || '').trim());
    for (const item of works) {
      const matchesStatus = !status || (status === 'remaining' ? item.dataset.status !== 'verified' : status === 'review' ? item.dataset.review === 'true' : item.dataset.status === status);
      item.hidden = !matchesStatus || !!values.get('phase') && item.dataset.phase !== values.get('phase') || !!values.get('app') && !item.dataset.apps.split(' ').includes(values.get('app')) || !normalize(item.textContent).includes(query);
    }
    const count = works.filter(item => !item.hidden).length;
    root.querySelector('[data-work-count]').textContent = `${count} de ${works.length} entregables`;
    root.querySelector('[data-work-empty]').hidden = count !== 0;
  }
  for (const [form,filter] of [[actionForm,filterActions],[workForm,filterWorks]]) {
    form.hidden = false;
    form.addEventListener('input', filter);
    form.addEventListener('submit', event => event.preventDefault());
    form.addEventListener('reset', () => queueMicrotask(filter));
    filter();
  }
  function revealLinkedItem() {
    const target = document.getElementById(location.hash.slice(1));
    if (!target || !root.contains(target) || !target.hidden) return;
    if (target.matches('[data-action]')) {
      actionForm.reset();
      actionForm.elements.namedItem('state').value = '';
      filterActions();
    } else if (target.matches('[data-work]')) {
      workForm.reset();
      filterWorks();
    }
    target.scrollIntoView({block:'start'});
  }
  window.addEventListener('hashchange', revealLinkedItem);
  revealLinkedItem();
}

for (const root of document.querySelectorAll('[data-project-follow-up]')) initializeFollowUp(root);
