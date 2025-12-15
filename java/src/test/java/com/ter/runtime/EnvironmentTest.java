package com.ter.runtime;

import com.ter.core.*;
import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;
import java.util.Map;

public class EnvironmentTest {
    private Schema schema;

    @Before
    public void setUp() {
        schema = new Schema();
        schema.define("APP_NAME", Types.string().markRequired());
        schema.define("PORT", Types.integer().setDefault(3000));
        schema.define("DEBUG", Types.bool().setDefault(false));
        schema.define("API_KEY", Types.secret());
    }

    @Test
    public void testGet() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("APP_NAME", "TestApp", "PORT", 8080));
        Environment env = new Environment(schema, resolver);

        assertEquals("TestApp", env.get("APP_NAME"));
        assertEquals(8080, env.get("PORT"));
    }

    @Test
    public void testGetOptional() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("APP_NAME", "TestApp", "API_KEY", "secret"));
        Environment env = new Environment(schema, resolver);

        assertEquals("secret", env.getOptional("API_KEY"));
        assertNull(env.getOptional("UNDEFINED"));
    }

    @Test
    public void testTypeGetters() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of(
            "APP_NAME", "TestApp",
            "PORT", 3000,
            "DEBUG", true
        ));
        Environment env = new Environment(schema, resolver);

        assertEquals("TestApp", env.getString("APP_NAME"));
        assertEquals(3000, env.getInt("PORT"));
        assertTrue(env.getBoolean("DEBUG"));
    }

    @Test
    public void testIsSecret() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("APP_NAME", "TestApp", "API_KEY", "secret"));
        Environment env = new Environment(schema, resolver);

        assertTrue(env.isSecret("API_KEY"));
        assertFalse(env.isSecret("APP_NAME"));
    }

    @Test
    public void testToMap() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("APP_NAME", "TestApp", "API_KEY", "secret123"));
        Environment env = new Environment(schema, resolver);

        Map<String, Object> map = env.toMap();
        assertEquals("TestApp", map.get("APP_NAME"));
        assertEquals("[REDACTED]", map.get("API_KEY"));
    }

    @Test
    public void testMetadata() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("APP_NAME", "TestApp"));
        resolver.addFileEnv(Map.of("PORT", 4000));
        Environment env = new Environment(schema, resolver);

        Resolver.ResolutionMetadata nameMeta = env.getMetadata("APP_NAME");
        Resolver.ResolutionMetadata portMeta = env.getMetadata("PORT");

        assertEquals("process", nameMeta.source);
        assertEquals("file", portMeta.source);
    }

    @Test
    public void testSourcePriority() {
        Resolver resolver = new Resolver(schema);
        resolver.addInjected(Map.of("APP_NAME", "InjectedApp"));
        resolver.addFileEnv(Map.of("APP_NAME", "FileApp"));
        resolver.addProcessEnv(Map.of("APP_NAME", "ProcessApp"));
        Environment env = new Environment(schema, resolver);

        assertEquals("ProcessApp", env.get("APP_NAME"));
        assertEquals("process", env.getMetadata("APP_NAME").source);
    }
}
