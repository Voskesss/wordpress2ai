/** In de gesplitste werkweergave staan gesprek, typveld en tip onder elkaar in
 * een flexkolom. Bij weinig hoogte kromp alles naar verhouding mee, ook het
 * typveld: dat viel half weg (Jos, 01-10-2026, op dev met de portaalbalk, die
 * 56 pixels hoogte kost). Het gesprek moet de ruimte inleveren (dat scrolt),
 * het typveld en de tip nooit.
 * Draaien: node --import tsx tests/chat-typveld-zichtbaar.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const chat = await readFile("app/portal/Chat.tsx", "utf8");
const balk = chat.slice(chat.indexOf("{/* Invoerbalk */}"), chat.indexOf("{/* Invoerbalk */}") + 1200);
assert.ok(/className=\{`shrink-0 \$\{smalleBalk/.test(balk), "de invoerbalk mag krimpen, dan valt het typveld weg");
assert.ok(chat.includes('<div className="mt-2.5 flex shrink-0 justify-center px-2">'), "de tip mag krimpen en drukt het typveld weg");
assert.ok(/"flex w-\[26rem\][^"]*overflow-y-auto overflow-x-hidden/.test(chat), "de kolom krijgt een horizontale schuifbalk");
// Het gesprek zelf moet wél kunnen krimpen en scrollen
assert.ok(chat.includes('splitModus || mobielChat ? "flex min-h-0 flex-1 flex-col" : ""'), "het gesprek kan niet meer krimpen");

// Tweede oorzaak (01-10, schermafbeelding zonder voorbeeldtekst): de chat blijft
// gemount in een verborgen tabblad. Daar is scrollHeight 0, en het veld werd
// dan 0 hoog vastgezet. Nooit 0 vastzetten, opnieuw meten bij nieuwe breedte,
// en een minimumhoogte als vangnet.
assert.ok(chat.includes('el.style.height = h > 0 ? `${Math.min(h, 120)}px` : "";'), "het typveld kan 0 hoog vastgezet worden");
assert.ok(chat.includes("new ResizeObserver(") && chat.includes("pasInvoerHoogteAan();\n    });"), "het typveld meet niet opnieuw als het zichtbaar wordt");
assert.ok(chat.includes("leading-snug min-h-[2.5rem] max-h-[120px]"), "het typveld heeft geen minimumhoogte");
console.log("✓ typveld blijft zichtbaar in de gesplitste weergave en na wisselen van tabblad");
