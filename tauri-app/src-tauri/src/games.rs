use crate::scripts::run_powershell;
use crate::state::Paths;
use serde_json::Value;

fn read_opt(dir: &std::path::Path, file: &str) -> String {
    std::fs::read_to_string(dir.join(file)).unwrap_or_default()
}

pub fn load_games(paths: &Paths) -> Vec<Value> {
    let mut out = Vec::new();
    let entries = match std::fs::read_dir(&paths.games_dir) {
        Ok(e) => e,
        Err(_) => return out,
    };
    for entry in entries.flatten() {
        let folder = entry.path();
        if !folder.is_dir() {
            continue;
        }
        let meta: Value =
            serde_json::from_str(&std::fs::read_to_string(folder.join("meta.json")).unwrap_or_default())
                .unwrap_or(Value::Null);
        if !meta.is_object() {
            continue;
        }
        let id = meta
            .get("id")
            .and_then(|v| v.as_str())
            .unwrap_or(&entry.file_name().to_string_lossy().to_string())
            .to_string();
        let mut obj = serde_json::Map::new();
        obj.insert("id".to_string(), Value::String(id));
        for key in [
            "title",
            "background",
            "description",
            "notRunningMarker",
            "notRunningText",
            "missingMarker",
            "missingText",
            "successText",
        ] {
            if let Some(v) = meta.get(key) {
                obj.insert(key.to_string(), v.clone());
            }
        }
        if obj.get("successText").is_none() {
            obj.insert(
                "successText".to_string(),
                Value::String("Optimization applied successfully.".to_string()),
            );
        }
        obj.insert(
            "psapply".to_string(),
            Value::String(read_opt(&folder, "apply.ps1")),
        );
        obj.insert(
            "psunapply".to_string(),
            Value::String(read_opt(&folder, "unapply.ps1")),
        );
        out.push(Value::Object(obj));
    }
    out
}

pub async fn apply(paths: &Paths, id: &str) -> Result<Value, String> {
    let games = load_games(paths);
    let game = games
        .iter()
        .find(|g| g.get("id").and_then(|v| v.as_str()) == Some(id))
        .cloned()
        .ok_or_else(|| format!("No apply script found for game: {}", id))?;
    let script = game.get("psapply").and_then(|v| v.as_str()).unwrap_or("");
    if script.is_empty() {
        return Err(format!("No apply script found for game: {}", id));
    }
    Ok(run_powershell(script, &format!("game-{}", id), &paths.data_dir).await)
}

pub async fn unapply(paths: &Paths, id: &str) -> Result<Value, String> {
    let games = load_games(paths);
    let game = games
        .iter()
        .find(|g| g.get("id").and_then(|v| v.as_str()) == Some(id))
        .cloned()
        .ok_or_else(|| format!("No unapply script found for game: {}", id))?;
    let script = game
        .get("psunapply")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if script.is_empty() {
        return Err(format!("No unapply script found for game: {}", id));
    }
    Ok(run_powershell(script, &format!("game-{}-revert", id), &paths.data_dir).await)
}
