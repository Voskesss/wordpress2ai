/** Dirk-Jan (Van den Berg) verstuurt pdf's van zijn site via Mailblue en wist
 * de links niet. De documentenbank geeft nu per document het vaste webadres om
 * te kopiëren, maar alleen als dat adres echt werkt (01-10-2026).
 * Draaien: node --import tsx tests/document-link.mts */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { documentAdres, staatLive, vrijPad } from "../lib/document-adres";

// 1. Het adres: hoofdadres van de klant, nette tekens, nooit workers.dev
assert.equal(documentAdres({ domein: "vandenbergmediation.nl" }, "documenten/boekje.pdf"), "https://vandenbergmediation.nl/documenten/boekje.pdf");
assert.equal(documentAdres({ domein: "voorbeeld.nl", hoofdadresWww: true }, "/bestanden/a.pdf"), "https://www.voorbeeld.nl/bestanden/a.pdf");
assert.equal(
  documentAdres({ domein: "voorbeeld.nl" }, "wp-content/uploads/2025/07/Boekje 2025 (def).pdf"),
  "https://voorbeeld.nl/wp-content/uploads/2025/07/Boekje%202025%20(def).pdf",
  "spaties en haakjes moeten veilig in een mail kunnen",
);
assert.equal(documentAdres({ domein: null }, "a.pdf"), null, "zonder eigen domein geen adres");
assert.equal(documentAdres({ domein: "klant.wordswap.workers.dev" }, "a.pdf"), null, "een tijdelijk adres breekt bij de verhuizing");

// 2. Live of niet: echte HTTP-antwoorden
const server = createServer((req, res) => {
  res.statusCode = req.url === "/er.pdf" ? 200 : 404;
  res.end();
}).listen(0);
const poort = (server.address() as { port: number }).port;
assert.equal(await staatLive(`http://127.0.0.1:${poort}/er.pdf`), true);
assert.equal(await staatLive(`http://127.0.0.1:${poort}/weg.pdf`), false, "een 404 telt niet als live");
assert.equal(await staatLive("http://127.0.0.1:1/x.pdf", 500), false, "geen verbinding telt niet als live");
server.close();

// 3. De bank toont de knop alleen bij een werkend adres, en waarschuwt bij opruimen
const bank = await readFile("app/portal/DocumentBank.tsx", "utf8");
assert.ok(bank.includes("{d.adres && d.live && (") && bank.includes("navigator.clipboard.writeText(d.adres)"), "de kopieerknop ontbreekt of kopieert ook niet-werkende links");
assert.ok(bank.includes("Nog niet live"), "geen uitleg als het document alleen in een concept staat");
assert.ok(bank.includes("verstuurde mail of nieuwsbrief"), "opruimen waarschuwt niet voor links in verstuurde mails");
const api = await readFile("app/api/documentbank/route.ts", "utf8");
assert.ok(api.includes("const adres = documentAdres(site, pad)") && api.includes("live: adres ? await staatLive(adres) : false"), "de API geeft geen adres of live-stand mee");

// 4. Uploaden in de bank zelf: nooit een bestaand document overschrijven
assert.equal(vrijPad("Boekje 2025 (Def).PDF", new Set()), "bestanden/boekje-2025-def.pdf");
assert.equal(vrijPad("vacature.pdf", new Set(["bestanden/vacature.pdf"])), "bestanden/vacature-2.pdf");
assert.equal(vrijPad("vacature.pdf", new Set(["bestanden/vacature.pdf", "bestanden/vacature-2.pdf"])), "bestanden/vacature-3.pdf");
assert.equal(vrijPad("Éénjarig plan.pdf", new Set()), "bestanden/eenjarig-plan.pdf");
assert.ok(api.includes("const pad = vrijPad(body.naam, bestaand)"), "de upload kiest geen vrije naam");
assert.ok(api.includes("await schrijfObject(`${site.siteSlug}/${pad}`, data, \"application/pdf\")"), "de upload zet het document niet direct live");
assert.ok(api.includes("return NextResponse.json({ ok: true, pad: `/${pad}`, kb, adres, live })"), "de upload geeft het adres niet terug");
assert.ok(bank.includes("⬆ Document uploaden (pdf)") && bank.includes('bron: "bank"'), "de bank heeft geen eigen uploadknop");
assert.ok(bank.includes('handleUploadUrl: "/api/audio-upload"'), "de bank uploadt niet via dezelfde weg als de chat");
// 5. Wie uploadt, weet vooraf dat het openbaar is (bank én paperclipmenu)
assert.ok(bank.includes("alles wat je hier uploadt is openbaar") && bank.includes("persoonsgegevens"), "de bank waarschuwt niet dat documenten openbaar zijn");
assert.ok(bank.indexOf("alles wat je hier uploadt is openbaar") < bank.indexOf("⬆ Document uploaden (pdf)"), "de waarschuwing staat niet vóór de uploadknop");
const chatBron = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(chatBron.includes("Openbaar: niets vertrouwelijks"), "het paperclipmenu waarschuwt niet bij PDF-document");
// 6. De volledige naam staat op een eigen regel, de knoppen eronder (01-10:
//    naast drie knoppen werd de naam afgekapt tot "rapp..." en viel de rest
//    woord voor woord onder elkaar)
const bankNu = await readFile("app/portal/DocumentBank.tsx", "utf8");
assert.ok(bankNu.includes('<span className="flex min-w-0 basis-full items-start gap-3">'), "naam en knoppen delen nog één regel");
assert.ok(!/block truncate text-sm font-medium text-stone-800" title=\{d\.pad\}/.test(bankNu), "de documentnaam wordt nog afgekapt");
console.log("✓ documentlink: vast adres, alleen kopiëren als hij werkt, uploaden in de bank zelf");
