/**
 * Caching van het groeiende gesprek in de chat-motor (28-09). Zonder deze
 * markering ging alles na de systeemprompt (opdracht, plattegrond, alles wat
 * al gelezen was) elke stap opnieuw tegen de volle prijs mee: een klein nieuw
 * bericht op de grote EVC-site kostte 53 cent en liep tegen het plafond per
 * opdracht. Deze test bewaakt dat beide cachepunten blijven staan.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const agent = await readFile("lib/chat-agent.ts", "utf8");
const aanroep = agent.slice(agent.indexOf("client.beta.messages.stream("), agent.indexOf("{ signal: kap }"));
assert.ok(aanroep.length > 0, "de stream-aanroep van de chat-motor is niet gevonden");

// 1. Automatische caching op het gesprek zelf (top-level, schuift elke stap mee)
assert.ok(
  /\n\s*cache_control: \{ type: "ephemeral" \},\n/.test(aanroep.slice(0, aanroep.indexOf("system:"))),
  "de automatische caching op het groeiende gesprek ontbreekt (elke stap betaalt dan weer de volle prijs)",
);
// 2. De vaste systeemprompt houdt zijn eigen, gegarandeerde leespunt
assert.ok(
  /text: opties\.systeem, cache_control: \{ type: "ephemeral" \}/.test(aanroep),
  "de cachemarkering op de systeemprompt is weg",
);
// 3. Hooguit 4 markeringen per verzoek (API-grens); nu 2
assert.ok((aanroep.match(/cache_control/g) ?? []).length <= 4, "meer dan 4 cachemarkeringen: de API weigert dat");
// 4. Beide TTL's gelijk (5 minuten): een langere TTL ná een kortere geeft een 400
assert.ok(!/ttl:\s*"1h"/.test(aanroep), "een 1-uur-TTL na de 5-minuten-markering breekt de volgorderegel van de API");

// 5. De kostenberekening telt cache-lezen en -schrijven eerlijk mee
assert.ok(/cacheLees \* prijsIn \* 0\.1/.test(agent), "cache-lezen wordt niet tegen 10% van de prijs geteld");
assert.ok(/cacheSchrijf \* prijsIn \* 1\.25/.test(agent), "cache-schrijven wordt niet tegen 125% van de prijs geteld");

console.log("gesprek-cache: automatische caching op het gesprek + vaste markering op de systeemprompt");
