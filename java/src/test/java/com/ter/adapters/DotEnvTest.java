package com.ter.adapters;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Map;

public class DotEnvTest {
    @Test
    public void testParseSimple() {
        String content = "KEY1=value1\nKEY2=value2";
        Map<String, Object> result = DotEnv.parse(content);

        assertEquals("value1", result.get("KEY1"));
        assertEquals("value2", result.get("KEY2"));
    }

    @Test
    public void testParseIgnoresComments() {
        String content = "# Comment\nKEY=value\n# Another";
        Map<String, Object> result = DotEnv.parse(content);

        assertEquals(1, result.size());
        assertEquals("value", result.get("KEY"));
    }

    @Test
    public void testParseQuoted() {
        String content = "KEY1=\"quoted value\"\nKEY2='single'";
        Map<String, Object> result = DotEnv.parse(content);

        assertEquals("quoted value", result.get("KEY1"));
        assertEquals("single", result.get("KEY2"));
    }

    @Test
    public void testParseHeredoc() {
        String content = "CERT=<<EOF\nBEGIN CERT\nEOF";
        Map<String, Object> result = DotEnv.parse(content);

        assertTrue(((String) result.get("CERT")).contains("BEGIN CERT"));
    }

    @Test
    public void testGenerate() {
        Map<String, Object> values = Map.of("KEY1", "value1", "KEY2", "value2");
        String result = DotEnv.generate(values);

        assertTrue(result.contains("KEY1=value1"));
        assertTrue(result.contains("KEY2=value2"));
    }

    @Test
    public void testEscapeValue() {
        String escaped = DotEnv.escapeValue("value with \"quotes\"");
        assertTrue(escaped.contains("\\\""));

        String escaped2 = DotEnv.escapeValue("simple");
        assertEquals("simple", escaped2);
    }

    @Test
    public void testUnescapeValue() {
        String unescaped = DotEnv.unescapeValue("\"quoted value\"");
        assertEquals("quoted value", unescaped);

        String unescaped2 = DotEnv.unescapeValue("unquoted");
        assertEquals("unquoted", unescaped2);
    }

    @Test
    public void testRoundTrip() {
        Map<String, Object> original = Map.of(
            "KEY1", "value1",
            "KEY2", "value2"
        );

        String generated = DotEnv.generate(original);
        Map<String, Object> parsed = DotEnv.parse(generated);

        assertEquals("value1", parsed.get("KEY1"));
        assertEquals("value2", parsed.get("KEY2"));
    }
}
