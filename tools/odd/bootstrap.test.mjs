import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(directory, 'bootstrap.ps1');
const lockPath = path.join(directory, 'toolchain.lock.json');
const shell = 'pwsh';
const quote = (value) => `'${value.replaceAll("'", "''")}'`;

/**
 * Si estas pruebas corren aqui, y que pasa si no pueden.
 *
 * Las dos pruebas de PowerShell de este archivo ejecutan logica portable de
 * `bootstrap.ps1`: integridad SHA-256, rechazo de traversal y enlaces
 * simbolicos, y URL oficial del lock; la segunda ya distingue el caso no
 * Windows. Hasta el 2026-11-05 corrian en Linux en `delivery-progress`, porque
 * el runner alojado traia `pwsh`. Acotarlas por sistema operativo (TASK-185)
 * resolvia que una maquina Linux sin `pwsh` no pudiera empujar, pero las
 * dejaba sin ejecutarse en toda la CI con el paso en verde: la premisa de que
 * fuera de Windows «no comprueban nada» era falsa (revision de #161).
 *
 * La regla correcta mira la herramienta, no el sistema. Con `pwsh`, corren. Sin
 * el, en el equipo de una persona se omiten con su motivo -el anillo 0 no debe
 * impedir empujar-, y en CI fallan: ahi la ausencia es un runner mal
 * aprovisionado, y omitir seria presentar como verificado lo que no corrio.
 * `delivery-progress` instala PowerShell fijado para que esto se cumpla.
 */
export function bootstrapScope({ pwshAvailable, ci }) {
  if (pwshAvailable) return { run: true, reason: null };
  if (ci)
    return {
      run: true,
      reason:
        'pwsh es obligatorio en CI para verificar bootstrap.ps1: el job debe instalar el PowerShell fijado antes de odd:test',
    };
  return {
    run: false,
    reason: 'pwsh no esta instalado en este equipo; la CI ejecuta estas pruebas con el PowerShell fijado',
  };
}

const pwshAvailable = (() => {
  const probe = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-Command', 'exit 0'], {
    encoding: 'utf8',
    timeout: 20_000,
  });
  return !probe.error && probe.status === 0;
})();
const decision = bootstrapScope({
  pwshAvailable,
  ci: process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
});
const scope = decision.run ? {} : { skip: decision.reason };
/** En CI sin pwsh la prueba corre y falla con un motivo, en vez de omitirse. */
const requirePwsh = () => assert.ok(pwshAvailable, decision.reason ?? 'pwsh no esta disponible');

test('las pruebas de PowerShell se acotan por la herramienta y nunca se omiten en CI', () => {
  assert.deepEqual(bootstrapScope({ pwshAvailable: true, ci: true }), { run: true, reason: null });
  assert.deepEqual(bootstrapScope({ pwshAvailable: true, ci: false }), { run: true, reason: null });
  const local = bootstrapScope({ pwshAvailable: false, ci: false });
  assert.equal(local.run, false, 'en un equipo sin pwsh se omiten para poder empujar');
  assert.match(local.reason, /CI ejecuta/);
  const ci = bootstrapScope({ pwshAvailable: false, ci: true });
  assert.equal(ci.run, true, 'en CI sin pwsh deben correr y fallar, no omitirse');
  assert.match(ci.reason, /obligatorio en CI/);
});

test('toolchain has immutable official artifacts and the released Gentle AI module', () => {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.platform, 'windows-amd64');
  assert.equal(lock.gentleAi.version, '4.3.1');
  assert.equal(lock.gentleAi.commit, '2dba7784114fff57864519c4c0d067e952a8c98b');
  assert.equal(lock.gentleAi.package, 'github.com/gentleman-programming/gentle-ai/v4/cmd/gentle-ai');
  for (const artifact of [lock.go, lock.engram]) {
    assert.match(artifact.sha256, /^[a-f0-9]{64}$/);
    assert.equal(new URL(artifact.url).protocol, 'https:');
    assert.ok(artifact.url.includes(artifact.version));
    assert.ok(!artifact.url.includes('latest'));
  }
});

test('bootstrap rejects altered archives, traversal and unsafe lock data without installing', scope, () => {
  requirePwsh();
  const fixture = mkdtempSync(path.join(tmpdir(), 'pos-odd-bootstrap-test-'));
  const testScript = path.join(fixture, 'checks.ps1');
  try {
    writeFileSync(
      testScript,
      `
$ErrorActionPreference = 'Stop'
. ${quote(script)}
function Reject([scriptblock] $Action, [string] $Expected) {
  try { & $Action; throw 'Expected rejection did not occur' }
  catch { if ($_.Exception.Message -notmatch $Expected) { throw } }
}
$lock = Read-ToolchainLock ${quote(lockPath)}
$fixture = ${quote(fixture)}
$sample = Join-Path $fixture 'sample.txt'
[IO.File]::WriteAllText($sample, 'trusted bytes')
$hash = (Get-FileHash -LiteralPath $sample -Algorithm SHA256).Hash.ToLowerInvariant()
Assert-ArtifactHash $sample $hash
Reject { Assert-ArtifactHash $sample ('0' * 64) } 'SHA256 mismatch'
Reject { Assert-ArchiveEntry '../outside.txt' $fixture 0 } 'Unsafe archive entry'
Reject { Assert-ArchiveEntry 'a/../../outside.txt' $fixture 0 } 'Unsafe archive entry'
Reject { Assert-ArchiveEntry 'C:/outside.txt' $fixture 0 } 'Unsafe archive entry'
Reject { Assert-ArchiveEntry 'a\\..\\outside.txt' $fixture 0 } 'Unsafe archive entry'
Reject { Assert-ArchiveEntry 'symlink' $fixture ([int]0xA0000000) } 'symbolic link'
Assert-ArchiveEntry 'go/bin/go.exe' $fixture 0
Reject { Assert-ChildPath $fixture (Join-Path $fixture '../sibling') } 'outside'
Assert-ChildPath $fixture (Join-Path $fixture 'valid/child')
$invalid = Join-Path $fixture 'invalid.json'
$lock.go.url = 'http://go.dev/dl/go1.25.10.windows-amd64.zip'
$lock | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $invalid -Encoding UTF8
Reject { Read-ToolchainLock $invalid } 'official HTTPS'
$lock.go.url = 'https://evil.example/go1.25.10.windows-amd64.zip'
$lock | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $invalid -Encoding UTF8
Reject { Read-ToolchainLock $invalid } 'official HTTPS'
$lock.go.url = 'https://go.dev/dl/go1.25.10.windows-amd64.zip'
$lock.engram.version = '../escape'
$lock | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $invalid -Encoding UTF8
Reject { Read-ToolchainLock $invalid } 'version'
Write-Output 'bootstrap safety checks passed'
`,
    );
    const result = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-File', testScript], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /bootstrap safety checks passed/);
  } finally {
    const resolved = realpathSync(fixture);
    const parent = realpathSync(tmpdir());
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith('pos-odd-bootstrap-test-'));
    rmSync(resolved, { recursive: true, force: true });
  }
});

test(
  'bootstrap fixes the build target and restores inherited Go settings after success and failure',
  scope,
  () => {
    requirePwsh();
    const fixture = mkdtempSync(path.join(tmpdir(), 'pos-odd-bootstrap-env-'));
    const testScript = path.join(fixture, 'environment.ps1');
    try {
      writeFileSync(
        testScript,
        `
$ErrorActionPreference = 'Stop'
. ${quote(script)}
$lock = Read-ToolchainLock ${quote(lockPath)}
$paths = Get-ToolPaths $lock ${quote(fixture)}
$env:GOOS = 'linux'
$env:GOARCH = 'arm64'
$env:GOROOT = 'foreign-go-root'
$expectedRoot = Split-Path -Parent (Split-Path -Parent $paths.go)
$actual = Invoke-PinnedGoEnvironment $paths { "$env:GOOS|$env:GOARCH|$env:GOROOT" }
if ($actual -cne "windows|amd64|$expectedRoot") { throw 'Inherited build configuration was not isolated' }
if ($env:GOOS -cne 'linux' -or $env:GOARCH -cne 'arm64' -or $env:GOROOT -cne 'foreign-go-root') { throw 'Successful action did not restore environment' }
try {
  Invoke-PinnedGoEnvironment $paths { throw 'deliberate probe failure' }
  throw 'Expected failure did not occur'
} catch {
  if ($_.Exception.Message -cne 'deliberate probe failure') { throw }
}
if ($env:GOOS -cne 'linux' -or $env:GOARCH -cne 'arm64' -or $env:GOROOT -cne 'foreign-go-root') { throw 'Failed action did not restore environment' }
if ($IsWindows -and $env:LOCALAPPDATA) {
  $installed = Get-ToolPaths $lock (Join-Path $env:LOCALAPPDATA 'POS-Platform/odd-toolchain')
  if (Test-Path -LiteralPath $installed.go -PathType Leaf) {
    $probe = Invoke-PinnedGoEnvironment $installed {
      & $installed.go env GOOS GOARCH GOROOT
      if ($LASTEXITCODE -ne 0) { throw 'Pinned Go environment probe failed' }
    }
    $installedRoot = Split-Path -Parent (Split-Path -Parent $installed.go)
    if (($probe -join '|') -cne "windows|amd64|$installedRoot") { throw 'Real pinned Go inherited a foreign target or GOROOT' }
    $verified = Test-InstalledTools $lock $installed
    if ($verified.go -cne "go version go$($lock.go.version) windows/amd64") { throw 'Toolchain verification inherited a foreign Go configuration' }
    if ($env:GOOS -cne 'linux' -or $env:GOARCH -cne 'arm64' -or $env:GOROOT -cne 'foreign-go-root') { throw 'Toolchain verification did not restore inherited settings' }
    Write-Output 'real pinned Go environment passed'
  } else { Write-Output 'real Go probe unavailable; no installation attempted' }
} else { Write-Output 'real Windows Go probe not applicable on this host' }
Write-Output 'build environment isolation passed'
`,
      );
      const result = spawnSync(shell, ['-NoProfile', '-NonInteractive', '-File', testScript], {
        encoding: 'utf8',
        timeout: 20_000,
      });
      assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
      assert.match(result.stdout, /build environment isolation passed/);
    } finally {
      const resolved = realpathSync(fixture);
      assert.equal(path.dirname(resolved), realpathSync(tmpdir()));
      assert.ok(path.basename(resolved).startsWith('pos-odd-bootstrap-env-'));
      rmSync(resolved, { recursive: true, force: true });
    }
  },
);
