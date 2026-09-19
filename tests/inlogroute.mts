import assert from "node:assert/strict";
import { inlogPaginas } from "../lib/cloudflare";

// Elke site krijgt /wordswap, en /inloggen alleen als hij die zelf niet heeft
{
  const uit = inlogPaginas(["index.html", "contact/index.html"]);
  assert.deepEqual(uit.map((p) => p.pad), ["wordswap/index.html", "inloggen/index.html"]);
  const html = uit[0].data.toString();
  assert.match(html, /noindex/);
  assert.match(html, /sign-in\?redirect_url=%2Fportal/);
  assert.match(html, /Klik hier/);
}
// Site met een eigen inlogpagina: /inloggen blijft van de site zelf
for (const eigen of ["inloggen/index.html", "inloggen.html", "Inloggen.htm"]) {
  const uit = inlogPaginas(["index.html", eigen]);
  assert.deepEqual(uit.map((p) => p.pad), ["wordswap/index.html"], eigen);
}
console.log("PASS inlogroute: /wordswap altijd, /inloggen alleen zonder eigen inlogpagina, noindex en nette terugvallink.");
