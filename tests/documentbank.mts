/**
 * Documentenbank: de pdf's op de site terugzien, opnieuw plaatsen en
 * opruimen. Zelfde regels als de andere drie banken — en één extra reden om
 * streng te zijn: een document weghalen waar nog een downloadknop naar wijst
 * levert een dode knop op de site op.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const route = await readFile("app/api/documentbank/route.ts", "utf8");
const ui = await readFile("app/portal/DocumentBank.tsx", "utf8");
const chat = await readFile("app/portal/Chat.tsx", "utf8");

// 1. Alleen pdf's, en de bank leest de stand van het openstaande concept
assert.ok(/const IS_DOCUMENT = \/\\\.pdf\$\/i;/.test(route), "de bank beperkt zich niet tot pdf's");
assert.ok(/laadWerkmap\(site\.githubRepo, openConcept\?\.branch/.test(route), "de bank kijkt niet naar het openstaande concept");

// 2. Zelfde bescherming als de andere banken
assert.ok(
  /openConcept\?\.branch \? \[openConcept\.branch, undefined\] : \[undefined\]/.test(route),
  "er wordt niet zowel in het concept als in de gepubliceerde versie gekeken",
);
assert.ok(/downloadlink naar dit document/.test(route), "de weigering legt niet uit dat er nog een link naartoe wijst");
assert.ok(
  /for \(const tak of openConcept\?\.branch \? \["main", openConcept\.branch\] : \["main"\]\)/.test(route),
  "verwijderen raakt niet beide takken",
);
assert.ok(/In de demo kun je niets verwijderen/.test(route), "demo-slot ontbreekt");

// 3. Opruimen alleen bij documenten waar niets naar linkt
assert.ok(/\{!d\.inGebruik &&/.test(ui), "opruimknop wordt ook getoond bij een document dat nog gelinkt is");
assert.ok(/site-weergave\/\$\{previewAccess\}/.test(ui), "je kunt het document niet openen om te controleren");

// 4. Bereikbaar via het paperclip-menu
assert.ok(chat.includes("Documentenbank") && /setDocBankOpen\(true\)/.test(chat), "de bank zit niet in het bijlagemenu");

console.log("documentbank: alleen pdf's, dode downloadknoppen uitgesloten, bereikbaar via het menu");
