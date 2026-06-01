use std::io::{Read, Write};
use std::net::{TcpListener};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

#[tauri::command]
async fn start_login_flow(client_id: String) -> Result<String, String> {
    // Self-clearing mechanism: if port is in use, attempt to send a quit signal to the old listener
    let listener = match TcpListener::bind("127.0.0.1:14256") {
        Ok(l) => l,
        Err(_) => {
            println!("[Tauri] Port 14256 is in use. Sending quit signal to release it...");
            if let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:14256") {
                let _ = stream.write_all(b"GET /quit HTTP/1.1\r\n\r\n");
                let _ = stream.flush();
                thread::sleep(Duration::from_millis(300));
            }
            TcpListener::bind("127.0.0.1:14256")
                .map_err(|e| format!("Failed to bind to port 14256 after clearing: {}", e))?
        }
    };
    
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri=http://localhost:14256/callback&response_type=token%20id_token&scope=openid%20email%20profile&nonce=shahlms_nonce",
        client_id
    );
    
    // Open Google Sign-In in system browser
    open::that(&auth_url).map_err(|e| format!("Failed to open browser: {}", e))?;
    
    let (tx, rx) = mpsc::channel();
    
    thread::spawn(move || {
        let mut id_token: Option<String> = None;
        
        for stream in listener.incoming() {
            match stream {
                Ok(mut stream) => {
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                    let _ = stream.set_write_timeout(Some(Duration::from_secs(5)));
                    
                    let mut buffer = [0; 4096];
                    if let Ok(size) = stream.read(&mut buffer) {
                        let req = String::from_utf8_lossy(&buffer[..size]);
                        let first_line = req.lines().next().unwrap_or("");
                        
                        if first_line.starts_with("GET /callback") {
                            // Serve HTML page that extracts the hash fragment and posts to /token
                            let response_body = r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ShahLMS Desktop Login</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0d0e12;
      color: #f3f4f6;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .card {
      background-color: #161822;
      border: 1px solid #232736;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90%;
    }
    h2 {
      margin-top: 0;
      color: #3b82f6;
    }
    p {
      color: #9ca3af;
      font-size: 14px;
      line-height: 1.5;
    }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.1);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border-left-color: #3b82f6;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="card">
    <h2 id="title">Authenticating...</h2>
    <div id="spinner" class="spinner"></div>
    <p id="msg">Verifying your credentials and logging into the desktop application.</p>
  </div>
  <script>
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');
    
    if (idToken) {
      fetch('/token?id_token=' + encodeURIComponent(idToken))
        .then(() => {
          document.getElementById('title').innerText = 'Authenticated!';
          document.getElementById('title').style.color = '#10b981';
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('msg').innerText = 'Success! You can now close this browser window and return to your ShahLMS Desktop App.';
        })
        .catch(err => {
          document.getElementById('title').innerText = 'Error';
          document.getElementById('title').style.color = '#ef4444';
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('msg').innerText = 'Failed to transmit token: ' + err.message;
        });
    } else {
      document.getElementById('title').innerText = 'OAuth Error';
      document.getElementById('title').style.color = '#ef4444';
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('msg').innerText = 'No login token found in Google response. Please try again.';
    }
  </script>
</body>
</html>"#;
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: {}\r\nConnection: Keep-Alive\r\n\r\n{}",
                                response_body.len(),
                                response_body
                            );
                            let _ = stream.write_all(response.as_bytes());
                        } else if first_line.starts_with("GET /token") {
                            if let Some(token_start) = first_line.find("id_token=") {
                                let after_token = &first_line[token_start + 9..];
                                let token_end = after_token.find(' ').unwrap_or(after_token.len());
                                let raw_token = &after_token[..token_end];
                                
                                let decoded_token = percent_decode(raw_token);
                                id_token = Some(decoded_token);
                            }
                            
                            let response_body = "OK";
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                                response_body.len(),
                                response_body
                            );
                            let _ = stream.write_all(response.as_bytes());
                            break;
                        } else if first_line.starts_with("GET /quit") {
                            println!("[Tauri] Received quit signal. Exiting thread listener.");
                            let response_body = "Quit OK";
                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                                response_body.len(),
                                response_body
                            );
                            let _ = stream.write_all(response.as_bytes());
                            break;
                        } else {
                            let response_body = "Not Found";
                            let response = format!(
                                "HTTP/1.1 404 Not Found\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                                response_body.len(),
                                response_body
                            );
                            let _ = stream.write_all(response.as_bytes());
                        }
                    }
                }
                Err(_) => {}
            }
        }
        
        if let Some(tok) = id_token {
            let _ = tx.send(tok);
        }
    });
    
    // Timeout in 180 seconds
    match rx.recv_timeout(Duration::from_secs(180)) {
        Ok(token) => Ok(token),
        Err(_) => {
            // Attempt to unblock the thread by connecting to ourselves and sending /quit
            if let Ok(mut stream) = std::net::TcpStream::connect("127.0.0.1:14256") {
                let _ = stream.write_all(b"GET /quit HTTP/1.1\r\n\r\n");
            }
            Err("Authentication timed out. Please try again.".to_string())
        }
    }
}

fn percent_decode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '%' {
            let h1 = chars.next();
            let h2 = chars.next();
            if let (Some(c1), Some(c2)) = (h1, h2) {
                if let Ok(val) = u8::from_str_radix(&format!("{}{}", c1, c2), 16) {
                    result.push(val as char);
                    continue;
                }
            }
            if let Some(c1) = h1 { result.push('%'); result.push(c1); }
            if let Some(c2) = h2 { result.push(c2); }
        } else {
            result.push(c);
        }
    }
    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_login_flow])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
