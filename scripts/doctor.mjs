import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checks = [];

function run(command, args = []) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch {
    return null;
  }
}

function commandExists(command) {
  return Boolean(run('which', [command]));
}

function add(status, name, detail) {
  checks.push({ status, name, detail });
}

function serviceState(name) {
  if (!commandExists('systemctl')) {
    return null;
  }

  return run('systemctl', ['--user', 'is-active', name]);
}

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  add(major >= 22 ? 'PASS' : 'FAIL', 'Node.js', `running ${process.version}, requires v22+`);
}

function checkPlatform() {
  const supported = process.platform === 'linux' && process.arch === 'x64';
  add(supported ? 'PASS' : 'WARN', 'Platform', `${process.platform}/${process.arch}; Smartie is currently tuned for linux/x64`);
}

function checkElectronInstall() {
  const electronPath = join(root, 'node_modules', 'electron');
  add(existsSync(electronPath) ? 'PASS' : 'FAIL', 'Electron dependency', existsSync(electronPath) ? 'installed' : 'run npm install');
}

function checkSandbox() {
  const sandboxPath = join(root, 'node_modules', 'electron', 'dist', 'chrome-sandbox');
  if (!existsSync(sandboxPath)) {
    add('WARN', 'Electron sandbox helper', 'not downloaded yet; npm start will fetch Electron on first run');
    return;
  }

  const stats = statSync(sandboxPath);
  const hasSetuid = Boolean(stats.mode & 0o4000);
  const rootOwned = stats.uid === 0;
  const detail = rootOwned && hasSetuid
    ? 'setuid sandbox is configured'
    : 'not root-owned setuid; Smartie dev scripts use --no-sandbox on this workspace';
  add(rootOwned && hasSetuid ? 'PASS' : 'WARN', 'Electron sandbox helper', detail);
}

function checkDesktopSession() {
  const session = process.env.XDG_SESSION_TYPE || 'unknown';
  const portal = serviceState('xdg-desktop-portal.service');
  const pipewire = serviceState('pipewire.service');

  add(session === 'wayland' || session === 'x11' ? 'PASS' : 'WARN', 'Desktop session', session);

  if (session === 'wayland') {
    add(portal === 'active' ? 'PASS' : 'WARN', 'xdg-desktop-portal', portal || 'not detected; Wayland capture may require the portal service');
    add(pipewire === 'active' ? 'PASS' : 'WARN', 'PipeWire', pipewire || 'not detected; Wayland capture may require PipeWire');
  } else {
    add('PASS', 'Portal check', 'not required for X11 sessions');
  }
}

function checkPackageTool() {
  const packagerPath = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-packager.cmd' : 'electron-packager');
  add(existsSync(packagerPath) ? 'PASS' : 'FAIL', 'Linux packager', existsSync(packagerPath) ? 'installed' : 'run npm install');
}

checkNode();
checkPlatform();
checkElectronInstall();
checkSandbox();
checkDesktopSession();
checkPackageTool();

let hasFailure = false;
for (const check of checks) {
  if (check.status === 'FAIL') {
    hasFailure = true;
  }

  console.log(`${check.status.padEnd(4)} ${check.name}: ${check.detail}`);
}

if (hasFailure) {
  process.exit(1);
}
