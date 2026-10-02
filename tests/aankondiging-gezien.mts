import assert from "node:assert/strict";
import { gezienOverzicht, type SiteVoorGezien } from "../lib/aankondiging-gezien";

/**
 * Wie zag een aankondiging al? (wens Jos, 02-10-2026: weten wanneer hij weg
 * kan.) Telt per klantaccount, niet per site, en nooit demo's, onze eigen
 * site of het account van de beheerder zelf.
 */
const site = (naam: string, clerkUserId: string, extra: Partial<SiteVoorGezien> = {}): SiteVoorGezien => ({
  naam, clerkUserId, isDemo: false, githubRepo: naam.toLowerCase(), ...extra,
});
const sitesLijst = [
  site("Roelart", "u1"),
  site("Van den Berg", "u2"),
  site("Tweede site Van den Berg", "u2"),
  site("Demo bakkerij", "u3", { isDemo: true }),
  site("WordSwap", "u4", { githubRepo: "wordswap" }),
  site("Vakbeursonline", "jos"),
  site("Wacht op uitnodiging", "jos"),
];
const gezien = [
  { aankondigingId: 7, clerkUserId: "u1" },
  { aankondigingId: 7, clerkUserId: "jos" },
  { aankondigingId: 8, clerkUserId: "u2" },
];

const g = gezienOverzicht(sitesLijst, gezien, 7, "jos");
assert.equal(g.totaal, 2, "demo, eigen site of beheerder telt mee als klant");
assert.deepEqual(g.gezien, ["Roelart"]);
assert.deepEqual(g.nietGezien, ["Tweede site Van den Berg, Van den Berg"], "een klant met twee sites telt dubbel of verdwijnt");

const allemaal = gezienOverzicht(sitesLijst, [...gezien, { aankondigingId: 7, clerkUserId: "u2" }], 7, "jos");
assert.equal(allemaal.nietGezien.length, 0, "wie hem zag, staat nog bij nog niet");
assert.equal(gezienOverzicht(sitesLijst, gezien, 9, "jos").gezien.length, 0, "wegklikken van een andere aankondiging telt mee");

console.log("aankondiging-gezien: ok");
