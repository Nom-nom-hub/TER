use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ResolutionMetadata {
    pub source: String,
    pub resolved_at: u64,
}

#[derive(Debug)]
pub struct ResolutionResult {
    pub valid: bool,
    pub values: HashMap<String, String>,
    pub error: String,
    pub metadata: HashMap<String, ResolutionMetadata>,
}

pub struct Environment {
    values: HashMap<String, String>,
    metadata: HashMap<String, ResolutionMetadata>,
}

impl Environment {
    pub fn new(values: HashMap<String, String>, metadata: HashMap<String, ResolutionMetadata>) -> Self {
        Environment { values, metadata }
    }

    pub fn get(&self, key: &str) -> Option<&str> {
        self.values.get(key).map(|s| s.as_str())
    }

    pub fn get_metadata(&self, key: &str) -> Option<&ResolutionMetadata> {
        self.metadata.get(key)
    }

    pub fn to_map(&self) -> HashMap<String, String> {
        self.values.clone()
    }
}
