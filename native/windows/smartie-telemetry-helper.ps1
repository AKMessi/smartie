param(
  [switch]$stdio,
  [string]$protocol = "smartie.native_telemetry.helper.v1",
  [int]$intervalMs = 33
)

$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class SmartieWin32Telemetry {
  [StructLayout(LayoutKind.Sequential)]
  public struct POINT {
    public int X;
    public int Y;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [DllImport("user32.dll")]
  public static extern bool GetCursorPos(out POINT lpPoint);

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern int GetWindowTextLength(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

  [DllImport("user32.dll")]
  public static extern short GetAsyncKeyState(int vKey);
}
"@

function New-IsoTimestamp {
  return [DateTimeOffset]::UtcNow.ToString("o")
}

function Write-SmartieEvent {
  param([hashtable]$Event)

  if (-not $Event.ContainsKey("schema")) {
    $Event["schema"] = $protocol
  }
  if (-not $Event.ContainsKey("captured_at")) {
    $Event["captured_at"] = New-IsoTimestamp
  }
  if (-not $Event.ContainsKey("provider")) {
    $Event["provider"] = "windows-user32"
  }

  try {
    [Console]::Out.WriteLine(($Event | ConvertTo-Json -Compress -Depth 8))
    [Console]::Out.Flush()
  } catch {
    [Console]::Error.WriteLine("smartie telemetry json failure: $($_.Exception.Message)")
  }
}

function Test-KeyDown {
  param([int]$VirtualKey)
  return (([SmartieWin32Telemetry]::GetAsyncKeyState($VirtualKey) -band 0x8000) -ne 0)
}

function Get-ForegroundWindowPayload {
  $handle = [SmartieWin32Telemetry]::GetForegroundWindow()
  if ($handle -eq [IntPtr]::Zero) {
    return $null
  }

  $length = [Math]::Max(1, [SmartieWin32Telemetry]::GetWindowTextLength($handle) + 1)
  $titleBuilder = New-Object System.Text.StringBuilder($length)
  [void][SmartieWin32Telemetry]::GetWindowText($handle, $titleBuilder, $titleBuilder.Capacity)

  $processId = [uint32]0
  [void][SmartieWin32Telemetry]::GetWindowThreadProcessId($handle, [ref]$processId)

  $processName = $null
  if ($processId -gt 0) {
    try {
      $processName = (Get-Process -Id $processId -ErrorAction Stop).ProcessName
    } catch {
      $processName = $null
    }
  }

  $rect = New-Object SmartieWin32Telemetry+RECT
  $bounds = $null
  if ([SmartieWin32Telemetry]::GetWindowRect($handle, [ref]$rect)) {
    $bounds = @{
      x = [int]$rect.Left
      y = [int]$rect.Top
      width = [Math]::Max(0, [int]($rect.Right - $rect.Left))
      height = [Math]::Max(0, [int]($rect.Bottom - $rect.Top))
    }
  }

  return @{
    handle = $handle.ToInt64().ToString()
    title = $titleBuilder.ToString()
    pid = [int]$processId
    app_id = $processName
    bounds = $bounds
  }
}

$keyNames = @{
  8 = "Backspace"; 9 = "Tab"; 13 = "Enter"; 27 = "Escape"; 32 = "Space";
  33 = "PageUp"; 34 = "PageDown"; 35 = "End"; 36 = "Home";
  37 = "Left"; 38 = "Up"; 39 = "Right"; 40 = "Down";
  45 = "Insert"; 46 = "Delete";
  91 = "Super"; 92 = "Super";
  112 = "F1"; 113 = "F2"; 114 = "F3"; 115 = "F4"; 116 = "F5"; 117 = "F6";
  118 = "F7"; 119 = "F8"; 120 = "F9"; 121 = "F10"; 122 = "F11"; 123 = "F12";
  186 = "Semicolon"; 187 = "Equals"; 188 = "Comma"; 189 = "Minus"; 190 = "Period"; 191 = "Slash";
  192 = "Backtick"; 219 = "BracketLeft"; 220 = "Backslash"; 221 = "BracketRight"; 222 = "Quote"
}

for ($vk = 48; $vk -le 57; $vk++) {
  $keyNames[$vk] = ([char]$vk).ToString()
}
for ($vk = 65; $vk -le 90; $vk++) {
  $keyNames[$vk] = ([char]$vk).ToString()
}

$trackedKeys = @(
  8,9,13,27,32,33,34,35,36,37,38,39,40,45,46,91,92,
  112,113,114,115,116,117,118,119,120,121,122,123,
  186,187,188,189,190,191,192,219,220,221,222
) + (48..57) + (65..90)

$buttonMap = @{
  left = 1
  right = 2
  middle = 4
}

$lastButtons = @{}
$lastKeys = @{}
$lastPointerX = [int]::MinValue
$lastPointerY = [int]::MinValue
$lastPointerHeartbeat = [DateTimeOffset]::UtcNow.AddSeconds(-1)
$lastWindowSignature = ""
$nextWindowAt = [DateTimeOffset]::UtcNow

Write-SmartieEvent @{
  type = "helper-ready"
  protocol = $protocol
  precision = "win32-user32-global"
}

while ($true) {
  $now = [DateTimeOffset]::UtcNow
  $point = New-Object SmartieWin32Telemetry+POINT
  if ([SmartieWin32Telemetry]::GetCursorPos([ref]$point)) {
    $pointerChanged = $point.X -ne $lastPointerX -or $point.Y -ne $lastPointerY
    $pointerHeartbeatDue = ($now - $lastPointerHeartbeat).TotalMilliseconds -ge 250
    if ($pointerChanged -or $pointerHeartbeatDue) {
      Write-SmartieEvent @{
        type = "pointer"
        screen_x = [int]$point.X
        screen_y = [int]$point.Y
        precision = "win32-user32-global"
      }
      $lastPointerX = [int]$point.X
      $lastPointerY = [int]$point.Y
      $lastPointerHeartbeat = $now
    }

    foreach ($button in $buttonMap.Keys) {
      $down = Test-KeyDown $buttonMap[$button]
      $previous = [bool]($lastButtons[$button])
      if ($down -ne $previous) {
        $lastButtons[$button] = $down
        Write-SmartieEvent @{
          type = "click"
          button = $button
          action = $(if ($down) { "press" } else { "release" })
          screen_x = [int]$point.X
          screen_y = [int]$point.Y
          precision = "win32-user32-global"
        }
      }
    }
  }

  if ($now -ge $nextWindowAt) {
    $window = Get-ForegroundWindowPayload
    if ($null -ne $window) {
      $signature = "$($window.handle)|$($window.title)|$($window.pid)|$($window.bounds.x)|$($window.bounds.y)|$($window.bounds.width)|$($window.bounds.height)"
      if ($signature -ne $lastWindowSignature) {
        Write-SmartieEvent @{
          type = "window"
          title = $window.title
          pid = $window.pid
          app_id = $window.app_id
          window_id = $window.handle
          bounds = $window.bounds
          precision = "win32-user32-foreground-window"
        }
        $lastWindowSignature = $signature
      }
    }
    $nextWindowAt = $now.AddMilliseconds(250)
  }

  $ctrl = (Test-KeyDown 17) -or (Test-KeyDown 162) -or (Test-KeyDown 163)
  $alt = (Test-KeyDown 18) -or (Test-KeyDown 164) -or (Test-KeyDown 165)
  $shift = (Test-KeyDown 16) -or (Test-KeyDown 160) -or (Test-KeyDown 161)
  $meta = (Test-KeyDown 91) -or (Test-KeyDown 92)

  foreach ($vk in $trackedKeys) {
    $down = Test-KeyDown $vk
    $previous = [bool]($lastKeys[$vk])
    if ($down -ne $previous) {
      $lastKeys[$vk] = $down
      if ($down) {
        $label = $keyNames[$vk]
        $isPrintable = ($vk -ge 48 -and $vk -le 90) -or ($vk -ge 186 -and $vk -le 222) -or $vk -eq 32
        if ($isPrintable -and -not ($ctrl -or $alt -or $meta)) {
          $label = "Text"
        }

        $keys = @()
        if ($ctrl) { $keys += "Ctrl" }
        if ($alt) { $keys += "Alt" }
        if ($shift) { $keys += "Shift" }
        if ($meta) { $keys += "Super" }
        if ($label -notin @("Ctrl", "Alt", "Shift", "Super")) {
          $keys += $label
        }

        Write-SmartieEvent @{
          type = "keyboard"
          action = "press"
          key = $label
          keys = $keys
          modifiers = @{
            ctrl = $ctrl
            alt = $alt
            shift = $shift
            meta = $meta
          }
          privacy = $(if ($label -eq "Text") { "text-redacted" } else { "shortcut-or-navigation" })
          precision = "win32-user32-key-state"
        }
      }
    }
  }

  Start-Sleep -Milliseconds ([Math]::Max(8, $intervalMs))
}
