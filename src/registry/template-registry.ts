/**
 * Community Template Registry
 * Manages templates contributed by the community
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/** Template metadata */
export interface TemplateMetadata {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  tags: string[];
  category: string;
  downloads: number;
  rating: number;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  repository?: string;
  license?: string;
  terVersion?: string; // Compatible TER version
  thumbnail?: string;
}

/** Template content */
export interface Template {
  metadata: TemplateMetadata;
  contract: Record<string, any>; // .ter.json contract
  examples?: Record<string, any>; // Example .env files
  documentation?: string; // Markdown docs
  guidelines?: string; // Usage guidelines
}

/** Template review */
export interface TemplateReview {
  id: string;
  templateId: string;
  author: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
}

/** Template submission for review */
export interface TemplateSubmission {
  id: string;
  name: string;
  author: string;
  email: string;
  description: string;
  contract: Record<string, any>;
  examples: Record<string, any>;
  documentation: string;
  license: string;
  repository?: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

/**
 * Community Template Registry
 */
export class TemplateRegistry {
  private templates: Map<string, Template> = new Map();
  private reviews: Map<string, TemplateReview[]> = new Map();
  private submissions: Map<string, TemplateSubmission> = new Map();
  private categories: Set<string> = new Set();

  /**
   * Register a new template
   */
  registerTemplate(template: Template): void {
    const id = template.metadata.id;

    if (this.templates.has(id)) {
      throw new Error(`Template "${id}" already registered`);
    }

    // Validate template
    this.validateTemplate(template);

    // Add category
    if (template.metadata.category) {
      this.categories.add(template.metadata.category);
    }

    this.templates.set(id, template);
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Search templates
   */
  search(query: string, filters?: {
    category?: string;
    minRating?: number;
    tags?: string[];
    verified?: boolean;
  }): Template[] {
    const results: Template[] = [];

    for (const template of this.templates.values()) {
      const metadata = template.metadata;

      // Check query match
      const matchesQuery =
        metadata.name.toLowerCase().includes(query.toLowerCase()) ||
        metadata.description.toLowerCase().includes(query.toLowerCase());

      if (!matchesQuery) continue;

      // Check category filter
      if (filters?.category && metadata.category !== filters.category) {
        continue;
      }

      // Check rating filter
      if (filters?.minRating && metadata.rating < filters.minRating) {
        continue;
      }

      // Check tags filter
      if (filters?.tags) {
        const hasAllTags = filters.tags.every((tag) => metadata.tags.includes(tag));
        if (!hasAllTags) continue;
      }

      // Check verified filter
      if (filters?.verified && metadata.verified !== filters.verified) {
        continue;
      }

      results.push(template);
    }

    // Sort by rating
    return results.sort((a, b) => b.metadata.rating - a.metadata.rating);
  }

  /**
   * Get featured templates (high rating, verified)
   */
  getFeatured(limit: number = 10): Template[] {
    return Array.from(this.templates.values())
      .filter((t) => t.metadata.verified && t.metadata.rating >= 4.5)
      .sort((a, b) => b.metadata.rating - a.metadata.rating)
      .slice(0, limit);
  }

  /**
   * Get trending templates (most downloads)
   */
  getTrending(limit: number = 10): Template[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.metadata.downloads - a.metadata.downloads)
      .slice(0, limit);
  }

  /**
   * Get new templates (most recent)
   */
  getNew(limit: number = 10): Template[] {
    return Array.from(this.templates.values())
      .sort((a, b) => {
        const dateA = new Date(a.metadata.createdAt).getTime();
        const dateB = new Date(b.metadata.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * Get templates by category
   */
  getByCategory(category: string): Template[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.metadata.category === category
    );
  }

  /**
   * Get templates by author
   */
  getByAuthor(author: string): Template[] {
    return Array.from(this.templates.values()).filter(
      (t) => t.metadata.author === author
    );
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories).sort();
  }

  /**
   * Increment download count
   */
  recordDownload(templateId: string): void {
    const template = this.templates.get(templateId);
    if (template) {
      template.metadata.downloads++;
    }
  }

  /**
   * Add a review to a template
   */
  addReview(review: TemplateReview): void {
    const templateId = review.templateId;

    // Update template rating
    const template = this.templates.get(templateId);
    if (template) {
      if (!this.reviews.has(templateId)) {
        this.reviews.set(templateId, []);
      }

      this.reviews.get(templateId)!.push(review);

      // Recalculate rating
      const allReviews = this.reviews.get(templateId)!;
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      template.metadata.rating = Math.round(avgRating * 10) / 10;
    }
  }

  /**
   * Get reviews for a template
   */
  getReviews(templateId: string): TemplateReview[] {
    return this.reviews.get(templateId) || [];
  }

  /**
   * Submit a new template for review
   */
  submitTemplate(submission: TemplateSubmission): string {
    const id = submission.id || crypto.randomBytes(16).toString("hex");

    if (this.submissions.has(id)) {
      throw new Error(`Submission "${id}" already exists`);
    }

    submission.id = id;
    submission.status = "pending";
    submission.submittedAt = new Date().toISOString();

    this.submissions.set(id, submission);
    return id;
  }

  /**
   * Get a submission by ID
   */
  getSubmission(id: string): TemplateSubmission | undefined {
    return this.submissions.get(id);
  }

  /**
   * Get pending submissions
   */
  getPendingSubmissions(): TemplateSubmission[] {
    return Array.from(this.submissions.values()).filter(
      (s) => s.status === "pending"
    );
  }

  /**
   * Approve a submission
   */
  approveSubmission(submissionId: string, reviewer: string): void {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission "${submissionId}" not found`);
    }

    // Create template from submission
    const template: Template = {
      metadata: {
        id: submission.id,
        name: submission.name,
        version: "1.0.0",
        author: submission.author,
        description: submission.description,
        tags: [],
        category: "community",
        downloads: 0,
        rating: 5.0,
        verified: false, // Needs verification
        createdAt: submission.submittedAt,
        updatedAt: new Date().toISOString(),
        repository: submission.repository,
        license: submission.license,
      },
      contract: submission.contract,
      examples: submission.examples,
      documentation: submission.documentation,
    };

    // Register the template
    this.registerTemplate(template);

    // Update submission
    submission.status = "approved";
    submission.reviewedAt = new Date().toISOString();
    submission.reviewedBy = reviewer;
  }

  /**
   * Reject a submission
   */
  rejectSubmission(submissionId: string, reviewer: string, notes: string): void {
    const submission = this.submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission "${submissionId}" not found`);
    }

    submission.status = "rejected";
    submission.reviewedAt = new Date().toISOString();
    submission.reviewedBy = reviewer;
    submission.reviewNotes = notes;
  }

  /**
   * Validate a template
   */
  private validateTemplate(template: Template): void {
    const { metadata, contract } = template;

    // Validate metadata
    if (!metadata.id) throw new Error("Template must have an id");
    if (!metadata.name) throw new Error("Template must have a name");
    if (!metadata.version) throw new Error("Template must have a version");
    if (!metadata.author) throw new Error("Template must have an author");
    if (!metadata.description) throw new Error("Template must have a description");

    // Validate contract
    if (typeof contract !== "object") {
      throw new Error("Template contract must be an object");
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalTemplates: number;
    totalDownloads: number;
    categories: number;
    avgRating: number;
    verifiedCount: number;
    submissions: {
      pending: number;
      approved: number;
      rejected: number;
    };
  } {
    const templates = Array.from(this.templates.values());
    const totalDownloads = templates.reduce((sum, t) => sum + t.metadata.downloads, 0);
    const totalRating = templates.reduce((sum, t) => sum + t.metadata.rating, 0);
    const avgRating = templates.length > 0 ? totalRating / templates.length : 0;
    const verifiedCount = templates.filter((t) => t.metadata.verified).length;

    const submissions = Array.from(this.submissions.values());
    const pendingCount = submissions.filter((s) => s.status === "pending").length;
    const approvedCount = submissions.filter((s) => s.status === "approved").length;
    const rejectedCount = submissions.filter((s) => s.status === "rejected").length;

    return {
      totalTemplates: templates.length,
      totalDownloads,
      categories: this.categories.size,
      avgRating: Math.round(avgRating * 10) / 10,
      verifiedCount,
      submissions: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  }
}

/**
 * Template export/import utilities
 */
export class TemplateIO {
  /**
   * Export template to JSON file
   */
  static exportTemplate(template: Template, outputPath: string): void {
    const json = JSON.stringify(template, null, 2);
    fs.writeFileSync(outputPath, json);
  }

  /**
   * Import template from JSON file
   */
  static importTemplate(filePath: string): Template {
    const json = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(json) as Template;
  }

  /**
   * Export registry to JSON file
   */
  static exportRegistry(registry: TemplateRegistry, outputPath: string): void {
    const templates = Array.from(registry["templates"].values());
    const json = JSON.stringify(templates, null, 2);
    fs.writeFileSync(outputPath, json);
  }

  /**
   * Import registry from JSON file
   */
  static importRegistry(filePath: string): Template[] {
    const json = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(json) as Template[];
  }

  /**
   * Export template as tarball (simulated)
   */
  static exportAsPackage(template: Template, outputPath: string): void {
    const metadata = {
      ...template.metadata,
      timestamp: new Date().toISOString(),
    };

    const content = {
      metadata,
      contract: template.contract,
      examples: template.examples,
      documentation: template.documentation,
    };

    const json = JSON.stringify(content, null, 2);
    fs.writeFileSync(outputPath, json);
  }
}

/**
 * Template validation utilities
 */
export class TemplateValidator {
  /**
   * Validate contract structure
   */
  static validateContract(contract: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (typeof contract !== "object") {
      errors.push("Contract must be an object");
      return { valid: false, errors };
    }

    // Check for required fields pattern
    for (const [key, value] of Object.entries(contract)) {
      if (typeof value !== "object") {
        errors.push(`Variable "${key}" must be an object`);
      }

      if (!("type" in value)) {
        errors.push(`Variable "${key}" must have a type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate template examples
   */
  static validateExamples(
    contract: Record<string, any>,
    examples: Record<string, any>
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [exampleName, example] of Object.entries(examples)) {
      if (typeof example !== "object") {
        errors.push(`Example "${exampleName}" must be an object`);
        continue;
      }

      for (const key of Object.keys(contract)) {
        if (!(key in example)) {
          // Variable is missing in example
          if (contract[key].required) {
            errors.push(
              `Example "${exampleName}" missing required variable "${key}"`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate template documentation
   */
  static validateDocumentation(doc: string): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!doc) {
      warnings.push("Template documentation is empty");
      return { valid: true, warnings };
    }

    const docLower = doc.toLowerCase();
    if (!doc.includes("##")) {
      warnings.push("Documentation should include markdown headers");
    }

    if (!docLower.includes("example")) {
      warnings.push("Documentation should include usage examples");
    }

    return { valid: true, warnings };
  }
}
