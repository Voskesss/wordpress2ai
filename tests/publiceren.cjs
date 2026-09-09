const { build } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ws-publish-"));
  try {
    async function load(route) {
      const outfile = path.join(dir, route + ".cjs");
      await build({
        entryPoints: [`app/api/${route}/route.ts`],
        outfile,
        bundle: true,
        platform: "node",
        packages: "external",
        plugins: [
          {
            name: "isolated",
            setup(b) {
              b.onResolve({ filter: /^next\/server$/ }, (a) => ({
                path: require.resolve(a.path),
                external: true,
              }));
              b.onResolve({ filter: /^(?:@\/|@clerk\/|drizzle-orm)/ }, (a) => ({
                path: a.path,
                namespace: "mock",
              }));
              b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
                loader: "js",
                contents: a.path.includes("@clerk")
                  ? `export async function auth(){return {userId:globalThis.testState.user}}`
                  : a.path === "drizzle-orm"
                    ? `export const eq=()=>0,and=()=>0,desc=()=>0;`
                    : a.path === "@/db/schema"
                      ? `export const changes={},sites={},messages={};`
                      : a.path === "@/db"
                        ? `export const db={select(fields){const q={from(){return q},innerJoin(){return q},where(){return q},orderBy(){return q},limit(){return q},then(resolve,reject){const s=globalThis.testState;return Promise.resolve(!s.row?[]:fields?.change?[s.row]:!fields?[s.row.change]:[{id:s.row.change.id}]).then(resolve,reject)}};return q},update(){return {set(value){return {where(){globalThis.testState.updates.push(value);Object.assign(globalThis.testState.row.change,value);return Promise.resolve()}}}}},insert(){return {values(){return Promise.resolve()}}}};`
                        : a.path === "@/lib/auth"
                          ? `export async function isBeheerder(){return false}`
                          : a.path === "@/lib/operation-guards"
                            ? `export const operationScope=()=>''; export async function claimOperation(){return globalThis.testState.busy?null:async()=>{globalThis.testState.released++}};`
                            : a.path === "@/lib/github"
                              ? `export const GITHUB_ORG='test';export async function gh(url){if(url.includes('commits?')){globalThis.testState.parentReads++;return [{parents:[{sha:'previous'}]}]}return {merged:false}}; export async function mergeBranchInMain(){globalThis.testState.merges++};export const mergePullRequest=mergeBranchInMain;export async function verwijderBranch(){globalThis.testState.deleted++;if(globalThis.testState.failCleanup)throw Error('cleanup')};export async function zetTerugNaarVersie(repo,target){globalThis.testState.restoreTargets.push(target)};`
                              : a.path === "@/lib/demo"
                                ? `export const demoLiveWorker=()=>'',demoWorker=()=>'';`
                                : a.path === "@/lib/cloudflare"
                                  ? `export async function deployRepoNaarCloudflare(){globalThis.testState.deploys++;if(globalThis.testState.failDeploy)throw Error('offline')};export const deployRepoNaarCloudflareRef=deployRepoNaarCloudflare;`
                                  : `export const unused=true;`,
              }));
            },
          },
        ],
      });
      return require(outfile).POST;
    }
    const reset = (extra = {}) =>
      (globalThis.testState = {
        user: "owner",
        row: {
          site: {
            id: 1,
            clerkUserId: "owner",
            isDemo: false,
            status: "actief",
            githubRepo: "test",
            netlifySiteId: "test",
          },
          change: {
            id: 1,
            clerkUserId: "owner",
            status: "concept",
            branch: "concept",
          },
        },
        updates: [],
        parentReads: 0,
        restoreTargets: [],
        merges: 0,
        deploys: 0,
        deleted: 0,
        released: 0,
        ...extra,
      });
    const req = () =>
      new Request("http://localhost/api/publiceer", {
        method: "POST",
        body: JSON.stringify({ changeId: 1 }),
      });
    const publish = await load("publiceer");
    reset({ user: null });
    assert.equal((await publish(req())).status, 401);
    reset({ busy: true });
    assert.equal((await publish(req())).status, 409);
    assert.equal(testState.merges, 0);
    reset({ failDeploy: true });
    assert.equal((await publish(req())).status, 503);
    assert.equal(testState.row.change.status, "publicatie_mislukt");
    assert.equal(testState.deleted, 0);
    assert.equal(testState.released, 1);
    testState.failDeploy = false;
    assert.equal((await publish(req())).status, 200);
    assert.equal(testState.merges, 1);
    assert.equal(testState.row.change.status, "gepubliceerd");
    assert.equal(testState.deleted, 1);
    assert.equal((await publish(req())).status, 200);
    assert.equal(testState.deploys, 2);
    reset({ failCleanup: true });
    assert.equal((await publish(req())).status, 200);
    reset();
    testState.row.site.netlifySiteId = null;
    assert.equal((await publish(req())).status, 503);
    assert.equal(testState.merges, 0);
    for (const route of ["publiceer", "verwerp", "ongedaan", "stap-terug"]) {
      const post = route === "publiceer" ? publish : await load(route);
      reset({ user: "other" });
      testState.row.site.isDemo = true;
      assert.equal(
        (await post(req())).status,
        404,
        route + " must protect demo ownership",
      );
      assert.equal(testState.updates.length, 0);
    }
    reset();
    testState.row.site.isDemo = true;
    testState.failDeploy = true;
    assert.equal((await publish(req())).status, 503);
    assert.equal(testState.row.change.status, "concept");
    const undo = await load("ongedaan");
    reset({ failDeploy: true });
    testState.row.change.status = "gepubliceerd";
    assert.equal((await undo(req())).status, 503);
    assert.equal(testState.row.change.status, "herstel_mislukt");
    assert.equal(testState.row.change.baseSha, "previous");
    testState.failDeploy = false;
    assert.equal((await undo(req())).status, 200);
    assert.equal(testState.parentReads, 1);
    assert.deepEqual(testState.restoreTargets, ["previous", "previous"]);
    assert.equal(testState.row.change.status, "afgewezen");
    console.log(
      "Publication and restore retry, truthful status, cleanup, locking and demo ownership checks passed.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
