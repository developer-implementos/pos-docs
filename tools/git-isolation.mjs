import { execFileSync } from 'node:child_process';

/**
 * Aísla un proceso del repositorio que lo lanzó.
 *
 * Git exporta GIT_DIR y otras variables del repositorio a sus hooks y a
 * `git rebase --exec`. Desde un worktree enlazado GIT_DIR es una ruta absoluta, así que
 * una prueba que las hereda y crea sus propios repositorios actúa sobre el que la lanzó:
 * commits, ramas e identidad de fixture en el repositorio real (pos-platform #214, #311 y
 * #313). Quita de `env` las variables que Git declara locales a un repositorio, el mismo
 * conjunto que Git descarta al operar sobre un submódulo, y devuelve sus nombres.
 */
export function isolateFromInvokingRepository(env = process.env) {
  const names = execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8', windowsHide: true })
    .split(/\r?\n/)
    .filter(Boolean);
  if (!names.includes('GIT_DIR')) {
    throw new Error('git rev-parse --local-env-vars no declaró GIT_DIR: no se puede aislar el proceso.');
  }
  for (const name of names) delete env[name];
  return names;
}
