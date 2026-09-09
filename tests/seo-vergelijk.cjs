const { build } = require("esbuild");
const { createServer } = require("node:http");
const { spawn } = require("node:child_process");
const { mkdir, mkdtemp, writeFile, readFile, rm } = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
(async () => {
  const cache = path.join(process.cwd(), "node_modules", ".cache");
  await mkdir(cache, { recursive: true });
  const dir = await mkdtemp(path.join(cache, "ws-seo-"));
  let changed = false;
  const server = createServer((req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.end(
      `<html><head><title>${changed ? "Changed" : "Original"}</title><meta name="description" content="Description"><link rel="canonical" href="https://customer.invalid${req.url}"></head><body><h1>Business</h1><a href="/contact/">Contact</a></body></html>`,
    );
  });
  try {
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    await build({
      entryPoints: ["scripts/seo-vergelijk.mts"],
      outfile: path.join(dir, "seo.mjs"),
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
    });
    await writeFile(path.join(dir, "paths.txt"), "/\n/contact/\n");
    async function run(args) {
      return new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [path.join(dir, "seo.mjs"), ...args],
          { stdio: ["ignore", "pipe", "pipe"] },
        );
        let output = "";
        child.stdout.on("data", (d) => (output += d));
        child.stderr.on("data", (d) => (output += d));
        child.on("error", reject);
        child.on("exit", (code) => resolve({ code, output }));
      });
    }
    let r = await run([
      "vastleggen",
      origin,
      path.join(dir, "paths.txt"),
      path.join(dir, "baseline.json"),
    ]);
    assert.equal(r.code, 0, r.output);
    r = await run([
      "vergelijken",
      origin,
      path.join(dir, "baseline.json"),
      path.join(dir, "same.json"),
    ]);
    assert.equal(r.code, 0, r.output);
    changed = true;
    r = await run([
      "vergelijken",
      origin,
      path.join(dir, "baseline.json"),
      path.join(dir, "changed.json"),
    ]);
    assert.equal(r.code, 2, r.output);
    const report = JSON.parse(
      await readFile(path.join(dir, "changed.json"), "utf8"),
    );
    assert.equal(report.results.length, 2);
    assert.deepEqual(report.results[0].differences, ["title"]);
    console.log(
      "SEO source capture, unchanged comparison and title-loss detection passed.",
    );
  } finally {
    await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
