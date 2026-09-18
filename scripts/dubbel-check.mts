/**
 * Dubbel-check voor EIGEN wijzigingen (Claude Code / Jos) aan een klantsite:
 * hetzelfde mechanische vangnet als de portaalchat (lib/consistentie.ts),
 * maar dan tegen de git-historie. Vergelijkt de huidige stand van de map
 * (inclusief niet-gecommit werk) met een basis-ref en meldt elke tekst of
 * foto die op één plek is veranderd maar elders exact zo is blijven staan.
 *
 *   npx tsx scripts/dubbel-check.mts <repo-of-map> [basisref]
 *
 * Basisref standaard origin/main. Afsluitcode 1 bij meldingen — bewust
 * "alleen hier"? Dan is de melding je bevestiging en ga je gewoon door.
 */
import { execFileSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { dubbelingsMeldingen } from "../lib/consistentie";

const [doel, basisArg] = process.argv.slice(2);
if (!doel) {
  console.error("Gebruik: dubbel-check.mts <repo-of-map> [basisref]");
  process.exit(1);
}
const map = (await stat(doel).catch(() => null))?.isDirectory()
  ? path.resolve(doel)
  : path.join(homedir(), "wordswap-klanten", doel);
const basis = basisArg ?? "origin/main";

const git = (...args: string[]) =>
  execFileSync("git", ["-C", map, ...args], { encoding: "utf8" });
// Voor git show op nieuwe bestanden: geen "fatal"-ruis op stderr
const stilleGit = (...args: string[]) =>
  execFileSync("git", ["-C", map, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

try {
  git("rev-parse", "--verify", basis);
} catch {
  console.error(`Basisref ${basis} bestaat niet in ${map}.`);
  process.exit(1);
}

// Gewijzigd = alles wat afwijkt van de basis: commits én niet-gecommit werk
const gewijzigd = [
  ...new Set(
    git("diff", "--name-only", basis)
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.endsWith(".html")),
  ),
];
if (!gewijzigd.length) {
  console.log(`Geen gewijzigde pagina's ten opzichte van ${basis}.`);
  process.exit(0);
}

const meldingen = await dubbelingsMeldingen({
  werkmap: map,
  gewijzigd,
  oudeInhoud: async (pad) => {
    try {
      return stilleGit("show", `${basis}:${pad}`);
    } catch {
      return null; // bestond nog niet op de basis
    }
  },
});

console.log(`Vergeleken met ${basis}: ${gewijzigd.length} gewijzigde pagina('s).`);
if (!meldingen.length) {
  console.log("Geen achtergebleven dubbelingen — tekst- en fotowijzigingen zijn overal doorgevoerd.");
  process.exit(0);
}
for (const m of meldingen) console.log(m);
console.log('\nBeoordeel elke melding: overal doorvoeren, of bewust "alleen hier" (dan is dit je bevestiging).');
process.exit(1);
