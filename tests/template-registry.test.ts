/**
 * Community Template Registry Tests
 */

import {
  TemplateRegistry,
  TemplateIO,
  TemplateValidator,
  Template,
  TemplateMetadata,
  TemplateReview,
  TemplateSubmission,
} from "../src/registry/template-registry";

describe("TemplateRegistry", () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  const createTemplate = (id: string, overrides?: Partial<Template>): Template => ({
    metadata: {
      id,
      name: `Template ${id}`,
      version: "1.0.0",
      author: "Test Author",
      description: "Test template",
      tags: ["test"],
      category: "web",
      downloads: 100,
      rating: 4.5,
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    contract: {
      DATABASE_URL: { type: "string", required: true },
    },
    ...overrides,
  });

  describe("Registration", () => {
    test("should register a template", () => {
      const template = createTemplate("test-1");
      registry.registerTemplate(template);
      expect(registry.getTemplate("test-1")).toEqual(template);
    });

    test("should prevent duplicate registration", () => {
      const template = createTemplate("test-1");
      registry.registerTemplate(template);
      expect(() => registry.registerTemplate(template)).toThrow(
        'Template "test-1" already registered'
      );
    });

    test("should validate template on registration", () => {
      const invalidTemplate = { metadata: { name: "Test" } } as any;
      expect(() => registry.registerTemplate(invalidTemplate)).toThrow();
    });

    test("should add category from template", () => {
      const template = createTemplate("test-1", {
        metadata: createTemplate("test-1").metadata,
      });
      registry.registerTemplate(template);

      const categories = registry.getCategories();
      expect(categories).toContain("web");
    });
  });

  describe("Retrieval", () => {
    test("should get template by ID", () => {
      const template = createTemplate("test-1");
      registry.registerTemplate(template);

      const retrieved = registry.getTemplate("test-1");
      expect(retrieved).toEqual(template);
    });

    test("should return undefined for non-existent template", () => {
      expect(registry.getTemplate("non-existent")).toBeUndefined();
    });

    test("should get templates by category", () => {
      const webTemplate = createTemplate("web-1");
      const apiTemplate = createTemplate("api-1", {
        metadata: {
          ...createTemplate("api-1").metadata,
          category: "api",
        },
      });

      registry.registerTemplate(webTemplate);
      registry.registerTemplate(apiTemplate);

      const webTemplates = registry.getByCategory("web");
      expect(webTemplates.length).toBe(1);
      expect(webTemplates[0].metadata.id).toBe("web-1");
    });

    test("should get templates by author", () => {
      const template1 = createTemplate("t-1");
      const template2 = createTemplate("t-2", {
        metadata: {
          ...createTemplate("t-2").metadata,
          author: "Other Author",
        },
      });

      registry.registerTemplate(template1);
      registry.registerTemplate(template2);

      const authorTemplates = registry.getByAuthor("Test Author");
      expect(authorTemplates.length).toBe(1);
      expect(authorTemplates[0].metadata.author).toBe("Test Author");
    });

    test("should get all categories", () => {
      registry.registerTemplate(createTemplate("t-1"));
      registry.registerTemplate(
        createTemplate("t-2", {
          metadata: {
            ...createTemplate("t-2").metadata,
            category: "api",
          },
        })
      );

      const categories = registry.getCategories();
      expect(categories).toEqual(["api", "web"]);
    });
  });

  describe("Search", () => {
    beforeEach(() => {
      registry.registerTemplate(createTemplate("auth-1", {
        metadata: {
          ...createTemplate("auth-1").metadata,
          name: "Authentication Plugin",
          tags: ["auth", "security"],
          category: "auth",
        },
      }));

      registry.registerTemplate(createTemplate("db-1", {
        metadata: {
          ...createTemplate("db-1").metadata,
          name: "Database Plugin",
          tags: ["database", "sql"],
          category: "database",
          rating: 4.8,
        },
      }));

      registry.registerTemplate(createTemplate("log-1", {
        metadata: {
          ...createTemplate("log-1").metadata,
          name: "Logging Plugin",
          tags: ["logging"],
          category: "logging",
          rating: 3.5,
          verified: false,
        },
      }));
    });

    test("should search by name", () => {
      const results = registry.search("authentication");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].metadata.name).toBe("Authentication Plugin");
    });

    test("should search by description", () => {
      const results = registry.search("test template");
      expect(results.length).toBeGreaterThan(0);
    });

    test("should filter by category", () => {
      const results = registry.search("plugin", { category: "database" });
      expect(results.every((t) => t.metadata.category === "database")).toBe(true);
    });

    test("should filter by minimum rating", () => {
      const results = registry.search("plugin", { minRating: 4.5 });
      expect(results.every((t) => t.metadata.rating >= 4.5)).toBe(true);
    });

    test("should filter by tags", () => {
      const results = registry.search("plugin", { tags: ["auth"] });
      expect(results.every((t) => t.metadata.tags.includes("auth"))).toBe(true);
    });

    test("should filter by verified", () => {
      const results = registry.search("plugin", { verified: true });
      expect(results.every((t) => t.metadata.verified)).toBe(true);
    });

    test("should combine multiple filters", () => {
      const results = registry.search("plugin", {
        category: "auth",
        verified: true,
        tags: ["security"],
      });

      expect(results.every((t) => t.metadata.category === "auth")).toBe(true);
      expect(results.every((t) => t.metadata.verified)).toBe(true);
      expect(results.every((t) => t.metadata.tags.includes("security"))).toBe(true);
    });

    test("should sort results by rating", () => {
      const results = registry.search("plugin");
      const ratings = results.map((t) => t.metadata.rating);

      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    });
  });

  describe("Featured/Trending/New", () => {
    beforeEach(() => {
      registry.registerTemplate(createTemplate("t-1", {
        metadata: {
          ...createTemplate("t-1").metadata,
          verified: true,
          rating: 4.8,
          downloads: 5000,
        },
      }));

      registry.registerTemplate(createTemplate("t-2", {
        metadata: {
          ...createTemplate("t-2").metadata,
          verified: true,
          rating: 4.5,
          downloads: 3000,
        },
      }));

      registry.registerTemplate(createTemplate("t-3", {
        metadata: {
          ...createTemplate("t-3").metadata,
          verified: false,
          rating: 3.5,
          downloads: 1000,
        },
      }));
    });

    test("should get featured templates", () => {
      const featured = registry.getFeatured();
      expect(featured.every((t) => t.metadata.verified && t.metadata.rating >= 4.5)).toBe(
        true
      );
    });

    test("should get trending templates", () => {
      const trending = registry.getTrending(2);
      expect(trending.length).toBe(2);
      expect(trending[0].metadata.downloads).toBeGreaterThanOrEqual(
        trending[1].metadata.downloads
      );
    });

    test("should get new templates", () => {
      const newTemplates = registry.getNew(2);
      expect(newTemplates.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Downloads and Reviews", () => {
    test("should record download", () => {
      const template = createTemplate("t-1");
      registry.registerTemplate(template);

      const initialDownloads = template.metadata.downloads;
      registry.recordDownload("t-1");

      expect(registry.getTemplate("t-1")!.metadata.downloads).toBe(
        initialDownloads + 1
      );
    });

    test("should add and retrieve reviews", () => {
      const template = createTemplate("t-1", {
        metadata: {
          ...createTemplate("t-1").metadata,
          rating: 4.0,
        },
      });
      registry.registerTemplate(template);

      const review: TemplateReview = {
        id: "review-1",
        templateId: "t-1",
        author: "reviewer",
        rating: 5,
        comment: "Great template",
        verified: true,
        createdAt: new Date().toISOString(),
      };

      registry.addReview(review);
      const reviews = registry.getReviews("t-1");

      expect(reviews.length).toBe(1);
      expect(reviews[0]).toEqual(review);
    });

    test("should update rating after review", () => {
      const template = createTemplate("t-1", {
        metadata: {
          ...createTemplate("t-1").metadata,
          rating: 4.0,
        },
      });
      registry.registerTemplate(template);

      const review1: TemplateReview = {
        id: "r-1",
        templateId: "t-1",
        author: "user1",
        rating: 5,
        comment: "Good",
        verified: true,
        createdAt: new Date().toISOString(),
      };

      const review2: TemplateReview = {
        id: "r-2",
        templateId: "t-1",
        author: "user2",
        rating: 3,
        comment: "OK",
        verified: true,
        createdAt: new Date().toISOString(),
      };

      registry.addReview(review1);
      registry.addReview(review2);

      const updatedRating = registry.getTemplate("t-1")!.metadata.rating;
      expect(updatedRating).toBe(4.0); // (5 + 3) / 2
    });
  });

  describe("Submissions", () => {
    test("should submit a template for review", () => {
      const submission: TemplateSubmission = {
        id: "sub-1",
        name: "New Template",
        author: "User",
        email: "user@example.com",
        description: "A new template",
        contract: { VAR: { type: "string" } },
        examples: { default: { VAR: "value" } },
        documentation: "# Documentation",
        license: "MIT",
        status: "pending",
        submittedAt: new Date().toISOString(),
      };

      const id = registry.submitTemplate(submission);
      expect(registry.getSubmission(id)).toBeDefined();
    });

    test("should get pending submissions", () => {
      const sub1 = {
        name: "Template 1",
        author: "User1",
        email: "u1@test.com",
        description: "Template 1",
        contract: {},
        examples: {},
        documentation: "Doc",
        license: "MIT",
        status: "pending" as const,
        submittedAt: new Date().toISOString(),
        id: "sub-1",
      };

      registry.submitTemplate(sub1);

      const pending = registry.getPendingSubmissions();
      expect(pending.length).toBeGreaterThan(0);
    });

    test("should approve a submission", () => {
      const submission: TemplateSubmission = {
        id: "sub-1",
        name: "Approved Template",
        author: "User",
        email: "user@test.com",
        description: "A template",
        contract: { VAR: { type: "string" } },
        examples: { default: { VAR: "test" } },
        documentation: "Docs",
        license: "MIT",
        status: "pending",
        submittedAt: new Date().toISOString(),
      };

      registry.submitTemplate(submission);
      registry.approveSubmission("sub-1", "admin");

      const approved = registry.getSubmission("sub-1");
      expect(approved?.status).toBe("approved");

      const template = registry.getTemplate("sub-1");
      expect(template).toBeDefined();
    });

    test("should reject a submission", () => {
      const submission: TemplateSubmission = {
        id: "sub-1",
        name: "Rejected Template",
        author: "User",
        email: "user@test.com",
        description: "A template",
        contract: {},
        examples: {},
        documentation: "Docs",
        license: "MIT",
        status: "pending",
        submittedAt: new Date().toISOString(),
      };

      registry.submitTemplate(submission);
      registry.rejectSubmission("sub-1", "admin", "Does not meet guidelines");

      const rejected = registry.getSubmission("sub-1");
      expect(rejected?.status).toBe("rejected");
      expect(rejected?.reviewNotes).toBe("Does not meet guidelines");
    });
  });

  describe("Statistics", () => {
    test("should calculate registry statistics", () => {
      registry.registerTemplate(createTemplate("t-1"));
      registry.registerTemplate(
        createTemplate("t-2", {
          metadata: {
            ...createTemplate("t-2").metadata,
            category: "api",
          },
        })
      );

      const stats = registry.getStats();

      expect(stats.totalTemplates).toBe(2);
      expect(stats.categories).toBeGreaterThan(0);
      expect(typeof stats.avgRating).toBe("number");
      expect(stats.verifiedCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("TemplateValidator", () => {
  describe("Contract Validation", () => {
    test("should validate valid contract", () => {
      const contract = {
        DATABASE_URL: { type: "string", required: true },
        PORT: { type: "number", default: 3000 },
      };

      const result = TemplateValidator.validateContract(contract);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("should reject non-object contract", () => {
      const result = TemplateValidator.validateContract("not an object" as any);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should check for type field", () => {
      const contract = {
        VAR: { required: true }, // Missing type
      };

      const result = TemplateValidator.validateContract(contract);
      expect(result.valid).toBe(false);
    });
  });

  describe("Examples Validation", () => {
    test("should validate examples against contract", () => {
      const contract = {
        DATABASE_URL: { type: "string", required: true },
        PORT: { type: "number", required: false },
      };

      const examples = {
        development: {
          DATABASE_URL: "postgres://localhost",
          PORT: 5432,
        },
        production: {
          DATABASE_URL: "postgres://prod.example.com",
        },
      };

      const result = TemplateValidator.validateExamples(contract, examples);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test("should detect missing required variables in examples", () => {
      const contract = {
        DATABASE_URL: { type: "string", required: true },
      };

      const examples = {
        incomplete: {
          // Missing DATABASE_URL
        },
      };

      const result = TemplateValidator.validateExamples(contract, examples);
      expect(result.valid).toBe(false);
    });
  });

  describe("Documentation Validation", () => {
    test("should accept any non-empty documentation", () => {
      const doc = "# My Template\n\nThis is a template.";
      const result = TemplateValidator.validateDocumentation(doc);
      expect(result.valid).toBe(true);
    });

    test("should warn about empty documentation", () => {
      const result = TemplateValidator.validateDocumentation("");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test("should warn about missing headers", () => {
      const doc = "This is documentation without headers.";
      const result = TemplateValidator.validateDocumentation(doc);
      expect(result.warnings.some((w) => w.includes("headers"))).toBe(true);
    });

    test("should warn about missing examples", () => {
      const doc = "# Documentation\n\nNo usage information here.";
      const result = TemplateValidator.validateDocumentation(doc);
      expect(result.warnings.some((w) => w.includes("example"))).toBe(true);
    });
  });
});
