/**
 * Het gezondheidsdashboard (gebouwd 26-09): elke stille afhankelijkheid
 * dagelijks echt aanraken, en alleen mailen bij nieuw rood. De proefrit door
 * het echte pad ving meteen drie fouten in de checks zelf (Mollie-parameter,
 * verkeerde Cloudflare-controle, eigen site als klantsite geteld); deze test
 * bewaakt de pure onderdelen en de aansluitingen.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { versieStatus, nieuwRood, type GezondheidsRapport } from "../lib/gezondheid";

// 1. Versievergelijking: gelijk = groen, zelfde hoofdnummer = oranje, hoofdsprong = rood
assert.equal(versieStatus("0.128.0", "0.128.0"), "ok");
assert.equal(versieStatus("16.3.5", "16.3.6"), "waarschuwing");
assert.equal(versieStatus("0.120.0", "1.2.0"), "fout");
assert.equal(versieStatus("^16.3.5", "16.3.5"), "ok");

// 2. Nieuw rood: alleen wat nu fout is en dat gisteren niet was
const maak = (status: "ok" | "fout", sleutel = "a"): GezondheidsRapport => ({
  gemetenOp: "x",
  versies: [],
  checks: [{ sleutel, naam: sleutel.toUpperCase(), status, detail: "d" }],
});
assert.deepEqual(nieuwRood(maak("ok"), maak("fout")), ["A: d"]);
assert.deepEqual(nieuwRood(maak("fout"), maak("fout")), [], "bestaand rood mag niet opnieuw mailen");
assert.equal(nieuwRood(null, maak("fout")).length, 1, "eerste meting met rood hoort te melden");
assert.deepEqual(nieuwRood(maak("fout"), maak("ok")), []);

// 3. Aansluitingen: cron ingepland, dashboard bestaat, eigen site uitgesloten
const vercel = JSON.parse(await readFile("vercel.json", "utf8")) as { crons: { path: string }[] };
assert.ok(vercel.crons.some((c) => c.path === "/api/cron/gezondheid"), "de gezondheids-cron staat niet ingepland");
const lib = await readFile("lib/gezondheid.ts", "utf8");
assert.ok(lib.includes('ne(sites.githubRepo, "wordswap")'), "de eigen site wordt weer als klantsite gecontroleerd");
assert.ok(lib.includes('await mollie("/methods")'), "de Mollie-check gebruikt weer een ongeldige parameter");
assert.ok(/accounts\/\$\{ACCOUNT\}\/workers\/scripts/.test(lib), "de Cloudflare-check bewijst niet meer wat de deploys nodig hebben");
assert.ok(lib.includes("nieuwRood(vorig, rapport)"), "de rood-melding vergelijkt niet meer met het vorige rapport");
const pagina = await readFile("app/admin/gezondheid/page.tsx", "utf8");
assert.ok(pagina.includes("Nu controleren") && pagina.includes("leesRapport"), "het dashboard mist de knop of het rapport");
const nav = await readFile("app/admin/page.tsx", "utf8");
assert.ok(nav.includes('href="/admin/gezondheid"'), "de navigatieknop naar het dashboard ontbreekt");

console.log("gezondheid: ok");
