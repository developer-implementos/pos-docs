import assert from 'node:assert/strict';

// Folder names, hierarchy and responsibilities come from the canonical target.
export function monorepoView(source, escape) {
  const tree=source.match(/<!-- monorepo:target:start -->\s*```text\s*\n([\s\S]*?)\n```/);
  assert.ok(tree,'Canonical monorepo target not found');
  const parents=[];
  const rows=tree[1].split('\n').map(line=>{
    const match=line.match(/^( *)([^#]+?)(?:\s+#\s*(.*))?$/);
    assert.ok(match,`Invalid target row: ${line}`);
    const depth=match[1].length/2,name=match[2].trim();
    parents.length=depth;parents.push(name.replace(/\/$/,''));
    const description=match[3]||'';
    return {depth,name,path:parents.join('/'),description:description.replace(/^\[[^\]]+\]\s*/,'').replace(/; scaffold comercial$/,'')};
  });
  const short={
    'apps/pos-desktop':'Cliente Angular + Tauri',
    'apps/pos-mobile':'Cliente Angular + Capacitor',
    'apps/branch-api':'API y negocio de sucursal',
    'apps/branch-sync-worker':'Entrega y recepción en sucursal',
    'apps/country-api':'API y capacidades de país',
    'apps/erp-worker':'Integración y conciliación ERP',
    'apps/pos-clients-e2e':'Pruebas UI; sin despliegue comercial',
    'apps/pos-clients-e2e/mobile':'Suite Angular; sin probar el host nativo',
    'libs/backend/returns':'Devoluciones y documento de origen',
    'libs/backend/payments':'Intentos, resultados y conciliación de pagos',
    'libs/backend/fiscal':'Documentos y estados fiscales por país',
    'libs/client-shell':'Composición Angular, rutas y navegación',
    'libs/features':'Funcionalidades y pantallas de la interfaz',
    'libs/shared/backend':'Base técnica del servidor',
    'libs/shared/backend/health':'Sondas y disponibilidad comprobada',
    'libs/shared/frontend/ui':'Preset, tokens y componentes visuales',
    'libs/shared/kernel':'Conceptos mínimos entre contextos',
    'libs/shared/contracts':'Sobres y metadatos técnicos comunes',
    'libs/shared/testing':'Soporte técnico de pruebas',
    'libs/country-policies':'Perfiles y selección de políticas',
    'libs/domain':'Reglas puras del prototipo',
    'libs/data-access':'Estado y adaptadores mock',
    'tools':'Build, lint y pruebas del producto'
  };
  const zones=[
    {id:'apps',label:'Aplicaciones',title:'Entradas del producto',detail:'Seis aplicaciones con arranques y despliegues independientes.',status:'E2E es el proyecto de pruebas de los clientes.',paths:['apps']},
    {id:'business',label:'Negocio',title:'Contextos de negocio',detail:'Trece contextos con responsabilidad propia. Las aplicaciones componen sus casos de uso.',status:'Base estructural disponible; lógica comercial pendiente.',paths:['libs/backend']},
    {id:'frontend',label:'Interfaz',title:'Composición y pantallas',detail:'libs/client-shell compone la interfaz Angular compartida. Cada aplicación conserva su arranque y aloja el frontend en su shell nativa Tauri o Capacitor.',status:'UI demostrativa con datos sintéticos. Operaciones reales pendientes.',paths:['libs/client-shell','libs/features']},
    {id:'backend',label:'Shared / backend',title:'Mecanismos del servidor',detail:'Arranque, configuración, HTTP, observabilidad, sondas y ciclo de vida de los workers.',status:'La organización en shared/backend es el objetivo arquitectónico.',paths:['libs/shared/backend']},
    {id:'shared',label:'Shared / común',title:'Soporte técnico común',detail:'UI reutilizable, conceptos mínimos, sobres técnicos y soporte de pruebas.',status:'Organización objetivo. Testing requiere consumidores comunes.',paths:['libs/shared/frontend','libs/shared/kernel','libs/shared/contracts','libs/shared/testing']},
    {id:'transition',label:'Prototipo',title:'Perfiles y datos de prueba',detail:'Perfiles por país, reglas puras y adaptadores mock de la demostración.',status:'Las reglas de ventas, caja y pagos pertenecen a sus contextos de negocio.',paths:['libs/country-policies','libs/domain','libs/data-access']},
    {id:'delivery',label:'Entrega',title:'Herramientas y validación',detail:'Las herramientas y workflows validan y construyen los artefactos del producto.',status:'POS Docs publica documentación y presentaciones desde su repositorio editorial.',paths:['tools','.github']}
  ];
  const inZone=(row,zone)=>zone.paths.some(p=>row.path===p||row.path.startsWith(p+'/'));
  for(const zone of zones) assert.ok(rows.some(r=>inZone(r,zone)),`Empty monorepo zone: ${zone.id}`);
  const lastByPath=new Map(rows.map((r,i)=>[r.path,!rows.slice(i+1).some(n=>n.depth===r.depth&&n.path.split('/').slice(0,-1).join('/')===r.path.split('/').slice(0,-1).join('/'))]));
  const rowHTML=rows.map((r,i)=>{
    const ancestors=Array.from({length:r.depth},(_,j)=>r.path.split('/').slice(0,j+1).join('/'));
    const prefix=ancestors.map(p=>lastByPath.get(p)?'    ':'│   ').join('')+(lastByPath.get(r.path)?'└── ':'├── ');
    const zone=zones.find(z=>inZone(r,z));
    return `<div class="tree-row${zone?.id==='apps'?' is-active':''}" data-path="${escape(r.path)}" data-zone="${zone?.id||''}"><span class="tree-number" aria-hidden="true">${i+2}</span><span class="tree-path"><span class="tree-branch" aria-hidden="true">${prefix}</span>${escape(r.name)}</span><span class="tree-description" title="${escape(r.description)}">${r.description?'# '+escape(short[r.path]||r.description):''}</span></div>`;
  }).join('');
  const markup=`<div class="monorepo-tour" aria-label="Recorrido de la estructura objetivo del monorepo">
    <nav class="zone-nav" aria-label="Zonas del monorepo">${zones.map((z,i)=>`<button type="button" data-zone-step="${i}"${i===0?' aria-current="step"':''}>${escape(z.label)}</button>`).join('')}</nav>
    <div class="tree-panel" tabindex="0" role="region" aria-label="Árbol de carpetas. Puede desplazarse manualmente."><div class="tree-root"><span class="tree-number" aria-hidden="true">1</span><strong>pos-platform/</strong><span class="tree-description"># estructura objetivo</span></div>${rowHTML}</div>
    <aside class="zone-detail" aria-live="polite" aria-atomic="true">${zones.map((z,i)=>`<div data-zone-detail="${i}"${i?' hidden':''}><p class="zone-count">ZONA ${i+1} / ${zones.length}</p><h3>${escape(z.title)}</h3><p>${escape(z.detail)}</p><p class="zone-state">${escape(z.status)}</p></div>`).join('')}<p class="zone-hint">↑ ↓ o Espacio: recorrer zonas</p></aside>
    ${zones.slice(1).map((z,i)=>`<span class="fragment custom zone-fragment" data-fragment-index="${i}" aria-hidden="true"></span>`).join('')}
  </div>`;
  const reading=`<p>Estructura objetivo y responsabilidades del monorepo. La base actual combina una UI demostrativa y scaffolds de servidor; las operaciones comerciales se implementan por fases. El árbol describe la organización propuesta, no acredita funcionalidades productivas.</p><pre class="tree-reading">${escape('pos-platform/\n'+rows.map(r=>'  '.repeat(r.depth+1)+r.name+(r.description?'  # '+r.description:'')).join('\n'))}</pre>`;
  return {markup,reading};
}
