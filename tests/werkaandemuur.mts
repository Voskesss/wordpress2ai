import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { grootsteBeeld, leesKunstwerk, sessieCookie, vandaagNl } from "../lib/werkaandemuur";

// De sessiecookie moet exact zijn wat de WordPress-plugin stuurt:
// md5(apiKey + artistId + datum) — anders geeft de API 404.
{
  const g = { artistId: "13473", apiKey: "geheim" };
  const verwacht = createHash("md5").update("geheim134732026-09-20").digest("hex");
  assert.equal(await sessieCookie(g, "2026-09-20"), verwacht);
  // Een andere dag geeft een andere cookie
  assert.notEqual(await sessieCookie(g, "2026-09-21"), verwacht);
}

// Datum in Nederlandse tijd, formaat YYYY-MM-DD
assert.match(vandaagNl(new Date("2026-09-20T22:30:00Z")), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(vandaagNl(new Date("2026-09-20T12:00:00Z")), "2026-09-20");

// Een werk uit het API-antwoord lezen
{
  const w = leesKunstwerk({
    id: 1948905,
    title: 'Glinsterende Zonnedauw in Detail',
    link: "https://www.werkaandemuur.nl/nl/shopwerk/Glinsterende-Zonnedauw-in-Detail/1948905",
    imagesHttps: { "500x500": "https://static.ohmyprints.net/1/abc/500x500.jpg", "950x600": "https://static.ohmyprints.net/1/abc/950x600.jpg" },
  });
  assert.ok(w);
  assert.equal(w.titel, "Glinsterende Zonnedauw in Detail");
  assert.equal(w.id, 1948905);
  assert.equal(grootsteBeeld(w.beelden), "https://static.ohmyprints.net/1/abc/950x600.jpg");
}

// Zonder titel of link valt er niets te tonen
assert.equal(leesKunstwerk({ title: "Zonder link" }), null);
assert.equal(leesKunstwerk({ link: "https://x.nl" }), null);
assert.equal(leesKunstwerk(null), null);
// Geen beelden: dan ook geen beeld-URL, maar geen crash
assert.equal(grootsteBeeld({}), null);

console.log("werkaandemuur: alle checks geslaagd");
