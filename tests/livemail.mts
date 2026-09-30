/**
 * "Je website staat live": één mail aan de klant op het moment van de
 * overstap (wens Jos 30-09, Van den Berg). Bewaakt de inhoud en dat de knop
 * een bevestigingsvraag stelt (het is een klantmail, geen proef).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bouwLiveMail } from "../lib/klant-mails";

const m = bouwLiveMail({ siteNaam: "Van den Berg Mediation", naam: "Dirk-Jan van den Berg", adres: "vandenbergmediation.nl", eigenTekst: "Gefeliciteerd!" });
assert.ok(m.onderwerp.includes("vandenbergmediation.nl"), "het adres staat niet in het onderwerp");
assert.ok(m.html.includes("Hoi Dirk-Jan,"), "de aanhef gebruikt niet de voornaam");
assert.ok(m.html.includes('href="https://vandenbergmediation.nl/"'), "de knop wijst niet naar de site");
assert.ok(m.html.includes("komt bij jou binnen per mail én in je eigen portaal"), "de geruststelling over formulierberichten ontbreekt");
assert.ok(m.html.includes("testen we alles nog een keer"), "de uitleg over het testen ontbreekt");
assert.ok(m.html.includes("Gefeliciteerd!"), "de persoonlijke noot ontbreekt");
assert.ok(!/[—–]/.test(m.html), "lang streepje in de mail");
const zonder = bouwLiveMail({ siteNaam: "X", naam: null, adres: "www.klant.nl" });
assert.ok(zonder.html.includes('href="https://www.klant.nl/"'), "een www-hoofdadres wordt niet gevolgd");

const pagina = await readFile("app/admin/klant/[id]/page.tsx", "utf8");
const blok = pagina.slice(pagina.indexOf('id="livemail"'), pagina.indexOf("</form>", pagina.indexOf('id="livemail"')));
assert.ok(blok.includes("<BevestigKnop") && blok.includes("nu versturen naar de klant?"), "de livemail gaat zonder bevestigingsvraag de deur uit");
assert.ok(blok.includes('<MailVoorbeeldKnop soort="live"'), "geen voorbeeldknop");
assert.ok(pagina.includes("heeftLivegang(site) && publiekAdres(site) && ("), "de knop staat er ook zonder eigen domein");
const acties = await readFile("app/admin/acties.ts", "utf8");
const fn = acties.slice(acties.indexOf("export async function stuurLiveMail"), acties.indexOf("\nexport async function", acties.indexOf("export async function stuurLiveMail") + 10));
assert.ok(fn.includes("await requireAdmin();") && fn.includes("klantEmailVoorSite(siteId)"), "de actie mist de beheerderscontrole of stuurt niet naar de gekoppelde klant");
assert.ok(fn.includes("Livemail mislukt") && fn.indexOf("redirect(") > fn.indexOf("catch"), "redirect staat in het try-blok: NEXT_REDIRECT wordt dan opgeslokt");
const route = await readFile("app/api/admin/mail-voorbeeld/route.ts", "utf8");
assert.ok(route.includes('soort === "live"'), "het voorbeeld kent de livemail niet");
console.log("livemail: ok");
