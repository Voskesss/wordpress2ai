import assert from "node:assert/strict";
import { inlogPaginas } from "../lib/cloudflare";

// Elke site krijgt alleen /wordswap — nooit /inloggen (kan botsen met eigen pagina's)
{
  const uit = inlogPaginas(["index.html", "contact/index.html"]);
  assert.deepEqual(uit.map((p) => p.pad), ["wordswap/index.html"]);
  const html = uit[0].data.toString();
  assert.match(html, /noindex/);
  assert.match(html, /sign-in\?redirect_url=%2Fportal/);
  assert.match(html, /Klik hier/);
}
{
  const uit = inlogPaginas(["index.html", "inloggen/index.html"]);
  assert.deepEqual(uit.map((p) => p.pad), ["wordswap/index.html"]);
}
console.log("PASS inlogroute: alleen /wordswap, met noindex en nette terugvallink.");
