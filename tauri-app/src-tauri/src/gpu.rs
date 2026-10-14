use std::sync::Mutex;
use std::time::{Duration, Instant};

static CACHE: Mutex<(Option<Instant>, Option<(String, u64, bool, bool, String, bool)>)> =
    Mutex::new((None, None));

fn integrated(model: &str) -> bool {
    let m = model.to_lowercase();
    m.contains("intel")
        && (m.contains("hd graphics")
            || m.contains("uhd graphics")
            || m.contains("iris"))
        || m.contains("radeon vega")
        || (m.contains("amd radeon") && m.contains("graphics") && !m.contains(" rx"))
}

fn dedicated(model: &str) -> bool {
    let m = model.to_lowercase();
    m.contains("nvidia")
        || m.contains("geforce")
        || m.contains("radeon rx")
        || m.contains("radeon pro")
        || m.contains(" arc ")
        || m.starts_with("arc ")
}

pub fn clear_cache() {
    if let Ok(mut guard) = CACHE.lock() {
        *guard = (None, None);
    }
}

pub async fn detect(data_dir: &std::path::Path) -> (String, u64, bool, bool, String, bool) {
    if let Ok(guard) = CACHE.lock() {
        if let (Some(at), Some(v)) = (&guard.0, &guard.1) {
            if at.elapsed() < Duration::from_secs(300) {
                return v.clone();
            }
        }
    }
    let result = detect_inner(data_dir).await;
    if let Ok(mut guard) = CACHE.lock() {
        *guard = (Some(Instant::now()), Some(result.clone()));
    }
    result
}

async fn detect_inner(data_dir: &std::path::Path) -> (String, u64, bool, bool, String, bool) {
    let none = (
        "Unknown".to_string(),
        0u64,
        false,
        false,
        "Unknown".to_string(),
        false,
    );
    if !cfg!(windows) {
        return none;
    }
    let v = crate::scripts::run_powershell(
        "Get-CimInstance Win32_VideoController | ForEach-Object { '{0}|{1}' -f $_.Name, $_.AdapterRAM }",
        "DetectGPU",
        data_dir,
    )
    .await;
    let output = v.get("output").and_then(|o| o.as_str()).unwrap_or("");
    let mut model = "Unknown".to_string();
    let mut vram = 0u64;
    let mut has_gpu = false;
    let mut is_nvidia = false;
    let mut imodel = "Unknown".to_string();
    let mut has_igpu = false;
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let mut parts = line.splitn(2, '|');
        let name = parts.next().unwrap_or("").trim().to_string();
        let ram: u64 = parts.next().unwrap_or("0").trim().parse().unwrap_or(0);
        if name.is_empty() {
            continue;
        }
        if integrated(&name) {
            imodel = name;
            has_igpu = true;
        } else if dedicated(&name) {
            if ram >= vram {
                vram = ram;
                model = name.clone();
            }
            has_gpu = true;
            if name.to_lowercase().contains("nvidia") {
                is_nvidia = true;
            }
        }
    }
    if !has_gpu {
        return none;
    }
    (model, vram, has_gpu, is_nvidia, imodel, has_igpu)
}
