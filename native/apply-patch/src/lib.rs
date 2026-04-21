//! LegnaCode Apply-Patch — fast unified diff application via NAPI.
//!
//! Applies unified diff patches to file content with fuzzy context matching.
//! 10x+ faster than pure JS diff libraries.

use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(object)]
#[derive(Debug, Clone)]
pub struct PatchResult {
    /// The patched file content
    pub content: String,
    /// Whether the patch applied cleanly
    pub clean: bool,
    /// Number of hunks applied
    pub hunks_applied: i32,
    /// Number of hunks that required fuzzy matching
    pub hunks_fuzzy: i32,
    /// Number of hunks that failed
    pub hunks_failed: i32,
}

#[napi(object)]
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub hunks: i32,
    pub error: Option<String>,
}

#[derive(Debug)]
struct Hunk {
    old_start: usize,
    old_count: usize,
    lines: Vec<HunkLine>,
}

#[derive(Debug, Clone)]
enum HunkLine {
    Context(String),
    Remove(String),
    Add(String),
}

/// Parse a unified diff into hunks.
fn parse_patch(patch: &str) -> std::result::Result<Vec<Hunk>, String> {
    let mut hunks = Vec::new();
    let mut lines = patch.lines().peekable();

    // Skip header lines (---, +++)
    while let Some(line) = lines.peek() {
        if line.starts_with("@@") {
            break;
        }
        lines.next();
    }

    while let Some(line) = lines.next() {
        if !line.starts_with("@@") {
            continue;
        }

        // Parse @@ -old_start,old_count +new_start,new_count @@
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            return Err(format!("malformed hunk header: {line}"));
        }

        let old_range = parts[1].trim_start_matches('-');
        let (old_start, old_count) = parse_range(old_range)?;

        let mut hunk_lines = Vec::new();

        while let Some(next) = lines.peek() {
            if next.starts_with("@@") || next.starts_with("diff ") {
                break;
            }
            let next = *next;
            lines.next();

            if let Some(rest) = next.strip_prefix('-') {
                hunk_lines.push(HunkLine::Remove(rest.to_string()));
            } else if let Some(rest) = next.strip_prefix('+') {
                hunk_lines.push(HunkLine::Add(rest.to_string()));
            } else if let Some(rest) = next.strip_prefix(' ') {
                hunk_lines.push(HunkLine::Context(rest.to_string()));
            } else if next == "\\ No newline at end of file" {
                // Skip
            } else {
                // Treat as context
                hunk_lines.push(HunkLine::Context(next.to_string()));
            }
        }

        hunks.push(Hunk {
            old_start,
            old_count,
            lines: hunk_lines,
        });
    }

    Ok(hunks)
}

fn parse_range(range: &str) -> std::result::Result<(usize, usize), String> {
    if let Some((start, count)) = range.split_once(',') {
        let s = start.parse::<usize>().map_err(|e| format!("bad range start: {e}"))?;
        let c = count.parse::<usize>().map_err(|e| format!("bad range count: {e}"))?;
        Ok((s, c))
    } else {
        let s = range.parse::<usize>().map_err(|e| format!("bad range: {e}"))?;
        Ok((s, 1))
    }
}

/// Apply a single hunk to file lines, with fuzzy offset tolerance.
fn apply_hunk(
    file_lines: &mut Vec<String>,
    hunk: &Hunk,
    fuzz: usize,
) -> (bool, bool) {
    // Collect context + remove lines for matching
    let match_lines: Vec<&str> = hunk.lines.iter().filter_map(|l| match l {
        HunkLine::Context(s) | HunkLine::Remove(s) => Some(s.as_str()),
        _ => None,
    }).collect();

    if match_lines.is_empty() {
        // Pure addition — insert at old_start
        let pos = if hunk.old_start == 0 { 0 } else { hunk.old_start - 1 };
        let additions: Vec<String> = hunk.lines.iter().filter_map(|l| match l {
            HunkLine::Add(s) => Some(s.clone()),
            _ => None,
        }).collect();
        for (i, line) in additions.into_iter().enumerate() {
            let insert_at = (pos + i).min(file_lines.len());
            file_lines.insert(insert_at, line);
        }
        return (true, false);
    }

    // Try exact position first, then fuzz offsets
    let base = if hunk.old_start == 0 { 0 } else { hunk.old_start - 1 };

    for offset in 0..=fuzz {
        for dir in &[0i64, 1, -1] {
            let actual_offset = (*dir) * (offset as i64);
            let pos = (base as i64 + actual_offset) as usize;

            if pos + match_lines.len() > file_lines.len() {
                continue;
            }

            // Check match
            let matches = match_lines.iter().enumerate().all(|(i, expected)| {
                pos + i < file_lines.len() && file_lines[pos + i].trim_end() == expected.trim_end()
            });

            if matches {
                // Apply: remove old lines, insert new
                let mut new_pos = pos;
                let mut removals = 0;

                for hl in &hunk.lines {
                    match hl {
                        HunkLine::Context(_) => { new_pos += 1; }
                        HunkLine::Remove(_) => {
                            if new_pos < file_lines.len() {
                                file_lines.remove(new_pos);
                                removals += 1;
                            }
                        }
                        HunkLine::Add(s) => {
                            file_lines.insert(new_pos, s.clone());
                            new_pos += 1;
                        }
                    }
                }

                let fuzzy = offset > 0;
                let _ = removals; // used for side effect
                return (true, fuzzy);
            }
        }
    }

    (false, false)
}

/// Apply a unified diff patch to file content.
#[napi]
pub fn apply_patch(file_content: String, patch_content: String) -> Result<PatchResult> {
    let hunks = parse_patch(&patch_content)
        .map_err(|e| Error::from_reason(format!("parse error: {e}")))?;

    let mut lines: Vec<String> = file_content.lines().map(|l| l.to_string()).collect();
    let mut applied = 0;
    let mut fuzzy = 0;
    let mut failed = 0;

    for hunk in &hunks {
        let (ok, was_fuzzy) = apply_hunk(&mut lines, hunk, 3);
        if ok {
            applied += 1;
            if was_fuzzy { fuzzy += 1; }
        } else {
            failed += 1;
        }
    }

    let content = if file_content.ends_with('\n') {
        lines.join("\n") + "\n"
    } else {
        lines.join("\n")
    };

    Ok(PatchResult {
        content,
        clean: failed == 0 && fuzzy == 0,
        hunks_applied: applied,
        hunks_fuzzy: fuzzy,
        hunks_failed: failed,
    })
}

/// Validate a patch without applying it.
#[napi]
pub fn validate_patch(patch_content: String) -> ValidationResult {
    match parse_patch(&patch_content) {
        Ok(hunks) => ValidationResult {
            valid: true,
            hunks: hunks.len() as i32,
            error: None,
        },
        Err(e) => ValidationResult {
            valid: false,
            hunks: 0,
            error: Some(e),
        },
    }
}
