const entityId = table => `${table.schema}__${table.name ?? table.table}`;
const fullname = table => `${table.schema}.${table.name}`;
const roles = { p: 'pk', u: 'uk' };

/** Only declared PK/UK/FK constraints establish identity and relationships. */
export function foreignKeyRelationship(table, constraint, index) {
  const unique = table.constraints.some(key => ['p', 'u'].includes(key.type) && key.columns.every(column => constraint.columns.includes(column)));
  const primary = table.constraints.find(key => key.type === 'p');
  return {
    id: `${entityId(table)}__fk_${index + 1}`, from: entityId(constraint.references), to: entityId(table),
    fromCardinality: 'one', toCardinality: unique ? 'one' : 'many',
    fromOptional: constraint.columns.some(name => table.columns.find(column => column.name === name)?.nullable),
    toOptional: true,
    identifying: !!primary && constraint.columns.every(column => primary.columns.includes(column)),
    ...(!primary || !constraint.columns.every(column => primary.columns.includes(column)) ? { variant: 'dashed' } : {}),
  };
}

export function projectDatabase(schema, source) {
  return schema.databases.flatMap(database => [...new Set(database.tables.map(table => table.context))].sort().map(context => {
    const own = database.tables.filter(table => table.context === context);
    const included = new Map(own.map(table => [fullname(table), table]));
    for (const table of own) for (const constraint of table.constraints.filter(key => key.type === 'f')) {
      const target = database.tables.find(candidate => fullname(candidate) === `${constraint.references.schema}.${constraint.references.table}`);
      if (!target) throw new Error(`Unresolved foreign key ${fullname(table)}.${constraint.name}`);
      included.set(fullname(target), target);
    }
    const tables = [...included.values()];
    if (context === 'payments' || context === 'administration') tables.sort((left, right) => Number(left.context === context) - Number(right.context === context));
    const id = `data-${database.id}-${context}`;
    const relationships = own.flatMap(table => table.constraints.filter(key => key.type === 'f').map((constraint, index) => ({ relationship: foreignKeyRelationship(table, constraint, index), table, constraint })));
    const selfReferences = relationships.filter(item => item.relationship.from === item.relationship.to);
    const href = `/guide/api/data-model/#context-${context}`;
    const entry = { id, title: `${context} · ${database.app}`, description: `Esquema PostgreSQL aplicado desde migraciones: ${own.length} tablas del contexto y ${tables.length - own.length} referencias externas.`, type: 'erd', href: `/explore/${id}/`, source: href, status: 'implemented', evidenceKind: 'migration-export', revision: source.commit };
    // Placement only: these positions neither introduce tables nor alter keys.
    const placement = context === 'administration' ? {
      'platform.database_realm': [0, 0], 'administration.country': [1, 0], 'administration.legal_entity': [2, 0], 'administration.branch': [3, 0],
      'administration.register': [4, 0], 'administration.device': [5, 0], 'administration.installation': [6, 0], 'administration.operational_profile': [7, 0],
      'administration.operator_account': [0, 1], 'administration.authorization_audit': [1, 1], 'administration.checkout_activation': [2, 1], 'administration.configuration_revision': [3, 1],
      'administration.operator_assignment': [4, 1], 'administration.lab_session': [5, 1], 'administration.login_throttle': [6, 1], 'administration.operational_role': [7, 1],
    } : context === 'devices' ? {
      'platform.database_realm': [0, 0], 'devices.controller': [1, 0], 'devices.registration': [2, 0], 'devices.job': [3, 0], 'devices.result': [4, 0],
    } : context === 'fiscal' ? {
      'platform.database_realm': [0, 0], 'fiscal.document': [1, 0], 'fiscal.attempt': [2, 0], 'fiscal.evidence': [3, 0], 'fiscal.representation': [1, 1], 'fiscal.representation_content': [2, 1],
    } : {};
    const entities = tables.map((table, index) => ({
      id: entityId(table), label: fullname(table), row: placement[fullname(table)]?.[0] ?? Math.floor(index / 2), col: placement[fullname(table)]?.[1] ?? index % 2,
      attributes: table.columns.map(column => {
        const key = [...new Set(table.constraints.filter(constraint => roles[constraint.type] && constraint.columns.includes(column.name)).map(constraint => roles[constraint.type]))];
        const references = [...new Set(table.constraints.filter(constraint => constraint.type === 'f' && constraint.columns.includes(column.name)).map(constraint => `${entityId(constraint.references)}.${constraint.references.columns[constraint.columns.indexOf(column.name)]}`))];
        // The viewer supports one attribute reference. Use a real, stable target;
        // the visible scope note and the inspector disclose every declared FK.
        const reference = references.sort().find(value => included.has(value.split('.')[0].replace('__', '.'))) || null;
        if (reference) key.push('fk');
        return { name: column.name, type: column.type, ...(key.length ? { key } : {}), ...(reference ? { references: reference } : {}) };
      }),
    }));
    const diagram = {
      schema_version: 1, diagram_type: 'erd',
      meta: { title: entry.title, locale: 'es', output: `${id}.html`, quality_profile: tables.length > 8 || tables.reduce((sum, table) => sum + table.columns.length, 0) > 50 ? 'standard' : 'showcase', animation: 'none' },
      layout: { mode: 'grid', entityW: 590, gapX: 110, gapY: 100, rowH: 22, headerH: 36 },
      entities, relationships: relationships.filter(item => item.relationship.from !== item.relationship.to).map(item => item.relationship),
      cards: [{ dot: 'cyan', title: 'Lectura del esquema físico', items: [
        'Las líneas representan FK declaradas; selecciona una relación para ver todas sus columnas. PK/UK pueden ser compuestas: la marca indica pertenencia a la restricción, no unicidad individual.',
        'Una columna puede participar en varias FK. La marca FK enlaza al primer destino declarado en orden alfabético; las líneas y la ficha conservan todas las restricciones del contexto. Las tablas de otro contexto son referencias directas; sus dependencias se consultan en su vista propia.',
        `Origen: migraciones aplicadas a PostgreSQL efímero. Revisión ${source.commit}. No se incluyen datos operativos ni se acredita despliegue productivo.`,
        ...selfReferences.map(item => `Autorreferencia de ${fullname(item.table)}: ${item.constraint.definition}. Archify no dibuja relaciones de una tabla consigo misma; esta restricción se conserva aquí, en la ficha y en la referencia SQL.`),
      ] }],
    };
    const details = {
      nodes: Object.fromEntries(tables.map(table => [entityId(table), {
        title: fullname(table), description: `${table.documentation.description} ${table.documentation.usage} ${table.context !== context ? 'Referencia de otro contexto.' : ''}`.trim(),
        technology: `${database.engine}${database.engineVersion ? ` ${database.engineVersion}` : ''} · ${database.app} · ${source.commit.slice(0, 7)}`, status: 'implemented', evidenceKind: 'migration-export', href: `/guide/api/data-model/#table-${database.id}-${table.schema}-${table.name}`,
        fields: table.columns.map(column => `${column.name}: ${column.type}${column.nullable ? ' · NULL' : ' · NOT NULL'}${column.default == null ? '' : ` · DEFAULT ${column.default}`}${column.comment ? ` · ${column.comment}` : ''}`),
        fieldDocumentation: table.columns.map(column => ({name: column.name, type: column.type, nullable: column.nullable, default: column.default, comment: column.comment, ...column.documentation, href: `/guide/api/data-model/#field-${database.id}-${table.schema}-${table.name}-${column.name}`})),
        constraints: table.constraints.map(constraint => `${constraint.name}: ${constraint.definition}`),
        indexes: table.indexes.map(index => index.definition),
        links: [{ label: 'Diccionario y SQL de esta tabla', href: `/guide/api/data-model/#table-${database.id}-${table.schema}-${table.name}` }, ...table.documentation.sources.map(item => ({label: item.symbol || item.path.split('/').at(-1), href: `${source.repository}/blob/${source.commit}/${item.path}`}))],
      }])),
      edges: Object.fromEntries(relationships.map(({ relationship, constraint, table }) => [relationship.id, {
        title: constraint.name, description: constraint.definition,
        technology: `${fullname(table)} (${constraint.columns.join(', ')}) → ${constraint.references.schema}.${constraint.references.table} (${constraint.references.columns.join(', ')})`,
        status: 'implemented', evidenceKind: 'migration-export', href,
        links: [{ label: 'Esquema y restricciones', href }],
      }])),
    };
    return { ...entry, diagram, details };
  }));
}
