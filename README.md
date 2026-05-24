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
- Smart Director v2 auto zoom with telemetry capture, cue scoring, offline camera-plan compilation, render QA, and smooth keyframed playback.
- Smart focus modes for Smart Director, cursor follow, motion-aware targeting, click-to-lock focus, and forced wide shot.
- Director style presets for subtle, balanced, or cinematic camera plans.
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
- Low-latency Smartie hybrid engine, native recording engine, live smart-effects engine, render-load presets, quality presets,
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
  camera.plan.json
  recording.smartie.json
```

The attention timeline stores cursor, click, keyboard, marker, and director
cues. The camera plan stores the compiled smart zoom shots, keyframes, QA
warnings, and editable segment metadata so Smartie can evolve into a full
timeline editor without changing the capture format.

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
