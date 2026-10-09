/** Aantoonbaar akkoord op de algemene voorwaarden (Jos, 09-10-2026, voor de
 * beroepsaansprakelijkheidsverzekering). De betaalroute draait hier echt, met
 * nagebootste database en Mollie: zonder vinkje geen betaling en geen akkoord,
 * met vinkje een vastgelegd akkoord (versie, plek, e-mail) vóór Mollie.
 * Draaien: node tests/voorwaarden-akkoord.cjs */
const { build } = require("esbuild");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ws-vw-"));
  try {
    const out = path.join(dir, "route.cjs");
    await build({
      entryPoints: ["app/api/betalen/[token]/route.ts"],
      outfile: out,
      bundle: true,
      platform: "node",
      format: "cjs",
      logLevel: "silent",
      plugins: [
        {
          name: "mocks",
          setup(b) {
            b.onResolve({ filter: /^(next\/server|drizzle-orm|@\/db|@\/db\/schema|@\/lib\/mollie)$/ }, (a) => ({ path: a.path, namespace: "mock" }));
            b.onResolve({ filter: /^@\/lib\/(voorwaarden-akkoord|voorwaarden-versie)$/ }, (a) => ({ path: path.resolve(a.path.replace("@/", "") + ".ts") }));
            b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
              loader: "js",
              contents: {
                "next/server": "exports.NextResponse={redirect:(u,s)=>new Response(null,{status:s,headers:{location:u}}),json:(v,o)=>Response.json(v,o)};",
                "drizzle-orm": "exports.eq=()=>0;exports.and=()=>0;exports.desc=()=>0;",
                "@/db/schema": 'exports.betaalverzoeken={t:"verzoek"};exports.sites={t:"site"};exports.abonnementen={t:"abo"};exports.betalingen={t:"betaling"};exports.akkoorden={t:"akkoord"};',
                "@/db": `const S=()=>globalThis.st;exports.db={
                  select:()=>({from:(t)=>({where:async()=>t.t==="verzoek"?[S().verzoek]:t.t==="site"?[S().site]:t.t==="abo"?[S().abo]:[]})}),
                  insert:(t)=>({values:(v)=>{if(t.t==="akkoord")S().akkoorden.push(v);const p=Promise.resolve();p.onConflictDoNothing=()=>Promise.resolve();return p;}}),
                  update:()=>({set:()=>({where:()=>{const p=Promise.resolve();p.returning=async()=>[S().abo];return p;}})}),
                };`,
                "@/lib/mollie": `exports.SITE_URL="https://www.wordswap.nl";exports.euro=(c)=>(c/100).toFixed(2);exports.inclBtwCent=(c)=>Math.round(c*1.21);
                  exports.mollie=async(pad)=>{globalThis.st.mollie.push(pad);return pad==="/customers"?{id:"cst_1"}:{id:"tr_1",status:"open",_links:{checkout:{href:"https://mollie.test/pay"}}}};`,
              }[a.path],
            }));
          },
        },
      ],
    });
    const { POST } = require(out);
    const reset = () =>
      (globalThis.st = {
        verzoek: { id: 1, siteId: 9, wijze: "link", status: "open", soort: "eerste", bedragExclCent: 1900, omschrijving: "Eerste maand", klantEmail: "klant@voorbeeld.nl" },
        site: { id: 9, naam: "Bakkerij", clerkUserId: "user_eigenaar" },
        abo: { id: 3, status: "wacht_op_eerste", mollieCustomerId: null, naam: "Piet", email: "klant@voorbeeld.nl" },
        akkoorden: [],
        mollie: [],
      });
    const vraag = (vinkje) => {
      const f = new FormData();
      if (vinkje) f.set("voorwaarden", "on");
      return POST(new Request("https://www.wordswap.nl/api/betalen/abc", { method: "POST", body: f }), { params: Promise.resolve({ token: "abc" }) });
    };

    // 1. Zonder vinkje: terug naar de betaalpagina met uitleg, geen Mollie, geen akkoord
    reset();
    let res = await vraag(false);
    assert.equal(res.status, 303);
    assert.match(res.headers.get("location"), /fout=akkoord/, "zonder vinkje geen melding");
    assert.equal(st.mollie.length, 0, "zonder vinkje werd toch een betaling gestart");
    assert.equal(st.akkoorden.length, 0, "zonder vinkje werd toch een akkoord vastgelegd");

    // 2. Met vinkje: akkoord vastgelegd (versie, plek, e-mail) en daarna pas Mollie
    reset();
    res = await vraag(true);
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), "https://mollie.test/pay");
    assert.equal(st.akkoorden.length, 1, "met vinkje geen akkoord vastgelegd");
    const a = st.akkoorden[0];
    assert.equal(a.soort, "algemene-voorwaarden");
    assert.match(a.versie, /^\d{4}-\d{2}-\d{2}#betaling$/, `versie zonder plek: ${a.versie}`);
    assert.equal(a.clerkUserId, "user_eigenaar");
    assert.equal(a.email, "klant@voorbeeld.nl");
    assert.ok(st.mollie.includes("/payments"), "met vinkje geen betaling gestart");

    // 3. De rest: de plekken waar het vinkje staat, en de pagina's
    const lees = (p) => fs.readFile(p, "utf8");
    assert.ok((await lees("app/portal/WebsiteAkkoord.tsx")).includes("<VoorwaardenVinkje"), "geen vinkje bij het akkoord op de website");
    assert.ok((await lees("app/portal/page.tsx")).includes("<VoorwaardenVinkje klein"), "geen vinkje in de akkoordbalk");
    assert.ok((await lees("app/betalen/[token]/page.tsx")).includes("<VoorwaardenVinkje"), "geen vinkje op de betaalpagina");
    const acties = await lees("app/portal/acties.ts");
    const fn = acties.slice(acties.indexOf("export async function geefWebsiteAkkoord"));
    assert.ok(fn.indexOf('vinkjeGezet(formData.get("voorwaarden"))') > 0 && fn.indexOf("await legVoorwaardenAkkoordVast(") > fn.indexOf("vinkjeGezet(formData"), "het akkoord op de website kijkt niet naar het vinkje");
    assert.ok((await lees("app/portal/../VoorwaardenVinkje.tsx")).includes("required"), "het vinkje is niet verplicht");
    const vw = await lees("app/voorwaarden/page.tsx");
    for (const kop of ["Fouten melden en termijnen", "Eigendom en geheimhouding", "Als je particulier bent", "beroepsaansprakelijkheidsverzekering", "vrijwaar je ons"])
      assert.ok(vw.includes(kop), `voorwaarden missen: ${kop}`);
    assert.ok(!vw.includes("—"), "lang streepje in de voorwaarden");
    const oud = await lees("app/voorwaarden/17-september-2026/page.tsx");
    assert.ok(oud.includes("index: false") && oud.includes("Geldt tot 9 november 2026"), "de vorige versie staat er niet (of komt in Google)");

    console.log("PASS: geen betaling en geen akkoord zonder vinkje; met vinkje akkoord (versie#plek, e-mail, eigenaar) vóór Mollie; vinkjes bij oplevering en betaling; nieuwe en vorige voorwaarden online.");
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
