use regex::Regex;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub enum ValidationResult<T> {
    Valid(T),
    Invalid(String),
}

impl<T> ValidationResult<T> {
    pub fn is_valid(&self) -> bool {
        matches!(self, ValidationResult::Valid(_))
    }

    pub fn get_error(&self) -> Option<&str> {
        match self {
            ValidationResult::Invalid(e) => Some(e),
            _ => None,
        }
    }
}

pub trait BaseType: Send + Sync {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value>;
    fn coerce(&self, value: String) -> Option<serde_json::Value>;
    fn is_required(&self) -> bool;
    fn get_default(&self) -> Option<serde_json::Value>;
    fn get_description(&self) -> &str;
    fn is_secret(&self) -> bool {
        false
    }
}

pub struct StringType {
    required: bool,
    default: Option<String>,
    description: String,
    min_length: Option<usize>,
    max_length: Option<usize>,
    pattern: Option<Regex>,
}

impl StringType {
    pub fn new() -> Self {
        StringType {
            required: false,
            default: None,
            description: String::new(),
            min_length: None,
            max_length: None,
            pattern: None,
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: String) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }

    pub fn min_length(mut self, length: usize) -> Self {
        self.min_length = Some(length);
        self
    }

    pub fn max_length(mut self, length: usize) -> Self {
        self.max_length = Some(length);
        self
    }

    pub fn pattern(mut self, regex: Regex) -> Self {
        self.pattern = Some(regex);
        self
    }
}

impl Default for StringType {
    fn default() -> Self {
        StringType::new()
    }
}

impl BaseType for StringType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val = match value {
            Some(v) => v,
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(ref def) = self.default {
                    def.clone()
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        if let Some(ref min) = self.min_length {
            if val.len() < *min {
                return ValidationResult::Invalid(format!("String length must be at least {}", min));
            }
        }

        if let Some(ref max) = self.max_length {
            if val.len() > *max {
                return ValidationResult::Invalid(format!("String length must be at most {}", max));
            }
        }

        if let Some(ref pattern) = self.pattern {
            if !pattern.is_match(&val) {
                return ValidationResult::Invalid(format!("String does not match pattern"));
            }
        }

        ValidationResult::Valid(serde_json::Value::String(val))
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        Some(serde_json::Value::String(value))
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.as_ref().map(|v| serde_json::Value::String(v.clone()))
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct IntType {
    required: bool,
    default: Option<i64>,
    description: String,
    min: Option<i64>,
    max: Option<i64>,
}

impl IntType {
    pub fn new() -> Self {
        IntType {
            required: false,
            default: None,
            description: String::new(),
            min: None,
            max: None,
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: i64) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }

    pub fn min(mut self, value: i64) -> Self {
        self.min = Some(value);
        self
    }

    pub fn max(mut self, value: i64) -> Self {
        self.max = Some(value);
        self
    }
}

impl Default for IntType {
    fn default() -> Self {
        IntType::new()
    }
}

impl BaseType for IntType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val: i64 = match value {
            Some(v) => match v.parse() {
                Ok(n) => n,
                Err(_) => return ValidationResult::Invalid("Could not parse as integer".to_string()),
            },
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(def) = self.default {
                    def
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        if let Some(min) = self.min {
            if val < min {
                return ValidationResult::Invalid(format!("Integer must be at least {}", min));
            }
        }

        if let Some(max) = self.max {
            if val > max {
                return ValidationResult::Invalid(format!("Integer must be at most {}", max));
            }
        }

        ValidationResult::Valid(serde_json::Value::Number(val.into()))
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        value.parse::<i64>().ok().map(|n| serde_json::Value::Number(n.into()))
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.map(|v| serde_json::Value::Number(v.into()))
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct NumberType {
    required: bool,
    default: Option<f64>,
    description: String,
    min: Option<f64>,
    max: Option<f64>,
}

impl NumberType {
    pub fn new() -> Self {
        NumberType {
            required: false,
            default: None,
            description: String::new(),
            min: None,
            max: None,
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: f64) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }

    pub fn min(mut self, value: f64) -> Self {
        self.min = Some(value);
        self
    }

    pub fn max(mut self, value: f64) -> Self {
        self.max = Some(value);
        self
    }
}

impl Default for NumberType {
    fn default() -> Self {
        NumberType::new()
    }
}

impl BaseType for NumberType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val: f64 = match value {
            Some(v) => match v.parse() {
                Ok(n) => n,
                Err(_) => return ValidationResult::Invalid("Could not parse as number".to_string()),
            },
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(def) = self.default {
                    def
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        if let Some(min) = self.min {
            if val < min {
                return ValidationResult::Invalid(format!("Number must be at least {}", min));
            }
        }

        if let Some(max) = self.max {
            if val > max {
                return ValidationResult::Invalid(format!("Number must be at most {}", max));
            }
        }

        ValidationResult::Valid(serde_json::json!(val))
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        value.parse::<f64>().ok().map(|n| serde_json::json!(n))
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.map(|v| serde_json::json!(v))
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct BooleanType {
    required: bool,
    default: Option<bool>,
    description: String,
}

impl BooleanType {
    pub fn new() -> Self {
        BooleanType {
            required: false,
            default: None,
            description: String::new(),
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: bool) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }
}

impl Default for BooleanType {
    fn default() -> Self {
        BooleanType::new()
    }
}

impl BaseType for BooleanType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val = match value {
            Some(v) => match v.to_lowercase().as_str() {
                "true" | "1" | "yes" => true,
                "false" | "0" | "no" => false,
                _ => return ValidationResult::Invalid("Invalid boolean value".to_string()),
            },
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(def) = self.default {
                    def
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        ValidationResult::Valid(serde_json::Value::Bool(val))
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        match value.to_lowercase().as_str() {
            "true" | "1" | "yes" => Some(serde_json::Value::Bool(true)),
            "false" | "0" | "no" => Some(serde_json::Value::Bool(false)),
            _ => None,
        }
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.map(serde_json::Value::Bool)
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct EnumType {
    allowed: Vec<String>,
    required: bool,
    default: Option<String>,
    description: String,
}

impl EnumType {
    pub fn new(allowed: Vec<String>) -> Self {
        EnumType {
            allowed,
            required: false,
            default: None,
            description: String::new(),
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: String) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }

    pub fn allowed_values(&self) -> &[String] {
        &self.allowed
    }
}

impl BaseType for EnumType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val = match value {
            Some(v) => v,
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(ref def) = self.default {
                    def.clone()
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        if !self.allowed.contains(&val) {
            return ValidationResult::Invalid(format!("Value must be one of: {}", self.allowed.join(", ")));
        }

        ValidationResult::Valid(serde_json::Value::String(val))
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        if self.allowed.contains(&value) {
            Some(serde_json::Value::String(value))
        } else {
            None
        }
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.as_ref().map(|v| serde_json::Value::String(v.clone()))
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct URLType {
    required: bool,
    default: Option<String>,
    description: String,
}

impl URLType {
    pub fn new() -> Self {
        URLType {
            required: false,
            default: None,
            description: String::new(),
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: String) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }
}

impl Default for URLType {
    fn default() -> Self {
        URLType::new()
    }
}

impl BaseType for URLType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val = match value {
            Some(v) => v,
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(ref def) = self.default {
                    def.clone()
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        if let Ok(url) = url::Url::parse(&val) {
            if url.scheme() == "http" || url.scheme() == "https" {
                return ValidationResult::Valid(serde_json::Value::String(val));
            }
        }

        ValidationResult::Invalid("Invalid URL".to_string())
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        Some(serde_json::Value::String(value))
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.as_ref().map(|v| serde_json::Value::String(v.clone()))
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct JSONType {
    required: bool,
    default: Option<serde_json::Value>,
    description: String,
}

impl JSONType {
    pub fn new() -> Self {
        JSONType {
            required: false,
            default: None,
            description: String::new(),
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: serde_json::Value) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }
}

impl Default for JSONType {
    fn default() -> Self {
        JSONType::new()
    }
}

impl BaseType for JSONType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val = match value {
            Some(v) => {
                match serde_json::from_str(&v) {
                    Ok(json) => json,
                    Err(_) => return ValidationResult::Invalid("Invalid JSON".to_string()),
                }
            }
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(ref def) = self.default {
                    def.clone()
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        ValidationResult::Valid(val)
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        serde_json::from_str(&value).ok()
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.clone()
    }

    fn get_description(&self) -> &str {
        &self.description
    }
}

pub struct SecretType {
    required: bool,
    default: Option<String>,
    description: String,
    pattern: Option<Regex>,
}

impl SecretType {
    pub fn new() -> Self {
        SecretType {
            required: false,
            default: None,
            description: String::new(),
            pattern: None,
        }
    }

    pub fn required(mut self) -> Self {
        self.required = true;
        self
    }

    pub fn default(mut self, value: String) -> Self {
        self.default = Some(value);
        self
    }

    pub fn describe(mut self, text: String) -> Self {
        self.description = text;
        self
    }

    pub fn pattern(mut self, regex: Regex) -> Self {
        self.pattern = Some(regex);
        self
    }
}

impl Default for SecretType {
    fn default() -> Self {
        SecretType::new()
    }
}

impl BaseType for SecretType {
    fn validate(&self, value: Option<String>) -> ValidationResult<serde_json::Value> {
        let val = match value {
            Some(v) => v,
            None => {
                if self.required {
                    return ValidationResult::Invalid("Value is required".to_string());
                }
                if let Some(ref def) = self.default {
                    def.clone()
                } else {
                    return ValidationResult::Valid(serde_json::Value::Null);
                }
            }
        };

        if let Some(ref pattern) = self.pattern {
            if !pattern.is_match(&val) {
                return ValidationResult::Invalid("Secret does not match pattern".to_string());
            }
        }

        ValidationResult::Valid(serde_json::Value::String(val))
    }

    fn coerce(&self, value: String) -> Option<serde_json::Value> {
        Some(serde_json::Value::String(value))
    }

    fn is_required(&self) -> bool {
        self.required
    }

    fn get_default(&self) -> Option<serde_json::Value> {
        self.default.as_ref().map(|v| serde_json::Value::String(v.clone()))
    }

    fn get_description(&self) -> &str {
        &self.description
    }

    fn is_secret(&self) -> bool {
        true
    }
}

pub struct Types;

impl Types {
    pub fn string() -> StringType {
        StringType::new()
    }

    pub fn integer() -> IntType {
        IntType::new()
    }

    pub fn number() -> NumberType {
        NumberType::new()
    }

    pub fn boolean() -> BooleanType {
        BooleanType::new()
    }

    pub fn enumof(values: Vec<String>) -> EnumType {
        EnumType::new(values)
    }

    pub fn url() -> URLType {
        URLType::new()
    }

    pub fn json() -> JSONType {
        JSONType::new()
    }

    pub fn secret() -> SecretType {
        SecretType::new()
    }
}
