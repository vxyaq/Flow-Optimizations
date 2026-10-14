use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub fn folder_size(root: &Path) -> u64 {
    let mut total = 0u64;
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                stack.push(p);
            } else if p.is_file() {
                total += std::fs::metadata(&p).map(|m| m.len()).unwrap_or(0);
            }
        }
    }
    total
}

pub fn empty_folder(root: &Path) -> u64 {
    let entries: Vec<PathBuf> = std::fs::read_dir(root)
        .map(|e| e.flatten().map(|x| x.path()).collect())
        .unwrap_or_default();
    let mut freed = 0u64;
    for full in entries {
        if full.is_dir() {
            freed += folder_size(&full);
        } else {
            freed += std::fs::metadata(&full).map(|m| m.len()).unwrap_or(0);
        }
        let _ = std::fs::remove_dir_all(&full).or_else(|_| std::fs::remove_file(&full));
    }
    freed
}

fn sys_root() -> PathBuf {
    std::env::var("SystemRoot")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("C:\\Windows"))
}

fn local_app_data() -> PathBuf {
    std::env::var("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(|_| {
        dirs::home_dir()
            .unwrap_or_default()
            .join("AppData")
            .join("Local")
    })
}

fn win_targets() -> Vec<(&'static str, PathBuf, bool)> {
    vec![
        ("temp-size", sys_root().join("Temp"), false),
        ("prefetch", sys_root().join("Prefetch"), false),
        (
            "windows-update",
            sys_root().join("SoftwareDistribution").join("Download"),
            false,
        ),
        ("thumbnails-dir", PathBuf::new(), true),
        ("errorreports", local_app_data().join("CrashDumps"), false),
    ]
}

fn thumb_files() -> Vec<PathBuf> {
    let dir = local_app_data()
        .join("Microsoft")
        .join("Windows")
        .join("Explorer");
    std::fs::read_dir(&dir)
        .map(|e| {
            e.flatten()
                .map(|x| x.path())
                .filter(|p| {
                    p.is_file()
                        && p.file_name()
                            .and_then(|n| n.to_str())
                            .map(|n| {
                                let l = n.to_lowercase();
                                l.starts_with("thumbcache_") && l.ends_with(".db")
                            })
                            .unwrap_or(false)
                })
                .collect()
        })
        .unwrap_or_default()
}

fn ps_recyclebin(with_clear: bool) -> String {
    format!(
        "$recycleBinSize = 0\n$shell = New-Object -ComObject Shell.Application\n$recycleBin = $shell.Namespace(0xA)\n$recycleBinSize = ($recycleBin.Items() | Measure-Object -Property Size -Sum).Sum\nif ($null -eq $recycleBinSize) {{ $recycleBinSize = 0 }}\n{}\nWrite-Output $recycleBinSize",
        if with_clear {
            "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"
        } else {
            ""
        }
    )
}

async fn ps_run(script: String, name: &str, data_dir: &Path) -> u64 {
    let v = crate::scripts::run_powershell(&script, name, data_dir).await;
    v.get("output")
        .and_then(|o| o.as_str())
        .and_then(|s| s.trim().parse::<u64>().ok())
        .unwrap_or(0)
}

pub struct Cleaner {
    cache: Mutex<(Option<HashMap<String, u64>>, Option<Instant>)>,
}

impl Cleaner {
    pub fn new() -> Self {
        Self {
            cache: Mutex::new((None, None)),
        }
    }

    pub async fn sizes(&self, data_dir: &Path) -> HashMap<String, u64> {
        if let Ok(guard) = self.cache.lock() {
            if let (Some(map), Some(at)) = (&guard.0, &guard.1) {
                if at.elapsed() < Duration::from_secs(15) {
                    return map.clone();
                }
            }
        }
        let mut out = HashMap::new();
        for (id, dir, special) in win_targets() {
            let size = if special {
                thumb_files()
                    .iter()
                    .map(|f| std::fs::metadata(f).map(|m| m.len()).unwrap_or(0))
                    .sum()
            } else {
                folder_size(&dir)
            };
            let key = match id {
                "temp-size" => "temp",
                "thumbnails-dir" => "thumbnails",
                _ => id,
            };
            out.insert(key.to_string(), size);
        }
        out.insert(
            "recyclebin".to_string(),
            ps_run(ps_recyclebin(false), "size-recyclebin", data_dir).await,
        );
        if let Ok(mut guard) = self.cache.lock() {
            *guard = (Some(out.clone()), Some(Instant::now()));
        }
        out
    }

    pub async fn clean(&self, id: &str, data_dir: &Path) -> Result<u64, String> {
        let freed = match id {
            "temp" => {
                let dirs = vec![sys_root().join("Temp"), std::env::temp_dir()];
                let mut total = 0u64;
                for d in dirs {
                    total += empty_folder(&d);
                }
                total
            }
            "prefetch" => empty_folder(&sys_root().join("Prefetch")),
            "recyclebin" => ps_run(ps_recyclebin(true), "cleanup-recyclebin", data_dir).await,
            "windows-update" => empty_folder(
                &sys_root().join("SoftwareDistribution").join("Download"),
            ),
            "thumbnails" => {
                let mut total = 0u64;
                for f in thumb_files() {
                    total += std::fs::metadata(&f).map(|m| m.len()).unwrap_or(0);
                    let _ = std::fs::remove_file(&f);
                }
                total
            }
            "errorreports" => empty_folder(&local_app_data().join("CrashDumps")),
            _ => return Err(format!("Unknown cleaner target: {}", id)),
        };
        if let Ok(mut guard) = self.cache.lock() {
            *guard = (None, None);
        }
        Ok(freed)
    }
}

pub fn sizes_json(map: &HashMap<String, u64>) -> Value {
    let mut obj = serde_json::Map::new();
    for (k, v) in map {
        obj.insert(k.clone(), json!(*v));
    }
    Value::Object(obj)
}
