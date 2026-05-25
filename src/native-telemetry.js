const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const SNAPSHOT_SCHEMA = 'smartie.native_telemetry.snapshot.v1';
const DIAGNOSTICS_SCHEMA = 'smartie.native_telemetry.diagnostics.v1';
const HELPER_PROTOCOL = 'smartie.native_telemetry.helper.v1';
const MAX_EVENT_BUFFER = 4000;

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function safeText(value, fallback = '') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
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

function isLinuxWayland() {
  return process.platform === 'linux' && sessionType() === 'wayland';
}

function commandExistsSync(command) {
  if (!command) {
    return false;
  }

  const pathValue = process.env.PATH || '';
  return pathValue.split(path.delimiter).some((directory) => {
    const candidates = process.platform === 'win32' && !path.extname(command)
      ? [command, `${command}.exe`, `${command}.cmd`, `${command}.bat`]
      : [command];
    return candidates.some((candidate) => {
      try {
        fs.accessSync(path.join(directory, candidate), fs.constants.X_OK);
        return true;
      } catch {
        return false;
      }
    });
  });
}

function appResourcePath(...parts) {
  const candidate = path.resolve(__dirname, '..', ...parts);
  const unpacked = candidate.replace('app.asar', 'app.asar.unpacked');
  return fs.existsSync(unpacked) ? unpacked : candidate;
}

function windowsPowerShellCommand() {
  if (process.platform !== 'win32') {
    return null;
  }

  return ['pwsh.exe', 'powershell.exe', 'pwsh', 'powershell'].find(commandExistsSync) || null;
}

function windowsNativeHelperPath() {
  if (process.platform !== 'win32') {
    return null;
  }

  const helperPath = appResourcePath('native', 'windows', 'smartie-telemetry-helper.ps1');
  return fs.existsSync(helperPath) ? helperPath : null;
}

function windowsNativeHelperStatus(helperActive = false) {
  const sourcePath = appResourcePath('native', 'windows', 'smartie-telemetry-helper.ps1');
  const sourceAvailable = fs.existsSync(sourcePath);
  const shellCommand = windowsPowerShellCommand();
  return {
    id: 'windows-user32',
    label: 'Windows User32 native telemetry',
    supported: process.platform === 'win32',
    recommended: process.platform === 'win32',
    available: process.platform === 'win32' && sourceAvailable && Boolean(shellCommand),
    active: Boolean(helperActive),
    provider: 'powershell-user32-jsonl',
    sourcePath,
    sourceAvailable,
    commandAvailable: Boolean(shellCommand),
    command: shellCommand,
    reason: process.platform !== 'win32'
      ? 'not-windows'
      : sourceAvailable && shellCommand
        ? (helperActive ? 'running' : 'available')
        : !sourceAvailable
          ? 'helper-script-missing'
          : 'powershell-unavailable'
  };
}

async function commandOutput(command, args = [], timeout = 650) {
  const result = await execFileAsync(command, args, {
    timeout,
    maxBuffer: 1024 * 256
  });
  return String(result.stdout || '').trim();
}

async function systemdUserUnitStatus(unitName) {
  if (process.platform !== 'linux' || !commandExistsSync('systemctl')) {
    return 'unknown';
  }

  try {
    return await commandOutput('systemctl', ['--user', 'is-active', unitName], 650);
  } catch (error) {
    return String(error.stdout || error.stderr || '').trim() || 'inactive';
  }
}

async function detectAtSpi() {
  if (process.platform !== 'linux' || !commandExistsSync('gdbus')) {
    return {
      available: false,
      provider: 'at-spi',
      reason: 'gdbus-unavailable'
    };
  }

  try {
    const output = await commandOutput('gdbus', [
      'call',
      '--session',
      '--dest',
      'org.a11y.Bus',
      '--object-path',
      '/org/a11y/bus',
      '--method',
      'org.a11y.Bus.GetAddress'
    ], 800);

    return {
      available: output.includes('unix:') || output.includes('tcp:'),
      provider: 'at-spi',
      reason: output ? 'available' : 'empty-address'
    };
  } catch (error) {
    return {
      available: false,
      provider: 'at-spi',
      reason: error.message || 'at-spi-unavailable'
    };
  }
}

async function detectPortalStack() {
  if (process.platform !== 'linux') {
    return {
      available: false,
      provider: 'xdg-desktop-portal',
      reason: 'not-linux'
    };
  }

  const [portal, pipewire] = await Promise.all([
    systemdUserUnitStatus('xdg-desktop-portal.service'),
    systemdUserUnitStatus('pipewire.service')
  ]);

  return {
    available: portal === 'active' && pipewire === 'active',
    provider: 'xdg-desktop-portal+pipewire',
    portal,
    pipewire,
    cursorMetadataCapable: portal === 'active' && pipewire === 'active',
    reason: portal === 'active' && pipewire === 'active'
      ? 'portal-and-pipewire-active'
      : 'portal-or-pipewire-inactive'
  };
}

async function detectGnomeExtension() {
  const desktop = desktopName();
  if (!desktop.includes('gnome')) {
    return {
      available: false,
      provider: 'gnome-shell-extension',
      reason: 'not-gnome'
    };
  }

  if (!commandExistsSync('gnome-extensions')) {
    return {
      available: false,
      provider: 'gnome-shell-extension',
      reason: 'gnome-extensions-command-unavailable'
    };
  }

  try {
    const output = await commandOutput('gnome-extensions', ['info', 'smartie-telemetry@akmessi'], 900);
    const enabled = /\bEnabled:\s+Yes\b/i.test(output) || /\bState:\s+ENABLED\b/i.test(output);
    return {
      available: enabled,
      provider: 'gnome-shell-extension',
      reason: enabled ? 'enabled' : 'installed-but-not-enabled'
    };
  } catch (error) {
    return {
      available: false,
      provider: 'gnome-shell-extension',
      reason: error.message || 'not-installed'
    };
  }
}

async function detectKwinAdapter() {
  const desktop = desktopName();
  if (!desktop.includes('kde') && !desktop.includes('plasma')) {
    return {
      available: false,
      provider: 'kwin-script',
      reason: 'not-kde'
    };
  }

  const qdbus = commandExistsSync('qdbus6') ? 'qdbus6' : commandExistsSync('qdbus') ? 'qdbus' : null;
  if (!qdbus) {
    return {
      available: false,
      provider: 'kwin-script',
      reason: 'qdbus-unavailable'
    };
  }

  try {
    await commandOutput(qdbus, ['org.kde.KWin', '/KWin', 'supportInformation'], 900);
    return {
      available: true,
      provider: 'kwin-script',
      transport: qdbus,
      reason: 'kwin-dbus-available'
    };
  } catch (error) {
    return {
      available: false,
      provider: 'kwin-script',
      transport: qdbus,
      reason: error.message || 'kwin-dbus-unavailable'
    };
  }
}

function parseXdotoolMouseLocation(output) {
  const values = {};
  for (const line of String(output || '').split(/\r?\n/)) {
    const [rawKey, rawValue] = line.split('=');
    if (!rawKey || rawValue === undefined) {
      continue;
    }
    values[rawKey.trim().toLowerCase()] = rawValue.trim();
  }

  const x = finiteNumber(values.x, null);
  const y = finiteNumber(values.y, null);
  if (x === null || y === null) {
    return null;
  }

  return {
    x,
    y,
    screen: finiteNumber(values.screen, null),
    windowId: values.window || null
  };
}

async function getX11Pointer() {
  if (process.platform !== 'linux' || isLinuxWayland() || !commandExistsSync('xdotool')) {
    return null;
  }

  try {
    const output = await commandOutput('xdotool', ['getmouselocation', '--shell'], 450);
    const parsed = parseXdotoolMouseLocation(output);
    if (!parsed) {
      return null;
    }

    return {
      available: true,
      provider: 'xdotool',
      point: {
        x: parsed.x,
        y: parsed.y
      },
      screen: parsed.screen,
      windowId: parsed.windowId,
      precision: 'x11-global'
    };
  } catch {
    return null;
  }
}

async function getX11ActiveWindow() {
  if (process.platform !== 'linux' || isLinuxWayland() || !commandExistsSync('xdotool')) {
    return null;
  }

  try {
    const windowId = await commandOutput('xdotool', ['getactivewindow'], 550);
    if (!windowId) {
      return null;
    }

    const [nameResult, pidResult, geometryResult] = await Promise.allSettled([
      commandOutput('xdotool', ['getwindowname', windowId], 550),
      commandOutput('xdotool', ['getwindowpid', windowId], 550),
      commandOutput('xdotool', ['getwindowgeometry', '--shell', windowId], 550)
    ]);

    const geometry = {};
    if (geometryResult.status === 'fulfilled') {
      for (const line of geometryResult.value.split(/\r?\n/)) {
        const [rawKey, rawValue] = line.split('=');
        if (rawKey && rawValue !== undefined) {
          geometry[rawKey.trim().toLowerCase()] = finiteNumber(rawValue, null);
        }
      }
    }

    return {
      available: true,
      provider: 'xdotool',
      title: nameResult.status === 'fulfilled' ? nameResult.value : null,
      pid: pidResult.status === 'fulfilled' ? finiteNumber(pidResult.value, null) : null,
      windowId,
      bounds: Number.isFinite(geometry.x) && Number.isFinite(geometry.y)
        ? {
            x: geometry.x,
            y: geometry.y,
            width: geometry.width,
            height: geometry.height
          }
        : null
    };
  } catch {
    return null;
  }
}

function normalizeExternalEvent(event) {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const type = safeText(event.type, 'event');
  return {
    ...event,
    schema: safeText(event.schema, HELPER_PROTOCOL),
    type,
    captured_at: safeText(event.captured_at, new Date().toISOString()),
    provider: safeText(event.provider, 'external-helper')
  };
}

class NativeTelemetryCore {
  constructor({ screen, getDisplaySnapshot }) {
    this.screen = screen;
    this.getDisplaySnapshot = getDisplaySnapshot;
    this.session = null;
    this.helper = null;
    this.helperLineBuffer = '';
    this.helperEvents = [];
    this.latestByType = new Map();
    this.lastDiagnostics = null;
    this.lastDiagnosticsAt = 0;
    this.socketServer = null;
    this.socketClients = new Set();
    this.socketPath = null;
  }

  helperPath() {
    const configured = process.env.SMARTIE_TELEMETRY_HELPER;
    if (configured && fs.existsSync(configured)) {
      return configured;
    }

    const windowsHelper = windowsNativeHelperPath();
    if (windowsHelper) {
      return windowsHelper;
    }

    const bundled = appResourcePath('native', 'bin', process.platform, 'smartie-telemetry-core');
    if (fs.existsSync(bundled)) {
      return bundled;
    }

    return null;
  }

  helperLaunchSpec() {
    const helperPath = this.helperPath();
    if (!helperPath) {
      return null;
    }

    if (process.platform === 'win32' && path.extname(helperPath).toLowerCase() === '.ps1') {
      const shellCommand = windowsPowerShellCommand();
      if (!shellCommand) {
        return null;
      }

      return {
        command: shellCommand,
        args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', helperPath, '--stdio', '--protocol', HELPER_PROTOCOL],
        path: helperPath
      };
    }

    return {
      command: helperPath,
      args: ['--stdio', '--protocol', HELPER_PROTOCOL],
      path: helperPath
    };
  }

  async diagnostics() {
    const now = Date.now();
    if (this.lastDiagnostics && now - this.lastDiagnosticsAt < 5000) {
      return this.lastDiagnostics;
    }

    const [portal, atSpi, kwin, gnome] = await Promise.all([
      detectPortalStack(),
      detectAtSpi(),
      detectKwinAdapter(),
      detectGnomeExtension()
    ]);
    const helperPath = this.helperPath();
    const xdotool = commandExistsSync('xdotool');
    const desktop = desktopName();
    const helperActive = Boolean(this.helper && !this.helper.killed);
    const socketActive = Boolean(this.socketServer);
    const windowsAdapter = windowsNativeHelperStatus(helperActive);

    const adapters = [
      {
        id: 'local-socket',
        label: 'Smartie compositor adapter socket',
        available: Boolean(this.socketPath),
        active: socketActive,
        provider: 'unix-jsonl',
        path: this.socketPath,
        reason: socketActive ? 'listening' : 'not-listening'
      },
      windowsAdapter,
      {
        id: 'external-helper',
        label: 'Smartie native helper',
        available: Boolean(helperPath),
        active: helperActive,
        provider: 'stdio-jsonl',
        path: helperPath,
        reason: helperPath ? (helperActive ? 'running' : 'available') : 'not-installed'
      },
      {
        id: 'kwin',
        label: 'KDE KWin precision adapter',
        ...kwin,
        active: this.latestByType.has('kwin') || this.latestByType.has('kwin-script')
      },
      {
        id: 'gnome-shell',
        label: 'GNOME Shell precision adapter',
        ...gnome,
        active: this.latestByType.has('gnome') || this.latestByType.has('gnome-shell')
      },
      {
        id: 'xdg-screencast',
        label: 'XDG ScreenCast/PipeWire',
        ...portal,
        active: false
      },
      {
        id: 'at-spi',
        label: 'AT-SPI accessibility',
        ...atSpi,
        active: false
      },
      {
        id: 'x11-xdotool',
        label: 'X11 native telemetry',
        available: process.platform === 'linux' && !isLinuxWayland() && xdotool,
        active: process.platform === 'linux' && !isLinuxWayland() && xdotool,
        provider: 'xdotool',
        reason: process.platform === 'linux' && !isLinuxWayland()
          ? (xdotool ? 'available' : 'xdotool-unavailable')
          : 'not-x11'
      }
    ];

    const precisionAdapter = adapters.find((adapter) => adapter.active && ['windows-user32', 'external-helper', 'kwin', 'gnome-shell'].includes(adapter.id));
    const x11Adapter = adapters.find((adapter) => adapter.id === 'x11-xdotool' && adapter.active);
    const portalReady = adapters.find((adapter) => adapter.id === 'xdg-screencast')?.available;
    const accessibilityReady = adapters.find((adapter) => adapter.id === 'at-spi')?.available;
    const quality = this.qualityFromAdapters({ precisionAdapter, x11Adapter, portalReady, accessibilityReady });

    this.lastDiagnostics = {
      schema: DIAGNOSTICS_SCHEMA,
      generated_at: new Date().toISOString(),
      platform: process.platform,
      session_type: sessionType(),
      desktop,
      protocol: HELPER_PROTOCOL,
      quality,
      adapters,
      guidance: this.guidanceForQuality(quality, adapters)
    };
    this.lastDiagnosticsAt = now;
    return this.lastDiagnostics;
  }

  qualityFromAdapters({ precisionAdapter, x11Adapter, portalReady, accessibilityReady }) {
    if (process.platform === 'win32' && precisionAdapter) {
      return {
        tier: 'precision',
        score: 0.94,
        native: true,
        perfectCandidate: true,
        reason: precisionAdapter.id
      };
    }

    if (precisionAdapter && accessibilityReady) {
      return {
        tier: 'precision',
        score: 0.96,
        native: true,
        perfectCandidate: true,
        reason: `${precisionAdapter.id}+at-spi`
      };
    }

    if (precisionAdapter) {
      return {
        tier: 'native-pointer',
        score: 0.82,
        native: true,
        perfectCandidate: false,
        reason: precisionAdapter.id
      };
    }

    if (isLinuxWayland() && portalReady) {
      return {
        tier: 'portal-ready',
        score: 0.58,
        native: false,
        perfectCandidate: false,
        reason: 'wayland-portal-without-compositor-adapter'
      };
    }

    if (x11Adapter) {
      return {
        tier: 'x11-native',
        score: 0.76,
        native: true,
        perfectCandidate: false,
        reason: 'x11-xdotool'
      };
    }

    return {
      tier: 'electron-fallback',
      score: 0.34,
      native: false,
      perfectCandidate: false,
      reason: process.platform === 'win32'
        ? 'windows-native-helper-unavailable'
        : isLinuxWayland()
          ? 'wayland-needs-compositor-adapter'
          : 'no-native-provider'
    };
  }

  guidanceForQuality(quality, adapters) {
    if (quality.tier === 'precision') {
      return [];
    }

    const guidance = [];
    if (isLinuxWayland()) {
      guidance.push('Install or enable the Smartie compositor adapter for this desktop to get compositor-owned cursor, focus, and window geometry.');
      if (adapters.find((adapter) => adapter.id === 'xdg-screencast')?.available) {
        guidance.push('Use XDG ScreenCast/PipeWire cursor metadata in the native capture helper when available.');
      }
      if (adapters.find((adapter) => adapter.id === 'at-spi')?.available) {
        guidance.push('AT-SPI is available for semantic focus/bounds; combine it with compositor pointer telemetry for precision mode.');
      }
    } else if (process.platform === 'linux') {
      guidance.push('Install xdotool on X11 for native pointer/window telemetry.');
    } else if (process.platform === 'win32') {
      guidance.push('Use the bundled Windows User32 helper for native pointer, click, active-window, and keyboard-intent telemetry.');
      if (!windowsPowerShellCommand()) {
        guidance.push('PowerShell is required to run the bundled Windows telemetry helper.');
      }
    }

    if (!this.helperPath()) {
      guidance.push('Set SMARTIE_TELEMETRY_HELPER to a trusted Smartie native helper binary for full precision capture.');
    }

    return guidance;
  }

  startSession(options = {}) {
    this.session = {
      id: safeText(options.id, `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`),
      started_at: new Date().toISOString(),
      source: options.source || null,
      capabilities: Array.isArray(options.capabilities)
        ? options.capabilities
        : ['pointer', 'window', 'accessibility', 'keyboard', 'clicks']
    };
    this.helperEvents = [];
    this.latestByType.clear();
    this.startSocketServer();
    this.startHelper();
    return {
      schema: 'smartie.native_telemetry.session.v1',
      protocol: HELPER_PROTOCOL,
      ...this.session,
      helper_active: Boolean(this.helper && !this.helper.killed)
    };
  }

  stopSession() {
    const stopped = this.session
      ? {
          ...this.session,
          stopped_at: new Date().toISOString()
        }
      : null;

    this.session = null;
    this.stopHelper();
    this.stopSocketServer();
    return stopped;
  }

  runtimeSocketPath() {
    const runtime = process.env.XDG_RUNTIME_DIR || os.tmpdir();
    return path.join(runtime, 'smartie-telemetry.sock');
  }

  startSocketServer() {
    if (process.platform !== 'linux' || this.socketServer) {
      return;
    }

    const socketPath = this.runtimeSocketPath();
    try {
      fs.rmSync(socketPath, { force: true });
    } catch {
      // A stale socket should not block recording; listen will report the real error.
    }

    const server = net.createServer((socket) => {
      socket.setEncoding('utf8');
      socket.smartieBuffer = '';
      this.socketClients.add(socket);
      socket.write(`${JSON.stringify({
        type: 'start',
        protocol: HELPER_PROTOCOL,
        session: this.session
      })}\n`);

      socket.on('data', (chunk) => {
        socket.smartieBuffer += chunk.toString();
        const lines = socket.smartieBuffer.split(/\r?\n/);
        socket.smartieBuffer = lines.pop() || '';
        for (const line of lines) {
          this.ingestTelemetryLine(line, 'local-socket');
        }
      });
      socket.on('close', () => {
        this.socketClients.delete(socket);
      });
      socket.on('error', (error) => {
        this.bufferEvent(normalizeExternalEvent({
          type: 'socket-client-error',
          provider: 'local-socket',
          message: error.message
        }));
      });
    });

    server.on('error', (error) => {
      this.bufferEvent(normalizeExternalEvent({
        type: 'socket-server-error',
        provider: 'local-socket',
        message: error.message
      }));
      this.socketServer = null;
      this.socketPath = null;
    });

    server.listen(socketPath, () => {
      this.socketPath = socketPath;
      try {
        fs.chmodSync(socketPath, 0o600);
      } catch {
        // chmod is best-effort; the socket still lives in the user's runtime dir.
      }
      this.bufferEvent(normalizeExternalEvent({
        type: 'socket-ready',
        provider: 'local-socket',
        path: socketPath
      }));
      this.lastDiagnostics = null;
    });
    this.socketServer = server;
    this.socketPath = socketPath;
  }

  stopSocketServer() {
    for (const socket of this.socketClients) {
      try {
        socket.write(`${JSON.stringify({ type: 'stop', protocol: HELPER_PROTOCOL })}\n`);
        socket.end();
      } catch {
        // Socket clients may disconnect while Smartie is stopping.
      }
    }
    this.socketClients.clear();

    if (this.socketServer) {
      try {
        this.socketServer.close();
      } catch {
        // Ignore shutdown races.
      }
    }
    this.socketServer = null;
    if (this.socketPath) {
      try {
        fs.rmSync(this.socketPath, { force: true });
      } catch {
        // Stale sockets are removed on the next session start.
      }
    }
    this.socketPath = null;
    this.lastDiagnostics = null;
  }

  startHelper() {
    const launchSpec = this.helperLaunchSpec();
    if (!launchSpec || this.helper) {
      return;
    }

    this.helper = spawn(launchSpec.command, launchSpec.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        SMARTIE_TELEMETRY_PROTOCOL: HELPER_PROTOCOL
      }
    });

    this.helper.stdout.on('data', (chunk) => this.ingestHelperOutput(chunk));
    this.helper.stderr.on('data', (chunk) => {
      const event = normalizeExternalEvent({
        type: 'helper-log',
        level: 'warn',
        message: chunk.toString().slice(0, 2000)
      });
      this.bufferEvent(event);
    });
    this.helper.on('close', (code, signal) => {
      this.bufferEvent(normalizeExternalEvent({
        type: 'helper-exit',
        code,
        signal
      }));
      this.helper = null;
      this.helperLineBuffer = '';
    });
    this.helper.on('error', (error) => {
      this.bufferEvent(normalizeExternalEvent({
        type: 'helper-error',
        message: error.message
      }));
      this.helper = null;
    });

    this.writeHelperCommand({
      type: 'start',
      protocol: HELPER_PROTOCOL,
      helper_path: launchSpec.path,
      session: this.session
    });
  }

  stopHelper() {
    if (!this.helper) {
      return;
    }

    this.writeHelperCommand({
      type: 'stop',
      protocol: HELPER_PROTOCOL
    });
    this.helper.kill('SIGTERM');
    this.helper = null;
    this.helperLineBuffer = '';
  }

  writeHelperCommand(command) {
    if (!this.helper || !this.helper.stdin.writable) {
      return;
    }

    try {
      this.helper.stdin.write(`${JSON.stringify(command)}\n`);
    } catch {
      // Helper shutdown races are harmless; the next diagnostics call reports it.
    }
  }

  ingestHelperOutput(chunk) {
    this.helperLineBuffer += chunk.toString();
    const lines = this.helperLineBuffer.split(/\r?\n/);
    this.helperLineBuffer = lines.pop() || '';
    for (const line of lines) {
      this.ingestTelemetryLine(line, 'external-helper');
    }
  }

  ingestTelemetryLine(line, provider) {
    const trimmed = String(line || '').trim();
    if (!trimmed) {
      return;
    }

    try {
      const event = normalizeExternalEvent({
        provider,
        ...JSON.parse(trimmed)
      });
      this.bufferEvent(event);
    } catch {
      this.bufferEvent(normalizeExternalEvent({
        type: 'telemetry-parse-error',
        provider,
        message: trimmed.slice(0, 500)
      }));
    }
  }

  bufferEvent(event) {
    if (!event) {
      return;
    }

    this.helperEvents.push(event);
    if (this.helperEvents.length > MAX_EVENT_BUFFER) {
      this.helperEvents.splice(0, this.helperEvents.length - MAX_EVENT_BUFFER);
    }
    this.latestByType.set(event.type, event);
    if (event.provider) {
      this.latestByType.set(String(event.provider), event);
    }
  }

  drainEvents() {
    const events = this.helperEvents.slice();
    this.helperEvents = [];
    return events;
  }

  latestExternalPointer() {
    const direct = this.latestByType.get('pointer') || this.latestByType.get('cursor');
    if (!direct) {
      return null;
    }

    const x = finiteNumber(direct.screen_x, finiteNumber(direct.x, null));
    const y = finiteNumber(direct.screen_y, finiteNumber(direct.y, null));
    if (x === null || y === null) {
      return null;
    }

    return {
      available: true,
      provider: direct.provider || 'external-helper',
      point: { x, y },
      precision: direct.precision || 'compositor-global',
      event: direct
    };
  }

  latestExternalWindow() {
    const event = this.latestByType.get('window') || this.latestByType.get('focus') || this.latestByType.get('accessibility');
    if (!event) {
      return null;
    }

    return {
      available: true,
      provider: event.provider || 'external-helper',
      title: event.title || event.window_title || null,
      pid: finiteNumber(event.pid, null),
      app_id: event.app_id || null,
      bounds: event.bounds || null,
      role: event.role || null,
      label: event.label || event.name || null
    };
  }

  async pointerSnapshot({ allowNativePolling = true } = {}) {
    const external = this.latestExternalPointer();
    if (external) {
      return external;
    }

    if (allowNativePolling) {
      const x11 = await getX11Pointer();
      if (x11) {
        return x11;
      }
    }

    const point = this.screen.getCursorScreenPoint();
    return {
      available: true,
      provider: 'electron-screen',
      point,
      precision: isLinuxWayland() ? 'wayland-limited-polling' : 'electron-global-polling'
    };
  }

  async activeWindowSnapshot() {
    const external = this.latestExternalWindow();
    if (external) {
      return external;
    }

    const x11 = await getX11ActiveWindow();
    if (x11) {
      return x11;
    }

    return {
      available: false,
      provider: null,
      title: null,
      pid: null,
      error: isLinuxWayland()
        ? 'Wayland active window lookup requires a Smartie compositor adapter or accessibility helper.'
        : 'No native active window provider is available.'
    };
  }

  async snapshot(options = {}) {
    const [diagnostics, pointer, activeWindow] = await Promise.all([
      this.diagnostics(),
      this.pointerSnapshot({ allowNativePolling: options.allowNativePolling !== false }),
      this.activeWindowSnapshot()
    ]);

    const events = options.drainEvents === false ? [] : this.drainEvents();
    return {
      schema: SNAPSHOT_SCHEMA,
      protocol: HELPER_PROTOCOL,
      session_id: this.session?.id || null,
      captured_at: new Date().toISOString(),
      platform: process.platform,
      session_type: sessionType(),
      desktop: desktopName(),
      quality: diagnostics.quality,
      adapters: diagnostics.adapters.map((adapter) => ({
        id: adapter.id,
        available: Boolean(adapter.available),
        active: Boolean(adapter.active),
        provider: adapter.provider || null,
        reason: adapter.reason || null
      })),
      pointer,
      activeWindow,
      displays: this.getDisplaySnapshot(),
      events
    };
  }
}

module.exports = {
  NativeTelemetryCore,
  HELPER_PROTOCOL,
  DIAGNOSTICS_SCHEMA,
  SNAPSHOT_SCHEMA
};
