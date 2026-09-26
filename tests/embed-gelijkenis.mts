/**
 * Gelijkenis gaat vóór cookie-vrij (les 25-09, kaarten-embeds).
 *
 * Cookie-vrij was een doel op zich geworden: een ingesloten Google Maps-kaart
 * werd bij de migratie vervangen door een statische link, en dan is de kopie
 * zichtbaar een andere website. De regels zijn omgedraaid: onzichtbare
 * cookie-vrije wissels (youtube-nocookie, Vimeo ?dnt=1) blijven, maar een
 * embed zonder onzichtbare variant komt 1-op-1 mee. Deze test bewaakt dat de
 * oude formulering nergens terugsluipt en dat de nieuwe regels blijven staan.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const huisregels = await readFile(new URL("../lib/huisregels.ts", import.meta.url), "utf8");
const skill = await readFile(new URL("../.claude/skills/migreer-klant/SKILL.md", import.meta.url), "utf8");

// 1. De oude "kaart wordt statische link"-regel mag nergens meer staan
for (const [naam, tekst] of [["huisregels", huisregels], ["migreer-skill", skill]] as const) {
  assert.ok(
    !/als statische link\/afbeelding|statische link in plaats van iframe/i.test(tekst),
    `${naam}: de oude regel die een kaart-embed degradeert tot statische link staat er weer in`,
  );
}

// 2. De nieuwe lijn staat op beide plekken: bestaande embeds nooit degraderen
assert.ok(
  /vervang je nooit door een statische link/i.test(huisregels),
  "huisregels: de regel dat een bestaande embed nooit gedegradeerd wordt is verdwenen",
);
assert.ok(
  /GELIJKENIS GAAT V[ÓO]{2}R COOKIE-VRIJ/i.test(skill),
  "migreer-skill: 'gelijkenis gaat vóór cookie-vrij' is verdwenen",
);

// 3. De onzichtbare wissels blijven wél (gratis winst, niemand ziet het)
for (const [naam, tekst] of [["huisregels", huisregels], ["migreer-skill", skill]] as const) {
  assert.ok(tekst.includes("youtube-nocookie.com"), `${naam}: de cookie-vrije YouTube-wissel is verdwenen`);
  assert.ok(tekst.includes("?dnt=1"), `${naam}: de Vimeo dnt-wissel is verdwenen`);
}

// 4. Meetscripts en verificatie-tags: intact mee, zelfde meetcodes, wij regelen verificatie
assert.ok(
  /cookiebanner\) laat je altijd intact/.test(huisregels),
  "huisregels: bestaande meetscripts van de eigenaar zijn niet meer beschermd",
);
assert.ok(
  skill.includes("facebook-domain-verification") && skill.includes("google-site-verification"),
  "migreer-skill: de verificatie-tags (Search Console/Meta) worden niet meer genoemd",
);
assert.ok(
  /dezelfde meetcodes/.test(skill),
  "migreer-skill: 'zelfde meetcodes, statistieken lopen door' is verdwenen",
);

const bouw = await readFile(new URL("../lib/bouw.ts", import.meta.url), "utf8");

// 5. Formulieren van externe diensten (les Van den Berg 25-09): insluitcode 1-op-1,
//    nooit ombouwen naar ons endpoint — anders breken autoresponder en lijsten
for (const [naam, tekst] of [["huisregels", huisregels], ["migreer-skill", skill], ["bouw-pijplijn", bouw]] as const) {
  assert.ok(
    tekst.includes("ActiveCampaign") && /NOOIT om naar ons endpoint/.test(tekst),
    `${naam}: de uitzondering voor formulieren van externe diensten is verdwenen`,
  );
}

// 6. Sitetracking breder dan Google: ook ActiveCampaign, HubSpot, Hotjar, Clarity intact
assert.ok(
  /Hotjar/.test(huisregels) && /Hotjar/.test(skill),
  "de bredere meetscript-lijst (HubSpot/Hotjar/Clarity) is verdwenen",
);

// 7. Knoppen blijven knoppen en [hidden] wint altijd (lessen Van den Berg 25-09)
for (const [naam, tekst] of [["migreer-skill", skill], ["bouw-pijplijn", bouw]] as const) {
  assert.ok(tekst.includes("[hidden]{display:none"), `${naam}: de [hidden]-stijlregel is verdwenen`);
  assert.ok(/btn/.test(tekst) && /knopstijl/.test(tekst), `${naam}: de knopklassen-regel is verdwenen`);
}

// 8. Overzichtspagina's tonen alle gemigreerde berichten, ook als het oude raster achterliep
assert.ok(/OVERZICHTSPAGINA'S TONEN ALLES/.test(skill), "migreer-skill: de overzicht-toont-alles-regel is verdwenen");

// 9. De chat doet nooit alsof hij internet heeft (les 26-09: "kijk of ik op Google wat heb staan")
assert.ok(
  /JE HEBT GEEN INTERNET/.test(huisregels) && /verzin NOOIT reviews/.test(huisregels) && /niet voor je op internet zoeken, daar is deze chat niet voor bedoeld/.test(huisregels),
  "de geen-internet-eerlijkheidsregel is verdwenen uit de huisregels",
);

console.log("embed-gelijkenis: ok");
