import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'package.json',
  'src/main.js',
  'src/preload.js',
  'src/index.html',
  'src/styles.css',
  'src/renderer.js'
];

for (const file of requiredFiles) {
  const path = join(root, file);
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'smartie') {
  throw new Error('package.json name must stay smartie');
}

const html = readFileSync(join(root, 'src/index.html'), 'utf8');
for (const asset of ['styles.css', 'renderer.js']) {
  if (!html.includes(asset)) {
    throw new Error(`index.html does not reference ${asset}`);
  }
}

const renderer = readFileSync(join(root, 'src/renderer.js'), 'utf8');
for (const feature of [
  'smartMaster',
  'autoZoom',
  'cursorSpotlight',
  'motionFocus',
  'keyboardOverlay',
  'clickPulse',
  'idleWide',
  'pauseRecording',
  'cancelRecording',
  'saveSettings',
  'loadPersistedSettings',
  'handleGlobalShortcut',
  'cameraBubble',
  'drawCameraBubble',
  'openCameraStream',
  'saveMode',
  'chooseOutputFolder',
  'hydrateOutputFolder'
]) {
  if (!renderer.includes(feature)) {
    throw new Error(`Renderer is missing smart feature: ${feature}`);
  }
}

const main = readFileSync(join(root, 'src/main.js'), 'utf8');
for (const feature of ['globalShortcut', 'GlobalShortcutsPortal', 'registerGlobalShortcuts']) {
  if (!main.includes(feature)) {
    throw new Error(`Main process is missing shortcut feature: ${feature}`);
  }
}

const preload = readFileSync(join(root, 'src/preload.js'), 'utf8');
for (const feature of ['getShortcuts', 'onShortcut', 'chooseOutputDir', 'getDefaultOutputDir']) {
  if (!preload.includes(feature)) {
    throw new Error(`Preload is missing shortcut bridge: ${feature}`);
  }
}

console.log('Smartie smoke check passed.');
