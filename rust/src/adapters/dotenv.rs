use std::collections::HashMap;
use std::fs;
use std::path::Path;

pub struct DotEnv;

impl DotEnv {
    pub fn parse(content: &str) -> HashMap<String, String> {
        let mut result = HashMap::new();
        let mut current_key: Option<String> = None;
        let mut current_value = String::new();
        let mut in_multiline = false;

        for line in content.lines() {
            // Handle multiline heredoc
            if in_multiline {
                if line.trim() == "EOF" {
                    if let Some(key) = current_key.take() {
                        result.insert(key, current_value.trim().to_string());
                    }
                    in_multiline = false;
                    current_value.clear();
                } else {
                    current_value.push_str(line);
                    current_value.push('\n');
                }
                continue;
            }

            // Handle line continuation
            if current_key.is_some() && line.ends_with('\\') {
                current_value.push_str(&line[..line.len() - 1]);
                current_value.push('\n');
                continue;
            }

            // Store previous key-value
            if let Some(key) = current_key.take() {
                if !current_value.is_empty() {
                    result.insert(key, current_value.trim().to_string());
                }
                current_value.clear();
            }

            // Skip comments and empty lines
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            // Parse new key-value
            if let Some(eq_pos) = line.find('=') {
                let key = line[..eq_pos].trim().to_string();
                let value_str = line[eq_pos + 1..].trim();

                // Check for heredoc
                if value_str.starts_with("<<") {
                    in_multiline = true;
                    current_key = Some(key);
                } else {
                    let value = Self::unescape_value(value_str);
                    result.insert(key, value);
                }
            }
        }

        // Store final key-value
        if let Some(key) = current_key {
            if !current_value.is_empty() {
                result.insert(key, current_value.trim().to_string());
            }
        }

        result
    }

    pub fn load_file<P: AsRef<Path>>(path: P) -> std::io::Result<HashMap<String, String>> {
        let content = fs::read_to_string(path)?;
        Ok(Self::parse(&content))
    }

    pub fn generate(values: &HashMap<String, String>) -> String {
        let mut lines = Vec::new();
        for (key, value) in values {
            lines.push(format!("{}={}", key, Self::escape_value(value)));
        }
        lines.join("\n")
    }

    pub fn save_file<P: AsRef<Path>>(path: P, values: &HashMap<String, String>) -> std::io::Result<()> {
        let content = Self::generate(values);
        fs::write(path, content)
    }

    pub fn escape_value(value: &str) -> String {
        if value.is_empty() {
            return "\"\"".to_string();
        }

        if value.contains('\n') || value.contains('"') || value.contains('\\') || value.contains('$') {
            let escaped = value
                .replace('\\', "\\\\")
                .replace('"', "\\\"")
                .replace('$', "\\$");
            format!("\"{}\"", escaped)
        } else {
            value.to_string()
        }
    }

    pub fn unescape_value(value: &str) -> String {
        if value.is_empty() {
            return String::new();
        }

        if (value.starts_with('"') && value.ends_with('"'))
            || (value.starts_with('\'') && value.ends_with('\''))
        {
            let inner = &value[1..value.len() - 1];
            inner
                .replace("\\n", "\n")
                .replace("\\t", "\t")
                .replace("\\\\", "\\")
                .replace("\\\"", "\"")
        } else {
            value.to_string()
        }
    }
}
