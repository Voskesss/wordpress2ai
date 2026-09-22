/**
 * Jos' wens van 22-09: uit de fotobank meerdere foto's tegelijk kunnen kiezen
 * om mee te sturen met één opdracht ("zet deze drie in de galerij"). Voorheen
 * sloot de bank na één klik en kon er maar één foto mee.
 */
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";

// 1. De bank zelf: aanklikken is een toggle ("Gaat mee"), de bank blijft
// open, en onderin verschijnt een Klaar-knop zodra er iets gekozen is.
const fb = await readFile("app/portal/Fotobank.tsx", "utf8");
assert.ok(/gekozen\?: string\[\]/.test(fb), "de fotobank kent het stapeltje gekozen foto's niet");
assert.ok(/onKlaarKiezen/.test(fb), "de Klaar-knop-aansluiting (onKlaarKiezen) ontbreekt in de fotobank");
assert.ok(/Gaat mee/.test(fb), "de gekozen-status ('Gaat mee') is niet zichtbaar op de knop");
assert.ok(/gaan mee met je opdracht/.test(fb), "de Klaar-knop met het aantal foto's ontbreekt");
assert.ok(/sticky/.test(fb), "de Klaar-knop blijft niet onderin hangen tijdens het bladeren");

// 2. De chat: keuzes zijn een lijst, klikken in de bank voegt toe of haalt
// eraf (bank blijft open), en elke chip is los weg te halen.
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(/fotobankKeuzes, setFotobankKeuzes\] = useState<string\[\]>/.test(chat), "de chat bewaart niet meerdere fotobank-keuzes");
assert.ok(/k\.includes\(pad\) \? k\.filter\(\(p\) => p !== pad\) : \[\.\.\.k, pad\]/.test(chat), "aanklikken in de bank werkt niet als toggle");
assert.ok(/onKlaarKiezen=\{\(\) => \{\s*setFotobankOpen\(false\)/.test(chat), "de bank sluit niet via de Klaar-knop");
assert.ok(/fotobankKeuzes\.map\(\(pad\)/.test(chat), "de gekozen foto's staan niet als losse chips boven het chatveld");
assert.ok(/k\.filter\(\(p\) => p !== pad\)/.test(chat), "een enkele chip is niet weg te halen");

// 3. Versturen: élke gekozen foto gaat mee, in beide verzendvormen.
assert.ok(/for \(const p of gekozenBankFotos\) form\.append\("fotobankPad", p\)/.test(chat), "het formulier stuurt niet alle gekozen bankfoto's mee");
assert.ok(/fotobankPaden: gekozenBankFotos\.length > 0 \? gekozenBankFotos : undefined/.test(chat), "de JSON-verzending stuurt niet alle gekozen bankfoto's mee");
// Ook via de wachtrij (bericht tijdens een lopende beurt) raken ze niet kwijt
assert.ok(/bankFotos: \[\.\.\.new Set\(/.test(chat), "bankfoto's uit de wachtrij worden niet samengevoegd met nieuwe keuzes");

// 4. De server: leest meerdere paden (formulier én JSON), met dezelfde
// veiligheidscheck per pad en een bovengrens.
const route = await readFile("app/api/chat/route.ts", "utf8");
assert.ok(/form\.getAll\("fotobankPad"\)\.filter\(geldigBankPad\)\.slice\(0, MAX_FOTOS\)/.test(route), "de server leest niet alle fotobank-paden uit het formulier");
assert.ok(/Array\.isArray\(body\.fotobankPaden\) \? body\.fotobankPaden : \[body\.fotobankPad\]/.test(route), "de server accepteert de JSON-lijst (of het oude losse pad) niet");
assert.ok(/geldigBankPad = \(v: unknown\): v is string =>[\s\S]{0,120}!v\.includes\("\.\."\)/.test(route), "de padcontrole (geen ..) per fotobank-pad ontbreekt");
// Het snelpad (pure tekstwissel) mag niet aangaan zodra er bankfoto's meegaan
assert.ok(/!controle && fotobankPaden\.length === 0/.test(route), "het snelpad negeert de gekozen bankfoto's");
// De AI hoort te weten om wélke foto's het gaat, ook bij meerdere
assert.ok(/déze foto's: \$\{fotobankPaden\.map/.test(route), "de AI krijgt bij meerdere foto's niet de volledige lijst");
// Kwaliteitswaarschuwing per foto, met de naam erbij zodra het er meer zijn
assert.ok(/for \(const pad of fotobankPaden\)/.test(route), "de kwaliteitsmeting loopt niet over alle gekozen foto's");
assert.ok(/\$\{pad\}: \$\{w\}/.test(route), "een kwaliteitswaarschuwing zegt niet om welke foto het gaat");

console.log("Fotobank-meerdere: alle controles geslaagd");
