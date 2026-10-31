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
    'apps/pos-desktop':'Shell Tauri + frontend Angular',
    'apps/pos-mobile':'Shell Capacitor + frontend Angular',
    'apps/branch-api':'API y negocio de sucursal',
    'apps/branch-sync-worker':'Entrega y recepción en sucursal',
    'apps/country-api':'API y capacidades de país',
    'apps/erp-worker':'Integración y conciliación ERP',
    'apps/device-agent':'.NET / Windows · agente por puesto',
    'tests/pos-clients-e2e':'Pruebas UI y API; sin despliegue comercial',
    'tests/pos-clients-e2e/branch':'Venta y recuperación con PostgreSQL real',
    'tests/pos-clients-e2e/mobile':'Suite Angular; sin probar shell nativa',
    'libs/backend/returns':'Devoluciones y documento de origen',
    'libs/backend/payments':'Intentos, resultados y conciliación de pagos',
    'libs/backend/fiscal':'Documentos y estados fiscales por país',
    'libs/client-shell':'Composición Angular, rutas y navegación',
    'libs/features':'Funcionalidades y pantallas de la interfaz',
    'libs/shared/backend':'Base técnica del servidor',
    'libs/shared/backend/runtime':'HTTP, configuración y observabilidad',
    'libs/shared/backend/persistence':'PostgreSQL, transacciones y migraciones',
    'libs/shared/backend/testing':'Fixtures PostgreSQL aislados',
    'libs/shared/frontend/ui':'Preset, tokens y componentes visuales',
    'libs/shared/kernel':'Conceptos mínimos entre contextos',
    'libs/shared/contracts':'Sobres y metadatos técnicos comunes',
    'libs/country-policies':'Perfiles y selección de políticas',
    'libs/domain':'Reglas puras del prototipo',
    'libs/data-access':'Adaptadores explícitos demo y branch-api',
    'tools':'Build, lint y pruebas del producto'
  };
  const zones=[
    {id:'apps',label:'Aplicaciones',title:'Entradas del producto',detail:'Siete aplicaciones objetivo. device-agent usa .NET en cada puesto Windows; F02 cubre periféricos locales.',status:'F01 conecta clientes y administración POS Chile. Sincronización y periféricos pendientes.',paths:['apps']},
    {id:'business',label:'Negocio',title:'Contextos de negocio',detail:'Trece contextos con responsabilidad propia. Las aplicaciones componen sus casos de uso.',status:'Usuarios y permisos propios POS; caja y efectivo probados con datos sintéticos. Sin aceptación de fase.',paths:['libs/backend']},
    {id:'frontend',label:'Interfaz',title:'Composición y pantallas',detail:'libs/client-shell compone Angular compartido dentro de las shells Tauri o Capacitor.',status:'branch aplica capacidades operativas; branch-lab y demo están separados. Sin configurar, no hay login.',paths:['libs/client-shell','libs/features']},
    {id:'backend',label:'Shared / backend',title:'Mecanismos del servidor',detail:'Runtime HTTPS, observabilidad, PostgreSQL, unidad de trabajo y fixtures aislados.',status:'Perfiles operativo y laboratorio separados; cada contexto conserva sus datos y SQL.',paths:['libs/shared/backend']},
    {id:'shared',label:'Shared / común',title:'Soporte técnico común',detail:'UI reutilizable, conceptos mínimos y sobres técnicos sin negocio compartido.',status:'Contratos de negocio en su contexto; shared no concentra los DTO comerciales.',paths:['libs/shared/frontend','libs/shared/kernel','libs/shared/contracts']},
    {id:'transition',label:'Perfiles',title:'Políticas y acceso a datos',detail:'Políticas por país y adaptadores separados para la demo y branch-api.',status:'Sin fallback a mocks. El perfil operativo no cobra ni cotiza con precios sin verificar.',paths:['libs/country-policies','libs/domain','libs/data-access']},
    {id:'delivery',label:'Entrega',title:'Herramientas y validación',detail:'Build, lint y pruebas. E2E de sucursal usa Angular, API y PostgreSQL reales.',status:'Pruebas aprobadas no equivalen a aceptación funcional ni homologación nativa.',paths:['tests','tools','.github']}
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
  const reading=`<p>Estructura y responsabilidades del monorepo. F01 incorpora administración propia POS para Chile, puestos persistentes y HTTPS entre Angular y branch-api. El laboratorio monetario y la demo permanecen separados. La CLI de erp-worker consulta referencias Mountain; su acceso corporativo está pendiente y no alimenta la UI ni el espejo. Sincronización, recepción de país, proveedores y dispositivos conservan sus fases de implementación. El árbol incluye la estructura objetivo y no acredita aceptación de fase ni habilitación productiva.</p><pre class="tree-reading">${escape('pos-platform/\n'+rows.map(r=>'  '.repeat(r.depth+1)+r.name+(r.description?'  # '+r.description:'')).join('\n'))}</pre>`;
  return {markup,reading};
}
