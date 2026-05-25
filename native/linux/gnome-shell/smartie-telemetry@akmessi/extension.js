import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const PROTOCOL = 'smartie.native_telemetry.helper.v1';

function nowIso() {
  return new Date().toISOString();
}

function socketPath() {
  const runtimeDir = GLib.getenv('XDG_RUNTIME_DIR') || GLib.get_tmp_dir();
  return GLib.build_filenamev([runtimeDir, 'smartie-telemetry.sock']);
}

export default class SmartieTelemetryExtension extends Extension {
  enable() {
    this._socket = null;
    this._stream = null;
    this._pollId = 0;
    this._lastPointer = null;
    this._nextConnectAt = 0;
    this._connectBackoffMs = 500;
    this._connect();
    this._pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, 50, () => {
      this._publishPointer();
      return GLib.SOURCE_CONTINUE;
    });

    this._focusSignal = global.display.connect('notify::focus-window', () => {
      this._publishFocus();
    });
    this._stageSignal = global.stage.connect('captured-event', (_actor, event) => {
      this._publishStageEvent(event);
      return Clutter.EVENT_PROPAGATE;
    });
  }

  disable() {
    if (this._pollId) {
      GLib.Source.remove(this._pollId);
      this._pollId = 0;
    }
    if (this._focusSignal) {
      global.display.disconnect(this._focusSignal);
      this._focusSignal = 0;
    }
    if (this._stageSignal) {
      global.stage.disconnect(this._stageSignal);
      this._stageSignal = 0;
    }
    this._close();
  }

  _connect() {
    const now = Date.now();
    if (this._stream || now < this._nextConnectAt) {
      return;
    }

    try {
      const client = new Gio.SocketClient();
      const address = new Gio.UnixSocketAddress({ path: socketPath() });
      this._socket = client.connect(address, null);
      this._stream = new Gio.DataOutputStream({
        base_stream: this._socket.get_output_stream()
      });
      this._connectBackoffMs = 500;
      this._send({
        type: 'adapter-ready',
        provider: 'gnome-shell',
        protocol: PROTOCOL
      });
      this._publishFocus();
    } catch {
      this._nextConnectAt = now + this._connectBackoffMs;
      this._connectBackoffMs = Math.min(5000, Math.round(this._connectBackoffMs * 1.45));
      this._close();
    }
  }

  _close() {
    try {
      if (this._stream) {
        this._stream.close(null);
      }
      if (this._socket) {
        this._socket.close(null);
      }
    } catch {
      // The Smartie app may have already closed the socket.
    }
    this._stream = null;
    this._socket = null;
  }

  _send(payload) {
    if (!this._stream) {
      this._connect();
      if (!this._stream) {
        return;
      }
    }

    try {
      this._stream.put_string(`${JSON.stringify({
        schema: PROTOCOL,
        captured_at: nowIso(),
        ...payload
      })}\n`, null);
    } catch {
      this._nextConnectAt = Date.now() + this._connectBackoffMs;
      this._connectBackoffMs = Math.min(5000, Math.round(this._connectBackoffMs * 1.45));
      this._close();
    }
  }

  _publishPointer() {
    const [screenX, screenY] = global.get_pointer();
    const previous = this._lastPointer;
    const moved = !previous || Math.hypot(screenX - previous.x, screenY - previous.y) >= 2;
    if (!moved) {
      return;
    }

    this._lastPointer = { x: screenX, y: screenY };
    this._send({
      type: 'pointer',
      provider: 'gnome-shell',
      screen_x: Math.round(screenX),
      screen_y: Math.round(screenY),
      precision: 'compositor-global'
    });
  }

  _publishFocus() {
    const window = global.display.focus_window;
    if (!window) {
      this._send({
        type: 'window',
        provider: 'gnome-shell',
        available: false
      });
      return;
    }

    const rect = window.get_frame_rect();
    this._send({
      type: 'window',
      provider: 'gnome-shell',
      available: true,
      title: window.get_title(),
      app_id: window.get_wm_class(),
      pid: window.get_pid(),
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    });
  }

  _publishStageEvent(event) {
    const type = event.type();
    if (type !== Clutter.EventType.BUTTON_PRESS) {
      return;
    }

    const [screenX, screenY] = event.get_coords();
    this._send({
      type: 'click',
      provider: 'gnome-shell',
      action: 'press',
      button: event.get_button(),
      screen_x: Math.round(screenX),
      screen_y: Math.round(screenY),
      precision: 'compositor-global'
    });
  }
}
