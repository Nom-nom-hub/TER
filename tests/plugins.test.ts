/**
 * Plugin System Tests
 */

import {
  PluginRegistry,
  PluginMarketplace,
  TERPlugin,
  ValidatorFn,
  getGlobalRegistry,
  resetGlobalRegistry,
  setGlobalRegistry,
} from "../src/core/plugins";
import { StringType } from "../src/core/types";

describe("PluginRegistry", () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    registry = new PluginRegistry();
    resetGlobalRegistry();
  });

  describe("Plugin Registration", () => {
    test("should register a basic plugin", async () => {
      const plugin: TERPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        description: "A test plugin",
      };

      await registry.register(plugin);

      expect(registry.isLoaded("test-plugin")).toBe(true);
      expect(registry.getPlugin("test-plugin")).toEqual(plugin);
    });

    test("should prevent duplicate plugin registration", async () => {
      const plugin: TERPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        description: "A test plugin",
      };

      await registry.register(plugin);

      await expect(registry.register(plugin)).rejects.toThrow(
        'Plugin "test-plugin" already registered'
      );
    });

    test("should call plugin lifecycle hooks", async () => {
      const hooks = {
        onLoad: jest.fn(),
        onEnable: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "lifecycle-plugin",
        version: "1.0.0",
        description: "Test lifecycle",
        hooks,
        settings: { enabled: true },
      };

      await registry.register(plugin);

      expect(hooks.onLoad).toHaveBeenCalled();
      expect(hooks.onEnable).toHaveBeenCalled();
    });

    test("should not call onEnable if plugin disabled", async () => {
      const hooks = {
        onLoad: jest.fn(),
        onEnable: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "disabled-plugin",
        version: "1.0.0",
        description: "Test disabled",
        hooks,
        settings: { enabled: false },
      };

      await registry.register(plugin);

      expect(hooks.onLoad).toHaveBeenCalled();
      expect(hooks.onEnable).not.toHaveBeenCalled();
    });
  });

  describe("Plugin Unregistration", () => {
    test("should unregister a plugin", async () => {
      const plugin: TERPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        description: "A test plugin",
      };

      await registry.register(plugin);
      expect(registry.isLoaded("test-plugin")).toBe(true);

      await registry.unregister("test-plugin");
      expect(registry.isLoaded("test-plugin")).toBe(false);
    });

    test("should call unload hooks on unregister", async () => {
      const hooks = {
        onUnload: jest.fn(),
        onDisable: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        description: "A test plugin",
        hooks,
      };

      await registry.register(plugin);
      await registry.unregister("test-plugin");

      expect(hooks.onDisable).toHaveBeenCalled();
      expect(hooks.onUnload).toHaveBeenCalled();
    });

    test("should throw on unregistering non-existent plugin", async () => {
      await expect(registry.unregister("non-existent")).rejects.toThrow(
        'Plugin "non-existent" not found'
      );
    });
  });

  describe("Custom Type Registration", () => {
    test("should register custom types", async () => {
      const customType = () => new StringType();

      const plugin: TERPlugin = {
        name: "types-plugin",
        version: "1.0.0",
        description: "Custom types",
        types: {
          customString: customType,
        },
      };

      await registry.register(plugin);

      const retrievedType = registry.getType("types-plugin", "customString");
      expect(retrievedType).toBe(customType);
    });

    test("should list all registered types", async () => {
      const plugin1: TERPlugin = {
        name: "plugin-1",
        version: "1.0.0",
        description: "Plugin 1",
        types: {
          type1: () => new StringType(),
          type2: () => new StringType(),
        },
      };

      const plugin2: TERPlugin = {
        name: "plugin-2",
        version: "1.0.0",
        description: "Plugin 2",
        types: {
          type3: () => new StringType(),
        },
      };

      await registry.register(plugin1);
      await registry.register(plugin2);

      const types = registry.listTypes();

      expect(types["plugin-1"]).toEqual(["type1", "type2"]);
      expect(types["plugin-2"]).toEqual(["type3"]);
    });

    test("should remove types on plugin unregister", async () => {
      const plugin: TERPlugin = {
        name: "types-plugin",
        version: "1.0.0",
        description: "Custom types",
        types: {
          customType: () => new StringType(),
        },
      };

      await registry.register(plugin);
      expect(registry.getType("types-plugin", "customType")).toBeDefined();

      await registry.unregister("types-plugin");
      expect(registry.getType("types-plugin", "customType")).toBeUndefined();
    });
  });

  describe("Custom Validator Registration", () => {
    test("should register custom validators", async () => {
      const validator: ValidatorFn = (value) => typeof value === "string";

      const plugin: TERPlugin = {
        name: "validators-plugin",
        version: "1.0.0",
        description: "Custom validators",
        validators: {
          isString: validator,
        },
      };

      await registry.register(plugin);

      const retrieved = registry.getValidator("validators-plugin", "isString");
      expect(retrieved).toBe(validator);
    });

    test("should list all registered validators", async () => {
      const validator1: ValidatorFn = (value) => true;
      const validator2: ValidatorFn = (value) => true;

      const plugin1: TERPlugin = {
        name: "plugin-1",
        version: "1.0.0",
        description: "Plugin 1",
        validators: {
          validator1: validator1,
          validator2: validator2,
        },
      };

      await registry.register(plugin1);

      const validators = registry.listValidators();
      expect(validators["plugin-1"]).toEqual(["validator1", "validator2"]);
    });

    test("should remove validators on plugin unregister", async () => {
      const plugin: TERPlugin = {
        name: "validators-plugin",
        version: "1.0.0",
        description: "Custom validators",
        validators: {
          customValidator: (value) => true,
        },
      };

      await registry.register(plugin);
      expect(registry.getValidator("validators-plugin", "customValidator")).toBeDefined();

      await registry.unregister("validators-plugin");
      expect(registry.getValidator("validators-plugin", "customValidator")).toBeUndefined();
    });
  });

  describe("Backend Registration", () => {
    test("should register backends", async () => {
      const backend = {
        name: "test-backend",
        description: "Test backend",
        initialize: jest.fn(),
        retrieve: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "backends-plugin",
        version: "1.0.0",
        description: "Custom backends",
        backends: {
          testBackend: backend,
        },
      };

      await registry.register(plugin);

      const retrieved = registry.getBackend("backends-plugin", "testBackend");
      expect(retrieved).toBe(backend);
    });

    test("should list all registered backends", async () => {
      const backend1 = {
        name: "backend-1",
        description: "Backend 1",
        initialize: jest.fn(),
        retrieve: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "backends-plugin",
        version: "1.0.0",
        description: "Custom backends",
        backends: {
          backend1: backend1,
        },
      };

      await registry.register(plugin);

      const backends = registry.listBackends();
      expect(backends["backends-plugin"]).toEqual(["backend1"]);
    });
  });

  describe("Plugin Lifecycle Management", () => {
    test("should enable a plugin", async () => {
      const hooks = {
        onEnable: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        description: "Test",
        hooks,
        settings: { enabled: false },
      };

      await registry.register(plugin);
      expect(hooks.onEnable).not.toHaveBeenCalled();

      await registry.enable("test-plugin");
      expect(hooks.onEnable).toHaveBeenCalled();
      expect(plugin.settings?.enabled).toBe(true);
    });

    test("should disable a plugin", async () => {
      const hooks = {
        onDisable: jest.fn(),
      };

      const plugin: TERPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        description: "Test",
        hooks,
        settings: { enabled: true },
      };

      await registry.register(plugin);
      expect(hooks.onDisable).not.toHaveBeenCalled();

      await registry.disable("test-plugin");
      expect(hooks.onDisable).toHaveBeenCalled();
      expect(plugin.settings?.enabled).toBe(false);
    });

    test("should get plugin load order", async () => {
      const plugin1: TERPlugin = {
        name: "plugin-1",
        version: "1.0.0",
        description: "Plugin 1",
      };

      const plugin2: TERPlugin = {
        name: "plugin-2",
        version: "1.0.0",
        description: "Plugin 2",
      };

      await registry.register(plugin1);
      await registry.register(plugin2);

      expect(registry.getLoadOrder()).toEqual(["plugin-1", "plugin-2"]);
    });

    test("should clear all plugins", async () => {
      const plugin1: TERPlugin = {
        name: "plugin-1",
        version: "1.0.0",
        description: "Plugin 1",
      };

      const plugin2: TERPlugin = {
        name: "plugin-2",
        version: "1.0.0",
        description: "Plugin 2",
      };

      await registry.register(plugin1);
      await registry.register(plugin2);

      expect(registry.getLoadOrder().length).toBe(2);

      await registry.clear();
      expect(registry.getLoadOrder().length).toBe(0);
    });
  });

  describe("Global Registry", () => {
    test("should provide singleton global registry", async () => {
      const plugin: TERPlugin = {
        name: "global-plugin",
        version: "1.0.0",
        description: "Test",
      };

      const globalReg = getGlobalRegistry();
      await globalReg.register(plugin);

      const sameReg = getGlobalRegistry();
      expect(sameReg.isLoaded("global-plugin")).toBe(true);
    });

    test("should allow setting custom global registry", async () => {
      const customRegistry = new PluginRegistry();
      setGlobalRegistry(customRegistry);

      const plugin: TERPlugin = {
        name: "custom-plugin",
        version: "1.0.0",
        description: "Test",
      };

      await customRegistry.register(plugin);

      const globalReg = getGlobalRegistry();
      expect(globalReg.isLoaded("custom-plugin")).toBe(true);
    });
  });
});

describe("PluginMarketplace", () => {
  let marketplace: PluginMarketplace;

  beforeEach(() => {
    marketplace = new PluginMarketplace();

    // Add sample plugins
    marketplace.addPlugin({
      id: "auth-plugin",
      name: "Authentication Plugin",
      version: "1.2.0",
      author: "TER Team",
      description: "Advanced authentication and OAuth support",
      downloads: 5000,
      rating: 4.8,
      verified: true,
      tags: ["auth", "oauth", "security"],
      compatible: ["1.0.0", "1.1.0", "1.2.0"],
      lastUpdate: "2025-12-10",
      repository: "github.com/ter/auth-plugin",
      license: "MIT",
    });

    marketplace.addPlugin({
      id: "db-plugin",
      name: "Database Plugin",
      version: "2.0.0",
      author: "DB Inc",
      description: "Database connection pooling and queries",
      downloads: 3200,
      rating: 4.5,
      verified: true,
      tags: ["database", "sql", "performance"],
      compatible: ["1.0.0", "1.1.0", "1.2.0"],
      lastUpdate: "2025-12-08",
      license: "MIT",
    });

    marketplace.addPlugin({
      id: "monitoring-plugin",
      name: "Monitoring Plugin",
      version: "1.0.0",
      author: "TER Team",
      description: "Application monitoring and metrics",
      downloads: 1500,
      rating: 4.2,
      verified: true,
      tags: ["monitoring", "metrics", "observability"],
      compatible: ["1.0.0", "1.1.0", "1.2.0"],
      lastUpdate: "2025-12-05",
      license: "Apache-2.0",
    });

    marketplace.addPlugin({
      id: "logging-plugin",
      name: "Logging Plugin",
      version: "1.5.0",
      author: "Log Inc",
      description: "Structured logging with multiple backends",
      downloads: 2000,
      rating: 3.9,
      verified: false,
      tags: ["logging", "debug"],
      compatible: ["1.0.0", "1.1.0"],
      lastUpdate: "2025-11-20",
    });
  });

  describe("Search", () => {
    test("should search plugins by name", () => {
      const results = marketplace.search("authentication");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain("Authentication");
    });

    test("should search plugins by description", () => {
      const results = marketplace.search("database");
      expect(results.length).toBeGreaterThan(0);
    });

    test("should filter by tags", () => {
      const results = marketplace.search("plugin", {
        tags: ["auth"],
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].tags).toContain("auth");
    });

    test("should filter by author", () => {
      const results = marketplace.search("plugin", {
        author: "TER Team",
      });
      expect(results.every((p) => p.author === "TER Team")).toBe(true);
    });

    test("should combine filters", () => {
      const results = marketplace.search("plugin", {
        tags: ["monitoring"],
        author: "TER Team",
      });
      expect(results.length).toBeGreaterThan(0);
    });

    test("should sort by rating", () => {
      const results = marketplace.search("plugin");
      const ratings = results.map((p) => p.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });
  });

  describe("Get Plugin", () => {
    test("should get plugin by ID", () => {
      const plugin = marketplace.getPlugin("auth-plugin");
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe("Authentication Plugin");
    });

    test("should return undefined for non-existent plugin", () => {
      const plugin = marketplace.getPlugin("non-existent");
      expect(plugin).toBeUndefined();
    });
  });

  describe("Trending", () => {
    test("should get trending plugins sorted by downloads", () => {
      const trending = marketplace.getTrending(2);
      expect(trending.length).toBe(2);
      expect(trending[0].downloads).toBeGreaterThanOrEqual(trending[1].downloads);
    });

    test("should respect limit", () => {
      const trending = marketplace.getTrending(1);
      expect(trending.length).toBe(1);
    });
  });

  describe("Featured", () => {
    test("should get featured verified plugins with high rating", () => {
      const featured = marketplace.getFeatured();
      expect(featured.every((p) => p.verified && p.rating >= 4.5)).toBe(true);
    });

    test("should sort featured by rating", () => {
      const featured = marketplace.getFeatured();
      const ratings = featured.map((p) => p.rating);
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });
  });
});
