/** Draait een groep tests uit tests/lijst.json. De lijst staat daar met één
 * bestand per regel, zodat twee sessies tegelijk een test kunnen toevoegen
 * zonder botsing in package.json (dat gebeurde telkens bij die ene lange regel).
 *
 *   node scripts/tests-draaien.mjs test
 *   node scripts/tests-draaien.mjs chat-ui
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const groep = process.argv[2] ?? "test";
const lijst = JSON.parse(readFileSync("tests/lijst.json", "utf8"));
const bestanden = lijst[groep];
if (!Array.isArray(bestanden)) {
  console.error(
    `Onbekende groep "${groep}". Beschikbaar: ${Object.keys(lijst)
      .filter((k) => Array.isArray(lijst[k]))
      .join(", ")}`,
  );
  process.exit(1);
}

let gedaan = 0;
for (const bestand of bestanden) {
  const pad = `tests/${bestand}`;
  if (!existsSync(pad)) {
    console.error(`\n✖ ${pad} staat in tests/lijst.json maar bestaat niet.`);
    process.exit(1);
  }
  // .mts heeft de TypeScript-lader nodig, .cjs draait rechtstreeks
  const args = bestand.endsWith(".mts") ? ["--import", "tsx", pad] : [pad];
  const uit = spawnSync("node", args, { stdio: "inherit" });
  if (uit.status !== 0) {
    console.error(`\n✖ ${pad} faalde — gestopt (${gedaan} van ${bestanden.length} geslaagd).`);
    process.exit(uit.status ?? 1);
  }
  gedaan++;
}
console.log(`\n✓ ${gedaan} tests geslaagd (groep "${groep}").`);
