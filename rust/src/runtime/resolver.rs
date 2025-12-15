use std::collections::HashMap;
use super::environment::{ResolutionMetadata, ResolutionResult};

pub struct Resolver {
    process_env: HashMap<String, String>,
    file_env: HashMap<String, String>,
    injected: HashMap<String, String>,
}

impl Resolver {
    pub fn new() -> Self {
        Resolver {
            process_env: HashMap::new(),
            file_env: HashMap::new(),
            injected: HashMap::new(),
        }
    }

    pub fn add_process_env(mut self, env: HashMap<String, String>) -> Self {
        self.process_env.extend(env);
        self
    }

    pub fn add_file_env(mut self, env: HashMap<String, String>) -> Self {
        self.file_env.extend(env);
        self
    }

    pub fn add_injected(mut self, values: HashMap<String, String>) -> Self {
        self.injected.extend(values);
        self
    }

    pub fn resolve(&self) -> ResolutionResult {
        let mut values = HashMap::new();
        let mut metadata = HashMap::new();
        let mut errors = Vec::new();

        // Find values with priority ordering
        for (key, _) in &self.process_env {
            if let Some(val) = self.process_env.get(key) {
                values.insert(key.clone(), val.clone());
                metadata.insert(key.clone(), ResolutionMetadata {
                    source: "process".to_string(),
                    resolved_at: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as u64,
                });
            }
        }

        for (key, _) in &self.file_env {
            if !values.contains_key(key) {
                if let Some(val) = self.file_env.get(key) {
                    values.insert(key.clone(), val.clone());
                    metadata.insert(key.clone(), ResolutionMetadata {
                        source: "file".to_string(),
                        resolved_at: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs() as u64,
                    });
                }
            }
        }

        for (key, _) in &self.injected {
            if !values.contains_key(key) {
                if let Some(val) = self.injected.get(key) {
                    values.insert(key.clone(), val.clone());
                    metadata.insert(key.clone(), ResolutionMetadata {
                        source: "injected".to_string(),
                        resolved_at: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_secs() as u64,
                    });
                }
            }
        }

        ResolutionResult {
            valid: errors.is_empty(),
            values,
            error: if errors.is_empty() {
                String::new()
            } else {
                errors.join("; ")
            },
            metadata,
        }
    }
}

impl Default for Resolver {
    fn default() -> Self {
        Resolver::new()
    }
}
