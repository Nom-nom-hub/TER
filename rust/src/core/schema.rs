use std::collections::HashMap;
use super::BaseType;

pub struct Schema {
    variables: HashMap<String, Box<dyn BaseType>>,
}

impl Schema {
    pub fn new() -> Self {
        Schema {
            variables: HashMap::new(),
        }
    }

    pub fn define(&mut self, name: String, type_def: Box<dyn BaseType>) {
        self.variables.insert(name, type_def);
    }

    pub fn has_variable(&self, name: &str) -> bool {
        self.variables.contains_key(name)
    }

    pub fn get_variable(&self, name: &str) -> Option<&Box<dyn BaseType>> {
        self.variables.get(name)
    }

    pub fn get_variables(&self) -> &HashMap<String, Box<dyn BaseType>> {
        &self.variables
    }
}

impl Default for Schema {
    fn default() -> Self {
        Schema::new()
    }
}
