import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { maakBestandsSlot, vervangInBestand } from "../lib/chat-agent";

// Bootst de Van Dijk-fout na: de AI past vier teksten in hetzelfde bestand tegelijk aan.
const map = await mkdtemp(path.join(tmpdir(), "bestandsslot-"));
const pagina = path.join(map, "index.html");
const origineel = `<!doctype html><html><body>
<p>Tekst een: oud</p>
<p>Tekst twee: oud, met wat langere inhoud zodat de lengtes verschillen</p>
<p>Tekst drie: oud</p>
<p>Tekst vier: 10 jaar garantie (oud)</p>
</body></html>
`;
try {
  // 1. Zonder slot gaat het mis (bewijs dat de test de fout echt nabootst)
  await writeFile(pagina, origineel);
  await Promise.all([
    vervangInBestand(pagina, "Tekst een: oud", "Tekst een: NIEUW", false),
    vervangInBestand(pagina, "Tekst twee: oud, met wat langere inhoud zodat de lengtes verschillen", "Tekst twee: NIEUW", false),
    vervangInBestand(pagina, "Tekst drie: oud", "Tekst drie: NIEUW", false),
    vervangInBestand(pagina, "10 jaar garantie (oud)", "10 jaar garantie (NIEUW)", false),
  ]);
  const zonder = await readFile(pagina, "utf8");
  const zonderAantal = (zonder.match(/NIEUW/g) ?? []).length;
  assert.ok(zonderAantal < 4, `zonder slot verwachtten we verloren wijzigingen, maar alle 4 kwamen door`);

  // 2. Met slot komen alle vier de wijzigingen door, en blijft de pagina heel
  await writeFile(pagina, origineel);
  const opBestand = maakBestandsSlot();
  const uitkomsten = await Promise.all([
    opBestand(pagina, () => vervangInBestand(pagina, "Tekst een: oud", "Tekst een: NIEUW", false)),
    opBestand(pagina, () => vervangInBestand(pagina, "Tekst twee: oud, met wat langere inhoud zodat de lengtes verschillen", "Tekst twee: NIEUW", false)),
    opBestand(pagina, () => vervangInBestand(pagina, "Tekst drie: oud", "Tekst drie: NIEUW", false)),
    opBestand(pagina, () => vervangInBestand(pagina, "10 jaar garantie (oud)", "10 jaar garantie (NIEUW)", false)),
  ]);
  assert.ok(uitkomsten.every((u) => u.ok), "alle bewerkingen melden gelukt");
  const met = await readFile(pagina, "utf8");
  assert.equal((met.match(/NIEUW/g) ?? []).length, 4, "alle vier de wijzigingen staan in het bestand");
  assert.equal((met.match(/<\/html>/g) ?? []).length, 1, "geen restje oude tekst (dubbele </html>)");
  assert.ok(!met.includes("(oud)") && !met.includes(": oud"), "geen oude tekst meer over");

  // 3. Dollartekens in nieuwe tekst blijven letterlijk staan (geen $&-vervanging)
  await vervangInBestand(pagina, "Tekst een: NIEUW", "Prijs: $& en $1 per maand", false);
  assert.ok((await readFile(pagina, "utf8")).includes("Prijs: $& en $1 per maand"), "dollartekens letterlijk");

  // 4. Een fout in één bewerking blokkeert de volgende niet
  const na = await Promise.all([
    opBestand(pagina, () => vervangInBestand(pagina, "bestaat niet", "x", false)),
    opBestand(pagina, () => vervangInBestand(pagina, "Tekst drie: NIEUW", "Tekst drie: NOG NIEUWER", false)),
  ]);
  assert.equal(na[0].ok, false);
  assert.equal(na[1].ok, true);
  console.log(`PASS bestandsslot: zonder slot ${zonderAantal}/4 wijzigingen, met slot 4/4, pagina heel, dollartekens letterlijk.`);
} finally {
  await rm(map, { recursive: true, force: true });
}
