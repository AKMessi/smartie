const { app, BrowserWindow, desktopCapturer, dialog, globalShortcut, ipcMain, screen, shell } = require('electron');
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const ffmpegPath = require('ffmpeg-static');
const { NativeTelemetryCore } = require('./native-telemetry');
const {
  installBestTelemetryAdapter,
  statusTelemetryAdapters,
  uninstallGnomeTelemetryAdapter
} = require('./telemetry-adapters');

const APP_TITLE = 'Smartie';
const IS_SMOKE_TEST = process.argv.includes('--smoke-test');
const execFileAsync = promisify(execFile);

app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');

let mainWindow;
let shortcutStatuses = [];
const recordingSessions = new Map();
const nativeTelemetry = new NativeTelemetryCore({
  screen,
  getDisplaySnapshot
});

const recorderShortcuts = [
  {
    action: 'toggle-recording',
    accelerator: 'CommandOrControl+Alt+R',
    label: 'Start or stop recording'
  },
  {
    action: 'toggle-pause',
    accelerator: 'CommandOrControl+Alt+P',
    label: 'Pause or resume recording'
  },
  {
    action: 'discard-recording',
    accelerator: 'CommandOrControl+Alt+X',
    label: 'Discard active recording'
  },
  {
    action: 'toggle-smart-stack',
    accelerator: 'CommandOrControl+Alt+S',
    label: 'Toggle smart features'
  },
  {
    action: 'toggle-mic-mute',
    accelerator: 'CommandOrControl+Alt+M',
    label: 'Mute or unmute microphone'
  },
  {
    action: 'toggle-focus-lock',
    accelerator: 'CommandOrControl+Alt+F',
    label: 'Lock or release smart focus'
  },
  {
    action: 'drop-marker',
    accelerator: 'CommandOrControl+Alt+K',
    label: 'Drop chapter marker'
  },
  {
    action: 'capture-snapshot',
    accelerator: 'CommandOrControl+Alt+J',
    label: 'Capture PNG snapshot'
  },
  {
    action: 'toggle-window-visibility',
    accelerator: 'CommandOrControl+Alt+H',
    label: 'Show or hide Smartie'
  }
];

function sendShortcut(action) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('smartie:shortcut', action);
}

function registerGlobalShortcuts() {
  shortcutStatuses = recorderShortcuts.map((shortcut) => {
    const registered = globalShortcut.register(shortcut.accelerator, () => {
      sendShortcut(shortcut.action);
    });

    return {
      ...shortcut,
      registered
    };
  });
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function setMainWindowHidden(hidden) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (hidden) {
    mainWindow.hide();
  } else {
    showMainWindow();
  }

  return !mainWindow.isVisible();
}

function toggleMainWindowVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return true;
  }

  showMainWindow();
  return false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: APP_TITLE,
    backgroundColor: '#101114',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!IS_SMOKE_TEST) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (IS_SMOKE_TEST) {
      setTimeout(() => app.exit(0), 250);
    }
  });

  mainWindow.webContents.once('did-fail-load', () => {
    if (IS_SMOKE_TEST) {
      app.exit(1);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function toDataUrl(image) {
  if (!image || image.isEmpty()) {
    return null;
  }

  return image.toDataURL();
}

function getDisplaySnapshot() {
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    scaleFactor: display.scaleFactor,
    bounds: display.bounds,
    workArea: display.workArea,
    size: display.size
  }));
}

function defaultRecordingPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `smartie-${stamp}.webm`;

  try {
    return path.join(app.getPath('videos'), filename);
  } catch {
    return path.join(app.getPath('documents'), filename);
  }
}

function defaultRecordingDirectory() {
  try {
    return app.getPath('videos');
  } catch {
    return app.getPath('documents');
  }
}

function defaultTempRecordingDirectory() {
  return path.join(app.getPath('temp'), 'smartie-recordings');
}

function safeSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cpuSummary() {
  const cpus = os.cpus() || [];
  const first = cpus[0] || {};
  return {
    logicalCores: cpus.length || 1,
    model: first.model || 'Unknown CPU',
    speedMhz: finiteNumber(first.speed, null)
  };
}

function memorySummary() {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  let availableBytes = freeBytes;

  if (typeof process.getSystemMemoryInfo === 'function') {
    try {
      const info = process.getSystemMemoryInfo();
      if (Number.isFinite(info.available)) {
        availableBytes = info.available * 1024;
      }
    } catch {
      availableBytes = freeBytes;
    }
  }

  return {
    totalBytes,
    freeBytes,
    availableBytes,
    totalGb: Math.round((totalBytes / 1024 ** 3) * 10) / 10,
    availableGb: Math.round((availableBytes / 1024 ** 3) * 10) / 10
  };
}

function classifyPerformanceProfile() {
  const cpu = cpuSummary();
  const memory = memorySummary();
  const sessionType = process.env.XDG_SESSION_TYPE || null;
  const reasons = [];
  let score = 0;

  if (cpu.logicalCores <= 2) {
    score -= 3;
    reasons.push('2 or fewer logical CPU cores');
  } else if (cpu.logicalCores <= 4) {
    score -= 1;
    reasons.push('4 or fewer logical CPU cores');
  } else if (cpu.logicalCores >= 8) {
    score += 1;
  }

  if (memory.totalGb <= 4) {
    score -= 3;
    reasons.push('4 GB or less system memory');
  } else if (memory.totalGb <= 8) {
    score -= 1;
    reasons.push('8 GB or less system memory');
  } else if (memory.totalGb >= 16) {
    score += 1;
  }

  if (memory.availableGb <= 1.5) {
    score -= 2;
    reasons.push('low available memory');
  }

  if (sessionType === 'wayland') {
    reasons.push('Wayland capture path detected');
  }

  let tier = 'balanced';
  let recommendedMode = 'balanced';
  if (score <= -4) {
    tier = 'potato';
    recommendedMode = 'potato';
  } else if (score <= -2) {
    tier = 'low';
    recommendedMode = 'ultra';
  } else if (score >= 2) {
    tier = 'performance';
    recommendedMode = 'quality';
  }

  return {
    tier,
    recommendedMode,
    reasons,
    cpu,
    memory,
    platform: process.platform,
    arch: process.arch,
    sessionType,
    hardwareAcceleration: !app.commandLine.hasSwitch('disable-gpu'),
    capturedAt: new Date().toISOString()
  };
}

async function createRecordingSession(payload = {}) {
  await fs.mkdir(defaultTempRecordingDirectory(), { recursive: true });
  const id = safeSessionId();
  const extension = path.extname(payload.suggestedName || '') || '.webm';
  const filePath = path.join(defaultTempRecordingDirectory(), `smartie-${id}${extension}`);
  const handle = await fs.open(filePath, 'w');
  const session = {
    id,
    filePath,
    handle,
    mimeType: payload.mimeType || 'video/webm',
    suggestedName: payload.suggestedName || null,
    bytesWritten: 0,
    chunkCount: 0,
    finalized: false,
    queue: Promise.resolve(),
    createdAt: new Date().toISOString()
  };

  recordingSessions.set(id, session);
  return {
    id,
    filePath,
    mimeType: session.mimeType
  };
}

function getRecordingSession(sessionId) {
  const session = recordingSessions.get(sessionId);
  if (!session) {
    throw new Error('Recording session is unavailable.');
  }

  return session;
}

async function appendRecordingChunk(sessionId, bytes) {
  const session = getRecordingSession(sessionId);
  if (session.finalized) {
    throw new Error('Recording session is already finalized.');
  }

  const buffer = Buffer.from(bytes || []);
  if (buffer.length === 0) {
    return {
      bytesWritten: session.bytesWritten,
      chunkCount: session.chunkCount
    };
  }

  session.queue = session.queue.then(async () => {
    await session.handle.writeFile(buffer);
    session.bytesWritten += buffer.length;
    session.chunkCount += 1;
  });

  await session.queue;
  return {
    bytesWritten: session.bytesWritten,
    chunkCount: session.chunkCount
  };
}

async function finalizeRecordingSession(sessionId) {
  const session = getRecordingSession(sessionId);
  await session.queue;
  if (!session.finalized) {
    await session.handle.close();
    session.finalized = true;
    session.closedAt = new Date().toISOString();
  }

  return {
    id: session.id,
    filePath: session.filePath,
    mimeType: session.mimeType,
    bytesWritten: session.bytesWritten,
    chunkCount: session.chunkCount
  };
}

async function discardRecordingSession(sessionId) {
  if (!sessionId || !recordingSessions.has(sessionId)) {
    return false;
  }

  const session = recordingSessions.get(sessionId);
  recordingSessions.delete(sessionId);
  try {
    await session.queue;
  } catch {
    // The session is being discarded; the original write error is no longer useful.
  }

  if (!session.finalized) {
    try {
      await session.handle.close();
    } catch {
      // Ignore close failures while cleaning a failed or discarded take.
    }
  }

  await fs.rm(session.filePath, { force: true });
  return true;
}

async function readRecordingSession(sessionId) {
  const session = getRecordingSession(sessionId);
  await finalizeRecordingSession(sessionId);
  return {
    bytes: await fs.readFile(session.filePath),
    mimeType: session.mimeType,
    bytesWritten: session.bytesWritten,
    chunkCount: session.chunkCount
  };
}

function sidecarPathFor(videoPath) {
  const extension = path.extname(videoPath);
  const base = extension ? videoPath.slice(0, -extension.length) : videoPath;
  return `${base}.smartie.json`;
}

function chapterPathFor(videoPath) {
  const extension = path.extname(videoPath);
  const base = extension ? videoPath.slice(0, -extension.length) : videoPath;
  return `${base}.chapters.vtt`;
}

function smartieProjectPathFor(videoPath) {
  const extension = path.extname(videoPath);
  const base = extension ? videoPath.slice(0, -extension.length) : videoPath;
  return `${base}.smartie-project`;
}

function mp4PathFor(videoPath) {
  const extension = path.extname(videoPath);
  const base = extension ? videoPath.slice(0, -extension.length) : videoPath;
  return `${base}.mp4`;
}

function resolvedFfmpegPath() {
  if (!ffmpegPath) {
    return null;
  }

  return ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

function formatVttTime(ms) {
  const safeMs = Math.max(0, Math.floor(ms || 0));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const milliseconds = safeMs % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function buildMarkerWebVtt(metadata) {
  const markers = Array.isArray(metadata?.markers) ? metadata.markers : [];
  if (markers.length === 0) {
    return null;
  }

  const durationMs = Math.max(0, Number(metadata.durationMs) || 0);
  const lines = [
    'WEBVTT',
    '',
    'NOTE Generated by Smartie'
  ];

  markers.forEach((marker, index) => {
    const startMs = Math.max(0, Number(marker.atMs) || 0);
    const nextMarkerMs = Number(markers[index + 1]?.atMs);
    const naturalEndMs = Number.isFinite(nextMarkerMs) ? nextMarkerMs : durationMs;
    const endMs = Math.max(startMs + 1000, naturalEndMs || startMs + 1000);
    const label = String(marker.label || `Marker ${index + 1}`).replace(/[\r\n]+/g, ' ');

    lines.push('', `${formatVttTime(startMs)} --> ${formatVttTime(endMs)}`, label);
  });

  return `${lines.join('\n')}\n`;
}

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAttentionTimeline(attentionTimeline) {
  const payload = attentionTimeline && typeof attentionTimeline === 'object'
    ? attentionTimeline
    : {};
  const events = Array.isArray(payload.events)
    ? payload.events
    : Array.isArray(attentionTimeline)
      ? attentionTimeline
      : [];

  return {
    schema: typeof payload.schema === 'string' ? payload.schema : 'smartie.attention_timeline.v1',
    version: finiteNumber(payload.version, 1),
    generated_at: typeof payload.generated_at === 'string' ? payload.generated_at : new Date().toISOString(),
    source: payload.source && typeof payload.source === 'object' ? payload.source : {},
    settings: payload.settings && typeof payload.settings === 'object' ? payload.settings : {},
    events
  };
}

function normalizeCameraPlan(cameraPlan) {
  const payload = cameraPlan && typeof cameraPlan === 'object'
    ? cameraPlan
    : {};

  return {
    schema: typeof payload.schema === 'string' ? payload.schema : 'smartie.camera_plan.v1',
    version: finiteNumber(payload.version, 1),
    generated_at: typeof payload.generated_at === 'string' ? payload.generated_at : new Date().toISOString(),
    settings: payload.settings && typeof payload.settings === 'object' ? payload.settings : {},
    segments: Array.isArray(payload.segments) ? payload.segments : [],
    keyframes: Array.isArray(payload.keyframes) ? payload.keyframes : [],
    qa: payload.qa && typeof payload.qa === 'object' ? payload.qa : {},
    stats: payload.stats && typeof payload.stats === 'object' ? payload.stats : {}
  };
}

function normalizeTimelineArtifact(payload, schema, eventsKey = 'events') {
  const value = payload && typeof payload === 'object' ? payload : {};
  const events = Array.isArray(value[eventsKey])
    ? value[eventsKey]
    : Array.isArray(value.events)
      ? value.events
      : Array.isArray(payload)
        ? payload
        : [];

  return {
    schema: typeof value.schema === 'string' ? value.schema : schema,
    version: finiteNumber(value.version, 1),
    generated_at: typeof value.generated_at === 'string' ? value.generated_at : new Date().toISOString(),
    source: value.source && typeof value.source === 'object' ? value.source : {},
    stats: value.stats && typeof value.stats === 'object' ? value.stats : {},
    [eventsKey]: events
  };
}

function normalizeProjectArtifacts(projectArtifacts) {
  const payload = projectArtifacts && typeof projectArtifacts === 'object' ? projectArtifacts : {};

  return {
    cursorTimeline: normalizeTimelineArtifact(payload.cursorTimeline, 'smartie.cursor_timeline.v1', 'samples'),
    clickTimeline: normalizeTimelineArtifact(payload.clickTimeline, 'smartie.click_timeline.v1'),
    keyboardTimeline: normalizeTimelineArtifact(payload.keyboardTimeline, 'smartie.keyboard_timeline.v1'),
    motionTimeline: normalizeTimelineArtifact(payload.motionTimeline, 'smartie.motion_timeline.v1'),
    accessibilityTimeline: normalizeTimelineArtifact(payload.accessibilityTimeline, 'smartie.accessibility_timeline.v1'),
    nativeTelemetryTimeline: normalizeTimelineArtifact(payload.nativeTelemetryTimeline, 'smartie.native_telemetry_timeline.v1'),
    proxyTimeline: normalizeTimelineArtifact(payload.proxyTimeline, 'smartie.proxy_timeline.v1', 'proxies'),
    renderQa: payload.renderQa && typeof payload.renderQa === 'object'
      ? payload.renderQa
      : { schema: 'smartie.render_qa.v1', ok: true, warnings: [], errors: [], metrics: {} }
  };
}

function timelineCount(timeline, key = 'events') {
  return Array.isArray(timeline?.[key]) ? timeline[key].length : 0;
}

function buildSmartieProjectManifest(filePath, metadata, attentionTimeline, cameraPlan, projectArtifacts, recordingFileName, projectFileMode, proxyPreview = null) {
  const capture = metadata?.capture || {};
  const title = metadata?.take?.title || path.basename(filePath, path.extname(filePath));
  const durationMs = finiteNumber(metadata?.durationMs, null);
  const width = finiteNumber(capture.outputWidth, null);
  const height = finiteNumber(capture.outputHeight, null);
  const fps = finiteNumber(capture.fps, finiteNumber(capture.requestedFps, null));

  return {
    schema: 'smartie.project.v1',
    app: APP_TITLE,
    title,
    created_at: metadata?.createdAt || new Date().toISOString(),
    recording: recordingFileName,
    duration_ms: durationMs,
    duration_sec: durationMs === null ? null : Math.round((durationMs / 1000) * 1000) / 1000,
    fps,
    width,
    height,
    files: {
      recording: recordingFileName,
      attention_timeline: 'attention.timeline.json',
      cursor_timeline: 'cursor.timeline.json',
      click_timeline: 'click.timeline.json',
      keyboard_timeline: 'keyboard.timeline.json',
      motion_timeline: 'motion.timeline.json',
      accessibility_timeline: 'accessibility.timeline.json',
      native_telemetry_timeline: 'native.timeline.json',
      proxy_timeline: 'proxy.timeline.json',
      camera_plan: 'camera.plan.json',
      render_qa: 'render.qa.json',
      metadata: 'recording.smartie.json'
    },
    smartie: {
      version: metadata?.version || 1,
      render_pipeline: capture.renderPipeline || null,
      recording_engine: capture.recordingEngine || null,
      output_layout: capture.outputLayout || null,
      smart_stack: metadata?.smartStack || null,
      markers: Array.isArray(metadata?.markers) ? metadata.markers.length : 0
    },
    attention: {
      schema: attentionTimeline.schema,
      events: Array.isArray(attentionTimeline.events) ? attentionTimeline.events.length : 0
    },
    camera_plan: {
      schema: cameraPlan.schema,
      segments: Array.isArray(cameraPlan.segments) ? cameraPlan.segments.length : 0,
      keyframes: Array.isArray(cameraPlan.keyframes) ? cameraPlan.keyframes.length : 0,
      qa: cameraPlan.qa || {}
    },
    telemetry: {
      cursor_samples: timelineCount(projectArtifacts.cursorTimeline, 'samples'),
      click_events: timelineCount(projectArtifacts.clickTimeline),
      keyboard_events: timelineCount(projectArtifacts.keyboardTimeline),
      motion_events: timelineCount(projectArtifacts.motionTimeline),
      accessibility_events: timelineCount(projectArtifacts.accessibilityTimeline),
      native_events: timelineCount(projectArtifacts.nativeTelemetryTimeline),
      native_quality: projectArtifacts.nativeTelemetryTimeline?.stats?.quality || null
    },
    proxy: {
      previews: timelineCount(projectArtifacts.proxyTimeline, 'proxies'),
      preview_image: proxyPreview ? path.basename(proxyPreview.path) : null,
      preview_status: proxyPreview ? proxyPreview.status : 'not-created'
    },
    render_qa: projectArtifacts.renderQa,
    project_file_mode: projectFileMode
  };
}

async function linkOrCopyRecording(sourcePath, targetPath) {
  await fs.rm(targetPath, { force: true });

  try {
    await fs.link(sourcePath, targetPath);
    return 'hardlink';
  } catch {
    await fs.copyFile(sourcePath, targetPath);
    return 'copy';
  }
}

function createProxyPreview(inputPath, outputPath) {
  const binaryPath = resolvedFfmpegPath();
  if (!binaryPath) {
    throw new Error('Bundled FFmpeg is unavailable on this platform.');
  }

  const args = [
    '-y',
    '-ss',
    '00:00:00.300',
    '-i',
    inputPath,
    '-frames:v',
    '1',
    '-vf',
    'scale=640:-2',
    '-q:v',
    '4',
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let errorOutput = '';

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg proxy preview exited with code ${code}: ${errorOutput.slice(-1000)}`));
    });
  });
}

async function writeJsonFile(filePath, payload) {
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function writeSmartieProject(filePath, metadata, attentionTimeline, cameraPlan, projectArtifacts) {
  const projectPath = smartieProjectPathFor(filePath);
  const recordingExtension = path.extname(filePath) || '.webm';
  const recordingFileName = `recording${recordingExtension}`;
  const projectRecordingPath = path.join(projectPath, recordingFileName);
  const normalizedTimeline = normalizeAttentionTimeline(attentionTimeline);
  const normalizedCameraPlan = normalizeCameraPlan(cameraPlan);
  const normalizedArtifacts = normalizeProjectArtifacts(projectArtifacts);

  await fs.mkdir(projectPath, { recursive: true });
  const projectFileMode = await linkOrCopyRecording(filePath, projectRecordingPath);
  const proxyPreviewPath = path.join(projectPath, 'proxy-preview.jpg');
  let proxyPreview = null;
  try {
    await createProxyPreview(filePath, proxyPreviewPath);
    proxyPreview = {
      status: 'created',
      path: proxyPreviewPath
    };
  } catch (error) {
    proxyPreview = {
      status: 'failed',
      path: proxyPreviewPath,
      error: error.message || 'Proxy preview failed'
    };
    console.warn('Could not create Smartie proxy preview.', error);
  }

  const manifest = buildSmartieProjectManifest(
    filePath,
    metadata,
    normalizedTimeline,
    normalizedCameraPlan,
    normalizedArtifacts,
    recordingFileName,
    projectFileMode,
    proxyPreview
  );

  const manifestPath = path.join(projectPath, 'manifest.json');
  const attentionTimelinePath = path.join(projectPath, 'attention.timeline.json');
  const cursorTimelinePath = path.join(projectPath, 'cursor.timeline.json');
  const clickTimelinePath = path.join(projectPath, 'click.timeline.json');
  const keyboardTimelinePath = path.join(projectPath, 'keyboard.timeline.json');
  const motionTimelinePath = path.join(projectPath, 'motion.timeline.json');
  const accessibilityTimelinePath = path.join(projectPath, 'accessibility.timeline.json');
  const nativeTelemetryTimelinePath = path.join(projectPath, 'native.timeline.json');
  const proxyTimelinePath = path.join(projectPath, 'proxy.timeline.json');
  const cameraPlanPath = path.join(projectPath, 'camera.plan.json');
  const renderQaPath = path.join(projectPath, 'render.qa.json');
  const projectMetadataPath = path.join(projectPath, 'recording.smartie.json');

  normalizedArtifacts.proxyTimeline.proxies = [
    ...(normalizedArtifacts.proxyTimeline.proxies || []),
    {
      kind: 'still-preview',
      path: 'proxy-preview.jpg',
      status: proxyPreview.status,
      error: proxyPreview.error || null,
      width: 640
    }
  ];

  await writeJsonFile(manifestPath, manifest);
  await writeJsonFile(attentionTimelinePath, normalizedTimeline);
  await writeJsonFile(cursorTimelinePath, normalizedArtifacts.cursorTimeline);
  await writeJsonFile(clickTimelinePath, normalizedArtifacts.clickTimeline);
  await writeJsonFile(keyboardTimelinePath, normalizedArtifacts.keyboardTimeline);
  await writeJsonFile(motionTimelinePath, normalizedArtifacts.motionTimeline);
  await writeJsonFile(accessibilityTimelinePath, normalizedArtifacts.accessibilityTimeline);
  await writeJsonFile(nativeTelemetryTimelinePath, normalizedArtifacts.nativeTelemetryTimeline);
  await writeJsonFile(proxyTimelinePath, normalizedArtifacts.proxyTimeline);
  await writeJsonFile(cameraPlanPath, normalizedCameraPlan);
  await writeJsonFile(renderQaPath, normalizedArtifacts.renderQa);
  await writeJsonFile(projectMetadataPath, metadata);

  return {
    projectPath,
    manifestPath,
    attentionTimelinePath,
    cursorTimelinePath,
    clickTimelinePath,
    keyboardTimelinePath,
    motionTimelinePath,
    accessibilityTimelinePath,
    nativeTelemetryTimelinePath,
    proxyTimelinePath,
    cameraPlanPath,
    renderQaPath,
    projectMetadataPath,
    projectRecordingPath,
    projectFileMode,
    proxyPreviewPath: proxyPreview.status === 'created' ? proxyPreviewPath : null
  };
}

function transcodeToMp4(inputPath, outputPath) {
  const binaryPath = resolvedFfmpegPath();
  if (!binaryPath) {
    throw new Error('Bundled FFmpeg is unavailable on this platform.');
  }

  const args = [
    '-y',
    '-i',
    inputPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let errorOutput = '';

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg exited with code ${code}: ${errorOutput.slice(-1000)}`));
    });
  });
}

function muxAudioIntoWebm(videoPath, audioSourcePath, outputPath) {
  const binaryPath = resolvedFfmpegPath();
  if (!binaryPath) {
    throw new Error('Bundled FFmpeg is unavailable on this platform.');
  }

  const args = [
    '-y',
    '-i',
    videoPath,
    '-i',
    audioSourcePath,
    '-map',
    '0:v:0',
    '-map',
    '1:a?',
    '-c:v',
    'copy',
    '-c:a',
    'copy',
    '-shortest',
    outputPath
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      stdio: ['ignore', 'ignore', 'pipe']
    });
    let errorOutput = '';

    child.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg mux exited with code ${code}: ${errorOutput.slice(-1000)}`));
    });
  });
}

async function materializeRecordingInput(filePath, { bytes = null, sessionId = null } = {}) {
  if (sessionId) {
    const session = getRecordingSession(sessionId);
    await finalizeRecordingSession(sessionId);
    await linkOrCopyRecording(session.filePath, filePath);
    return {
      input: 'session',
      bytesWritten: session.bytesWritten,
      chunkCount: session.chunkCount
    };
  }

  if (!bytes) {
    throw new Error('No recording data received.');
  }

  await fs.writeFile(filePath, Buffer.from(bytes));
  return {
    input: 'bytes',
    bytesWritten: Buffer.byteLength(Buffer.from(bytes)),
    chunkCount: null
  };
}

async function audioSourcePathFromInput(filePath, audioSourceBytes = null, audioSourceSessionId = null) {
  if (audioSourceSessionId) {
    const session = getRecordingSession(audioSourceSessionId);
    await finalizeRecordingSession(audioSourceSessionId);
    return {
      path: session.filePath,
      temporary: false
    };
  }

  if (!audioSourceBytes) {
    return null;
  }

  const tempAudioPath = `${filePath}.${Date.now()}.audio-source.webm`;
  await fs.writeFile(tempAudioPath, Buffer.from(audioSourceBytes));
  return {
    path: tempAudioPath,
    temporary: true
  };
}

async function writeRecordingFiles(filePath, bytes, metadata, exportFormat = 'webm', audioSourceBytes = null, attentionTimeline = null, cameraPlan = null, projectArtifacts = null, sessionId = null, audioSourceSessionId = null) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let materialized = null;

  if (audioSourceBytes || audioSourceSessionId) {
    const tempBase = `${filePath}.${Date.now()}`;
    const tempVideoPath = `${tempBase}.video-only.webm`;
    const audioSource = await audioSourcePathFromInput(filePath, audioSourceBytes, audioSourceSessionId);
    materialized = await materializeRecordingInput(tempVideoPath, { bytes, sessionId });
    try {
      await muxAudioIntoWebm(tempVideoPath, audioSource.path, filePath);
    } finally {
      await fs.rm(tempVideoPath, { force: true });
      if (audioSource.temporary) {
        await fs.rm(audioSource.path, { force: true });
      }
    }
  } else {
    materialized = await materializeRecordingInput(filePath, { bytes, sessionId });
  }

  if (!metadata) {
    return {
      filePath,
      metadataPath: null,
      chaptersPath: null,
      mp4Path: null,
      projectPath: null,
      projectError: null,
      recordingInput: materialized
    };
  }

  const metadataPath = sidecarPathFor(filePath);
  const chaptersPath = chapterPathFor(filePath);
  const chapters = buildMarkerWebVtt(metadata);

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  if (chapters) {
    await fs.writeFile(chaptersPath, chapters, 'utf8');
  }

  const shouldTranscodeMp4 = exportFormat === 'webm-mp4';
  const mp4Path = shouldTranscodeMp4 ? mp4PathFor(filePath) : null;
  if (mp4Path) {
    await transcodeToMp4(filePath, mp4Path);
  }

  let project = null;
  let projectError = null;
  try {
    project = await writeSmartieProject(filePath, metadata, attentionTimeline, cameraPlan, projectArtifacts);
  } catch (error) {
    projectError = error.message || 'Could not write Smartie project.';
    console.warn('Could not write Smartie project.', error);
  }

  return {
    filePath,
    metadataPath,
    chaptersPath: chapters ? chaptersPath : null,
    mp4Path,
    projectPath: project ? project.projectPath : null,
    projectManifestPath: project ? project.manifestPath : null,
    attentionTimelinePath: project ? project.attentionTimelinePath : null,
    cursorTimelinePath: project ? project.cursorTimelinePath : null,
    clickTimelinePath: project ? project.clickTimelinePath : null,
    keyboardTimelinePath: project ? project.keyboardTimelinePath : null,
    motionTimelinePath: project ? project.motionTimelinePath : null,
    accessibilityTimelinePath: project ? project.accessibilityTimelinePath : null,
    nativeTelemetryTimelinePath: project ? project.nativeTelemetryTimelinePath : null,
    proxyTimelinePath: project ? project.proxyTimelinePath : null,
    cameraPlanPath: project ? project.cameraPlanPath : null,
    renderQaPath: project ? project.renderQaPath : null,
    proxyPreviewPath: project ? project.proxyPreviewPath : null,
    projectRecordingPath: project ? project.projectRecordingPath : null,
    projectFileMode: project ? project.projectFileMode : null,
    recordingInput: materialized,
    projectError
  };
}

ipcMain.handle('smartie:list-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    fetchWindowIcons: true,
    thumbnailSize: {
      width: 420,
      height: 260
    }
  });

  return {
    displays: getDisplaySnapshot(),
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      displayId: source.display_id || null,
      thumbnail: toDataUrl(source.thumbnail),
      appIcon: toDataUrl(source.appIcon)
    }))
  };
});

ipcMain.handle('smartie:get-pointer', async () => {
  const pointer = await nativeTelemetry.pointerSnapshot({ allowNativePolling: false });
  return {
    point: pointer.point || screen.getCursorScreenPoint(),
    provider: pointer.provider,
    precision: pointer.precision,
    native: pointer,
    displays: getDisplaySnapshot()
  };
});

ipcMain.handle('smartie:get-performance-profile', () => classifyPerformanceProfile());

ipcMain.handle('smartie:start-native-telemetry', async (_event, payload) => nativeTelemetry.startSession(payload));

ipcMain.handle('smartie:get-native-telemetry', async (_event, payload) => nativeTelemetry.snapshot(payload));

ipcMain.handle('smartie:get-native-telemetry-diagnostics', async () => nativeTelemetry.diagnostics());

ipcMain.handle('smartie:stop-native-telemetry', async () => nativeTelemetry.stopSession());

ipcMain.handle('smartie:get-telemetry-adapter-status', async () => statusTelemetryAdapters());

ipcMain.handle('smartie:install-telemetry-adapter', async () => installBestTelemetryAdapter({ enable: true }));

ipcMain.handle('smartie:uninstall-gnome-telemetry-adapter', async () => uninstallGnomeTelemetryAdapter());

ipcMain.handle('smartie:create-recording-session', async (_event, payload) => createRecordingSession(payload));

ipcMain.handle('smartie:append-recording-chunk', async (_event, payload) => {
  const { sessionId, bytes } = payload || {};
  if (!sessionId) {
    throw new Error('Recording session id is required.');
  }

  return appendRecordingChunk(sessionId, bytes);
});

ipcMain.handle('smartie:finalize-recording-session', async (_event, sessionId) => finalizeRecordingSession(sessionId));

ipcMain.handle('smartie:read-recording-session', async (_event, sessionId) => readRecordingSession(sessionId));

ipcMain.handle('smartie:discard-recording-session', async (_event, sessionId) => discardRecordingSession(sessionId));

async function getActiveWindowSnapshot() {
  const snapshot = {
    capturedAt: new Date().toISOString(),
    platform: process.platform,
    sessionType: process.env.XDG_SESSION_TYPE || null,
    available: false,
    provider: null,
    title: null,
    pid: null,
    error: null
  };

  if (process.platform !== 'linux' || process.env.XDG_SESSION_TYPE === 'wayland') {
    snapshot.error = process.env.XDG_SESSION_TYPE === 'wayland'
      ? 'Active window lookup is unavailable from Electron on Wayland without a native portal helper.'
      : 'Active window lookup is only implemented for Linux/X11.';
    return snapshot;
  }

  try {
    const activeWindow = await execFileAsync('xdotool', ['getactivewindow'], { timeout: 650 });
    const windowId = activeWindow.stdout.trim();
    if (!windowId) {
      snapshot.error = 'xdotool did not return an active window id.';
      return snapshot;
    }

    const [nameResult, pidResult] = await Promise.allSettled([
      execFileAsync('xdotool', ['getwindowname', windowId], { timeout: 650 }),
      execFileAsync('xdotool', ['getwindowpid', windowId], { timeout: 650 })
    ]);

    snapshot.available = true;
    snapshot.provider = 'xdotool';
    snapshot.windowId = windowId;
    if (nameResult.status === 'fulfilled') {
      snapshot.title = nameResult.value.stdout.trim() || null;
    }
    if (pidResult.status === 'fulfilled') {
      const pid = Number(pidResult.value.stdout.trim());
      snapshot.pid = Number.isFinite(pid) ? pid : null;
    }
  } catch (error) {
    snapshot.error = error.message || 'Active window lookup failed.';
  }

  return snapshot;
}

ipcMain.handle('smartie:get-semantic-context', async () => ({
  activeWindow: await getActiveWindowSnapshot(),
  nativeTelemetry: await nativeTelemetry.snapshot({ allowNativePolling: true }),
  displays: getDisplaySnapshot()
}));

ipcMain.handle('smartie:save-camera-plan', async (_event, payload) => {
  const { projectPath, cameraPlan } = payload || {};
  if (!projectPath || !cameraPlan) {
    throw new Error('Project path and camera plan are required.');
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const cameraPlanPath = path.join(resolvedProjectPath, 'camera.plan.json');
  await writeJsonFile(cameraPlanPath, normalizeCameraPlan(cameraPlan));
  return {
    cameraPlanPath
  };
});

ipcMain.handle('smartie:save-recording', async (_event, payload) => {
  const {
    bytes,
    sessionId,
    audioSourceBytes,
    audioSourceSessionId,
    suggestedName,
    saveMode,
    outputDir,
    metadata,
    exportFormat,
    attentionTimeline,
    cameraPlan,
    projectArtifacts
  } = payload || {};
  if (!bytes && !sessionId) {
    throw new Error('No recording data received.');
  }

  const cleanupSessionIds = new Set([sessionId, audioSourceSessionId].filter(Boolean));
  try {
    if (saveMode === 'auto') {
      const directory = outputDir || defaultRecordingDirectory();
      const filePath = path.join(directory, suggestedName || path.basename(defaultRecordingPath()));
      const saved = await writeRecordingFiles(filePath, bytes, metadata, exportFormat, audioSourceBytes, attentionTimeline, cameraPlan, projectArtifacts, sessionId, audioSourceSessionId);
      return {
        canceled: false,
        ...saved
      };
    }

    showMainWindow();

    const defaultPath = suggestedName
      ? path.join(outputDir || defaultRecordingDirectory(), suggestedName)
      : defaultRecordingPath();

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Smartie recording',
      defaultPath,
      filters: [
        { name: 'WebM video', extensions: ['webm'] },
        { name: 'All files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const saved = await writeRecordingFiles(result.filePath, bytes, metadata, exportFormat, audioSourceBytes, attentionTimeline, cameraPlan, projectArtifacts, sessionId, audioSourceSessionId);
    return {
      canceled: false,
      ...saved
    };
  } finally {
    for (const id of cleanupSessionIds) {
      await discardRecordingSession(id);
    }
  }
});

ipcMain.handle('smartie:save-snapshot', async (_event, payload) => {
  const { bytes, suggestedName, saveMode, outputDir } = payload || {};
  if (!bytes) {
    throw new Error('No snapshot data received.');
  }

  if (saveMode === 'auto') {
    const directory = outputDir || defaultRecordingDirectory();
    const filePath = path.join(directory, suggestedName || `smartie-snapshot-${Date.now()}.png`);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(bytes));
    return {
      canceled: false,
      filePath
    };
  }

  showMainWindow();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Smartie snapshot',
    defaultPath: path.join(outputDir || defaultRecordingDirectory(), suggestedName || `smartie-snapshot-${Date.now()}.png`),
    filters: [
      { name: 'PNG image', extensions: ['png'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, Buffer.from(bytes));
  return {
    canceled: false,
    filePath: result.filePath
  };
});

ipcMain.handle('smartie:reveal-file', async (_event, filePath) => {
  if (!filePath) {
    return;
  }

  shell.showItemInFolder(filePath);
});

ipcMain.handle('smartie:get-default-output-dir', () => defaultRecordingDirectory());

ipcMain.handle('smartie:choose-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Smartie output folder',
    defaultPath: defaultRecordingDirectory(),
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('smartie:get-shortcuts', () => shortcutStatuses);

ipcMain.handle('smartie:set-window-hidden', (_event, hidden) => setMainWindowHidden(Boolean(hidden)));

ipcMain.handle('smartie:toggle-window-visibility', () => toggleMainWindowVisibility());

app.whenReady().then(() => {
  app.setName(APP_TITLE);
  createWindow();

  if (!IS_SMOKE_TEST) {
    registerGlobalShortcuts();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  nativeTelemetry.stopSession();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
