use crate::store::Store;
use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

static TRAY_ON: Mutex<bool> = Mutex::new(false);

fn icon_image() -> Option<Image<'static>> {
    let bytes: &[u8] = include_bytes!("../../resources/k3dtweaks-logo.png");
    let img = image::load_from_memory(bytes).ok()?.to_rgba8();
    let (w, h) = (img.width(), img.height());
    Some(Image::new_owned(img.into_raw(), w, h))
}

pub fn ensure(app: &AppHandle, on: bool) {
    let mut flag = TRAY_ON.lock().unwrap_or_else(|e| e.into_inner());
    if on && !*flag {
        let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>).ok();
        let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).ok();
        let menu = match (&show, &quit) {
            (Some(s), Some(q)) => Menu::with_items(app, &[s, q]).ok(),
            _ => None,
        };
        let mut builder = TrayIconBuilder::new();
        if let Some(icon) = icon_image() {
            builder = builder.icon(icon);
        }
        if let Some(m) = menu.as_ref() {
            builder = builder.menu(m);
        }
        let built = builder
            .on_menu_event(|app, event| match event.id.as_ref() {
                "show" => {
                    if let Some(w) = app.get_webview_window("main") {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
                "quit" => app.exit(0),
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    if let Some(w) = app.get_webview_window("main") {
                        if w.is_visible().unwrap_or(true) {
                            let _ = w.hide();
                        } else {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                }
            })
            .build(app);
        if built.is_ok() {
            *flag = true;
        }
    } else if !on && *flag {
        app.remove_tray_by_id("main");
        *flag = false;
    }
}

pub fn get(store: &Store) -> Value {
    store.get("showTray").and_then(|v| v.as_bool()).unwrap_or(false).into()
}

pub fn set(app: &AppHandle, store: &Store, value: bool) -> Value {
    store.set("showTray", Value::Bool(value));
    ensure(app, value);
    json!(value)
}

pub fn init(app: &AppHandle, store: &Store) {
    if store.get("showTray").is_none() {
        store.set("showTray", Value::Bool(false));
    }
    if store.get("showTray").and_then(|v| v.as_bool()) == Some(true) {
        ensure(app, true);
    }
}
