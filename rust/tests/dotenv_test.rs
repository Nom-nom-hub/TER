use ter::adapters::DotEnv;
use std::collections::HashMap;

#[test]
fn test_parse_simple() {
    let content = "KEY1=value1\nKEY2=value2";
    let result = DotEnv::parse(content);

    assert_eq!(result.get("KEY1").unwrap(), "value1");
    assert_eq!(result.get("KEY2").unwrap(), "value2");
}

#[test]
fn test_parse_comments() {
    let content = "# Comment\nKEY=value\n# Another";
    let result = DotEnv::parse(content);

    assert_eq!(result.len(), 1);
    assert_eq!(result.get("KEY").unwrap(), "value");
}

#[test]
fn test_parse_quoted() {
    let content = "KEY1=\"quoted value\"\nKEY2='single'";
    let result = DotEnv::parse(content);

    assert_eq!(result.get("KEY1").unwrap(), "quoted value");
    assert_eq!(result.get("KEY2").unwrap(), "single");
}

#[test]
fn test_escape_value() {
    let escaped = DotEnv::escape_value("value with \"quotes\"");
    assert!(escaped.contains("\\\""));

    let simple = DotEnv::escape_value("simple");
    assert_eq!(simple, "simple");
}

#[test]
fn test_unescape_value() {
    let unescaped = DotEnv::unescape_value("\"quoted value\"");
    assert_eq!(unescaped, "quoted value");

    let unquoted = DotEnv::unescape_value("unquoted");
    assert_eq!(unquoted, "unquoted");
}

#[test]
fn test_generate() {
    let mut values = HashMap::new();
    values.insert("KEY1".to_string(), "value1".to_string());
    values.insert("KEY2".to_string(), "value2".to_string());

    let result = DotEnv::generate(&values);
    assert!(result.contains("KEY1=value1"));
    assert!(result.contains("KEY2=value2"));
}
