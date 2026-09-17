import assert from "node:assert/strict";
import {
  beschrijfProblemen,
  leesMeting,
  meetScript,
  paginasOmTeMeten,
  teBredePaginas,
} from "../lib/mobiel-render";

// Welke pagina's: gewijzigde HTML als URL-pad, geen bouwstenen of controlemap
assert.deepEqual(paginasOmTeMeten(["activiteiten/index.html", "index.html", "fotos/a.webp"]), ["/activiteiten/", "/"]);
assert.deepEqual(paginasOmTeMeten(["los.html", "delen/menu.html", "wp2ai-controle/x.html"]), ["/", "/los.html"]);
// Alleen stylesheet gewijzigd → in elk geval de home
assert.deepEqual(paginasOmTeMeten(["css/style.css"]), ["/"]);
// Alleen een foto → niets te meten
assert.deepEqual(paginasOmTeMeten(["fotos/nieuw.webp"]), []);
// Hooguit vier pagina's per keer
assert.equal(paginasOmTeMeten(["a/index.html", "b/index.html", "c/index.html", "d/index.html", "e/index.html"]).length, 4);

// Het meetscript is geldige JavaScript (escapes in de template kloppen)
assert.doesNotThrow(() => new Function(meetScript(["/contact/", "/over-'mij'/"])));

// Resultaat uitlezen, ook met een "<" in de HTML-fragmenten
const metingen = [
  { pad: "/", breedte: 390, boosdoeners: [] },
  { pad: "/activiteiten/", breedte: 391, boosdoeners: [] },
  {
    pad: "/contact/",
    breedte: 700,
    boosdoeners: [{ tag: "img", klasse: "groot", html: '<img src="x.png" style="width:700px">', ouder: "<body></script>" }],
  },
];
const gerenderd = `<html data-wp2ai-klaar="1"><body><p>x</p><script type="application/json" id="wp2ai-mobiel">${JSON.stringify(
  metingen,
).replace(/</g, "\\u003c")}</script></body></html>`;
assert.deepEqual(leesMeting(gerenderd), metingen);
assert.equal(leesMeting("<html><body>geen meting</body></html>"), null);
assert.equal(leesMeting('<script type="application/json" id="wp2ai-mobiel">{kapot</script>'), null);

// 1 px speling voor afronding; echt te breed wordt gemeld
assert.deepEqual(teBredePaginas(metingen).map((p) => p.pad), ["/contact/"]);

// Opdracht voor de AI noemt pagina, breedte en het uitstekende element
const tekst = beschrijfProblemen(teBredePaginas(metingen));
assert.match(tekst, /\/contact\/ is 700px breed/);
assert.match(tekst, /<img class="groot">/);
assert.match(tekst, /width:700px/);

console.log("PASS mobiel-render: paginakeuze, geldig meetscript, uitlezen, afronding en AI-opdracht.");
