const { build } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ws-reset-"));
  try {
    const out = path.join(dir, "route.cjs");
    await build({
      entryPoints: ["app/api/gesprek-nieuw/route.ts"],
      outfile: out,
      bundle: true,
      platform: "node",
      format: "cjs",
      plugins: [
        {
          name: "mocks",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(@clerk\/nextjs\/server|next\/server|drizzle-orm|@\/db(?:\/schema)?|@\/lib\/auth|@\/lib\/operation-guards)$/,
              },
              (a) => ({ path: a.path, namespace: "mock" }),
            );
            b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
              contents: {
                "@clerk/nextjs/server":
                  "exports.auth=async()=>({userId:globalThis.state.user});",
                "next/server":
                  "exports.NextResponse={json:(v,o)=>Response.json(v,o)};",
                "drizzle-orm": "exports.eq=()=>true;",
                "@/db/schema": "exports.messages={};exports.sites={id:1};",
                "@/lib/auth":
                  "exports.isBeheerder=async()=>globalThis.state.admin;",
                "@/lib/operation-guards":
                  'exports.operationScope=(s,u)=>s.isDemo?"demo:"+u:"site:"+s.id;exports.claimOperation=async(scope)=>{globalThis.state.scope=scope;return globalThis.state.locked?null:async()=>{globalThis.state.released++}};',
                "@/db":
                  'exports.db={select:()=>({from:()=>({where:async()=>[globalThis.state.site]})}),insert:()=>({values:async(v)=>{if(globalThis.state.fail)throw Error("db");globalThis.state.rows.push(v)}})};',
              }[a.path],
            }));
          },
        },
      ],
    });
    const { POST } = require(out);
    const reset = (extra = {}) =>
      (globalThis.state = {
        user: "owner",
        admin: false,
        site: { id: 1, clerkUserId: "owner", isDemo: false },
        rows: [],
        released: 0,
        ...extra,
      });
    const req = (body) =>
      new Request("http://fixture/api/gesprek-nieuw", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
    reset({ user: null });
    assert.equal((await POST(req({ siteId: 1 }))).status, 401);
    for (const data of [
      "{",
      {},
      { siteId: -1 },
      { siteId: "1" },
      { siteId: 1.2 },
    ]) {
      reset();
      assert.equal((await POST(req(data))).status, 400);
      assert.equal(state.rows.length, 0);
    }
    reset({ user: "other" });
    assert.equal((await POST(req({ siteId: 1 }))).status, 404);
    reset({ locked: true });
    assert.equal((await POST(req({ siteId: 1 }))).status, 409);
    assert.equal(state.rows.length, 0);
    reset({ fail: true });
    assert.equal((await POST(req({ siteId: 1 }))).status, 503);
    assert.equal(state.released, 1);
    reset();
    assert.equal((await POST(req({ siteId: 1 }))).status, 200);
    assert.equal(state.rows.length, 1);
    assert.equal(state.rows[0].clerkUserId, "owner");
    assert.equal(state.released, 1);
    reset({ user: "demo-user", site: { id: 1, isDemo: true } });
    assert.equal((await POST(req({ siteId: 1 }))).status, 200);
    assert.equal(state.scope, "demo:demo-user");
    console.log(
      "PASS: new conversation authorization, input validation, shared operation lock, failed save and demo scope. No database used.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
