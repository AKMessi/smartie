---
name: Recording quality or performance
about: Report lag, dropped frames, bad zooms, or render issues
title: "[Quality]: "
labels: "quality, performance"
assignees: ""
---

## Summary

## System

- CPU:
- RAM:
- GPU:
- OS/session:
- Display resolution and scale:
- Recording FPS/quality:
- Recording engine:

## What Went Wrong

- Laggy capture:
- Laggy render:
- Wrong zoom target:
- Missing smart effects:
- Audio/video sync:

## Diagnostics

Paste:

```bash
npm run doctor
npm run telemetry:adapter -- status
npm run eval:telemetry -- /path/to/take.smartie-project --strict
npm run eval:director -- /path/to/take.smartie-project
```

Do not attach private recordings or telemetry files publicly.
