import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afgevinkteSleutels, pasAfvinkenToe, type LivegangCheck } from "../lib/livegang";

/**
 * Zelf afvinken in de livegang-checklist (wens Jos, 02-10-2026). Aanleiding:
 * Search Console bij Van den Berg. Die kan de klant zelf via een bestand
 * geverifieerd hebben; dat zien wij niet, en dan bleef het punt eeuwig open.
 * Wat nu misgaat voor bezoekers (rood) mag je NIET wegklikken.
 */

const checks: LivegangCheck[] = [
  { sleutel: "zoekconsole", label: "Google Search Console", ok: false, uitleg: "" },
  { sleutel: "online", label: "Domein toont de nieuwe site", ok: false, uitleg: "", dringend: true },
  { sleutel: "status", label: "Status op Actief", ok: true, uitleg: "" },
];

const na = pasAfvinkenToe(checks, ["zoekconsole", "online", "status"]);
const vind = (s: string) => na.find((c) => c.sleutel === s)!;
assert.equal(vind("zoekconsole").ok, true, "zelf afvinken werkt niet");
assert.equal(vind("zoekconsole").handmatig, true, "afgevinkt punt is niet herkenbaar als zelf afgevinkt");
assert.equal(vind("online").ok, false, "een dringend punt laat zich wegklikken");
assert.equal(vind("status").handmatig, undefined, "een gemeten groen punt heet ineens zelf afgevinkt");
assert.equal(pasAfvinkenToe(checks, []).filter((c) => c.ok).length, 1, "zonder afvinken verandert er iets");

assert.deepEqual(afgevinkteSleutels({ livegangAfgevinkt: "zoekconsole, testbericht," }), ["zoekconsole", "testbericht"]);
assert.deepEqual(afgevinkteSleutels({ livegangAfgevinkt: null }), []);

// Het hangt echt aan de checklist, de knop en de kolom
const livegang = await readFile(new URL("../lib/livegang.ts", import.meta.url), "utf8");
assert.ok(livegang.includes("return pasAfvinkenToe(checks, afgevinkteSleutels(site));"), "livegangChecks past het afvinken niet toe");
const lijst = await readFile(new URL("../app/admin/klant/[id]/LivegangChecklist.tsx", import.meta.url), "utf8");
assert.ok(lijst.includes("zetLivegangAfgevinkt"), "de checklist heeft geen afvinkknop");
const migratie = await readFile(new URL("../db/migrations/20261002-livegang-afgevinkt.sql", import.meta.url), "utf8");
assert.match(migratie, /livegang_afgevinkt/);

console.log("livegang-afvinken: ok");
