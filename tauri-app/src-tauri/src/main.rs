mod auth;
mod background;
mod backup;
mod cleaner;
mod games;
mod gpu;
mod rpc;
mod scripts;
mod state;
mod store;
mod system;
mod tray;
mod tweaks;
mod updates;

use serde_json::{json, Value};
use state::Paths;
use store::Store;
use tauri::Manager;

fn stores(paths: &Paths) -> (Store, Store) {
    (
        Store::open(paths.data_dir.join("k3d-store.json")),
        Store::open(paths.data_dir.join("tweakStates.json")),
    )
}

fn str_arg(payload: &Value) -> String {
    payload
        .as_str()
        .map(|s| s.to_string())
        .unwrap_or_default()
}

async fn route(app: tauri::AppHandle, channel: &str, payload: Value) -> Result<Value, String> {
    let paths = state::paths(&app);
    let (store, states) = stores(&paths);
    auth::check_reset(&store);
    match channel {
        "tweaks:fetch" => Ok(Value::Array(tweaks::load_tweaks(&paths))),
        "tweak:apply" => {
            let p = if payload.is_null() {
                json!({})
            } else {
                payload.clone()
            };
            if p.is_string() {
                let name = p.as_str().unwrap_or("").to_string();
                tweaks::apply(&paths, &store, json!({ "name": name })).await
            } else {
                tweaks::apply(&paths, &store, p).await
            }
        }
        "tweak:unapply" => tweaks::unapply(&paths, &str_arg(&payload)).await,
        "tweak-states:load" => Ok(Value::String(
            std::fs::read_to_string(paths.data_dir.join("tweakStates.json"))
                .unwrap_or_else(|_| "{}".to_string()),
        )),
        "tweak-states:save" => {
            let text = str_arg(&payload);
            if serde_json::from_str::<Value>(&text).is_err() {
                return Err("Invalid tweak states.".to_string());
            }
            std::fs::create_dir_all(&paths.data_dir).map_err(|e| e.to_string())?;
            std::fs::write(paths.data_dir.join("tweakStates.json"), text)
                .map_err(|e| e.to_string())?;
            let _ = states;
            Ok(Value::Bool(true))
        }
        "tweak:active" => Ok(Value::Array(
            tweaks::active_names(&paths)
                .into_iter()
                .map(Value::String)
                .collect(),
        )),
        "nvidia-inspector" => Err("Use tweak:apply for optimize-nvidia-settings.".to_string()),
        "cleaner:get-sizes" => {
            let c = cleaner::Cleaner::new();
            Ok(cleaner::sizes_json(&c.sizes(&paths.data_dir).await))
        }
        "cleaner:run-cleanup" => {
            let c = cleaner::Cleaner::new();
            c.clean(&str_arg(&payload), &paths.data_dir)
                .await
                .map(|n| json!(n))
        }
        "create-k3d-restore-point" => {
            let b = backup::Backup::new();
            Ok(b.create_k3d(&paths.data_dir).await)
        }
        "create-restore-point" => {
            let b = backup::Backup::new();
            Ok(b.create_named(&str_arg(&payload), &paths.data_dir).await)
        }
        "delete-all-restore-points" => {
            let b = backup::Backup::new();
            Ok(b.delete_all(&paths.data_dir).await)
        }
        "get-restore-points" => {
            let b = backup::Backup::new();
            Ok(b.points(&paths.data_dir).await)
        }
        "restore-restore-point" => {
            let seq = payload
                .as_i64()
                .or_else(|| payload.as_str().and_then(|s| s.parse::<i64>().ok()))
                .unwrap_or(0);
            let b = backup::Backup::new();
            Ok(b.restore(seq, &paths.data_dir).await)
        }
        "delete-old-k3d-backups" => {
            let root = std::path::PathBuf::from("C:\\K3d Tweaks");
            if !root.exists() {
                return Ok(json!({ "success": true, "message": "K3d Tweaks folder does not exist" }));
            }
            match std::fs::remove_dir_all(&root) {
                Ok(_) => Ok(json!({ "success": true, "message": "K3d Tweaks folder deleted" })),
                Err(e) => Err(e.to_string()),
            }
        }
        "games:fetch" => Ok(Value::Array(games::load_games(&paths))),
        "games:detect" => Ok(system::detect_games()),
        "game:apply" => games::apply(&paths, &str_arg(&payload)).await,
        "game:unapply" => games::unapply(&paths, &str_arg(&payload)).await,
        "get-system-info" => system::info(&app, &paths).await,
        "get-system-uuid" => Ok(Value::String(system::uuid())),
        "get-admin-status" => Ok(Value::Bool(system::admin_status())),
        "get-platform" => Ok(system::platform_str()),
        "bios:status" => Ok(system::bios(&paths).await),
        "check-winget" => Ok(system::check_winget()),
        "install-winget" => Ok(system::install_winget()),
        "request:send" => Ok(system::send_request(&store, &payload).await),
        "restart" => Ok(system::restart()),
        "restart-explorer" => Ok(system::restart_explorer()),
        "open-log-folder" => Ok(system::open_log_folder(&paths)),
        "clear-k3d-cache" => Ok(system::clear_cache(&paths)),
        "auth:get-session" => Ok(auth::session(&store)),
        "auth:refresh-plan" => Ok(auth::refresh_plan(&store).await),
        "auth:logout" => Ok(auth::logout(&store)),
        "auth:get-server-url" => Ok(auth::get_server_url(&store)),
        "auth:set-server-url" => Ok(auth::set_server_url(&store, &str_arg(&payload))),
        "auth:login" => Ok(auth::login(&store, &str_arg(&payload)).await),
        "updater:get-version" => Ok(updates::version(&app)),
        "updater:check" => Ok(updates::check()),
        "updater:download" => Ok(updates::unavailable()),
        "updater:install" => Ok(updates::unavailable()),
        "tray:get" => Ok(tray::get(&store)),
        "tray:set" => Ok(tray::set(
            &app,
            &store,
            payload.as_bool().unwrap_or(false),
        )),
        "rpc:status" => Ok(rpc::status()),
        "rpc-enabled:get" => Ok(rpc::enabled(&store)),
        "rpc-enabled:set" => Ok(rpc::set_enabled(&store, payload.as_bool().unwrap_or(false))),
        "start-discord-rpc" => Ok(json!({ "ok": true })),
        "stop-discord-rpc" => Ok(json!({ "ok": true })),
        "background:get-path" => {
            let idx = payload.as_u64().unwrap_or(0) as usize;
            Ok(background::path_for(&paths, idx)
                .map(Value::String)
                .unwrap_or(Value::Null))
        }
        "background:get-data-url" => {
            let idx = payload.as_u64().unwrap_or(0) as usize;
            Ok(background::data_url(&paths, idx))
        }
        "window-minimize" => {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.minimize();
            }
            Ok(Value::Null)
        }
        "window-toggle-maximize" => {
            if let Some(w) = app.get_webview_window("main") {
                if w.is_maximized().unwrap_or(false) {
                    let _ = w.unmaximize();
                } else {
                    let _ = w.maximize();
                }
            }
            Ok(Value::Null)
        }
        "window-close" => {
            let show_tray = store.get("showTray").and_then(|v| v.as_bool()).unwrap_or(false);
            if let Some(w) = app.get_webview_window("main") {
                if show_tray {
                    let _ = w.hide();
                } else {
                    app.exit(0);
                }
            }
            Ok(Value::Null)
        }
        "open-devtools" => {
            // DevTools disabled in production for security
            #[cfg(debug_assertions)]
            {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.open_devtools();
                }
            }
            Ok(Value::Null)
        }
        _ => Ok(Value::Null),
    }
}

#[tauri::command]
async fn dispatch(
    app: tauri::AppHandle,
    channel: String,
    payload: Option<Value>,
) -> Result<Value, String> {
    route(app, &channel, payload.unwrap_or(Value::Null)).await
}

fn main() {
    if cfg!(target_os = "linux") {
        // Remove deprecated WEBKIT_FORCE_SANDBOX from environment to prevent warnings
        // in newer WebKitGTK versions that no longer honor this variable
        std::env::remove_var("WEBKIT_FORCE_SANDBOX");
        
        if std::env::var_os("GDK_BACKEND").is_none() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
        if std::env::var_os("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS").is_none() {
            std::env::set_var("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "0");
        }
    }
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![dispatch])
.setup(|app| {
            let handle = app.handle().clone();
            let paths = state::paths(&handle);
            let (store, _) = stores(&paths);
            tray::init(&handle, &store);
            updates::emit_startup(&handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let paths = state::paths(app);
                let (store, _) = stores(&paths);
                let show_tray = store
                    .get("showTray")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                if show_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
.run(tauri::generate_context!())
        .expect("error while running tauri application");
}
