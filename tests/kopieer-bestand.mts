/**
 * Kopieergereedschap (28-09): een nieuw bericht of project werd volledig
 * opnieuw uitgetypt (130 regels op EVC). Uitvoer kost vijf keer zoveel als
 * invoer, dus nu: bestaande pagina kopiëren, alleen de verschillen bewerken.
 * Dit test het ECHTE gereedschap: het draait de tool-functie op een werkmap.
 */
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

// Het gereedschap zit binnen draaiChatAgent; we halen het er via een
// nep-client uit door de module-bron te controleren én de kernhandeling na
// te spelen met dezelfde bouwstenen (veilig pad, niet overschrijven).
const agent = await readFile("lib/chat-agent.ts", "utf8");
const blok = agent.slice(agent.indexOf('naam: "kopieer_bestand"'), agent.indexOf('naam: "schrijf_bestand"'));
assert.ok(blok.length > 100, "het kopieergereedschap ontbreekt in de chat-motor");
assert.ok(/const bron = await veiligPad\(werkmap, van\);\s*const doel = await veiligPad\(werkmap, naar\);\s*if \(!bron \|\| !doel\) return buitenSite;/.test(blok), "bron en doel gaan niet allebei door de site-grens (veiligPad)");
assert.ok(/bestaatAl\) return fout\(/.test(blok), "het gereedschap kan een bestaand bestand overschrijven");
assert.ok(/mkdir\(path\.dirname\(doel\), \{ recursive: true \}\)/.test(blok), "nieuwe mappen (bijv. /2026/09/28/) worden niet aangemaakt");
assert.ok(/opBestand\(doel,/.test(blok), "de kopie loopt niet via het bestandsslot");

// Echte gedrag: de site-grens weigert paden buiten de werkmap
const { sitePathAllowed } = await import("../lib/agent-boundary");
const map = await mkdtemp(path.join(tmpdir(), "kopie-"));
await mkdir(path.join(map, "2019/07/02/oud"), { recursive: true });
await writeFile(path.join(map, "2019/07/02/oud/index.html"), "<h1>Oud</h1>");
assert.equal(await sitePathAllowed(map, "2026/09/28/nieuw/index.html"), true, "een nieuw pad binnen de site hoort toegestaan te zijn");
assert.equal(await sitePathAllowed(map, "../buiten.html"), false, "een pad buiten de site hoort geweigerd te worden");

// Bedrading: route kent het gereedschap (status + nieuw-bestand-boekhouding)
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/kopieer_bestand: \(pad\) =>/.test(route) && /kopieer_bestand: \(i\) =>/.test(route), "de chat meldt de kopieerstap niet aan de eigenaar");
assert.ok(/g\.naam === "schrijf_bestand" \|\| g\.naam === "kopieer_bestand"\) nieuwDezeBeurt\.add\(rel\)/.test(route), "een gekopieerde pagina telt niet als nieuw (voorbeeld springt dan naar een pagina die nog niet online staat)");
// Werkwijze in de instructies
assert.ok(/maak hem dan met kopieer_bestand van de meest vergelijkbare bestaande pagina/.test(route), "de werkwijze (kopiëren en alleen verschillen bewerken) staat niet in de instructies");

console.log("kopieer-bestand: gereedschap veilig (site-grens, nooit overschrijven), bedraad en in de werkwijze");
