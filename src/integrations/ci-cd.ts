/**
 * CI/CD Integration Support
 * Integrations for GitHub Actions, GitLab CI, Jenkins, CircleCI
 */

import * as fs from "fs";
import * as path from "path";

/** CI/CD Platform type */
export type CIPlatform = "github" | "gitlab" | "jenkins" | "circleci" | "azure";

/** CI/CD Detection result */
export interface CIDetectionResult {
  platform: CIPlatform | null;
  isCI: boolean;
  jobId?: string;
  buildNumber?: string;
  branch?: string;
  commit?: string;
  triggeredBy?: string;
}

/** CI/CD Configuration for validation */
export interface CIConfig {
  platform: CIPlatform;
  contractPath: string;
  envPaths: string[];
  failOnWarnings?: boolean;
  failOnMissing?: boolean;
  allowSecrets?: boolean;
  reportPath?: string;
}

/**
 * Detect the current CI/CD environment
 */
export function detectCI(): CIDetectionResult {
  const env = process.env;

  // GitHub Actions
  if (env.GITHUB_ACTIONS === "true") {
    return {
      platform: "github",
      isCI: true,
      jobId: env.GITHUB_JOB,
      buildNumber: env.GITHUB_RUN_NUMBER,
      branch: env.GITHUB_REF_NAME,
      commit: env.GITHUB_SHA,
      triggeredBy: env.GITHUB_ACTOR,
    };
  }

  // GitLab CI
  if (env.GITLAB_CI === "true") {
    return {
      platform: "gitlab",
      isCI: true,
      jobId: env.CI_JOB_ID,
      buildNumber: env.CI_PIPELINE_ID,
      branch: env.CI_COMMIT_BRANCH,
      commit: env.CI_COMMIT_SHA,
      triggeredBy: env.GITLAB_USER_LOGIN,
    };
  }

  // Jenkins
  if (env.JENKINS_HOME) {
    return {
      platform: "jenkins",
      isCI: true,
      jobId: env.BUILD_ID,
      buildNumber: env.BUILD_NUMBER,
      branch: env.GIT_BRANCH,
      commit: env.GIT_COMMIT,
    };
  }

  // CircleCI
  if (env.CIRCLECI === "true") {
    return {
      platform: "circleci",
      isCI: true,
      jobId: env.CIRCLE_WORKFLOW_ID,
      buildNumber: env.CIRCLE_BUILD_NUM,
      branch: env.CIRCLE_BRANCH,
      commit: env.CIRCLE_SHA1,
    };
  }

  // Azure Pipelines
  if (env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI) {
    return {
      platform: "azure",
      isCI: true,
      jobId: env.SYSTEM_JOBID,
      buildNumber: env.BUILD_BUILDNUMBER,
      branch: env.BUILD_SOURCEBRANCH,
      commit: env.BUILD_SOURCEVERSION,
    };
  }

  return {
    platform: null,
    isCI: false,
  };
}

/**
 * GitHub Actions specific utilities
 */
export class GitHubActionsHelper {
  /**
   * Set an output variable
   */
  static setOutput(name: string, value: string): void {
    const output = process.env.GITHUB_OUTPUT;
    if (output) {
      fs.appendFileSync(output, `${name}=${value}\n`);
    } else {
      console.log(`::set-output name=${name}::${value}`);
    }
  }

  /**
   * Set an environment variable for subsequent steps
   */
  static setEnv(name: string, value: string): void {
    const envFile = process.env.GITHUB_ENV;
    if (envFile) {
      fs.appendFileSync(envFile, `${name}=${value}\n`);
    }
  }

  /**
   * Add a notice message
   */
  static notice(message: string, title?: string): void {
    if (title) {
      console.log(`::notice title=${title}::${message}`);
    } else {
      console.log(`::notice::${message}`);
    }
  }

  /**
   * Add a warning
   */
  static warning(message: string, title?: string): void {
    if (title) {
      console.log(`::warning title=${title}::${message}`);
    } else {
      console.log(`::warning::${message}`);
    }
  }

  /**
   * Add an error
   */
  static error(message: string, title?: string): void {
    if (title) {
      console.log(`::error title=${title}::${message}`);
    } else {
      console.log(`::error::${message}`);
    }
  }

  /**
   * Create an annotation
   */
  static annotation(
    level: "notice" | "warning" | "error",
    message: string,
    options?: {
      file?: string;
      line?: number;
      endLine?: number;
      col?: number;
      endColumn?: number;
      title?: string;
    }
  ): void {
    const parts: string[] = [];

    if (options?.title) {
      parts.push(`title=${options.title}`);
    }
    if (options?.file) {
      parts.push(`file=${options.file}`);
    }
    if (options?.line !== undefined) {
      parts.push(`line=${options.line}`);
    }
    if (options?.endLine !== undefined) {
      parts.push(`endLine=${options.endLine}`);
    }
    if (options?.col !== undefined) {
      parts.push(`col=${options.col}`);
    }
    if (options?.endColumn !== undefined) {
      parts.push(`endColumn=${options.endColumn}`);
    }

    const prefix = parts.length > 0 ? ` ${parts.join(",")}` : "";
    console.log(`::${level}${prefix}::${message}`);
  }

  /**
   * Create a summary section
   */
  static addSummary(title: string, content: string): void {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
      const markdown = `## ${title}\n\n${content}\n\n`;
      fs.appendFileSync(summaryFile, markdown);
    }
  }

  /**
   * Add a summary table
   */
  static addSummaryTable(title: string, headers: string[], rows: string[][]): void {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (summaryFile) {
      let markdown = `## ${title}\n\n`;
      markdown += `| ${headers.join(" | ")} |\n`;
      markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;
      for (const row of rows) {
        markdown += `| ${row.join(" | ")} |\n`;
      }
      markdown += "\n";
      fs.appendFileSync(summaryFile, markdown);
    }
  }
}

/**
 * GitLab CI specific utilities
 */
export class GitLabCIHelper {
  /**
   * Set a job artifact
   */
  static registerArtifact(path: string, format?: string): void {
    const artifactFile = process.env.CI_ARTIFACTS_FILE;
    if (artifactFile) {
      const artifact = { path, format: format || "gzip" };
      fs.appendFileSync(artifactFile, JSON.stringify(artifact) + "\n");
    }
  }

  /**
   * Add a metric to job metrics
   */
  static addMetric(name: string, value: number | string): void {
    const metricsFile = process.env.CI_METRICS_FILE;
    if (metricsFile) {
      fs.appendFileSync(metricsFile, `${name}=${value}\n`);
    } else {
      console.log(`Metric: ${name} -> ${value}`);
    }
  }

  /**
   * Create a job report
   */
  static createReport(name: string, filePath: string, format: string): void {
    // In GitLab CI, reports are defined in .gitlab-ci.yml
    // This helper documents the pattern
    console.log(`Report: ${name} -> ${filePath} (${format})`);
  }

  /**
   * Add a variable to the job
   */
  static setVariable(name: string, value: string, masked?: boolean): void {
    // GitLab provides variables through .gitlab-ci.yml
    // This documents the variable setting pattern
    const suffix = masked ? " (masked)" : "";
    console.log(`Variable: ${name}=${value}${suffix}`);
  }
}

/**
 * Jenkins specific utilities
 */
export class JenkinsHelper {
  /**
   * Set a build parameter
   */
  static setBuildParameter(name: string, value: string): void {
    const paramsFile = process.env.JENKINS_PARAMS_FILE || ".jenkins-params";
    fs.appendFileSync(paramsFile, `${name}=${value}\n`);
  }

  /**
   * Mark build as unstable
   */
  static markUnstable(): void {
    const resultFile = process.env.JENKINS_RESULT_FILE;
    if (resultFile) {
      fs.writeFileSync(resultFile, "UNSTABLE");
    }
  }

  /**
   * Mark build as failed
   */
  static markFailed(): void {
    const resultFile = process.env.JENKINS_RESULT_FILE;
    if (resultFile) {
      fs.writeFileSync(resultFile, "FAILURE");
    }
  }

  /**
   * Publish HTML report
   */
  static publishReport(reportPath: string, reportName: string): void {
    console.log(`Publish report: ${reportName} from ${reportPath}`);
  }
}

/**
 * CircleCI specific utilities
 */
export class CircleCIHelper {
  /**
   * Set an environment variable for subsequent steps
   */
  static setEnv(name: string, value: string): void {
    const bashEnvFile = process.env.BASH_ENV;
    if (bashEnvFile) {
      fs.appendFileSync(bashEnvFile, `export ${name}="${value}"\n`);
    }
  }

  /**
   * Add an artifact
   */
  static storeArtifact(sourcePath: string, destinationPath: string): void {
    // In CircleCI, artifacts are configured in config.yml
    console.log(`Store artifact: ${sourcePath} -> ${destinationPath}`);
  }

  /**
   * Store test results
   */
  static storeTestResults(resultsPath: string): void {
    console.log(`Store test results: ${resultsPath}`);
  }

  /**
   * Store coverage
   */
  static storeCoverage(coveragePath: string): void {
    console.log(`Store coverage: ${coveragePath}`);
  }
}

/**
 * Azure Pipelines specific utilities
 */
export class AzurePipelinesHelper {
  /**
   * Set a pipeline variable
   */
  static setVariable(name: string, value: string, isOutput?: boolean): void {
    if (isOutput) {
      console.log(`##vso[task.setvariable variable=${name};isOutput=true]${value}`);
    } else {
      console.log(`##vso[task.setvariable variable=${name}]${value}`);
    }
  }

  /**
   * Log an issue
   */
  static logIssue(type: "error" | "warning", message: string): void {
    console.log(`##vso[task.logissue type=${type}]${message}`);
  }

  /**
   * Add a task summary section
   */
  static addSummary(title: string, content: string): void {
    console.log(`##vso[task.addattachment type=Distributedtask.Core.Summary;name=${title}]${content}`);
  }

  /**
   * Upload attachment
   */
  static uploadAttachment(filePath: string, attachmentType: string, name: string): void {
    console.log(`##vso[task.addattachment type=${attachmentType};name=${name}]${filePath}`);
  }
}

/**
 * Universal CI/CD reporter
 */
export class CIReporter {
  private platform: CIPlatform | null;

  constructor(platform?: CIPlatform) {
    this.platform = platform || detectCI().platform;
  }

  /**
   * Report an error
   */
  reportError(message: string, context?: { file?: string; line?: number }): void {
    if (!this.platform) {
      console.error(`ERROR: ${message}`);
      return;
    }

    switch (this.platform) {
      case "github":
        GitHubActionsHelper.error(message);
        break;
      case "gitlab":
        console.error(message);
        break;
      case "jenkins":
        console.error(`[ERROR] ${message}`);
        break;
      case "circleci":
        console.error(message);
        break;
      case "azure":
        AzurePipelinesHelper.logIssue("error", message);
        break;
    }
  }

  /**
   * Report a warning
   */
  reportWarning(message: string): void {
    if (!this.platform) {
      console.warn(`WARNING: ${message}`);
      return;
    }

    switch (this.platform) {
      case "github":
        GitHubActionsHelper.warning(message);
        break;
      case "gitlab":
        console.warn(message);
        break;
      case "jenkins":
        console.warn(`[WARN] ${message}`);
        break;
      case "circleci":
        console.warn(message);
        break;
      case "azure":
        AzurePipelinesHelper.logIssue("warning", message);
        break;
    }
  }

  /**
   * Report success
   */
  reportSuccess(message: string): void {
    if (!this.platform) {
      console.log(`SUCCESS: ${message}`);
      return;
    }

    switch (this.platform) {
      case "github":
        GitHubActionsHelper.notice(message);
        break;
      case "gitlab":
        console.log(`✓ ${message}`);
        break;
      case "jenkins":
        console.log(`[SUCCESS] ${message}`);
        break;
      case "circleci":
        console.log(`✓ ${message}`);
        break;
      case "azure":
        console.log(`✓ ${message}`);
        break;
    }
  }

  /**
   * Report validation results
   */
  reportValidationResults(
    isValid: boolean,
    errors: string[],
    warnings: string[]
  ): void {
    if (isValid) {
      this.reportSuccess("All environment validations passed");
    } else {
      for (const error of errors) {
        this.reportError(error);
      }
      for (const warning of warnings) {
        this.reportWarning(warning);
      }
    }
  }
}
