import assert from "node:assert/strict";
import { extraGeldt, huidigeMaand, maandbudgetVoor, vervaltOp } from "../lib/ai-budget";

const basis = { aiMaandbudgetUsd: 15, aiExtraUsd: 0, aiExtraMaand: null };
const metExtra = { aiMaandbudgetUsd: 15, aiExtraUsd: 20, aiExtraMaand: "2026-09" };

// Zonder extra: gewoon het vaste budget
assert.equal(maandbudgetVoor(basis, "2026-09"), 15);
assert.equal(extraGeldt(basis, "2026-09"), false);

// Met extra in dezelfde maand: telt op
assert.equal(maandbudgetVoor(metExtra, "2026-09"), 35);
assert.equal(extraGeldt(metExtra, "2026-09"), true);

// Volgende maand vervalt de extra vanzelf — niemand hoeft iets terug te zetten
assert.equal(maandbudgetVoor(metExtra, "2026-10"), 15);
assert.equal(extraGeldt(metExtra, "2026-10"), false);
// Ook een maand ervoor telt hij niet mee
assert.equal(maandbudgetVoor(metExtra, "2026-08"), 15);

// Rommelige waarden doen niets
assert.equal(maandbudgetVoor({ aiMaandbudgetUsd: 15, aiExtraUsd: 20, aiExtraMaand: null }, "2026-09"), 15);
assert.equal(maandbudgetVoor({ aiMaandbudgetUsd: 15, aiExtraUsd: 0, aiExtraMaand: "2026-09" }, "2026-09"), 15);
assert.equal(maandbudgetVoor({ aiMaandbudgetUsd: 15, aiExtraUsd: null, aiExtraMaand: "2026-09" }, "2026-09"), 15);

// Vervaldatum is de 1e van de maand erna, ook over het jaar heen
assert.equal(vervaltOp("2026-09"), "2026-10-01");
assert.equal(vervaltOp("2026-12"), "2027-01-01");

// Huidige maand is YYYY-MM
assert.match(huidigeMaand(), /^\d{4}-\d{2}$/);
assert.equal(huidigeMaand(new Date("2026-09-17T10:00:00Z")), "2026-09");
// Net na middernacht Nederlandse tijd hoort bij de nieuwe maand
assert.equal(huidigeMaand(new Date("2026-09-30T22:30:00Z")), "2026-10");

console.log("PASS ai-budget: eenmalige extra telt alleen in zijn eigen maand en vervalt vanzelf.");
