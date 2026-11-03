// Old bookmarks remain useful; the landing page also exposes these anchors without JS.
const legacyDestinations = new Map([['progress','/project/'], ['presentations','/presentations/'], ['materials','/materials/'], ['team','/project/team/']]);
const visitLegacyAnchor = () => {
  if (location.pathname !== '/') return;
  const target = legacyDestinations.get(location.hash.slice(1));
  if (target) location.replace(target + location.search);
};
visitLegacyAnchor();
window.addEventListener('hashchange', visitLegacyAnchor);

const form = document.querySelector('[data-filters]');
if (form) {
  const query = form.querySelector('input');
  const format = form.querySelector('#material-format');
  const country = form.querySelector('#material-country');
  const items = [...document.querySelectorAll('[data-material]')];
  const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
  const content = new Map(items.map(item => [item, normalize(item.textContent)]));
  const update = (writeUrl = true) => {
    const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of items) {
      item.hidden = Boolean(format.value && format.value !== item.dataset.format) || Boolean(country.value && country.value !== item.dataset.country) || !words.every(word => content.get(item).includes(word));
      if (!item.hidden) count++;
    }
    document.querySelector('[data-count]').textContent = `${count} ${count === 1 ? 'fuente' : 'fuentes'}`;
    document.querySelector('[data-empty]').hidden = count !== 0;
    document.querySelector('.materials-list').hidden = count === 0;
    if (writeUrl) {
      const url = new URL(location.href);
      for (const [name, value] of [['q', query.value], ['format', format.value], ['country', country.value]]) {
        if (value) url.searchParams.set(name, value); else url.searchParams.delete(name);
      }
      history.replaceState(null, '', url);
    }
  };
  const restore = () => {
    const params = new URL(location.href).searchParams;
    query.value = params.get('q') ?? '';
    for (const [control, name] of [[format, 'format'], [country, 'country']]) {
      const value = params.get(name) ?? '';
      control.value = [...control.options].some(option => option.value === value) ? value : '';
    }
    update(false);
  };
  form.hidden = false;
  restore();
  window.addEventListener('popstate', restore);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('reset', event => {
    event.preventDefault();
    query.value = '';
    format.value = '';
    country.value = '';
    update();
  });
}
