const { build } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtemp, mkdir, symlink, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ws-boundary-"));
  try {
    await build({
      entryPoints: ["lib/agent-boundary.ts"],
      outfile: path.join(dir, "boundary.cjs"),
      bundle: true,
      platform: "node",
      packages: "external",
    });
    const {
      sitePathAllowed,
      siteToolBoundary,
      agentEnvironment,
      assertNoSymlinks,
    } = require(path.join(dir, "boundary.cjs"));
    const root = path.join(dir, "site");
    await mkdir(root);
    assert.equal(await sitePathAllowed(root, "index.html"), true);
    assert.equal(await sitePathAllowed(root, "afbeeldingen/nieuw.webp"), true);
    for (const p of [
      "../secret",
      "/etc/passwd",
      ".env",
      ".claude/settings.json",
      "AGENTS.md",
    ])
      assert.equal(await sitePathAllowed(root, p), false, p);
    await symlink(dir, path.join(root, "escape"));
    assert.equal(await sitePathAllowed(root, "escape/secret"), false);
    await assert.rejects(() => assertNoSymlinks(root));
    const hook = siteToolBoundary(root);
    assert.equal(
      (
        await hook({
          hook_event_name: "PreToolUse",
          tool_name: "Bash",
          tool_input: { command: "pwd" },
        })
      ).hookSpecificOutput.permissionDecision,
      "deny",
    );
    assert.equal(
      (
        await hook({
          hook_event_name: "PreToolUse",
          tool_name: "Read",
          tool_input: { file_path: "index.html" },
        })
      ).hookSpecificOutput.permissionDecision,
      "allow",
    );
    assert.equal(
      (
        await hook({
          hook_event_name: "PreToolUse",
          tool_name: "Glob",
          tool_input: { pattern: "/etc/*" },
        })
      ).hookSpecificOutput.permissionDecision,
      "deny",
    );
    assert.equal(
      (
        await hook({
          hook_event_name: "PreToolUse",
          tool_name: "Grep",
          tool_input: { pattern: "secret", glob: ".env*" },
        })
      ).hookSpecificOutput.permissionDecision,
      "deny",
    );
    const env = agentEnvironment(dir);
    assert.equal(env.DATABASE_URL, undefined);
    assert.equal(env.CLOUDFLARE_API_TOKEN, undefined);
    assert.equal(env.GITHUB_APP_PRIVATE_KEY_BASE64, undefined);
    console.log(
      "Agent traversal, symlink, tools and environment boundary checks passed.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
