/**
 * Opruimen in de foto- en audiobank: mag alleen als het bestand NERGENS meer
 * op de site staat — niet in het openstaande concept en niet in de
 * gepubliceerde versie. Anders houdt een pagina een kapot plaatje of een
 * stille speler over. Ook: de fotobank opent standaard met alles zichtbaar
 * (het filter op oude versies stond altijd aan, wat verwarrend was).
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const foto = await readFile("app/api/fotobank/route.ts", "utf8");
const audio = await readFile("app/api/audiobank/route.ts", "utf8");
const bankUi = await readFile("app/portal/Fotobank.tsx", "utf8");
const github = await readFile("lib/github.ts", "utf8");

// 1. Beide banken hebben een DELETE die op gebruik controleert
for (const [naam, bron] of [["fotobank", foto], ["audiobank", audio]] as const) {
  assert.ok(/export async function DELETE/.test(bron), `${naam} mist een verwijderroute`);
  assert.ok(
    /openConcept\?\.branch \? \[openConcept\.branch, undefined\] : \[undefined\]/.test(bron),
    `${naam} controleert niet zowel het concept als de gepubliceerde versie`,
  );
  assert.ok(/409/.test(bron), `${naam} weigert een bestand dat nog in gebruik is niet`);
}

// 2. De demo mag niets verwijderen (gedeelde site)
assert.ok(/site\.isDemo\)? return NextResponse\.json\(\s*\{ error: "In de demo kun je niets verwijderen/.test(foto.replace(/\n\s*/g, " ")) || foto.includes("In de demo kun je niets verwijderen"), "demo-slot ontbreekt in de fotobank");

// 3. Verwijderen gebeurt in BEIDE takken, anders komt het bestand terug bij
//    de eerstvolgende publicatie (main-merge).
assert.ok(
  /for \(const tak of openConcept\?\.branch \? \["main", openConcept\.branch\] : \["main"\]\)/.test(foto),
  "fotobank verwijdert niet uit main én de conceptbranch",
);

// 4. De git-laag kan bestanden echt verwijderen (tree-regel zonder sha)
assert.ok(/export async function verwijderBestanden/.test(github), "verwijderBestanden ontbreekt");
assert.ok(/type: "blob", sha: null/.test(github), "verwijderen moet een tree-regel zonder sha zijn");

// 5. Fotobank toont standaard alles
assert.ok(/useState\(false\);?\s*\n\s*const \[wisVraag/.test(bankUi) || /const \[alleenOud, setAlleenOud\] = useState\(false\)/.test(bankUi), "het filter op oude versies staat nog standaard aan");
assert.ok(!bankUi.includes("useState(!vervangDoel)"), "oud gedrag (filter standaard aan) staat er nog");

// 6. Opruimen wordt alleen aangeboden bij foto's die niet in gebruik zijn
assert.ok(/!vervangDoel && !b\.inGebruik/.test(bankUi), "opruimknop wordt ook bij foto's op de site getoond");

// 7. Miniaturen komen uit dezelfde bron als de bank zelf (de bestanden van
//    de site), niet van de gepubliceerde worker: een net geüploade foto die
//    nog nergens geplaatst is staat wél in de bestanden maar nog niet op de
//    worker, en gaf dan een kapot plaatje (20-09).
assert.ok(/site-weergave\/\$\{previewAccess\}/.test(bankUi), "fotobank laadt miniaturen niet via /site-weergave");

console.log("banken-opruimen: verwijderen met in-gebruik-slot in foto- en audiobank, filter standaard uit");
