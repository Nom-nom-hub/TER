/**
 * TER Plugin System
 * Allows extension of TER with custom types, validators, and backends
 */

import { BaseType } from "./types";
import { Schema } from "./schema";

/** Plugin lifecycle hooks */
export interface PluginHooks {
  onLoad?(): Promise<void>;
  onUnload?(): Promise<void>;
  onEnable?(): Promise<void>;
  onDisable?(): Promise<void>;
}

/** Custom type constructor */
export type TypeConstructor = (options?: any) => BaseType;

/** Custom validator function */
export type ValidatorFn = (
  value: any,
  context?: ValidationContext
) => boolean | Promise<boolean> | { valid: boolean; error?: string };

/** Validator context for cross-field validation */
export interface ValidationContext {
  schema?: Schema;
  allValues?: Record<string, any>;
  field?: string;
}

/** Custom backend definition */
export interface BackendDefinition {
  name: string;
  description: string;
  initialize(config: Record<string, any>): Promise<void>;
  retrieve(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  health?(): Promise<boolean>;
}

/** Plugin interface - main entry point */
export interface TERPlugin {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  hooks?: PluginHooks;
  types?: Record<string, TypeConstructor>;
  validators?: Record<string, ValidatorFn>;
  backends?: Record<string, BackendDefinition>;
  settings?: PluginSettings;
}

/** Plugin settings */
export interface PluginSettings {
  enabled: boolean;
  autoLoad?: boolean;
  config?: Record<string, any>;
  priority?: number; // 0 = lowest, 100 = highest
}

/** Plugin metadata from registry */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  downloads: number;
  rating: number;
  verified: boolean;
  tags: string[];
  compatible: string[]; // TER versions
  lastUpdate: string;
  repository?: string;
  license?: string;
}

/**
 * Plugin registry - manages all loaded plugins
 */
export class PluginRegistry {
  private plugins: Map<string, TERPlugin> = new Map();
  private types: Map<string, TypeConstructor> = new Map();
  private validators: Map<string, ValidatorFn> = new Map();
  private backends: Map<string, BackendDefinition> = new Map();
  private loadOrder: string[] = [];

  /**
   * Register a plugin
   */
  async register(plugin: TERPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`);
    }

    // Call onLoad hook
    if (plugin.hooks?.onLoad) {
      await plugin.hooks.onLoad();
    }

    this.plugins.set(plugin.name, plugin);
    this.loadOrder.push(plugin.name);

    // Register custom types
    if (plugin.types) {
      for (const [name, constructor] of Object.entries(plugin.types)) {
        this.registerType(plugin.name, name, constructor);
      }
    }

    // Register custom validators
    if (plugin.validators) {
      for (const [name, validator] of Object.entries(plugin.validators)) {
        this.registerValidator(plugin.name, name, validator);
      }
    }

    // Register backends
    if (plugin.backends) {
      for (const [name, backend] of Object.entries(plugin.backends)) {
        this.registerBackend(plugin.name, name, backend);
      }
    }

    // Call onEnable hook
    if (plugin.settings?.enabled !== false && plugin.hooks?.onEnable) {
      await plugin.hooks.onEnable();
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    // Call onDisable hook
    if (plugin.hooks?.onDisable) {
      await plugin.hooks.onDisable();
    }

    // Call onUnload hook
    if (plugin.hooks?.onUnload) {
      await plugin.hooks.onUnload();
    }

    // Remove types
    if (plugin.types) {
      for (const name of Object.keys(plugin.types)) {
        this.types.delete(`${pluginName}:${name}`);
      }
    }

    // Remove validators
    if (plugin.validators) {
      for (const name of Object.keys(plugin.validators)) {
        this.validators.delete(`${pluginName}:${name}`);
      }
    }

    // Remove backends
    if (plugin.backends) {
      for (const name of Object.keys(plugin.backends)) {
        this.backends.delete(`${pluginName}:${name}`);
      }
    }

    this.plugins.delete(pluginName);
    this.loadOrder = this.loadOrder.filter((n) => n !== pluginName);
  }

  /**
   * Register a custom type
   */
  private registerType(
    pluginName: string,
    typeName: string,
    constructor: TypeConstructor
  ): void {
    const key = `${pluginName}:${typeName}`;
    if (this.types.has(key)) {
      throw new Error(`Type "${key}" already registered`);
    }
    this.types.set(key, constructor);
  }

  /**
   * Get a custom type constructor
   */
  getType(pluginName: string, typeName: string): TypeConstructor | undefined {
    return this.types.get(`${pluginName}:${typeName}`);
  }

  /**
   * List all available types
   */
  listTypes(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const key of this.types.keys()) {
      const [pluginName, typeName] = key.split(":");
      if (!result[pluginName]) {
        result[pluginName] = [];
      }
      result[pluginName].push(typeName);
    }
    return result;
  }

  /**
   * Register a custom validator
   */
  private registerValidator(
    pluginName: string,
    validatorName: string,
    validator: ValidatorFn
  ): void {
    const key = `${pluginName}:${validatorName}`;
    if (this.validators.has(key)) {
      throw new Error(`Validator "${key}" already registered`);
    }
    this.validators.set(key, validator);
  }

  /**
   * Get a custom validator
   */
  getValidator(pluginName: string, validatorName: string): ValidatorFn | undefined {
    return this.validators.get(`${pluginName}:${validatorName}`);
  }

  /**
   * List all available validators
   */
  listValidators(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const key of this.validators.keys()) {
      const [pluginName, validatorName] = key.split(":");
      if (!result[pluginName]) {
        result[pluginName] = [];
      }
      result[pluginName].push(validatorName);
    }
    return result;
  }

  /**
   * Register a backend
   */
  private registerBackend(
    pluginName: string,
    backendName: string,
    backend: BackendDefinition
  ): void {
    const key = `${pluginName}:${backendName}`;
    if (this.backends.has(key)) {
      throw new Error(`Backend "${key}" already registered`);
    }
    this.backends.set(key, backend);
  }

  /**
   * Get a backend
   */
  getBackend(pluginName: string, backendName: string): BackendDefinition | undefined {
    return this.backends.get(`${pluginName}:${backendName}`);
  }

  /**
   * List all available backends
   */
  listBackends(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const key of this.backends.keys()) {
      const [pluginName, backendName] = key.split(":");
      if (!result[pluginName]) {
        result[pluginName] = [];
      }
      result[pluginName].push(backendName);
    }
    return result;
  }

  /**
   * Get all loaded plugins
   */
  getPlugins(): TERPlugin[] {
    return this.loadOrder.map((name) => this.plugins.get(name)!);
  }

  /**
   * Get a specific plugin
   */
  getPlugin(name: string): TERPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if plugin is loaded
   */
  isLoaded(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Enable a plugin
   */
  async enable(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    if (plugin.settings) {
      plugin.settings.enabled = true;
    }

    if (plugin.hooks?.onEnable) {
      await plugin.hooks.onEnable();
    }
  }

  /**
   * Disable a plugin
   */
  async disable(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    if (plugin.settings) {
      plugin.settings.enabled = false;
    }

    if (plugin.hooks?.onDisable) {
      await plugin.hooks.onDisable();
    }
  }

  /**
   * Get plugin load order
   */
  getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  /**
   * Clear all plugins
   */
  async clear(): Promise<void> {
    const pluginNames = [...this.loadOrder];
    for (const name of pluginNames) {
      await this.unregister(name);
    }
  }
}

/** Global plugin registry instance */
let globalRegistry: PluginRegistry | null = null;

/**
 * Get the global plugin registry
 */
export function getGlobalRegistry(): PluginRegistry {
  if (!globalRegistry) {
    globalRegistry = new PluginRegistry();
  }
  return globalRegistry;
}

/**
 * Set the global plugin registry (for testing)
 */
export function setGlobalRegistry(registry: PluginRegistry): void {
  globalRegistry = registry;
}

/**
 * Reset the global plugin registry (for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}

/**
 * Plugin marketplace client (simulated for local development)
 */
export class PluginMarketplace {
  private registry: Map<string, PluginMetadata> = new Map();

  /**
   * Search for plugins in the marketplace
   */
  search(query: string, filters?: { tags?: string[]; author?: string }): PluginMetadata[] {
    const results: PluginMetadata[] = [];

    for (const metadata of this.registry.values()) {
      const matchesQuery =
        metadata.name.toLowerCase().includes(query.toLowerCase()) ||
        metadata.description.toLowerCase().includes(query.toLowerCase());

      const matchesTags =
        !filters?.tags || filters.tags.some((tag) => metadata.tags.includes(tag));

      const matchesAuthor = !filters?.author || metadata.author === filters.author;

      if (matchesQuery && matchesTags && matchesAuthor) {
        results.push(metadata);
      }
    }

    // Sort by rating
    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Get plugin by ID
   */
  getPlugin(id: string): PluginMetadata | undefined {
    return this.registry.get(id);
  }

  /**
   * Add a plugin to the marketplace (simulated)
   */
  addPlugin(metadata: PluginMetadata): void {
    this.registry.set(metadata.id, metadata);
  }

  /**
   * Get trending plugins
   */
  getTrending(limit: number = 10): PluginMetadata[] {
    return Array.from(this.registry.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Get featured plugins
   */
  getFeatured(): PluginMetadata[] {
    return Array.from(this.registry.values())
      .filter((p) => p.verified && p.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating);
  }
}
