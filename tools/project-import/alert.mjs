/**
 * Turns a failing automatic import into one visible, self-closing issue.
 *
 *   IMPORT_RESULT=<needs.import.result> node tools/project-import/alert.mjs
 *
 * A scheduled run that fails is read by nobody: from 2026-11-13 the hourly import failed more than 88
 * times in a row before anyone noticed (TASK-386). This step runs after the import job:
 *
 * - a failed or cancelled scheduled or dispatched run opens the single alert issue, or comments it at
 *   most once a day while it stays open, so an hourly failure does not bury it in notifications;
 * - a successful run comments and closes the open alert, because the import recovers on its own: there
 *   is nothing left for a person to declare resolved;
 * - a skipped import (the schedule is opt-in) and a failed manual dispatch, which its author watches,
 *   change nothing.
 *
 * The repository and its issues are public: the text carries the run, the commit and the event, never
 * logs, snapshot contents or the product's private data. `gh` arrives as a function so tests never
 * reach the network; values reach it as arguments, without a shell.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const label = 'importacion-en-rojo';
export const title = 'La importación automática del producto está fallando';
/** While the alert stays open, a new failure comments it only if nothing touched it for this long. */
export const reminderInterval = 24 * 60 * 60 * 1000;

const alerting = new Set(['schedule', 'repository_dispatch']);

/** What to do for an import result and the event that ran it: `alert`, `recover` or `none`. */
export function decide(result, event) {
  if (result === 'success') return 'recover';
  if ((result === 'failure' || result === 'cancelled') && alerting.has(event)) return 'alert';
  return 'none';
}

function runUrl(env) {
  if (!/^\d+$/.test(env.GITHUB_RUN_ID ?? '')) throw new Error('GITHUB_RUN_ID must identify the run.');
  return `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`;
}

/** Text of the alert or of its reminder. */
export function failureMessage(env) {
  return [
    `La corrida ${runUrl(env)} de \`Project import\` terminó en \`${env.IMPORT_RESULT}\` sobre \`${env.GITHUB_SHA}\` (evento \`${env.GITHUB_EVENT_NAME}\`).`,
    '',
    `Mientras falle, el portal conserva el último corte importado y la PR de importación no se actualiza. El resumen del job dice en qué paso falló; la guía de operación está en [tools/project-import/README.md](${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/blob/main/tools/project-import/README.md#operación).`,
    '',
    'Esta issue se cierra sola cuando una corrida termina bien. Mientras siga abierta, un fallo nuevo la comenta como mucho una vez al día.',
  ].join('\n');
}

export function recoveryMessage(env) {
  return `La corrida ${runUrl(env)} sobre \`${env.GITHUB_SHA}\` terminó bien: la importación automática se recuperó.`;
}

function openAlerts(env, gh) {
  const listed = JSON.parse(gh(['issue', 'list', '--repo', env.GITHUB_REPOSITORY, '--label', label, '--state', 'open', '--limit', '100', '--json', 'number,updatedAt']));
  return listed.sort((left, right) => left.number - right.number);
}

/**
 * Applies the decision. Returns what it did. A `gh` failure propagates and leaves the job red, which
 * is the only signal left when the alert itself cannot be written.
 */
export function notify(env, gh, now = Date.now()) {
  const action = decide(env.IMPORT_RESULT, env.GITHUB_EVENT_NAME);
  if (action === 'none') return { action };
  const repository = ['--repo', env.GITHUB_REPOSITORY];
  const [open] = openAlerts(env, gh);
  if (action === 'recover') {
    if (!open) return { action: 'none' };
    gh(['issue', 'close', String(open.number), ...repository, '--comment', recoveryMessage(env)]);
    return { action: 'close', number: open.number };
  }
  if (open) {
    const updated = Date.parse(open.updatedAt);
    if (Number.isFinite(updated) && now - updated < reminderInterval) return { action: 'quiet', number: open.number };
    gh(['issue', 'comment', String(open.number), ...repository, '--body', failureMessage(env)]);
    return { action: 'comment', number: open.number };
  }
  // `issue create` fails on a missing label, and nobody watches this run; `--force` keeps an existing one.
  gh(['label', 'create', label, ...repository, '--color', 'B60205', '--force', '--description', title]);
  gh(['issue', 'create', ...repository, '--title', title, '--label', label, '--body', failureMessage(env)]);
  return { action: 'create' };
}

function runGh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  // Never print gh's output: it may echo the request.
  if (result.status !== 0) throw new Error(`gh ${args[0]} ${args[1]} exited with ${result.status}.`);
  return result.stdout;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outcome = notify(process.env, runGh);
  const said = {
    none: 'Sin alerta que abrir ni cerrar.',
    quiet: `Alerta #${outcome.number} abierta y comentada hace menos de un día: sin comentario nuevo.`,
    comment: `Alerta #${outcome.number} comentada.`,
    create: 'Alerta creada.',
    close: `Alerta #${outcome.number} cerrada: la importación se recuperó.`,
  };
  console.log(said[outcome.action]);
}
