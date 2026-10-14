use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct Paths {
    pub data_dir: PathBuf,
    pub resource_dir: PathBuf,
    pub tweaks_dir: PathBuf,
    pub games_dir: PathBuf,
}

pub fn paths(app: &AppHandle) -> Paths {
    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("k3d-tweaks"));
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_default());
    let dev_tweaks = PathBuf::from("../tweaks");
    let tweaks_dir = if dev_tweaks.is_dir() {
        std::env::current_dir().unwrap_or_default().join(dev_tweaks)
    } else {
        resource_dir.join("tweaks")
    };
    let dev_games = PathBuf::from("../games");
    let games_dir = if dev_games.is_dir() {
        std::env::current_dir().unwrap_or_default().join(dev_games)
    } else {
        resource_dir.join("games")
    };
    Paths {
        data_dir,
        resource_dir,
        tweaks_dir,
        games_dir,
    }
}
