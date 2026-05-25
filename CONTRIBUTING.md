# Contributing

Smartie is a source-available, noncommercial project. Contributions are
accepted under the repository license in `LICENSE`.

## Development Setup

```bash
npm ci
npm start
```

The development launcher uses `--no-sandbox` so it can run from mounted Linux
drives where Chromium's setuid sandbox helper cannot be made root-owned.

## Verification

Run these before opening a pull request:

```bash
npm run check
npm run smoke
npm run doctor
npm audit --audit-level=high
```

For telemetry or smart zoom changes, also run:

```bash
npm run eval:telemetry -- /path/to/take.smartie-project --strict
npm run eval:director -- /path/to/take.smartie-project
```

For packaging changes, run the folder package smoke path:

```bash
npm run package:linux
dist/Smartie-linux-x64/Smartie --no-sandbox --smoke-test
```

Windows packaging should be verified on a Windows runner or machine:

```bash
npm run package:win
npm run release:win
```

## Architecture Rules

- Keep capture lightweight during recording.
- Prefer telemetry-first smart effects: record clean video and rich timelines,
  then compile camera/effect plans after recording.
- Avoid adding live render work to the capture path unless it is behind an
  explicit user setting.
- Keep native helpers local, explicit, and versioned.
- Treat telemetry files as sensitive user data.

## Pull Request Checklist

- Describe the user-visible behavior change.
- Include the verification commands you ran.
- Note platform coverage: Linux X11, Linux Wayland/GNOME, Linux Wayland/KDE,
  Windows, or fallback-only.
- Include before/after notes for smart-effect changes.
- Do not attach private recordings or telemetry dumps publicly.
