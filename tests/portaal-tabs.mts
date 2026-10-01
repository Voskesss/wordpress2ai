/** Het portaal opende op een breed scherm schermvullend, óver de pagina heen.
 * Je berichten en instellingen zaten daarachter, bereikbaar via een rode knop
 * "Volledig scherm uit". Klanten snapten niet dat ze terug konden (Jos,
 * 30-09-2026). Nu: een vaste bovenbalk met tabbladen, en de werkweergave
 * begint ónder die balk.
 * Draaien: node --import tsx tests/portaal-tabs.mts */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { leesTab, PORTAAL_TABS } from "../lib/portaal-tabs";

// 1. Tabbladen en het lezen van ?tab=
assert.deepEqual([...PORTAAL_TABS], ["website", "berichten", "account"]);
assert.equal(leesTab("berichten"), "berichten");
assert.equal(leesTab("account"), "account");
assert.equal(leesTab(undefined), "website");
assert.equal(leesTab("onzin"), "website", "een onbekend tabblad valt terug op de website");

// 2. De schil: vaste balk boven de werkweergave (z-80) en onder de vensters (85+)
const schil = await readFile("app/portal/PortaalSchil.tsx", "utf8");
assert.ok(/fixed inset-x-0 z-\[82\]/.test(schil), "de balk ligt niet tussen de werkweergave en de vensters in");
assert.ok(schil.includes('"--portaal-nav"'), "de balk geeft zijn hoogte niet door aan de werkweergave");
assert.ok(schil.includes("hidden={tab !== \"website\"}") && schil.includes("hidden={tab !== \"berichten\"}"), "de tabbladen worden niet verborgen maar weggegooid, dan stopt de chat");
assert.ok(schil.includes("window.history.replaceState") && schil.includes('searchParams.set("tab", t)'), "het adres volgt het tabblad niet");
assert.ok(schil.includes('closest<HTMLElement>("[data-portaal-tab]")'), "een #-adres (zoals #afspraak uit de mail) opent het juiste tabblad niet");
assert.ok(schil.includes("<UserButton"), "uitloggen is niet bereikbaar vanuit de balk");
assert.ok(schil.includes('href="/portal"') && schil.includes("Alle websites"), "bij meerdere sites kun je niet terug naar het overzicht");

// 3. De werkweergave begint onder de balk; de oude terug-knopjes alleen zonder balk
const chat = await readFile("app/portal/Chat.tsx", "utf8");
assert.ok(chat.includes('{ top: "var(--portaal-nav, 0px)" }'), "de werkweergave schuift niet onder de balk");
assert.ok(chat.includes("{volledigScherm && !isMobiel && !metBalk && ("), "de oude terug-knopjes staan er nog naast de balk");
assert.ok(chat.includes("{!metBalk && <button\n              onClick={() => setMobielVol(false)}"), "de mobiele Menu-knop staat er nog naast de balk");
assert.ok(chat.includes('metBalk ? "Kleiner" : "Volledig scherm uit"'), "de rode uitgang staat er nog met balk");

// 4. De pagina verdeelt de inhoud over de tabbladen
const pagina = await readFile("app/portal/page.tsx", "utf8");
assert.ok(pagina.includes("<PortaalSchil") && pagina.includes("beginTab={leesTab(tabParam)}"), "het portaal gebruikt de schil niet");
const berichten = pagina.slice(pagina.indexOf("berichten={"), pagina.indexOf("account={"));
for (const onderdeel of ["<SiteExtra", "<AfspraakBlok", "<BevestigingsMails", "<EigenMailserver"])
  assert.ok(berichten.includes(onderdeel), `${onderdeel} staat niet in het tabblad Berichten`);
const account = pagina.slice(pagina.indexOf("account={"), pagina.indexOf("website={"));
for (const onderdeel of ["<KlantFacturen", "<MeenemenBlok", "<MeelezenRegel"])
  assert.ok(account.includes(onderdeel), `${onderdeel} staat niet in het tabblad Account`);
const website = pagina.slice(pagina.indexOf("website={"));
assert.ok(!website.includes("<SiteExtra") && !website.includes("<KlantFacturen"), "berichten of account staan ook nog onder de chat");
assert.ok(website.includes("metBalk={metTabs}"), "de chat weet niet dat er een balk is");

// 5. De algemene sitekop verdwijnt in het portaal (anders twee koppen)
const kop = await readFile("app/SiteKop.tsx", "utf8");
assert.ok(kop.includes('pad === "/portal" || pad?.startsWith("/portal/")'), "de sitekop blijft staan in het portaal");
assert.ok((await readFile("app/layout.tsx", "utf8")).includes("<SiteKop>"), "de layout gebruikt SiteKop niet");

// 6. De admin houdt zijn gedrag: geen balk, dus 0 en de oude knoppen
const admin = await readFile("app/admin/klant/[id]/page.tsx", "utf8");
assert.ok(!admin.includes("metBalk"), "de admin hoort geen portaalbalk te krijgen");
console.log("✓ portaal: vaste balk met tabbladen, werkweergave eronder");
