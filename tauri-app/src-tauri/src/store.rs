use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Store {
    path: PathBuf,
    data: Mutex<HashMap<String, Value>>,
}

impl Store {
    pub fn open(path: PathBuf) -> Self {
        let data: HashMap<String, Value> = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default();
        Self {
            path,
            data: Mutex::new(data),
        }
    }

    pub fn get(&self, key: &str) -> Option<Value> {
        self.data.lock().ok()?.get(key).cloned()
    }

    pub fn set(&self, key: &str, value: Value) {
        if let Ok(mut data) = self.data.lock() {
            data.insert(key.to_string(), value);
            let snapshot: HashMap<String, Value> = data.clone();
            drop(data);
            if let Some(parent) = self.path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            if let Ok(text) = serde_json::to_string_pretty(&snapshot) {
                let _ = fs::write(&self.path, text);
            }
        }
    }

    pub fn delete(&self, key: &str) {
        if let Ok(mut data) = self.data.lock() {
            data.remove(key);
            let snapshot: HashMap<String, Value> = data.clone();
            drop(data);
            if let Ok(text) = serde_json::to_string_pretty(&snapshot) {
                let _ = fs::write(&self.path, text);
            }
        }
    }
}
