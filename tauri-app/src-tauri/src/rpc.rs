use crate::store::Store;
use serde_json::{json, Value};

pub fn enabled(store: &Store) -> Value {
    json!(store.get("rpcEnabled").and_then(|v| v.as_bool()).unwrap_or(true))
}

pub fn set_enabled(store: &Store, value: bool) -> Value {
    store.set("rpcEnabled", Value::Bool(value));
    json!({ "ok": true })
}

pub fn status() -> Value {
    json!({ "connected": false })
}
