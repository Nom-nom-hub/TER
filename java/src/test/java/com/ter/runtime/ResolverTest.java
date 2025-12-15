package com.ter.runtime;

import com.ter.core.*;
import org.junit.Test;
import org.junit.Before;
import static org.junit.Assert.*;
import java.util.Map;

public class ResolverTest {
    private Schema schema;

    @Before
    public void setUp() {
        schema = new Schema();
        schema.define("VAR1", Types.string().markRequired());
        schema.define("VAR2", Types.integer().setDefault(100));
    }

    @Test
    public void testAddProcessEnv() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("VAR1", "value"));
        Resolver.ResolutionResult result = resolver.resolve();

        assertTrue(result.valid);
        assertEquals("value", result.values.get("VAR1"));
    }

    @Test
    public void testPriority() {
        Resolver resolver = new Resolver(schema);
        resolver.addInjected(Map.of("VAR1", "injected"));
        resolver.addFileEnv(Map.of("VAR1", "file"));
        resolver.addProcessEnv(Map.of("VAR1", "process"));

        Resolver.ResolutionResult result = resolver.resolve();
        assertEquals("process", result.values.get("VAR1"));
    }

    @Test
    public void testDefault() {
        Resolver resolver = new Resolver(schema);
        resolver.addProcessEnv(Map.of("VAR1", "value1"));
        Resolver.ResolutionResult result = resolver.resolve();

        assertEquals(100, result.values.get("VAR2"));
    }

    @Test
    public void testMetadata() {
        Resolver resolver = new Resolver(schema);
        resolver.addFileEnv(Map.of("VAR1", "file_value"));
        resolver.addProcessEnv(Map.of("VAR2", 200));

        Resolver.ResolutionResult result = resolver.resolve();
        assertEquals("file", result.metadata.get("VAR1").source);
        assertEquals("process", result.metadata.get("VAR2").source);
    }

    @Test
    public void testChaining() {
        Resolver resolver = new Resolver(schema);
        Resolver.ResolutionResult result = resolver
            .addProcessEnv(Map.of("VAR1", "value"))
            .addFileEnv(Map.of("VAR2", 150))
            .resolve();

        assertTrue(result.valid);
        assertEquals("value", result.values.get("VAR1"));
        assertEquals(150, result.values.get("VAR2"));
    }
}
