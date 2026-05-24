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
  const desktop = process.env.XDG_CURRENT_DESKTOP || process.env.DESKTOP_SESSION || 'unknown';
  const portal = serviceState('xdg-desktop-portal.service');
  const pipewire = serviceState('pipewire.service');

  add(session === 'wayland' || session === 'x11' ? 'PASS' : 'WARN', 'Desktop session', session);
  add('PASS', 'Desktop environment', desktop);

  if (session === 'wayland') {
    add(portal === 'active' ? 'PASS' : 'WARN', 'xdg-desktop-portal', portal || 'not detected; Wayland capture may require the portal service');
    add(pipewire === 'active' ? 'PASS' : 'WARN', 'PipeWire', pipewire || 'not detected; Wayland capture may require PipeWire');
  } else {
    add('PASS', 'Portal check', 'not required for X11 sessions');
  }
}

function checkNativeTelemetry() {
  const session = process.env.XDG_SESSION_TYPE || 'unknown';
  const desktop = `${process.env.XDG_CURRENT_DESKTOP || ''}:${process.env.DESKTOP_SESSION || ''}`.toLowerCase();
  const helperPath = process.env.SMARTIE_TELEMETRY_HELPER || '';
  const hasHelper = helperPath && existsSync(helperPath);
  const hasGdbus = commandExists('gdbus');
  const hasXdotool = commandExists('xdotool');
  const hasQdbus = commandExists('qdbus6') || commandExists('qdbus');
  const hasGnomeExtensions = commandExists('gnome-extensions');

  add(hasHelper ? 'PASS' : 'WARN', 'Native telemetry helper', hasHelper ? helperPath : 'SMARTIE_TELEMETRY_HELPER not set; compositor socket adapters can still connect while recording');

  if (session === 'x11') {
    add(hasXdotool ? 'PASS' : 'WARN', 'X11 telemetry provider', hasXdotool ? 'xdotool available' : 'install xdotool for active-window telemetry');
  }

  if (session === 'wayland' && desktop.includes('kde')) {
    add(hasQdbus ? 'PASS' : 'WARN', 'KWin telemetry adapter path', hasQdbus ? 'qdbus available for KWin adapter diagnostics' : 'qdbus/qdbus6 unavailable');
  }

  if (session === 'wayland' && desktop.includes('gnome')) {
    add(hasGnomeExtensions ? 'PASS' : 'WARN', 'GNOME telemetry adapter path', hasGnomeExtensions ? 'gnome-extensions available' : 'gnome-extensions unavailable');
  }

  if (process.platform === 'linux' && hasGdbus) {
    const atSpi = run('gdbus', [
      'call',
      '--session',
      '--dest',
      'org.a11y.Bus',
      '--object-path',
      '/org/a11y/bus',
      '--method',
      'org.a11y.Bus.GetAddress'
    ]);
    add(atSpi ? 'PASS' : 'WARN', 'AT-SPI semantic telemetry', atSpi ? 'accessibility bus available' : 'accessibility bus unavailable');
  } else if (process.platform === 'linux') {
    add('WARN', 'AT-SPI semantic telemetry', 'gdbus unavailable');
  }
}

function checkPackageTool() {
  const packagerPath = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-packager.cmd' : 'electron-packager');
  add(existsSync(packagerPath) ? 'PASS' : 'FAIL', 'Linux packager', existsSync(packagerPath) ? 'installed' : 'run npm install');
}

function checkBundledFfmpeg() {
  const ffmpegPath = join(root, 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (!existsSync(ffmpegPath)) {
    add('FAIL', 'Bundled FFmpeg', 'missing; run npm install');
    return;
  }

  const version = run(ffmpegPath, ['-version']);
  add(version ? 'PASS' : 'WARN', 'Bundled FFmpeg', version ? version.split('\n')[0] : 'installed but could not execute');
}

checkNode();
checkPlatform();
checkElectronInstall();
checkSandbox();
checkDesktopSession();
checkNativeTelemetry();
checkPackageTool();
checkBundledFfmpeg();

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
