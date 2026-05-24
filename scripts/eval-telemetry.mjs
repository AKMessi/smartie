import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function projectPathFromArg(value) {
  if (!value) {
    throw new Error('Usage: npm run eval:telemetry -- /path/to/take.smartie-project');
  }

  const resolved = resolve(value);
  if (resolved.endsWith('.smartie.json')) {
    return `${resolved.slice(0, -'.smartie.json'.length)}.smartie-project`;
  }

  return resolved;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cursorTelemetryQuality(samples = []) {
  if (!Array.isArray(samples) || samples.length < 3) {
    return {
      usable: false,
      reason: 'not-enough-cursor-samples',
      samples: Array.isArray(samples) ? samples.length : 0
    };
  }

  const uniquePoints = new Set();
  let allZeroCount = 0;
  let maxVelocity = 0;
  for (const sample of samples) {
    const x = finiteNumber(sample.x, 0);
    const y = finiteNumber(sample.y, 0);
    const screenX = finiteNumber(sample.screen_x, 0);
    const screenY = finiteNumber(sample.screen_y, 0);
    const velocity = Math.abs(finiteNumber(sample.velocity, 0));
    uniquePoints.add(`${Math.round(x * 1000)}:${Math.round(y * 1000)}`);
    maxVelocity = Math.max(maxVelocity, velocity);
    if (x === 0 && y === 0 && screenX === 0 && screenY === 0 && velocity === 0) {
      allZeroCount += 1;
    }
  }

  const allZero = allZeroCount >= Math.max(3, samples.length * 0.92);
  const usable = !allZero && uniquePoints.size >= 3 && maxVelocity >= 0.003;
  return {
    usable,
    reason: usable ? 'usable' : allZero ? 'stuck-at-zero' : 'stationary-or-low-confidence',
    samples: samples.length,
    uniquePoints: uniquePoints.size,
    maxVelocity: Math.round(maxVelocity * 100000) / 100000,
    allZero
  };
}

function nativeTelemetrySummary(nativeTimeline) {
  const events = Array.isArray(nativeTimeline?.events) ? nativeTimeline.events : [];
  const snapshots = events.filter((event) => event.type === 'snapshot');
  const quality = nativeTimeline?.stats?.quality || snapshots
    .map((event) => event.quality)
    .filter(Boolean)
    .sort((a, b) => finiteNumber(b.score, 0) - finiteNumber(a.score, 0))[0] || {
      tier: 'missing',
      score: 0,
      native: false,
      perfectCandidate: false
    };
  const providers = {};
  for (const event of events) {
    const provider = event.provider || event.pointer?.provider || event.active_window?.provider;
    if (provider) {
      providers[provider] = (providers[provider] || 0) + 1;
    }
  }

  return {
    present: Boolean(nativeTimeline),
    events: events.length,
    snapshots: snapshots.length,
    helperEvents: events.filter((event) => event.helper_event).length,
    quality,
    providers
  };
}

const projectPath = projectPathFromArg(process.argv[2]);
if (!existsSync(projectPath)) {
  throw new Error(`Smartie project path does not exist: ${projectPath}`);
}

const manifest = readJson(join(projectPath, 'manifest.json'));
const cursor = readJson(join(projectPath, 'cursor.timeline.json'), { samples: [] });
const accessibility = readJson(join(projectPath, 'accessibility.timeline.json'), { events: [] });
const native = readJson(join(projectPath, 'native.timeline.json'), null);
const renderQa = readJson(join(projectPath, 'render.qa.json'), { metrics: {}, warnings: [] });
const strict = process.argv.includes('--strict');
const nativeSummary = nativeTelemetrySummary(native);
const cursorQuality = cursorTelemetryQuality(cursor.samples || []);
const report = {
  project: projectPath,
  files: {
    nativeTimeline: Boolean(native),
    manifestReferencesNativeTimeline: manifest.files?.native_telemetry_timeline === 'native.timeline.json'
  },
  session: {
    platform: process.platform,
    recordingEngine: manifest.smartie?.recording_engine || null,
    renderPipeline: manifest.smartie?.render_pipeline || null
  },
  telemetry: {
    cursor: cursorQuality,
    accessibilityEvents: Array.isArray(accessibility.events) ? accessibility.events.length : 0,
    native: nativeSummary,
    renderQaNativeQuality: renderQa.metrics?.nativeTelemetryQuality || null
  },
  warnings: renderQa.warnings || []
};

console.log(JSON.stringify(report, null, 2));

if (strict && !native) {
  throw new Error('Telemetry eval failed: native.timeline.json is missing.');
}

if (native && native.schema !== 'smartie.native_telemetry_timeline.v1') {
  throw new Error(`Telemetry eval failed: unexpected native timeline schema ${native.schema}`);
}

if (native && nativeSummary.snapshots === 0) {
  throw new Error('Telemetry eval failed: native timeline has no snapshots.');
}

if (strict && manifest.files?.native_telemetry_timeline !== 'native.timeline.json') {
  throw new Error('Telemetry eval failed: manifest does not reference native.timeline.json.');
}
