/** Bijlagen bij formulier-inzendingen zijn privé: alleen de eigenaar van die
 * site (of een beheerder) mag ze downloaden, en het opslagadres mag nooit naar
 * buiten lekken. Deze test draait de route met nagebootste database en login.
 * Draaien: node tests/inzending-bijlage.cjs */
const { build } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

(async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ws-bijlage-"));
  try {
    const out = path.join(dir, "route.cjs");
    await build({
      entryPoints: ["app/api/inzending-bijlage/route.ts"],
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
                  /^(@clerk\/nextjs\/server|next\/server|drizzle-orm|@\/db(?:\/schema)?|@\/lib\/auth)$/,
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
                "@/db/schema":
                  'exports.formulierInzendingen={soort:"inzending"};exports.sites={soort:"site"};',
                "@/lib/auth":
                  "exports.isBeheerder=async()=>globalThis.state.admin;",
                "@/db":
                  'exports.db={select:()=>({from:(t)=>({where:async()=>[t.soort==="inzending"?globalThis.state.inzending:globalThis.state.site]})})};',
              }[a.path],
            }));
          },
        },
      ],
    });
    const { GET } = require(out);

    // De opslag wordt server-side opgehaald; we onthouden of dat gebeurde.
    const echteFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      globalThis.state.opgehaald = String(url);
      return new Response("bestandsinhoud", {
        headers: { "content-type": "image/png" },
      });
    };

    const geheimAdres = "https://opslag.example/geheim-xyz.png";
    const reset = (extra = {}) =>
      (globalThis.state = {
        user: "eigenaar",
        admin: false,
        site: { githubRepo: "klant", clerkUserId: "eigenaar" },
        inzending: {
          id: 7,
          siteRepo: "klant",
          bijlagen: [{ naam: "schets.png", url: geheimAdres, bytes: 1234 }],
        },
        opgehaald: null,
        ...extra,
      });
    const vraag = (q = "id=7&n=0") =>
      GET(new Request(`http://fixture/api/inzending-bijlage?${q}`));

    // 1) De eigenaar krijgt het bestand, als download, met de echte naam
    reset();
    let res = await vraag();
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-disposition"), /filename="schets\.png"/);
    assert.equal(await res.text(), "bestandsinhoud");
    assert.equal(globalThis.state.opgehaald, geheimAdres);

    // 2) Iemand anders krijgt niets — en hoort niet dat de inzending bestaat
    reset({ user: "vreemde" });
    res = await vraag();
    assert.equal(res.status, 404);
    assert.equal(globalThis.state.opgehaald, null, "opslag niet aangeroepen");
    assert.ok(!JSON.stringify(await res.json()).includes("opslag.example"));

    // 3) Beheerder mag er wel bij
    reset({ user: "vreemde", admin: true });
    assert.equal((await vraag()).status, 200);

    // 4) Niet ingelogd
    reset({ user: null });
    assert.equal((await vraag()).status, 401);

    // 5) Bijlage die niet bestaat, en onzin-invoer
    reset();
    assert.equal((await vraag("id=7&n=5")).status, 404);
    reset();
    assert.equal((await vraag("id=nietsnummer")).status, 400);

    globalThis.fetch = echteFetch;
    console.log(
      "PASS: eigenaar downloadt met juiste bestandsnaam, vreemde krijgt 404 zonder dat de opslag wordt benaderd of het adres lekt, beheerder mag wel, uitgelogd geweigerd, onbekende bijlage en onzin-invoer netjes afgehandeld.",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
})();
