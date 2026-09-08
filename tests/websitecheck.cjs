// Isolated route checks. All database and mail access is replaced before loading the handler.
const { build } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "wordswap-form-"));
  try {
    const output = path.join(dir, "route.cjs");
    await build({
      entryPoints: ["app/api/formulier/route.ts"],
      outfile: output,
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      plugins: [
        {
          name: "isolate-side-effects",
          setup(b) {
            b.onResolve({ filter: /^(next\/server|drizzle-orm)$/ }, (args) => ({
              path: require.resolve(args.path),
              external: true,
            }));
            b.onResolve(
              { filter: /^@\/(db|db\/schema|lib\/mail)$/ },
              (args) => ({ path: args.path, namespace: "mock" }),
            );
            b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
              loader: "js",
              contents:
                args.path === "@/db"
                  ? `export const db={select(fields){return {from(){return {where(){globalThis.__form.reads++;return Promise.resolve(fields?[{n:globalThis.__form.rate}]:[{naam:'Test',domein:'example.invalid',notificatieEmail:'owner@example.invalid'}]);}}}}},insert(){return {values(){globalThis.__form.writes++;return globalThis.__form.failSave?Promise.reject(Error('offline')):Promise.resolve();}}}};`
                  : args.path === "@/lib/mail"
                    ? `export async function verstuurSiteMail(){globalThis.__form.mails++;}`
                    : `export const sites={},formulierInzendingen={},webinars={};`,
            }));
          },
        },
      ],
    });
    const { POST } = require(output);
    const reset = (extra = {}) =>
      (globalThis.__form = {
        rate: 0,
        reads: 0,
        writes: 0,
        mails: 0,
        ...extra,
      });
    const request = (values = {}, accept = "application/json") =>
      new Request("http://localhost/api/formulier", {
        method: "POST",
        headers: { accept },
        body: new URLSearchParams({
          _site: "wordswap",
          _formulier: "kennismaken",
          _bedankt: "/bedankt",
          naam: "Test",
          email: "test@example.invalid",
          website: "example.invalid",
          ...values,
        }),
      });
    reset();
    let response = await POST(request({ email: "invalid" }));
    assert.equal(response.status, 400);
    assert.equal(globalThis.__form.reads, 0);
    reset();
    response = await POST(request({ website: "" }));
    assert.equal(response.status, 400);
    assert.equal(globalThis.__form.mails, 0);
    reset({ failSave: true });
    response = await POST(request());
    assert.equal(response.status, 503);
    assert.equal(globalThis.__form.mails, 0);
    reset({ rate: 30 });
    response = await POST(request());
    assert.equal(response.status, 429);
    assert.equal(globalThis.__form.writes, 0);
    reset();
    response = await POST(request({ _extra: "bot" }));
    assert.equal(response.status, 200);
    assert.equal(globalThis.__form.writes, 0);
    assert.equal(globalThis.__form.mails, 0);
    reset();
    response = await POST(request());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(globalThis.__form.writes, 1);
    assert.equal(globalThis.__form.mails, 2);
    reset();
    response = await POST(request({ _site: "another-customer" }, "text/html"));
    assert.equal(response.status, 303);
    assert.equal(
      response.headers.get("location"),
      "https://example.invalid/bedankt",
    );
    console.log(
      "PASS: invalid email, missing website, storage failure, rate limit, honeypot, confirmed lead, existing customer redirect. No real database or email used.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
    delete globalThis.__form;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
