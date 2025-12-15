#[derive(Debug, Clone)]
pub enum ValidationResult<T> {
    Valid(T),
    Invalid(String),
}

impl<T> ValidationResult<T> {
    pub fn is_valid(&self) -> bool {
        matches!(self, ValidationResult::Valid(_))
    }

    pub fn map<U, F>(self, f: F) -> ValidationResult<U>
    where
        F: FnOnce(T) -> U,
    {
        match self {
            ValidationResult::Valid(v) => ValidationResult::Valid(f(v)),
            ValidationResult::Invalid(e) => ValidationResult::Invalid(e),
        }
    }
}
