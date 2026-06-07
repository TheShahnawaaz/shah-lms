use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};
use std::io::Write;
use std::sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}};
use tauri::{AppHandle, Manager};

/// Global counter to guarantee unique temp dir names even for parallel runs
static RUN_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CompilerPaths {
    pub cpp_path: String,
    pub cpp_args: String,
    pub python_path: String,
    pub java_path: String,
    pub javac_path: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CompilerStatus {
    pub cpp_version: String,
    pub cpp_available: bool,
    pub python_version: String,
    pub python_available: bool,
    pub java_version: String,
    pub java_available: bool,
    pub javac_version: String,
    pub javac_available: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CompilerSettings {
    pub paths: CompilerPaths,
    pub status: CompilerStatus,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RunResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub compile_output: String,
    pub execution_time_ms: u128,
    pub status: String, // "Success", "TimeLimitExceeded", "RuntimeError", "CompilationError"
}

fn get_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    config_dir.push("compilers.json");
    Ok(config_dir)
}

fn find_executable(name: &str) -> Option<String> {
    // 1. Try absolute known paths first (most reliable in macOS GUI apps which have limited PATH)
    #[cfg(target_os = "macos")]
    {
        let macos_paths = [
            format!("/usr/bin/{}", name),
            format!("/usr/local/bin/{}", name),
            format!("/opt/homebrew/bin/{}", name),
            format!("/opt/homebrew/opt/{}/bin/{}", name, name),
            format!("/opt/local/bin/{}", name),
        ];
        for path in &macos_paths {
            if Path::new(path).exists() {
                return Some(path.clone());
            }
        }
    }

    #[cfg(target_family = "unix")]
    {
        // 2. Try 'which' via a login shell to get the full PATH
        // Running through /bin/sh -l -c 'which <name>' uses a login shell so it sees .profile/.zshrc paths
        if let Ok(output) = Command::new("/bin/sh")
            .args(["-l", "-c", &format!("which {}", name)])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() && Path::new(&path).exists() {
                    return Some(path);
                }
            }
        }

        // 3. Try plain 'which' as fallback
        if let Ok(output) = Command::new("which").arg(name).output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() && Path::new(&path).exists() {
                    return Some(path);
                }
            }
        }

        // 4. Check additional common Linux/Unix paths
        let unix_paths = [
            format!("/usr/local/bin/{}", name),
            format!("/usr/bin/{}", name),
        ];
        for path in &unix_paths {
            if Path::new(path).exists() {
                return Some(path.clone());
            }
        }
    }

    #[cfg(target_family = "windows")]
    {
        if let Ok(output) = Command::new("where").arg(name).output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if let Some(first_line) = path.lines().next() {
                    let cleaned = first_line.trim().to_string();
                    if !cleaned.is_empty() {
                        return Some(cleaned);
                    }
                }
            }
        }
    }

    // 5. Last resort: try running the binary directly (relies on system PATH)
    if Command::new(name).arg("--version").output().is_ok() {
        return Some(name.to_string());
    }

    None
}

/// On macOS, use xcrun to locate a tool within Xcode/CommandLineTools toolchain
#[cfg(target_os = "macos")]
fn xcrun_find(name: &str) -> Option<String> {
    if let Ok(output) = Command::new("xcrun")
        .args(["--find", name])
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() && Path::new(&path).exists() {
                return Some(path);
            }
        }
    }
    None
}

fn get_version(path: &str, arg: &str) -> Option<String> {
    if let Ok(output) = Command::new(path).arg(arg).output() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let combined = if stdout.is_empty() { stderr } else { stdout };
        if let Some(first_line) = combined.lines().next() {
            return Some(first_line.trim().to_string());
        }
    }
    None
}

#[tauri::command]
pub async fn detect_compilers() -> Result<CompilerSettings, String> {
    // 1. Detect C++ compiler (g++, clang++, or c++)
    let mut cpp_path = String::new();
    let mut cpp_version = String::new();
    let mut cpp_available = false;

    // Try g++ variants (including homebrew versioned ones like g++-14, g++-13)
    let cpp_candidates = vec!["g++", "clang++", "c++", "g++-14", "g++-13", "g++-12", "g++-11"];
    for candidate in &cpp_candidates {
        if cpp_available { break; }
        if let Some(p) = find_executable(candidate) {
            if let Some(v) = get_version(&p, "--version") {
                cpp_path = p;
                cpp_version = v;
                cpp_available = true;
            }
        }
    }

    // macOS: try xcrun clang++ as final fallback
    #[cfg(target_os = "macos")]
    if !cpp_available {
        if let Some(p) = xcrun_find("clang++") {
            if let Some(v) = get_version(&p, "--version") {
                cpp_path = p;
                cpp_version = v;
                cpp_available = true;
            }
        }
    }

    // 2. Detect Python interpreter (python3 or python)
    let mut python_path = String::new();
    let mut python_version = String::new();
    let mut python_available = false;

    // Prefer python3 first, then python (if it's Python 3)
    // Also try known macOS/Homebrew/conda absolute paths
    let python_candidates = vec![
        "python3",
        "python",
        // Anaconda / conda commonly installed paths
        "/opt/anaconda3/bin/python3",
        "/opt/anaconda3/bin/python",
        "/Users/Shared/anaconda3/bin/python3",
        // Homebrew versioned Pythons
        "/opt/homebrew/bin/python3",
        "/opt/homebrew/opt/python@3.12/bin/python3",
        "/opt/homebrew/opt/python@3.11/bin/python3",
        "/opt/homebrew/opt/python@3.10/bin/python3",
        // pyenv shim
        "/usr/local/bin/python3",
        "/usr/bin/python3",
    ];
    for candidate in &python_candidates {
        if python_available { break; }
        let found = if candidate.starts_with('/') {
            // Absolute path — check it exists directly
            if Path::new(candidate).exists() { Some(candidate.to_string()) } else { None }
        } else {
            find_executable(candidate)
        };
        if let Some(p) = found {
            if let Some(v) = get_version(&p, "--version") {
                // Accept any Python 3.x (or if it just says Python without version prefix for python3)
                if !v.contains("Python 2") {
                    python_path = p;
                    python_version = v;
                    python_available = true;
                }
            }
        }
    }

    // 3. Detect Java runtime (java)
    let mut java_path = String::new();
    let mut java_version = String::new();
    let mut java_available = false;

    // Check JAVA_HOME env too for GUI apps that might not have it in PATH
    let java_candidates: Vec<String> = {
        let mut v = vec!["java".to_string()];
        if let Ok(java_home) = std::env::var("JAVA_HOME") {
            v.push(format!("{}/bin/java", java_home));
        }
        // Common macOS JDK install paths
        #[cfg(target_os = "macos")]
        {
            v.push("/usr/bin/java".to_string());
            v.push("/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home/bin/java".to_string());
            v.push("/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home/bin/java".to_string());
            v.push("/Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home/bin/java".to_string());
            // Try to detect from java_home utility on macOS
            if let Ok(output) = Command::new("/usr/libexec/java_home").output() {
                if output.status.success() {
                    let home = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !home.is_empty() {
                        v.push(format!("{}/bin/java", home));
                    }
                }
            }
        }
        v
    };
    for candidate in &java_candidates {
        if java_available { break; }
        let found = if candidate.starts_with('/') {
            if Path::new(candidate).exists() { Some(candidate.to_string()) } else { None }
        } else {
            find_executable(candidate)
        };
        if let Some(p) = found {
            // java -version prints to stderr
            if let Some(v) = get_version(&p, "-version") {
                java_path = p;
                java_version = v;
                java_available = true;
            }
        }
    }

    // 4. Detect Java compiler (javac)
    let mut javac_path = String::new();
    let mut javac_version = String::new();
    let mut javac_available = false;

    let javac_candidates: Vec<String> = {
        let mut v = vec!["javac".to_string()];
        if let Ok(java_home) = std::env::var("JAVA_HOME") {
            v.push(format!("{}/bin/javac", java_home));
        }
        // Derive from java_path if we found it
        if !java_path.is_empty() {
            let javac_sibling = java_path.replace("/java", "/javac");
            if javac_sibling != java_path {
                v.push(javac_sibling);
            }
        }
        #[cfg(target_os = "macos")]
        {
            v.push("/usr/bin/javac".to_string());
        }
        v
    };
    for candidate in &javac_candidates {
        if javac_available { break; }
        let found = if candidate.starts_with('/') {
            if Path::new(candidate).exists() { Some(candidate.to_string()) } else { None }
        } else {
            find_executable(candidate)
        };
        if let Some(p) = found {
            if let Some(v) = get_version(&p, "-version") {
                javac_version = v;
                javac_path = p;
                javac_available = true;
            } else if let Some(v) = get_version(&p, "--version") {
                javac_version = v;
                javac_path = p;
                javac_available = true;
            }
        }
    }

    Ok(CompilerSettings {
        paths: CompilerPaths {
            cpp_path,
            cpp_args: "-O2 -std=c++17".to_string(),
            python_path,
            java_path,
            javac_path,
        },
        status: CompilerStatus {
            cpp_version,
            cpp_available,
            python_version,
            python_available,
            java_version,
            java_available,
            javac_version,
            javac_available,
        },
    })
}

#[tauri::command]
pub async fn get_compiler_settings(app: AppHandle) -> Result<CompilerSettings, String> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        let detected = detect_compilers().await?;
        let json = serde_json::to_string_pretty(&detected).map_err(|e| e.to_string())?;
        fs::write(&path, json).map_err(|e| e.to_string())?;
        return Ok(detected);
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut settings: CompilerSettings = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    // Re-verify compiler paths to reflect current system state
    settings.status.cpp_available = false;
    if !settings.paths.cpp_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.cpp_path, "--version") {
            settings.status.cpp_version = v;
            settings.status.cpp_available = true;
        }
    }

    settings.status.python_available = false;
    if !settings.paths.python_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.python_path, "--version") {
            settings.status.python_version = v;
            settings.status.python_available = true;
        }
    }

    settings.status.java_available = false;
    if !settings.paths.java_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.java_path, "-version") {
            settings.status.java_version = v;
            settings.status.java_available = true;
        }
    }

    settings.status.javac_available = false;
    if !settings.paths.javac_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.javac_path, "-version") {
            settings.status.javac_version = v;
            settings.status.javac_available = true;
        } else if let Some(v) = get_version(&settings.paths.javac_path, "--version") {
            settings.status.javac_version = v;
            settings.status.javac_available = true;
        }
    }

    Ok(settings)
}

#[tauri::command]
pub async fn save_compiler_settings(app: AppHandle, mut settings: CompilerSettings) -> Result<CompilerSettings, String> {
    let path = get_config_path(&app)?;

    // Validate and update status before saving
    settings.status.cpp_available = false;
    if !settings.paths.cpp_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.cpp_path, "--version") {
            settings.status.cpp_version = v;
            settings.status.cpp_available = true;
        }
    }

    settings.status.python_available = false;
    if !settings.paths.python_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.python_path, "--version") {
            settings.status.python_version = v;
            settings.status.python_available = true;
        }
    }

    settings.status.java_available = false;
    if !settings.paths.java_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.java_path, "-version") {
            settings.status.java_version = v;
            settings.status.java_available = true;
        }
    }

    settings.status.javac_available = false;
    if !settings.paths.javac_path.is_empty() {
        if let Some(v) = get_version(&settings.paths.javac_path, "-version") {
            settings.status.javac_version = v;
            settings.status.javac_available = true;
        } else if let Some(v) = get_version(&settings.paths.javac_path, "--version") {
            settings.status.javac_version = v;
            settings.status.javac_available = true;
        }
    }

    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(settings)
}

#[tauri::command]
pub async fn run_code_locally(
    app: AppHandle,
    code: String,
    language: String,
    input: String,
    time_limit_sec: f32,
) -> Result<RunResult, String> {
    let settings = get_compiler_settings(app).await?;
    
    // Create a uniquely-named temp sandbox folder (counter ensures no collision on parallel runs)
    let run_id = RUN_COUNTER.fetch_add(1, Ordering::Relaxed);
    let temp_dir = std::env::temp_dir().join(format!("shahlms_runner_{}", run_id));
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let result = match language.as_str() {
        "C++" | "C++14" | "C" => {
            if !settings.status.cpp_available {
                return Err("C++ compiler is not configured or available.".to_string());
            }

            let src_file = temp_dir.join("Solution.cpp");
            fs::write(&src_file, &code).map_err(|e| e.to_string())?;

            let mut args: Vec<String> = settings.paths.cpp_args
                .split_whitespace()
                .map(|s| s.to_string())
                .collect();
            args.push("Solution.cpp".to_string());
            args.push("-o".to_string());
            args.push("Solution".to_string());

            let compile_output = Command::new(&settings.paths.cpp_path)
                .args(&args)
                .current_dir(&temp_dir)
                .output();

            match compile_output {
                Ok(out) => {
                    if !out.status.success() {
                        let err_msg = String::from_utf8_lossy(&out.stderr).to_string();
                        let out_msg = String::from_utf8_lossy(&out.stdout).to_string();
                        let combined = if err_msg.is_empty() { out_msg } else { err_msg };
                        return Ok(RunResult {
                            success: false,
                            exit_code: out.status.code(),
                            stdout: "".to_string(),
                            stderr: "".to_string(),
                            compile_output: combined,
                            execution_time_ms: 0,
                            status: "CompilationError".to_string(),
                        });
                    }
                }
                Err(e) => {
                    return Ok(RunResult {
                        success: false,
                        exit_code: None,
                        stdout: "".to_string(),
                        stderr: "".to_string(),
                        compile_output: format!("Failed to spawn C++ compiler: {}", e),
                        execution_time_ms: 0,
                        status: "CompilationError".to_string(),
                    });
                }
            }

            let exec_path = if cfg!(target_os = "windows") {
                temp_dir.join("Solution.exe")
            } else {
                temp_dir.join("./Solution")
            };

            execute_process(&exec_path.to_string_lossy(), &[], &temp_dir, &input, time_limit_sec)
        }
        "Python" | "Python3" => {
            if !settings.status.python_available {
                return Err("Python interpreter is not configured or available.".to_string());
            }

            let src_file = temp_dir.join("solution.py");
            fs::write(&src_file, &code).map_err(|e| e.to_string())?;

            execute_process(
                &settings.paths.python_path,
                &["solution.py".to_string()],
                &temp_dir,
                &input,
                time_limit_sec,
            )
        }
        "Java" => {
            if !settings.status.java_available || !settings.status.javac_available {
                return Err("Java JRE or JDK compiler is not configured or available.".to_string());
            }

            let src_file = temp_dir.join("Main.java");
            fs::write(&src_file, &code).map_err(|e| e.to_string())?;

            let compile_output = Command::new(&settings.paths.javac_path)
                .arg("Main.java")
                .current_dir(&temp_dir)
                .output();

            match compile_output {
                Ok(out) => {
                    if !out.status.success() {
                        let err_msg = String::from_utf8_lossy(&out.stderr).to_string();
                        let out_msg = String::from_utf8_lossy(&out.stdout).to_string();
                        let combined = if err_msg.is_empty() { out_msg } else { err_msg };
                        return Ok(RunResult {
                            success: false,
                            exit_code: out.status.code(),
                            stdout: "".to_string(),
                            stderr: "".to_string(),
                            compile_output: combined,
                            execution_time_ms: 0,
                            status: "CompilationError".to_string(),
                        });
                    }
                }
                Err(e) => {
                    return Ok(RunResult {
                        success: false,
                        exit_code: None,
                        stdout: "".to_string(),
                        stderr: "".to_string(),
                        compile_output: format!("Failed to spawn Java compiler (javac): {}", e),
                        execution_time_ms: 0,
                        status: "CompilationError".to_string(),
                    });
                }
            }

            execute_process(
                &settings.paths.java_path,
                &["Main".to_string()],
                &temp_dir,
                &input,
                time_limit_sec,
            )
        }
        _ => Err(format!("Unsupported language: {}", language)),
    };

    // Clean up temporary sandbox folder
    let _ = fs::remove_dir_all(&temp_dir);

    result
}

fn execute_process(
    path: &str,
    args: &[String],
    working_dir: &Path,
    input: &str,
    time_limit_sec: f32,
) -> Result<RunResult, String> {
    let start_time = Instant::now();

    let mut child = Command::new(path)
        .args(args)
        .current_dir(working_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to execute process: {}", e))?;

    // Pipe stdin asynchronously
    let mut stdin = child.stdin.take().ok_or("Failed to open stdin stream")?;
    let input_str = input.to_string();
    std::thread::spawn(move || {
        let _ = stdin.write_all(input_str.as_bytes());
        let _ = stdin.flush();
    });

    // Supervisor thread for timeout management
    let child_id = child.id();
    let is_timeout = Arc::new(Mutex::new(false));
    let is_timeout_clone = Arc::clone(&is_timeout);
    let (tx, rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        let limit = Duration::from_secs_f32(time_limit_sec);
        if rx.recv_timeout(limit).is_err() {
            if let Ok(mut guard) = is_timeout_clone.lock() {
                *guard = true;
            }
            #[cfg(target_family = "unix")]
            {
                let _ = Command::new("kill").arg("-9").arg(child_id.to_string()).output();
            }
            #[cfg(target_family = "windows")]
            {
                let _ = Command::new("taskkill").arg("/F").arg("/PID").arg(child_id.to_string()).output();
            }
        }
    });

    let output = child.wait_with_output();
    let _ = tx.send(()); // Signal supervisor exit

    let duration_ms = start_time.elapsed().as_millis();

    let output = match output {
        Ok(out) => out,
        Err(e) => {
            return Ok(RunResult {
                success: false,
                exit_code: None,
                stdout: "".to_string(),
                stderr: format!("Failed to read process output: {}", e),
                compile_output: "".to_string(),
                execution_time_ms: duration_ms,
                status: "RuntimeError".to_string(),
            });
        }
    };

    let timed_out = if let Ok(guard) = is_timeout.lock() {
        *guard
    } else {
        false
    };

    let stdout_str = String::from_utf8_lossy(&output.stdout).replace("\r\n", "\n");
    let stderr_str = String::from_utf8_lossy(&output.stderr).replace("\r\n", "\n");

    let status = if timed_out {
        "TimeLimitExceeded".to_string()
    } else if !output.status.success() {
        "RuntimeError".to_string()
    } else {
        "Success".to_string()
    };

    Ok(RunResult {
        success: status == "Success",
        exit_code: output.status.code(),
        stdout: stdout_str,
        stderr: stderr_str,
        compile_output: "".to_string(),
        execution_time_ms: duration_ms,
        status,
    })
}
