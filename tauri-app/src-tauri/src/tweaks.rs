use crate::scripts::run_powershell;
use crate::state::Paths;
use crate::store::Store;
use serde_json::{json, Map, Value};
use std::process::Command;

fn is_pro(meta: &Value) -> bool {
    meta.get("category")
        .and_then(|c| c.as_array())
        .map(|a| a.iter().any(|v| v.as_str() == Some("Pro")))
        .unwrap_or(false)
        || meta
            .get("category")
            .and_then(|c| c.as_str())
            .map(|s| s == "Pro")
            .unwrap_or(false)
}

fn is_bios(meta: &Value) -> bool {
    meta.get("category")
        .and_then(|c| c.as_array())
        .map(|a| a.iter().any(|v| v.as_str() == Some("BIOS")))
        .unwrap_or(false)
        || meta
            .get("category")
            .and_then(|c| c.as_str())
            .map(|s| s == "BIOS")
            .unwrap_or(false)
}

fn is_gpu(meta: &Value, name: &str) -> bool {
    let cat = meta
        .get("category")
        .and_then(|c| c.as_array())
        .map(|a| a.iter().any(|v| v.as_str() == Some("GPU")))
        .unwrap_or(false);
    cat || name == "optimize-nvidia-settings"
}

fn read_opt(dir: &std::path::Path, file: &str) -> String {
    std::fs::read_to_string(dir.join(file)).unwrap_or_default()
}

pub fn load_tweaks(paths: &Paths) -> Vec<Value> {
    let mut out = Vec::new();
    let entries = std::fs::read_dir(&paths.tweaks_dir);
    let entries = match entries {
        Ok(e) => e,
        Err(_) => return out,
    };
    for entry in entries.flatten() {
        let folder = entry.path();
        if !folder.is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let meta_text = std::fs::read_to_string(folder.join("meta.json")).unwrap_or_default();
        if meta_text.is_empty() {
            continue;
        }
        let meta: Value = match serde_json::from_str(&meta_text) {
            Ok(m) => m,
            Err(_) => continue,
        };
        let mut obj = Map::new();
        obj.insert("name".to_string(), Value::String(name));
        obj.insert(
            "psapply".to_string(),
            Value::String(read_opt(&folder, "apply.ps1")),
        );
        obj.insert(
            "psunapply".to_string(),
            Value::String(read_opt(&folder, "unapply.ps1")),
        );
        obj.insert(
            "shapply".to_string(),
            Value::String(read_opt(&folder, "apply.sh")),
        );
        obj.insert(
            "shunapply".to_string(),
            Value::String(read_opt(&folder, "unapply.sh")),
        );
        if let Value::Object(m) = meta {
            for (k, v) in m {
                obj.insert(k, v);
            }
        }
        out.push(Value::Object(obj));
    }
    out
}

fn num(payload: &Value, key: &str) -> Option<f64> {
    payload.get(key).and_then(|v| {
        if let Some(n) = v.as_f64() {
            Some(n)
        } else if let Some(s) = v.as_str() {
            s.trim().parse::<f64>().ok()
        } else {
            None
        }
    })
}

fn clamp(n: f64, min: f64, max: f64) -> i64 {
    n.round().clamp(min, max) as i64
}

fn preamble(payload: &Value) -> String {
    let mut lines: Vec<String> = Vec::new();
    let mut assign = |var: &str, v: Option<f64>, min: f64, max: f64| {
        if let Some(n) = v {
            if n.is_finite() {
                lines.push(format!("${} = {}", var, clamp(n, min, max)));
            }
        }
    };
    assign("K3D_RAM_GB", num(payload, "ramGb"), 1.0, 1024.0);
    assign("K3D_PF_INITIAL", num(payload, "pfInitial"), 64.0, 1048576.0);
    assign("K3D_PF_MAXIMUM", num(payload, "pfMaximum"), 64.0, 1048576.0);
    let mut flag = |var: &str, key: &str| {
        match payload.get(key) {
            Some(Value::Bool(true)) | Some(Value::Number(_)) => {
                let n = num(payload, key).unwrap_or(0.0);
                lines.push(format!("${} = {}", var, if n == 1.0 { 1 } else { 0 }));
            }
            Some(Value::String(s)) if s == "1" => lines.push(format!("${} = 1", var)),
            Some(Value::String(s)) if s == "0" => lines.push(format!("${} = 0", var)),
            Some(Value::Bool(false)) => lines.push(format!("${} = 0", var)),
            _ => {}
        }
    };
    flag("K3D_KEEP_KERNEL", "keepKernel");
    flag("K3D_DISABLE_SYSMAIN", "disableSysMain");
    if lines.is_empty() {
        String::new()
    } else {
        lines.join("\n") + "\n"
    }
}

fn exe_path(paths: &Paths, name: &str) -> std::path::PathBuf {
    let dev = std::path::PathBuf::from("resources").join(name);
    if dev.exists() {
        return std::env::current_dir().unwrap_or_default().join(dev);
    }
    paths.resource_dir.join(name)
}

fn nvidia_inspector(paths: &Paths) -> Result<String, String> {
    let exe = exe_path(paths, "nvidiaProfileInspector.exe");
    let nip = exe_path(paths, "k3dtweaks.nip");
    if !exe.exists() {
        return Err(format!(
            "NVIDIA Profile Inspector is missing ({}). Reinstall K3d Tweaks to restore it.",
            exe.display()
        ));
    }
    if !nip.exists() {
        return Err(format!(
            "NVIDIA profile is missing ({}). Reinstall K3d Tweaks to restore it.",
            nip.display()
        ));
    }
    let out = Command::new(&exe)
        .arg("-silentImport")
        .arg(&nip)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        let s = String::from_utf8_lossy(&out.stdout).to_string();
        Ok(if s.is_empty() {
            "NVIDIA Control Panel profile imported.".to_string()
        } else {
            s
        })
    } else {
        Err(format!(
            "NVIDIA Control Panel import failed: {} (driver tweaks below still apply)",
            String::from_utf8_lossy(&out.stderr).trim()
        ))
    }
}

fn gpu_info() -> (bool, bool) {
    if !cfg!(windows) {
        return (false, false);
    }
    let out = Command::new("powershell.exe")
        .args([
            "-NoProfile",
            "-Command",
            "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name",
        ])
        .output();
    let text = out
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .unwrap_or_default()
        .to_lowercase();
    let dedicated = ["nvidia", "radeon", "rx ", "arc", "geforce"]
        .iter()
        .any(|k| text.contains(k));
    (dedicated, text.contains("nvidia"))
}

pub async fn apply(paths: &Paths, store: &Store, payload: Value) -> Result<Value, String> {
    let name = payload
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Invalid tweak payload.".to_string())?
        .to_string();
    let tweaks = load_tweaks(paths);
    let tweak = tweaks
        .iter()
        .find(|t| t.get("name").and_then(|v| v.as_str()) == Some(name.as_str()))
        .cloned()
        .ok_or_else(|| format!("No apply script found for tweak: {}", name))?;

    if is_pro(&tweak) || is_bios(&tweak) {
        let plan = store
            .get("account")
            .and_then(|a| a.get("plan").and_then(|p| p.as_str()).map(|s| s.to_string()));
        if plan.as_deref() != Some("pro") {
            return Err("This tweak requires a Pro plan.".to_string());
        }
    }

    if is_gpu(&tweak, &name) {
        let (has_gpu, is_nvidia) = gpu_info();
        if !has_gpu {
            return Err(
                "This tweak requires a dedicated GPU, but no compatible GPU was detected."
                    .to_string(),
            );
        }
        if name == "optimize-nvidia-settings" && !is_nvidia {
            return Err(
                "This tweak is only for NVIDIA GPUs, but no NVIDIA GPU was detected.".to_string(),
            );
        }
    }

    let pre = if payload.is_object() {
        preamble(&payload)
    } else {
        String::new()
    };

    if name == "optimize-nvidia-settings" {
        match nvidia_inspector(paths) {
            Ok(msg) => {
                eprintln!("{}", msg);
            }
            Err(warn) => {
                eprintln!("{}", warn);
                let script = format!("{}{}", pre, tweak.get("psapply").and_then(|v| v.as_str()).unwrap_or(""));
                let result =
                    run_powershell(&script, &name, &paths.data_dir).await;
                if result.get("success").and_then(|v| v.as_bool()) == Some(true) {
                    let prev = result
                        .get("output")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    return Ok(json!({ "success": true, "output": format!("{}\nWARNING: {}", prev, warn) }));
                }
                let err = result
                    .get("error")
                    .and_then(|v| v.as_str())
                    .unwrap_or("Failed to apply NVIDIA tweaks.");
                return Err(format!("{} Also: {}", err, warn));
            }
        }
    }

    let script = format!(
        "{}{}",
        pre,
        tweak.get("psapply").and_then(|v| v.as_str()).unwrap_or("")
    );
    Ok(run_powershell(&script, &name, &paths.data_dir).await)
}

pub async fn unapply(paths: &Paths, name: &str) -> Result<Value, String> {
    let tweaks = load_tweaks(paths);
    let tweak = tweaks
        .iter()
        .find(|t| t.get("name").and_then(|v| v.as_str()) == Some(name))
        .cloned()
        .ok_or_else(|| format!("No unapply script found for tweak: {}", name))?;
    let script = tweak
        .get("psunapply")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if script.is_empty() {
        return Err(format!("No unapply script found for tweak: {}", name));
    }
    Ok(run_powershell(script, name, &paths.data_dir).await)
}

pub fn active_names(paths: &Paths) -> Vec<String> {
    let raw = std::fs::read_to_string(paths.data_dir.join("tweakStates.json")).unwrap_or_default();
    let parsed: Value = serde_json::from_str(&raw).unwrap_or(Value::Null);
    match parsed {
        Value::Object(map) => map
            .into_iter()
            .filter(|(_, v)| v.as_bool() == Some(true))
            .map(|(k, _)| k)
            .collect(),
        _ => Vec::new(),
    }
}
