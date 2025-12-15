/**
 * CI/CD Integration Tests
 */

import {
  detectCI,
  GitHubActionsHelper,
  GitLabCIHelper,
  JenkinsHelper,
  CircleCIHelper,
  AzurePipelinesHelper,
  CIReporter,
  CIDetectionResult,
} from "../src/integrations/ci-cd";

describe("CI Detection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("should detect GitHub Actions environment", () => {
    process.env.GITHUB_ACTIONS = "true";
    process.env.GITHUB_JOB = "build";
    process.env.GITHUB_RUN_NUMBER = "42";
    process.env.GITHUB_REF_NAME = "main";
    process.env.GITHUB_SHA = "abc123";
    process.env.GITHUB_ACTOR = "user";

    const result = detectCI();

    expect(result.platform).toBe("github");
    expect(result.isCI).toBe(true);
    expect(result.jobId).toBe("build");
    expect(result.buildNumber).toBe("42");
    expect(result.branch).toBe("main");
    expect(result.commit).toBe("abc123");
    expect(result.triggeredBy).toBe("user");
  });

  test("should detect GitLab CI environment", () => {
    delete process.env.GITHUB_ACTIONS;
    process.env.GITLAB_CI = "true";
    process.env.CI_JOB_ID = "123";
    process.env.CI_PIPELINE_ID = "456";
    process.env.CI_COMMIT_BRANCH = "develop";
    process.env.CI_COMMIT_SHA = "def456";
    process.env.GITLAB_USER_LOGIN = "admin";

    const result = detectCI();

    expect(result.platform).toBe("gitlab");
    expect(result.isCI).toBe(true);
    expect(result.jobId).toBe("123");
    expect(result.buildNumber).toBe("456");
    expect(result.branch).toBe("develop");
    expect(result.commit).toBe("def456");
  });

  test("should detect Jenkins environment", () => {
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    process.env.JENKINS_HOME = "/var/jenkins";
    process.env.BUILD_ID = "987";
    process.env.BUILD_NUMBER = "42";
    process.env.GIT_BRANCH = "feature/test";
    process.env.GIT_COMMIT = "ghi789";

    const result = detectCI();

    expect(result.platform).toBe("jenkins");
    expect(result.isCI).toBe(true);
    expect(result.jobId).toBe("987");
    expect(result.buildNumber).toBe("42");
    expect(result.branch).toBe("feature/test");
    expect(result.commit).toBe("ghi789");
  });

  test("should detect CircleCI environment", () => {
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_HOME;
    process.env.CIRCLECI = "true";
    process.env.CIRCLE_WORKFLOW_ID = "workflow123";
    process.env.CIRCLE_BUILD_NUM = "99";
    process.env.CIRCLE_BRANCH = "staging";
    process.env.CIRCLE_SHA1 = "jkl012";

    const result = detectCI();

    expect(result.platform).toBe("circleci");
    expect(result.isCI).toBe(true);
    expect(result.jobId).toBe("workflow123");
    expect(result.buildNumber).toBe("99");
    expect(result.branch).toBe("staging");
    expect(result.commit).toBe("jkl012");
  });

  test("should detect Azure Pipelines environment", () => {
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_HOME;
    delete process.env.CIRCLECI;
    process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = "https://dev.azure.com/org";
    process.env.SYSTEM_JOBID = "job123";
    process.env.BUILD_BUILDNUMBER = "20";
    process.env.BUILD_SOURCEBRANCH = "refs/heads/develop";
    process.env.BUILD_SOURCEVERSION = "mno345";

    const result = detectCI();

    expect(result.platform).toBe("azure");
    expect(result.isCI).toBe(true);
    expect(result.jobId).toBe("job123");
    expect(result.buildNumber).toBe("20");
  });

  test("should detect non-CI environment", () => {
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.JENKINS_HOME;
    delete process.env.CIRCLECI;
    delete process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI;

    const result = detectCI();

    expect(result.platform).toBeNull();
    expect(result.isCI).toBe(false);
  });
});

describe("GitHubActionsHelper", () => {
  const originalEnv = process.env;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  test("should format output command", () => {
    process.env.GITHUB_OUTPUT = undefined;
    GitHubActionsHelper.setOutput("test", "value");
    expect(consoleSpy).toHaveBeenCalledWith("::set-output name=test::value");
  });

  test("should format warning command", () => {
    GitHubActionsHelper.warning("This is a warning");
    expect(consoleSpy).toHaveBeenCalledWith("::warning::This is a warning");
  });

  test("should format error command", () => {
    GitHubActionsHelper.error("This is an error");
    expect(consoleSpy).toHaveBeenCalledWith("::error::This is an error");
  });

  test("should format notice command", () => {
    GitHubActionsHelper.notice("This is a notice");
    expect(consoleSpy).toHaveBeenCalledWith("::notice::This is a notice");
  });

  test("should format annotation with file location", () => {
    GitHubActionsHelper.annotation("error", "Invalid value", {
      file: "config.ts",
      line: 42,
      title: "Config Error",
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "::error title=Config Error,file=config.ts,line=42::Invalid value"
    );
  });
});

describe("GitLabCIHelper", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("should format metric", () => {
    GitLabCIHelper.addMetric("validation_time_ms", 1250);
    expect(consoleSpy).toHaveBeenCalledWith("Metric: validation_time_ms -> 1250");
  });

  test("should format report", () => {
    GitLabCIHelper.createReport("validation", "report.json", "junit");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Report: validation -> report.json (junit)"
    );
  });

  test("should document variable setting", () => {
    GitLabCIHelper.setVariable("CUSTOM_VAR", "custom_value", true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Variable: CUSTOM_VAR=custom_value (masked)"
    );
  });
});

describe("JenkinsHelper", () => {
  let consoleSpy: jest.SpyInstance;
  let fsWriteSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    fsWriteSpy = jest.spyOn(require("fs"), "writeFileSync").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    fsWriteSpy.mockRestore();
  });

  test("should mark build as unstable", () => {
    process.env.JENKINS_RESULT_FILE = ".jenkins-result";
    JenkinsHelper.markUnstable();
    expect(fsWriteSpy).toHaveBeenCalledWith(".jenkins-result", "UNSTABLE");
  });

  test("should mark build as failed", () => {
    process.env.JENKINS_RESULT_FILE = ".jenkins-result";
    JenkinsHelper.markFailed();
    expect(fsWriteSpy).toHaveBeenCalledWith(".jenkins-result", "FAILURE");
  });

  test("should publish report", () => {
    JenkinsHelper.publishReport("dist/report.html", "Test Report");
    expect(consoleSpy).toHaveBeenCalledWith(
      "Publish report: Test Report from dist/report.html"
    );
  });
});

describe("CircleCIHelper", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("should format store artifact", () => {
    CircleCIHelper.storeArtifact("dist/coverage", "/coverage");
    expect(consoleSpy).toHaveBeenCalledWith("Store artifact: dist/coverage -> /coverage");
  });

  test("should format store test results", () => {
    CircleCIHelper.storeTestResults("test-results.xml");
    expect(consoleSpy).toHaveBeenCalledWith("Store test results: test-results.xml");
  });

  test("should format store coverage", () => {
    CircleCIHelper.storeCoverage("coverage/lcov.info");
    expect(consoleSpy).toHaveBeenCalledWith("Store coverage: coverage/lcov.info");
  });
});

describe("AzurePipelinesHelper", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("should format set variable", () => {
    AzurePipelinesHelper.setVariable("CONFIG", "production");
    expect(consoleSpy).toHaveBeenCalledWith(
      "##vso[task.setvariable variable=CONFIG]production"
    );
  });

  test("should format output variable", () => {
    AzurePipelinesHelper.setVariable("RESULT", "success", true);
    expect(consoleSpy).toHaveBeenCalledWith(
      "##vso[task.setvariable variable=RESULT;isOutput=true]success"
    );
  });

  test("should format log issue", () => {
    AzurePipelinesHelper.logIssue("error", "Validation failed");
    expect(consoleSpy).toHaveBeenCalledWith("##vso[task.logissue type=error]Validation failed");
  });
});

describe("CIReporter", () => {
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  test("should report error on unknown platform", () => {
    const reporter = new CIReporter(undefined);
    reporter.reportError("Test error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("ERROR: Test error");
  });

  test("should report warning on unknown platform", () => {
    const reporter = new CIReporter(undefined);
    reporter.reportWarning("Test warning");
    expect(consoleWarnSpy).toHaveBeenCalledWith("WARNING: Test warning");
  });

  test("should report success on unknown platform", () => {
    const reporter = new CIReporter(undefined);
    reporter.reportSuccess("Test success");
    expect(consoleSpy).toHaveBeenCalledWith("SUCCESS: Test success");
  });

  test("should report validation results - success", () => {
    const reporter = new CIReporter(undefined);
    reporter.reportValidationResults(true, [], []);
    expect(consoleSpy).toHaveBeenCalledWith("SUCCESS: All environment validations passed");
  });

  test("should report validation results - failure", () => {
    const reporter = new CIReporter(undefined);
    reporter.reportValidationResults(
      false,
      ["Missing DB_HOST", "Invalid PORT"],
      ["Using default timeout"]
    );
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  test("should report using GitHub Actions when detected", () => {
    const reporter = new CIReporter("github");
    reporter.reportError("GitHub error");
    expect(consoleSpy).toHaveBeenCalledWith("::error::GitHub error");
  });

  test("should report using GitLab CI when detected", () => {
    const reporter = new CIReporter("gitlab");
    reporter.reportError("GitLab error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("GitLab error");
  });

  test("should report using Jenkins when detected", () => {
    const reporter = new CIReporter("jenkins");
    reporter.reportError("Jenkins error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] Jenkins error");
  });

  test("should report using Azure Pipelines when detected", () => {
    const reporter = new CIReporter("azure");
    reporter.reportError("Azure error");
    expect(consoleSpy).toHaveBeenCalledWith("##vso[task.logissue type=error]Azure error");
  });
});
