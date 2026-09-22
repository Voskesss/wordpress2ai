import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/**
 * Een voorbeeldomgeving wordt pas aangemaakt bij de eerste wijziging, en een
 * nieuwe worker is een halve minuut niet bereikbaar. Het venster wees er al
 * heen en toonde de foutpagina van de browser: "heeft de verbinding
 * geweigerd". Dat leest als: jullie site is stuk.
 *
 * Gemeten bij een demo-bezoeker: omgeving aangemaakt om 10:54:38, veertig
 * seconden later antwoordde hij gewoon met 200. Bij een klant gebeurt
 * hetzelfde de eerste keer dat zijn werkversie wordt uitgerold, dus dit geldt
 * voor iedereen.
 */

const chat = await readFile(new URL("../app/portal/Chat.tsx", import.meta.url), "utf8");
const blok = chat.slice(chat.indexOf("const [wachtOpOmgeving"), chat.indexOf("}, [iframeSrc]);"));
assert.ok(blok.length > 100, "het wachten op de voorbeeldomgeving is verdwenen");

// 1. Geldt voor iedereen, niet alleen de demo
assert.ok(!/if \(!isDemo/.test(blok), "het wachten geldt alleen voor de demo, terwijl een klant hetzelfde overkomt");

// 2. Een trage site is geen ontbrekende site
assert.ok(/AbortError|TimeoutError/.test(blok), "een trage site wordt aangezien voor een die niet bestaat");
assert.ok(blok.includes("AbortSignal.timeout"), "zonder tijdslimiet kan de controle zelf blijven hangen");

// 3. Het geeft op, en blijft niet eeuwig proberen
assert.ok(/pogingen < \d+/.test(blok), "de controle kan eindeloos doorgaan");

// 4. Zodra hij antwoordt wordt het venster opnieuw geladen; anders blijft de
//    foutpagina staan die de browser al toonde
assert.ok(blok.includes("setReloadTeller"), "het venster laadt niet opnieuw zodra de omgeving er is");

// 5. En ondertussen staat er een dekkend eigen venster overheen
const overlay = chat.slice(chat.indexOf("{wachtOpOmgeving && ("), chat.indexOf("Vriendelijke lader tijdens"));
// Dekkend: "bg-white/30" en "bg-white/90" laten de foutpagina er doorheen zien
assert.ok(
  /bg-white["\s]/.test(overlay) && !/bg-white\/\d/.test(overlay),
  "het afdekvenster is doorzichtig, dus de foutpagina van de browser blijft zichtbaar",
);
assert.ok(overlay.includes('role="status"'), "een schermlezer hoort niet dat er gewacht wordt");
assert.ok(overlay.includes("isDemo"), "demo en klant krijgen dezelfde tekst");

console.log("voorbeeld-wachten: ok");
