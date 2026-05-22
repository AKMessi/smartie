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
  clickPulse: document.querySelector('#clickPulse'),
  idleWide: document.querySelector('#idleWide'),
  privacyBlur: document.querySelector('#privacyBlur'),
  quality: document.querySelector('#quality'),
  fps: document.querySelector('#fps'),
  fpsValue: document.querySelector('#fpsValue'),
  microphone: document.querySelector('#microphone'),
  micMute: document.querySelector('#micMute'),
  micLevelBar: document.querySelector('#micLevelBar'),
  micLevelText: document.querySelector('#micLevelText'),
  micGain: document.querySelector('#micGain'),
  micGainValue: document.querySelector('#micGainValue'),
  cameraBubble: document.querySelector('#cameraBubble'),
  hideWhileRecording: document.querySelector('#hideWhileRecording'),
  cameraPosition: document.querySelector('#cameraPosition'),
  countdownSeconds: document.querySelector('#countdownSeconds'),
  saveMode: document.querySelector('#saveMode'),
  exportFormat: document.querySelector('#exportFormat'),
  outputFolder: document.querySelector('#outputFolder'),
  chooseOutputFolder: document.querySelector('#chooseOutputFolder'),
  focusMode: document.querySelector('#focusMode'),
  focusLock: document.querySelector('#focusLock'),
  clearFocusLock: document.querySelector('#clearFocusLock'),
  focusStatus: document.querySelector('#focusStatus'),
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
  micGainNode: null,
  micAnalyser: null,
  micMeterId: null,
  micMuted: false,
  cameraStream: null,
  canvasStream: null,
  mediaRecorder: null,
  chunks: [],
  drawing: false,
  recording: false,
  paused: false,
  discardRequested: false,
  startedAt: 0,
  pausedAt: 0,
  pausedDuration: 0,
  timerId: null,
  pointerPollId: null,
  trail: [],
  lastRecordingPath: null,
  recentRecordings: [],
  outputDir: null,
  markers: [],
  activeMarker: null,
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
  }
};

const qualityProfiles = {
  balanced: {
    bitsPerSecond: 9_000_000,
    width: 1920,
    height: 1080
  },
  crisp: {
    bitsPerSecond: 15_000_000,
    width: 2560,
    height: 1440
  },
  cinematic: {
    bitsPerSecond: 22_000_000,
    width: 3840,
    height: 2160
  }
};

const persistedSettingKeys = [
  'smartMaster',
  'autoZoom',
  'cursorSpotlight',
  'cursorTrail',
  'motionFocus',
  'keyboardOverlay',
  'clickPulse',
  'idleWide',
  'privacyBlur',
  'quality',
  'fps',
  'microphone',
  'micGain',
  'cameraBubble',
  'hideWhileRecording',
  'cameraPosition',
  'countdownSeconds',
  'saveMode',
  'exportFormat',
  'focusMode',
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
    title.textContent = fileNameFromPath(recording.filePath);

    const meta = document.createElement('span');
    const duration = formatTime(recording.durationMs || 0);
    const markerCount = recording.markers ? recording.markers.length : 0;
    const markerText = markerCount === 1 ? '1 marker' : `${markerCount} markers`;
    meta.textContent = `${duration} - ${markerText} - ${recording.sourceName || 'Unknown source'}`;

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

function getSettings() {
  return {
    smartMaster: elements.smartMaster.checked,
    autoZoom: elements.autoZoom.checked,
    cursorSpotlight: elements.cursorSpotlight.checked,
    cursorTrail: elements.cursorTrail.checked,
    motionFocus: elements.motionFocus.checked,
    keyboardOverlay: elements.keyboardOverlay.checked,
    clickPulse: elements.clickPulse.checked,
    idleWide: elements.idleWide.checked,
    privacyBlur: elements.privacyBlur.checked,
    quality: elements.quality.value,
    fps: Number(elements.fps.value),
    microphone: elements.microphone.checked,
    micGain: Number(elements.micGain.value),
    cameraBubble: elements.cameraBubble.checked,
    hideWhileRecording: elements.hideWhileRecording.checked,
    cameraPosition: elements.cameraPosition.value,
    countdownSeconds: Number(elements.countdownSeconds.value),
    saveMode: elements.saveMode.value,
    exportFormat: elements.exportFormat.value,
    outputDir: state.outputDir,
    focusMode: elements.focusMode.value,
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
  if (!state.recording && state.startedAt === 0) {
    return 0;
  }

  const effectiveNow = state.paused ? state.pausedAt : now;
  return Math.max(0, effectiveNow - state.startedAt - state.pausedDuration);
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

  const targetFps = getSettings().fps;
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
    renderHealth();
  }
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
  elements.micMute.disabled = !elements.microphone.checked || !state.micStream;
  elements.micMute.textContent = state.micMuted ? 'Unmute' : 'Mute';
  elements.micMute.classList.toggle('active', state.micMuted);
  elements.focusLock.disabled = !elements.smartMaster.checked || !elements.autoZoom.checked || elements.focusMode.value === 'wide';
  elements.clearFocusLock.disabled = !state.focusLock.active;
  elements.revealRecording.disabled = !state.lastRecordingPath;

  for (const input of document.querySelectorAll('.toggle-grid input')) {
    input.disabled = !elements.smartMaster.checked;
  }

  elements.fpsValue.textContent = `${elements.fps.value} fps`;
  elements.micGainValue.textContent = `${Math.round(Number(elements.micGain.value) * 100)}%`;
  elements.zoomStrengthValue.textContent = `${Number(elements.zoomStrength.value).toFixed(1)}x`;
  elements.motionSensitivityValue.textContent = elements.motionSensitivity.value;
  elements.smoothingValue.textContent = `${Math.round(Number(elements.smoothing.value) * 100)}%`;
  elements.privacyStrengthValue.textContent = `${elements.privacyStrength.value}px`;
  elements.outputFolder.textContent = state.outputDir || 'Default Videos folder';
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

  state.pointer.previousX = state.pointer.x;
  state.pointer.previousY = state.pointer.y;
  state.pointer.screenX = pointerPayload.point.x;
  state.pointer.screenY = pointerPayload.point.y;
  state.pointer.x = x;
  state.pointer.y = y;
  state.pointer.velocity = velocity;

  if (velocity > 0.002) {
    state.pointer.lastMovedAt = performance.now();
    state.trail.push({
      x,
      y,
      at: performance.now()
    });
    state.trail = state.trail.slice(-28);
  }

  if (velocity > 0.055 && getSettings().clickPulse) {
    state.pulse = {
      active: true,
      startedAt: performance.now(),
      x,
      y
    };
  }
}

function scanMotionTarget(settings, timestamp) {
  const shouldScan = settings.smartMaster
    && settings.autoZoom
    && settings.motionFocus
    && settings.focusMode === 'motion'
    && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;

  if (!shouldScan || timestamp - state.motionTarget.lastScanAt < 180) {
    return;
  }

  state.motionTarget.lastScanAt = timestamp;
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
}

function startPointerPolling() {
  stopPointerPolling();
  state.pointerPollId = window.setInterval(async () => {
    try {
      const payload = await window.smartie.getPointer();
      state.displays = payload.displays;
      mapPointerToCapture(payload);
    } catch (error) {
      console.error(error);
    }
  }, 33);
}

function stopPointerPolling() {
  if (state.pointerPollId) {
    window.clearInterval(state.pointerPollId);
    state.pointerPollId = null;
  }
}

function resizeCanvasForProfile() {
  const profile = qualityProfiles[elements.quality.value] || qualityProfiles.balanced;
  canvas.width = profile.width;
  canvas.height = profile.height;
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

function coverRect(sourceWidth, sourceHeight, targetWidth, targetHeight, scale) {
  const baseScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight) * scale;
  const drawWidth = sourceWidth * baseScale;
  const drawHeight = sourceHeight * baseScale;
  return { drawWidth, drawHeight };
}

function smartTarget(settings) {
  const now = performance.now();
  const idleFor = now - state.pointer.lastMovedAt;
  const hasSmartZoom = settings.smartMaster && settings.autoZoom;
  const forcedWide = settings.focusMode === 'wide';
  const hasFocusLock = state.focusLock.active && !forcedWide;
  const hasMotionTarget = settings.focusMode === 'motion' && now - state.motionTarget.lastSeenAt < 1500 && !forcedWide;
  const shouldIdleWide = settings.smartMaster && settings.idleWide && !hasFocusLock && idleFor > 1700;
  const activeMotion = state.pointer.velocity > 0.003 || idleFor < 1300;
  let scale = 1;
  let x = state.pointer.x;
  let y = state.pointer.y;

  if (hasFocusLock) {
    scale = settings.zoomStrength;
    x = state.focusLock.x;
    y = state.focusLock.y;
  } else if (hasMotionTarget) {
    scale = settings.zoomStrength + Math.min(0.3, state.motionTarget.strength * 0.45);
    x = state.motionTarget.x;
    y = state.motionTarget.y;
  } else if (hasSmartZoom && activeMotion && !forcedWide) {
    const motionBoost = Math.min(0.28, state.pointer.velocity * 4.2);
    scale = settings.zoomStrength + motionBoost;
  }

  if (shouldIdleWide || forcedWide) {
    scale = 1;
    x = 0.5;
    y = 0.5;
  }

  return {
    scale,
    x: hasSmartZoom ? x : 0.5,
    y: hasSmartZoom ? y : 0.5
  };
}

function easeFrame(settings) {
  const target = smartTarget(settings);
  const smoothing = settings.smartMaster ? settings.smoothing : 0.16;
  state.frame.scale += (target.scale - state.frame.scale) * smoothing;
  state.frame.x += (target.x - state.frame.x) * smoothing;
  state.frame.y += (target.y - state.frame.y) * smoothing;
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
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);

  if (settings.smartMaster && settings.motionFocus && state.frame.scale > 1.03) {
    const gradient = ctx.createRadialGradient(
      width * state.pointer.x,
      height * state.pointer.y,
      width * 0.08,
      width * state.pointer.x,
      height * state.pointer.y,
      width * 0.52
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
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

  const x = canvas.width * state.pointer.x;
  const y = canvas.height * state.pointer.y;

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
    ctx.beginPath();
    ctx.moveTo(previous.x * canvas.width, previous.y * canvas.height);
    ctx.lineTo(current.x * canvas.width, current.y * canvas.height);
    ctx.stroke();
  }

  ctx.restore();
  state.trail = state.trail.filter((point) => now - point.at < 900);
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

  const x = canvas.width * state.pulse.x;
  const y = canvas.height * state.pulse.y;
  const radius = canvas.width * (0.02 + progress * 0.05);

  ctx.save();
  ctx.strokeStyle = `rgba(255, 191, 90, ${1 - progress})`;
  ctx.lineWidth = Math.max(5, canvas.width * 0.003);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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

function drawCameraBubble(settings) {
  if (!settings.cameraBubble || !state.cameraStream || cameraVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const bubbleWidth = Math.min(width * 0.22, 460);
  const bubbleHeight = bubbleWidth * 0.5625;
  const margin = Math.max(32, width * 0.025);
  const isTop = settings.cameraPosition.startsWith('top');
  const isLeft = settings.cameraPosition.endsWith('left');
  const x = isLeft ? margin : width - bubbleWidth - margin;
  const y = isTop ? margin : height - bubbleHeight - margin;
  const radius = Math.max(12, bubbleWidth * 0.035);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 12;
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

function drawLoop(timestamp = performance.now()) {
  if (!state.drawing) {
    return;
  }

  const settings = getSettings();
  scanMotionTarget(settings, timestamp);
  updateFrameHealth(timestamp, settings.fps);
  easeFrame(settings);

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    drawVideoFrame(settings);
    drawPrivacyBlur(settings);
    drawCursorTrail(settings);
    drawCursorSpotlight(settings);
    drawPulse(settings);
    drawMarkerOverlay(settings);
    drawCameraBubble(settings);
    drawKeyboardOverlay(settings);
    elements.emptyState.hidden = true;
  } else {
    drawWaitingFrame();
  }

  requestAnimationFrame(drawLoop);
}

async function openCaptureStream() {
  const settings = getSettings();
  const profile = qualityProfiles[settings.quality] || qualityProfiles.balanced;
  const captureStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: state.selectedSource.id,
        minWidth: 1280,
        minHeight: 720,
        maxWidth: Math.max(profile.width, 3840),
        maxHeight: Math.max(profile.height, 2160),
        maxFrameRate: settings.fps
      }
    }
  });

  video.srcObject = captureStream;
  await video.play();
  return captureStream;
}

async function openMicrophoneStream() {
  if (!elements.microphone.checked) {
    return null;
  }

  const inputStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });

  state.micInputStream = inputStream;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContext();
    state.micSource = state.audioContext.createMediaStreamSource(inputStream);
    state.micGainNode = state.audioContext.createGain();
    state.micAnalyser = state.audioContext.createAnalyser();
    state.micAnalyser.fftSize = 512;

    const destination = state.audioContext.createMediaStreamDestination();
    state.micSource.connect(state.micGainNode);
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

async function openCameraStream() {
  if (!elements.cameraBubble.checked) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 }
      }
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
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || '';
}

function buildSuggestedName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `smartie-${stamp}.webm`;
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

function buildRecordingMetadata({ suggestedName, durationMs, markers, settings }) {
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
    markers,
    smartStack: {
      enabled: settings.smartMaster,
      autoZoom: settings.autoZoom,
      cursorSpotlight: settings.cursorSpotlight,
      cursorTrail: settings.cursorTrail,
      motionFocus: settings.motionFocus,
      keyboardOverlay: settings.keyboardOverlay,
      clickPulse: settings.clickPulse,
      idleWide: settings.idleWide,
      privacyBlur: settings.privacyBlur,
      privacyRegion: settings.privacyRegion,
      privacyStrength: settings.privacyStrength,
      focusMode: settings.focusMode,
      zoomStrength: settings.zoomStrength,
      motionSensitivity: settings.motionSensitivity,
      smoothing: settings.smoothing
    },
    capture: {
      quality: settings.quality,
      fps: settings.fps,
      microphone: settings.microphone,
      micGain: settings.micGain,
      cameraBubble: settings.cameraBubble,
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
    resizeCanvasForProfile();
    const settings = getSettings();
    await runCountdown(settings.countdownSeconds);
    await hideWindowForRecording(settings);

    state.captureStream = await openCaptureStream();
    state.micStream = await openMicrophoneStream();
    state.cameraStream = await openCameraStream();
    state.canvasStream = canvas.captureStream(getSettings().fps);

    if (state.micStream) {
      for (const track of state.micStream.getAudioTracks()) {
        state.canvasStream.addTrack(track);
      }
    }

    const mimeType = recorderMimeType();
    const profile = qualityProfiles[getSettings().quality] || qualityProfiles.balanced;
    state.chunks = [];
    state.markers = [];
    state.activeMarker = null;
    state.discardRequested = false;
    state.mediaRecorder = new MediaRecorder(state.canvasStream, {
      mimeType,
      videoBitsPerSecond: profile.bitsPerSecond
    });

    state.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data && event.data.size > 0) {
        state.chunks.push(event.data);
      }
    });

    state.mediaRecorder.addEventListener('stop', saveRecording);
    state.mediaRecorder.start(1000);

    state.recording = true;
    state.paused = false;
    state.startedAt = Date.now();
    state.pausedAt = 0;
    state.pausedDuration = 0;
    resetHealth();
    state.timerId = window.setInterval(updateTimer, 250);
    state.drawing = true;
    state.frame = { scale: 1, x: 0.5, y: 0.5 };
    state.motionTarget.previousFrame = null;
    state.motionTarget.strength = 0;
    state.trail = [];
    startPointerPolling();
    requestAnimationFrame(drawLoop);

    elements.recordingDot.classList.add('active');
    setStatus('Recording');
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

  const marker = {
    label: `Marker ${state.markers.length + 1}`,
    atMs: recordingElapsedMs(),
    createdAt: new Date().toISOString()
  };

  state.markers.push(marker);
  state.activeMarker = {
    ...marker,
    startedAt: performance.now()
  };
  setStatus(`${marker.label} dropped`);
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

function cleanupRecording() {
  state.drawing = false;
  state.recording = false;
  state.paused = false;
  state.markers = [];
  state.activeMarker = null;
  stopPointerPolling();
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
  state.micGainNode = null;
  state.micAnalyser = null;
  if (state.audioContext) {
    state.audioContext.close().catch((error) => console.warn('Could not close audio context.', error));
    state.audioContext = null;
  }
  state.cameraStream = null;
  state.canvasStream = null;
  state.mediaRecorder = null;
  video.srcObject = null;
  cameraVideo.srcObject = null;
  elements.recordingDot.classList.remove('active');
  elements.emptyState.hidden = false;
  restoreRecordingWindow().catch((error) => {
    console.warn('Could not restore Smartie window.', error);
  });
  resetMicMeter(elements.microphone.checked ? 'Mic armed' : 'Mic off');
  resetHealth();
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

  const mimeType = recorderMimeType() || 'video/webm';
  const blob = new Blob(state.chunks, { type: mimeType });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const settings = getSettings();
  const durationMs = recordingElapsedMs();
  const markers = state.markers.slice();
  const suggestedName = buildSuggestedName();
  const metadata = buildRecordingMetadata({
    suggestedName,
    durationMs,
    markers,
    settings
  });

  cleanupRecording();

  try {
    const result = await window.smartie.saveRecording({
      bytes,
      suggestedName,
      saveMode: settings.saveMode,
      outputDir: settings.outputDir,
      metadata,
      exportFormat: settings.exportFormat
    });

    if (result.canceled) {
      setStatus('Recording discarded');
      return;
    }

    state.lastRecordingPath = result.filePath;
    rememberRecording({
      filePath: result.filePath,
      metadataPath: result.metadataPath,
      chaptersPath: result.chaptersPath,
      mp4Path: result.mp4Path,
      sourceName: state.selectedSource ? state.selectedSource.name : null,
      durationMs,
      markers,
      createdAt: new Date().toISOString()
    });
    setStatus(result.mp4Path ? 'Saved + MP4' : 'Saved');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Save failed');
  } finally {
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
elements.chooseOutputFolder.addEventListener('click', chooseOutputFolder);
elements.clearRecent.addEventListener('click', clearRecentRecordings);
elements.micMute.addEventListener('click', toggleMicMute);
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
  elements.clickPulse,
  elements.idleWide,
  elements.quality,
  elements.fps,
  elements.microphone,
  elements.micGain,
  elements.cameraBubble,
  elements.hideWhileRecording,
  elements.cameraPosition,
  elements.countdownSeconds,
  elements.saveMode,
  elements.exportFormat,
  elements.focusMode,
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

  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const settings = getSettings();

  if (settings.smartMaster && settings.autoZoom && settings.focusMode === 'click-lock') {
    setFocusLock(x, y);
  }

  if (!settings.clickPulse) {
    return;
  }

  state.pulse = {
    active: true,
    startedAt: performance.now(),
    x,
    y
  };
});

loadPersistedSettings();
loadRecentRecordings();
renderRecentRecordings();
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
reportShortcutRegistration().catch((error) => {
  console.warn('Could not inspect Smartie shortcuts.', error);
});
