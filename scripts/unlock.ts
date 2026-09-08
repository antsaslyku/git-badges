#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { stdin, stdout } from "node:process";

type Mode = "menu" | "status" | "pull-yolo" | "pair" | "quickdraw";

const MODES: readonly Mode[] = ["menu", "status", "pull-yolo", "pair", "quickdraw"];

function isMode(value: string): value is Mode {
  return (MODES as readonly string[]).includes(value);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function markCwdSafeForGit(): void {
  const cwd = process.cwd().replaceAll("\\", "/");
  if (process.env.GIT_BADGES_SAFE_DIRECTORY === cwd) {
    return;
  }
  const count = Number.parseInt(process.env.GIT_CONFIG_COUNT ?? "0", 10);
  const index = Number.isFinite(count) && count > 0 ? count : 0;
  process.env.GIT_CONFIG_COUNT = String(index + 1);
  process.env[`GIT_CONFIG_KEY_${index}`] = "safe.directory";
  process.env[`GIT_CONFIG_VALUE_${index}`] = cwd;
  process.env.GIT_BADGES_SAFE_DIRECTORY = cwd;
}

function run(command: string, args: string[], options?: { capture?: boolean }): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options?.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });

  if (result.error) {
    fail(`Failed to run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    if (options?.capture && result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  return (result.stdout ?? "").trim();
}

function commandExists(command: string): boolean {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    windowsHide: true,
  });
  return !result.error && result.status === 0;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

function formatStamp(date = new Date()): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const tz = `${sign}${pad(Math.floor(absolute / 60))}${pad(absolute % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${tz}`;
}

function formatSuffix(date = new Date()): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

function applyEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadDotEnv(): void {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  applyEnvFile(resolve(process.cwd(), ".env"));
  applyEnvFile(resolve(scriptDir, "..", ".env"));
}

function githubToken(): string {
  return (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
}

function currentGithubLogin(): string {
  const payload = run("gh", ["api", "user"], { capture: true });
  try {
    const user = JSON.parse(payload) as { login?: string };
    if (user.login) {
      return user.login;
    }
  } catch {
    fail("GitHub returned an unexpected user payload. Check that your token is valid.");
  }
  fail("GitHub authentication succeeded but no login was returned.");
}

function requireGitRepo(): void {
  const result = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.status === 0 && result.stdout.trim() === "true") {
    return;
  }
  const details = (result.stderr ?? result.stdout ?? "").trim();
  if (/dubious ownership/i.test(details)) {
    fail(
      `Git refuses this folder because of dubious ownership.\n${details}\nRun: git config --global --add safe.directory "${process.cwd().replaceAll("\\", "/")}"`,
    );
  }
  fail("This directory is not a git repository. Clone your fork, or run git init and add a GitHub origin remote.");
}

function applyGitIdentity(): void {
  const name = (process.env.GIT_USER_NAME || process.env.GIT_AUTHOR_NAME || "").trim();
  const email = (process.env.GIT_USER_EMAIL || process.env.GIT_AUTHOR_EMAIL || "").trim();
  if (!name || !email) {
    fail("Set GIT_USER_NAME and GIT_USER_EMAIL in .env so Git can create commits.");
  }

  process.env.GIT_AUTHOR_NAME = name;
  process.env.GIT_AUTHOR_EMAIL = email;
  process.env.GIT_COMMITTER_NAME = name;
  process.env.GIT_COMMITTER_EMAIL = email;

  spawnSync("git", ["config", "--local", "user.name", name], {
    stdio: "ignore",
    windowsHide: true,
  });
  spawnSync("git", ["config", "--local", "user.email", email], {
    stdio: "ignore",
    windowsHide: true,
  });
}

function configureGitToUseGh(): void {
  spawnSync("git", ["config", "--local", "--unset-all", "credential.https://github.com.helper"], {
    stdio: "ignore",
    windowsHide: true,
  });
  run("git", ["config", "--local", "--add", "credential.https://github.com.helper", ""]);
  run("git", [
    "config",
    "--local",
    "--add",
    "credential.https://github.com.helper",
    "!gh auth git-credential",
  ]);
}

function originRepo(): string {
  const url = run("git", ["remote", "get-url", "origin"], { capture: true });
  const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  const repo = match?.[1]?.replace(/\.git$/i, "");
  if (!repo) {
    fail("Could not parse GitHub owner/name from the origin remote.");
  }
  return repo;
}

function ghInOrigin(args: string[], options?: { capture?: boolean }): string {
  return run("gh", ["-R", originRepo(), ...args], options);
}

function requireGh(): void {
  loadDotEnv();
  markCwdSafeForGit();
  if (!commandExists("gh")) {
    fail("GitHub CLI is required. Install it from https://cli.github.com.");
  }
  requireGitRepo();
  applyGitIdentity();

  const token = githubToken();
  if (token) {
    if (!process.env.GH_TOKEN) {
      process.env.GH_TOKEN = token;
    }
    const login = currentGithubLogin();
    configureGitToUseGh();
    console.log(`Authenticated as ${login} via GH_TOKEN.`);
    console.log(`Using repository ${originRepo()}.`);
    return;
  }

  const status = spawnSync("gh", ["auth", "status"], {
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true,
  });
  if (status.error) {
    fail(`Failed to run gh: ${status.error.message}`);
  }
  if (status.status === 0) {
    console.log(`Using repository ${originRepo()}.`);
    return;
  }

  fail(
    "GitHub authentication is required. Run `gh auth login`, or put a repo-scoped token in `.env` as GH_TOKEN.",
  );
}

function requireCleanTree(): void {
  const status = run("git", ["status", "--short"], { capture: true });
  if (status) {
    fail("Your working tree has changes. Commit or stash them before running the playground.");
  }
}

function defaultBranch(): string {
  const result = spawnSync("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.status === 0) {
    return result.stdout.trim().replace(/^refs\/remotes\/origin\//, "") || "main";
  }
  return "main";
}

function addLogEntry(label: string): void {
  appendFileSync("playground-log.md", `- ${formatStamp()} - ${label}\n`);
}

function newSandboxPr(options: {
  branch: string;
  title: string;
  body: string;
  label: string;
  commitMessage: string;
}): void {
  const base = defaultBranch();

  run("git", ["checkout", base]);
  run("git", ["pull", "--ff-only"]);
  run("git", ["checkout", "-b", options.branch]);
  addLogEntry(options.label);
  run("git", ["add", "playground-log.md"]);
  run("git", ["commit", "-m", options.commitMessage]);
  run("git", ["push", "-u", "origin", options.branch]);
  ghInOrigin([
    "pr",
    "create",
    "--base",
    base,
    "--head",
    options.branch,
    "--title",
    options.title,
    "--body",
    options.body,
  ]);
  ghInOrigin(["pr", "merge", options.branch, "--merge", "--delete-branch", "--subject", options.title]);
  run("git", ["checkout", base]);
  run("git", ["pull", "--ff-only"]);
}

function ensurePlaygroundLog(): void {
  if (existsSync("playground-log.md")) {
    return;
  }
  writeFileSync("playground-log.md", "");
  run("git", ["add", "playground-log.md"]);
  run("git", ["commit", "-m", "Create playground log"]);
  run("git", ["push"]);
}

function runPullYolo(): void {
  requireGh();
  requireCleanTree();
  ensurePlaygroundLog();

  const suffix = formatSuffix();
  newSandboxPr({
    branch: `playground-pull-yolo-a-${suffix}`,
    title: "Playground PR 1",
    body: "Creates a sandbox PR for learning Pull Shark and YOLO workflows.",
    label: "Pull/Yolo practice PR 1",
    commitMessage: "Add playground PR 1",
  });
  newSandboxPr({
    branch: `playground-pull-yolo-b-${suffix}`,
    title: "Playground PR 2",
    body: "Creates a second sandbox PR for learning Pull Shark workflows.",
    label: "Pull/Yolo practice PR 2",
    commitMessage: "Add playground PR 2",
  });
}

async function runPair(coAuthorName: string, coAuthorEmail: string): Promise<void> {
  requireGh();
  requireCleanTree();

  let name = coAuthorName;
  let email = coAuthorEmail;
  if (!name) {
    name = await ask("Co-author GitHub name: ");
  }
  if (!email) {
    email = await ask("Co-author GitHub email: ");
  }
  if (!name || !email) {
    fail("Co-author name and email are required.");
  }

  const base = defaultBranch();
  const branch = `playground-pair-${formatSuffix()}`;

  run("git", ["checkout", base]);
  run("git", ["pull", "--ff-only"]);
  run("git", ["checkout", "-b", branch]);
  addLogEntry(`Pair Extraordinaire practice with ${name}`);
  run("git", ["add", "playground-log.md"]);
  run("git", [
    "commit",
    "-m",
    `Add co-authored playground entry\n\nCo-authored-by: ${name} <${email}>`,
  ]);
  run("git", ["push", "-u", "origin", branch]);
  ghInOrigin([
    "pr",
    "create",
    "--base",
    base,
    "--head",
    branch,
    "--title",
    "Add co-authored playground entry",
    "--body",
    "Creates a co-authored sandbox PR for learning Pair Extraordinaire.",
  ]);
  ghInOrigin([
    "pr",
    "merge",
    branch,
    "--merge",
    "--delete-branch",
    "--subject",
    "Add co-authored playground entry",
  ]);
  run("git", ["checkout", base]);
  run("git", ["pull", "--ff-only"]);
}

function runQuickdraw(): void {
  requireGh();
  const title = `Quickdraw playground issue ${formatSuffix()}`;
  const url = ghInOrigin(
    [
      "issue",
      "create",
      "--title",
      title,
      "--body",
      "Created by Git Badges Playground and closed quickly for Quickdraw practice.",
    ],
    { capture: true },
  );
  console.log(url);
  ghInOrigin(["issue", "close", url, "--reason", "completed"]);
}

function showStatus(): void {
  requireGh();
  run("git", ["status", "--short", "--branch"]);
  run("git", ["remote", "-v"]);
  run("gh", ["repo", "view", originRepo(), "--json", "nameWithOwner,visibility,url"]);
}

function printHelp(): void {
  console.log(`Git Badges Playground

Usage:
  npm start
  npm start -- <mode>
  node scripts/unlock.ts [mode]

Auth:
  gh auth login
  or set GH_TOKEN in the environment / a gitignored .env file

Pair Extraordinaire (.env):
  COAUTHOR_NAME   GitHub name of the OTHER account
  COAUTHOR_EMAIL  email that GitHub has verified on that account

Modes:
  status      Check git remotes and GitHub authentication
  pull-yolo   Open and merge two sandbox pull requests
  pair        Create a co-authored commit and merge it
  quickdraw   Create and close an issue immediately

Pair options:
  --coauthor-name <name>
  --coauthor-email <email>
`);
}

function parseArgs(argv: string[]): {
  mode: Mode;
  coAuthorName: string;
  coAuthorEmail: string;
} {
  let mode: Mode = "menu";
  let coAuthorName = process.env.COAUTHOR_NAME ?? "";
  let coAuthorEmail = process.env.COAUTHOR_EMAIL ?? "";
  const args = argv.slice(2);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--coauthor-name") {
      coAuthorName = args[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--coauthor-email") {
      coAuthorEmail = args[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      fail(`Unknown argument: ${arg}`);
    }
    if (!isMode(arg)) {
      fail(`Unknown mode: ${arg}`);
    }
    mode = arg;
  }

  return { mode, coAuthorName, coAuthorEmail };
}

async function showMenu(coAuthorName: string, coAuthorEmail: string): Promise<void> {
  console.log("Git Badges Playground");
  console.log("1. status");
  console.log("2. pull-yolo");
  console.log("3. pair");
  console.log("4. quickdraw");
  const choice = await ask("Choose a mode: ");
  switch (choice) {
    case "1":
      showStatus();
      break;
    case "2":
      runPullYolo();
      break;
    case "3":
      await runPair(coAuthorName, coAuthorEmail);
      break;
    case "4":
      runQuickdraw();
      break;
    default:
      console.log("Unknown choice.");
  }
}

async function main(): Promise<void> {
  loadDotEnv();
  markCwdSafeForGit();
  applyGitIdentity();
  const { mode, coAuthorName, coAuthorEmail } = parseArgs(process.argv);
  switch (mode) {
    case "status":
      showStatus();
      break;
    case "pull-yolo":
      runPullYolo();
      break;
    case "pair":
      await runPair(coAuthorName, coAuthorEmail);
      break;
    case "quickdraw":
      runQuickdraw();
      break;
    default:
      await showMenu(coAuthorName, coAuthorEmail);
  }
}

await main();
