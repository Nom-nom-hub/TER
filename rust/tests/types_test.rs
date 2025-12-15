use ter::core::{Types, ValidationResult};

#[test]
fn test_string_type() {
    let type_def = Types::string();
    match type_def.validate(Some("hello".to_string())) {
        ValidationResult::Valid(val) => {
            assert_eq!(val.as_str().unwrap(), "hello");
        }
        ValidationResult::Invalid(_) => panic!("Should be valid"),
    }
}

#[test]
fn test_string_required() {
    let type_def = Types::string().required();
    match type_def.validate(None) {
        ValidationResult::Invalid(e) => {
            assert!(e.contains("required"));
        }
        ValidationResult::Valid(_) => panic!("Should be invalid"),
    }
}

#[test]
fn test_int_type() {
    let type_def = Types::integer();
    match type_def.validate(Some("42".to_string())) {
        ValidationResult::Valid(val) => {
            assert_eq!(val.as_i64().unwrap(), 42);
        }
        ValidationResult::Invalid(_) => panic!("Should be valid"),
    }
}

#[test]
fn test_boolean_type() {
    let type_def = Types::boolean();
    match type_def.validate(Some("true".to_string())) {
        ValidationResult::Valid(val) => {
            assert_eq!(val.as_bool().unwrap(), true);
        }
        ValidationResult::Invalid(_) => panic!("Should be valid"),
    }
}

#[test]
fn test_enum_type() {
    let type_def = Types::enumof(vec!["dev".to_string(), "prod".to_string()]);
    match type_def.validate(Some("dev".to_string())) {
        ValidationResult::Valid(_) => {}
        ValidationResult::Invalid(_) => panic!("Should be valid"),
    }

    match type_def.validate(Some("invalid".to_string())) {
        ValidationResult::Invalid(_) => {}
        ValidationResult::Valid(_) => panic!("Should be invalid"),
    }
}

#[test]
fn test_secret_is_secret() {
    let type_def = Types::secret();
    assert!(type_def.is_secret());
}
