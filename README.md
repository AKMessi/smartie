# Smartie

Smartie is a Linux-compatible smart screen recorder for polished demo videos.
It records a selected screen or window through Electron, renders the capture
through a real-time canvas pipeline, and can add smooth smart zoom, cursor
spotlight, motion emphasis, keyboard overlays, and recording polish with one
master feature toggle.

## Current Features

- Screen and window source picker with live thumbnails.
- Canvas-based recording pipeline for real-time effects.
- Smooth smart zoom that follows the cursor and eases back out when idle.
- Smart focus modes for cursor follow, motion-aware targeting, click-to-lock focus, and forced wide shot.
- Master Smart Features toggle plus individual toggles for:
  - Auto zoom
  - Cursor spotlight
  - Motion focus
  - Keyboard overlay
  - Click/moment pulse
  - Idle wide shot
- Microphone capture support.
- Live mic level meter with gain control and recording-safe mute.
- Optional mirrored webcam bubble with selectable corner placement.
- Optional hide-while-recording mode to keep Smartie out of full-screen takes.
- Auto-save mode with a selectable output folder for repeated takes.
- Recent takes list with quick reveal actions.
- Chapter markers with a shortcut and brief rendered marker overlay.
- JSON sidecar metadata next to every saved video with markers and smart settings.
- Live capture health telemetry with FPS and dropped-frame estimates.
- Pause/resume, discard, and elapsed-time tracking that excludes pauses.
- Persistent capture and smart-framing preferences.
- Global recorder shortcuts with Wayland portal support where available.
- Quality presets, frame-rate control, countdown, elapsed timer, and local WebM
  export.
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
- `Ctrl+Alt+H`: show or hide Smartie.

On some desktop environments a shortcut can fail to register if another app or
the OS already owns it.

## Verify

```bash
npm run check
npm run smoke
npm run doctor
```

## Package

```bash
npm run package:linux
```

## Notes

Smartie currently exports WebM recordings. The smart effects are rendered into
the video itself, so the output file includes the zoom/framing decisions instead
of only previewing them in the app.
