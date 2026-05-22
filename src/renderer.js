const canvas = document.querySelector('#previewCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const video = document.querySelector('#captureVideo');

const elements = {
  sourceList: document.querySelector('#sourceList'),
  sourceCount: document.querySelector('#sourceCount'),
  refreshSources: document.querySelector('#refreshSources'),
  startRecording: document.querySelector('#startRecording'),
  pauseRecording: document.querySelector('#pauseRecording'),
  stopRecording: document.querySelector('#stopRecording'),
  cancelRecording: document.querySelector('#cancelRecording'),
  revealRecording: document.querySelector('#revealRecording'),
  statusText: document.querySelector('#statusText'),
  timer: document.querySelector('#timer'),
  recordingDot: document.querySelector('#recordingDot'),
  emptyState: document.querySelector('#emptyState'),
  countdown: document.querySelector('#countdown'),
  smartMaster: document.querySelector('#smartMaster'),
  autoZoom: document.querySelector('#autoZoom'),
  cursorSpotlight: document.querySelector('#cursorSpotlight'),
  motionFocus: document.querySelector('#motionFocus'),
  keyboardOverlay: document.querySelector('#keyboardOverlay'),
  clickPulse: document.querySelector('#clickPulse'),
  idleWide: document.querySelector('#idleWide'),
  quality: document.querySelector('#quality'),
  fps: document.querySelector('#fps'),
  fpsValue: document.querySelector('#fpsValue'),
  microphone: document.querySelector('#microphone'),
  countdownSeconds: document.querySelector('#countdownSeconds'),
  zoomStrength: document.querySelector('#zoomStrength'),
  zoomStrengthValue: document.querySelector('#zoomStrengthValue'),
  smoothing: document.querySelector('#smoothing'),
  smoothingValue: document.querySelector('#smoothingValue')
};

const state = {
  sources: [],
  displays: [],
  selectedSource: null,
  captureStream: null,
  micStream: null,
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
  lastRecordingPath: null,
  keys: [],
  pulse: {
    active: false,
    startedAt: 0,
    x: 0.5,
    y: 0.5
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
  'motionFocus',
  'keyboardOverlay',
  'clickPulse',
  'idleWide',
  'quality',
  'fps',
  'microphone',
  'countdownSeconds',
  'zoomStrength',
  'smoothing'
];

const settingsStoreKey = 'smartie.settings.v1';

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
  } catch (error) {
    console.warn('Could not load Smartie settings.', error);
  }
}

function saveSettings() {
  const settings = getSettings();
  if (state.selectedSource) {
    settings.lastSourceId = state.selectedSource.id;
  }

  localStorage.setItem(settingsStoreKey, JSON.stringify(settings));
}

function scheduleSaveSettings() {
  window.clearTimeout(scheduleSaveSettings.id);
  scheduleSaveSettings.id = window.setTimeout(saveSettings, 120);
}

function getSettings() {
  return {
    smartMaster: elements.smartMaster.checked,
    autoZoom: elements.autoZoom.checked,
    cursorSpotlight: elements.cursorSpotlight.checked,
    motionFocus: elements.motionFocus.checked,
    keyboardOverlay: elements.keyboardOverlay.checked,
    clickPulse: elements.clickPulse.checked,
    idleWide: elements.idleWide.checked,
    quality: elements.quality.value,
    fps: Number(elements.fps.value),
    microphone: elements.microphone.checked,
    countdownSeconds: Number(elements.countdownSeconds.value),
    zoomStrength: Number(elements.zoomStrength.value),
    smoothing: Number(elements.smoothing.value)
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

  const now = state.paused ? state.pausedAt : Date.now();
  elements.timer.textContent = formatTime(now - state.startedAt - state.pausedDuration);
}

function syncControls() {
  elements.startRecording.disabled = state.recording || !state.selectedSource;
  elements.pauseRecording.disabled = !state.recording || !state.mediaRecorder;
  elements.pauseRecording.textContent = state.paused ? 'Resume' : 'Pause';
  elements.pauseRecording.classList.toggle('active', state.paused);
  elements.stopRecording.disabled = !state.recording;
  elements.cancelRecording.disabled = !state.recording;
  elements.refreshSources.disabled = state.recording;
  elements.revealRecording.disabled = !state.lastRecordingPath;

  for (const input of document.querySelectorAll('.toggle-grid input')) {
    input.disabled = !elements.smartMaster.checked;
  }

  elements.fpsValue.textContent = `${elements.fps.value} fps`;
  elements.zoomStrengthValue.textContent = `${Number(elements.zoomStrength.value).toFixed(1)}x`;
  elements.smoothingValue.textContent = `${Math.round(Number(elements.smoothing.value) * 100)}%`;
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
  const shouldIdleWide = settings.smartMaster && settings.idleWide && idleFor > 1700;
  const activeMotion = state.pointer.velocity > 0.003 || idleFor < 1300;
  let scale = 1;

  if (hasSmartZoom && activeMotion) {
    const motionBoost = Math.min(0.28, state.pointer.velocity * 4.2);
    scale = settings.zoomStrength + motionBoost;
  }

  if (shouldIdleWide) {
    scale = 1;
  }

  return {
    scale,
    x: hasSmartZoom ? state.pointer.x : 0.5,
    y: hasSmartZoom ? state.pointer.y : 0.5
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

function drawLoop() {
  if (!state.drawing) {
    return;
  }

  const settings = getSettings();
  easeFrame(settings);

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    drawVideoFrame(settings);
    drawCursorSpotlight(settings);
    drawPulse(settings);
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

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });
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

async function startRecording() {
  if (!state.selectedSource || state.recording) {
    return;
  }

  try {
    syncControls();
    setStatus('Preparing capture');
    resizeCanvasForProfile();
    await runCountdown(getSettings().countdownSeconds);

    state.captureStream = await openCaptureStream();
    state.micStream = await openMicrophoneStream();
    state.canvasStream = canvas.captureStream(getSettings().fps);

    if (state.micStream) {
      for (const track of state.micStream.getAudioTracks()) {
        state.canvasStream.addTrack(track);
      }
    }

    const mimeType = recorderMimeType();
    const profile = qualityProfiles[getSettings().quality] || qualityProfiles.balanced;
    state.chunks = [];
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
    state.timerId = window.setInterval(updateTimer, 250);
    state.drawing = true;
    state.frame = { scale: 1, x: 0.5, y: 0.5 };
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
    setStatus('Recording');
  } else {
    if (state.mediaRecorder.state === 'recording') {
      state.mediaRecorder.pause();
    }

    state.paused = true;
    state.pausedAt = Date.now();
    setStatus('Paused');
  }

  updateTimer();
  syncControls();
}

function stopRecording() {
  if (!state.mediaRecorder || !state.recording) {
    return;
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

function cleanupRecording() {
  state.drawing = false;
  state.recording = false;
  state.paused = false;
  stopPointerPolling();
  window.clearInterval(state.timerId);
  state.timerId = null;
  stopStream(state.captureStream);
  stopStream(state.micStream);
  stopStream(state.canvasStream);
  state.captureStream = null;
  state.micStream = null;
  state.canvasStream = null;
  state.mediaRecorder = null;
  video.srcObject = null;
  elements.recordingDot.classList.remove('active');
  elements.emptyState.hidden = false;
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

  cleanupRecording();

  try {
    const result = await window.smartie.saveRecording({
      bytes,
      suggestedName: buildSuggestedName()
    });

    if (result.canceled) {
      setStatus('Recording discarded');
      return;
    }

    state.lastRecordingPath = result.filePath;
    setStatus('Saved');
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
elements.stopRecording.addEventListener('click', stopRecording);
elements.cancelRecording.addEventListener('click', cancelRecording);
elements.revealRecording.addEventListener('click', () => window.smartie.revealFile(state.lastRecordingPath));

for (const input of [
  elements.smartMaster,
  elements.autoZoom,
  elements.cursorSpotlight,
  elements.motionFocus,
  elements.keyboardOverlay,
  elements.clickPulse,
  elements.idleWide,
  elements.quality,
  elements.fps,
  elements.microphone,
  elements.countdownSeconds,
  elements.zoomStrength,
  elements.smoothing
]) {
  input.addEventListener('input', syncControls);
  input.addEventListener('input', scheduleSaveSettings);
  input.addEventListener('change', syncControls);
  input.addEventListener('change', scheduleSaveSettings);
}

window.addEventListener('keydown', updateKeyOverlay);
window.addEventListener('click', (event) => {
  if (!getSettings().clickPulse || !canvas.contains(event.target)) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  state.pulse = {
    active: true,
    startedAt: performance.now(),
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  };
});

loadPersistedSettings();
resizeCanvasForProfile();
drawWaitingFrame();
syncControls();
refreshSources().catch((error) => {
  console.error(error);
  setStatus(error.message || 'Source scan failed');
});
