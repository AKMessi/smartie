# Privacy

Smartie is designed as a local-first screen recorder. Recording, telemetry
capture, smart-effect planning, and rendering run on the user's machine.

## What Smartie Records

When the user starts a recording, Smartie may write these artifacts beside the
saved video:

- `recording.webm`: the captured screen/window recording.
- `*.smartie.json`: recording metadata and selected settings.
- `*.chapters.vtt`: chapter markers.
- `*.smartie-project/`: editable project data for smart effects.
- `cursor.timeline.json`: cursor positions normalized to the captured display.
- `click.timeline.json`: click positions and pulse cues.
- `keyboard.timeline.json`: keyboard shortcut/intent events used for overlays
  and attention planning.
- `motion.timeline.json`: visual motion cues derived from the recording preview.
- `accessibility.timeline.json`: active window/title/bounds context when the
  platform can provide it.
- `native.timeline.json`: native/compositor/helper diagnostics and telemetry.
- `camera.plan.json`: generated zoom/pan shots and keyframes.
- `render.qa.json`: render and telemetry quality metrics.

## What Leaves The Machine

Smartie does not upload recordings, telemetry, project files, screenshots, or
microphone/camera data. The app has no hosted backend in this repository.

GitHub Actions and release tooling only run for repository builds. They do not
receive user recordings unless a user explicitly uploads files to an issue,
discussion, pull request, or external service.

## Native Telemetry

Native telemetry is used to make smart zooms land on the user's actual cursor,
clicks, and active UI context. On Linux this can come from GNOME/KWin adapters,
X11 tooling, or an optional helper. On Windows this comes from the bundled
Win32/User32 helper.

The Windows helper captures:

- global pointer position
- mouse button press/release transitions
- active foreground window title, process id, process name, and bounds
- privacy-aware keyboard intent events for shortcuts/navigation

Plain text typed into other apps should not be treated as safe to share. Users
should review generated project files before attaching them to public issues.

## Local File Locations

Saved recordings go to the selected output folder. If auto-save is enabled,
Smartie writes into that configured folder. Otherwise, the app prompts for a
save location. Smartie project folders are written beside the saved video.

## Reporting Privacy Issues

Please report privacy or security-sensitive issues using the process in
`SECURITY.md`, not in a public GitHub issue.
