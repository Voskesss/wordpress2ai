import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bepaalToegang, groepeerBijdragen, MAX_GRATIS_LEDEN } from "../lib/toegang";
import { controleerUitnodiging, uitnodigingsMail } from "../lib/team";

/**
 * Teamleden per site (Jos, 04-10-2026): eigen inlog per persoon, per persoon
 * instellen of hij zelf mag publiceren en of hij de berichten mag zien, tot 3
 * gratis, één gedeeld concept met namen, en een logboek van wie wat deed.
 */
const site = { id: 1, clerkUserId: "eigenaar" };
const lid = (p: Partial<{ magPubliceren: boolean; magBerichten: boolean }> = {}) => ({ clerkUserId: "lisa", magPubliceren: false, magBerichten: false, ...p });

// 1. Wie mag wat
assert.deepEqual(bepaalToegang(site, "eigenaar", null, false), { rol: "eigenaar", magPubliceren: true, magBerichten: true });
assert.deepEqual(bepaalToegang(site, "lisa", lid(), false), { rol: "meewerker", magPubliceren: false, magBerichten: false });
assert.equal(bepaalToegang(site, "lisa", lid({ magPubliceren: true }), false)?.magPubliceren, true, "publiceerrecht per lid werkt niet");
assert.equal(bepaalToegang(site, "lisa", lid({ magBerichten: true }), false)?.magBerichten, true, "berichtenrecht per lid werkt niet");
assert.equal(bepaalToegang(site, "vreemde", null, false), null, "een vreemde krijgt toegang");
assert.equal(bepaalToegang(site, "vreemde", lid(), false), null, "een lid-rij van iemand anders geeft toegang");
assert.equal(bepaalToegang(site, null, null, true), null, "zonder inlog toch toegang");
assert.equal(bepaalToegang(site, "jos", null, true)?.rol, "beheerder");

// 2. Uitnodigen: tot 3 gratis, geen dubbelen, niet jezelf
assert.equal(MAX_GRATIS_LEDEN, 3);
const goed = controleerUitnodiging({ naam: " Lisa de Vries ", email: "Lisa@Bedrijf.nl", magPubliceren: "on" }, [], "piet@bedrijf.nl", 3);
assert.ok(goed.ok && goed.invoer.email === "lisa@bedrijf.nl" && goed.invoer.naam === "Lisa de Vries" && goed.invoer.magPubliceren && !goed.invoer.magBerichten);
const fout = (r: ReturnType<typeof controleerUitnodiging>) => (r.ok ? "" : r.fout);
assert.match(fout(controleerUitnodiging({ naam: "X", email: "geen-adres" }, [], null, 3)), /klopt niet/);
assert.match(fout(controleerUitnodiging({ naam: "", email: "a@b.nl" }, [], null, 3)), /naam/);
assert.match(fout(controleerUitnodiging({ naam: "Piet", email: "PIET@bedrijf.nl" }, [], "piet@bedrijf.nl", 3)), /eigen adres/);
assert.match(fout(controleerUitnodiging({ naam: "L", email: "lisa@bedrijf.nl" }, [{ email: "lisa@bedrijf.nl" }], null, 3)), /al in je team/);
assert.match(fout(controleerUitnodiging({ naam: "D", email: "d@b.nl" }, [{ email: "a@b.nl" }, { email: "b@b.nl" }, { email: "c@b.nl" }], null, 3)), /vol/);

// 3. De mail zegt eerlijk wat iemand mag
const zonder = uitnodigingsMail({ naam: "Lisa", door: "Piet", siteNaam: "Bakkerij", inlogUrl: "https://x/sign-in", magPubliceren: false, magBerichten: false }).html;
assert.match(zonder, /klaarzetten als concept; Piet zet ze live/);
assert.ok(!/berichten van de formulieren/.test(zonder), "de mail belooft berichten die uit staan");
const met = uitnodigingsMail({ naam: "Lisa", door: "Piet", siteNaam: "Bakkerij", inlogUrl: "https://x/sign-in", magPubliceren: true, magBerichten: true }).html;
assert.match(met, /zelf live zetten/);
assert.match(met, /berichten van de formulieren/);

// 4. Waarschuwing bij publiceren: de anderen, niet jezelf, per persoon gebundeld
const bijdragen = groepeerBijdragen(
  [
    { clerkUserId: "lisa", naam: "Lisa", omschrijving: "openingstijden" },
    { clerkUserId: "piet", naam: "Piet", omschrijving: "kop korter" },
    { clerkUserId: "lisa", naam: "Lisa", omschrijving: "foto team" },
  ],
  "piet",
);
assert.deepEqual(bijdragen, [{ naam: "Lisa", wat: ["openingstijden", "foto team"] }]);

// 5. Elke route kijkt via de centrale toegang, met het juiste recht
const lees = (p: string) => readFile(p, "utf8");
const OUD = /clerkUserId !== userId && !\(await isBeheerder\(\)\)/;
for (const r of ["chat", "tekst-wijzig", "foto-wijzig", "foto-upload", "foto-ordenen", "fotobank", "fotobank/upload", "documentbank", "audiobank", "audio-upload", "videobank", "video-upload", "vindbaarheid", "voorverwarm", "stop", "gesprek-nieuw", "stap-terug"]) {
  const bron = await lees(`app/api/${r}/route.ts`);
  assert.ok(bron.includes("magBewerken("), `${r}: kijkt niet via magBewerken`);
  assert.ok(!OUD.test(bron), `${r}: nog de oude eigenaarscontrole (teamleden komen er niet in)`);
}
for (const r of ["publiceer", "verwerp", "ongedaan"]) assert.ok((await lees(`app/api/${r}/route.ts`)).includes("magPubliceren("), `${r}: publiceerrecht wordt niet gecontroleerd`);
for (const r of ["inzending-bijlage", "portal/inzendingen-export"]) assert.ok((await lees(`app/api/${r}/route.ts`)).includes("magBerichten("), `${r}: berichtenrecht wordt niet gecontroleerd`);
assert.ok((await lees("app/portal/acties.ts")).includes("magBerichten(site, userId)"), "berichten afhandelen kijkt niet naar het berichtenrecht");
// Geld en gegevens blijven van de eigenaar
for (const r of ["portal/factuur/[nummer]", "portal/meenemen/gegevens", "portal/meenemen/website"])
  assert.ok(!(await lees(`app/api/${r}/route.ts`)).includes("magBewerken("), `${r}: een teamlid kan erbij`);

// 6. Logboek op de plekken waar iets gebeurt
for (const [r, soort] of [["chat", "concept"], ["publiceer", "gepubliceerd"], ["verwerp", "verworpen"], ["ongedaan", "teruggezet"], ["fotobank/upload", "upload"]])
  assert.ok((await lees(`app/api/${r}/route.ts`)).includes(`"${soort}"`), `${r}: schrijft niets in het logboek`);

// 6b. Teamvenster: elke stap onthoudt welke bestanden hij raakte
assert.ok((await lees("app/api/chat/route.ts")).includes('"concept", bericht, changeRowId, gewijzigd)'), "chat: pagina's per stap worden niet bewaard");
for (const r of ["tekst-wijzig", "foto-wijzig", "foto-ordenen"])
  assert.ok((await lees(`app/api/${r}/route.ts`)).includes("changeId, bestanden.map((b) => b.pad))"), `${r}: pagina's per stap worden niet bewaard`);
assert.match(await lees("db/migrations/20261005-activiteit-bestanden.sql"), /ADD COLUMN IF NOT EXISTS bestanden jsonb/);

// 7. Portaal: uitnodiging koppelen, team en logboek tonen, migratie bestaat
const portaal = await lees("app/portal/page.tsx");
assert.ok(portaal.includes("koppelUitnodigingen(userId, emails)"), "een uitgenodigd teamlid wordt niet gekoppeld");
assert.ok(portaal.includes("<TeamBlok") && portaal.includes("<Logboek"), "team of logboek ontbreekt in het portaal");
assert.ok(portaal.includes("magPubliceren={") && portaal.includes("metTeam={"), "de chat weet niet wat het teamlid mag");
assert.match(await lees("db/migrations/20261004-teamleden.sql"), /CREATE TABLE IF NOT EXISTS site_leden[\s\S]*CREATE TABLE IF NOT EXISTS site_activiteit/);

console.log("teamleden: ok");
