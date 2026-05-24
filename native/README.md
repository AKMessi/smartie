# Smartie Native Telemetry

Smartie records through Electron, but precision telemetry must come from the
desktop compositor or a trusted native helper. During every recording Smartie
opens:

```text
$XDG_RUNTIME_DIR/smartie-telemetry.sock
```

Trusted adapters can stream newline-delimited JSON events to that socket:

```json
{"type":"pointer","provider":"gnome-shell","screen_x":1200,"screen_y":720,"precision":"compositor-global"}
{"type":"window","provider":"gnome-shell","title":"Editor","app_id":"code","bounds":{"x":0,"y":0,"width":1920,"height":1080}}
```

Smartie also supports an external stdio helper through:

```bash
SMARTIE_TELEMETRY_HELPER=/path/to/smartie-telemetry-core npm start
```

The helper must speak `smartie.native_telemetry.helper.v1` JSONL over stdio.
Events are stored in `native.timeline.json` and graded in `render.qa.json`.

Telemetry tiers:

- `precision`: compositor/native pointer plus semantic accessibility context.
- `native-pointer`: native pointer/window data without enough semantic context.
- `portal-ready`: Wayland portal/PipeWire exists, but no compositor adapter is streaming.
- `x11-native`: X11 telemetry through `xdotool`.
- `electron-fallback`: only Electron polling and visual fallback are available.
