const form = document.querySelector('[data-filters]');
if (form) {
  const query = form.querySelector('input');
  const format = form.querySelector('#material-format');
  const country = form.querySelector('#material-country');
  const items = [...document.querySelectorAll('[data-material]')];
  const normalize = value => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
  const content = new Map(items.map(item => [item, normalize(item.textContent)]));
  const update = () => {
    const words = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const item of items) {
      item.hidden = Boolean(format.value && format.value !== item.dataset.format) || Boolean(country.value && country.value !== item.dataset.country) || !words.every(word => content.get(item).includes(word));
      if (!item.hidden) count++;
    }
    document.querySelector('[data-count]').textContent = `${count} ${count === 1 ? 'fuente' : 'fuentes'}`;
    document.querySelector('[data-empty]').hidden = count !== 0;
    document.querySelector('.materials-list').hidden = count === 0;
  };
  form.hidden = false;
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
