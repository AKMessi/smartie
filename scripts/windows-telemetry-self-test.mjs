import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const helperPath = join(root, 'native', 'windows', 'smartie-telemetry-helper.ps1');

function commandExists(command) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [command], {
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return true;
  } catch {
    return false;
  }
}

if (!existsSync(helperPath)) {
  throw new Error(`Missing Windows telemetry helper: ${helperPath}`);
}

if (process.platform !== 'win32') {
  console.log('Windows telemetry helper self-test skipped on non-Windows host.');
  process.exit(0);
}

const shell = ['pwsh.exe', 'powershell.exe', 'pwsh', 'powershell'].find(commandExists);
if (!shell) {
  throw new Error('PowerShell is required for the Windows telemetry helper self-test.');
}

const output = execFileSync(shell, [
  '-NoProfile',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  helperPath,
  '-SelfTest'
], {
  encoding: 'utf8',
  timeout: 8000,
  maxBuffer: 1024 * 1024
});

const events = output
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const selfTest = events.find((event) => event.type === 'self-test');

if (!selfTest || selfTest.ok !== true || selfTest.pointer_available !== true) {
  throw new Error(`Windows telemetry helper self-test failed: ${output}`);
}

console.log('Windows telemetry helper self-test passed.');
