use crate::scripts::run_powershell;
use crate::state::Paths;
use serde_json::{json, Value};
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use sysinfo::{Disks, System};
use tauri::Emitter;

static CACHE: Mutex<Option<(Instant, Value)>> = Mutex::new(None);

fn platform_name() -> &'static str {
    if cfg!(windows) {
        "win32"
    } else if cfg!(target_os = "macos") {
        "darwin"
    } else {
        "linux"
    }
}

fn ps_text(script: &str, data_dir: &std::path::Path) -> String {
    let rt = tokio::runtime::Handle::try_current();
    let run = || {
        let out = Command::new("powershell.exe")
            .args(["-NoProfile", "-Command", script])
            .output();
        out.map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
            .unwrap_or_default()
    };
    match rt {
        Ok(h) => h.block_on(async {
            let v = run_powershell(script, "sysinfo", data_dir).await;
            v.get("output")
                .and_then(|o| o.as_str())
                .unwrap_or("")
                .trim()
                .to_string()
        }),
        Err(_) => run(),
    }
}

pub async fn info(
    app: &tauri::AppHandle,
    paths: &Paths,
) -> Result<Value, String> {
    if let Ok(guard) = CACHE.lock() {
        if let Some((at, v)) = &*guard {
            if at.elapsed() < Duration::from_secs(300) {
                return Ok(v.clone());
            }
        }
    }
    let mut sys = System::new_all();
    sys.refresh_all();
    let cpu = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    let physical = System::physical_core_count().unwrap_or(0) as u64;
    let threads = sys.cpus().len() as u64;
    let total_mem = sys.total_memory();
    let os_version = if cfg!(windows) {
        let v = ps_text(
            "(Get-ItemProperty -Path \"HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\").DisplayVersion",
            &paths.data_dir,
        );
        if v.is_empty() {
            "Unknown".to_string()
        } else {
            v
        }
    } else {
        System::os_version().unwrap_or_else(|| "Unknown".to_string())
    };
    let os_name = System::name().unwrap_or_else(|| {
        if cfg!(windows) {
            "Windows".to_string()
        } else {
            std::env::consts::OS.to_string()
        }
    });
    let result = json!({
        "cpu_model": cpu,
        "cpu_cores": physical,
        "cpu_threads": if threads > 0 { threads } else { physical },
        "memory_total": total_mem,
        "memory_type": "Unknown",
        "os": os_name,
        "os_version": os_version,
    });
    if let Ok(mut guard) = CACHE.lock() {
        *guard = Some((Instant::now(), result.clone()));
    }
    let app2 = app.clone();
    let data_dir = paths.data_dir.clone();
    tokio::spawn(async move {
        let (model, vram, has_gpu, is_nvidia, imodel, has_igpu) =
            crate::gpu::detect(&data_dir).await;
        let _ = app2.emit(
            "system-info-extra",
            json!({
                "gpu_model": model,
                "vram": vram,
                "hasGPU": has_gpu,
                "isNvidia": is_nvidia,
                "integrated_gpu": imodel,
                "hasIntegratedGPU": has_igpu,
            }),
        );
        let disks = Disks::new_with_refreshed_list();
        let primary = disks.first();
        let (dmodel, dsize) = match primary {
            Some(d) => (
                String::from_utf8_lossy(d.name().as_encoded_bytes()).to_string(),
                format!("{:.1} GB", d.total_space() as f64 / 1024.0 / 1024.0 / 1024.0),
            ),
            None => ("Unknown Storage".to_string(), "Unknown".to_string()),
        };
        let _ = app2.emit(
            "system-info-extra",
            json!({ "disk_model": dmodel, "disk_size": dsize }),
        );
    });
    Ok(result)
}

pub fn restart() -> Value {
    let r = if cfg!(windows) {
        Command::new("shutdown").args(["/r", "/t", "0"]).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("shutdown").args(["-r", "now"]).spawn()
    } else {
        Command::new("sh")
            .args(["-c", "systemctl reboot || shutdown -r now"])
            .spawn()
    };
    match r {
        Ok(_) => json!({ "success": true }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

pub fn open_log_folder(paths: &Paths) -> Value {
    let dir = paths.data_dir.join("logs");
    if !dir.exists() {
        return json!({ "success": false, "error": "Logs directory does not exist." });
    }
    let r = if cfg!(windows) {
        Command::new("explorer").arg(&dir).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&dir).spawn()
    } else {
        Command::new("xdg-open").arg(&dir).spawn()
    };
    match r {
        Ok(_) => json!({ "success": true }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

pub fn clear_cache(paths: &Paths) -> Value {
    if let Ok(mut guard) = CACHE.lock() {
        *guard = None;
    }
    crate::gpu::clear_cache();
    let mut errors: Vec<String> = Vec::new();
    let mut cleared = false;
    for sub in ["scripts", "logs"] {
        let dir = paths.data_dir.join(sub);
        if !dir.exists() {
            errors.push(format!("{} directory does not exist.", sub));
            continue;
        }
        let mut ok = true;
        let files: Vec<std::path::PathBuf> = std::fs::read_dir(&dir)
            .map(|entries| entries.flatten().map(|e| e.path()).collect())
            .unwrap_or_default();
        for file_path in files {
            if file_path.is_file() {
                if std::fs::remove_file(&file_path).is_err() {
                    errors.push(format!("Failed to delete file: {}", file_path.display()));
                    ok = false;
                }
            }
        }
        if ok {
            cleared = true;
        }
    }
    if errors.is_empty() {
        json!({ "success": true })
    } else {
        json!({ "success": cleared, "error": errors.join(" | ") })
    }
}

pub fn restart_explorer() -> Value {
    if !cfg!(windows) {
        return json!({ "success": false, "error": "Restarting the desktop shell is only available on Windows." });
    }
    match Command::new("cmd").args(["/C", "taskkill /f /im explorer.exe & start explorer.exe"]).spawn() {
        Ok(_) => json!({ "success": true }),
        Err(e) => json!({ "success": false, "error": e.to_string() }),
    }
}

pub fn check_winget() -> Value {
    let ok = Command::new("winget")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    json!({ "success": true, "installed": ok })
}

pub fn admin_status() -> bool {
    #[cfg(windows)]
    {
        return Command::new("net")
            .arg("session")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
    }
    #[cfg(unix)]
    {
        Command::new("id")
            .arg("-u")
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "0")
            .unwrap_or(false)
    }
}

pub fn uuid() -> String {
    machine_uid::get().unwrap_or_else(|_| "Unknown".to_string())
}

pub async fn bios(paths: &Paths) -> Value {
    let fallback = json!({
        "cpuVendor": "Other",
        "isRyzen": false,
        "ramRated": null,
        "ramRunning": null,
        "uefiBoot": null,
        "virtFirmware": null,
    });
    if !cfg!(windows) {
        return fallback;
    }
    let v = run_powershell(
        "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1\n$mem = Get-CimInstance Win32_PhysicalMemory\n$rated = ($mem | Measure-Object -Property Speed -Maximum).Maximum\n$running = ($mem | Measure-Object -Property ConfiguredClockSpeed -Maximum).Maximum\n$fw = \"Unknown\"\ntry { $fw = (Get-ComputerInfo -Property BiosFirmwareType).BiosFirmwareType } catch { }\n@{ cpu = $cpu.Manufacturer; name = $cpu.Name; virt = $cpu.VirtualizationFirmwareEnabled; rated = $rated; running = $running; fw = \"$fw\" } | ConvertTo-Json -Compress",
        "GetBiosFacts",
        &paths.data_dir,
    )
    .await;
    let output = v.get("output").and_then(|o| o.as_str()).unwrap_or("");
    if output.is_empty() {
        return fallback;
    }
    let data: Value = serde_json::from_str(output).unwrap_or(Value::Null);
    let s = |k: &str| data.get(k).and_then(|x| x.as_str()).unwrap_or("").to_lowercase();
    let fw = data.get("fw").and_then(|x| x.as_str()).unwrap_or("");
    let rated = data.get("rated").and_then(|x| x.as_u64()).filter(|n| *n > 0);
    let running = data.get("running").and_then(|x| x.as_u64()).filter(|n| *n > 0);
    json!({
        "cpuVendor": if s("cpu").contains("amd") { "AMD" } else if s("cpu").contains("intel") { "Intel" } else { "Other" },
        "isRyzen": s("name").contains("ryzen"),
        "ramRated": rated,
        "ramRunning": running,
        "uefiBoot": if fw == "Uefi" { Value::Bool(true) } else if fw == "Legacy" { Value::Bool(false) } else { Value::Null },
        "virtFirmware": data.get("virt").cloned().unwrap_or(Value::Null),
    })
}

pub fn detect_games() -> Value {
    if !cfg!(windows) {
        return json!([
            { "id": "cs2", "installed": false },
            { "id": "fortnite", "installed": false },
        ]);
    }
    let mut libs = vec!["C:\\Program Files (x86)\\Steam".to_string()];
    if let Ok(out) = Command::new("reg")
        .args(["query", "HKCU\\Software\\Valve\\Steam", "/v", "SteamPath"])
        .output()
    {
        let text = String::from_utf8_lossy(&out.stdout).to_string();
        for line in text.lines() {
            if line.contains("SteamPath") {
                if let Some(val) = line.split_whitespace().last() {
                    if !val.is_empty() && !libs.contains(&val.to_string()) {
                        let vdf = std::path::Path::new(val).join("steamapps").join("libraryfolders.vdf");
                        if let Ok(content) = std::fs::read_to_string(&vdf) {
                            let mut start = 0usize;
                            while let Some(i) = content[start..].find("\"path\"") {
                                let rest = &content[start + i..];
                                if let Some(q1) = rest.find('"').and_then(|_| rest[6..].find('"')) {
                                    let seg = &rest[6..6 + q1];
                                    let lib = seg.replace("\\\\", "\\");
                                    if !lib.is_empty() && !libs.contains(&lib) {
                                        libs.push(lib);
                                    }
                                }
                                start += i + 6;
                            }
                        }
                        libs.push(val.to_string());
                    }
                }
            }
        }
    }
    let mut cs2 = false;
    for lib in &libs {
        let p = std::path::Path::new(lib)
            .join("steamapps")
            .join("common")
            .join("Counter-Strike Global Offensive")
            .join("game")
            .join("bin")
            .join("win64")
            .join("cs2.exe");
        if p.exists() {
            cs2 = true;
            break;
        }
    }
    let fortnite = std::path::Path::new("C:\\Program Files\\Epic Games\\Fortnite\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe").exists();
    json!([
        { "id": "cs2", "installed": cs2 },
        { "id": "fortnite", "installed": fortnite },
    ])
}

pub fn install_winget() -> Value {
    let has = Command::new("winget")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if has {
        return json!({ "success": true, "output": "Winget is already installed." });
    }
    json!({ "success": false, "error": "Winget is not installed. Install App Installer from the Microsoft Store." })
}

const WEBHOOK_URL: &str = "https://discord.com/api/webhooks/1557885258660188170/KSpWIgFw-GtMijhCEoR8Q3B0Abn4PUGBHUGck8ZoWA-hKrdoDO2g2jbCPwf5xyfg9TyC";

pub async fn send_request(store: &crate::store::Store, game: &Value) -> Value {
    let name = game.as_str().unwrap_or("").trim().to_string();
    if name.len() < 2 || name.len() > 100 {
        return json!({ "ok": false, "error": "Game name must be between 2 and 100 characters." });
    }
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    let last = store
        .get("lastGameRequestAt")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    let wait = 30 * 60 * 1000 - (now - last);
    if wait > 0 {
        return json!({ "ok": false, "error": format!("You can send the next request in {} minutes.", (wait + 59999) / 60000) });
    }
    let from = store
        .get("account")
        .and_then(|a| a.get("displayName").and_then(|d| d.as_str()).map(|s| s.to_string()))
        .unwrap_or_else(|| "Unknown user".to_string());
    let client = reqwest::Client::new();
    let res = tokio::time::timeout(
        Duration::from_secs(10),
        client
            .post(WEBHOOK_URL)
            .json(&json!({ "content": format!("New game request from {}: {}", from, name) }))
            .send(),
    )
    .await;
    match res {
        Err(_) => json!({ "ok": false, "error": "Request timed out." }),
        Ok(Err(e)) => json!({ "ok": false, "error": e.to_string() }),
        Ok(Ok(r)) => {
            if !r.status().is_success() {
                return json!({ "ok": false, "error": format!("Request failed ({}).", r.status()) });
            }
            store.set("lastGameRequestAt", json!(now));
            json!({ "ok": true })
        }
    }
}

pub fn platform_str() -> Value {
    Value::String(platform_name().to_string())
}
