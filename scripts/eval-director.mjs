import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function projectPathFromArg(value) {
  if (!value) {
    throw new Error('Usage: npm run eval:director -- /path/to/take.smartie-project');
  }

  const resolved = resolve(value);
  if (resolved.endsWith('.smartie.json')) {
    const base = resolved.slice(0, -'.smartie.json'.length);
    return `${base}.smartie-project`;
  }

  return resolved;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function roundTo(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(finiteNumber(value, 0) * factor) / factor;
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

function buildFallbackEvents({ settings, durationMs, output, telemetry }) {
  const events = [];
  const stats = {
    fallbackEvents: 0,
    strategy: 'none',
    sources: {},
    cursor: cursorTelemetryQuality(telemetry.cursor, durationMs)
  };

  const push = (event) => {
    events.push(event);
    stats.fallbackEvents += 1;
    stats.sources[event.source] = (stats.sources[event.source] || 0) + 1;
  };

  for (const motion of spacedTelemetryEvents(telemetry.motion || [], 1100, (event) => finiteNumber(event.strength, 0))
    .slice(0, Math.max(4, Math.round(durationMs / 12000)))) {
    const atMs = finiteNumber(motion.time_ms, finiteNumber(motion.time, 0) * 1000);
    const strength = clamp01(finiteNumber(motion.strength, 0.2));
    const confidence = clamp01(0.72 + strength * 0.22);
    push({
      time_ms: Math.round(atMs),
      x: roundTo(clamp01(finiteNumber(motion.x, 0.5)), 5),
      y: roundTo(clamp01(finiteNumber(motion.y, 0.5)), 5),
      type: 'motion',
      confidence,
      duration_ms: 980,
      scale: fallbackAttentionScale(settings, confidence, Math.min(finiteNumber(settings.zoomStrength, 1.7), 1.55)),
      source: 'visual_motion_fallback',
      output_width: output.width,
      output_height: output.height
    });
  }

  if (stats.cursor.usable) {
    for (const cursor of spacedTelemetryEvents(
      (telemetry.cursor || []).filter((sample) => finiteNumber(sample.velocity, 0) >= 0.003),
      1400,
      (sample) => finiteNumber(sample.velocity, 0)
    ).slice(0, Math.max(4, Math.round(durationMs / 11000)))) {
      const atMs = finiteNumber(cursor.time_ms, finiteNumber(cursor.time, 0) * 1000);
      const velocity = clamp01(finiteNumber(cursor.velocity, 0) / 0.05);
      const confidence = clamp01(0.72 + velocity * 0.2);
      push({
        time_ms: Math.round(atMs),
        x: roundTo(clamp01(finiteNumber(cursor.x, 0.5)), 5),
        y: roundTo(clamp01(finiteNumber(cursor.y, 0.5)), 5),
        type: 'attention',
        confidence,
        duration_ms: 900,
        scale: fallbackAttentionScale(settings, confidence),
        source: 'cursor_telemetry',
        output_width: output.width,
        output_height: output.height
      });
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
      push({
        time_ms: Math.round(atMs),
        x: anchor.x,
        y: anchor.y,
        type: 'focus',
        confidence: 0.72,
        duration_ms: 1300,
        scale: fallbackAttentionScale(settings, 0.72, Math.min(finiteNumber(settings.zoomStrength, 1.7), 1.42)),
        source: 'director_failsafe',
        output_width: output.width,
        output_height: output.height
      });
    }
  }

  if (stats.sources.visual_motion_fallback) {
    stats.strategy = 'visual-motion';
  } else if (stats.sources.cursor_telemetry) {
    stats.strategy = 'cursor-telemetry';
  } else if (stats.sources.director_failsafe) {
    stats.strategy = 'director-failsafe';
  }

  return { events, stats };
}

function directorStyleProfile(style) {
  return {
    subtle: {
      threshold: 0.68,
      scaleMultiplier: 0.78,
      minShotMs: 1120,
      maxShotMs: 2600,
      mergeGapMs: 620,
      maxSegmentsPerMinute: 6
    },
    balanced: {
      threshold: 0.55,
      scaleMultiplier: 1,
      minShotMs: 920,
      maxShotMs: 3200,
      mergeGapMs: 520,
      maxSegmentsPerMinute: 9
    },
    cinematic: {
      threshold: 0.48,
      scaleMultiplier: 1.14,
      minShotMs: 820,
      maxShotMs: 3800,
      mergeGapMs: 480,
      maxSegmentsPerMinute: 12
    }
  }[style] || {
    threshold: 0.55,
    scaleMultiplier: 1,
    minShotMs: 920,
    maxShotMs: 3200,
    mergeGapMs: 520,
    maxSegmentsPerMinute: 9
  };
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

function compileSegments(events, settings, durationMs) {
  const profile = directorStyleProfile(settings.directorStyle);
  const candidates = [];

  for (const event of events) {
    const cue = String(event.type || 'attention').replace(/[-\s]+/g, '_');
    const confidence = clamp01(finiteNumber(event.confidence, 0.5));
    const score = roundTo(confidence * 0.72 + cueScore(cue) * 0.28, 3);
    if (score < profile.threshold) {
      continue;
    }

    const startMs = clamp(finiteNumber(event.time_ms, 0) - 100, 0, durationMs);
    const shotDuration = clamp(Math.max(profile.minShotMs, finiteNumber(event.duration_ms, 0) + 260, 1040 + score * 520), profile.minShotMs, profile.maxShotMs);
    const endMs = Math.min(durationMs, startMs + shotDuration);
    if (endMs - startMs < profile.minShotMs) {
      continue;
    }

    const requested = Math.max(1.05, finiteNumber(settings.zoomStrength, 1.7));
    const scale = roundTo(clamp(finiteNumber(event.scale, requested), 1.04, Math.min(2.45, requested + 0.38)), 4);
    candidates.push({
      startMs: Math.round(startMs),
      endMs: Math.round(endMs),
      x: clamp01(finiteNumber(event.x, 0.5)),
      y: clamp01(finiteNumber(event.y, 0.5)),
      scale,
      cue,
      confidence,
      score,
      source: event.source || cue
    });
  }

  const maxSegments = Math.max(4, Math.round((durationMs / 60000) * profile.maxSegmentsPerMinute));
  return candidates
    .sort((a, b) => b.score - a.score || a.startMs - b.startMs)
    .slice(0, maxSegments)
    .sort((a, b) => a.startMs - b.startMs)
    .map((segment, index) => ({
      ...segment,
      id: `eval-shot-${String(index + 1).padStart(3, '0')}`
    }));
}

const projectPath = projectPathFromArg(process.argv[2]);
if (!existsSync(projectPath)) {
  throw new Error(`Smartie project path does not exist: ${projectPath}`);
}

const manifest = readJson(join(projectPath, 'manifest.json'));
const attention = readJson(join(projectPath, 'attention.timeline.json'));
const camera = readJson(join(projectPath, 'camera.plan.json'));
const cursor = readJson(join(projectPath, 'cursor.timeline.json'));
const motion = readJson(join(projectPath, 'motion.timeline.json'));
const click = existsSync(join(projectPath, 'click.timeline.json')) ? readJson(join(projectPath, 'click.timeline.json')) : { events: [] };
const settings = {
  smartMaster: manifest.smartie?.smart_stack?.enabled !== false,
  autoZoom: manifest.smartie?.smart_stack?.autoZoom !== false,
  focusMode: camera.settings?.focus_mode || manifest.smartie?.smart_stack?.focusMode || 'director',
  directorStyle: camera.settings?.director_style || manifest.smartie?.smart_stack?.directorStyle || 'balanced',
  zoomStrength: finiteNumber(camera.settings?.zoom_strength, finiteNumber(manifest.smartie?.smart_stack?.zoomStrength, 1.7))
};
const durationMs = finiteNumber(manifest.duration_ms, finiteNumber(attention.source?.duration_ms, 0));
const output = {
  width: finiteNumber(manifest.width, finiteNumber(camera.settings?.output_width, 1920)),
  height: finiteNumber(manifest.height, finiteNumber(camera.settings?.output_height, 1080))
};
const telemetry = {
  cursor: cursor.samples || [],
  motion: motion.events || [],
  clicks: click.events || []
};
const originalSegments = Array.isArray(camera.segments) ? camera.segments.length : 0;
const primaryEvents = Array.isArray(attention.events) ? attention.events.length : 0;
const fallback = buildFallbackEvents({ settings, durationMs, output, telemetry });
const projectedEvents = primaryEvents > 0 ? attention.events : fallback.events;
const projectedSegments = compileSegments(projectedEvents, settings, durationMs);

const report = {
  project: projectPath,
  recording: join(projectPath, manifest.recording || 'recording.webm'),
  durationMs,
  smartStack: manifest.smartie?.smart_stack || null,
  original: {
    attentionEvents: primaryEvents,
    cameraSegments: originalSegments,
    warnings: camera.qa?.warnings || []
  },
  telemetry: {
    cursorSamples: telemetry.cursor.length,
    motionEvents: telemetry.motion.length,
    clickEvents: telemetry.clicks.length,
    cursorQuality: fallback.stats.cursor
  },
  projected: {
    fallbackStrategy: fallback.stats.strategy,
    fallbackEvents: fallback.stats.fallbackEvents,
    fallbackSources: fallback.stats.sources,
    cameraSegments: projectedSegments.length,
    segments: projectedSegments
  }
};

console.log(JSON.stringify(report, null, 2));

if (settings.smartMaster && settings.autoZoom && durationMs >= 8000 && originalSegments === 0 && projectedSegments.length === 0) {
  throw new Error('Director eval failed: smart recording remains wide-only after fallback planning.');
}
