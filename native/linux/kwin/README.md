# KWin Precision Adapter

KWin exposes compositor-owned cursor position, focused window, and window
geometry to KWin scripts/effects. The bundled `smartie-telemetry` KWin script
publishes JSON events with the `SMARTIE_TELEMETRY ` prefix through KWin script
logging/print output.

Smartie can consume those events through a native helper that listens to KWin's
script output or D-Bus bridge and forwards the JSONL events to:

```bash
SMARTIE_TELEMETRY_HELPER=/path/to/kwin-smartie-helper npm start
```

The helper should stream `smartie.native_telemetry.helper.v1` JSONL events to
stdout or bridge a KWin script/effect into Smartie's local recording socket:

```text
$XDG_RUNTIME_DIR/smartie-telemetry.sock
```

Minimum events for `precision` mode:

```json
{"type":"pointer","provider":"kwin-script","screen_x":1200,"screen_y":720,"precision":"compositor-global"}
{"type":"window","provider":"kwin-script","title":"Editor","bounds":{"x":0,"y":0,"width":1920,"height":1080}}
```

Smartie grades the take as `precision` when this compositor stream is combined
with available semantic accessibility context.
