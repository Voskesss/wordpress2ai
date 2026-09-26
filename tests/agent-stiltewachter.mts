/**
 * De stiltewachter in de chat-agent (les EVC, 26-09, drie keer gereproduceerd).
 *
 * De tool-runner van de SDK verliest af en toe tussen twee beurten zijn
 * weksignaal: geen fout, geen lopend verzoek, lege wachtrij — eeuwige stilte
 * waar zelfs een abort niet meer bij kan. Elke tijdslimiet eromheen trok
 * daardoor aan een rem die nergens aan vastzat; klantbeurten hingen tot de
 * noodstop van het scherm na 12 minuten. Elke wachtstap heeft nu een eigen
 * wekker; anderhalve minuut totale stilte = opgeven en opleveren wat er is.
 * In de naspeelproef kwam de agent zo na 201 s netjes terug (voorheen: nooit).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const agent = await readFile(new URL("../lib/chat-agent.ts", import.meta.url), "utf8");

// 1. De wekker bestaat en staat op anderhalve minuut
assert.ok(/const STILTE_MS = 90_000;/.test(agent), "de stiltegrens is verdwenen of verplaatst");
assert.ok(/async function metWekker/.test(agent), "de stiltewachter-functie is verdwenen");

// 2. Álle vier de wachtstappen lopen door de wekker: volgende beurt, elk
//    stroom-event, het afronden van een beurt, en de allerlaatste done()
for (const stap of ["metWekker(buiten.next())", "metWekker(binnen.next())", "metWekker(beurtStream.finalMessage())", "metWekker(runner.done()"]) {
  assert.ok(agent.includes(stap), `wachtstap zonder wekker: ${stap}`);
}

// 3. Bij stilte wordt alles echt afgebroken (noodstop zit in het runner-signaal)
assert.ok(/noodstop\.signal/.test(agent) && (agent.match(/noodstop\.abort\(\)/g) ?? []).length >= 3, "de noodstop ontbreekt of wordt bij stilte niet getrokken");

// 4. En het is een nette uitkomst, geen crash: stilte zet limietBereikt
const stiltes = agent.split("=== stilte").length - 1;
assert.ok(stiltes >= 3, "de stilte-uitkomsten zetten niet overal limietBereikt");

// 5. Stilte is een storing, geen te grote opdracht: de agent geeft het apart
//    terug en de chat zegt dan eerlijk "er ging bij ons iets mis" in plaats
//    van de eigenaar te laten opknippen (les 26-09: "maak een referentie-
//    pagina" kreeg onterecht "dit verzoek is te groot").
assert.ok(/stilteGeraakt\?: boolean/.test(agent) && (agent.match(/stilteGeraakt = true;/g) ?? []).length >= 3, "de agent geeft stilte niet meer apart terug");
const route = await readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
assert.ok(/Er ging bij ons iets mis waardoor ik mijn werk niet kon afmaken/.test(route), "de eerlijke storingstekst zonder gebouwd werk is verdwenen");
assert.ok(/staat als concept voor je klaar/.test(route), "de eerlijke storingstekst mét gebouwd werk is verdwenen");
assert.ok(!/te groot voor één keer\. Knip het op in kleinere stappen — /.test(route), "het lange streepje zit weer in de te-groot-tekst");

console.log("agent-stiltewachter: ok");
