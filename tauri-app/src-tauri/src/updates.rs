use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

pub fn version(app: &AppHandle) -> Value {
    Value::String(app.package_info().version.to_string())
}

pub fn unavailable() -> Value {
    json!({ "ok": false, "error": "Auto updates are only published for the Windows build of K3d Tweaks." })
}

pub fn emit_startup(app: &AppHandle) {
    let v = app.package_info().version.to_string();
    let _ = app.emit("updater:not-available", json!({ "currentVersion": v }));
}

pub fn check() -> Value {
    json!({ "ok": true, "updateInfo": null })
}
