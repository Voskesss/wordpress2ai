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
console.log("✓ typveld blijft zichtbaar in de gesplitste weergave");
