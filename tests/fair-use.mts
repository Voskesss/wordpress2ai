/**
 * De pakketbelofte is fair use, geen streepjeslijst. "Maximaal 30 nieuwe
 * concepten per maand" bleek niet waar te maken (20-09: een klant werd al bij
 * 8 geblokkeerd door de AI-ruimte), dus die belofte staat nergens meer — en
 * het aantal wijzigingen begrenst ook niets meer.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

for (const pad of ["app/page.tsx", "app/prijzen/page.tsx", "app/layout.tsx", "lib/aanbod.ts"]) {
  const t = await readFile(pad, "utf8");
  assert.ok(!/30 (nieuwe )?concepten/.test(t), `${pad} belooft nog steeds 30 concepten`);
  assert.ok(!/maximaal 30/i.test(t), `${pad} belooft nog steeds een maximum van 30`);
}

// De belofte die er wél staat: fair use met een gesprek in plaats van een slot
const prijzen = await readFile("app/prijzen/page.tsx", "utf8");
assert.ok(/fair use/i.test(prijzen), "fair use wordt niet meer genoemd op de prijzenpagina");
assert.ok(/nooit zomaar op slot|spreken we samen/.test(prijzen), "er staat niet bij wat er gebeurt bij veel gebruik");

// Geen harde blokkade meer op het aantal wijzigingen
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(!/wijzigingenLimietVoor/.test(route), "de chat blokkeert nog op het aantal wijzigingen");
assert.ok(!/maximale aantal wijzigingen bereikt/.test(route), "de oude blokkademelding staat er nog");
// En als de AI-ruimte wél op is, klinkt dat als een uitnodiging, niet als een deur
assert.ok(/info@wordswap\.nl/.test(route), "de melding zegt niet hoe je contact opneemt");
assert.ok(/website blijft gewoon online/.test(route), "de melding stelt niet gerust over de site zelf");

console.log("fair-use: geen 30-belofte meer, geen harde wijzigingenrem, en een menselijke melding");
