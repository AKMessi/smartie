const canvas = document.querySelector('#previewCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const video = document.querySelector('#captureVideo');
const cameraVideo = document.querySelector('#cameraVideo');
const motionCanvas = document.createElement('canvas');
motionCanvas.width = 72;
motionCanvas.height = 40;
const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });

const elements = {
  sourceList: document.querySelector('#sourceList'),
  sourceCount: document.querySelector('#sourceCount'),
  recentList: document.querySelector('#recentList'),
  clearRecent: document.querySelector('#clearRecent'),
  refreshSources: document.querySelector('#refreshSources'),
  startRecording: document.querySelector('#startRecording'),
  pauseRecording: document.querySelector('#pauseRecording'),
  dropMarker: document.querySelector('#dropMarker'),
  captureSnapshot: document.querySelector('#captureSnapshot'),
  stopRecording: document.querySelector('#stopRecording'),
  cancelRecording: document.querySelector('#cancelRecording'),
  revealRecording: document.querySelector('#revealRecording'),
  statusText: document.querySelector('#statusText'),
  healthText: document.querySelector('#healthText'),
  timer: document.querySelector('#timer'),
  recordingDot: document.querySelector('#recordingDot'),
  emptyState: document.querySelector('#emptyState'),
  countdown: document.querySelector('#countdown'),
  smartMaster: document.querySelector('#smartMaster'),
  autoZoom: document.querySelector('#autoZoom'),
  cursorSpotlight: document.querySelector('#cursorSpotlight'),
  cursorTrail: document.querySelector('#cursorTrail'),
  motionFocus: document.querySelector('#motionFocus'),
  keyboardOverlay: document.querySelector('#keyboardOverlay'),
  titleOverlay: document.querySelector('#titleOverlay'),
  cueOverlay: document.querySelector('#cueOverlay'),
  clickPulse: document.querySelector('#clickPulse'),
  autoMarkers: document.querySelector('#autoMarkers'),
  idleWide: document.querySelector('#idleWide'),
  privacyBlur: document.querySelector('#privacyBlur'),
  quality: document.querySelector('#quality'),
  outputLayout: document.querySelector('#outputLayout'),
  fps: document.querySelector('#fps'),
  fpsValue: document.querySelector('#fpsValue'),
  smoothRecording: document.querySelector('#smoothRecording'),
  performanceMode: document.querySelector('#performanceMode'),
  performanceProfile: document.querySelector('#performanceProfile'),
  recordingEngine: document.querySelector('#recordingEngine'),
  telemetryAdapterStatus: document.querySelector('#telemetryAdapterStatus'),
  installTelemetryAdapter: document.querySelector('#installTelemetryAdapter'),
  refreshTelemetryAdapter: document.querySelector('#refreshTelemetryAdapter'),
  takeTitle: document.querySelector('#takeTitle'),
  titleDuration: document.querySelector('#titleDuration'),
  cueText: document.querySelector('#cueText'),
  cuePosition: document.querySelector('#cuePosition'),
  microphone: document.querySelector('#microphone'),
  micDevice: document.querySelector('#micDevice'),
  micMute: document.querySelector('#micMute'),
  micLevelBar: document.querySelector('#micLevelBar'),
  micLevelText: document.querySelector('#micLevelText'),
  micGain: document.querySelector('#micGain'),
  micGainValue: document.querySelector('#micGainValue'),
  noiseGate: document.querySelector('#noiseGate'),
  noiseGateThreshold: document.querySelector('#noiseGateThreshold'),
  noiseGateThresholdValue: document.querySelector('#noiseGateThresholdValue'),
  cameraBubble: document.querySelector('#cameraBubble'),
  cameraDevice: document.querySelector('#cameraDevice'),
  refreshDevices: document.querySelector('#refreshDevices'),
  hideWhileRecording: document.querySelector('#hideWhileRecording'),
  cameraPosition: document.querySelector('#cameraPosition'),
  countdownSeconds: document.querySelector('#countdownSeconds'),
  saveMode: document.querySelector('#saveMode'),
  exportFormat: document.querySelector('#exportFormat'),
  outputFolder: document.querySelector('#outputFolder'),
  chooseOutputFolder: document.querySelector('#chooseOutputFolder'),
  focusMode: document.querySelector('#focusMode'),
  directorStyle: document.querySelector('#directorStyle'),
  focusLock: document.querySelector('#focusLock'),
  clearFocusLock: document.querySelector('#clearFocusLock'),
  focusStatus: document.querySelector('#focusStatus'),
  directorPlanStatus: document.querySelector('#directorPlanStatus'),
  directorPlanList: document.querySelector('#directorPlanList'),
  revealProject: document.querySelector('#revealProject'),
  zoomStrength: document.querySelector('#zoomStrength'),
  zoomStrengthValue: document.querySelector('#zoomStrengthValue'),
  motionSensitivity: document.querySelector('#motionSensitivity'),
  motionSensitivityValue: document.querySelector('#motionSensitivityValue'),
  smoothing: document.querySelector('#smoothing'),
  smoothingValue: document.querySelector('#smoothingValue'),
  privacyRegion: document.querySelector('#privacyRegion'),
  privacyStrength: document.querySelector('#privacyStrength'),
  privacyStrengthValue: document.querySelector('#privacyStrengthValue')
};

const state = {
  sources: [],
  displays: [],
  selectedSource: null,
  captureStream: null,
  micInputStream: null,
  micStream: null,
  audioContext: null,
  micSource: null,
  micGateNode: null,
  micGainNode: null,
  micAnalyser: null,
  micMeterId: null,
  micMuted: false,
  cameraStream: null,
  canvasStream: null,
  canvasVideoTrack: null,
  mediaRecorder: null,
  recordingSessionId: null,
  recordingSessionInfo: null,
  chunkWriteQueue: Promise.resolve(),
  chunkWriteError: null,
  chunkSequence: 0,
  recordingMimeType: null,
  recordedVideoSize: null,
  recordingSettings: null,
  stoppedDurationMs: 0,
  chunks: [],
  drawing: false,
  recording: false,
  paused: false,
  discardRequested: false,
  startedAt: 0,
  pausedAt: 0,
  pausedDuration: 0,
  timerId: null,
  lastDrawAt: 0,
  pointerPollId: null,
  semanticPollId: null,
  smartTimelineId: null,
  smartTimeline: [],
  smartTrail: [],
  smartPulses: [],
  telemetry: {
    cursor: [],
    clicks: [],
    keyboard: [],
    motion: [],
    accessibility: [],
    native: [],
    lastCursorSampleAt: -Infinity,
    lastMotionSampleAt: -Infinity,
    lastAccessibilityTitle: '',
    nativeQuality: null,
    nativeSession: null
  },
  renderContext: null,
  trail: [],
  lastRecordingPath: null,
  recentRecordings: [],
  outputDir: null,
  preferredMicDevice: '',
  preferredCameraDevice: '',
  markers: [],
  activeMarker: null,
  lastAutoMarkerAt: -Infinity,
  lastPulseAt: -Infinity,
  windowHiddenForRecording: false,
  keys: [],
  pulse: {
    active: false,
    startedAt: 0,
    x: 0.5,
    y: 0.5
  },
  focusLock: {
    active: false,
    x: 0.5,
    y: 0.5
  },
  lastSmartProjectPath: null,
  lastCameraPlan: null,
  lastProjectArtifacts: null,
  attention: {
    active: {
      source: 'wide',
      reason: 'wide',
      x: 0.5,
      y: 0.5,
      scale: 1,
      score: 1,
      confidence: 0,
      selectedAt: performance.now(),
      lastUpdatedAt: performance.now()
    }
  },
  motionTarget: {
    x: 0.5,
    y: 0.5,
    strength: 0,
    lastSeenAt: 0,
    lastScanAt: 0,
    previousFrame: null
  },
  pointer: {
    screenX: 0,
    screenY: 0,
    x: 0.5,
    y: 0.5,
    previousX: 0.5,
    previousY: 0.5,
    velocity: 0,
    lastMovedAt: performance.now()
  },
  frame: {
    scale: 1,
    x: 0.5,
    y: 0.5
  },
  health: {
    framesThisSecond: 0,
    lastSampleAt: performance.now(),
    lastFrameAt: 0,
    fps: 0,
    droppedFrames: 0
  },
  performance: {
    systemProfile: null,
    activeMode: 'balanced',
    adaptiveLevel: 0,
    lastAdaptAt: 0,
    lastDropCount: 0,
    lastStatus: ''
  },
  telemetryAdapter: null
};

const qualityProfiles = {
  balanced: {
    bitsPerSecond: 10_000_000,
    width: 1920,
    height: 1080
  },
  crisp: {
    bitsPerSecond: 18_000_000,
    width: 2560,
    height: 1440
  },
  cinematic: {
    bitsPerSecond: 32_000_000,
    width: 3840,
    height: 2160
  }
};

const performanceProfiles = {
  potato: {
    label: 'Potato saver',
    shortSide: 540,
    captureShortSide: 720,
    bitrateScale: 0.38,
    maxFps: 24,
    previewFps: 5,
    smartTimelineFps: 8,
    pointerPollMs: 80,
    cursorSampleMs: 220,
    cursorStillSampleMs: 900,
    semanticPollMs: 3200,
    motionScanMs: 1400,
    motionWidth: 36,
    motionHeight: 20,
    maxCursorSamples: 5000,
    maxTimelineSamples: 3600,
    maxTrailSamples: 1200,
    maxPulseSamples: 900,
    maxKeyboardEvents: 1200,
    maxMotionEvents: 900,
    maxAccessibilityEvents: 240,
    maxNativeEvents: 800,
    forceHybridFromLive: true,
    downgradeQuality: 'balanced',
    cameraWidth: 640,
    cameraHeight: 360,
    cameraFps: 15
  },
  ultra: {
    label: 'Ultra smooth',
    shortSide: 720,
    captureShortSide: 900,
    bitrateScale: 0.58,
    maxFps: 30,
    previewFps: 8,
    smartTimelineFps: 12,
    pointerPollMs: 50,
    cursorSampleMs: 150,
    cursorStillSampleMs: 620,
    semanticPollMs: 2200,
    motionScanMs: 760,
    motionWidth: 48,
    motionHeight: 27,
    maxCursorSamples: 9000,
    maxTimelineSamples: 5400,
    maxTrailSamples: 2200,
    maxPulseSamples: 1400,
    maxKeyboardEvents: 1800,
    maxMotionEvents: 1400,
    maxAccessibilityEvents: 420,
    maxNativeEvents: 1400,
    forceHybridFromLive: true,
    downgradeQuality: null,
    cameraWidth: 854,
    cameraHeight: 480,
    cameraFps: 24
  },
  balanced: {
    label: 'Balanced',
    shortSide: 900,
    captureShortSide: 1080,
    bitrateScale: 0.74,
    maxFps: 60,
    previewFps: 12,
    smartTimelineFps: 18,
    pointerPollMs: 42,
    cursorSampleMs: 110,
    cursorStillSampleMs: 420,
    semanticPollMs: 1400,
    motionScanMs: 460,
    motionWidth: 60,
    motionHeight: 34,
    maxCursorSamples: 15000,
    maxTimelineSamples: 9000,
    maxTrailSamples: 3600,
    maxPulseSamples: 2200,
    maxKeyboardEvents: 2600,
    maxMotionEvents: 2200,
    maxAccessibilityEvents: 720,
    maxNativeEvents: 2400,
    forceHybridFromLive: false,
    downgradeQuality: null,
    cameraWidth: 960,
    cameraHeight: 540,
    cameraFps: 30
  },
  quality: {
    label: 'Max quality',
    shortSide: Infinity,
    captureShortSide: Infinity,
    bitrateScale: 1,
    maxFps: 60,
    previewFps: 24,
    smartTimelineFps: 30,
    pointerPollMs: 33,
    cursorSampleMs: 70,
    cursorStillSampleMs: 260,
    semanticPollMs: 1000,
    motionScanMs: 220,
    motionWidth: 72,
    motionHeight: 40,
    maxCursorSamples: 24000,
    maxTimelineSamples: 18000,
    maxTrailSamples: 5200,
    maxPulseSamples: 3200,
    maxKeyboardEvents: 4200,
    maxMotionEvents: 4200,
    maxAccessibilityEvents: 1200,
    maxNativeEvents: 4200,
    forceHybridFromLive: false,
    downgradeQuality: null,
    cameraWidth: 1280,
    cameraHeight: 720,
    cameraFps: 30
  }
};

const performanceDemotionOrder = ['quality', 'balanced', 'ultra', 'potato'];

const persistedSettingKeys = [
  'smartMaster',
  'autoZoom',
  'cursorSpotlight',
  'cursorTrail',
  'motionFocus',
  'keyboardOverlay',
  'titleOverlay',
  'cueOverlay',
  'clickPulse',
  'autoMarkers',
  'idleWide',
  'privacyBlur',
  'quality',
  'outputLayout',
  'fps',
  'smoothRecording',
  'performanceMode',
  'recordingEngine',
  'takeTitle',
  'titleDuration',
  'cueText',
  'cuePosition',
  'microphone',
  'micDevice',
  'micGain',
  'noiseGate',
  'noiseGateThreshold',
  'cameraBubble',
  'cameraDevice',
  'hideWhileRecording',
  'cameraPosition',
  'countdownSeconds',
  'saveMode',
  'exportFormat',
  'focusMode',
  'directorStyle',
  'zoomStrength',
  'motionSensitivity',
  'smoothing',
  'privacyRegion',
  'privacyStrength'
];

const settingsStoreKey = 'smartie.settings.v1';
const recentStoreKey = 'smartie.recent.v1';

function loadPersistedSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(settingsStoreKey) || '{}');
    if (settings.recordingEngine === 'native' && settings.smartMaster !== false) {
      settings.recordingEngine = 'hybrid';
    }
    if (!settings.focusMode || settings.focusMode === 'cursor') {
      settings.focusMode = 'director';
    }

    for (const key of persistedSettingKeys) {
      if (!(key in settings) || !elements[key]) {
        continue;
      }

      if (elements[key].type === 'checkbox') {
        elements[key].checked = Boolean(settings[key]);
      } else {
        elements[key].value = String(settings[key]);
      }
    }

    if (settings.lastSourceId) {
      state.lastSourceId = settings.lastSourceId;
    }

    if (settings.outputDir) {
      state.outputDir = settings.outputDir;
    }

    if (settings.micDevice) {
      state.preferredMicDevice = settings.micDevice;
    }

    if (settings.cameraDevice) {
      state.preferredCameraDevice = settings.cameraDevice;
    }
  } catch (error) {
    console.warn('Could not load Smartie settings.', error);
  }
}

function saveSettings() {
  const settings = getSettings();
  if (state.selectedSource) {
    settings.lastSourceId = state.selectedSource.id;
  }
  if (state.outputDir) {
    settings.outputDir = state.outputDir;
  }

  localStorage.setItem(settingsStoreKey, JSON.stringify(settings));
}

function scheduleSaveSettings() {
  window.clearTimeout(scheduleSaveSettings.id);
  scheduleSaveSettings.id = window.setTimeout(saveSettings, 120);
}

function loadRecentRecordings() {
  try {
    const recent = JSON.parse(localStorage.getItem(recentStoreKey) || '[]');
    state.recentRecordings = Array.isArray(recent) ? recent.slice(0, 12) : [];

    if (!state.lastRecordingPath && state.recentRecordings[0]) {
      state.lastRecordingPath = state.recentRecordings[0].filePath;
      state.lastSmartProjectPath = state.recentRecordings[0].projectPath || null;
    }
  } catch (error) {
    console.warn('Could not load Smartie recent recordings.', error);
    state.recentRecordings = [];
  }
}

function saveRecentRecordings() {
  localStorage.setItem(recentStoreKey, JSON.stringify(state.recentRecordings.slice(0, 12)));
}

function fileNameFromPath(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath;
}

function cleanTitle(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}

function cleanCueText(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 260);
}

function fileSafeTitle(value) {
  return cleanTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function selectedOptionLabel(select) {
  return select.selectedOptions[0]?.textContent || '';
}

function deviceLabel(device, fallback, index) {
  return device.label || `${fallback} ${index + 1}`;
}

function uniqueDevices(devices) {
  const seen = new Set();
  return devices.filter((device) => {
    if (!device.deviceId || seen.has(device.deviceId)) {
      return false;
    }

    seen.add(device.deviceId);
    return true;
  });
}

function renderDeviceSelect(select, devices, selectedValue, defaultLabel, fallbackLabel) {
  select.textContent = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = defaultLabel;
  select.append(defaultOption);

  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = deviceLabel(device, fallbackLabel, index);
    select.append(option);
  });

  select.value = devices.some((device) => device.deviceId === selectedValue) ? selectedValue : '';
}

function canvasSizeForSettings(settings = getSettings()) {
  const profile = qualityProfiles[settings.quality] || qualityProfiles.balanced;
  const outputLayout = outputLayoutForRecording(settings);
  let size;

  if (outputLayout === 'vertical') {
    size = {
      width: profile.height,
      height: profile.width
    };
  } else if (outputLayout === 'square') {
    const squareSize = Math.min(profile.width, profile.height);
    return capCanvasSize({
      width: squareSize,
      height: squareSize
    }, performanceShortSide(settings));
  } else {
    size = {
      width: profile.width,
      height: profile.height
    };
  }

  return capCanvasSize(size, performanceShortSide(settings));
}

function normalizedPerformanceMode(mode) {
  return performanceProfiles[mode] ? mode : 'balanced';
}

function recommendedPerformanceMode() {
  return normalizedPerformanceMode(state.performance.systemProfile?.recommendedMode || 'balanced');
}

function explicitPerformanceMode(settings = getSettings()) {
  return settings.performanceResolvedMode
    || (settings.performanceMode === 'auto' ? recommendedPerformanceMode() : normalizedPerformanceMode(settings.performanceMode));
}

function demotePerformanceMode(mode, levels = 0) {
  const normalized = normalizedPerformanceMode(mode);
  const index = performanceDemotionOrder.indexOf(normalized);
  if (index === -1) {
    return normalized;
  }

  return performanceDemotionOrder[Math.min(performanceDemotionOrder.length - 1, index + Math.max(0, levels))];
}

function activePerformanceMode(settings = getSettings()) {
  const requested = explicitPerformanceMode(settings);
  const adaptiveLevel = state.recording ? state.performance.adaptiveLevel : 0;
  return demotePerformanceMode(requested, adaptiveLevel);
}

function performanceProfile(settings = getSettings()) {
  return performanceProfiles[activePerformanceMode(settings)] || performanceProfiles.balanced;
}

function performanceShortSide(settings = getSettings()) {
  return performanceProfile(settings).shortSide;
}

function performanceCaptureShortSide(settings = getSettings()) {
  return performanceProfile(settings).captureShortSide;
}

function performanceSummaryLabel(settings = getSettings()) {
  const profile = performanceProfile(settings);
  const requested = settings.performanceMode === 'auto'
    ? `Auto -> ${profile.label}`
    : profile.label;
  const tier = state.performance.systemProfile?.tier || 'profiling';
  const caps = [];
  if (Number.isFinite(profile.captureShortSide)) {
    caps.push(`${profile.captureShortSide}p cap`);
  }
  caps.push(`${profile.maxFps} fps max`);

  return `${requested} - ${tier} system - ${caps.join(', ')}`;
}

function boundedPush(array, value, maxItems) {
  array.push(value);
  if (array.length > maxItems) {
    array.splice(0, array.length - maxItems);
  }
}

function prepareRecordingSettings(rawSettings) {
  const settings = { ...rawSettings };
  const resolvedMode = explicitPerformanceMode(settings);
  const profile = performanceProfiles[resolvedMode] || performanceProfiles.balanced;
  const notes = [];

  settings.performanceResolvedMode = resolvedMode;
  settings.performanceTier = state.performance.systemProfile?.tier || 'unknown';
  settings.fps = Math.min(Number(settings.fps) || 30, profile.maxFps);

  if (profile.downgradeQuality && qualityProfiles[settings.quality]?.height > qualityProfiles[profile.downgradeQuality].height) {
    settings.requestedQuality = settings.quality;
    settings.quality = profile.downgradeQuality;
    notes.push(`quality capped to ${profile.downgradeQuality}`);
  }

  if (profile.forceHybridFromLive && usesSmartCanvasRecording(settings)) {
    settings.requestedRecordingEngine = settings.recordingEngine;
    settings.recordingEngine = settings.smartMaster ? 'hybrid' : 'native';
    notes.push('live canvas recording moved to deferred smart render');
  }

  settings.performanceGovernor = {
    mode: resolvedMode,
    label: profile.label,
    tier: settings.performanceTier,
    notes,
    caps: {
      fps: profile.maxFps,
      captureShortSide: Number.isFinite(profile.captureShortSide) ? profile.captureShortSide : null,
      renderShortSide: Number.isFinite(profile.shortSide) ? profile.shortSide : null,
      bitrateScale: profile.bitrateScale,
      pointerPollMs: profile.pointerPollMs,
      smartTimelineFps: profile.smartTimelineFps
    }
  };

  return settings;
}

function capCanvasSize(size, maxShortSide) {
  if (!Number.isFinite(maxShortSide)) {
    return size;
  }

  const shortSide = Math.min(size.width, size.height);
  if (shortSide <= maxShortSide) {
    return size;
  }

  const scale = maxShortSide / shortSide;
  const even = (value) => Math.max(2, Math.round(value / 2) * 2);
  return {
    width: even(size.width * scale),
    height: even(size.height * scale)
  };
}

function lowLatencyMode(settings = getSettings()) {
  const mode = activePerformanceMode(settings);
  return settings.smoothRecording && usesSmartCanvasRecording(settings) && (mode === 'ultra' || mode === 'potato');
}

function usesSmartCanvasRecording(settings = getSettings()) {
  return settings.recordingEngine === 'smart';
}

function usesHybridSmartRender(settings = getSettings()) {
  return settings.recordingEngine === 'hybrid';
}

function usesSmartEffectsOutput(settings = getSettings()) {
  return usesSmartCanvasRecording(settings) || usesHybridSmartRender(settings);
}

function outputLayoutForRecording(settings = getSettings()) {
  return usesSmartEffectsOutput(settings) ? settings.outputLayout : 'landscape';
}

function effectiveRecordingFps(settings = getSettings()) {
  const requestedFps = Number(settings.fps) || 30;
  const cappedFps = Math.min(requestedFps, performanceProfile(settings).maxFps);
  return settings.smoothRecording && usesSmartCanvasRecording(settings)
    ? Math.min(cappedFps, 30)
    : cappedFps;
}

function effectiveDrawFps(settings = getSettings()) {
  if (!usesSmartCanvasRecording(settings) && settings.smoothRecording) {
    return Math.min(performanceProfile(settings).previewFps, effectiveRecordingFps(settings));
  }

  return Math.min(effectiveRecordingFps(settings), performanceProfile(settings).previewFps || effectiveRecordingFps(settings));
}

function recordingBitrate(settings = getSettings()) {
  const profile = qualityProfiles[settings.quality] || qualityProfiles.balanced;
  const scale = settings.smoothRecording ? performanceProfile(settings).bitrateScale : 1;
  return Math.round(profile.bitsPerSecond * scale);
}

function renderRecentRecordings() {
  elements.recentList.textContent = '';
  elements.clearRecent.disabled = state.recentRecordings.length === 0;

  if (state.recentRecordings.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty-mini';
    empty.textContent = 'No saved takes yet.';
    elements.recentList.append(empty);
    return;
  }

  for (const recording of state.recentRecordings) {
    const card = document.createElement('div');
    card.className = 'recent-card';

    const details = document.createElement('div');
    const title = document.createElement('strong');
    const fileName = fileNameFromPath(recording.filePath);
    title.textContent = recording.takeTitle || fileName;

    const meta = document.createElement('span');
    const duration = formatTime(recording.durationMs || 0);
    const markerCount = recording.markers ? recording.markers.length : 0;
    const markerText = markerCount === 1 ? '1 marker' : `${markerCount} markers`;
    const sourceText = recording.sourceName || 'Unknown source';
    meta.textContent = recording.takeTitle
      ? `${fileName} - ${duration} - ${markerText} - ${sourceText}`
      : `${duration} - ${markerText} - ${sourceText}`;

    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'mini-button';
    reveal.textContent = 'Reveal';
    reveal.addEventListener('click', () => window.smartie.revealFile(recording.filePath));

    details.append(title, meta);
    card.append(details, reveal);
    elements.recentList.append(card);
  }
}

function renderDirectorPlan(plan = state.lastCameraPlan) {
  if (!elements.directorPlanStatus || !elements.directorPlanList) {
    return;
  }

  elements.directorPlanList.textContent = '';
  const segments = plan && Array.isArray(plan.segments) ? plan.segments : [];
  const activeSegments = segments.filter((segment) => segment.enabled !== false);
  const stats = plan?.stats || {};
  const warnings = plan?.qa?.warnings || [];

  if (!plan) {
    elements.directorPlanStatus.textContent = 'No rendered plan yet.';
    return;
  }

  const coverage = Math.round(finiteNumber(stats.zoomCoverage, 0) * 100);
  const sourceEvents = finiteNumber(stats.sourceEvents, 0);
  const warningText = warnings.length > 0 ? ` - ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : '';
  elements.directorPlanStatus.textContent = `${activeSegments.length} active shots from ${sourceEvents} cues - ${coverage}% coverage${warningText}`;

  if (activeSegments.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty-mini';
    empty.textContent = 'Director kept this take wide.';
    elements.directorPlanList.append(empty);
    return;
  }

  for (const segment of segments.slice(0, 8)) {
    const card = document.createElement('div');
    card.className = 'plan-segment';
    card.classList.toggle('disabled', segment.enabled === false);

    const details = document.createElement('div');
    const title = document.createElement('strong');
    const meta = document.createElement('span');
    const scale = document.createElement('em');
    const actions = document.createElement('div');

    title.textContent = `${segment.cue || 'focus'} ${formatTime(segment.startMs)}-${formatTime(segment.endMs)}`;
    meta.textContent = segment.reason || `${Math.round(finiteNumber(segment.confidence, 0) * 100)}% confidence`;
    scale.textContent = `${finiteNumber(segment.scale, 1).toFixed(2)}x`;
    actions.className = 'plan-actions';
    actions.append(
      planActionButton(segment.enabled === false ? 'Show' : 'Hide', () => applyCameraPlanEdit(segment.id, 'toggle')),
      planActionButton('-0.1x', () => applyCameraPlanEdit(segment.id, 'scale-down')),
      planActionButton('+0.1x', () => applyCameraPlanEdit(segment.id, 'scale-up')),
      planActionButton('Shorter', () => applyCameraPlanEdit(segment.id, 'shorter')),
      planActionButton('Longer', () => applyCameraPlanEdit(segment.id, 'longer'))
    );

    details.append(title, meta);
    card.append(details, scale, actions);
    elements.directorPlanList.append(card);
  }
}

function planActionButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mini-button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function editedPlanProfile(plan) {
  return directorStyleProfile({
    directorStyle: plan?.settings?.director_style || getSettings().directorStyle || 'balanced'
  });
}

function rebuildEditedCameraPlan(plan) {
  const durationMs = finiteNumber(plan?.stats?.durationMs, 0);
  const profile = editedPlanProfile(plan);
  const segments = Array.isArray(plan?.segments) ? plan.segments : [];
  const activeSegments = segments.filter((segment) => segment.enabled !== false);
  const keyframes = buildCameraKeyframes(activeSegments, durationMs, profile);
  const qa = validateCameraPlan(activeSegments, keyframes, durationMs);

  return {
    ...plan,
    edited_at: new Date().toISOString(),
    segments,
    keyframes,
    qa,
    stats: {
      ...(plan.stats || {}),
      ...qa.stats,
      segmentCount: activeSegments.length,
      durationMs
    }
  };
}

function applyCameraPlanEdit(segmentId, action) {
  if (!state.lastCameraPlan) {
    return;
  }

  const durationMs = finiteNumber(state.lastCameraPlan.stats?.durationMs, 0);
  const nextPlan = {
    ...state.lastCameraPlan,
    segments: state.lastCameraPlan.segments.map((segment) => {
      if (segment.id !== segmentId) {
        return { ...segment };
      }

      const next = { ...segment };
      if (action === 'toggle') {
        next.enabled = segment.enabled === false;
      } else if (action === 'scale-down') {
        next.scale = roundTo(Math.max(1.05, finiteNumber(segment.scale, 1) - 0.1), 3);
      } else if (action === 'scale-up') {
        next.scale = roundTo(Math.min(2.5, finiteNumber(segment.scale, 1) + 0.1), 3);
      } else if (action === 'shorter') {
        next.endMs = Math.max(next.startMs + 600, next.endMs - 300);
        next.durationMs = next.endMs - next.startMs;
      } else if (action === 'longer') {
        next.endMs = Math.min(durationMs, next.endMs + 300);
        next.durationMs = next.endMs - next.startMs;
      }

      return next;
    })
  };

  state.lastCameraPlan = rebuildEditedCameraPlan(nextPlan);
  renderDirectorPlan(state.lastCameraPlan);
  persistCameraPlanEdit().catch((error) => {
    console.warn('Could not persist Smartie camera plan edit.', error);
    setStatus('Plan edit not saved');
  });
}

async function persistCameraPlanEdit() {
  if (!state.lastSmartProjectPath || !state.lastCameraPlan || typeof window.smartie.saveCameraPlan !== 'function') {
    return;
  }

  await window.smartie.saveCameraPlan({
    projectPath: state.lastSmartProjectPath,
    cameraPlan: state.lastCameraPlan
  });
  setStatus('Director plan updated');
}

function rememberRecording(recording) {
  state.recentRecordings = [
    recording,
    ...state.recentRecordings.filter((item) => item.filePath !== recording.filePath)
  ].slice(0, 12);

  saveRecentRecordings();
  renderRecentRecordings();
}

function clearRecentRecordings() {
  state.recentRecordings = [];
  saveRecentRecordings();
  state.lastRecordingPath = null;
  renderRecentRecordings();
  syncControls();
}

function resetTelemetry() {
  state.telemetry = {
    cursor: [],
    clicks: [],
    keyboard: [],
    motion: [],
    accessibility: [],
    native: [],
    lastCursorSampleAt: -Infinity,
    lastMotionSampleAt: -Infinity,
    lastAccessibilityTitle: '',
    nativeQuality: null,
    nativeSession: null
  };
}

function telemetrySource(durationMs, outputSize, settings) {
  return {
    duration_ms: Math.round(finiteNumber(durationMs, 0)),
    duration_sec: roundTo(finiteNumber(durationMs, 0) / 1000, 3),
    width: outputSize.width,
    height: outputSize.height,
    fps: effectiveRecordingFps(settings),
    source_id: state.selectedSource ? state.selectedSource.id : null,
    source_name: state.selectedSource ? state.selectedSource.name : null
  };
}

function buildTimelineArtifact(schema, events, source, key = 'events') {
  return {
    schema,
    version: 1,
    generated_at: new Date().toISOString(),
    source,
    stats: {
      count: Array.isArray(events) ? events.length : 0
    },
    [key]: Array.isArray(events) ? events : []
  };
}

function nativeTelemetryStats(events) {
  const snapshots = Array.isArray(events) ? events.filter((event) => event.type === 'snapshot') : [];
  const qualityCounts = {};
  const providers = {};
  let bestScore = 0;
  let bestQuality = null;

  for (const event of snapshots) {
    const quality = event.quality || {};
    const tier = quality.tier || 'unknown';
    qualityCounts[tier] = (qualityCounts[tier] || 0) + 1;
    bestScore = Math.max(bestScore, finiteNumber(quality.score, 0));
    if (!bestQuality || finiteNumber(quality.score, 0) >= finiteNumber(bestQuality.score, 0)) {
      bestQuality = quality;
    }
    const provider = event.provider || event.pointer?.provider || event.active_window?.provider || null;
    if (provider) {
      providers[provider] = (providers[provider] || 0) + 1;
    }
  }

  return {
    count: Array.isArray(events) ? events.length : 0,
    snapshots: snapshots.length,
    helperEvents: Array.isArray(events) ? events.filter((event) => event.helper_event).length : 0,
    quality: bestQuality || state.telemetry.nativeQuality || {
      tier: 'unavailable',
      score: 0,
      native: false,
      perfectCandidate: false
    },
    bestScore: roundTo(bestScore, 3),
    qualityCounts,
    providers
  };
}

function buildProjectArtifacts({ durationMs, outputSize, settings, cameraPlan, attentionTimeline, renderQa }) {
  const source = telemetrySource(durationMs, outputSize, settings);
  const proxyScale = Math.min(1, 640 / Math.max(outputSize.width, outputSize.height));
  const nativeEvents = state.telemetry.native.slice();

  return {
    cursorTimeline: buildTimelineArtifact('smartie.cursor_timeline.v1', state.telemetry.cursor.slice(), source, 'samples'),
    clickTimeline: buildTimelineArtifact('smartie.click_timeline.v1', state.telemetry.clicks.slice(), source),
    keyboardTimeline: buildTimelineArtifact('smartie.keyboard_timeline.v1', state.telemetry.keyboard.slice(), source),
    motionTimeline: buildTimelineArtifact('smartie.motion_timeline.v1', state.telemetry.motion.slice(), source),
    accessibilityTimeline: buildTimelineArtifact('smartie.accessibility_timeline.v1', state.telemetry.accessibility.slice(), source),
    nativeTelemetryTimeline: {
      schema: 'smartie.native_telemetry_timeline.v1',
      version: 1,
      generated_at: new Date().toISOString(),
      source: {
        ...source,
        session: state.telemetry.nativeSession || null
      },
      stats: nativeTelemetryStats(nativeEvents),
      events: nativeEvents
    },
    proxyTimeline: {
      schema: 'smartie.proxy_timeline.v1',
      version: 1,
      generated_at: new Date().toISOString(),
      source,
      stats: {
        proxyScale: roundTo(proxyScale, 4),
        cameraSegments: cameraPlan.segments.length,
        attentionEvents: attentionTimeline.events.length
      },
      proxies: [
        {
          kind: 'timeline-proxy',
          width: Math.max(2, Math.round(outputSize.width * proxyScale)),
          height: Math.max(2, Math.round(outputSize.height * proxyScale)),
          camera_plan_schema: cameraPlan.schema,
          render_independent: true
        }
      ]
    },
    renderQa
  };
}

function getSettings() {
  return {
    smartMaster: elements.smartMaster.checked,
    autoZoom: elements.autoZoom.checked,
    cursorSpotlight: elements.cursorSpotlight.checked,
    cursorTrail: elements.cursorTrail.checked,
    motionFocus: elements.motionFocus.checked,
    keyboardOverlay: elements.keyboardOverlay.checked,
    titleOverlay: elements.titleOverlay.checked,
    cueOverlay: elements.cueOverlay.checked,
    clickPulse: elements.clickPulse.checked,
    autoMarkers: elements.autoMarkers.checked,
    idleWide: elements.idleWide.checked,
    privacyBlur: elements.privacyBlur.checked,
    quality: elements.quality.value,
    outputLayout: elements.outputLayout.value,
    fps: Number(elements.fps.value),
    smoothRecording: elements.smoothRecording.checked,
    performanceMode: elements.performanceMode.value,
    recordingEngine: elements.recordingEngine.value,
    takeTitle: cleanTitle(elements.takeTitle.value),
    titleDuration: Number(elements.titleDuration.value),
    cueText: cleanCueText(elements.cueText.value),
    cuePosition: elements.cuePosition.value,
    microphone: elements.microphone.checked,
    micDevice: elements.micDevice.value,
    micDeviceLabel: selectedOptionLabel(elements.micDevice),
    micGain: Number(elements.micGain.value),
    noiseGate: elements.noiseGate.checked,
    noiseGateThreshold: Number(elements.noiseGateThreshold.value),
    cameraBubble: elements.cameraBubble.checked,
    cameraDevice: elements.cameraDevice.value,
    cameraDeviceLabel: selectedOptionLabel(elements.cameraDevice),
    hideWhileRecording: elements.hideWhileRecording.checked,
    cameraPosition: elements.cameraPosition.value,
    countdownSeconds: Number(elements.countdownSeconds.value),
    saveMode: elements.saveMode.value,
    exportFormat: elements.exportFormat.value,
    outputDir: state.outputDir,
    focusMode: elements.focusMode.value,
    directorStyle: elements.directorStyle.value,
    zoomStrength: Number(elements.zoomStrength.value),
    motionSensitivity: Number(elements.motionSensitivity.value),
    smoothing: Number(elements.smoothing.value),
    privacyRegion: elements.privacyRegion.value,
    privacyStrength: Number(elements.privacyStrength.value)
  };
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  if (!state.recording) {
    elements.timer.textContent = '00:00';
    return;
  }

  elements.timer.textContent = formatTime(recordingElapsedMs());
}

function recordingElapsedMs(now = Date.now()) {
  if (!state.recording && state.stoppedDurationMs > 0) {
    return state.stoppedDurationMs;
  }

  if (!state.recording && state.startedAt === 0) {
    return 0;
  }

  const effectiveNow = state.paused ? state.pausedAt : now;
  return Math.max(0, effectiveNow - state.startedAt - state.pausedDuration);
}

function currentRenderMs() {
  return state.renderContext ? state.renderContext.atMs : recordingElapsedMs();
}

function resetHealth() {
  state.health = {
    framesThisSecond: 0,
    lastSampleAt: performance.now(),
    lastFrameAt: 0,
    fps: 0,
    droppedFrames: 0
  };
  renderHealth();
}

function renderHealth() {
  elements.healthText.classList.remove('good', 'warn');

  if (!state.recording) {
    elements.healthText.textContent = 'Idle';
    return;
  }

  if (state.paused) {
    elements.healthText.textContent = 'Paused';
    elements.healthText.classList.add('warn');
    return;
  }

  const settings = state.recordingSettings || getSettings();
  if (!usesSmartCanvasRecording(settings)) {
    const mode = activePerformanceMode(settings);
    elements.healthText.textContent = usesHybridSmartRender(settings) ? `Smartie ${mode}` : `Native ${mode}`;
    elements.healthText.classList.add('good');
    return;
  }

  const targetFps = effectiveRecordingFps(settings);
  const isHealthy = state.health.fps >= targetFps * 0.75 && state.health.droppedFrames === 0;
  elements.healthText.textContent = state.health.droppedFrames > 0
    ? `${state.health.fps} fps / ${state.health.droppedFrames} drops`
    : `${state.health.fps} fps`;
  elements.healthText.classList.add(isHealthy ? 'good' : 'warn');
}

function updateFrameHealth(now, targetFps) {
  if (!state.recording || state.paused) {
    state.health.lastFrameAt = 0;
    renderHealth();
    return;
  }

  if (state.health.lastFrameAt > 0) {
    const frameBudget = 1000 / targetFps;
    const delta = now - state.health.lastFrameAt;
    if (delta > frameBudget * 1.8) {
      state.health.droppedFrames += Math.max(1, Math.round(delta / frameBudget) - 1);
    }
  }

  state.health.lastFrameAt = now;
  state.health.framesThisSecond += 1;

  if (now - state.health.lastSampleAt >= 1000) {
    state.health.fps = Math.round((state.health.framesThisSecond * 1000) / (now - state.health.lastSampleAt));
    state.health.framesThisSecond = 0;
    state.health.lastSampleAt = now;
    observePerformanceHealth(now, targetFps);
    renderHealth();
  }
}

function resetPerformanceGovernor() {
  state.performance.adaptiveLevel = 0;
  state.performance.lastAdaptAt = 0;
  state.performance.lastDropCount = 0;
  state.performance.lastStatus = '';
}

function observePerformanceHealth(now, targetFps) {
  if (!state.recording || state.paused || !usesSmartCanvasRecording(state.recordingSettings || getSettings())) {
    return;
  }

  const fpsRatio = targetFps > 0 ? state.health.fps / targetFps : 1;
  const newDrops = state.health.droppedFrames - state.performance.lastDropCount;
  const overloaded = fpsRatio < 0.68 || newDrops >= 3;
  const canAdapt = now - state.performance.lastAdaptAt > 3500;
  if (!overloaded || !canAdapt || state.performance.adaptiveLevel >= performanceDemotionOrder.length - 1) {
    state.performance.lastDropCount = state.health.droppedFrames;
    return;
  }

  state.performance.adaptiveLevel += 1;
  state.performance.lastAdaptAt = now;
  state.performance.lastDropCount = state.health.droppedFrames;
  state.performance.lastStatus = `adaptive level ${state.performance.adaptiveLevel}`;
  setStatus(`Optimizing recording load (${performanceProfile(state.recordingSettings || getSettings()).label})`);
}

function syncControls() {
  elements.startRecording.disabled = state.recording || !state.selectedSource;
  elements.pauseRecording.disabled = !state.recording || !state.mediaRecorder;
  elements.pauseRecording.textContent = state.paused ? 'Resume' : 'Pause';
  elements.pauseRecording.classList.toggle('active', state.paused);
  elements.dropMarker.disabled = !state.recording;
  elements.captureSnapshot.disabled = !state.selectedSource && !state.recording;
  elements.stopRecording.disabled = !state.recording;
  elements.cancelRecording.disabled = !state.recording;
  elements.refreshSources.disabled = state.recording;
  elements.chooseOutputFolder.disabled = state.recording;
  if (elements.installTelemetryAdapter) {
    elements.installTelemetryAdapter.disabled = state.recording || !canInstallTelemetryAdapter();
  }
  if (elements.refreshTelemetryAdapter) {
    elements.refreshTelemetryAdapter.disabled = state.recording;
  }
  elements.micMute.disabled = !elements.microphone.checked || !state.micStream;
  elements.micMute.textContent = state.micMuted ? 'Unmute' : 'Mute';
  elements.micMute.classList.toggle('active', state.micMuted);
  const settings = state.recordingSettings || getSettings();
  if (!usesSmartEffectsOutput(settings) && settings.outputLayout !== 'landscape') {
    elements.outputLayout.value = 'landscape';
    settings.outputLayout = 'landscape';
  }

  elements.quality.disabled = state.recording;
  elements.outputLayout.disabled = state.recording || !usesSmartEffectsOutput(settings);
  elements.fps.disabled = state.recording;
  elements.smoothRecording.disabled = state.recording;
  elements.recordingEngine.disabled = state.recording;
  elements.micDevice.disabled = state.recording;
  elements.noiseGateThreshold.disabled = !elements.noiseGate.checked;
  elements.cameraDevice.disabled = state.recording;
  elements.refreshDevices.disabled = state.recording;
  elements.titleDuration.disabled = !elements.smartMaster.checked || !elements.titleOverlay.checked;
  elements.cuePosition.disabled = !elements.smartMaster.checked || !elements.cueOverlay.checked;
  elements.focusLock.disabled = !elements.smartMaster.checked || !elements.autoZoom.checked || elements.focusMode.value === 'wide';
  elements.clearFocusLock.disabled = !state.focusLock.active;
  elements.revealRecording.disabled = !state.lastRecordingPath;
  elements.revealProject.disabled = !state.lastSmartProjectPath;

  for (const input of document.querySelectorAll('.toggle-grid input')) {
    input.disabled = !elements.smartMaster.checked;
  }

  const effectiveFps = effectiveRecordingFps(settings);
  const previewFps = effectiveDrawFps(settings);
  if (previewFps !== effectiveFps) {
    elements.fpsValue.textContent = `${effectiveFps} fps (${previewFps} preview)`;
  } else {
    elements.fpsValue.textContent = effectiveFps === settings.fps
      ? `${settings.fps} fps`
      : `${settings.fps} fps (${effectiveFps} effective)`;
  }
  elements.performanceMode.disabled = state.recording || !settings.smoothRecording;
  if (elements.performanceProfile) {
    elements.performanceProfile.textContent = performanceSummaryLabel(settings);
  }
  elements.micGainValue.textContent = `${Math.round(Number(elements.micGain.value) * 100)}%`;
  elements.noiseGateThresholdValue.textContent = `${Math.round(Number(elements.noiseGateThreshold.value) * 100)}%`;
  elements.zoomStrengthValue.textContent = `${Number(elements.zoomStrength.value).toFixed(1)}x`;
  elements.motionSensitivityValue.textContent = elements.motionSensitivity.value;
  elements.smoothingValue.textContent = `${Math.round(Number(elements.smoothing.value) * 100)}%`;
  elements.privacyStrengthValue.textContent = `${elements.privacyStrength.value}px`;
  elements.outputFolder.textContent = state.outputDir || 'Default Videos folder';
  syncCanvasOutputSize();
  renderFocusStatus();

  if (!state.micStream) {
    resetMicMeter(elements.microphone.checked ? (state.micMuted ? 'Muted' : 'Mic armed') : 'Mic off');
  }
}

function renderFocusStatus() {
  if (elements.focusMode.value === 'wide') {
    elements.focusStatus.textContent = 'Holding wide shot';
  } else if (state.focusLock.active) {
    elements.focusStatus.textContent = `Locked ${Math.round(state.focusLock.x * 100)}%, ${Math.round(state.focusLock.y * 100)}%`;
  } else if (elements.focusMode.value === 'director') {
    const active = state.attention.active || {};
    const label = active.source === 'wide'
      ? 'wide'
      : active.reason || active.source || 'intent';
    const confidence = Math.round((active.confidence || 0) * 100);
    elements.focusStatus.textContent = `Director ${label} ${confidence}%`;
  } else if (elements.focusMode.value === 'motion') {
    const age = performance.now() - state.motionTarget.lastSeenAt;
    elements.focusStatus.textContent = age < 1200
      ? `Motion ${Math.round(state.motionTarget.x * 100)}%, ${Math.round(state.motionTarget.y * 100)}%`
      : 'Watching for motion';
  } else if (elements.focusMode.value === 'click-lock') {
    elements.focusStatus.textContent = 'Preview click arms focus';
  } else {
    elements.focusStatus.textContent = 'Following cursor';
  }
}

function setFocusLock(x = state.pointer.x, y = state.pointer.y) {
  const settings = getSettings();
  if (!settings.smartMaster || !settings.autoZoom || settings.focusMode === 'wide') {
    return;
  }

  state.focusLock = {
    active: true,
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y))
  };
  setStatus('Focus locked');
  syncControls();
}

function clearFocusLock() {
  state.focusLock.active = false;
  setStatus('Focus released');
  syncControls();
}

function toggleFocusLock() {
  if (state.focusLock.active) {
    clearFocusLock();
  } else {
    setFocusLock();
  }
}

function resetMicMeter(label = 'Mic off') {
  elements.micLevelBar.style.width = '0%';
  elements.micLevelText.textContent = label;
}

function createNoiseGateNode(audioContext) {
  const node = audioContext.createScriptProcessor(1024, 1, 1);
  let gateLevel = 1;

  node.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);
    const settings = getSettings();
    let sum = 0;

    for (const sample of input) {
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / input.length);
    const target = settings.noiseGate && rms < settings.noiseGateThreshold ? 0.08 : 1;
    gateLevel += (target - gateLevel) * 0.18;

    for (let index = 0; index < input.length; index += 1) {
      output[index] = input[index] * gateLevel;
    }
  };

  return node;
}

function applyMicSettings() {
  if (state.micGainNode) {
    state.micGainNode.gain.value = state.micMuted ? 0 : Number(elements.micGain.value);
  }

  if (state.micInputStream) {
    for (const track of state.micInputStream.getAudioTracks()) {
      track.enabled = true;
    }
  }
}

function startMicMeter() {
  stopMicMeter();

  if (!state.micAnalyser) {
    resetMicMeter(state.micMuted ? 'Muted' : 'Mic live');
    return;
  }

  const samples = new Uint8Array(state.micAnalyser.fftSize);
  const tick = () => {
    state.micAnalyser.getByteTimeDomainData(samples);

    let sum = 0;
    for (const sample of samples) {
      const centered = (sample - 128) / 128;
      sum += centered * centered;
    }

    const rms = Math.sqrt(sum / samples.length);
    const level = state.micMuted ? 0 : Math.min(1, rms * 5.4);
    elements.micLevelBar.style.width = `${Math.round(level * 100)}%`;
    elements.micLevelText.textContent = state.micMuted
      ? 'Muted'
      : `${Math.round(level * 100)}% signal`;

    state.micMeterId = requestAnimationFrame(tick);
  };

  state.micMeterId = requestAnimationFrame(tick);
}

function stopMicMeter() {
  if (state.micMeterId) {
    cancelAnimationFrame(state.micMeterId);
    state.micMeterId = null;
  }
}

function toggleMicMute() {
  if (!elements.microphone.checked) {
    return;
  }

  state.micMuted = !state.micMuted;
  applyMicSettings();
  resetMicMeter(state.micMuted ? 'Muted' : state.micStream ? 'Mic live' : 'Mic armed');
  syncControls();
}

function pushRecordingMarker({ kind = 'manual', label, reason = null, x = state.pointer.x, y = state.pointer.y } = {}) {
  if (!state.recording) {
    return null;
  }

  const marker = {
    label: label || `Marker ${state.markers.length + 1}`,
    kind,
    atMs: recordingElapsedMs(),
    x: Math.round(Math.min(1, Math.max(0, x)) * 1000) / 1000,
    y: Math.round(Math.min(1, Math.max(0, y)) * 1000) / 1000,
    createdAt: new Date().toISOString()
  };

  if (reason) {
    marker.reason = reason;
  }

  state.markers.push(marker);
  state.activeMarker = {
    ...marker,
    startedAt: performance.now()
  };
  recordClickTelemetry(kind === 'manual' ? 'marker' : 'smart-marker', marker.x, marker.y, kind === 'manual' ? 0.76 : 0.82, reason || marker.label || kind);
  return marker;
}

function recordSmartMoment(settings, reason, x = state.pointer.x, y = state.pointer.y) {
  if (!settings.smartMaster || !settings.autoMarkers || !state.recording || state.paused) {
    return;
  }

  const atMs = recordingElapsedMs();
  if (atMs - state.lastAutoMarkerAt < 3200) {
    return;
  }

  const momentCount = state.markers.filter((marker) => marker.kind === 'smart-moment').length + 1;
  const marker = pushRecordingMarker({
    kind: 'smart-moment',
    label: `Moment ${momentCount}`,
    reason,
    x,
    y
  });

  if (marker) {
    state.lastAutoMarkerAt = marker.atMs;
    setStatus(`${marker.label} captured`);
  }
}

function pushSmartPulse(x = state.pointer.x, y = state.pointer.y) {
  const atMs = state.recording ? recordingElapsedMs() : 0;
  if (state.recording && !state.paused && atMs - state.lastPulseAt < 260) {
    return;
  }

  if (state.recording && !state.paused) {
    state.lastPulseAt = atMs;
  }

  state.pulse = {
    active: true,
    startedAt: performance.now(),
    x,
    y
  };

  if (state.recording && !state.paused && usesHybridSmartRender(state.recordingSettings || getSettings())) {
    boundedPush(state.smartPulses, {
      atMs: recordingElapsedMs(),
      x,
      y
    }, performanceProfile(state.recordingSettings || getSettings()).maxPulseSamples);
  }

  recordClickTelemetry('pulse', x, y, 0.92, 'click pulse');
}

async function chooseOutputFolder() {
  const folder = await window.smartie.chooseOutputDir();
  if (!folder) {
    return;
  }

  state.outputDir = folder;
  saveSettings();
  syncControls();
}

async function hydrateOutputFolder() {
  if (!state.outputDir) {
    state.outputDir = await window.smartie.getDefaultOutputDir();
  }

  syncControls();
}

async function refreshMediaDevices({ quiet = false } = {}) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    elements.micDevice.disabled = true;
    elements.cameraDevice.disabled = true;
    elements.refreshDevices.disabled = true;
    if (!quiet) {
      setStatus('Device list unavailable');
    }
    return;
  }

  const currentMic = elements.micDevice.value || state.preferredMicDevice;
  const currentCamera = elements.cameraDevice.value || state.preferredCameraDevice;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const microphones = uniqueDevices(devices.filter((device) => device.kind === 'audioinput'));
  const cameras = uniqueDevices(devices.filter((device) => device.kind === 'videoinput'));

  renderDeviceSelect(elements.micDevice, microphones, currentMic, 'Default microphone', 'Microphone');
  renderDeviceSelect(elements.cameraDevice, cameras, currentCamera, 'Default camera', 'Camera');
  state.preferredMicDevice = elements.micDevice.value;
  state.preferredCameraDevice = elements.cameraDevice.value;
  syncControls();

  if (!quiet) {
    setStatus('Devices refreshed');
  }
}

async function hideWindowForRecording(settings) {
  if (!settings.hideWhileRecording) {
    return;
  }

  state.windowHiddenForRecording = true;
  await window.smartie.setWindowHidden(true);
  await new Promise((resolve) => {
    window.setTimeout(resolve, 320);
  });
}

async function restoreRecordingWindow() {
  if (!state.windowHiddenForRecording) {
    return;
  }

  state.windowHiddenForRecording = false;
  await window.smartie.setWindowHidden(false);
}

function selectSource(source) {
  state.selectedSource = source;
  state.lastSourceId = source.id;

  for (const card of elements.sourceList.querySelectorAll('.source-card')) {
    card.classList.toggle('selected', card.dataset.sourceId === source.id);
  }

  setStatus(`Armed: ${source.name}`);
  saveSettings();
  syncControls();
}

function renderSources() {
  elements.sourceList.textContent = '';
  elements.sourceCount.textContent = String(state.sources.length);

  for (const source of state.sources) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'source-card';
    card.dataset.sourceId = source.id;

    const image = document.createElement('img');
    image.alt = '';
    image.src = source.thumbnail || '';

    const label = document.createElement('strong');
    label.textContent = source.name;

    card.append(image, label);
    card.addEventListener('click', () => selectSource(source));
    elements.sourceList.append(card);
  }

  const rememberedSource = state.sources.find((source) => source.id === state.lastSourceId);
  const stillAvailableSource = state.sources.find((source) => state.selectedSource && source.id === state.selectedSource.id);

  if (rememberedSource) {
    selectSource(rememberedSource);
  } else if (stillAvailableSource) {
    selectSource(stillAvailableSource);
  } else if (!state.selectedSource && state.sources.length > 0) {
    selectSource(state.sources[0]);
  }
}

async function refreshSources() {
  setStatus('Scanning sources');
  const payload = await window.smartie.listSources();
  state.sources = payload.sources;
  state.displays = payload.displays;
  renderSources();
  setStatus(state.selectedSource ? `Armed: ${state.selectedSource.name}` : 'No sources found');
}

function selectedDisplay() {
  if (!state.selectedSource) {
    return state.displays[0];
  }

  const exact = state.displays.find((display) => String(display.id) === String(state.selectedSource.displayId));
  if (exact) {
    return exact;
  }

  const screenMatch = /^screen:(\d+)/.exec(state.selectedSource.id);
  if (screenMatch) {
    return state.displays[Number(screenMatch[1])] || state.displays[0];
  }

  return state.displays[0];
}

function recordCursorTelemetry(x, y, velocity, atMs, pointerPayload) {
  if (!state.recording || state.paused) {
    return;
  }

  const settings = state.recordingSettings || getSettings();
  const profile = performanceProfile(settings);
  const elapsedSinceSample = atMs - state.telemetry.lastCursorSampleAt;
  const movedEnough = velocity > 0.0018;
  const sampleMs = movedEnough ? profile.cursorSampleMs : profile.cursorStillSampleMs;
  if (elapsedSinceSample < sampleMs) {
    return;
  }

  state.telemetry.lastCursorSampleAt = atMs;
  boundedPush(state.telemetry.cursor, {
    time: roundTo(atMs / 1000, 3),
    time_ms: Math.round(atMs),
    x: roundTo(x, 5),
    y: roundTo(y, 5),
    screen_x: Math.round(pointerPayload.point.x),
    screen_y: Math.round(pointerPayload.point.y),
    velocity: roundTo(velocity, 5),
    provider: pointerPayload.provider || pointerPayload.native?.provider || 'electron-screen',
    precision: pointerPayload.precision || pointerPayload.native?.precision || null,
    native_quality: state.telemetry.nativeQuality?.tier || null
  }, profile.maxCursorSamples);
}

function recordClickTelemetry(kind, x = state.pointer.x, y = state.pointer.y, confidence = 0.88, reason = kind) {
  if (!state.recording || state.paused) {
    return;
  }

  const atMs = recordingElapsedMs();
  boundedPush(state.telemetry.clicks, {
    time: roundTo(atMs / 1000, 3),
    time_ms: Math.round(atMs),
    x: roundTo(clamp01(x), 5),
    y: roundTo(clamp01(y), 5),
    type: kind,
    confidence: roundTo(clamp01(confidence), 3),
    reason
  }, performanceProfile(state.recordingSettings || getSettings()).maxPulseSamples);
}

function recordMotionTelemetry() {
  if (!state.recording || state.paused) {
    return;
  }

  const atMs = recordingElapsedMs();
  const profile = performanceProfile(state.recordingSettings || getSettings());
  if (atMs - state.telemetry.lastMotionSampleAt < profile.motionScanMs || state.motionTarget.strength < 0.015) {
    return;
  }

  state.telemetry.lastMotionSampleAt = atMs;
  boundedPush(state.telemetry.motion, {
    time: roundTo(atMs / 1000, 3),
    time_ms: Math.round(atMs),
    x: roundTo(clamp01(state.motionTarget.x), 5),
    y: roundTo(clamp01(state.motionTarget.y), 5),
    strength: roundTo(clamp01(state.motionTarget.strength), 3)
  }, profile.maxMotionEvents);
}

function nativeTelemetryQualityFromSnapshot(snapshot) {
  const quality = snapshot && typeof snapshot.quality === 'object' ? snapshot.quality : {};
  return {
    tier: quality.tier || 'unavailable',
    score: roundTo(clamp01(finiteNumber(quality.score, 0)), 3),
    native: Boolean(quality.native),
    perfectCandidate: Boolean(quality.perfectCandidate),
    reason: quality.reason || null
  };
}

function nativeTelemetryPointerPayload(snapshot) {
  const pointer = snapshot?.pointer || {};
  const point = pointer.point || {};
  const x = finiteNumber(point.x, null);
  const y = finiteNumber(point.y, null);
  if (x === null || y === null) {
    return null;
  }

  const payload = {
    provider: pointer.provider || null,
    precision: pointer.precision || null,
    screen_x: Math.round(x),
    screen_y: Math.round(y)
  };
  const display = selectedDisplay();
  if (display?.bounds?.width > 0 && display?.bounds?.height > 0) {
    payload.x = roundTo(clamp01((x - display.bounds.x) / display.bounds.width), 5);
    payload.y = roundTo(clamp01((y - display.bounds.y) / display.bounds.height), 5);
  }

  return payload;
}

function nativeTelemetryWindowPayload(snapshot) {
  const activeWindow = snapshot?.activeWindow || {};
  if (!activeWindow || activeWindow.available === false) {
    return {
      available: false,
      provider: activeWindow.provider || null,
      error: activeWindow.error || null
    };
  }

  return {
    available: true,
    provider: activeWindow.provider || null,
    title: activeWindow.title || null,
    pid: activeWindow.pid || null,
    app_id: activeWindow.app_id || null,
    role: activeWindow.role || null,
    label: activeWindow.label || null,
    bounds: activeWindow.bounds || null
  };
}

function recordNativeTelemetrySnapshot(snapshot) {
  if (!state.recording || state.paused || !snapshot) {
    return;
  }

  const atMs = recordingElapsedMs();
  const settings = state.recordingSettings || getSettings();
  const profile = performanceProfile(settings);
  const quality = nativeTelemetryQualityFromSnapshot(snapshot);
  state.telemetry.nativeQuality = quality;

  const baseEvent = {
    time: roundTo(atMs / 1000, 3),
    time_ms: Math.round(atMs),
    captured_at: snapshot.captured_at || new Date().toISOString(),
    type: 'snapshot',
    provider: snapshot.pointer?.provider || snapshot.activeWindow?.provider || quality.tier,
    quality,
    session_type: snapshot.session_type || null,
    desktop: snapshot.desktop || null,
    pointer: nativeTelemetryPointerPayload(snapshot),
    active_window: nativeTelemetryWindowPayload(snapshot),
    adapters: Array.isArray(snapshot.adapters)
      ? snapshot.adapters
          .filter((adapter) => adapter.active || adapter.available)
          .map((adapter) => ({
            id: adapter.id,
            active: Boolean(adapter.active),
            available: Boolean(adapter.available),
            reason: adapter.reason || null
          }))
      : []
  };

  boundedPush(state.telemetry.native, baseEvent, profile.maxNativeEvents);

  const helperEvents = Array.isArray(snapshot.events) ? snapshot.events : [];
  for (const event of helperEvents.slice(0, 80)) {
    const enriched = {
      ...event,
      time: roundTo(atMs / 1000, 3),
      time_ms: Math.round(atMs),
      quality,
      helper_event: true
    };
    if ((event.type === 'pointer' || event.type === 'cursor') && Number.isFinite(finiteNumber(event.screen_x, NaN)) && Number.isFinite(finiteNumber(event.screen_y, NaN))) {
      const display = selectedDisplay();
      enriched.pointer = {
        provider: event.provider || 'native-helper',
        precision: event.precision || 'compositor-global',
        screen_x: Math.round(finiteNumber(event.screen_x, 0)),
        screen_y: Math.round(finiteNumber(event.screen_y, 0))
      };
      if (display?.bounds?.width > 0 && display?.bounds?.height > 0) {
        enriched.pointer.x = roundTo(clamp01((enriched.pointer.screen_x - display.bounds.x) / display.bounds.width), 5);
        enriched.pointer.y = roundTo(clamp01((enriched.pointer.screen_y - display.bounds.y) / display.bounds.height), 5);
      }
    }
    boundedPush(state.telemetry.native, {
      ...enriched
    }, profile.maxNativeEvents);
  }
}

function shouldCollectVisualAttention(settings) {
  return state.recording
    && usesHybridSmartRender(settings)
    && settings.smartMaster
    && settings.autoZoom
    && (settings.focusMode === 'director' || settings.focusMode === 'motion');
}

function mapPointerToCapture(pointerPayload) {
  const display = selectedDisplay();
  if (!display || !video.videoWidth || !video.videoHeight) {
    return;
  }

  const bounds = display.bounds;
  const relativeX = (pointerPayload.point.x - bounds.x) / bounds.width;
  const relativeY = (pointerPayload.point.y - bounds.y) / bounds.height;
  const x = Math.min(1, Math.max(0, relativeX));
  const y = Math.min(1, Math.max(0, relativeY));
  const dx = x - state.pointer.x;
  const dy = y - state.pointer.y;
  const velocity = Math.hypot(dx, dy);
  const settings = getSettings();

  state.pointer.previousX = state.pointer.x;
  state.pointer.previousY = state.pointer.y;
  state.pointer.screenX = pointerPayload.point.x;
  state.pointer.screenY = pointerPayload.point.y;
  state.pointer.x = x;
  state.pointer.y = y;
  state.pointer.velocity = velocity;
  recordCursorTelemetry(x, y, velocity, recordingElapsedMs(), pointerPayload);

  if (velocity > 0.002) {
    state.pointer.lastMovedAt = performance.now();
    const atMs = state.recording ? recordingElapsedMs() : 0;
    state.trail.push({
      x,
      y,
      at: performance.now(),
      atMs
    });
    if (state.recording && !state.paused && usesHybridSmartRender(state.recordingSettings || settings)) {
      boundedPush(state.smartTrail, { x, y, atMs }, performanceProfile(state.recordingSettings || settings).maxTrailSamples);
    }
    state.trail = state.trail.slice(lowLatencyMode(settings) ? -12 : -Math.min(28, performanceProfile(settings).maxTrailSamples));
  }

  if (velocity > 0.055 && settings.clickPulse) {
    pushSmartPulse(x, y);
  }

  if (velocity > 0.072) {
    recordSmartMoment(settings, 'pointer emphasis', x, y);
  }
}

function scanMotionTarget(settings, timestamp) {
  const motionAwareMode = settings.focusMode === 'motion' || settings.focusMode === 'director';
  const collectVisualFallback = shouldCollectVisualAttention(settings);
  const shouldScan = settings.smartMaster
    && settings.autoZoom
    && (settings.motionFocus || collectVisualFallback)
    && motionAwareMode
    && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

  const scanInterval = performanceProfile(settings).motionScanMs;
  if (!shouldScan || timestamp - state.motionTarget.lastScanAt < scanInterval) {
    return;
  }

  state.motionTarget.lastScanAt = timestamp;
  const profile = performanceProfile(settings);
  if (motionCanvas.width !== profile.motionWidth || motionCanvas.height !== profile.motionHeight) {
    motionCanvas.width = profile.motionWidth;
    motionCanvas.height = profile.motionHeight;
    state.motionTarget.previousFrame = null;
  }
  motionCtx.drawImage(video, 0, 0, motionCanvas.width, motionCanvas.height);
  const frame = motionCtx.getImageData(0, 0, motionCanvas.width, motionCanvas.height).data;

  if (!state.motionTarget.previousFrame) {
    state.motionTarget.previousFrame = new Uint8ClampedArray(frame);
    return;
  }

  const threshold = settings.motionSensitivity;
  let weight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 0; y < motionCanvas.height; y += 1) {
    for (let x = 0; x < motionCanvas.width; x += 1) {
      const index = (y * motionCanvas.width + x) * 4;
      const current = (frame[index] + frame[index + 1] + frame[index + 2]) / 3;
      const previous = (
        state.motionTarget.previousFrame[index]
        + state.motionTarget.previousFrame[index + 1]
        + state.motionTarget.previousFrame[index + 2]
      ) / 3;
      const diff = Math.abs(current - previous);

      if (diff > threshold) {
        const contribution = diff - threshold;
        weight += contribution;
        weightedX += (x + 0.5) * contribution;
        weightedY += (y + 0.5) * contribution;
      }
    }
  }

  state.motionTarget.previousFrame.set(frame);

  if (weight < 260) {
    state.motionTarget.strength *= 0.82;
    return;
  }

  state.motionTarget.x = weightedX / weight / motionCanvas.width;
  state.motionTarget.y = weightedY / weight / motionCanvas.height;
  state.motionTarget.strength = Math.min(1, weight / 28000);
  state.motionTarget.lastSeenAt = timestamp;
  recordMotionTelemetry();
}

function startPointerPolling() {
  stopPointerPolling();
  const profile = performanceProfile(state.recordingSettings || getSettings());
  state.pointerPollId = window.setInterval(async () => {
    try {
      const payload = await window.smartie.getPointer();
      state.displays = payload.displays;
      mapPointerToCapture(payload);
    } catch (error) {
      console.error(error);
    }
  }, profile.pointerPollMs);
}

function stopPointerPolling() {
  if (state.pointerPollId) {
    window.clearInterval(state.pointerPollId);
    state.pointerPollId = null;
  }
}

async function startNativeTelemetrySession(settings) {
  if (typeof window.smartie.startNativeTelemetry !== 'function') {
    return;
  }

  try {
    const session = await window.smartie.startNativeTelemetry({
      source: state.selectedSource
        ? {
            id: state.selectedSource.id,
            name: state.selectedSource.name,
            displayId: state.selectedSource.displayId
          }
        : null,
      settings: {
        focusMode: settings.focusMode,
        recordingEngine: settings.recordingEngine,
        outputLayout: outputLayoutForRecording(settings)
      },
      capabilities: ['pointer', 'window', 'accessibility', 'keyboard', 'clicks', 'cursor-metadata']
    });
    state.telemetry.nativeSession = session;
  } catch (error) {
    console.warn('Could not start Smartie native telemetry session.', error);
    state.telemetry.nativeSession = {
      error: error.message || 'native telemetry unavailable'
    };
  }
}

async function stopNativeTelemetrySession() {
  if (typeof window.smartie.stopNativeTelemetry !== 'function') {
    return;
  }

  try {
    await window.smartie.stopNativeTelemetry();
  } catch (error) {
    console.warn('Could not stop Smartie native telemetry session.', error);
  }
}

function startSemanticPolling() {
  stopSemanticPolling();
  const settings = state.recordingSettings || getSettings();
  const profile = performanceProfile(settings);
  const capture = async () => {
    if (!state.recording || state.paused || typeof window.smartie.getSemanticContext !== 'function') {
      return;
    }

    try {
      const payload = await window.smartie.getSemanticContext();
      if (payload.nativeTelemetry) {
        recordNativeTelemetrySnapshot(payload.nativeTelemetry);
      }
      const nativeWindow = payload.nativeTelemetry?.activeWindow || {};
      const activeWindow = nativeWindow.available ? nativeWindow : (payload.activeWindow || {});
      const title = activeWindow.title || '';
      const shouldRecord = title !== state.telemetry.lastAccessibilityTitle || state.telemetry.accessibility.length === 0;
      if (!activeWindow.available && state.telemetry.accessibility.length > 0) {
        return;
      }
      if (!shouldRecord && activeWindow.available) {
        return;
      }

      state.telemetry.lastAccessibilityTitle = title;
      const atMs = recordingElapsedMs();
      boundedPush(state.telemetry.accessibility, {
        time: roundTo(atMs / 1000, 3),
        time_ms: Math.round(atMs),
        provider: activeWindow.provider || null,
        available: Boolean(activeWindow.available),
        title,
        pid: activeWindow.pid || null,
        app_id: activeWindow.app_id || null,
        role: activeWindow.role || null,
        label: activeWindow.label || null,
        bounds: activeWindow.bounds || null,
        session_type: activeWindow.sessionType || null,
        error: activeWindow.error || null,
        native_quality: state.telemetry.nativeQuality,
        selected_source: state.selectedSource
          ? {
              id: state.selectedSource.id,
              name: state.selectedSource.name,
              displayId: state.selectedSource.displayId
            }
          : null
      }, profile.maxAccessibilityEvents);
    } catch (error) {
      console.warn('Could not capture semantic context.', error);
    }
  };

  capture();
  state.semanticPollId = window.setInterval(capture, profile.semanticPollMs);
}

function stopSemanticPolling() {
  if (state.semanticPollId) {
    window.clearInterval(state.semanticPollId);
    state.semanticPollId = null;
  }
}

function captureSmartTimelineFrame(settings = state.recordingSettings || getSettings()) {
  if (!state.recording || state.paused || !usesHybridSmartRender(settings)) {
    return;
  }

  const timestamp = performance.now();
  scanMotionTarget(settings, timestamp);
  easeFrame(settings);
  const attention = state.attention.active || {};
  boundedPush(state.smartTimeline, {
    atMs: recordingElapsedMs(),
    frame: {
      scale: state.frame.scale,
      x: state.frame.x,
      y: state.frame.y
    },
    attention: {
      source: attention.source || 'attention',
      reason: attention.reason || attention.source || 'attention',
      x: clamp01(finiteNumber(attention.x, state.frame.x)),
      y: clamp01(finiteNumber(attention.y, state.frame.y)),
      scale: Math.max(1, finiteNumber(attention.scale, state.frame.scale)),
      score: clamp01(finiteNumber(attention.score, 0.5)),
      confidence: clamp01(finiteNumber(attention.confidence, attention.score || 0.5))
    },
    pointer: {
      x: state.pointer.x,
      y: state.pointer.y
    },
    keys: state.keys.slice(-4)
  }, performanceProfile(settings).maxTimelineSamples);
}

function startSmartTimeline(settings) {
  stopSmartTimeline();
  if (!usesHybridSmartRender(settings)) {
    return;
  }

  captureSmartTimelineFrame(settings);
  const sampleFps = Math.min(performanceProfile(settings).smartTimelineFps, Math.max(6, effectiveRecordingFps(settings)));
  state.smartTimelineId = window.setInterval(() => {
    captureSmartTimelineFrame(settings);
  }, Math.round(1000 / sampleFps));
}

function stopSmartTimeline() {
  if (state.smartTimelineId) {
    window.clearInterval(state.smartTimelineId);
    state.smartTimelineId = null;
  }
}

function resizeCanvasForProfile(settings = getSettings()) {
  const size = canvasSizeForSettings(settings);
  const changed = canvas.width !== size.width || canvas.height !== size.height;
  if (changed) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  return changed;
}

function captureSizeForSettings(settings = getSettings()) {
  if (usesSmartCanvasRecording(settings)) {
    const renderSize = canvasSizeForSettings(settings);
    return {
      width: Math.max(640, renderSize.width),
      height: Math.max(480, renderSize.height)
    };
  }

  const profile = qualityProfiles[settings.quality] || qualityProfiles.balanced;
  return capCanvasSize({
    width: profile.width,
    height: profile.height
  }, performanceCaptureShortSide(settings));
}

function syncCanvasOutputSize() {
  if (state.recording) {
    return;
  }

  if (resizeCanvasForProfile()) {
    drawWaitingFrame();
  }
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const canvasAspect = canvas.width / canvas.height;
  const elementAspect = rect.width / rect.height;
  let renderedWidth = rect.width;
  let renderedHeight = rect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (elementAspect > canvasAspect) {
    renderedWidth = rect.height * canvasAspect;
    offsetX = (rect.width - renderedWidth) / 2;
  } else if (elementAspect < canvasAspect) {
    renderedHeight = rect.width / canvasAspect;
    offsetY = (rect.height - renderedHeight) / 2;
  }

  const x = (event.clientX - rect.left - offsetX) / renderedWidth;
  const y = (event.clientY - rect.top - offsetY) / renderedHeight;

  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return null;
  }

  return { x, y };
}

function drawWaitingFrame() {
  ctx.fillStyle = '#07080a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f4f1ea';
  ctx.font = '700 42px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Smartie', canvas.width / 2, canvas.height / 2 - 12);
  ctx.fillStyle = '#a9b0ba';
  ctx.font = '400 22px system-ui, sans-serif';
  ctx.fillText('Select a source to start recording.', canvas.width / 2, canvas.height / 2 + 32);
}

function createRecordingCanvasStream(settings) {
  const effectiveFps = effectiveRecordingFps(settings);
  let stream = canvas.captureStream(settings.smoothRecording ? 0 : effectiveFps);
  let [videoTrack] = stream.getVideoTracks();

  if (settings.smoothRecording && (!videoTrack || typeof videoTrack.requestFrame !== 'function')) {
    stopStream(stream);
    stream = canvas.captureStream(effectiveFps);
    [videoTrack] = stream.getVideoTracks();
  }

  state.canvasVideoTrack = videoTrack || null;
  tuneScreenVideoTrack(state.canvasVideoTrack);
  return stream;
}

function createNativeRecordingStream() {
  const stream = new MediaStream();
  const [videoTrack] = state.captureStream ? state.captureStream.getVideoTracks() : [];
  if (videoTrack) {
    tuneScreenVideoTrack(videoTrack);
    stream.addTrack(videoTrack);
  }

  state.canvasVideoTrack = null;
  return stream;
}

function requestRecordingFrame() {
  if (state.canvasVideoTrack && typeof state.canvasVideoTrack.requestFrame === 'function') {
    state.canvasVideoTrack.requestFrame();
  }
}

function tuneScreenVideoTrack(track) {
  if (!track) {
    return;
  }

  try {
    track.contentHint = 'detail';
  } catch (error) {
    console.warn('Could not apply screen content hint.', error);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function normalizedDistance(a, b) {
  return Math.hypot((a.x || 0.5) - (b.x || 0.5), (a.y || 0.5) - (b.y || 0.5));
}

function resetAttentionEngine() {
  const now = performance.now();
  state.attention = {
    active: {
      source: 'wide',
      reason: 'wide',
      x: 0.5,
      y: 0.5,
      scale: 1,
      score: 1,
      confidence: 0,
      selectedAt: now,
      lastUpdatedAt: now
    }
  };
}

function attentionScale(settings, confidence, bonus = 0) {
  const effectiveConfidence = clamp01(confidence);
  const base = 1 + (settings.zoomStrength - 1) * (0.62 + effectiveConfidence * 0.38);
  return clamp(base + bonus, 1, Math.max(1.05, settings.zoomStrength + 0.34));
}

function pointerIntentPoint() {
  const dx = state.pointer.x - state.pointer.previousX;
  const dy = state.pointer.y - state.pointer.previousY;
  const lead = clamp(state.pointer.velocity * 2.6, 0, 0.18);
  return {
    x: clamp(state.pointer.x + dx * (1.1 + lead * 4), 0.02, 0.98),
    y: clamp(state.pointer.y + dy * (1.1 + lead * 4), 0.02, 0.98)
  };
}

function attentionCandidate({ source, reason, x, y, score, confidence = score, scale, selectedAt = performance.now() }) {
  return {
    source,
    reason,
    x: clamp(x, 0, 1),
    y: clamp(y, 0, 1),
    scale,
    score,
    confidence: clamp01(confidence),
    selectedAt,
    lastUpdatedAt: performance.now()
  };
}

function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight, scale) {
  const baseScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) * scale;
  const drawWidth = sourceWidth * baseScale;
  const drawHeight = sourceHeight * baseScale;
  return { drawWidth, drawHeight };
}

function buildAttentionCandidates(settings, now = performance.now()) {
  const candidates = [];
  const idleFor = now - state.pointer.lastMovedAt;
  const hasSmartZoom = settings.smartMaster && settings.autoZoom;
  const forcedWide = settings.focusMode === 'wide';
  const wideCandidate = (score = 1, reason = 'wide') => attentionCandidate({
    source: 'wide',
    reason,
    x: 0.5,
    y: 0.5,
    scale: 1,
    score,
    confidence: 0,
    selectedAt: now
  });

  if (!hasSmartZoom || forcedWide) {
    return [wideCandidate(2, forcedWide ? 'forced wide' : 'smart off')];
  }

  if (state.focusLock.active) {
    candidates.push(attentionCandidate({
      source: 'lock',
      reason: 'locked focus',
      x: state.focusLock.x,
      y: state.focusLock.y,
      scale: clamp(settings.zoomStrength + 0.08, 1, settings.zoomStrength + 0.34),
      score: 2,
      confidence: 1,
      selectedAt: now
    }));
    return candidates;
  }

  const directorMode = settings.focusMode === 'director';
  const pointerMode = directorMode || settings.focusMode === 'cursor' || settings.focusMode === 'click-lock';
  const motionMode = directorMode || settings.focusMode === 'motion';
  const movingConfidence = clamp01((state.pointer.velocity - 0.0015) / 0.022);
  const recentPointer = clamp01((1650 - idleFor) / 1650);
  const dwellConfidence = clamp01((idleFor - 120) / 1000);
  const emphasisConfidence = state.pulse.active
    ? clamp01(1 - (now - state.pulse.startedAt) / 720)
    : 0;

  if (pointerMode) {
    const point = pointerIntentPoint();
    const baseScore = settings.focusMode === 'click-lock' ? 0.28 : directorMode ? 0.46 : 0.58;
    let score = baseScore + recentPointer * 0.28 + movingConfidence * 0.26 + dwellConfidence * 0.16;
    if (settings.idleWide && idleFor > 1850 && emphasisConfidence === 0 && !directorMode) {
      score *= 0.46;
    }

    const confidence = clamp01(score);
    candidates.push(attentionCandidate({
      source: 'pointer',
      reason: movingConfidence > 0.34 ? 'cursor intent' : dwellConfidence > 0.45 ? 'cursor dwell' : 'cursor',
      x: point.x,
      y: point.y,
      scale: attentionScale(settings, confidence, Math.min(0.16, state.pointer.velocity * 2.2)),
      score,
      confidence,
      selectedAt: now
    }));
  }

  if (emphasisConfidence > 0) {
    const confidence = clamp01(0.74 + emphasisConfidence * 0.26);
    candidates.push(attentionCandidate({
      source: 'pulse',
      reason: 'emphasis',
      x: state.pulse.x,
      y: state.pulse.y,
      scale: attentionScale(settings, confidence, 0.12),
      score: 1.12 + emphasisConfidence * 0.24,
      confidence,
      selectedAt: now
    }));
  }

  if (motionMode && settings.motionFocus) {
    const motionAge = now - state.motionTarget.lastSeenAt;
    const freshness = clamp01((1800 - motionAge) / 1800);
    if (freshness > 0 && state.motionTarget.strength > 0.015) {
      const pointerPenalty = directorMode && idleFor < 420 ? 0.58 : 1;
      const confidence = clamp01((0.34 + state.motionTarget.strength * 0.84) * freshness * pointerPenalty);
      candidates.push(attentionCandidate({
        source: 'motion',
        reason: 'screen motion',
        x: state.motionTarget.x,
        y: state.motionTarget.y,
        scale: attentionScale(settings, confidence, Math.min(0.24, state.motionTarget.strength * 0.34)),
        score: (settings.focusMode === 'motion' ? 0.72 : 0.48) + confidence * 0.62,
        confidence,
        selectedAt: now
      }));
    }
  }

  if (state.activeMarker) {
    const markerAge = now - state.activeMarker.startedAt;
    const freshness = clamp01((1800 - markerAge) / 1800);
    if (freshness > 0) {
      const confidence = clamp01(0.72 + freshness * 0.2);
      candidates.push(attentionCandidate({
        source: 'marker',
        reason: state.activeMarker.reason || 'marker',
        x: state.activeMarker.x,
        y: state.activeMarker.y,
        scale: attentionScale(settings, confidence, 0.08),
        score: 0.82 + freshness * 0.24,
        confidence,
        selectedAt: now
      }));
    }
  }

  if (state.keys.length > 0 && directorMode) {
    const active = state.attention.active || { x: 0.5, y: 0.5 };
    candidates.push(attentionCandidate({
      source: 'keyboard',
      reason: 'keyboard',
      x: active.source === 'wide' ? 0.5 : active.x,
      y: active.source === 'wide' ? 0.58 : active.y,
      scale: attentionScale(settings, 0.62, 0),
      score: 0.62,
      confidence: 0.62,
      selectedAt: now
    }));
  }

  if (settings.idleWide && idleFor > 2300 && emphasisConfidence === 0) {
    const confidence = clamp01((idleFor - 2300) / 1700);
    candidates.push(wideCandidate(0.64 + confidence * 0.44, 'idle wide'));
  }

  if (candidates.length === 0) {
    candidates.push(wideCandidate(0.8, 'wide'));
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function chooseAttentionTarget(settings, now = performance.now()) {
  const candidates = buildAttentionCandidates(settings, now);
  const best = candidates[0];
  const active = state.attention.active || candidates[candidates.length - 1];
  const sameSource = active.source === best.source;
  const heldFor = now - (active.selectedAt || 0);
  const minimumHold = active.source === 'wide' ? 260 : best.source === 'wide' ? 980 : 620;
  const switchMargin = best.source === 'wide' ? 0.1 : 0.16;
  const activeDecayedScore = Math.max(0, (active.score || 0) - heldFor / 7000);
  const closeEnough = normalizedDistance(active, best) < 0.055;
  const shouldSwitch = sameSource
    || active.source === 'wide'
    || best.source === 'lock'
    || heldFor > minimumHold && (best.score > activeDecayedScore + switchMargin || closeEnough)
    || best.source === 'wide' && best.score > 0.92 && heldFor > 900;

  if (shouldSwitch) {
    const next = sameSource
      ? {
          ...best,
          selectedAt: active.selectedAt || now,
          x: lerp(active.x, best.x, closeEnough ? 0.22 : 0.44),
          y: lerp(active.y, best.y, closeEnough ? 0.22 : 0.44),
          scale: lerp(active.scale, best.scale, 0.36)
        }
      : { ...best, selectedAt: now };
    state.attention.active = next;
    return next;
  }

  const held = {
    ...active,
    score: activeDecayedScore,
    confidence: Math.max(0.2, (active.confidence || 0) * 0.992),
    lastUpdatedAt: now
  };
  state.attention.active = held;
  return held;
}

function smartTarget(settings) {
  return chooseAttentionTarget(settings);
}

function easeFrame(settings) {
  const target = smartTarget(settings);
  const baseSmoothing = settings.smartMaster ? settings.smoothing : 0.16;
  const travel = normalizedDistance(state.frame, target);
  const panSmoothing = clamp(baseSmoothing + travel * 0.16 + target.confidence * 0.025, 0.045, 0.32);
  const zoomSmoothing = clamp(baseSmoothing * 0.82 + target.confidence * 0.03, 0.04, 0.24);
  state.frame.scale += (target.scale - state.frame.scale) * zoomSmoothing;
  state.frame.x += (target.x - state.frame.x) * panSmoothing;
  state.frame.y += (target.y - state.frame.y) * panSmoothing;
}

function drawVideoFrame(settings) {
  const width = canvas.width;
  const height = canvas.height;
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const { drawWidth, drawHeight } = coverRect(sourceWidth, sourceHeight, width, height, state.frame.scale);
  const maxOffsetX = Math.max(0, drawWidth - width);
  const maxOffsetY = Math.max(0, drawHeight - height);
  const drawX = -maxOffsetX * state.frame.x;
  const drawY = -maxOffsetY * state.frame.y;

  ctx.fillStyle = '#07080a';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = settings.smoothRecording ? 'medium' : 'high';
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);

  if (settings.smartMaster && settings.motionFocus && state.frame.scale > 1.03) {
    const focusPoint = vectorLayerPoint(state.pointer.x, state.pointer.y);
    const gradient = ctx.createRadialGradient(
      focusPoint.x,
      focusPoint.y,
      width * 0.08,
      focusPoint.x,
      focusPoint.y,
      width * 0.52
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawNativePreviewFrame(settings) {
  const width = canvas.width;
  const height = canvas.height;
  const sourceWidth = video.videoWidth || width;
  const sourceHeight = video.videoHeight || height;
  const { drawWidth, drawHeight } = coverRect(sourceWidth, sourceHeight, width, height, 1);
  const drawX = -Math.max(0, drawWidth - width) * 0.5;
  const drawY = -Math.max(0, drawHeight - height) * 0.5;

  ctx.fillStyle = '#07080a';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = settings.smoothRecording ? 'low' : 'medium';
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
}

function privacyRect(settings) {
  const width = canvas.width;
  const height = canvas.height;
  const rectWidth = Math.round(width * 0.32);
  const rectHeight = Math.round(height * 0.18);
  const margin = Math.round(width * 0.025);

  if (settings.privacyRegion === 'center') {
    return {
      x: Math.round((width - rectWidth) / 2),
      y: Math.round((height - rectHeight) / 2),
      width: rectWidth,
      height: rectHeight
    };
  }

  const isTop = settings.privacyRegion.startsWith('top');
  const isLeft = settings.privacyRegion.endsWith('left');
  return {
    x: isLeft ? margin : width - rectWidth - margin,
    y: isTop ? margin : height - rectHeight - margin,
    width: rectWidth,
    height: rectHeight
  };
}

function drawPrivacyBlur(settings) {
  if (!settings.smartMaster || !settings.privacyBlur) {
    return;
  }

  const rect = privacyRect(settings);

  if (lowLatencyMode(settings)) {
    ctx.save();
    ctx.fillStyle = 'rgba(16, 17, 20, 0.88)';
    ctx.strokeStyle = 'rgba(255, 191, 90, 0.72)';
    ctx.lineWidth = Math.max(2, canvas.width * 0.0012);
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
  ctx.clip();
  ctx.filter = `blur(${settings.privacyStrength}px)`;
  ctx.drawImage(canvas, rect.x, rect.y, rect.width, rect.height, rect.x, rect.y, rect.width, rect.height);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(16, 17, 20, 0.22)';
  ctx.strokeStyle = 'rgba(255, 191, 90, 0.72)';
  ctx.lineWidth = Math.max(2, canvas.width * 0.0012);
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCursorSpotlight(settings) {
  if (!settings.smartMaster || !settings.cursorSpotlight) {
    return;
  }
  if (state.renderContext && state.renderContext.cursorUsable === false) {
    return;
  }

  const point = vectorLayerPoint(state.pointer.x, state.pointer.y);
  if (!point.visible) {
    return;
  }
  const { x, y } = point;

  ctx.save();
  ctx.strokeStyle = 'rgba(66, 214, 198, 0.95)';
  ctx.lineWidth = Math.max(4, canvas.width * 0.0024);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(22, canvas.width * 0.018), 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 191, 90, 0.24)';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(8, canvas.width * 0.006), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function vectorLayerPoint(x, y) {
  const width = canvas.width;
  const height = canvas.height;
  const scale = Math.max(1, finiteNumber(state.frame.scale, 1));
  const drawWidth = width * scale;
  const drawHeight = height * scale;
  const drawX = -Math.max(0, drawWidth - width) * clamp01(finiteNumber(state.frame.x, 0.5));
  const drawY = -Math.max(0, drawHeight - height) * clamp01(finiteNumber(state.frame.y, 0.5));
  const pointX = drawX + clamp01(finiteNumber(x, 0.5)) * drawWidth;
  const pointY = drawY + clamp01(finiteNumber(y, 0.5)) * drawHeight;

  return {
    x: pointX,
    y: pointY,
    visible: pointX >= -width * 0.08
      && pointX <= width * 1.08
      && pointY >= -height * 0.08
      && pointY <= height * 1.08
  };
}

function drawCursorTrail(settings) {
  if (!settings.smartMaster || !settings.cursorTrail || state.trail.length < 2) {
    return;
  }

  const now = performance.now();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < state.trail.length; i += 1) {
    const previous = state.trail[i - 1];
    const current = state.trail[i];
    const age = now - current.at;
    const opacity = Math.max(0, 1 - age / 900);

    if (opacity <= 0) {
      continue;
    }

    ctx.strokeStyle = `rgba(66, 214, 198, ${opacity * 0.72})`;
    ctx.lineWidth = Math.max(5, canvas.width * 0.004) * opacity;
    const previousPoint = vectorLayerPoint(previous.x, previous.y);
    const currentPoint = vectorLayerPoint(current.x, current.y);
    if (!previousPoint.visible && !currentPoint.visible) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
  }

  ctx.restore();
  state.trail = state.trail.filter((point) => now - point.at < 900);
}

function drawTimelineCursorTrail(settings, atMs, trail) {
  if (!settings.smartMaster || !settings.cursorTrail || trail.length < 2) {
    return;
  }

  const points = trail
    .filter((point) => atMs >= point.atMs && atMs - point.atMs < 900)
    .slice(-28);
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const age = atMs - current.atMs;
    const opacity = Math.max(0, 1 - age / 900);

    if (opacity <= 0) {
      continue;
    }

    ctx.strokeStyle = `rgba(66, 214, 198, ${opacity * 0.72})`;
    ctx.lineWidth = Math.max(5, canvas.width * 0.004) * opacity;
    const previousPoint = vectorLayerPoint(previous.x, previous.y);
    const currentPoint = vectorLayerPoint(current.x, current.y);
    if (!previousPoint.visible && !currentPoint.visible) {
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(previousPoint.x, previousPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPulse(settings) {
  if (!settings.smartMaster || !settings.clickPulse || !state.pulse.active) {
    return;
  }

  const elapsed = performance.now() - state.pulse.startedAt;
  const progress = elapsed / 620;
  if (progress >= 1) {
    state.pulse.active = false;
    return;
  }

  const point = vectorLayerPoint(state.pulse.x, state.pulse.y);
  if (!point.visible) {
    return;
  }
  const { x, y } = point;
  const radius = canvas.width * (0.02 + progress * 0.05);

  ctx.save();
  ctx.strokeStyle = `rgba(255, 191, 90, ${1 - progress})`;
  ctx.lineWidth = Math.max(5, canvas.width * 0.003);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTimelinePulses(settings, atMs, pulses) {
  if (!settings.smartMaster || !settings.clickPulse || pulses.length === 0) {
    return;
  }

  for (const pulse of pulses) {
    const elapsed = atMs - pulse.atMs;
    if (elapsed < 0 || elapsed > 620) {
      continue;
    }

    const progress = elapsed / 620;
    const point = vectorLayerPoint(pulse.x, pulse.y);
    if (!point.visible) {
      continue;
    }
    const { x, y } = point;
    const radius = canvas.width * (0.02 + progress * 0.05);

    ctx.save();
    ctx.strokeStyle = `rgba(255, 191, 90, ${1 - progress})`;
    ctx.lineWidth = Math.max(5, canvas.width * 0.003);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawKeyboardOverlay(settings) {
  if (!settings.smartMaster || !settings.keyboardOverlay || state.keys.length === 0) {
    return;
  }

  const text = state.keys.join(' + ');
  const width = canvas.width;
  const height = canvas.height;
  const paddingX = 32;
  const boxHeight = 72;

  ctx.save();
  ctx.font = '700 30px system-ui, sans-serif';
  const textWidth = ctx.measureText(text).width;
  const boxWidth = Math.min(width - 80, textWidth + paddingX * 2);
  const x = width - boxWidth - 40;
  const y = height - boxHeight - 40;

  ctx.fillStyle = 'rgba(16, 17, 20, 0.82)';
  ctx.strokeStyle = 'rgba(118, 168, 255, 0.9)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f4f1ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + boxWidth / 2, y + boxHeight / 2);
  ctx.restore();
}

function drawMarkerOverlay(settings) {
  if (!settings.smartMaster || !state.activeMarker) {
    return;
  }

  const elapsed = performance.now() - state.activeMarker.startedAt;
  if (elapsed > 1800) {
    state.activeMarker = null;
    return;
  }

  const width = canvas.width;
  const paddingX = 24;
  const x = 40;
  const y = 40;
  const boxHeight = 62;
  const text = `${state.activeMarker.label}  ${formatTime(state.activeMarker.atMs)}`;

  ctx.save();
  ctx.font = '800 26px system-ui, sans-serif';
  const boxWidth = Math.min(width - 80, ctx.measureText(text).width + paddingX * 2);
  ctx.globalAlpha = Math.min(1, 1.2 - elapsed / 1800);
  ctx.fillStyle = 'rgba(16, 17, 20, 0.84)';
  ctx.strokeStyle = 'rgba(255, 191, 90, 0.9)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4f1ea';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + paddingX, y + boxHeight / 2);
  ctx.restore();
}

function drawTimelineMarkerOverlay(settings, atMs, markers) {
  if (!settings.smartMaster || !markers.length) {
    return;
  }

  const marker = markers.findLast((item) => atMs >= item.atMs && atMs - item.atMs <= 1800);
  if (!marker) {
    return;
  }

  const elapsed = atMs - marker.atMs;
  const width = canvas.width;
  const paddingX = 24;
  const x = 40;
  const y = 40;
  const boxHeight = 62;
  const text = `${marker.label}  ${formatTime(marker.atMs)}`;

  ctx.save();
  ctx.font = '800 26px system-ui, sans-serif';
  const boxWidth = Math.min(width - 80, ctx.measureText(text).width + paddingX * 2);
  ctx.globalAlpha = Math.min(1, 1.2 - elapsed / 1800);
  ctx.fillStyle = 'rgba(16, 17, 20, 0.84)';
  ctx.strokeStyle = 'rgba(255, 191, 90, 0.9)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4f1ea';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + paddingX, y + boxHeight / 2);
  ctx.restore();
}

function truncateCanvasText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let next = text;
  while (next.length > 1 && context.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }

  return `${next.trim()}...`;
}

function wrapCanvasText(context, text, maxWidth, maxLines) {
  const words = cleanTitle(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
    } else {
      lines.push(truncateCanvasText(context, word, maxWidth));
    }

    line = word;
    if (lines.length === maxLines) {
      break;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(truncateCanvasText(context, line, maxWidth));
  }

  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    lines[lines.length - 1] = truncateCanvasText(context, lines[lines.length - 1], maxWidth);
  }

  return lines;
}

function wrapCueText(context, text, maxWidth, maxLines) {
  const words = cleanCueText(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
      line = word;
    } else {
      lines.push(truncateCanvasText(context, word, maxWidth));
      line = '';
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(truncateCanvasText(context, line, maxWidth));
  }

  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    lines[lines.length - 1] = truncateCanvasText(context, lines[lines.length - 1], maxWidth);
  }

  return lines;
}

function drawTitleOverlay(settings) {
  const title = cleanTitle(settings.takeTitle);
  if (!settings.smartMaster || !settings.titleOverlay || !title || (!state.recording && !state.renderContext)) {
    return;
  }

  const elapsed = currentRenderMs();
  const introDuration = Math.max(0, settings.titleDuration);
  const showIntro = introDuration > 0 && elapsed < introDuration;
  const lowerThirdUntil = introDuration + 4600;
  if (!showIntro && elapsed > Math.max(5200, lowerThirdUntil)) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const margin = Math.max(40, width * 0.034);
  const sourceName = cleanTitle(state.selectedSource ? state.selectedSource.name : 'Smartie recording');

  ctx.save();

  if (showIntro) {
    const fadeIn = Math.min(1, elapsed / 420);
    const fadeOut = Math.min(1, Math.max(0, (introDuration - elapsed) / 520));
    ctx.globalAlpha = Math.min(fadeIn, fadeOut);
    ctx.fillStyle = 'rgba(7, 8, 10, 0.72)';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(66, 214, 198, 0.18)';
    ctx.fillRect(0, Math.round(height * 0.64), width, Math.max(6, height * 0.006));

    const titleSize = Math.round(Math.min(76, Math.max(40, width * 0.042)));
    const lineHeight = Math.round(titleSize * 1.12);
    const y = height * 0.38;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `800 ${Math.round(Math.max(22, width * 0.014))}px system-ui, sans-serif`;
    ctx.fillStyle = '#42d6c6';
    ctx.fillText('SMARTIE TAKE', margin, y - lineHeight * 1.35);

    ctx.font = `800 ${titleSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#f4f1ea';
    const titleLines = wrapCanvasText(ctx, title, width - margin * 2, 2);
    titleLines.forEach((line, index) => {
      ctx.fillText(line, margin, y + lineHeight * index);
    });

    ctx.font = `600 ${Math.round(Math.max(24, width * 0.016))}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(244, 241, 234, 0.78)';
    ctx.fillText(truncateCanvasText(ctx, sourceName, width - margin * 2), margin, y + lineHeight * titleLines.length + 28);
    ctx.restore();
    return;
  }

  const fade = Math.min(1, Math.max(0, (lowerThirdUntil - elapsed) / 520));
  const x = margin;
  const boxHeight = Math.max(86, height * 0.092);
  const y = height - boxHeight - margin;
  const paddingX = Math.max(24, width * 0.018);
  const maxTextWidth = width * 0.46;

  ctx.globalAlpha = fade;
  ctx.font = `800 ${Math.round(Math.max(26, width * 0.017))}px system-ui, sans-serif`;
  const titleText = truncateCanvasText(ctx, title, maxTextWidth);
  ctx.font = `600 ${Math.round(Math.max(17, width * 0.01))}px system-ui, sans-serif`;
  const sourceText = truncateCanvasText(ctx, sourceName, maxTextWidth);
  const textWidth = Math.max(
    ctx.measureText(titleText).width,
    ctx.measureText(sourceText).width
  );
  const boxWidth = Math.min(width - x * 2, textWidth + paddingX * 2);

  ctx.fillStyle = 'rgba(16, 17, 20, 0.84)';
  ctx.strokeStyle = 'rgba(66, 214, 198, 0.86)';
  ctx.lineWidth = Math.max(2, width * 0.0012);
  roundRect(ctx, x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(Math.max(26, width * 0.017))}px system-ui, sans-serif`;
  ctx.fillStyle = '#f4f1ea';
  ctx.fillText(titleText, x + paddingX, y + boxHeight * 0.42);

  ctx.font = `600 ${Math.round(Math.max(17, width * 0.01))}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(244, 241, 234, 0.68)';
  ctx.fillText(sourceText, x + paddingX, y + boxHeight * 0.72);
  ctx.restore();
}

function drawCueOverlay(settings) {
  const text = cleanCueText(settings.cueText);
  if (!settings.smartMaster || !settings.cueOverlay || !text || (!state.recording && !state.renderContext)) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const margin = Math.max(34, width * 0.026);
  const maxWidth = Math.min(width - margin * 2, width * 0.72);
  const fontSize = Math.round(Math.max(24, Math.min(38, width * 0.018)));
  const lineHeight = Math.round(fontSize * 1.28);
  const paddingX = Math.round(Math.max(28, width * 0.018));
  const paddingY = Math.round(Math.max(20, height * 0.018));

  ctx.save();
  ctx.font = `700 ${fontSize}px system-ui, sans-serif`;
  const lines = wrapCueText(ctx, text, maxWidth - paddingX * 2, 3);
  const contentWidth = lines.reduce((widest, line) => Math.max(widest, ctx.measureText(line).width), 0);
  const boxWidth = Math.min(maxWidth, contentWidth + paddingX * 2);
  const boxHeight = paddingY * 2 + lineHeight * lines.length;
  const x = Math.round((width - boxWidth) / 2);
  const y = settings.cuePosition === 'bottom'
    ? Math.round(height - boxHeight - margin)
    : margin;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = 'rgba(16, 17, 20, 0.82)';
  ctx.strokeStyle = 'rgba(118, 168, 255, 0.86)';
  ctx.lineWidth = Math.max(2, width * 0.0012);
  roundRect(ctx, x, y, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#f4f1ea';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, index) => {
    ctx.fillText(line, x + boxWidth / 2, y + paddingY + lineHeight * index + lineHeight / 2);
  });
  ctx.restore();
}

function drawCameraBubble(settings) {
  if (!settings.cameraBubble || !state.cameraStream || cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const isLowLatency = lowLatencyMode(settings);
  const bubbleWidth = Math.min(width * (isLowLatency ? 0.18 : 0.22), isLowLatency ? 280 : 460);
  const bubbleHeight = bubbleWidth * 0.5625;
  const margin = Math.max(32, width * 0.025);
  const isTop = settings.cameraPosition.startsWith('top');
  const isLeft = settings.cameraPosition.endsWith('left');
  const x = isLeft ? margin : width - bubbleWidth - margin;
  const y = isTop ? margin : height - bubbleHeight - margin;
  const radius = Math.max(12, bubbleWidth * 0.035);

  ctx.save();
  ctx.shadowColor = isLowLatency ? 'transparent' : 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = isLowLatency ? 0 : 28;
  ctx.shadowOffsetY = isLowLatency ? 0 : 12;
  ctx.fillStyle = 'rgba(16, 17, 20, 0.78)';
  roundRect(ctx, x - 8, y - 8, bubbleWidth + 16, bubbleHeight + 16, radius + 8);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, bubbleWidth, bubbleHeight, radius);
  ctx.clip();
  ctx.translate(x + bubbleWidth, y);
  ctx.scale(-1, 1);
  ctx.drawImage(cameraVideo, 0, 0, bubbleWidth, bubbleHeight);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(244, 241, 234, 0.88)';
  ctx.lineWidth = Math.max(3, width * 0.0016);
  roundRect(ctx, x, y, bubbleWidth, bubbleHeight, radius);
  ctx.stroke();
  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function timelineSampleAt(timeline, atMs) {
  if (timeline.length === 0) {
    return {
      frame: { scale: 1, x: 0.5, y: 0.5 },
      pointer: { x: 0.5, y: 0.5 },
      keys: []
    };
  }

  let low = 0;
  let high = timeline.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (timeline[middle].atMs <= atMs) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const before = timeline[Math.max(0, high)];
  const after = timeline[Math.min(timeline.length - 1, low)];
  if (!before || before === after) {
    return before || after;
  }

  const span = Math.max(1, after.atMs - before.atMs);
  const t = Math.min(1, Math.max(0, (atMs - before.atMs) / span));
  const mix = (start, end) => start + (end - start) * t;

  return {
    atMs,
    frame: {
      scale: mix(before.frame.scale, after.frame.scale),
      x: mix(before.frame.x, after.frame.x),
      y: mix(before.frame.y, after.frame.y)
    },
    pointer: {
      x: mix(before.pointer.x, after.pointer.x),
      y: mix(before.pointer.y, after.pointer.y)
    },
    keys: before.keys || []
  };
}

function refineSmartTimeline(timeline) {
  if (timeline.length < 3) {
    return timeline;
  }

  const smoothingWindowMs = 180;
  const smoothed = timeline.map((sample, sampleIndex) => {
    let weightTotal = 0;
    let x = 0;
    let y = 0;
    let scale = 0;

    for (let index = sampleIndex; index >= 0; index -= 1) {
      const candidate = timeline[index];
      const distanceMs = Math.abs(sample.atMs - candidate.atMs);
      if (distanceMs > smoothingWindowMs) {
        break;
      }

      const weight = 1 - distanceMs / smoothingWindowMs;
      weightTotal += weight;
      x += candidate.frame.x * weight;
      y += candidate.frame.y * weight;
      scale += candidate.frame.scale * weight;
    }

    for (let index = sampleIndex + 1; index < timeline.length; index += 1) {
      const candidate = timeline[index];
      const distanceMs = Math.abs(sample.atMs - candidate.atMs);
      if (distanceMs > smoothingWindowMs) {
        break;
      }

      const weight = 1 - distanceMs / smoothingWindowMs;
      weightTotal += weight;
      x += candidate.frame.x * weight;
      y += candidate.frame.y * weight;
      scale += candidate.frame.scale * weight;
    }

    return {
      ...sample,
      frame: {
        scale: scale / weightTotal,
        x: x / weightTotal,
        y: y / weightTotal
      }
    };
  });

  const refined = [smoothed[0]];
  for (let index = 1; index < smoothed.length; index += 1) {
    const previous = refined[refined.length - 1];
    const current = smoothed[index];
    const dt = Math.max(16, current.atMs - previous.atMs) / 1000;
    const maxPanStep = 0.78 * dt;
    const maxScaleStep = 1.08 * dt;
    const dx = current.frame.x - previous.frame.x;
    const dy = current.frame.y - previous.frame.y;
    const distance = Math.hypot(dx, dy);
    const panRatio = distance > maxPanStep ? maxPanStep / distance : 1;
    const scaleDelta = current.frame.scale - previous.frame.scale;

    refined.push({
      ...current,
      frame: {
        x: distance < 0.004 ? previous.frame.x : previous.frame.x + dx * panRatio,
        y: distance < 0.004 ? previous.frame.y : previous.frame.y + dy * panRatio,
        scale: Math.abs(scaleDelta) < 0.012
          ? previous.frame.scale
          : previous.frame.scale + clamp(scaleDelta, -maxScaleStep, maxScaleStep)
      }
    });
  }

  return refined;
}

function roundTo(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(finiteNumber(value, 0) * factor) / factor;
}

function attentionCue(sample) {
  const attention = sample.attention || {};
  const source = String(attention.source || '').toLowerCase();
  const reason = String(attention.reason || '').toLowerCase();
  const keys = Array.isArray(sample.keys) ? sample.keys : [];

  if (keys.length > 0 || source === 'keyboard' || reason.includes('key')) {
    return 'keyboard';
  }

  if (source === 'pulse' || reason.includes('click') || reason.includes('emphasis')) {
    return 'click';
  }

  if (reason.includes('dwell') || reason.includes('hold') || source === 'lock') {
    return 'dwell';
  }

  if (source === 'motion' || reason.includes('motion')) {
    return 'motion';
  }

  if (source === 'wide' || reason.includes('wide')) {
    return 'wide';
  }

  if (source === 'pointer' && reason.includes('intent')) {
    return 'motion';
  }

  return 'attention';
}

function attentionEventDurationMs(cue) {
  if (cue === 'click') {
    return 340;
  }

  if (cue === 'keyboard') {
    return 980;
  }

  if (cue === 'dwell') {
    return 1200;
  }

  if (cue === 'motion') {
    return 420;
  }

  return 760;
}

function shouldKeepAttentionEvent(event, previousEvent) {
  if (!previousEvent) {
    return true;
  }

  const elapsedMs = event.time_ms - previousEvent.time_ms;
  const distance = Math.hypot(event.x - previousEvent.x, event.y - previousEvent.y);
  const scaleDelta = Math.abs((event.scale || 1) - (previousEvent.scale || 1));

  return event.type !== previousEvent.type
    || elapsedMs >= 360
    || distance >= 0.018
    || scaleDelta >= 0.045
    || event.confidence >= 0.82 && elapsedMs >= 220;
}

function buildTimelineAttentionEvent(sample, outputSize) {
  const attention = sample.attention || {};
  const frame = sample.frame || {};
  const pointer = sample.pointer || {};
  const cue = attentionCue(sample);

  if (cue === 'wide' && finiteNumber(frame.scale, 1) < 1.08) {
    return null;
  }

  const x = clamp01(finiteNumber(attention.x, finiteNumber(frame.x, finiteNumber(pointer.x, 0.5))));
  const y = clamp01(finiteNumber(attention.y, finiteNumber(frame.y, finiteNumber(pointer.y, 0.5))));
  const scale = Math.max(1, finiteNumber(attention.scale, finiteNumber(frame.scale, 1)));
  const confidence = clamp01(Math.max(
    finiteNumber(attention.confidence, 0.5),
    finiteNumber(attention.score, 0.5),
    Math.min(1, (scale - 1) / 1.2)
  ));

  return {
    time: roundTo(finiteNumber(sample.atMs, 0) / 1000, 3),
    time_ms: Math.round(finiteNumber(sample.atMs, 0)),
    x: roundTo(x, 5),
    y: roundTo(y, 5),
    type: cue,
    confidence: roundTo(confidence, 3),
    duration_ms: attentionEventDurationMs(cue),
    scale: roundTo(scale, 4),
    reason: attention.reason || cue,
    source: attention.source || cue,
    output_width: outputSize.width,
    output_height: outputSize.height
  };
}

function pushAttentionEvent(events, event) {
  if (!event) {
    return;
  }

  if (!Number.isFinite(event.time) || event.time < 0) {
    return;
  }

  if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) {
    return;
  }

  events.push({
    ...event,
    x: roundTo(clamp01(event.x), 5),
    y: roundTo(clamp01(event.y), 5),
    confidence: roundTo(clamp01(event.confidence), 3)
  });
}

function cursorTelemetryQuality(samples = [], durationMs = 0) {
  if (!Array.isArray(samples) || samples.length < 3) {
    return {
      usable: false,
      reason: 'not-enough-cursor-samples',
      samples: Array.isArray(samples) ? samples.length : 0,
      maxVelocity: 0,
      pathDistance: 0,
      uniquePoints: 0,
      allZero: false
    };
  }

  let maxVelocity = 0;
  let pathDistance = 0;
  let allZeroCount = 0;
  const uniquePoints = new Set();
  let previous = null;

  for (const sample of samples) {
    const x = finiteNumber(sample.x, 0);
    const y = finiteNumber(sample.y, 0);
    const screenX = finiteNumber(sample.screen_x, 0);
    const screenY = finiteNumber(sample.screen_y, 0);
    const velocity = Math.abs(finiteNumber(sample.velocity, 0));
    maxVelocity = Math.max(maxVelocity, velocity);
    uniquePoints.add(`${Math.round(x * 1000)}:${Math.round(y * 1000)}`);
    if (x === 0 && y === 0 && screenX === 0 && screenY === 0 && velocity === 0) {
      allZeroCount += 1;
    }
    if (previous) {
      pathDistance += Math.hypot(x - previous.x, y - previous.y);
    }
    previous = { x, y };
  }

  const allZero = allZeroCount >= Math.max(3, samples.length * 0.92);
  const enoughMovement = maxVelocity >= 0.003 || pathDistance >= Math.max(0.05, durationMs / 180000);
  const usable = !allZero && uniquePoints.size >= 3 && enoughMovement;

  return {
    usable,
    reason: usable ? 'usable' : allZero ? 'stuck-at-zero' : 'stationary-or-low-confidence',
    samples: samples.length,
    maxVelocity: roundTo(maxVelocity, 5),
    pathDistance: roundTo(pathDistance, 5),
    uniquePoints: uniquePoints.size,
    allZero
  };
}

function spacedTelemetryEvents(items, minGapMs, pickScore) {
  const picked = [];
  const sorted = items
    .filter((item) => Number.isFinite(finiteNumber(item.time_ms, NaN)))
    .sort((a, b) => pickScore(b) - pickScore(a));

  for (const item of sorted) {
    const atMs = finiteNumber(item.time_ms, 0);
    if (picked.some((chosen) => Math.abs(finiteNumber(chosen.time_ms, 0) - atMs) < minGapMs)) {
      continue;
    }
    picked.push(item);
  }

  return picked.sort((a, b) => finiteNumber(a.time_ms, 0) - finiteNumber(b.time_ms, 0));
}

function fallbackAttentionScale(settings, confidence, maxScale = null) {
  const requested = Math.max(1.05, finiteNumber(settings.zoomStrength, 1.7));
  const ceiling = maxScale || Math.min(requested, 1.62);
  return roundTo(clamp(1 + (requested - 1) * (0.42 + confidence * 0.38), 1.08, ceiling), 4);
}

function pushFallbackAttentionEvent(events, event, stats) {
  const before = events.length;
  pushAttentionEvent(events, event);
  if (events.length > before) {
    stats.fallbackEvents += 1;
    stats.sources[event.source || event.type || 'fallback'] = (stats.sources[event.source || event.type || 'fallback'] || 0) + 1;
  }
}

function appendTelemetryFallbackAttention(events, timelinePlan, outputSize) {
  const settings = timelinePlan.settings;
  const durationMs = Math.max(0, finiteNumber(timelinePlan.durationMs, 0));
  const telemetry = timelinePlan.telemetry || {};
  const stats = {
    fallbackEvents: 0,
    strategy: 'none',
    sources: {},
    cursor: cursorTelemetryQuality(telemetry.cursor, durationMs)
  };

  if (!settings.smartMaster || !settings.autoZoom || settings.focusMode === 'wide' || durationMs < 1200) {
    return stats;
  }

  const existingStrongEvents = events.filter((event) => event.type !== 'wide').length;
  if (existingStrongEvents >= 1) {
    stats.strategy = 'primary-attention';
    return stats;
  }

  const clickEvents = Array.isArray(telemetry.clicks) ? telemetry.clicks : [];
  for (const click of clickEvents.slice(0, 16)) {
    const atMs = finiteNumber(click.time_ms, finiteNumber(click.time, 0) * 1000);
    const confidence = clamp01(finiteNumber(click.confidence, 0.92));
    pushFallbackAttentionEvent(events, {
      time: roundTo(atMs / 1000, 3),
      time_ms: Math.round(atMs),
      x: roundTo(clamp01(finiteNumber(click.x, 0.5)), 5),
      y: roundTo(clamp01(finiteNumber(click.y, 0.5)), 5),
      type: 'click',
      confidence,
      duration_ms: 620,
      scale: fallbackAttentionScale(settings, confidence),
      reason: click.reason || click.type || 'click telemetry',
      source: 'click_telemetry',
      output_width: outputSize.width,
      output_height: outputSize.height
    }, stats);
  }

  const nativePrecisionEvents = spacedTelemetryEvents(
    (Array.isArray(telemetry.native) ? telemetry.native : [])
      .filter((event) => (event.type === 'snapshot' || event.type === 'pointer' || event.type === 'cursor') && event.pointer && Number.isFinite(finiteNumber(event.pointer.x, NaN)))
      .filter((event) => finiteNumber(event.quality?.score, 0) >= 0.72),
    1250,
    (event) => finiteNumber(event.quality?.score, 0)
  ).slice(0, Math.max(4, Math.round(durationMs / 11000)));

  for (const nativeEvent of nativePrecisionEvents) {
    const atMs = finiteNumber(nativeEvent.time_ms, finiteNumber(nativeEvent.time, 0) * 1000);
    const confidence = clamp01(0.74 + finiteNumber(nativeEvent.quality?.score, 0.72) * 0.18);
    pushFallbackAttentionEvent(events, {
      time: roundTo(atMs / 1000, 3),
      time_ms: Math.round(atMs),
      x: roundTo(clamp01(finiteNumber(nativeEvent.pointer.x, 0.5)), 5),
      y: roundTo(clamp01(finiteNumber(nativeEvent.pointer.y, 0.5)), 5),
      type: 'attention',
      confidence,
      duration_ms: 980,
      scale: fallbackAttentionScale(settings, confidence),
      reason: `native ${nativeEvent.quality?.tier || 'telemetry'} pointer`,
      source: 'native_pointer_telemetry',
      output_width: outputSize.width,
      output_height: outputSize.height
    }, stats);
  }

  const motionEvents = spacedTelemetryEvents(Array.isArray(telemetry.motion) ? telemetry.motion : [], 1100, (event) => finiteNumber(event.strength, 0))
    .slice(0, Math.max(4, Math.round(durationMs / 12000)));
  for (const motion of motionEvents) {
    const atMs = finiteNumber(motion.time_ms, finiteNumber(motion.time, 0) * 1000);
    const strength = clamp01(finiteNumber(motion.strength, 0.2));
    const confidence = clamp01(0.72 + strength * 0.22);
    pushFallbackAttentionEvent(events, {
      time: roundTo(atMs / 1000, 3),
      time_ms: Math.round(atMs),
      x: roundTo(clamp01(finiteNumber(motion.x, 0.5)), 5),
      y: roundTo(clamp01(finiteNumber(motion.y, 0.5)), 5),
      type: 'motion',
      confidence,
      duration_ms: 980,
      scale: fallbackAttentionScale(settings, confidence, Math.min(finiteNumber(settings.zoomStrength, 1.7), 1.55)),
      reason: 'visual activity fallback',
      source: 'visual_motion_fallback',
      output_width: outputSize.width,
      output_height: outputSize.height
    }, stats);
  }

  if (stats.cursor.usable) {
    const cursorEvents = spacedTelemetryEvents(
      (telemetry.cursor || []).filter((sample) => finiteNumber(sample.velocity, 0) >= 0.003),
      1400,
      (sample) => finiteNumber(sample.velocity, 0)
    ).slice(0, Math.max(4, Math.round(durationMs / 11000)));

    for (const cursor of cursorEvents) {
      const atMs = finiteNumber(cursor.time_ms, finiteNumber(cursor.time, 0) * 1000);
      const velocity = clamp01(finiteNumber(cursor.velocity, 0) / 0.05);
      const confidence = clamp01(0.72 + velocity * 0.2);
      pushFallbackAttentionEvent(events, {
        time: roundTo(atMs / 1000, 3),
        time_ms: Math.round(atMs),
        x: roundTo(clamp01(finiteNumber(cursor.x, 0.5)), 5),
        y: roundTo(clamp01(finiteNumber(cursor.y, 0.5)), 5),
        type: 'attention',
        confidence,
        duration_ms: 900,
        scale: fallbackAttentionScale(settings, confidence),
        reason: 'cursor telemetry fallback',
        source: 'cursor_telemetry',
        output_width: outputSize.width,
        output_height: outputSize.height
      }, stats);
    }
  }

  const enoughFallback = stats.fallbackEvents >= Math.max(1, Math.min(3, Math.round(durationMs / 16000)));
  if (!enoughFallback && durationMs >= 8000) {
    const needed = Math.max(1, Math.min(4, Math.round(durationMs / 12000))) - stats.fallbackEvents;
    const anchors = [
      { x: 0.42, y: 0.5 },
      { x: 0.58, y: 0.5 },
      { x: 0.5, y: 0.42 },
      { x: 0.5, y: 0.58 }
    ];
    const startMs = clamp(durationMs * 0.18, 1200, 3200);
    const usableWindowMs = Math.max(1200, durationMs - startMs - 1200);
    const spacingMs = usableWindowMs / Math.max(1, needed);

    for (let index = 0; index < needed; index += 1) {
      const atMs = clamp(startMs + spacingMs * index, 900, Math.max(900, durationMs - 1200));
      const anchor = anchors[index % anchors.length];
      pushFallbackAttentionEvent(events, {
        time: roundTo(atMs / 1000, 3),
        time_ms: Math.round(atMs),
        x: anchor.x,
        y: anchor.y,
        type: 'focus',
        confidence: 0.72,
        duration_ms: 1300,
        scale: fallbackAttentionScale(settings, 0.72, Math.min(finiteNumber(settings.zoomStrength, 1.7), 1.42)),
        reason: stats.cursor.reason === 'stuck-at-zero'
          ? 'failsafe focus because cursor telemetry was stuck at zero'
          : 'failsafe focus because attention telemetry was empty',
        source: 'director_failsafe',
        output_width: outputSize.width,
        output_height: outputSize.height
      }, stats);
    }
  }

  if (stats.sources.click_telemetry) {
    stats.strategy = 'click-telemetry';
  } else if (stats.sources.native_pointer_telemetry) {
    stats.strategy = 'native-pointer';
  } else if (stats.sources.visual_motion_fallback) {
    stats.strategy = 'visual-motion';
  } else if (stats.sources.cursor_telemetry) {
    stats.strategy = 'cursor-telemetry';
  } else if (stats.sources.director_failsafe) {
    stats.strategy = 'director-failsafe';
  }

  return stats;
}

function buildAttentionTimeline(timelinePlan, outputSize) {
  const settings = timelinePlan.settings;
  const events = [];
  let previousKeptEvent = null;

  for (const sample of timelinePlan.timeline || []) {
    const event = buildTimelineAttentionEvent(sample, outputSize);
    if (!event || !shouldKeepAttentionEvent(event, previousKeptEvent)) {
      continue;
    }

    pushAttentionEvent(events, event);
    previousKeptEvent = event;
  }

  for (const pulse of timelinePlan.pulses || []) {
    pushAttentionEvent(events, {
      time: roundTo(finiteNumber(pulse.atMs, 0) / 1000, 3),
      time_ms: Math.round(finiteNumber(pulse.atMs, 0)),
      x: roundTo(finiteNumber(pulse.x, 0.5), 5),
      y: roundTo(finiteNumber(pulse.y, 0.5), 5),
      type: 'click',
      confidence: 0.96,
      duration_ms: 420,
      scale: roundTo(settings.zoomStrength, 4),
      reason: 'click pulse',
      source: 'pulse'
    });
  }

  for (const marker of timelinePlan.markers || []) {
    pushAttentionEvent(events, {
      time: roundTo(finiteNumber(marker.atMs, 0) / 1000, 3),
      time_ms: Math.round(finiteNumber(marker.atMs, 0)),
      x: roundTo(finiteNumber(marker.x, 0.5), 5),
      y: roundTo(finiteNumber(marker.y, 0.5), 5),
      type: marker.kind === 'manual' ? 'dwell' : 'attention',
      confidence: marker.kind === 'manual' ? 0.74 : 0.82,
      duration_ms: 1100,
      scale: roundTo(settings.zoomStrength, 4),
      reason: marker.reason || marker.label || 'marker',
      source: 'marker',
      label: marker.label || null
    });
  }

  const primaryEventCount = events.length;
  const fallbackStats = appendTelemetryFallbackAttention(events, timelinePlan, outputSize);
  events.sort((a, b) => a.time_ms - b.time_ms || b.confidence - a.confidence);

  return {
    schema: 'smartie.attention_timeline.v1',
    version: 1,
    generated_at: new Date().toISOString(),
    stats: {
      count: events.length,
      primary_events: primaryEventCount,
      fallback_events: fallbackStats.fallbackEvents,
      fallback_strategy: fallbackStats.strategy,
      fallback_sources: fallbackStats.sources,
      cursor_quality: fallbackStats.cursor
    },
    source: {
      duration_ms: Math.round(finiteNumber(timelinePlan.durationMs, 0)),
      duration_sec: roundTo(finiteNumber(timelinePlan.durationMs, 0) / 1000, 3),
      width: outputSize.width,
      height: outputSize.height,
      fps: effectiveRecordingFps(settings)
    },
    settings: {
      focus_mode: settings.focusMode,
      zoom_strength: settings.zoomStrength,
      motion_sensitivity: settings.motionSensitivity,
      smoothing: settings.smoothing,
      auto_zoom: settings.autoZoom,
      idle_wide: settings.idleWide
    },
    events
  };
}

function directorStyleProfile(settings) {
  const profiles = {
    subtle: {
      threshold: 0.68,
      scaleMultiplier: 0.78,
      minShotMs: 1120,
      maxShotMs: 2600,
      mergeGapMs: 620,
      transitionMs: 520,
      maxSegmentsPerMinute: 6
    },
    balanced: {
      threshold: 0.55,
      scaleMultiplier: 1,
      minShotMs: 920,
      maxShotMs: 3200,
      mergeGapMs: 520,
      transitionMs: 460,
      maxSegmentsPerMinute: 9
    },
    cinematic: {
      threshold: 0.48,
      scaleMultiplier: 1.14,
      minShotMs: 820,
      maxShotMs: 3800,
      mergeGapMs: 480,
      transitionMs: 560,
      maxSegmentsPerMinute: 12
    }
  };

  return profiles[settings.directorStyle] || profiles.balanced;
}

function cueScore(cue) {
  return {
    click: 1,
    keyboard: 0.9,
    dwell: 0.84,
    attention: 0.72,
    focus: 0.72,
    motion: 0.58,
    wide: 0
  }[cue] || 0.62;
}

function cueRank(cue) {
  return {
    click: 6,
    keyboard: 5,
    dwell: 4,
    focus: 3,
    attention: 2,
    motion: 1,
    wide: 0
  }[cue] || 1;
}

function cameraShotDurationMs(cue, score, profile, eventDurationMs = 0) {
  const base = {
    click: 980,
    keyboard: 1180,
    dwell: 1660,
    attention: 1180,
    focus: 1280,
    motion: 880
  }[cue] || 1040;
  const eventHold = Math.max(0, finiteNumber(eventDurationMs, 0));
  const scored = base + score * 520;
  return clamp(Math.max(profile.minShotMs, eventHold + 260, scored), profile.minShotMs, profile.maxShotMs);
}

function cameraPreRollMs(cue) {
  if (cue === 'click') {
    return 120;
  }

  if (cue === 'keyboard') {
    return 80;
  }

  return 100;
}

function cameraTargetScale(event, score, settings, profile) {
  const requested = Math.max(1.05, finiteNumber(settings.zoomStrength, 1.7));
  const liveScale = Math.max(1, finiteNumber(event.scale, 1));
  const scoredScale = 1 + (requested - 1) * (0.5 + score * 0.5) * profile.scaleMultiplier;
  const blended = scoredScale * 0.78 + liveScale * 0.22;
  return roundTo(clamp(blended, 1.04, Math.min(2.45, requested + 0.38)), 4);
}

function boundedCameraPoint(x, y, scale) {
  const visible = 1 / Math.max(1, scale);
  const margin = clamp(visible * 0.32, 0.04, 0.42);
  return {
    x: roundTo(clamp(finiteNumber(x, 0.5), margin, 1 - margin), 5),
    y: roundTo(clamp(finiteNumber(y, 0.5), margin, 1 - margin), 5)
  };
}

function directorCandidateFromEvent(event, settings, profile, durationMs) {
  const cue = String(event.type || event.cue || 'attention').replace(/[-\s]+/g, '_');
  if (cue === 'wide') {
    return null;
  }

  const confidence = clamp01(finiteNumber(event.confidence, 0.5));
  const score = roundTo(confidence * 0.72 + cueScore(cue) * 0.28, 3);
  if (score < profile.threshold) {
    return null;
  }

  const startMs = clamp(finiteNumber(event.time_ms, finiteNumber(event.time, 0) * 1000) - cameraPreRollMs(cue), 0, durationMs);
  const shotDuration = cameraShotDurationMs(cue, score, profile, finiteNumber(event.duration_ms, 0));
  let endMs = Math.min(durationMs, startMs + shotDuration);
  if (endMs - startMs < profile.minShotMs && endMs >= durationMs) {
    endMs = durationMs;
  }
  if (endMs - startMs < profile.minShotMs) {
    return null;
  }

  const targetScale = cameraTargetScale(event, score, settings, profile);
  if (targetScale < 1.045) {
    return null;
  }

  const point = boundedCameraPoint(event.x, event.y, targetScale);
  return {
    id: '',
    startMs: Math.round(startMs),
    endMs: Math.round(endMs),
    x: point.x,
    y: point.y,
    scale: targetScale,
    cue,
    score,
    confidence,
    reason: event.reason || cue,
    source: event.source || cue,
    sourceCount: 1,
    editable: true
  };
}

function mergeDirectorCandidates(candidates, profile) {
  const merged = [];
  for (const candidate of candidates.sort((a, b) => a.startMs - b.startMs)) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push({ ...candidate });
      continue;
    }

    const gapMs = candidate.startMs - previous.endMs;
    const distance = Math.hypot(candidate.x - previous.x, candidate.y - previous.y);
    if (gapMs <= profile.mergeGapMs && distance <= 0.16) {
      const previousWeight = previous.score * previous.sourceCount;
      const nextWeight = candidate.score * candidate.sourceCount;
      const totalWeight = Math.max(0.001, previousWeight + nextWeight);
      previous.endMs = Math.max(previous.endMs, candidate.endMs);
      previous.x = roundTo((previous.x * previousWeight + candidate.x * nextWeight) / totalWeight, 5);
      previous.y = roundTo((previous.y * previousWeight + candidate.y * nextWeight) / totalWeight, 5);
      previous.scale = roundTo(Math.max(previous.scale, candidate.scale), 4);
      previous.score = roundTo(Math.max(previous.score, candidate.score, (previous.score + candidate.score) / 2), 3);
      previous.confidence = roundTo(Math.max(previous.confidence, candidate.confidence), 3);
      previous.sourceCount += candidate.sourceCount;
      if (cueRank(candidate.cue) > cueRank(previous.cue)) {
        previous.cue = candidate.cue;
        previous.reason = candidate.reason;
        previous.source = candidate.source;
      }
      continue;
    }

    merged.push({ ...candidate });
  }

  return merged;
}

function resolveDirectorOverlaps(candidates, profile) {
  const resolved = [];
  for (const candidate of candidates.sort((a, b) => a.startMs - b.startMs)) {
    const previous = resolved[resolved.length - 1];
    if (!previous) {
      resolved.push({ ...candidate });
      continue;
    }

    const gapMs = candidate.startMs - previous.endMs;
    if (gapMs >= 140) {
      resolved.push({ ...candidate });
      continue;
    }

    const distance = Math.hypot(candidate.x - previous.x, candidate.y - previous.y);
    if (distance <= 0.13) {
      previous.endMs = Math.max(previous.endMs, candidate.endMs);
      previous.scale = roundTo(Math.max(previous.scale, candidate.scale), 4);
      previous.score = roundTo(Math.max(previous.score, candidate.score), 3);
      previous.sourceCount += candidate.sourceCount;
      continue;
    }

    if (candidate.score <= previous.score) {
      const trimmedEnd = Math.min(previous.endMs, candidate.startMs - 140);
      if (trimmedEnd - previous.startMs >= profile.minShotMs) {
        previous.endMs = Math.round(trimmedEnd);
        resolved.push({ ...candidate });
      }
      continue;
    }

    const shiftedStart = previous.endMs + 140;
    if (candidate.endMs - shiftedStart >= profile.minShotMs) {
      resolved.push({
        ...candidate,
        startMs: Math.round(shiftedStart)
      });
    }
  }

  return resolved.filter((candidate) => candidate.endMs - candidate.startMs >= profile.minShotMs);
}

function selectDirectorSegments(candidates, durationMs, profile) {
  const maxSegments = Math.max(4, Math.round((durationMs / 60000) * profile.maxSegmentsPerMinute));
  return candidates
    .slice()
    .sort((a, b) => b.score - a.score || a.startMs - b.startMs)
    .slice(0, maxSegments)
    .sort((a, b) => a.startMs - b.startMs)
    .map((segment, index) => ({
      ...segment,
      id: `shot-${String(index + 1).padStart(3, '0')}`
    }));
}

function addCameraKeyframe(keyframes, atMs, frame, reason) {
  const safeAtMs = Math.max(0, Math.round(finiteNumber(atMs, 0)));
  const previous = keyframes[keyframes.length - 1];
  const keyframe = {
    atMs: safeAtMs,
    x: roundTo(clamp01(frame.x), 5),
    y: roundTo(clamp01(frame.y), 5),
    scale: roundTo(Math.max(1, finiteNumber(frame.scale, 1)), 4),
    reason
  };

  if (previous && Math.abs(previous.atMs - keyframe.atMs) < 20) {
    keyframes[keyframes.length - 1] = keyframe;
    return;
  }

  keyframes.push(keyframe);
}

function buildCameraKeyframes(segments, durationMs, profile) {
  const keyframes = [];
  const wide = { x: 0.5, y: 0.5, scale: 1 };
  addCameraKeyframe(keyframes, 0, wide, 'opening wide');

  segments.forEach((segment, index) => {
    const previous = segments[index - 1];
    const next = segments[index + 1];
    const target = { x: segment.x, y: segment.y, scale: segment.scale };
    const transitionIn = Math.min(profile.transitionMs, Math.max(220, (segment.endMs - segment.startMs) * 0.28));
    const transitionOut = Math.min(profile.transitionMs, Math.max(240, (segment.endMs - segment.startMs) * 0.3));
    const hasPreviousConnection = previous && segment.startMs - previous.endMs <= profile.mergeGapMs + 260;
    const hasNextConnection = next && next.startMs - segment.endMs <= profile.mergeGapMs + 260;

    if (!hasPreviousConnection) {
      addCameraKeyframe(keyframes, Math.max(0, segment.startMs - transitionIn), wide, 'compose wide');
    }

    addCameraKeyframe(keyframes, segment.startMs, target, segment.reason || segment.cue);
    addCameraKeyframe(keyframes, segment.endMs, target, segment.reason || segment.cue);

    if (!hasNextConnection) {
      addCameraKeyframe(keyframes, Math.min(durationMs, segment.endMs + transitionOut), wide, 'return wide');
    }
  });

  addCameraKeyframe(keyframes, durationMs, wide, 'closing wide');
  return keyframes.sort((a, b) => a.atMs - b.atMs);
}

function validateCameraPlan(segments, keyframes, durationMs) {
  const warnings = [];
  const errors = [];
  let previous = null;
  let maxScale = 1;
  let maxPanSpeed = 0;
  let maxZoomSpeed = 0;

  for (const segment of segments) {
    if (segment.startMs < 0 || segment.endMs <= segment.startMs || segment.endMs > durationMs + 50) {
      errors.push(`${segment.id} has invalid timing.`);
    }
    if (![segment.x, segment.y, segment.scale].every(Number.isFinite)) {
      errors.push(`${segment.id} contains invalid camera values.`);
    }
    if (segment.scale > 2.45) {
      warnings.push(`${segment.id} is close to the maximum zoom.`);
    }
    if (previous) {
      const gap = segment.startMs - previous.endMs;
      const jump = Math.hypot(segment.x - previous.x, segment.y - previous.y);
      const transitionSeconds = Math.max(0.08, gap / 1000);
      maxPanSpeed = Math.max(maxPanSpeed, jump / transitionSeconds);
      maxZoomSpeed = Math.max(maxZoomSpeed, Math.abs(segment.scale - previous.scale) / transitionSeconds);
      if (gap < 220 && jump > 0.48) {
        warnings.push(`${segment.id} moves far from the previous shot.`);
      }
      if (gap > 8000) {
        warnings.push(`${segment.id} follows a long wide gap; confirm no key moment was missed.`);
      }
    }
    const segmentDurationMs = finiteNumber(segment.durationMs, segment.endMs - segment.startMs);
    if (segmentDurationMs < 780) {
      warnings.push(`${segment.id} is a short zoom and may feel abrupt.`);
    }
    maxScale = Math.max(maxScale, segment.scale);
    previous = segment;
  }

  if (segments.length === 0) {
    warnings.push('No confident attention events were found; the render stays wide.');
  }

  const zoomMs = segments.reduce((total, segment) => total + Math.max(0, segment.endMs - segment.startMs), 0);
  const coverage = durationMs > 0 ? zoomMs / durationMs : 0;
  if (segments.length > 0 && coverage > 0.72) {
    warnings.push('Zoom coverage is high; consider Subtle director style for calmer output.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      segmentCount: segments.length,
      keyframeCount: keyframes.length,
      zoomCoverage: roundTo(coverage, 3),
      maxScale: roundTo(maxScale, 3),
      maxPanSpeed: roundTo(maxPanSpeed, 3),
      maxZoomSpeed: roundTo(maxZoomSpeed, 3)
    }
  };
}

function buildRenderQa({ cameraPlan, attentionTimeline, timelinePlan, metadata, outputSize }) {
  const warnings = [...(cameraPlan.qa?.warnings || [])];
  const errors = [...(cameraPlan.qa?.errors || [])];
  const durationMs = Math.max(0, finiteNumber(timelinePlan.durationMs, 0));
  const effectiveFps = effectiveRecordingFps(timelinePlan.settings);
  const droppedFrames = finiteNumber(state.health.droppedFrames, 0);
  const attentionEvents = attentionTimeline.events.length;
  const segmentCount = cameraPlan.segments.length;
  const zoomCoverage = finiteNumber(cameraPlan.stats.zoomCoverage, 0);
  const fallbackStats = attentionTimeline.stats || {};
  const fallbackEvents = finiteNumber(fallbackStats.fallback_events, 0);
  const cursorQuality = fallbackStats.cursor_quality || {};
  const nativeStats = nativeTelemetryStats(state.telemetry.native);
  const nativeQuality = nativeStats.quality || {};

  if (attentionEvents >= 3 && segmentCount === 0 && timelinePlan.settings.autoZoom) {
    warnings.push('Attention telemetry exists but no zoom segments were selected.');
  }
  if (durationMs > 15000 && segmentCount === 0 && timelinePlan.settings.autoZoom) {
    warnings.push('Long recording has no camera moves.');
  }
  if (zoomCoverage < 0.08 && attentionEvents > 5 && timelinePlan.settings.autoZoom) {
    warnings.push('Zoom coverage is low for the amount of attention telemetry.');
  }
  if (zoomCoverage > 0.78) {
    warnings.push('Zoom coverage is very high; output may feel cramped.');
  }
  if (droppedFrames > Math.max(4, durationMs / 1000)) {
    warnings.push('Capture health reported elevated dropped frames.');
  }
  if (effectiveFps < finiteNumber(timelinePlan.settings.fps, effectiveFps)) {
    warnings.push('Effective FPS is lower than requested because of the selected recording engine/profile.');
  }
  if (fallbackEvents > 0) {
    warnings.push(`Director used ${fallbackStats.fallback_strategy || 'fallback'} attention because primary attention telemetry was empty.`);
  }
  if (cursorQuality.usable === false && cursorQuality.samples > 0) {
    warnings.push(`Cursor telemetry was ${cursorQuality.reason}; Smartie used fallback attention.`);
  }
  if (timelinePlan.settings.autoZoom && nativeQuality.tier && nativeQuality.tier !== 'precision') {
    warnings.push(`Native telemetry quality is ${nativeQuality.tier}; compositor precision adapter is not fully active.`);
  }

  return {
    schema: 'smartie.render_qa.v1',
    generated_at: new Date().toISOString(),
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      durationMs,
      outputWidth: outputSize.width,
      outputHeight: outputSize.height,
      effectiveFps,
      requestedFps: timelinePlan.settings.fps,
      droppedFrames,
      performanceMode: timelinePlan.settings.performanceMode,
      performanceResolvedMode: timelinePlan.settings.performanceResolvedMode || activePerformanceMode(timelinePlan.settings),
      performanceAdaptiveLevel: state.performance.adaptiveLevel,
      attentionEvents,
      primaryAttentionEvents: finiteNumber(fallbackStats.primary_events, attentionEvents),
      fallbackAttentionEvents: fallbackEvents,
      fallbackStrategy: fallbackStats.fallback_strategy || 'none',
      cursorTelemetryQuality: cursorQuality,
      nativeTelemetryQuality: nativeQuality,
      nativeTelemetryStats: nativeStats,
      cameraSegments: segmentCount,
      keyframes: cameraPlan.keyframes.length,
      zoomCoverage,
      maxScale: finiteNumber(cameraPlan.stats.maxScale, 1),
      renderPipeline: metadata.capture.renderPipeline,
      telemetry: {
        cursorSamples: state.telemetry.cursor.length,
        clickEvents: state.telemetry.clicks.length,
        keyboardEvents: state.telemetry.keyboard.length,
        motionEvents: state.telemetry.motion.length,
        accessibilityEvents: state.telemetry.accessibility.length,
        nativeEvents: state.telemetry.native.length
      }
    }
  };
}

function compileSmartDirectorPlan(timelinePlan, attentionTimeline, outputSize) {
  const settings = timelinePlan.settings;
  const durationMs = Math.max(0, Math.round(finiteNumber(timelinePlan.durationMs, 0)));
  const profile = directorStyleProfile(settings);
  const disabled = !settings.smartMaster || !settings.autoZoom || settings.focusMode === 'wide';
  let candidates = [];

  if (!disabled && durationMs > 0) {
    candidates = (attentionTimeline.events || [])
      .map((event) => directorCandidateFromEvent(event, settings, profile, durationMs))
      .filter(Boolean);
    candidates = mergeDirectorCandidates(candidates, profile);
    candidates = resolveDirectorOverlaps(candidates, profile);
    candidates = selectDirectorSegments(candidates, durationMs, profile);
  }

  const keyframes = buildCameraKeyframes(candidates, durationMs, profile);
  const qa = validateCameraPlan(candidates, keyframes, durationMs);

  return {
    schema: 'smartie.camera_plan.v1',
    version: 1,
    generated_at: new Date().toISOString(),
    settings: {
      director_style: settings.directorStyle,
      focus_mode: settings.focusMode,
      zoom_strength: settings.zoomStrength,
      transition_ms: profile.transitionMs,
      min_shot_ms: profile.minShotMs,
      threshold: profile.threshold,
      output_width: outputSize.width,
      output_height: outputSize.height,
      disabled
    },
    segments: candidates.map((segment) => ({
      id: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      durationMs: segment.endMs - segment.startMs,
      x: segment.x,
      y: segment.y,
      scale: segment.scale,
      cue: segment.cue,
      confidence: segment.confidence,
      score: segment.score,
      reason: segment.reason,
      source: segment.source,
      sourceCount: segment.sourceCount,
      editable: segment.editable
    })),
    keyframes,
    qa,
    stats: {
      ...qa.stats,
      sourceEvents: attentionTimeline.events.length,
      durationMs
    }
  };
}

function smoothstep(t) {
  const safe = clamp01(t);
  return safe * safe * (3 - 2 * safe);
}

function cameraFrameAt(cameraPlan, atMs) {
  const keyframes = cameraPlan && Array.isArray(cameraPlan.keyframes)
    ? cameraPlan.keyframes
    : [];
  if (keyframes.length === 0) {
    return null;
  }

  if (keyframes.length === 1 || atMs <= keyframes[0].atMs) {
    return {
      x: keyframes[0].x,
      y: keyframes[0].y,
      scale: keyframes[0].scale
    };
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const before = keyframes[index - 1];
    const after = keyframes[index];
    if (atMs > after.atMs) {
      continue;
    }

    const span = Math.max(1, after.atMs - before.atMs);
    const amount = smoothstep((atMs - before.atMs) / span);
    return {
      x: lerp(before.x, after.x, amount),
      y: lerp(before.y, after.y, amount),
      scale: lerp(before.scale, after.scale, amount)
    };
  }

  const last = keyframes[keyframes.length - 1];
  return {
    x: last.x,
    y: last.y,
    scale: last.scale
  };
}

function drawSmartTimelineFrame(settings, timelinePlan, atMs) {
  const sample = timelineSampleAt(timelinePlan.timeline, atMs);
  const cameraFrame = cameraFrameAt(timelinePlan.cameraPlan, atMs) || sample.frame;
  const cursorUsable = timelinePlan.telemetryQuality?.cursor?.usable !== false;

  state.renderContext = { atMs, cursorUsable };
  state.frame = { ...cameraFrame };
  state.pointer = {
    ...state.pointer,
    x: sample.pointer.x,
    y: sample.pointer.y
  };
  state.keys = sample.keys || [];

  drawVideoFrame(settings);
  drawPrivacyBlur(settings);
  if (cursorUsable) {
    drawTimelineCursorTrail(settings, atMs, timelinePlan.trail);
    drawCursorSpotlight(settings);
    drawTimelinePulses(settings, atMs, timelinePlan.pulses);
  }
  drawTimelineMarkerOverlay(settings, atMs, timelinePlan.markers);
  drawKeyboardOverlay(settings);
  drawTitleOverlay(settings);
  drawCueOverlay(settings);
}

function drawLoop(timestamp = performance.now()) {
  if (!state.drawing) {
    return;
  }

  const settings = state.recordingSettings || getSettings();
  const smartCanvasRecording = usesSmartCanvasRecording(settings);
  const recordingFps = effectiveRecordingFps(settings);
  const drawFps = effectiveDrawFps(settings);
  const frameBudget = 1000 / drawFps;

  if (state.lastDrawAt > 0 && timestamp - state.lastDrawAt < frameBudget * 0.92) {
    requestAnimationFrame(drawLoop);
    return;
  }

  state.lastDrawAt = timestamp;

  if (smartCanvasRecording) {
    scanMotionTarget(settings, timestamp);
    updateFrameHealth(timestamp, recordingFps);
    easeFrame(settings);
  } else {
    renderHealth();
  }

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (smartCanvasRecording) {
      drawVideoFrame(settings);
      drawPrivacyBlur(settings);
      drawCursorTrail(settings);
      drawCursorSpotlight(settings);
      drawPulse(settings);
      drawMarkerOverlay(settings);
      drawCameraBubble(settings);
      drawKeyboardOverlay(settings);
      drawTitleOverlay(settings);
      drawCueOverlay(settings);
    } else {
      drawNativePreviewFrame(settings);
    }

    elements.emptyState.hidden = true;
    requestRecordingFrame();
  } else {
    drawWaitingFrame();
    requestRecordingFrame();
  }

  requestAnimationFrame(drawLoop);
}

async function openCaptureStream(settings = getSettings()) {
  const captureSize = captureSizeForSettings(settings);
  const captureWidth = Math.max(640, captureSize.width);
  const captureHeight = Math.max(480, captureSize.height);
  const captureStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: state.selectedSource.id,
        minWidth: Math.min(1280, captureWidth),
        minHeight: Math.min(720, captureHeight),
        maxWidth: captureWidth,
        maxHeight: captureHeight,
        maxFrameRate: effectiveRecordingFps(settings)
      }
    }
  });

  tuneScreenVideoTrack(captureStream.getVideoTracks()[0]);
  video.srcObject = captureStream;
  await video.play();
  return captureStream;
}

async function openMicrophoneStream(settings = getSettings()) {
  if (!settings.microphone) {
    return null;
  }

  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  };

  if (settings.micDevice) {
    audio.deviceId = { exact: settings.micDevice };
  }

  const inputStream = await navigator.mediaDevices.getUserMedia({
    audio,
    video: false
  });

  refreshMediaDevices({ quiet: true }).catch((error) => {
    console.warn('Could not refresh media devices after microphone permission.', error);
  });
  state.micInputStream = inputStream;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContext();
    state.micSource = state.audioContext.createMediaStreamSource(inputStream);
    state.micGateNode = createNoiseGateNode(state.audioContext);
    state.micGainNode = state.audioContext.createGain();
    state.micAnalyser = state.audioContext.createAnalyser();
    state.micAnalyser.fftSize = 512;

    const destination = state.audioContext.createMediaStreamDestination();
    state.micSource.connect(state.micGateNode);
    state.micGateNode.connect(state.micGainNode);
    state.micGainNode.connect(destination);
    state.micGainNode.connect(state.micAnalyser);
    applyMicSettings();
    startMicMeter();
    return destination.stream;
  } catch (error) {
    console.warn('Falling back to direct microphone capture.', error);
    resetMicMeter('Mic live');
    return inputStream;
  }
}

async function openCameraStream(settings = getSettings()) {
  if (!settings.cameraBubble) {
    return null;
  }

  try {
    const profile = performanceProfile(settings);
    const videoConstraints = {
      width: { ideal: profile.cameraWidth },
      height: { ideal: profile.cameraHeight },
      frameRate: { ideal: profile.cameraFps, max: profile.cameraFps }
    };

    if (settings.cameraDevice) {
      videoConstraints.deviceId = { exact: settings.cameraDevice };
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints
    });

    refreshMediaDevices({ quiet: true }).catch((error) => {
      console.warn('Could not refresh media devices after camera permission.', error);
    });
    cameraVideo.srcObject = stream;
    await cameraVideo.play();
    return stream;
  } catch (error) {
    console.warn('Camera bubble disabled because camera capture failed.', error);
    return null;
  }
}

function stopStream(stream) {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function createRecordingChunkSession(settings, mimeType) {
  const session = await window.smartie.createRecordingSession({
    suggestedName: buildSuggestedName(settings),
    mimeType: mimeType || 'video/webm'
  });
  state.recordingSessionId = session.id;
  state.recordingSessionInfo = session;
  state.chunkWriteQueue = Promise.resolve();
  state.chunkWriteError = null;
  state.chunkSequence = 0;
  return session;
}

function queueRecordingChunk(blob) {
  if (!blob || blob.size === 0) {
    return;
  }

  if (!state.recordingSessionId) {
    state.chunks.push(blob);
    return;
  }

  const sessionId = state.recordingSessionId;
  const sequence = state.chunkSequence;
  state.chunkSequence += 1;
  state.chunkWriteQueue = state.chunkWriteQueue
    .then(async () => {
      if (state.chunkWriteError) {
        return;
      }

      const bytes = new Uint8Array(await blob.arrayBuffer());
      await window.smartie.appendRecordingChunk({
        sessionId,
        sequence,
        bytes
      });
    })
    .catch((error) => {
      state.chunkWriteError = error;
    });
}

async function finalizeRecordingChunkSession() {
  if (state.chunkWriteError) {
    throw state.chunkWriteError;
  }

  await state.chunkWriteQueue;
  if (state.chunkWriteError) {
    throw state.chunkWriteError;
  }

  if (!state.recordingSessionId) {
    return null;
  }

  const session = await window.smartie.finalizeRecordingSession(state.recordingSessionId);
  state.recordingSessionInfo = session;
  return session;
}

async function discardRecordingChunkSession(sessionId = state.recordingSessionId) {
  if (!sessionId || typeof window.smartie.discardRecordingSession !== 'function') {
    return;
  }

  try {
    await window.smartie.discardRecordingSession(sessionId);
  } catch (error) {
    console.warn('Could not discard temporary recording session.', error);
  }
}

async function runCountdown(seconds) {
  if (seconds <= 0) {
    return;
  }

  elements.countdown.hidden = false;

  for (let i = seconds; i > 0; i -= 1) {
    elements.countdown.textContent = String(i);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 1000);
    });
  }

  elements.countdown.hidden = true;
}

function recorderMimeType() {
  const candidates = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm'
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function waitForMediaEvent(target, eventName) {
  return new Promise((resolve, reject) => {
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(target.error?.message || `Media ${eventName} failed.`));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener('error', onError);
    };

    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

function stopRecorder(recorder) {
  return new Promise((resolve) => {
    if (!recorder || recorder.state === 'inactive') {
      resolve();
      return;
    }

    recorder.addEventListener('stop', resolve, { once: true });
    recorder.stop();
  });
}

async function renderSmartEffectsVideo(rawBlob, timelinePlan) {
  const settings = timelinePlan.settings;
  const mimeType = recorderMimeType();
  const outputSize = canvasSizeForSettings(settings);
  const objectUrl = URL.createObjectURL(rawBlob);
  const previousSrcObject = video.srcObject;
  const previousSrc = video.currentSrc || video.src;
  const previousMuted = video.muted;
  const previousLoop = video.loop;
  const previousPlaybackRate = video.playbackRate;
  const chunks = [];
  let frameId = null;
  let lastStatusAt = 0;
  let renderStream = null;
  let recorder = null;

  try {
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    video.pause();
    video.srcObject = null;
    video.muted = true;
    video.loop = false;
    video.playbackRate = 1;
    video.src = objectUrl;
    video.load();
    await waitForMediaEvent(video, 'loadedmetadata');

    const fps = effectiveRecordingFps(settings);
    renderStream = canvas.captureStream(fps);
    const recorderOptions = {
      videoBitsPerSecond: recordingBitrate(settings)
    };
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    const [renderTrack] = renderStream.getVideoTracks();
    tuneScreenVideoTrack(renderTrack);
    recorder = new MediaRecorder(renderStream, recorderOptions);
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.start(1000);
    const ended = waitForMediaEvent(video, 'ended');
    const draw = () => {
      const atMs = Math.min(timelinePlan.durationMs, video.currentTime * 1000);
      drawSmartTimelineFrame(settings, timelinePlan, atMs);
      if (renderTrack && typeof renderTrack.requestFrame === 'function') {
        renderTrack.requestFrame();
      }

      if (performance.now() - lastStatusAt > 500) {
        lastStatusAt = performance.now();
        const progress = timelinePlan.durationMs > 0
          ? Math.min(99, Math.round((atMs / timelinePlan.durationMs) * 100))
          : 99;
        setStatus(`Rendering smart effects ${progress}%`);
      }

      if (!video.ended) {
        frameId = requestAnimationFrame(draw);
      }
    };

    draw();
    await video.play();
    await ended;
    drawSmartTimelineFrame(settings, timelinePlan, timelinePlan.durationMs);
    if (renderTrack && typeof renderTrack.requestFrame === 'function') {
      renderTrack.requestFrame();
    }
    await stopRecorder(recorder);
    return new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' });
  } finally {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
    video.pause();
    video.removeAttribute('src');
    video.srcObject = previousSrcObject;
    if (!previousSrcObject && previousSrc) {
      video.src = previousSrc;
    }
    video.muted = previousMuted;
    video.loop = previousLoop;
    video.playbackRate = previousPlaybackRate;
    video.load();
    if (recorder && recorder.state !== 'inactive') {
      try {
        await stopRecorder(recorder);
      } catch (error) {
        console.warn('Could not stop smart render recorder.', error);
      }
    }
    stopStream(renderStream);
    state.renderContext = null;
    state.keys = [];
    URL.revokeObjectURL(objectUrl);
    resizeCanvasForProfile();
    drawWaitingFrame();
  }
}

function buildSuggestedName(settings = getSettings()) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const title = fileSafeTitle(settings.takeTitle);
  const outputLayout = outputLayoutForRecording(settings);
  const layout = outputLayout !== 'landscape'
    ? `${outputLayout}-`
    : '';
  return `smartie-${title ? `${title}-` : ''}${layout}${stamp}.webm`;
}

function buildSnapshotName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `smartie-snapshot-${stamp}.png`;
}

function canvasPngBytes() {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Could not render snapshot.'));
        return;
      }

      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, 'image/png');
  });
}

function buildRecordingMetadata({
  suggestedName,
  durationMs,
  markers,
  settings,
  outputSize: outputSizeOverride = null,
  renderPipeline = 'live',
  timelineSampleCount = 0
}) {
  const outputSize = outputSizeOverride || state.recordedVideoSize || canvasSizeForSettings(settings);

  return {
    app: 'Smartie',
    version: 1,
    createdAt: new Date().toISOString(),
    suggestedName,
    source: state.selectedSource
      ? {
          id: state.selectedSource.id,
          name: state.selectedSource.name,
          displayId: state.selectedSource.displayId
        }
      : null,
    durationMs,
    duration: formatTime(durationMs),
    take: {
      title: settings.takeTitle,
      titleOverlay: settings.titleOverlay,
      titleDurationMs: settings.titleDuration,
      cueOverlay: settings.cueOverlay,
      cueText: settings.cueText,
      cuePosition: settings.cuePosition
    },
    markers,
    smartStack: {
      enabled: settings.smartMaster,
      autoZoom: settings.autoZoom,
      cursorSpotlight: settings.cursorSpotlight,
      cursorTrail: settings.cursorTrail,
      motionFocus: settings.motionFocus,
      keyboardOverlay: settings.keyboardOverlay,
      titleOverlay: settings.titleOverlay,
      cueOverlay: settings.cueOverlay,
      clickPulse: settings.clickPulse,
      autoMarkers: settings.autoMarkers,
      idleWide: settings.idleWide,
      privacyBlur: settings.privacyBlur,
      privacyRegion: settings.privacyRegion,
      privacyStrength: settings.privacyStrength,
      focusMode: settings.focusMode,
      directorStyle: settings.directorStyle,
      zoomStrength: settings.zoomStrength,
      motionSensitivity: settings.motionSensitivity,
      smoothing: settings.smoothing
    },
    capture: {
      quality: settings.quality,
      outputLayout: outputLayoutForRecording(settings),
      requestedOutputLayout: settings.outputLayout,
      outputWidth: outputSize.width,
      outputHeight: outputSize.height,
      fps: effectiveRecordingFps(settings),
      requestedFps: settings.fps,
      smoothRecording: settings.smoothRecording,
      recordingEngine: settings.recordingEngine,
      requestedRecordingEngine: settings.requestedRecordingEngine || settings.recordingEngine,
      renderPipeline,
      timelineSampleCount,
      performanceMode: settings.smoothRecording ? settings.performanceMode : 'quality',
      performanceResolvedMode: settings.performanceResolvedMode || activePerformanceMode(settings),
      performanceTier: settings.performanceTier || state.performance.systemProfile?.tier || null,
      performanceGovernor: settings.performanceGovernor || null,
      nativeTelemetry: {
        session: state.telemetry.nativeSession?.id || null,
        quality: state.telemetry.nativeQuality || null
      },
      requestedQuality: settings.requestedQuality || settings.quality,
      manualFramePump: Boolean(state.canvasVideoTrack && typeof state.canvasVideoTrack.requestFrame === 'function'),
      bitrate: recordingBitrate(settings),
      microphone: settings.microphone,
      micDevice: settings.micDevice || 'default',
      micDeviceLabel: settings.micDeviceLabel,
      micGain: settings.micGain,
      noiseGate: settings.noiseGate,
      noiseGateThreshold: settings.noiseGateThreshold,
      cameraBubble: settings.cameraBubble,
      cameraDevice: settings.cameraDevice || 'default',
      cameraDeviceLabel: settings.cameraDeviceLabel,
      cameraPosition: settings.cameraPosition,
      saveMode: settings.saveMode,
      exportFormat: settings.exportFormat
    },
    health: {
      finalFps: state.health.fps,
      droppedFrames: state.health.droppedFrames
    }
  };
}

async function startRecording() {
  if (!state.selectedSource || state.recording) {
    return;
  }

  try {
    syncControls();
    setStatus('Preparing capture');
    if (!state.performance.systemProfile) {
      await hydratePerformanceProfile();
    }
    const settings = prepareRecordingSettings(getSettings());
    resizeCanvasForProfile(settings);
    state.recordingSettings = { ...settings };
    state.stoppedDurationMs = 0;
    await runCountdown(settings.countdownSeconds);
    await hideWindowForRecording(settings);

    state.captureStream = await openCaptureStream(settings);
    state.micStream = await openMicrophoneStream(settings);
    state.cameraStream = await openCameraStream(settings);
    state.canvasStream = usesSmartCanvasRecording(settings)
      ? createRecordingCanvasStream(settings)
      : createNativeRecordingStream();

    if (state.canvasStream.getVideoTracks().length === 0) {
      throw new Error('Could not attach a video track to the recorder.');
    }

    if (state.micStream) {
      for (const track of state.micStream.getAudioTracks()) {
        state.canvasStream.addTrack(track);
      }
    }

    const [recordedVideoTrack] = state.canvasStream.getVideoTracks();
    const trackSettings = recordedVideoTrack ? recordedVideoTrack.getSettings() : {};
    state.recordedVideoSize = {
      width: trackSettings.width || canvas.width,
      height: trackSettings.height || canvas.height
    };

    const mimeType = recorderMimeType();
    const recorderOptions = {
      videoBitsPerSecond: recordingBitrate(settings)
    };
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    await createRecordingChunkSession(settings, state.recordingMimeType || mimeType || 'video/webm');

    state.chunks = [];
    state.markers = [];
    state.activeMarker = null;
    state.lastAutoMarkerAt = -Infinity;
    state.lastPulseAt = -Infinity;
    state.lastDrawAt = 0;
    state.discardRequested = false;
    state.smartTimeline = [];
    state.smartTrail = [];
    state.smartPulses = [];
    resetTelemetry();
    await startNativeTelemetrySession(settings);
    state.mediaRecorder = new MediaRecorder(state.canvasStream, recorderOptions);
    state.recordingMimeType = state.mediaRecorder.mimeType || mimeType || 'video/webm';

    state.mediaRecorder.addEventListener('dataavailable', (event) => {
      queueRecordingChunk(event.data);
    });

    state.mediaRecorder.addEventListener('stop', saveRecording);
    state.mediaRecorder.start(1000);

    state.recording = true;
    state.paused = false;
    state.startedAt = Date.now();
    state.pausedAt = 0;
    state.pausedDuration = 0;
    resetPerformanceGovernor();
    resetHealth();
    state.timerId = window.setInterval(updateTimer, 250);
    state.drawing = true;
    state.frame = { scale: 1, x: 0.5, y: 0.5 };
    resetAttentionEngine();
    state.motionTarget.previousFrame = null;
    state.motionTarget.strength = 0;
    state.trail = [];
    startPointerPolling();
    startSemanticPolling();
    startSmartTimeline(settings);
    if (usesSmartCanvasRecording(settings) || !settings.hideWhileRecording) {
      requestAnimationFrame(drawLoop);
    } else {
      state.drawing = false;
      elements.emptyState.hidden = true;
      renderHealth();
    }

    elements.recordingDot.classList.add('active');
    setStatus(settings.performanceGovernor?.notes?.length
      ? `Recording (${settings.performanceGovernor.label})`
      : 'Recording');
    syncControls();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Recording failed');
    cleanupRecording();
    syncControls();
  }
}

function togglePauseRecording() {
  if (!state.recording || !state.mediaRecorder) {
    return;
  }

  if (state.paused) {
    if (state.mediaRecorder.state === 'paused') {
      state.mediaRecorder.resume();
    }

    state.pausedDuration += Date.now() - state.pausedAt;
    state.paused = false;
    state.pausedAt = 0;
    state.health.lastFrameAt = 0;
    renderHealth();
    setStatus('Recording');
  } else {
    if (state.mediaRecorder.state === 'recording') {
      state.mediaRecorder.pause();
    }

    state.paused = true;
    state.pausedAt = Date.now();
    renderHealth();
    setStatus('Paused');
  }

  updateTimer();
  syncControls();
}

function stopRecording() {
  if (!state.mediaRecorder || !state.recording) {
    return;
  }

  if (state.paused) {
    state.pausedDuration += Date.now() - state.pausedAt;
  }

  setStatus('Finalizing');
  state.stoppedDurationMs = recordingElapsedMs();
  stopSmartTimeline();
  state.mediaRecorder.stop();
  state.recording = false;
  state.paused = false;
  updateTimer();
  syncControls();
}

function cancelRecording() {
  if (!state.mediaRecorder || !state.recording) {
    return;
  }

  state.discardRequested = true;
  setStatus('Discarding');
  stopRecording();
}

function dropMarker() {
  if (!state.recording) {
    return;
  }

  const marker = pushRecordingMarker({
    kind: 'manual',
    label: `Marker ${state.markers.filter((item) => item.kind !== 'smart-moment').length + 1}`,
    reason: 'manual'
  });

  if (marker) {
    setStatus(`${marker.label} dropped`);
  }
}

async function captureSnapshot() {
  try {
    const settings = getSettings();
    const result = await window.smartie.saveSnapshot({
      bytes: await canvasPngBytes(),
      suggestedName: buildSnapshotName(),
      saveMode: settings.saveMode,
      outputDir: settings.outputDir
    });

    if (result.canceled) {
      setStatus('Snapshot canceled');
      return;
    }

    state.lastRecordingPath = result.filePath;
    setStatus('Snapshot saved');
    syncControls();
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Snapshot failed');
  }
}

function toggleSmartStack() {
  elements.smartMaster.checked = !elements.smartMaster.checked;
  setStatus(elements.smartMaster.checked ? 'Smart features enabled' : 'Smart features disabled');
  saveSettings();
  syncControls();
}

function handleGlobalShortcut(action) {
  if (action === 'toggle-recording') {
    if (state.recording) {
      stopRecording();
    } else {
      startRecording();
    }
  } else if (action === 'toggle-pause') {
    togglePauseRecording();
  } else if (action === 'discard-recording') {
    cancelRecording();
  } else if (action === 'toggle-smart-stack') {
    toggleSmartStack();
  } else if (action === 'toggle-mic-mute') {
    toggleMicMute();
  } else if (action === 'toggle-focus-lock') {
    toggleFocusLock();
  } else if (action === 'drop-marker') {
    dropMarker();
  } else if (action === 'capture-snapshot') {
    captureSnapshot();
  } else if (action === 'toggle-window-visibility') {
    window.smartie.toggleWindowVisibility().catch((error) => {
      console.warn('Could not toggle Smartie window visibility.', error);
    });
  }
}

async function reportShortcutRegistration() {
  const shortcuts = await window.smartie.getShortcuts();
  const failed = shortcuts.filter((shortcut) => !shortcut.registered);

  if (failed.length > 0) {
    console.warn('Some Smartie global shortcuts were not registered.', failed);
  }
}

async function hydratePerformanceProfile() {
  if (typeof window.smartie.getPerformanceProfile !== 'function') {
    return;
  }

  try {
    const profile = await window.smartie.getPerformanceProfile();
    state.performance.systemProfile = profile;
    state.performance.activeMode = recommendedPerformanceMode();
    syncControls();
  } catch (error) {
    console.warn('Could not inspect Smartie performance profile.', error);
    state.performance.systemProfile = {
      tier: 'unknown',
      recommendedMode: 'balanced',
      reasons: ['system profile unavailable']
    };
    state.performance.activeMode = 'balanced';
    syncControls();
  }
}

function bestTelemetryAdapter() {
  const status = state.telemetryAdapter;
  if (!status || !Array.isArray(status.adapters)) {
    return null;
  }

  return status.adapters.find((adapter) => adapter.id === status.bestAdapter)
    || status.adapters.find((adapter) => adapter.recommended)
    || null;
}

function canInstallTelemetryAdapter() {
  const adapter = bestTelemetryAdapter();
  return Boolean(adapter && adapter.id === 'gnome-shell' && adapter.sourceAvailable && adapter.commandAvailable);
}

function renderTelemetryAdapterStatus() {
  if (!elements.telemetryAdapterStatus) {
    return;
  }

  const field = elements.telemetryAdapterStatus.closest('.telemetry-field');
  field?.classList.remove('ready', 'warn');
  const status = state.telemetryAdapter;
  const adapter = bestTelemetryAdapter();
  if (!status) {
    elements.telemetryAdapterStatus.textContent = 'Checking...';
    elements.installTelemetryAdapter.textContent = 'Enable';
    return;
  }

  if (adapter?.id === 'gnome-shell' && adapter.enabled) {
    elements.telemetryAdapterStatus.textContent = 'GNOME precision ready';
    elements.installTelemetryAdapter.textContent = 'Reinstall';
    field?.classList.add('ready');
    return;
  }

  if (adapter?.id === 'gnome-shell' && adapter.pendingRestart) {
    elements.telemetryAdapterStatus.textContent = 'GNOME pending login';
    elements.installTelemetryAdapter.textContent = 'Reinstall';
    field?.classList.add('warn');
    return;
  }

  if (status.ready) {
    elements.telemetryAdapterStatus.textContent = 'Native helper ready';
    elements.installTelemetryAdapter.textContent = 'Enable';
    field?.classList.add('ready');
    return;
  }

  if (adapter?.id === 'gnome-shell') {
    elements.telemetryAdapterStatus.textContent = adapter.installed ? 'GNOME adapter disabled' : 'GNOME adapter available';
    elements.installTelemetryAdapter.textContent = adapter.installed ? 'Enable' : 'Install';
    field?.classList.add('warn');
    return;
  }

  if (adapter?.id === 'kwin') {
    elements.telemetryAdapterStatus.textContent = 'KWin helper required';
    elements.installTelemetryAdapter.textContent = 'Enable';
    field?.classList.add('warn');
    return;
  }

  elements.telemetryAdapterStatus.textContent = 'Fallback telemetry';
  elements.installTelemetryAdapter.textContent = 'Enable';
  field?.classList.add('warn');
}

async function refreshTelemetryAdapterStatus() {
  if (typeof window.smartie.getTelemetryAdapterStatus !== 'function') {
    return;
  }

  try {
    state.telemetryAdapter = await window.smartie.getTelemetryAdapterStatus();
    renderTelemetryAdapterStatus();
    syncControls();
  } catch (error) {
    console.warn('Could not inspect Smartie telemetry adapter.', error);
    state.telemetryAdapter = null;
    if (elements.telemetryAdapterStatus) {
      elements.telemetryAdapterStatus.textContent = 'Telemetry check failed';
    }
    syncControls();
  }
}

async function installTelemetryAdapter() {
  if (typeof window.smartie.installTelemetryAdapter !== 'function') {
    return;
  }

  try {
    elements.installTelemetryAdapter.disabled = true;
    elements.telemetryAdapterStatus.textContent = 'Installing...';
    const result = await window.smartie.installTelemetryAdapter();
    state.telemetryAdapter = result.status || await window.smartie.getTelemetryAdapterStatus();
    renderTelemetryAdapterStatus();
    setStatus(result.warning ? 'Telemetry adapter installed; enable warning recorded' : 'Telemetry adapter enabled');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Telemetry adapter install failed');
    await refreshTelemetryAdapterStatus();
  } finally {
    syncControls();
  }
}

function cleanupRecording({ keepSession = false } = {}) {
  const sessionToDiscard = keepSession ? null : state.recordingSessionId;
  state.drawing = false;
  state.recording = false;
  state.paused = false;
  state.markers = [];
  state.activeMarker = null;
  state.lastAutoMarkerAt = -Infinity;
  state.lastPulseAt = -Infinity;
  state.lastDrawAt = 0;
  stopPointerPolling();
  stopSemanticPolling();
  stopNativeTelemetrySession();
  stopSmartTimeline();
  stopMicMeter();
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopStream(state.captureStream);
  stopStream(state.micInputStream);
  stopStream(state.micStream);
  stopStream(state.cameraStream);
  stopStream(state.canvasStream);
  state.captureStream = null;
  state.micInputStream = null;
  state.micStream = null;
  state.micSource = null;
  if (state.micGateNode) {
    state.micGateNode.onaudioprocess = null;
  }
  state.micGateNode = null;
  state.micGainNode = null;
  state.micAnalyser = null;
  if (state.audioContext) {
    state.audioContext.close().catch((error) => console.warn('Could not close audio context.', error));
    state.audioContext = null;
  }
  state.cameraStream = null;
  state.canvasStream = null;
  state.canvasVideoTrack = null;
  state.mediaRecorder = null;
  if (!keepSession) {
    state.recordingSessionId = null;
    state.recordingSessionInfo = null;
    state.chunkWriteQueue = Promise.resolve();
    state.chunkWriteError = null;
    state.chunkSequence = 0;
  }
  state.recordingMimeType = null;
  state.recordedVideoSize = null;
  state.recordingSettings = null;
  state.startedAt = 0;
  state.pausedAt = 0;
  state.pausedDuration = 0;
  state.stoppedDurationMs = 0;
  state.smartTimeline = [];
  state.smartTrail = [];
  state.smartPulses = [];
  resetTelemetry();
  state.renderContext = null;
  resetAttentionEngine();
  video.srcObject = null;
  cameraVideo.srcObject = null;
  elements.recordingDot.classList.remove('active');
  elements.emptyState.hidden = false;
  restoreRecordingWindow().catch((error) => {
    console.warn('Could not restore Smartie window.', error);
  });
  resetMicMeter(elements.microphone.checked ? 'Mic armed' : 'Mic off');
  resetHealth();
  resetPerformanceGovernor();
  if (sessionToDiscard) {
    discardRecordingChunkSession(sessionToDiscard);
  }
}

async function saveRecording() {
  if (state.discardRequested) {
    cleanupRecording();
    state.chunks = [];
    state.discardRequested = false;
    setStatus('Recording discarded');
    syncControls();
    return;
  }

  const mimeType = state.recordingMimeType || recorderMimeType() || 'video/webm';
  const settings = state.recordingSettings || getSettings();
  const durationMs = state.stoppedDurationMs || recordingElapsedMs();
  const markers = state.markers.slice();
  const sessionId = state.recordingSessionId;
  let sessionSubmitted = false;

  try {
    await finalizeRecordingChunkSession();
  } catch (error) {
    console.error('Could not flush recording chunks.', error);
    cleanupRecording();
    state.chunks = [];
    setStatus(error.message || 'Recording write failed');
    syncControls();
    return;
  }

  const timelinePlan = {
    settings,
    durationMs,
    markers,
    timeline: refineSmartTimeline(state.smartTimeline.slice()),
    trail: state.smartTrail.slice(),
    pulses: state.smartPulses.slice(),
    telemetry: {
      cursor: state.telemetry.cursor.slice(),
      clicks: state.telemetry.clicks.slice(),
      keyboard: state.telemetry.keyboard.slice(),
      motion: state.telemetry.motion.slice(),
      accessibility: state.telemetry.accessibility.slice(),
      native: state.telemetry.native.slice()
    }
  };
  const shouldPostRender = usesHybridSmartRender(settings)
    && settings.smartMaster
    && timelinePlan.timeline.length > 1
    && !state.discardRequested;
  const suggestedName = buildSuggestedName(settings);
  const rawOutputSize = state.recordedVideoSize || canvasSizeForSettings(settings);
  const finalOutputSize = shouldPostRender
    ? canvasSizeForSettings(settings)
    : rawOutputSize;
  const metadata = buildRecordingMetadata({
    suggestedName,
    durationMs,
    markers,
    settings,
    outputSize: finalOutputSize,
    renderPipeline: shouldPostRender ? 'post-render' : (usesSmartCanvasRecording(settings) ? 'live-canvas' : 'native'),
    timelineSampleCount: timelinePlan.timeline.length
  });
  const attentionTimeline = buildAttentionTimeline(timelinePlan, finalOutputSize);
  timelinePlan.telemetryQuality = {
    cursor: attentionTimeline.stats?.cursor_quality || cursorTelemetryQuality(timelinePlan.telemetry.cursor, durationMs)
  };
  const cameraPlan = compileSmartDirectorPlan(timelinePlan, attentionTimeline, finalOutputSize);
  timelinePlan.cameraPlan = cameraPlan;
  const renderQa = buildRenderQa({
    cameraPlan,
    attentionTimeline,
    timelinePlan,
    metadata,
    outputSize: finalOutputSize
  });
  const projectArtifacts = buildProjectArtifacts({
    durationMs,
    outputSize: finalOutputSize,
    settings,
    cameraPlan,
    attentionTimeline,
    renderQa
  });
  metadata.director = {
    schema: cameraPlan.schema,
    style: settings.directorStyle,
    segmentCount: cameraPlan.segments.length,
    keyframeCount: cameraPlan.keyframes.length,
    attentionEventCount: attentionTimeline.events.length,
    qa: cameraPlan.qa,
    renderQa,
    stats: cameraPlan.stats
  };
  metadata.telemetry = {
    cursorSamples: projectArtifacts.cursorTimeline.samples.length,
    clickEvents: projectArtifacts.clickTimeline.events.length,
    keyboardEvents: projectArtifacts.keyboardTimeline.events.length,
    motionEvents: projectArtifacts.motionTimeline.events.length,
    accessibilityEvents: projectArtifacts.accessibilityTimeline.events.length,
    nativeEvents: projectArtifacts.nativeTelemetryTimeline.events.length,
    nativeQuality: projectArtifacts.nativeTelemetryTimeline.stats.quality
  };

  cleanupRecording({ keepSession: Boolean(sessionId) });

  try {
    let outputBytes = null;
    let outputSessionId = sessionId;
    let audioSourceSessionId = null;

    if (shouldPostRender) {
      try {
        setStatus('Rendering smart effects 0%');
        const rawSource = sessionId
          ? await window.smartie.readRecordingSession(sessionId)
          : {
              bytes: new Uint8Array(await new Blob(state.chunks, { type: mimeType }).arrayBuffer()),
              mimeType
            };
        const rawBlob = new Blob([rawSource.bytes], { type: rawSource.mimeType || mimeType });
        const outputBlob = await renderSmartEffectsVideo(rawBlob, timelinePlan);
        outputBytes = new Uint8Array(await outputBlob.arrayBuffer());
        outputSessionId = null;
        audioSourceSessionId = sessionId;
        metadata.capture.audioMux = 'ffmpeg';
      } catch (error) {
        console.error('Smart post-render failed; saving native recording instead.', error);
        outputSessionId = sessionId;
        outputBytes = null;
        audioSourceSessionId = null;
        metadata.capture.renderPipeline = 'native-fallback';
        metadata.capture.renderError = error.message || 'Smart post-render failed';
        metadata.capture.outputWidth = rawOutputSize.width;
        metadata.capture.outputHeight = rawOutputSize.height;
        metadata.director.renderQa.warnings.push('Smart post-render failed; saved the native recording instead.');
        metadata.director.renderQa.metrics.renderPipeline = 'native-fallback';
        projectArtifacts.renderQa = metadata.director.renderQa;
      }
    }

    if (!outputSessionId && !outputBytes) {
      outputBytes = new Uint8Array(await new Blob(state.chunks, { type: mimeType }).arrayBuffer());
    }

    setStatus(audioSourceSessionId ? 'Muxing audio' : 'Saving');
    sessionSubmitted = Boolean(outputSessionId || audioSourceSessionId);
    const result = await window.smartie.saveRecording({
      bytes: outputBytes,
      sessionId: outputSessionId,
      audioSourceSessionId,
      suggestedName,
      saveMode: settings.saveMode,
      outputDir: settings.outputDir,
      metadata,
      attentionTimeline,
      cameraPlan,
      projectArtifacts,
      exportFormat: settings.exportFormat
    });

    if (result.canceled) {
      setStatus('Recording discarded');
      return;
    }

    state.lastRecordingPath = result.filePath;
    state.lastSmartProjectPath = result.projectPath || null;
    state.lastCameraPlan = cameraPlan;
    state.lastProjectArtifacts = projectArtifacts;
    rememberRecording({
      filePath: result.filePath,
      metadataPath: result.metadataPath,
      chaptersPath: result.chaptersPath,
      mp4Path: result.mp4Path,
      projectPath: result.projectPath,
      sourceName: state.selectedSource ? state.selectedSource.name : null,
      takeTitle: settings.takeTitle,
      durationMs,
      markers,
      createdAt: new Date().toISOString()
    });
    renderDirectorPlan(cameraPlan);
    if (result.projectError) {
      setStatus(result.mp4Path ? 'Saved + MP4 (project failed)' : 'Saved (project failed)');
    } else if (result.projectPath) {
      setStatus(result.mp4Path ? 'Saved + MP4 + Smartie project' : 'Saved + Smartie project');
    } else {
      setStatus(result.mp4Path ? 'Saved + MP4' : 'Saved');
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Save failed');
    if (sessionId && !sessionSubmitted) {
      await discardRecordingChunkSession(sessionId);
    }
  } finally {
    state.chunks = [];
    state.recordingSessionId = null;
    state.recordingSessionInfo = null;
    state.chunkWriteQueue = Promise.resolve();
    state.chunkWriteError = null;
    state.chunkSequence = 0;
    syncControls();
  }
}

function normalizeKey(event) {
  if (event.key === ' ') {
    return 'Space';
  }

  if (event.key.length === 1) {
    return event.key.toUpperCase();
  }

  return event.key.replace('Arrow', '');
}

function updateKeyOverlay(event) {
  const keys = [];
  if (event.ctrlKey) {
    keys.push('Ctrl');
  }
  if (event.altKey) {
    keys.push('Alt');
  }
  if (event.shiftKey) {
    keys.push('Shift');
  }
  if (event.metaKey) {
    keys.push('Super');
  }

  const mainKey = normalizeKey(event);
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    keys.push(mainKey);
  }

  state.keys = keys.slice(-4);
  if (state.recording && !state.paused && state.keys.length > 0) {
    const atMs = recordingElapsedMs();
    boundedPush(state.telemetry.keyboard, {
      time: roundTo(atMs / 1000, 3),
      time_ms: Math.round(atMs),
      keys: state.keys.slice(),
      key: normalizeKey(event),
      modifiers: {
        ctrl: event.ctrlKey,
        alt: event.altKey,
        shift: event.shiftKey,
        meta: event.metaKey
      }
    }, performanceProfile(state.recordingSettings || getSettings()).maxKeyboardEvents);
  }
  window.clearTimeout(updateKeyOverlay.clearId);
  updateKeyOverlay.clearId = window.setTimeout(() => {
    state.keys = [];
  }, 1400);
}

elements.refreshSources.addEventListener('click', refreshSources);
elements.startRecording.addEventListener('click', startRecording);
elements.pauseRecording.addEventListener('click', togglePauseRecording);
elements.dropMarker.addEventListener('click', dropMarker);
elements.captureSnapshot.addEventListener('click', captureSnapshot);
elements.stopRecording.addEventListener('click', stopRecording);
elements.cancelRecording.addEventListener('click', cancelRecording);
elements.revealRecording.addEventListener('click', () => window.smartie.revealFile(state.lastRecordingPath));
elements.revealProject.addEventListener('click', () => window.smartie.revealFile(state.lastSmartProjectPath));
elements.chooseOutputFolder.addEventListener('click', chooseOutputFolder);
elements.installTelemetryAdapter.addEventListener('click', installTelemetryAdapter);
elements.refreshTelemetryAdapter.addEventListener('click', refreshTelemetryAdapterStatus);
elements.clearRecent.addEventListener('click', clearRecentRecordings);
elements.micMute.addEventListener('click', toggleMicMute);
elements.micDevice.addEventListener('change', () => {
  state.preferredMicDevice = elements.micDevice.value;
});
elements.cameraDevice.addEventListener('change', () => {
  state.preferredCameraDevice = elements.cameraDevice.value;
});
elements.refreshDevices.addEventListener('click', () => {
  refreshMediaDevices().catch((error) => {
    console.error(error);
    setStatus(error.message || 'Device refresh failed');
  });
});
elements.focusLock.addEventListener('click', () => setFocusLock());
elements.clearFocusLock.addEventListener('click', clearFocusLock);
window.smartie.onShortcut(handleGlobalShortcut);

for (const input of [
  elements.smartMaster,
  elements.autoZoom,
  elements.cursorSpotlight,
  elements.cursorTrail,
  elements.motionFocus,
  elements.keyboardOverlay,
  elements.titleOverlay,
  elements.cueOverlay,
  elements.clickPulse,
  elements.autoMarkers,
  elements.idleWide,
  elements.quality,
  elements.outputLayout,
  elements.fps,
  elements.smoothRecording,
  elements.performanceMode,
  elements.recordingEngine,
  elements.takeTitle,
  elements.titleDuration,
  elements.cueText,
  elements.cuePosition,
  elements.microphone,
  elements.micDevice,
  elements.micGain,
  elements.noiseGate,
  elements.noiseGateThreshold,
  elements.cameraBubble,
  elements.cameraDevice,
  elements.hideWhileRecording,
  elements.cameraPosition,
  elements.countdownSeconds,
  elements.saveMode,
  elements.exportFormat,
  elements.focusMode,
  elements.directorStyle,
  elements.zoomStrength,
  elements.motionSensitivity,
  elements.smoothing,
  elements.privacyRegion,
  elements.privacyStrength
]) {
  input.addEventListener('input', syncControls);
  input.addEventListener('input', applyMicSettings);
  input.addEventListener('input', scheduleSaveSettings);
  input.addEventListener('change', syncControls);
  input.addEventListener('change', applyMicSettings);
  input.addEventListener('change', scheduleSaveSettings);
}

window.addEventListener('keydown', updateKeyOverlay);
window.addEventListener('click', (event) => {
  if (!canvas.contains(event.target)) {
    return;
  }

  const point = canvasPointFromEvent(event);
  if (!point) {
    return;
  }

  const { x, y } = point;
  const settings = getSettings();

  if (settings.smartMaster && settings.autoZoom && settings.focusMode === 'click-lock') {
    setFocusLock(x, y);
  }

  if (settings.clickPulse) {
    pushSmartPulse(x, y);
  }

  recordSmartMoment(settings, 'preview click', x, y);
});

loadPersistedSettings();
loadRecentRecordings();
renderRecentRecordings();
renderDirectorPlan();
resizeCanvasForProfile();
drawWaitingFrame();
renderHealth();
resetMicMeter(elements.microphone.checked ? 'Mic armed' : 'Mic off');
syncControls();
refreshSources().catch((error) => {
  console.error(error);
  setStatus(error.message || 'Source scan failed');
});
hydrateOutputFolder().catch((error) => {
  console.warn('Could not load Smartie output folder.', error);
});
hydratePerformanceProfile().catch((error) => {
  console.warn('Could not load Smartie performance profile.', error);
});
refreshTelemetryAdapterStatus().catch((error) => {
  console.warn('Could not inspect Smartie telemetry adapter.', error);
});
refreshMediaDevices({ quiet: true }).catch((error) => {
  console.warn('Could not enumerate media devices.', error);
});
reportShortcutRegistration().catch((error) => {
  console.warn('Could not inspect Smartie shortcuts.', error);
});
