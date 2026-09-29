/**
 * Aimia 29-09: een ontwerpklus ("foto klein, CTA groot") werd na 90 s
 * afgebroken met "er ging bij ons iets mis". De AI hing niet: hij dacht na.
 * Standaard (display omitted) komt dat denkwerk als één stil blok binnen,
 * en de stiltewachter ziet dan niets. Proef: grootste stilte 17 s → 4 s met
 * display summarized. Deze test bewaakt de instelling, en dat het denkwerk
 * nooit als tekst bij de eigenaar belandt.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const agent = await readFile("lib/chat-agent.ts", "utf8");
const aanroep = agent.slice(agent.indexOf("client.beta.messages.stream("), agent.indexOf("{ signal: kap }"));
assert.ok(/thinking: \{ type: "adaptive", display: "summarized" \}/.test(aanroep), "het denkwerk komt weer als één stil blok binnen (stiltewachter grijpt dan onterecht in)");
// Alleen gewone tekst gaat naar de eigenaar, nooit het denkwerk
assert.ok(/event\.delta\.type === "text_delta"\) \{\s*beurtTekst \+= event\.delta\.text;/.test(agent), "de tekst-doorgifte is veranderd");
assert.ok(!/thinking_delta[\s\S]{0,200}opGebeurtenis\(\{ soort: "tekst"/.test(agent), "het denkwerk wordt als tekst aan de eigenaar getoond");
// De stiltewachter zelf blijft staan (vangnet voor echte haperingen)
assert.ok(/const STILTE_MS = 90_000;/.test(agent), "de stiltewachter is weg of veranderd");

console.log("denken-zichtbaar: denkwerk sijpelt door (geen valse stilte), eigenaar ziet alleen tekst");
