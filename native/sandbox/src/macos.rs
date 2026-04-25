//! macOS sandbox — Seatbelt profile generation + sandbox-exec.

use crate::{SandboxConfig, SandboxResult};
use std::process::Command;

/// Check if sandbox-exec is available (ships with macOS).
pub fn is_available() -> bool {
    Command::new("sandbox-exec")
        .arg("-n")
        .arg("no-network")
        .arg("true")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Generate a Seatbelt profile string from config.
///
/// Strategy: allow everything by default, only deny dangerous operations.
/// The primary goal is preventing `rm -rf /` style destructive commands
/// while letting normal shell operations work without friction.
fn generate_profile(config: &SandboxConfig) -> String {
    let mut profile = String::from("(version 1)\n");

    // Default allow — no more exit code 65 for normal commands
    profile.push_str("(allow default)\n");

    // Protected paths — deny write (e.g. system dirs, user-specified paths)
    if let Some(ref protected) = config.protected_paths {
        for path in protected {
            let expanded = if path.starts_with('~') {
                if let Ok(home) = std::env::var("HOME") {
                    path.replacen('~', &home, 1)
                } else {
                    continue;
                }
            } else {
                path.clone()
            };
            profile.push_str(&format!(
                "(deny file-write* (subpath \"{expanded}\"))\n"
            ));
        }
    }

    // Always protect critical system paths from writes
    profile.push_str("(deny file-write* (subpath \"/System\"))\n");
    profile.push_str("(deny file-write* (subpath \"/usr\"))\n");
    profile.push_str("(deny file-write* (subpath \"/bin\"))\n");
    profile.push_str("(deny file-write* (subpath \"/sbin\"))\n");

    // Network policy — only restrict if explicitly blocked
    match config.network_policy.as_str() {
        "blocked" => {
            profile.push_str("(deny network*)\n");
        }
        "limited" => {
            profile.push_str("(deny network-bind)\n");
        }
        _ => {
            // "full" or default — already allowed by (allow default)
        }
    }

    profile
}

/// Execute a command in macOS Seatbelt sandbox.
pub fn exec(command: &str, config: &SandboxConfig) -> Result<SandboxResult, String> {
    let profile = generate_profile(config);

    let output = Command::new("sandbox-exec")
        .arg("-p")
        .arg(&profile)
        .arg("--")
        .arg("/bin/sh")
        .arg("-c")
        .arg(command)
        .output()
        .map_err(|e| format!("sandbox-exec: {e}"))?;

    Ok(SandboxResult {
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        sandbox_level: "3-macos-seatbelt".into(),
    })
}
