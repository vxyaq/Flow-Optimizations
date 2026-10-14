use serde_json::{json, Value};
use std::process::Command;
use std::time::Duration;
use tokio::time::timeout;

pub fn ok_output(output: Option<String>) -> Value {
    match output {
        Some(o) => json!({ "success": true, "output": o }),
        None => json!({ "success": true }),
    }
}

pub fn fail(message: String) -> Value {
    json!({ "success": false, "error": message })
}

fn run_temp_script(dir: &std::path::Path, name: &str, ext: &str, script: &str) -> std::io::Result<String> {
    let _ = std::fs::create_dir_all(dir);
    let file = dir.join(format!("{}-{}.{}", name, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0), ext));
    std::fs::write(&file, script)?;
    Ok(file.to_string_lossy().to_string())
}

pub async fn run_powershell(script: &str, name: &str, data_dir: &std::path::Path) -> Value {
    if !cfg!(windows) {
        return fail("This feature is only available on Windows - K3d Tweaks's scripts rely on PowerShell and Windows tooling.".to_string());
    }
    let scripts_dir = data_dir.join("scripts");
    let file = match run_temp_script(&scripts_dir, name, "ps1", script) {
        Ok(f) => f,
        Err(e) => return fail(e.to_string()),
    };
    let file_run = file.clone();
    let out = timeout(
        Duration::from_secs(300),
        tokio::task::spawn_blocking(move || {
            Command::new("powershell.exe")
                .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", &file_run])
                .output()
        }),
    )
    .await;
    let _ = std::fs::remove_file(&file);
    match out {
        Err(_) => fail("PowerShell script timed out.".to_string()),
        Ok(Err(e)) => fail(e.to_string()),
        Ok(Ok(Err(e))) => fail(e.to_string()),
        Ok(Ok(Ok(o))) => {
            if !o.status.success() {
                return fail(String::from_utf8_lossy(&o.stderr).trim().to_string());
            }
            ok_output(Some(String::from_utf8_lossy(&o.stdout).to_string()))
        }
    }
}

#[allow(dead_code)]
pub async fn run_shell(script: &str, name: &str, data_dir: &std::path::Path) -> Value {
    if cfg!(windows) {
        return fail("This feature is only available on macOS or Linux - K3d Tweaks's shell scripts rely on bash and Unix tooling.".to_string());
    }
    let scripts_dir = data_dir.join("scripts");
    let file = match run_temp_script(&scripts_dir, name, "sh", script) {
        Ok(f) => f,
        Err(e) => return fail(e.to_string()),
    };
    let file_run = file.clone();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o700));
    }
    let out = timeout(
        Duration::from_secs(300),
        tokio::task::spawn_blocking(move || {
            Command::new("/bin/bash").arg(&file_run).output()
        }),
    )
    .await;
    let _ = std::fs::remove_file(&file);
    match out {
        Err(_) => fail("Shell script timed out.".to_string()),
        Ok(Err(e)) => fail(e.to_string()),
        Ok(Ok(Err(e))) => fail(e.to_string()),
        Ok(Ok(Ok(o))) => {
            if !o.status.success() {
                return fail(String::from_utf8_lossy(&o.stderr).trim().to_string());
            }
            ok_output(Some(String::from_utf8_lossy(&o.stdout).to_string()))
        }
    }
}
