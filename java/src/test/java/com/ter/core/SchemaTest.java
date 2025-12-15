package com.ter.core;

import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;
import java.util.Map;

public class SchemaTest {
    private Schema schema;

    @Before
    public void setUp() {
        schema = new Schema();
    }

    @Test
    public void testDefine() {
        StringType type = schema.define("NAME", Types.string());
        assertTrue(schema.hasVariable("NAME"));
        assertEquals(type, schema.getVariable("NAME"));
    }

    @Test
    public void testValidate() {
        schema.define("NAME", Types.string().markRequired());
        schema.define("AGE", Types.integer().setDefault(0));

        Map<String, Object> values = Map.of("NAME", "Alice");
        Schema.ValidationResult result = schema.validateAll(values);
        assertTrue(result.valid);
    }

    @Test
    public void testValidateErrors() {
        schema.define("NAME", Types.string().markRequired());
        schema.define("AGE", Types.integer().min(0).max(150));

        Map<String, Object> values = Map.of(
            "NAME", null,
            "AGE", 200
        );
        Schema.ValidationResult result = schema.validateAll(values);
        assertFalse(result.valid);
    }

    @Test
    public void testToContract() {
        schema.define("NAME", Types.string().markRequired().describe("User name"));
        schema.define("PORT", Types.integer().setDefault(3000));

        Map<String, Map<String, Object>> contract = schema.toContract();
        assertTrue(contract.containsKey("NAME"));
        assertTrue(contract.containsKey("PORT"));
        assertEquals("StringType", contract.get("NAME").get("type"));
        assertEquals(3000, contract.get("PORT").get("default"));
    }

    @Test
    public void testGetVariables() {
        schema.define("VAR1", Types.string());
        schema.define("VAR2", Types.integer());

        Map<String, BaseType> vars = schema.getVariables();
        assertEquals(2, vars.size());
        assertTrue(vars.containsKey("VAR1"));
        assertTrue(vars.containsKey("VAR2"));
    }
}
