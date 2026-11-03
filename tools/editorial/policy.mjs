const issuePattern = /^https:\/\/github\.com\/developer-implementos\/pos-platform\/issues\/([1-9]\d*)$/;
const allowedImpacts = new Set(['architecture', 'behavior', 'contracts', 'data', 'none']);
const requiredSections = ['Resultado', 'Fuentes y revisión', 'Validación', 'Riesgos y reversión'];
const requiredFields = ['Issue', 'Documentation-Impact', 'Sources', 'Reader-Journeys', 'Review-Evidence'];

// Template comments and examples must not satisfy the declaration accidentally.
export function visibleBody(body) {
  if (typeof body !== 'string' || body.length > 65_536) throw new Error('PR body must be text of at most 65536 characters.');
  let fence = null;
  return body.replace(/<!--(?:[^]*?-->|[^]*$)/g, '').split(/\r?\n/).map(line => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      return '';
    }
    if (marker) { fence = marker[1]; return ''; }
    return line;
  }).join('\n');
}

function requiredField(body, name) {
  const matches = [...body.matchAll(new RegExp(`^${name}:[ \\t]*(.*)$`, 'gm'))];
  if (matches.length !== 1 || !matches[0][1].trim()) throw new Error(`Declare exactly one non-empty ${name} field.`);
  return matches[0][1].trim();
}

function values(value, name) {
  const entries = value.split(',').map(entry => entry.trim());
  if (entries.some(entry => !entry) || new Set(entries).size !== entries.length) throw new Error(`${name} must contain distinct comma-separated values.`);
  return entries;
}

export function readerJourneys(body) {
  const journeys = values(requiredField(visibleBody(body), 'Reader-Journeys'), 'Reader-Journeys');
  for (const journey of journeys) {
    if (!/^\/(?:[a-z0-9-]+\/)*(?:#(?:[\p{L}\p{N}_-]|%[a-fA-F\d]{2})+)?$/u.test(journey)) {
      throw new Error('Reader-Journeys must contain public paths such as /guide/flows/printing/.');
    }
    let decoded;
    try { decoded = decodeURIComponent(journey); } catch { throw new Error('Reader-Journeys contains an invalid encoded fragment.'); }
    const fragment = decoded.split('#')[1];
    if (fragment && !/^[\p{L}\p{N}_-]+$/u.test(fragment)) throw new Error('Reader-Journeys contains an unsafe fragment.');
  }
  return journeys;
}

export function validatePullRequest({ body, knownFiles }) {
  const text = visibleBody(body);
  const fields = Object.fromEntries(requiredFields.map(name => [name, requiredField(text, name)]));
  const issue = issuePattern.exec(fields.Issue);
  if (!issue || !Number.isSafeInteger(Number(issue[1]))) throw new Error('Issue must be the full URL of one POS Platform issue.');
  const impacts = values(fields['Documentation-Impact'], 'Documentation-Impact');
  if (impacts.some(impact => !allowedImpacts.has(impact)) || (impacts.includes('none') && impacts.length !== 1)) {
    throw new Error('Documentation-Impact must use architecture, behavior, contracts, data, or none alone.');
  }
  if (impacts.includes('none')) {
    const reason = requiredField(text, 'Impact-Reason');
    if (reason.length < 30 || /^(?:n\/a|none|pending|pendiente|no aplica)[.!]?$/i.test(reason)) {
      throw new Error('Impact-Reason must explain why no architecture, behavior, contract or data changes are involved.');
    }
  }
  const sources = values(fields.Sources, 'Sources');
  for (const source of sources) {
    // Source identity is exact membership, not a glob or a shell expression.
    // Meeting originals legitimately contain spaces, Unicode and parentheses.
    if (source.startsWith('/') || /[\\\u0000-\u001f\u007f:*?\[\]<>|"]/.test(source) ||
        source.split('/').some(segment => !segment.trim() || segment === '.' || segment === '..')) {
      throw new Error('Sources must contain repository-relative file paths without traversal, URLs or globs.');
    }
    if (!knownFiles.has(source)) throw new Error(`Source is not a tracked or proposed file: ${JSON.stringify(source)}.`);
  }
  const journeys = readerJourneys(body);
  const reviewEvidence = fields['Review-Evidence'];
  if (reviewEvidence.length < 30 || /^(?:n\/a|none|pending|pendiente|no aplica|tests pasan)[.!]?$/i.test(reviewEvidence)) {
    throw new Error('Review-Evidence must identify the review/evidence or explain concretely what remains pending.');
  }
  for (const section of requiredSections) {
    const matches = [...text.matchAll(new RegExp(`^## ${section}\\s*$`, 'gm'))];
    if (matches.length !== 1) throw new Error(`Declare exactly one ${section} section.`);
    const after = text.slice(matches[0].index + matches[0][0].length);
    const content = after.split(/^## /m, 1)[0].trim();
    if (content.length < 30) throw new Error(`${section} must explain its scope, evidence or concrete pending work.`);
  }
  // Inspect the raw body conservatively: hidden comments/examples must not carry
  // closing references that GitHub could interpret when the PR is merged.
  if (/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)(?:\s*:\s*|\s+)(?:https:\/\/github\.com\/)?developer-implementos\/pos-platform(?:\/issues\/|#)\d+/i.test(body)) {
    throw new Error('Editorial PRs reference product issues without closing product deliverables.');
  }
  return { issueNumber: Number(issue[1]), issueUrl: fields.Issue, impacts, sources, journeys, reviewEvidence };
}

export function verifyIssue(issue, expectedNumber) {
  if (!issue || issue.number !== expectedNumber || issue.html_url !== `https://github.com/developer-implementos/pos-platform/issues/${expectedNumber}`) {
    throw new Error('GitHub returned a different issue identity.');
  }
  if (issue.pull_request) throw new Error('The Issue link points to a pull request, not an issue.');
  if (issue.state !== 'open') throw new Error('The linked issue is not open; reconcile the scope before continuing.');
  return { status: 'verified-open', issueNumber: expectedNumber };
}

export function filesAfterChanges(baseFiles, changes) {
  const files = new Set(baseFiles);
  for (const change of changes) {
    if (change.status === 'removed') files.delete(change.filename);
    else files.add(change.filename);
    if (change.status === 'renamed') files.delete(change.previous_filename);
  }
  return files;
}

export function validateOwners(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (lines.length === 0 || !lines.some(line => line.startsWith('* '))) throw new Error('CODEOWNERS requires a repository fallback.');
  const patterns = new Set();
  for (const line of lines) {
    const [pattern, ...owners] = line.split(/\s+/);
    if (patterns.has(pattern)) throw new Error('CODEOWNERS has a duplicate pattern.');
    patterns.add(pattern);
    if (pattern !== '*' && !/^\/[\w./-]+\/?$/.test(pattern)) throw new Error('CODEOWNERS must use explicit repository paths.');
    if (!owners.length || owners.some(owner => !/^@[a-z\d-]+(?:\/[a-z\d-]+)?$/i.test(owner))) throw new Error('Each CODEOWNERS area requires valid users or teams.');
  }
  return { areas: lines.length };
}
