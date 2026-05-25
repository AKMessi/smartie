const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const GNOME_EXTENSION_UUID = 'smartie-telemetry@akmessi';
const ADAPTER_STATUS_SCHEMA = 'smartie.telemetry_adapter.status.v1';
const ADAPTER_INSTALL_SCHEMA = 'smartie.telemetry_adapter.install.v1';

function repoRoot() {
  return path.resolve(__dirname, '..');
}

function desktopName() {
  return [
    process.env.XDG_CURRENT_DESKTOP,
    process.env.DESKTOP_SESSION,
    process.env.GDMSESSION
  ].filter(Boolean).join(':').toLowerCase();
}

function sessionType() {
  return process.env.XDG_SESSION_TYPE || null;
}

function commandExists(command) {
  if (!command) {
    return false;
  }

  return (process.env.PATH || '').split(path.delimiter).some((directory) => {
    const candidates = process.platform === 'win32'
      ? [command, `${command}.exe`, `${command}.cmd`, `${command}.bat`]
      : [command];
    try {
      return candidates.some((candidate) => {
        try {
          fsSync.accessSync(path.join(directory, candidate), fsSync.constants.X_OK);
          return true;
        } catch {
          return false;
        }
      });
    } catch {
      return false;
    }
  });
}

async function commandOutput(command, args = [], timeout = 1200) {
  const result = await execFileAsync(command, args, {
    timeout,
    maxBuffer: 1024 * 512
  });
  return String(result.stdout || '').trim();
}

function gnomeExtensionSourcePath() {
  return path.join(repoRoot(), 'native', 'linux', 'gnome-shell', GNOME_EXTENSION_UUID);
}

function gnomeExtensionInstallPath() {
  return path.join(os.homedir(), '.local', 'share', 'gnome-shell', 'extensions', GNOME_EXTENSION_UUID);
}

function kwinAdapterSourcePath() {
  return path.join(repoRoot(), 'native', 'linux', 'kwin', 'smartie-telemetry');
}

function parseGnomeExtensionInfo(output) {
  const info = {};
  for (const line of String(output || '').split(/\r?\n/)) {
    const match = /^\s*([^:]+):\s*(.+?)\s*$/.exec(line);
    if (!match) {
      continue;
    }
    info[match[1].trim().toLowerCase()] = match[2].trim();
  }

  const state = String(info.state || info.enabled || '').toLowerCase();
  return {
    raw: output,
    name: info.name || null,
    state: info.state || null,
    enabled: state.includes('enabled') || /^yes$/i.test(info.enabled || ''),
    active: state === 'active',
    path: info.path || null,
    error: null
  };
}

function parseGsettingsStringArray(output) {
  const value = String(output || '').trim();
  if (!value || value === '@as []') {
    return [];
  }

  return [...value.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((match) => match[1].replace(/\\'/g, "'"));
}

function formatGsettingsStringArray(values) {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) {
    return '[]';
  }

  return `[${unique.map((value) => `'${String(value).replace(/'/g, "\\'")}'`).join(', ')}]`;
}

async function gnomeEnabledExtensionsSetting() {
  if (!commandExists('gsettings')) {
    return {
      available: false,
      enabledExtensions: [],
      includesSmartie: false,
      error: 'gsettings unavailable'
    };
  }

  try {
    const output = await commandOutput('gsettings', ['get', 'org.gnome.shell', 'enabled-extensions'], 1000);
    const enabledExtensions = parseGsettingsStringArray(output);
    return {
      available: true,
      enabledExtensions,
      includesSmartie: enabledExtensions.includes(GNOME_EXTENSION_UUID),
      error: null
    };
  } catch (error) {
    return {
      available: false,
      enabledExtensions: [],
      includesSmartie: false,
      error: String(error.stderr || error.message || 'Could not read GNOME enabled extensions').trim()
    };
  }
}

async function setGnomeEnabledExtension(enabled) {
  if (!commandExists('gsettings')) {
    throw new Error('gsettings command unavailable');
  }

  const current = await gnomeEnabledExtensionsSetting();
  if (!current.available) {
    throw new Error(current.error || 'GNOME enabled extensions setting unavailable');
  }

  const next = enabled
    ? [...current.enabledExtensions, GNOME_EXTENSION_UUID]
    : current.enabledExtensions.filter((extension) => extension !== GNOME_EXTENSION_UUID);
  await commandOutput('gsettings', [
    'set',
    'org.gnome.shell',
    'enabled-extensions',
    formatGsettingsStringArray(next)
  ], 1200);
}

async function gnomeExtensionInfo() {
  if (!commandExists('gnome-extensions')) {
    return {
      commandAvailable: false,
      installed: fsSync.existsSync(gnomeExtensionInstallPath()),
      enabled: false,
      active: false,
      state: null,
      error: 'gnome-extensions command unavailable'
    };
  }

  try {
    const output = await commandOutput('gnome-extensions', ['info', GNOME_EXTENSION_UUID], 1500);
    const parsed = parseGnomeExtensionInfo(output);
    return {
      commandAvailable: true,
      installed: true,
      ...parsed
    };
  } catch (error) {
    return {
      commandAvailable: true,
      installed: fsSync.existsSync(gnomeExtensionInstallPath()),
      enabled: false,
      active: false,
      state: null,
      error: String(error.stderr || error.message || 'GNOME extension not installed').trim()
    };
  }
}

async function waitForGnomeExtensionActive(timeoutMs = 3500) {
  const startedAt = Date.now();
  let latest = await gnomeExtensionInfo();
  while (!latest.active && Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    latest = await gnomeExtensionInfo();
  }

  return latest;
}

async function statusTelemetryAdapters() {
  const desktop = desktopName();
  const session = sessionType();
  const isLinux = process.platform === 'linux';
  const isGnome = desktop.includes('gnome');
  const isKde = desktop.includes('kde') || desktop.includes('plasma');
  const [gnomeInfo, gnomeEnabledSetting] = await Promise.all([
    gnomeExtensionInfo(),
    gnomeEnabledExtensionsSetting()
  ]);
  const gnomeSource = gnomeExtensionSourcePath();
  const kwinSource = kwinAdapterSourcePath();
  const helperPath = process.env.SMARTIE_TELEMETRY_HELPER || null;
  const socketPath = process.platform === 'linux'
    ? path.join(process.env.XDG_RUNTIME_DIR || os.tmpdir(), 'smartie-telemetry.sock')
    : null;

  const gnomeAdapter = {
    id: 'gnome-shell',
    label: 'GNOME Shell',
    supported: isLinux && isGnome && session === 'wayland',
    recommended: isLinux && isGnome,
    sourcePath: gnomeSource,
    sourceAvailable: fsSync.existsSync(path.join(gnomeSource, 'extension.js')),
    installPath: gnomeExtensionInstallPath(),
    installed: Boolean(gnomeInfo.installed),
    enabled: Boolean(gnomeInfo.enabled),
    active: Boolean(gnomeInfo.active),
    enabledSetting: Boolean(gnomeEnabledSetting.includesSmartie),
    pendingRestart: Boolean(gnomeInfo.installed && gnomeEnabledSetting.includesSmartie && !gnomeInfo.active),
    commandAvailable: Boolean(gnomeInfo.commandAvailable),
    gsettingsAvailable: Boolean(gnomeEnabledSetting.available),
    state: gnomeInfo.state,
    error: gnomeInfo.error || gnomeEnabledSetting.error || null
  };

  const kwinAdapter = {
    id: 'kwin',
    label: 'KDE KWin',
    supported: isLinux && isKde && session === 'wayland',
    recommended: isLinux && isKde,
    sourcePath: kwinSource,
    sourceAvailable: fsSync.existsSync(path.join(kwinSource, 'contents', 'code', 'main.js')),
    installPath: path.join(os.homedir(), '.local', 'share', 'kwin', 'scripts', 'smartie-telemetry'),
    installed: fsSync.existsSync(path.join(os.homedir(), '.local', 'share', 'kwin', 'scripts', 'smartie-telemetry')),
    enabled: false,
    commandAvailable: commandExists('kpackagetool6') || commandExists('kpackagetool5'),
    state: null,
    error: isKde ? null : 'not-kde'
  };

  const adapters = [gnomeAdapter, kwinAdapter];
  const best = adapters.find((adapter) => adapter.supported && adapter.recommended) || adapters.find((adapter) => adapter.recommended) || null;
  const ready = Boolean(gnomeAdapter.active || (helperPath && fsSync.existsSync(helperPath)));

  return {
    schema: ADAPTER_STATUS_SCHEMA,
    generated_at: new Date().toISOString(),
    platform: process.platform,
    session_type: session,
    desktop,
    socketPath,
    helperPath,
    ready,
    bestAdapter: best ? best.id : null,
    adapters,
    notes: adapterNotes({ gnomeAdapter, kwinAdapter, helperPath })
  };
}

function adapterNotes({ gnomeAdapter, kwinAdapter, helperPath }) {
  const notes = [];
  if (gnomeAdapter.recommended && !gnomeAdapter.active) {
    notes.push(gnomeAdapter.pendingRestart
      ? 'GNOME adapter is enabled in settings and will activate after the next login.'
      : gnomeAdapter.installed
        ? 'GNOME adapter installed but not enabled.'
        : 'GNOME adapter can be installed for precision telemetry.');
  }
  if (kwinAdapter.recommended) {
    notes.push('KWin adapter package is included, but the runtime bridge still requires a helper that can receive KWin D-Bus events.');
  }
  if (!helperPath) {
    notes.push('SMARTIE_TELEMETRY_HELPER is not set; Smartie will use compositor socket adapters when available.');
  }
  return notes;
}

async function installGnomeTelemetryAdapter({ enable = true } = {}) {
  const sourcePath = gnomeExtensionSourcePath();
  const installPath = gnomeExtensionInstallPath();
  if (!fsSync.existsSync(path.join(sourcePath, 'extension.js'))) {
    throw new Error(`GNOME adapter source is missing: ${sourcePath}`);
  }

  const commands = [];
  let installWarning = null;
  if (commandExists('gnome-extensions')) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'smartie-gnome-extension-'));
    try {
      try {
        await commandOutput('gnome-extensions', ['disable', GNOME_EXTENSION_UUID], 1800);
        commands.push(`gnome-extensions disable ${GNOME_EXTENSION_UUID}`);
      } catch {
        // The extension may not be visible in the current Shell yet.
      }
      await commandOutput('gnome-extensions', ['pack', '--force', '--out-dir', tempDir, sourcePath], 5000);
      commands.push('gnome-extensions pack');
      const bundles = await fs.readdir(tempDir);
      const bundle = bundles.find((file) => file.endsWith('.shell-extension.zip'));
      if (!bundle) {
        throw new Error('gnome-extensions pack did not create an extension bundle.');
      }
      await commandOutput('gnome-extensions', ['install', '--force', path.join(tempDir, bundle)], 5000);
      commands.push(`gnome-extensions install --force ${bundle}`);
    } catch (error) {
      installWarning = String(error.stderr || error.message || 'GNOME extension bundle install failed').trim();
      await fs.mkdir(path.dirname(installPath), { recursive: true });
      await fs.rm(installPath, { recursive: true, force: true });
      await fs.cp(sourcePath, installPath, {
        recursive: true,
        force: true,
        errorOnExist: false
      });
      commands.push('manual copy fallback');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } else {
    installWarning = 'gnome-extensions command unavailable';
    await fs.mkdir(path.dirname(installPath), { recursive: true });
    await fs.rm(installPath, { recursive: true, force: true });
    await fs.cp(sourcePath, installPath, {
      recursive: true,
      force: true,
      errorOnExist: false
    });
    commands.push('manual copy fallback');
  }

  let enabled = false;
  let enableError = null;
  let pendingRestart = false;
  if (enable && commandExists('gnome-extensions')) {
    try {
      await commandOutput('gnome-extensions', ['enable', GNOME_EXTENSION_UUID], 2500);
      commands.push(`gnome-extensions enable ${GNOME_EXTENSION_UUID}`);
      const activeInfo = await waitForGnomeExtensionActive();
      enabled = Boolean(activeInfo.enabled);
      pendingRestart = !activeInfo.active;
    } catch (error) {
      enableError = String(error.stderr || error.message || 'GNOME extension enable failed').trim();
      try {
        await setGnomeEnabledExtension(true);
        commands.push('gsettings set org.gnome.shell enabled-extensions');
        pendingRestart = true;
      } catch (settingError) {
        enableError = `${enableError} | ${settingError.message || settingError}`;
      }
    }
  } else if (enable && !installWarning) {
    try {
      await setGnomeEnabledExtension(true);
      commands.push('gsettings set org.gnome.shell enabled-extensions');
      pendingRestart = true;
    } catch (settingError) {
      enableError = `gnome-extensions command unavailable | ${settingError.message || settingError}`;
    }
  }

  const status = await statusTelemetryAdapters();
  return {
    schema: ADAPTER_INSTALL_SCHEMA,
    installed_at: new Date().toISOString(),
    adapter: 'gnome-shell',
    installPath,
    enabled: enabled || Boolean(status.adapters.find((adapter) => adapter.id === 'gnome-shell')?.enabled),
    active: Boolean(status.adapters.find((adapter) => adapter.id === 'gnome-shell')?.active),
    pendingRestart: pendingRestart || Boolean(status.adapters.find((adapter) => adapter.id === 'gnome-shell')?.pendingRestart),
    commands,
    warning: [installWarning, enableError].filter(Boolean).join(' | ') || null,
    status
  };
}

async function uninstallGnomeTelemetryAdapter() {
  const installPath = gnomeExtensionInstallPath();
  let disableError = null;
  if (commandExists('gnome-extensions')) {
    try {
      await commandOutput('gnome-extensions', ['disable', GNOME_EXTENSION_UUID], 1800);
    } catch (error) {
      disableError = String(error.stderr || error.message || 'GNOME extension disable failed').trim();
    }
  }

  try {
    await setGnomeEnabledExtension(false);
  } catch (error) {
    disableError = [disableError, error.message || error].filter(Boolean).join(' | ');
  }

  await fs.rm(installPath, { recursive: true, force: true });
  return {
    schema: ADAPTER_INSTALL_SCHEMA,
    installed_at: new Date().toISOString(),
    adapter: 'gnome-shell',
    uninstalled: true,
    installPath,
    warning: disableError,
    status: await statusTelemetryAdapters()
  };
}

async function installBestTelemetryAdapter(options = {}) {
  const status = await statusTelemetryAdapters();
  if (status.bestAdapter === 'gnome-shell') {
    return installGnomeTelemetryAdapter(options);
  }

  throw new Error(status.bestAdapter === 'kwin'
    ? 'KWin adapter installation needs a runtime D-Bus bridge helper; use SMARTIE_TELEMETRY_HELPER for now.'
    : 'No supported compositor adapter is available for this desktop.');
}

module.exports = {
  GNOME_EXTENSION_UUID,
  ADAPTER_STATUS_SCHEMA,
  ADAPTER_INSTALL_SCHEMA,
  statusTelemetryAdapters,
  installBestTelemetryAdapter,
  installGnomeTelemetryAdapter,
  uninstallGnomeTelemetryAdapter
};
