import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * De demo wordt elk uur teruggezet. Zat er iemand midden in een opdracht, dan
 * werkte die door aan een tak die niet meer bestond en bleef bij hem "De AI is
 * bezig" eeuwig staan. Juist bij een demo is dat de bezoeker die je binnen
 * wilde halen.
 *
 * De reset zet nu een stempel, een lopende klus ziet die en stopt zichzelf,
 * en de bezoeker krijgt te horen wat er gebeurd is.
 */

const chat = await readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
const reset = await readFile(new URL("../app/api/demo-reset/route.ts", import.meta.url), "utf8");

// 1. De reset stempelt vóórdat hij de administratie wist
assert.ok(reset.includes("demoResetOp: new Date()"), "de reset zet geen stempel");
assert.ok(
  reset.indexOf("demoResetOp: new Date()") < reset.indexOf("delete(changes)"),
  "de stempel wordt pas gezet nadat de wijzigingen al gewist zijn"
);

// 2. Alleen de demo krijgt een wachter; een klantsite wordt nooit onderbroken
assert.ok(chat.includes("const demoWachter = site.isDemo"), "de wachter draait ook op klantsites");
assert.ok(chat.includes("if (demoWachter) clearInterval(demoWachter)"), "de wachter blijft lopen na afloop");

// 3. De wachter stopt de klus echt
const wachter = chat.slice(chat.indexOf("const demoWachter"), chat.indexOf("const wekker"));
assert.ok(wachter.includes("stopper.abort()"), "de wachter stopt de lopende klus niet");
assert.ok(wachter.includes("> startTijd"), "een oude stempel zou elke nieuwe opdracht meteen stoppen");

// 4. En de bezoeker hoort het, over een kanaal dat de chat kent
const meldingen = [...chat.matchAll(/type: "klaar",\s*\n\s*reply:\s*"De demo is zojuist ververst/g)];
assert.equal(meldingen.length, 2, "de melding gaat niet over het kanaal van het gewone antwoord");
assert.ok(!/type: "bericht"/.test(chat), "er wordt een berichttype gebruikt dat de chat negeert");

// 5. De afsprakencontrole wordt in de demo overgeslagen: 90 seconden wachten
//    na "concept klaar" is precies het moment waarop iemand wegklikt
assert.ok(
  chat.includes("tijdOp || restS < 90 || site.isDemo"),
  "de demo wacht nog op de afsprakencontrole"
);

// 6. De geldrem is meegegroeid met het duurdere model, anders wordt een klus
//    halverwege afgekapt en ziet de bezoeker werk dat niet af is
const rem = chat.slice(chat.indexOf("const requestBudgetUsd"), chat.indexOf("const requestBudgetUsd") + 400);
const perOpdracht = Number(rem.match(/site\.isDemo \? ([\d.]+) : 0\.5/)?.[1]);
const perMaand = Number(rem.match(/site\.isDemo \? ([\d.]+) : maandbudgetVoor/)?.[1]);
assert.ok(perOpdracht >= 0.3, `${perOpdracht} per opdracht is te krap voor het grote model`);
assert.ok(perMaand >= perOpdracht * 10, "een bezoeker houdt geen tien opdrachten over");

console.log("demo-reset: ok");
