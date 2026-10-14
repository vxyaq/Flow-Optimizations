use crate::scripts::{fail, ok_output, run_powershell};
use serde_json::{json, Value};
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct Backup {
    create_active: Mutex<bool>,
    last_created: Mutex<Option<Instant>>,
    cache: Mutex<(Option<Vec<Value>>, Option<Instant>)>,
}

impl Backup {
    pub fn new() -> Self {
        Self {
            create_active: Mutex::new(false),
            last_created: Mutex::new(None),
            cache: Mutex::new((None, None)),
        }
    }

    fn stamp() -> String {
        use std::time::{SystemTime, UNIX_EPOCH};
        let s = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        format!("{}", s)
    }

    async fn create_point(&self, label: String, data_dir: &std::path::Path) -> Value {
        if self.create_active.lock().map(|g| *g).unwrap_or(false) {
            return fail("A restore point is already being created.".to_string());
        }
        if let Some(at) = self.last_created.lock().ok().and_then(|g| *g) {
            if at.elapsed() < Duration::from_secs(60) {
                return json!({ "success": true, "label": label, "message": "Restore point already created moments ago." });
            }
        }
        if let Ok(mut g) = self.create_active.lock() {
            *g = true;
        }
        let set_freq = run_powershell(
            "Set-ItemProperty -Path \"HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore\" -Name \"SystemRestorePointCreationFrequency\" -Value 0 -Type DWord -Force",
            "backup-frequency",
            data_dir,
        )
        .await;
        let _ = set_freq;
        let safe: String = label.chars().filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_').collect();
        let result = run_powershell(
            &format!("Checkpoint-Computer -Description '{}'", safe),
            "backup-create",
            data_dir,
        )
        .await;
        if let Ok(mut g) = self.create_active.lock() {
            *g = false;
        }
        if result.get("success").and_then(|v| v.as_bool()) == Some(true) {
            if let Ok(mut g) = self.last_created.lock() {
                *g = Some(Instant::now());
            }
            if let Ok(mut guard) = self.cache.lock() {
                *guard = (None, None);
            }
            return json!({ "success": true, "label": label });
        }
        result
    }

    pub async fn create_k3d(&self, data_dir: &std::path::Path) -> Value {
        self.create_point(format!("K3dTweaksBackup-{}", Self::stamp()), data_dir)
            .await
    }

    pub async fn create_named(&self, name: &str, data_dir: &std::path::Path) -> Value {
        let safe: String = name
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == ' ' || *c == '_' || *c == '-')
            .collect();
        let label = if safe.trim().is_empty() {
            format!("ManualRestore-{}", Self::stamp())
        } else {
            format!("{}-{}", safe.trim(), Self::stamp())
        };
        self.create_point(label, data_dir).await
    }

    pub async fn points(&self, data_dir: &std::path::Path) -> Value {
        if !cfg!(windows) {
            return json!({ "success": true, "points": [] });
        }
        if let Ok(guard) = self.cache.lock() {
            if let (Some(list), Some(at)) = (&guard.0, &guard.1) {
                if at.elapsed() < Duration::from_secs(60) {
                    return json!({ "success": true, "points": list });
                }
            }
        }
        let result = run_powershell(
            "Get-ComputerRestorePoint | Select-Object SequenceNumber, Description, CreationTime, EventType, RestorePointType | ConvertTo-Json",
            "backup-list",
            data_dir,
        )
        .await;
        let output = result
            .get("output")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let mut list: Vec<Value> = serde_json::from_str(&output).unwrap_or(Value::Null).as_array().cloned().unwrap_or_default();
        if list.is_empty() {
            if let Ok(single) = serde_json::from_str::<Value>(&output) {
                if single.is_object() {
                    list = vec![single];
                }
            }
        }
        if result.get("success").and_then(|v| v.as_bool()) != Some(true) {
            let err = result
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("Failed to load restore points.");
            return fail(err.to_string());
        }
        if let Ok(mut guard) = self.cache.lock() {
            *guard = (Some(list.clone()), Some(Instant::now()));
        }
        json!({ "success": true, "points": list })
    }

    pub async fn restore(&self, seq: i64, data_dir: &std::path::Path) -> Value {
        if seq <= 0 {
            return fail("Invalid restore point.".to_string());
        }
        let result = run_powershell(
            &format!("Restore-Computer -RestorePoint {}", seq),
            "backup-restore",
            data_dir,
        )
        .await;
        if result.get("success").and_then(|v| v.as_bool()) == Some(true) {
            return ok_output(None);
        }
        result
    }

    pub async fn delete_all(&self, data_dir: &std::path::Path) -> Value {
        let result = run_powershell("vssadmin delete shadows /all /quiet", "backup-delete-all", data_dir).await;
        if result.get("success").and_then(|v| v.as_bool()) == Some(true) {
            if let Ok(mut guard) = self.cache.lock() {
                *guard = (None, None);
            }
            return ok_output(None);
        }
        result
    }
}
