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

for (const script of ['doctor', 'package:linux']) {
  if (!pkg.scripts || !pkg.scripts[script]) {
    throw new Error(`package.json is missing ${script} script`);
  }
}

if (!pkg.scripts['package:linux'].includes('ffmpeg-static')) {
  throw new Error('package:linux must unpack ffmpeg-static for MP4 export');
}

if (!pkg.dependencies || !pkg.dependencies['ffmpeg-static']) {
  throw new Error('package.json is missing bundled ffmpeg-static dependency');
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
  'cursorTrail',
  'motionFocus',
  'keyboardOverlay',
  'titleOverlay',
  'drawTitleOverlay',
  'cueOverlay',
  'cueText',
  'cuePosition',
  'drawCueOverlay',
  'cleanCueText',
  'wrapCueText',
  'takeTitle',
  'titleDuration',
  'fileSafeTitle',
  'clickPulse',
  'autoMarkers',
  'recordSmartMoment',
  'pushRecordingMarker',
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
  'hydrateOutputFolder',
  'recentRecordings',
  'rememberRecording',
  'renderRecentRecordings',
  'renderDirectorPlan',
  'applyCameraPlanEdit',
  'persistCameraPlanEdit',
  'resetTelemetry',
  'buildProjectArtifacts',
  'updateFrameHealth',
  'renderHealth',
  'micGain',
  'noiseGate',
  'noiseGateThreshold',
  'createNoiseGateNode',
  'micDevice',
  'cameraDevice',
  'refreshMediaDevices',
  'renderDeviceSelect',
  'uniqueDevices',
  'toggleMicMute',
  'startMicMeter',
  'focusMode',
  'directorStyle',
  'setFocusLock',
  'toggleFocusLock',
  'director',
  'resetAttentionEngine',
  'buildAttentionCandidates',
  'chooseAttentionTarget',
  'attentionScale',
  'pointerIntentPoint',
  'attentionCandidate',
  'normalizedDistance',
  'refineSmartTimeline',
  'scanMotionTarget',
  'motionSensitivity',
  'privacyBlur',
  'drawPrivacyBlur',
  'drawCursorTrail',
  'vectorLayerPoint',
  'outputLayout',
  'canvasSizeForSettings',
  'canvasPointFromEvent',
  'dropMarker',
  'drawMarkerOverlay',
  'hideWhileRecording',
  'hideWindowForRecording',
  'restoreRecordingWindow',
  'buildRecordingMetadata',
  'exportFormat',
  'smoothRecording',
  'performanceMode',
  'performanceProfile',
  'capCanvasSize',
  'lowLatencyMode',
  'recordingEngine',
  'usesSmartCanvasRecording',
  'usesHybridSmartRender',
  'usesSmartEffectsOutput',
  'outputLayoutForRecording',
  'captureSizeForSettings',
  'effectiveRecordingFps',
  'recordingBitrate',
  'drawNativePreviewFrame',
  'captureSmartTimelineFrame',
  'startSmartTimeline',
  'stopSmartTimeline',
  'startSemanticPolling',
  'stopSemanticPolling',
  'recordCursorTelemetry',
  'recordClickTelemetry',
  'recordMotionTelemetry',
  'drawSmartTimelineFrame',
  'renderSmartEffectsVideo',
  'waitForMediaEvent',
  'stopRecorder',
  'timelineSampleAt',
  'drawTimelineCursorTrail',
  'drawTimelinePulses',
  'drawTimelineMarkerOverlay',
  'buildAttentionTimeline',
  'buildTimelineAttentionEvent',
  'attentionCue',
  'shouldKeepAttentionEvent',
  'compileSmartDirectorPlan',
  'directorStyleProfile',
  'directorCandidateFromEvent',
  'mergeDirectorCandidates',
  'resolveDirectorOverlaps',
  'buildCameraKeyframes',
  'validateCameraPlan',
  'buildRenderQa',
  'cameraFrameAt',
  'smartie.camera_plan.v1',
  'smartie.cursor_timeline.v1',
  'smartie.render_qa.v1',
  'audioSourceBytes',
  'attentionTimeline',
  'cameraPlan',
  'projectArtifacts',
  'recordingMimeType',
  'recordingSettings',
  'createRecordingCanvasStream',
  'createNativeRecordingStream',
  'requestRecordingFrame',
  'tuneScreenVideoTrack',
  'captureSnapshot',
  'canvasPngBytes'
]) {
  if (!renderer.includes(feature)) {
    throw new Error(`Renderer is missing smart feature: ${feature}`);
  }
}

const main = readFileSync(join(root, 'src/main.js'), 'utf8');
for (const feature of ['globalShortcut', 'GlobalShortcutsPortal', 'registerGlobalShortcuts', 'writeRecordingFiles', 'sidecarPathFor', 'chapterPathFor', 'buildMarkerWebVtt', 'backgroundThrottling', 'transcodeToMp4', 'mp4PathFor', 'resolvedFfmpegPath', 'muxAudioIntoWebm', 'audioSourceBytes', 'writeSmartieProject', 'smartieProjectPathFor', 'smartie.project.v1', 'attention.timeline.json', 'cursor.timeline.json', 'click.timeline.json', 'keyboard.timeline.json', 'motion.timeline.json', 'accessibility.timeline.json', 'proxy.timeline.json', 'camera.plan.json', 'render.qa.json', 'projectFileMode', 'getActiveWindowSnapshot', 'createProxyPreview', 'save-camera-plan']) {
  if (!main.includes(feature)) {
    throw new Error(`Main process is missing shortcut feature: ${feature}`);
  }
}

const preload = readFileSync(join(root, 'src/preload.js'), 'utf8');
for (const feature of ['getShortcuts', 'onShortcut', 'chooseOutputDir', 'getDefaultOutputDir', 'setWindowHidden', 'toggleWindowVisibility', 'saveSnapshot', 'getSemanticContext', 'saveCameraPlan']) {
  if (!preload.includes(feature)) {
    throw new Error(`Preload is missing shortcut bridge: ${feature}`);
  }
}

console.log('Smartie smoke check passed.');
