(() => {
  const data = JSON.parse(document.getElementById('pos-docs-details').textContent);
  const panel = document.getElementById('pos-diagram-details');
  const opener = document.querySelector('[data-pos-details-open]');
  const closer = document.querySelector('[data-pos-details-close]');
  let origin = opener;
  function open(details, target) {
    if (details) {
      document.getElementById('pos-detail-title').textContent = details.title;
      panel.querySelector('[data-pos-detail-description]').textContent = details.description || '';
      panel.querySelector('[data-pos-detail-technology]').textContent = details.technology || '';
      panel.querySelector('[data-pos-detail-status]').textContent = details.status === 'conditional' ? 'Capacidad condicionada: requiere adopción u homologación.' : details.status === 'unresolved' ? 'Contrato pendiente de validar.' : details.evidenceKind === 'source-inspection' ? 'Predicados inspeccionados en código; no acredita pruebas ejecutadas ni homologación.' : details.evidenceKind === 'migration-export' ? 'Esquema derivado de migraciones aplicadas; no acredita despliegue productivo.' : 'Diseño propuesto; consultar implementación y evidencia por separado.';
      panel.querySelector('[data-pos-detail-link]').href = details.href;
      const links = panel.querySelector('[data-pos-detail-links]');
      links.replaceChildren();
      for (const link of details.links || []) {
        const item = document.createElement('li');
        const anchor = document.createElement('a');
        anchor.href = link.href;
        anchor.textContent = link.label;
        item.append(anchor);
        links.append(item);
      }
      const schema = panel.querySelector('[data-pos-detail-schema]');
      schema.replaceChildren();
      if (details.fieldDocumentation?.length) {
        const note = document.createElement('p');
        note.textContent = 'Ejemplos sintéticos por campo; no son filas para insertar. Los tipos SQL se verifican al exportar; las reglas de negocio y relaciones se validan por separado.';
        schema.append(note);
        for (const field of details.fieldDocumentation) {
          const section = document.createElement('details');
          const heading = document.createElement('summary');
          heading.textContent = `${field.name} · ${field.type}`;
          section.append(heading);
          for (const text of [field.description, field.usage, field.nullable ? 'Admite NULL.' : 'No admite NULL.', `Predeterminado SQL: ${field.default ?? 'sin valor predeterminado'}`, ...(field.comment ? [`Comentario SQL: ${field.comment}`] : [])]) {
            const paragraph = document.createElement('p');
            paragraph.textContent = text;
            section.append(paragraph);
          }
          const sample = document.createElement(Object.hasOwn(field, 'example') ? 'pre' : 'p');
          sample.textContent = Object.hasOwn(field, 'example') ? (typeof field.example === 'string' ? field.example : JSON.stringify(field.example, null, 2)) : `Ejemplo omitido: ${field.exampleOmittedReason}`;
          if (sample.tagName === 'PRE') { sample.tabIndex = 0; sample.setAttribute('aria-label', `Ejemplo sintético de ${field.name}`); }
          const anchor = document.createElement('a');
          anchor.href = field.href;
          anchor.textContent = 'Definición completa del campo';
          section.append(sample, anchor);
          schema.append(section);
        }
      }
      for (const [key, label] of [['fields', 'Columnas'], ['constraints', 'Restricciones'], ['indexes', 'Índices']]) {
        if (key === 'fields' && details.fieldDocumentation?.length) continue;
        if (!details[key]?.length) continue;
        const section = document.createElement('details');
        const heading = document.createElement('summary');
        heading.textContent = `${label} (${details[key].length})`;
        section.append(heading);
        for (const line of details[key]) {
          const content = document.createElement('p');
          content.textContent = line;
          section.append(content);
        }
        schema.append(section);
      }
    }
    origin = target || opener;
    panel.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
  }
  function close() {
    panel.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    origin.focus({ preventScroll: true });
  }
  opener.addEventListener('click', () => {
    if (panel.hidden) { open(null, opener); closer.focus(); }
    else close();
  });
  closer.addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.stopPropagation(); close(); }
  }, true);
  function inspect(event) {
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    const target = event.target.closest('[data-node-id], [data-edge-id]');
    if (!target) return;
    if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation(); }
    const details = target.dataset.nodeId ? data.nodes[target.dataset.nodeId] : data.edges[target.dataset.edgeId];
    if (details) {
      open(details, target);
      if (event.type === 'keydown') closer.focus();
    }
  }
  document.addEventListener('click', inspect);
  document.addEventListener('keydown', inspect, true);
  for (const target of document.querySelectorAll('[data-edge-id]')) {
    const details = data.edges[target.dataset.edgeId];
    if (!details) continue;
    target.setAttribute('tabindex', '0');
    target.setAttribute('role', 'button');
    target.setAttribute('aria-label', `Inspeccionar conexión: ${details.title}`);
  }
})();
