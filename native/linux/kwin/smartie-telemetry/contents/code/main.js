var SMARTIE_PROTOCOL = "smartie.native_telemetry.helper.v1";
var SMARTIE_PREFIX = "SMARTIE_TELEMETRY ";
var lastPointerX = null;
var lastPointerY = null;
var lastPointerAt = 0;

function nowIso() {
    return new Date().toISOString();
}

function emitSmartieEvent(payload) {
    payload.schema = SMARTIE_PROTOCOL;
    payload.provider = "kwin-script";
    payload.captured_at = nowIso();
    print(SMARTIE_PREFIX + JSON.stringify(payload));
}

function numberValue(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
}

function rectPayload(rect) {
    if (!rect) {
        return null;
    }

    return {
        x: Math.round(numberValue(rect.x, 0)),
        y: Math.round(numberValue(rect.y, 0)),
        width: Math.round(numberValue(rect.width, 0)),
        height: Math.round(numberValue(rect.height, 0))
    };
}

function windowPayload(window) {
    if (!window) {
        return {
            type: "window",
            available: false
        };
    }

    return {
        type: "window",
        available: true,
        title: String(window.caption || window.resourceName || ""),
        app_id: String(window.resourceClass || window.windowClass || ""),
        pid: numberValue(window.pid, null),
        bounds: rectPayload(window.frameGeometry || window.clientGeometry || window.bufferGeometry)
    };
}

function publishWindow(window) {
    emitSmartieEvent(windowPayload(window || workspace.activeWindow));
}

function publishPointer() {
    var point = cursorPos;
    if (!point) {
        return;
    }

    var x = Math.round(numberValue(point.x, 0));
    var y = Math.round(numberValue(point.y, 0));
    var now = Date.now();
    var distance = lastPointerX === null
        ? 999
        : Math.sqrt(Math.pow(x - lastPointerX, 2) + Math.pow(y - lastPointerY, 2));
    var movedEnough = distance >= 2;
    if (!movedEnough && now - lastPointerAt < 600) {
        return;
    }

    lastPointerX = x;
    lastPointerY = y;
    lastPointerAt = now;
    emitSmartieEvent({
        type: "pointer",
        screen_x: x,
        screen_y: y,
        precision: "compositor-global"
    });
}

try {
    if (workspace.cursorPosChanged) {
        workspace.cursorPosChanged.connect(publishPointer);
    }
    if (workspace.windowActivated) {
        workspace.windowActivated.connect(publishWindow);
    }

    publishPointer();
    publishWindow(workspace.activeWindow);
    emitSmartieEvent({
        type: "adapter-ready"
    });
} catch (error) {
    emitSmartieEvent({
        type: "adapter-error",
        message: String(error)
    });
}
