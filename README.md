# Smartie

Smartie is a Linux-compatible smart screen recorder for polished demo videos.
It records a selected screen or window through Electron with a hybrid smart
pipeline by default: capture stays native and low-latency during the take, then
the smart zoom, cursor polish, overlays, and framing effects are baked into the
saved video after recording.

## Current Features

- Screen and window source picker with live thumbnails.
- Hybrid Smartie pipeline that records native video first and post-renders smart effects into the saved file.
- Native smooth recording pipeline for direct desktop capture when no baked effects are needed.
- Optional canvas-based live smart-effects pipeline for fully real-time baked effects.
- Adaptive performance governor with Auto, Potato saver, Ultra smooth, Balanced, and Max quality profiles.
- Disk-backed recording sessions that stream MediaRecorder chunks to the main process instead of holding the whole take in renderer memory.
- Smart Director v2 auto zoom with telemetry capture, cue scoring, offline camera-plan compilation, render QA, and smooth keyframed playback.
- Director failsafe planning for Wayland/window-source recordings where cursor telemetry is unavailable or stuck.
- Smart focus modes for Smart Director, cursor follow, motion-aware targeting, click-to-lock focus, and forced wide shot.
- Director style presets for subtle, balanced, or cinematic camera plans.
- Editable Director Plan controls for hiding shots, adjusting zoom intensity, and changing shot duration after a take.
- Separate telemetry timelines for cursor, click, keyboard, motion, accessibility context, proxy preview metadata, and render QA.
- Vector cursor/highlight rendering that follows the compiled camera transform instead of being tied to raw captured pixels.
- Master Smart Features toggle plus individual toggles for:
  - Auto zoom
  - Cursor spotlight
  - Cursor trail
  - Motion focus
  - Keyboard overlay
  - Rendered take title overlays
  - Presenter cue overlays
  - Click/moment pulse
  - Automatic smart chapter markers
  - Idle wide shot
  - Privacy blur
- Microphone capture support.
- Live mic level meter with gain control, noise gate, and recording-safe mute.
- Microphone and camera device selectors with refresh support.
- Optional mirrored webcam bubble with selectable corner placement.
- Optional hide-while-recording mode to keep Smartie out of full-screen takes.
- Auto-save mode with a selectable output folder for repeated takes.
- Recent takes list with quick reveal actions.
- Chapter markers with a shortcut, automatic smart moments, and brief rendered marker overlay.
- JSON sidecar metadata next to every saved video with markers and smart settings.
- Smartie project sidecar next to every saved video with recording, manifest, metadata, attention timeline, and editable camera plan files.
- WebVTT chapter sidecars for marker import into players and editors.
- PNG snapshot capture from the polished recording canvas.
- Take title naming with optional rendered title card and lower-third overlay.
- Presenter cue text with optional rendered top or bottom prompt overlay.
- Landscape, square, and vertical output layouts for demo, social, and mobile-ready exports.
- Rendered privacy blur region for masking sensitive UI during demos.
- Live capture health telemetry with FPS and dropped-frame estimates.
- Pause/resume, discard, and elapsed-time tracking that excludes pauses.
- Persistent capture and smart-framing preferences.
- Global recorder shortcuts with Wayland portal support where available.
- Low-latency Smartie hybrid engine, native recording engine, live smart-effects engine, adaptive optimization presets, quality presets,
  frame-rate control, smart-effects layout control, countdown, elapsed timer, WebM export, and optional bundled-FFmpeg MP4 copy.
- Linux desktop support through Electron desktop capture APIs.

## Requirements

- Node.js 22 or newer.
- npm 9 or newer.
- Linux desktop session with screen capture permission available to Electron.

## Install

```bash
npm install
```

## Run

```bash
npm start
```

The development launcher passes Electron `--no-sandbox` so it can run from
mounted Linux drives where Chromium's setuid sandbox helper cannot be made
root-owned.

## Global Shortcuts

- `Ctrl+Alt+R`: start or stop recording.
- `Ctrl+Alt+P`: pause or resume recording.
- `Ctrl+Alt+X`: discard the active recording.
- `Ctrl+Alt+S`: toggle Smart Stack features.
- `Ctrl+Alt+M`: mute or unmute microphone.
- `Ctrl+Alt+F`: lock or release smart focus.
- `Ctrl+Alt+K`: drop a chapter marker.
- `Ctrl+Alt+J`: save a PNG snapshot.
- `Ctrl+Alt+H`: show or hide Smartie.

On some desktop environments a shortcut can fail to register if another app or
the OS already owns it.

## Verify

```bash
npm run check
npm run smoke
npm run doctor
```

## Smartie Project

Each saved take writes a Smartie project directory beside the WebM:

```text
smartie-my-take.webm
smartie-my-take.smartie.json
smartie-my-take.chapters.vtt
smartie-my-take.smartie-project/
  manifest.json
  recording.webm
  attention.timeline.json
  cursor.timeline.json
  click.timeline.json
  keyboard.timeline.json
  motion.timeline.json
  accessibility.timeline.json
  proxy.timeline.json
  camera.plan.json
  render.qa.json
  proxy-preview.jpg
  recording.smartie.json
```

The attention timeline stores high-level cues. The separate telemetry timelines
store source cursor, click, keyboard, motion, semantic/accessibility context,
proxy preview metadata, and render QA. The camera plan stores compiled smart
zoom shots, keyframes, QA warnings, and editable segment metadata so Smartie can
edit the director plan without changing the capture format.

## Performance Architecture

Smartie records through an adaptive telemetry-first pipeline. The Auto profile
inspects CPU cores, memory, platform, and desktop session, then chooses the
lightest profile that should keep capture smooth. Potato saver caps capture
resolution, FPS, bitrate, preview refresh, motion scanning, webcam capture, and
telemetry density. If the live canvas path starts dropping frames, the governor
demotes expensive work during the take.

The default Smartie hybrid engine keeps capture native and streams chunks to a
temporary main-process recording session on disk. Smart zoom, vector cursor
polish, overlays, and camera-plan rendering happen after stop, so weaker systems
do not pay that cost while recording. Live smart effects remain available, but
Auto and Potato saver move live canvas recording to hybrid when needed.

Smartie also evaluates telemetry quality before compiling the camera plan. If
Wayland or a window-source capture reports unusable all-zero cursor data, the
Director now falls back to visual motion telemetry and then conservative
failsafe focus shots instead of rendering a long wide-only take.

On Linux/X11, semantic context can include the active window title through
`xdotool` when available. On Wayland, Smartie records the limitation in
`accessibility.timeline.json` until a native portal/accessibility helper is
added.

## Package

```bash
npm run package:linux
```

## Notes

Smartie always writes the primary recording as WebM and can also create a
bundled-FFmpeg MP4 copy. Use the default Smartie hybrid engine for smooth
capture with baked smart zoom and overlays. Use Native smooth only for raw
desktop capture without baked smart effects. Use Live smart effects when effects
must be rendered during recording instead of after stop.
