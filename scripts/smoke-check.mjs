import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'package.json',
  'src/main.js',
  'src/native-telemetry.js',
  'src/telemetry-adapters.js',
  'src/preload.js',
  'src/index.html',
  'src/styles.css',
  'src/renderer.js',
  'scripts/package.mjs',
  'scripts/windows-telemetry-self-test.mjs',
  'native/windows/smartie-telemetry-helper.ps1',
  'LICENSE',
  'NOTICE',
  'PRIVACY.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'CHANGELOG.md',
  'ROADMAP.md',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/feature_request.md',
  '.github/ISSUE_TEMPLATE/recording_quality.md'
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
if (pkg.license !== 'PolyForm-Noncommercial-1.0.0') {
  throw new Error('Smartie must stay noncommercial licensed for public release');
}
if (!pkg.repository?.url || !pkg.bugs?.url || !pkg.homepage) {
  throw new Error('package.json must include repository, bugs, and homepage metadata');
}

for (const script of ['doctor', 'package:linux', 'package:win', 'package:all', 'release:linux', 'release:win', 'release:all', 'eval:telemetry', 'telemetry:adapter', 'telemetry:windows:self-test']) {
  if (!pkg.scripts || !pkg.scripts[script]) {
    throw new Error(`package.json is missing ${script} script`);
  }
}

if (!pkg.scripts['package:linux'].includes('scripts/package.mjs')) {
  throw new Error('package:linux must use the cross-platform package script');
}
if (!pkg.scripts['package:win'].includes('win32')) {
  throw new Error('package:win must build a Windows package');
}
if (!pkg.scripts['release:linux'].includes('electron-builder') || !pkg.scripts['release:linux'].includes('AppImage')) {
  throw new Error('release:linux must build a Linux AppImage');
}
if (!pkg.scripts['release:win'].includes('electron-builder') || !pkg.scripts['release:win'].includes('nsis')) {
  throw new Error('release:win must build a Windows installer');
}

if (!pkg.dependencies || !pkg.dependencies['ffmpeg-static']) {
  throw new Error('package.json is missing bundled ffmpeg-static dependency');
}
if (!pkg.devDependencies || !pkg.devDependencies['electron-builder']) {
  throw new Error('package.json is missing electron-builder for release packaging');
}
if (!Array.isArray(pkg.build?.asarUnpack) || !pkg.build.asarUnpack.some((item) => item.includes('ffmpeg-static')) || !pkg.build.asarUnpack.some((item) => item.includes('native'))) {
  throw new Error('electron-builder must unpack FFmpeg and native telemetry assets');
}
if (!String(JSON.stringify(pkg.build?.linux || {})).includes('AppImage') || !String(JSON.stringify(pkg.build?.win || {})).includes('nsis')) {
  throw new Error('electron-builder config must include Linux AppImage and Windows NSIS targets');
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
  'cameraOverscan',
  'cameraOffsetForTarget',
  'cameraFrameForTarget',
  'recenterDirectorSegment',
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
  'prepareRecordingSettings',
  'performanceResolvedMode',
  'performanceGovernor',
  'hydratePerformanceProfile',
  'resetPerformanceGovernor',
  'observePerformanceHealth',
  'boundedPush',
  'shouldCollectVisualAttention',
  'cursorTelemetryQuality',
  'fallbackAttentionScale',
  'createRecordingChunkSession',
  'queueRecordingChunk',
  'finalizeRecordingChunkSession',
  'discardRecordingChunkSession',
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
  'recordClickTelemetryAt',
  'recordMotionTelemetry',
  'recordNativeTelemetrySnapshot',
  'nativeEventRecordingMs',
  'handleNativeClickEvent',
  'handleNativeKeyboardEvent',
  'pushSmartPulseAt',
  'startNativeTelemetrySession',
  'stopNativeTelemetrySession',
  'nativeTelemetryStats',
  'refreshTelemetryAdapterStatus',
  'installTelemetryAdapter',
  'renderTelemetryAdapterStatus',
  'drawSmartTimelineFrame',
  'renderSmartEffectsVideo',
  'waitForMediaEvent',
  'stopRecorder',
  'timelineSampleAt',
  'buildRenderCursorTrack',
  'buildRenderPulses',
  'buildRenderKeyboardTimeline',
  'timelinePointAtTrack',
  'timelineKeysAt',
  'enhanceTimelinePlanEffects',
  'drawTimelineCursorTrail',
  'drawTimelinePulses',
  'drawTimelineMarkerOverlay',
  'buildAttentionTimeline',
  'buildTimelineAttentionEvent',
  'attentionCue',
  'isSyntheticPointerMoment',
  'isTrustedClickCue',
  'isUntrustedEdgeTarget',
  'shouldKeepAttentionEvent',
  'appendTelemetryAttentionEvents',
  'cursorDwellAttentionEvents',
  'cursorSettleAttentionEvents',
  'compileSmartDirectorPlan',
  'directorStyleProfile',
  'directorCandidateFromEvent',
  'eventSourceScore',
  'targetOutputPosition',
  'directorAnchorStrength',
  'mergeDirectorTarget',
  'mergeDirectorCandidates',
  'resolveDirectorOverlaps',
  'capDirectorSegmentDurations',
  'buildCameraKeyframes',
  'validateCameraPlan',
  'buildRenderQa',
  'cameraFrameAt',
  'smartie.camera_plan.v1',
  'smartie.cursor_timeline.v1',
  'smartie.render_qa.v1',
  'audioSourceSessionId',
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
for (const feature of ['globalShortcut', 'GlobalShortcutsPortal', 'registerGlobalShortcuts', 'writeRecordingFiles', 'sidecarPathFor', 'chapterPathFor', 'buildMarkerWebVtt', 'backgroundThrottling', 'transcodeToMp4', 'mp4PathFor', 'executableExists', 'resolvedFfmpegPath', 'muxAudioIntoWebm', 'audioSourceBytes', 'writeSmartieProject', 'smartieProjectPathFor', 'smartie.project.v1', 'attention.timeline.json', 'cursor.timeline.json', 'click.timeline.json', 'keyboard.timeline.json', 'motion.timeline.json', 'accessibility.timeline.json', 'native.timeline.json', 'proxy.timeline.json', 'camera.plan.json', 'render.qa.json', 'projectFileMode', 'getActiveWindowSnapshot', 'NativeTelemetryCore', 'start-native-telemetry', 'get-native-telemetry', 'get-telemetry-adapter-status', 'install-telemetry-adapter', 'nativeTelemetryTimeline', 'createProxyPreview', 'save-camera-plan', 'get-performance-profile', 'create-recording-session', 'append-recording-chunk', 'finalize-recording-session', 'read-recording-session', 'discard-recording-session', 'classifyPerformanceProfile', 'recordingSessions', 'materializeRecordingInput']) {
  if (!main.includes(feature)) {
    throw new Error(`Main process is missing shortcut feature: ${feature}`);
  }
}

const nativeTelemetry = readFileSync(join(root, 'src/native-telemetry.js'), 'utf8');
for (const feature of ['NativeTelemetryCore', 'smartie.native_telemetry.snapshot.v1', 'smartie.native_telemetry.diagnostics.v1', 'smartie.native_telemetry.helper.v1', 'startSocketServer', 'pointerSnapshot', 'activeWindowSnapshot', 'diagnostics', 'windowsPowerShellCommand', 'windowsNativeHelperStatus', 'helperLaunchSpec', 'windows-user32']) {
  if (!nativeTelemetry.includes(feature)) {
    throw new Error(`Native telemetry core is missing feature: ${feature}`);
  }
}

const windowsHelper = readFileSync(join(root, 'native/windows/smartie-telemetry-helper.ps1'), 'utf8');
for (const feature of ['GetCursorPos', 'GetForegroundWindow', 'GetWindowRect', 'GetAsyncKeyState', 'text-redacted', 'windows-user32', 'self-test']) {
  if (!windowsHelper.includes(feature)) {
    throw new Error(`Windows telemetry helper is missing feature: ${feature}`);
  }
}

const windowsSelfTest = readFileSync(join(root, 'scripts/windows-telemetry-self-test.mjs'), 'utf8');
for (const feature of ['-SelfTest', 'pointer_available', 'Windows telemetry helper self-test']) {
  if (!windowsSelfTest.includes(feature)) {
    throw new Error(`Windows telemetry self-test is missing feature: ${feature}`);
  }
}

const telemetryAdapters = readFileSync(join(root, 'src/telemetry-adapters.js'), 'utf8');
for (const feature of ['statusTelemetryAdapters', 'installBestTelemetryAdapter', 'installGnomeTelemetryAdapter', 'uninstallGnomeTelemetryAdapter', 'smartie-telemetry@akmessi', 'smartie.telemetry_adapter.status.v1']) {
  if (!telemetryAdapters.includes(feature)) {
    throw new Error(`Telemetry adapter manager is missing feature: ${feature}`);
  }
}

const preload = readFileSync(join(root, 'src/preload.js'), 'utf8');
for (const feature of ['getShortcuts', 'onShortcut', 'chooseOutputDir', 'getDefaultOutputDir', 'setWindowHidden', 'toggleWindowVisibility', 'saveSnapshot', 'getSemanticContext', 'startNativeTelemetry', 'getNativeTelemetry', 'getNativeTelemetryDiagnostics', 'stopNativeTelemetry', 'getTelemetryAdapterStatus', 'installTelemetryAdapter', 'uninstallGnomeTelemetryAdapter', 'saveCameraPlan', 'getPerformanceProfile', 'createRecordingSession', 'appendRecordingChunk', 'finalizeRecordingSession', 'readRecordingSession', 'discardRecordingSession']) {
  if (!preload.includes(feature)) {
    throw new Error(`Preload is missing shortcut bridge: ${feature}`);
  }
}

console.log('Smartie smoke check passed.');
