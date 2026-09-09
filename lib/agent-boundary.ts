import path from "node:path";
import { lstat, readdir } from "node:fs/promises";
import type { HookCallback } from "@anthropic-ai/claude-agent-sdk";

export const siteTools = ["Read", "Write", "Edit", "Glob", "Grep"];
/** Reject traversal, symlink escapes and configuration/secret access before any tool executes. */
export async function sitePathAllowed(root: string, inputPath: string) {
  const target = path.resolve(root, inputPath);
  const rel = path.relative(root, target);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel))
    return false;
  const parts = rel.split(path.sep).filter(Boolean);
  if (
    parts.some(
      (p) =>
        p.startsWith(".") ||
        ["node_modules", "AGENTS.md", "CLAUDE.md"].includes(p),
    )
  )
    return false;
  let cursor = root;
  for (const part of parts) {
    cursor = path.join(cursor, part);
    try {
      if ((await lstat(cursor)).isSymbolicLink()) return false;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") return false;
    }
  }
  return true;
}
export function siteToolBoundary(root: string): HookCallback {
  return async (event) => {
    if (event.hook_event_name !== "PreToolUse") return {};
    const input = event.tool_input as Record<string, unknown>;
    const candidate = input.file_path ?? input.path ?? ".";
    const glob = event.tool_name === "Glob" ? input.pattern : input.glob;
    const safeGlob =
      glob === undefined ||
      (typeof glob === "string" &&
        !path.isAbsolute(glob) &&
        !glob.split(/[\\/]/).some((part) => part.startsWith(".")));
    const permitted =
      safeGlob &&
      siteTools.includes(event.tool_name) &&
      typeof candidate === "string" &&
      (await sitePathAllowed(root, candidate));
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: permitted ? "allow" : "deny",
        permissionDecisionReason: permitted
          ? "Binnen deze klantsite"
          : "Alleen bestanden binnen deze klantsite zijn toegestaan.",
      },
    };
  };
}
/** Do not inherit database, mail or deployment credentials into the agent process. */
export function agentEnvironment(root: string) {
  return {
    ...Object.fromEntries(
      Object.keys(process.env).map((key) => [key, undefined]),
    ),
    PATH: process.env.PATH,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    HOME: root,
    XDG_CONFIG_HOME: path.join(root, ".config"),
    XDG_CACHE_HOME: path.join(root, ".cache"),
    CLAUDE_CONFIG_DIR: path.join(root, ".claude"),
  };
}

export async function assertNoSymlinks(root: string): Promise<void> {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new Error(
        "Deze werkmap bevat een symbolische link en moet eerst gecontroleerd worden.",
      );
    if (entry.isDirectory())
      await assertNoSymlinks(path.join(root, entry.name));
  }
}
