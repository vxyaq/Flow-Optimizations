use crate::state::Paths;
use serde_json::Value;

const NAMES: [&str; 3] = ["background.webp", "background2.webp", "background.png"];

pub fn path_for(paths: &Paths, index: usize) -> Option<String> {
    let name = NAMES.get(index).unwrap_or(&NAMES[0]);
    let cand = paths.data_dir.join(name);
    if cand.exists() {
        return Some(cand.to_string_lossy().to_string());
    }
    let cand = paths.resource_dir.join(name);
    if cand.exists() {
        return Some(cand.to_string_lossy().to_string());
    }
    let dev = std::path::PathBuf::from("resources").join(name);
    if dev.exists() {
        return std::env::current_dir()
            .ok()
            .map(|c| c.join(dev).to_string_lossy().to_string());
    }
    None
}

pub fn data_url(paths: &Paths, index: usize) -> Value {
    let p = match path_for(paths, index) {
        Some(p) => p,
        None => return Value::Null,
    };
    let bytes = match std::fs::read(&p) {
        Ok(b) => b,
        Err(_) => return Value::Null,
    };
    let mime = if p.ends_with(".png") {
        "image/png"
    } else {
        "image/webp"
    };
    Value::String(format!("data:{};base64,{}", mime, base64_encode(&bytes)))
}

fn base64_encode(bytes: &[u8]) -> String {
    const ALPH: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    let mut i = 0usize;
    while i < bytes.len() {
        let b0 = bytes[i] as u32;
        let b1 = if i + 1 < bytes.len() { bytes[i + 1] as u32 } else { 0 };
        let b2 = if i + 2 < bytes.len() { bytes[i + 2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(ALPH[((n >> 18) & 63) as usize] as char);
        out.push(ALPH[((n >> 12) & 63) as usize] as char);
        out.push(if i + 1 < bytes.len() {
            ALPH[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if i + 2 < bytes.len() {
            ALPH[(n & 63) as usize] as char
        } else {
            '='
        });
        i += 3;
    }
    out
}
