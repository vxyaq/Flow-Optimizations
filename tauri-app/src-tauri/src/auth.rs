use crate::store::Store;
use serde_json::{json, Value};
use std::io::{Read, Write};
use std::time::Duration;

const DEFAULT_AUTH_SERVER_URL: &str = "https://k3dauth.apps.bot-hosting.cloud";
const CALLBACK_PORT: u16 = 43817;
const AUTH_RESET_VERSION: i64 = 1;

fn hex_state() -> String {
    let mut bytes = [0u8; 32];
    #[cfg(unix)]
    {
        if let Ok(mut f) = std::fs::File::open("/dev/urandom") {
            let _ = f.read_exact(&mut bytes);
        }
    }
    #[cfg(windows)]
    {
        use std::time::{SystemTime, UNIX_EPOCH};
        let mut seed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos() as u64)
            .unwrap_or(0x9e3779b97f4a7c15);
        for b in bytes.iter_mut() {
            seed ^= seed << 13;
            seed ^= seed >> 7;
            seed ^= seed << 17;
            *b = (seed & 0xff) as u8;
        }
    }
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

fn valid_server_url(url: &str) -> Option<String> {
    let t = url.trim().trim_end_matches('/').to_string();
    if t.starts_with("https://") {
        let host = t.trim_start_matches("https://");
        if !host.contains('/') && host.contains('.') && !host.is_empty() {
            return Some(t);
        }
    }
    None
}

fn server_url(store: &Store) -> String {
    store
        .get("authServerUrl")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_AUTH_SERVER_URL.to_string())
}

fn hwid() -> String {
    machine_uid::get().unwrap_or_else(|_| "".to_string())
}

fn open_browser(url: &str) {
    let r = {
        #[cfg(windows)]
        {
            std::process::Command::new("rundll32")
                .args(["url.dll,FileProtocolHandler", url])
                .spawn()
        }
        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open").arg(url).spawn()
        }
        #[cfg(all(unix, not(target_os = "macos")))]
        {
            std::process::Command::new("xdg-open").arg(url).spawn()
        }
    };
    if let Err(e) = r {
        eprintln!("open browser failed: {}", e);
    }
}

fn wait_callback(state: &str) -> Result<String, String> {
    let listener = std::net::TcpListener::bind(("127.0.0.1", CALLBACK_PORT))
        .map_err(|e| format!("Could not listen for login callback: {}", e))?;
    listener
        .set_nonblocking(true)
        .map_err(|e| e.to_string())?;
    let deadline = std::time::Instant::now() + Duration::from_secs(300);
    loop {
        if std::time::Instant::now() > deadline {
            return Err("Discord sign-in timed out.".to_string());
        }
        match listener.accept() {
            Ok((mut stream, _)) => {
                stream
                    .set_read_timeout(Some(Duration::from_secs(10)))
                    .ok();
                let mut buf = [0u8; 8192];
                let n = std::io::Read::read(&mut stream, &mut buf).unwrap_or(0);
                let req = String::from_utf8_lossy(&buf[..n]).to_string();
                let path = req
                    .lines()
                    .next()
                    .and_then(|l| l.split_whitespace().nth(1))
                    .unwrap_or("/")
                    .to_string();
                let raw_query = path.split('?').nth(1).unwrap_or("");
                let mut query: std::collections::HashMap<String, String> =
                    std::collections::HashMap::new();
                for pair in raw_query.split('&') {
                    let mut kv = pair.splitn(2, '=');
                    if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                        query.insert(percent_decode(k), percent_decode(v));
                    }
                }
                let body = if query.contains_key("error") {
                    "<html><body style=\"font-family: sans-serif; text-align: center; padding: 40px;\"><h2>Sign-in was cancelled</h2><p>You can close this window and return to K3d Tweaks.</p></body></html>"
                } else {
                    "<html><body style=\"font-family: sans-serif; text-align: center; padding: 40px;\"><h2>Sign-in complete</h2><p>You can close this window and return to K3d Tweaks.</p></body></html>"
                };
                let resp = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    body.len(),
                    body
                );
                let _ = stream.write_all(resp.as_bytes());
                if let Some(err) = query.get("error") {
                    return Err(format!("Discord OAuth failed: {}", err));
                }
                match (query.get("ticket"), query.get("state")) {
                    (Some(ticket), Some(s)) if s == state => return Ok(ticket.clone()),
                    _ => return Err("Invalid Discord OAuth callback.".to_string()),
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(e) => return Err(e.to_string()),
        }
    }
}

fn percent_decode(s: &str) -> String {
    let mut out = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(b) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(b);
                i += 3;
                continue;
            }
        }
        if bytes[i] == b'+' {
            out.push(b' ');
        } else {
            out.push(bytes[i]);
        }
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

pub fn check_reset(store: &Store) {
    let v = store.get("authResetVersion").and_then(|x| x.as_i64());
    if v != Some(AUTH_RESET_VERSION) {
        store.delete("account");
        store.set("authResetVersion", json!(AUTH_RESET_VERSION));
    }
}

pub async fn login(store: &Store, provider: &str) -> Value {
    if provider != "discord" {
        if provider == "google" {
            return json!({ "ok": false, "error": "Google OAuth is not configured yet. Add a Google Client ID first." });
        }
        return json!({ "ok": false, "error": "Unsupported login provider." });
    }
    let state = hex_state();
    let base = server_url(store);
    let auth_url = format!(
        "{}/auth/discord?state={}",
        base,
        urlencoding(&state)
    );
    if !auth_url.starts_with("https://") {
        return json!({ "ok": false, "error": "Refusing to open a non-HTTPS authorization URL." });
    }
    
    // Start the callback listener in a background task BEFORE opening the browser
    let state_clone = state.clone();
    let listener_task = tokio::task::spawn_blocking(move || wait_callback(&state_clone));
    
    // Small delay to ensure listener is ready
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Now open the browser
    eprintln!("auth url: {}", auth_url);
    open_browser(&auth_url);
    
    // Wait for the callback
    let ticket = listener_task.await;
    let ticket = match ticket {
        Ok(Ok(t)) => t,
        Ok(Err(e)) => return json!({ "ok": false, "error": e }),
        Err(e) => return json!({ "ok": false, "error": e.to_string() }),
    };
    let id = hwid();
    let client = reqwest::Client::new();
    let res = tokio::time::timeout(
        Duration::from_secs(15),
        client
            .post(format!("{}/auth/discord/consume", base))
            .json(&json!({ "ticket": ticket, "hwid": id }))
            .send(),
    )
    .await;
    let body: Value = match res {
        Err(_) => return json!({ "ok": false, "error": "Login server did not respond in time." }),
        Ok(Err(_)) => return json!({ "ok": false, "error": "Could not connect to the login server." }),
        Ok(Ok(r)) => {
            if !r.status().is_success() {
                return json!({ "ok": false, "error": format!("Login server rejected the request ({}).", r.status()) });
            }
            match r.json::<Value>().await {
                Ok(v) => v,
                Err(_) => return json!({ "ok": false, "error": "Login server is unavailable. Try again later." }),
            }
        }
    };
    match body.get("account") {
        Some(account) => {
            store.set("account", account.clone());
            json!({ "ok": true, "account": account, "auth_url": auth_url })
        }
        None => json!({ "ok": false, "error": "Auth server did not return an account.", "auth_url": auth_url }),
    }
}

fn urlencoding(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{:02X}", b));
        }
    }
    out
}

pub async fn refresh_plan(store: &Store) -> Value {
    let account = match store.get("account") {
        Some(a) => a,
        None => return Value::Null,
    };
    let id = hwid();
    if id.is_empty() {
        return account;
    }
    let base = server_url(store);
    let client = reqwest::Client::new();
    let url = format!("{}/plan?hwid={}", base, urlencoding(&id));
    let res = tokio::time::timeout(Duration::from_secs(10), client.get(&url).send()).await;
    let data: Value = match res {
        Ok(Ok(r)) if r.status().is_success() => r.json().await.unwrap_or(Value::Null),
        _ => return account,
    };
    let plan = if data.get("plan").and_then(|p| p.as_str()) == Some("pro") {
        "pro"
    } else {
        "free"
    };
    if account.get("plan").and_then(|p| p.as_str()) == Some(plan) {
        return account;
    }
    let mut updated = account.clone();
    if let Some(obj) = updated.as_object_mut() {
        obj.insert("plan".to_string(), Value::String(plan.to_string()));
    }
    store.set("account", updated.clone());
    updated
}

pub fn session(store: &Store) -> Value {
    store.get("account").unwrap_or(Value::Null)
}

pub fn logout(store: &Store) -> Value {
    store.delete("account");
    json!({ "ok": true })
}

pub fn get_server_url(store: &Store) -> Value {
    Value::String(server_url(store))
}

pub fn set_server_url(store: &Store, url: &str) -> Value {
    if cfg!(debug_assertions) {
        match valid_server_url(url) {
            Some(n) => {
                store.set("authServerUrl", Value::String(n));
                json!({ "ok": true })
            }
            None => json!({ "ok": false, "error": "Enter a valid https URL, e.g. https://k3dauth.apps.bot-hosting.cloud" }),
        }
    } else {
        json!({ "ok": false, "error": "Custom auth server is disabled in this build." })
    }
}
