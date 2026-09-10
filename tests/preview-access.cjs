const { build } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ws-preview-"));
  try {
    await build({
      entryPoints: ["lib/preview-access.ts"],
      outfile: path.join(dir, "access.cjs"),
      bundle: true,
      platform: "node",
    });
    process.env.PREVIEW_SIGNING_SECRET = "isolated-test-key";
    const { createPreviewAccess, verifyPreviewAccess } = require(
      path.join(dir, "access.cjs"),
    );
    const now = 1700000000000;
    const token = createPreviewAccess(17, "user-demo", now);
    assert.deepEqual(verifyPreviewAccess(token, now), {
      siteId: 17,
      userId: "user-demo",
    });
    assert.equal(verifyPreviewAccess(token.replace("17~", "18~"), now), null);
    assert.equal(verifyPreviewAccess(token, now + 12 * 3600001), null);
    assert.equal(verifyPreviewAccess("17", now), null);
    assert.equal(verifyPreviewAccess(token + "x", now), null);
    console.log("Preview signature, expiry and tampering checks passed.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
