/**
 * Een hangende beurt mag nooit meer 800 s stil blijven tot de platform-kill
 * (20-09: play-knop-beurt hing 13 minuten zonder één melding; stoppen en
 * opnieuw proberen kon pas toen het slot vanzelf verviel). Twee vangrails:
 * 1. Geen netwerk-aanroep zonder tijdslimiet (GitHub, werkmap-download, R2).
 * 2. De chat trekt zelf aan de noodrem als de beloofde afrondtijd ruim
 *    verstreken is: stoppen, slot vrij, eerlijke melding "lag aan ons,
 *    probeer het nog een keer".
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1a. GitHub: token, gewone aanroepen en merge hebben allemaal een limiet
const github = await readFile("lib/github.ts", "utf8");
assert.ok(
  (github.match(/AbortSignal\.timeout\(/g) ?? []).length >= 3,
  "niet elke GitHub-aanroep heeft een tijdslimiet (token, gh, merge)",
);

// 1b. Werkmap: commit-check en tarball-download
const werkmap = await readFile("lib/werkmap.ts", "utf8");
assert.ok(
  (werkmap.match(/AbortSignal\.timeout\(/g) ?? []).length >= 2,
  "de werkmap-download kan nog eindeloos hangen",
);

// 1c. Rendi (videoverwerker): status, uploads en opdracht — en de download
// van de klaargezette video in de chatroute (haalBinair)
const rendi = await readFile("lib/rendi.ts", "utf8");
assert.ok(
  (rendi.match(/AbortSignal\.timeout\(/g) ?? []).length >= 4,
  "niet elke Rendi-aanroep heeft een tijdslimiet",
);
const route = await readFile("app/api/chat/route.ts", "utf8");
const haalBinair = route.slice(route.indexOf("const haalBinair"), route.indexOf("const haalBinair") + 500);
assert.ok(/AbortSignal\.timeout\(/.test(haalBinair), "de videodownload in de chatroute kan nog eindeloos hangen");

// 1d. R2: elke poging binnen metHerkansing is begrensd
const r2 = await readFile("lib/r2.ts", "utf8");
assert.ok(/geen antwoord binnen 30 s/.test(r2), "R2-aanroepen hebben geen tijdslimiet per poging");
assert.ok(
  r2.indexOf("geen antwoord binnen 30 s") < r2.indexOf("if (res.status < 500"),
  "de R2-tijdslimiet zit niet ín de herkansingslus",
);

// 2. De noodrem in de chat: ruim na de beloofde tijd zelf stoppen met een
// eerlijke melding, zodat het slot vrijkomt en opnieuw proberen kan
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/stopReden/.test(chat), "de noodrem-administratie (stopReden) ontbreekt");
assert.ok(
  /wachtSec < PORTAAL_BEURT_S \+ 120/.test(chat),
  "de noodrem hangt niet aan de beloofde beurtgrens (PORTAAL_BEURT_S + marge)",
);
const noodrem = chat.slice(chat.indexOf("NOODREM"), chat.indexOf("NOODREM") + 900);
assert.ok(/stopReden\.current = "hang";\s*\n\s*stop\(\);/.test(noodrem), "de noodrem stopt de beurt niet echt");
assert.ok(/lag aan ons, niet aan jou/.test(chat), "de eerlijke hang-melding ontbreekt");
assert.ok(/Probeer het gewoon nog een keer/.test(chat), "de melding nodigt niet uit om opnieuw te proberen");
// De noodrem-melding moet de hang-variant zijn, niet de neutrale stop-tekst
assert.ok(
  /stopReden\.current === "hang"/.test(chat),
  "bij een hang krijgt de eigenaar nog de neutrale 'gestopt'-melding",
);
// En elke beurt begint met een schone lei
assert.ok(/stopReden\.current = null;/.test(chat), "stopReden wordt niet teruggezet bij een nieuwe beurt");

console.log("noodrem: netwerk-aanroepen zijn begrensd en een hangende beurt stopt zichzelf met een eerlijke melding");
