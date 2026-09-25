/**
 * Meekijk-modus (25-09): een beheerder bekijkt een klantsite in het portaal
 * zoals de klant hem ziet, zonder de site eerst aan zichzelf te koppelen.
 * Kijken wel, beslissen niet: opzeggen en het opleveringsakkoord blijven van
 * de eigenaar zelf. Deze test bewaakt beide kanten, want de gevaarlijke
 * regressie is stil: een beheerder die per ongeluk namens de klant opzegt.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../app/portal/page.tsx", import.meta.url), "utf8");
const acties = await readFile(new URL("../app/portal/acties.ts", import.meta.url), "utf8");
const admin = await readFile(new URL("../app/admin/klant/[id]/page.tsx", import.meta.url), "utf8");

// 1. De portaalpagina kent de meekijk-modus: alleen voor een beheerder, nooit voor een demo
assert.ok(/await isBeheerder\(\)/.test(page.split("let meekijk")[1]?.split("mijnSites = [extra]")[0] ?? ""),
  "meekijk wordt niet meer op beheerder gecontroleerd");
assert.ok(page.includes("if (extra && !extra.isDemo)"), "de demo-uitsluiting bij meekijk is verdwenen");
assert.ok(page.includes("Meekijk-modus"), "de gele meekijk-balk is verdwenen uit het portaal");

// 2. Klant-beslissingen eisen de eigenaar zelf, ook als een beheerder ze aanroept
assert.ok(/async function alleenEigenaar[\s\S]*?site\.clerkUserId !== userId\) return null/.test(acties),
  "de alleenEigenaar-poort is verdwenen of controleert de eigenaar niet meer");
for (const fn of ["zegAbonnementOp", "trekOpzeggingIn", "geefWebsiteAkkoord"]) {
  const body = acties.split(`export async function ${fn}`)[1]?.slice(0, 200) ?? "";
  assert.ok(body.includes("alleenEigenaar("), `${fn} loopt niet meer door de alleenEigenaar-poort`);
}

// 3. De knop op de admin-klantpagina wijst naar het portaal met de site erbij
assert.ok(admin.includes("Bekijk als klant") && admin.includes("/portal?site=${site.id}"),
  "de knop 'Bekijk als klant' ontbreekt op de admin-klantpagina");

console.log("meekijk: ok");
