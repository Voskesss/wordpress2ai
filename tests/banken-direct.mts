/**
 * Wat je meestuurt is meteen veilig. Op 20-09 verdween een video die net een
 * minuut had staan comprimeren zodra de pagina werd herladen: hij stond nog
 * nergens, want pas de chatbeurt haalde hem op. Dezelfde regel geldt voor
 * foto's — breekt een beurt af, dan mag de upload niet voor niets zijn
 * geweest. Audio deed dit al goed en is het model.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

const videobank = await readFile("app/api/videobank/route.ts", "utf8");
const chat = await readFile("app/portal/Chat.tsx", "utf8");
const route = await readFile("app/api/chat/route.ts", "utf8");

// 1. Een gecomprimeerde video gaat meteen de bank in
assert.ok(/export async function POST/.test(videobank), "videobank kan geen video opslaan");
assert.ok(/bewaarMediaVideo\(site\.siteSlug, naam/.test(videobank), "video gaat niet naar de media-opslag");
assert.ok(
  !/pushBestanden\([^)]*bestanden[^)]*"Video bewaard/.test(videobank),
  "de video zelf wordt nog naar de siterepo gepusht — dan haalt elke chatbeurt hem weer op",
);
// Het voorbeeldplaatje hoort wél bij de site: dat staat in de HTML
assert.ok(/Voorbeeldplaatje bij de video bewaard/.test(videobank), "de poster wordt niet bij de site bewaard");
assert.ok(/videoUploads/.test(videobank), "de videoteller wordt niet bijgewerkt");

// 2. Het portaal roept dat aan zodra het comprimeren klaar is
assert.ok(/Ik zet hem in je videobank/.test(chat), "de chat zet een klaar gecomprimeerde video niet in de bank");
const klaarBlok = chat.slice(chat.indexOf("if (st.klaar) {"), chat.indexOf("if (st.klaar) {") + 900);
assert.ok(/fetch\("\/api\/videobank"/.test(klaarBlok), "de bank-aanroep staat niet in de klaar-afhandeling");

// 3. Foto's worden veiliggesteld vóór de AI begint
const fotoBlok = route.slice(route.indexOf("for (const foto of afbeeldingen) {"), route.indexOf("for (const foto of afbeeldingen) {") + 1400);
assert.ok(/Meegestuurde foto's bewaard in de fotobank/.test(fotoBlok), "foto's worden niet vooraf bewaard");
assert.ok(
  route.indexOf("Meegestuurde foto's bewaard in de fotobank") < route.indexOf("const uitkomst = await draaiChatAgent({"),
  "foto's worden pas ná de AI-beurt bewaard — een afgebroken beurt kost dan de upload",
);

console.log("banken-direct: video en foto's staan meteen veilig, ook als de beurt afbreekt");
