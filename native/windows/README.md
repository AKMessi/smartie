# Smartie Windows Native Telemetry

Smartie bundles a Windows telemetry helper at:

```text
native/windows/smartie-telemetry-helper.ps1
```

The helper uses Win32/User32 APIs through PowerShell/.NET P/Invoke and streams
`smartie.native_telemetry.helper.v1` JSONL events to Smartie's native telemetry
core.

It captures:

- global pointer position
- mouse button press/release transitions
- foreground window title, process id, process name, and bounds
- privacy-aware keyboard intent for shortcuts and navigation keys

Plain printable typing without Ctrl/Alt/Win is emitted as a generic `Text`
intent instead of the actual character. This keeps the Director aware that
keyboard activity happened without turning native telemetry into a raw keylogger.

The helper is auto-discovered on Windows. To override it during development:

```powershell
$env:SMARTIE_TELEMETRY_HELPER = "C:\path\to\custom-helper.exe"
npm start
```
