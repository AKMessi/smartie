import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  installBestTelemetryAdapter,
  installGnomeTelemetryAdapter,
  statusTelemetryAdapters,
  uninstallGnomeTelemetryAdapter
} = require('../src/telemetry-adapters');

function usage() {
  return [
    'Usage: npm run telemetry:adapter -- <status|install|install-gnome|uninstall-gnome>',
    '',
    'Commands:',
    '  status          Print compositor telemetry adapter status.',
    '  install         Install the best adapter for the current desktop.',
    '  install-gnome   Install and enable the bundled GNOME Shell adapter.',
    '  uninstall-gnome Disable and remove the bundled GNOME Shell adapter.'
  ].join('\n');
}

async function main() {
  const command = process.argv[2] || 'status';
  let result = null;

  if (command === 'status') {
    result = await statusTelemetryAdapters();
  } else if (command === 'install') {
    result = await installBestTelemetryAdapter({ enable: true });
  } else if (command === 'install-gnome') {
    result = await installGnomeTelemetryAdapter({ enable: true });
  } else if (command === 'uninstall-gnome') {
    result = await uninstallGnomeTelemetryAdapter();
  } else {
    console.error(usage());
    process.exit(2);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
