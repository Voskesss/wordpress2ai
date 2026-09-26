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

// 2. Beide wachtstappen van de eigen lus lopen door de wekker: elk
//    stroom-event en het afronden van een beurt
for (const stap of ["metWekker(events.next())", "metWekker(stream.finalMessage())"]) {
  assert.ok(agent.includes(stap), `wachtstap zonder wekker: ${stap}`);
}

// 3. Bij stilte wordt alles echt afgebroken (noodstop zit in het stream-signaal)
assert.ok(/noodstop\.signal/.test(agent) && (agent.match(/noodstop\.abort\(\)/g) ?? []).length >= 2, "de noodstop ontbreekt of wordt bij stilte niet getrokken");

// 4. De kapotte SDK-runner mag nooit terugkomen: de eigen lus stuurt zelf
//    (gereedschap uitvoeren, tool_result terug, stop_reason afhandelen)
assert.ok(!/toolRunner|betaZodTool/.test(agent), "de SDK-tool-runner is teruggekomen in de chat-agent");
for (const eigen of ["stop_reason", "tool_result", "safeParse"]) {
  assert.ok(agent.includes(eigen), `de eigen lus mist zijn ${eigen}-afhandeling`);
}

// 5. Stilte is een storing, geen te grote opdracht: de agent geeft het apart
//    terug en de chat zegt dan eerlijk "er ging bij ons iets mis" in plaats
//    van de eigenaar te laten opknippen (les 26-09: "maak een referentie-
//    pagina" kreeg onterecht "dit verzoek is te groot").
assert.ok(/stilteGeraakt\?: boolean/.test(agent) && (agent.match(/stilteGeraakt = true;/g) ?? []).length >= 2, "de agent geeft stilte niet meer apart terug");
const route = await readFile(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
assert.ok(/Er ging bij ons iets mis waardoor ik mijn werk niet kon afmaken/.test(route), "de eerlijke storingstekst zonder gebouwd werk is verdwenen");
assert.ok(/staat als concept voor je klaar/.test(route), "de eerlijke storingstekst mét gebouwd werk is verdwenen");
assert.ok(!/te groot voor één keer\. Knip het op in kleinere stappen — /.test(route), "het lange streepje zit weer in de te-groot-tekst");

console.log("agent-stiltewachter: ok");
