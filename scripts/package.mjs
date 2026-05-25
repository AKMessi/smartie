import { packager } from '@electron/packager';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import process from 'node:process';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const target = process.argv[2] || process.platform;
const platformAliases = {
  linux: 'linux',
  win: 'win32',
  win32: 'win32',
  windows: 'win32'
};
const platform = platformAliases[target];

if (!platform) {
  throw new Error(`Unsupported package target "${target}". Use linux or win32.`);
}

for (const required of ['src/main.js', 'native']) {
  if (!existsSync(join(root, required))) {
    throw new Error(`Missing package input: ${required}`);
  }
}

const appPaths = await packager({
  dir: root,
  name: 'Smartie',
  platform,
  arch: 'x64',
  out: join(root, 'dist'),
  overwrite: true,
  prune: true,
  asar: {
    unpack: '**/{node_modules/ffmpeg-static,native}/**'
  },
  ignore: [
    /^\/dist($|\/)/,
    /^\/release($|\/)/,
    /^\/node_modules\/\.cache($|\/)/
  ]
});

for (const appPath of appPaths) {
  console.log(`Wrote app package: ${appPath}`);
}
