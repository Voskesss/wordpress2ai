import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mailBevindingen, mailDiagnose, spfRecords, type MailFeiten } from "../lib/mail-controle";

/**
 * De e-mailcontrole bij de livegang.
 *
 * Waarom dit bestaat: bij een migratie verhuist de website, niet de mail. Maar
 * alles wat de mail vindbaar maakt staat in DNS, en dat nemen wij over. Eén
 * vergeten record en de post van de klant stopt, terwijl de site perfect
 * draait. Dat zie je aan niets.
 *
 * Aanleiding: Van den Berg (mediator). Zijn mail draaide op dezelfde machine
 * als zijn WordPress-site. Zeg je dat niet, dan zegt hij na de verhuizing zijn
 * hosting op om te besparen en is zijn post weg.
 */

const leeg: MailFeiten = { mx: [], mxBereikbaar: null, txt: [], dmarc: [], dkimSelectors: [] };
const vind = (b: ReturnType<typeof mailBevindingen>, s: string) => b.find((x) => x.sleutel === s);

// 1. Geen MX is dringend: er komt dan niets meer binnen.
const geenMx = mailBevindingen(leeg);
assert.equal(vind(geenMx, "mail-mx")?.ok, false);
assert.equal(vind(geenMx, "mail-mx")?.dringend, true, "geen MX hoort dringend te zijn");

// 2. Externe partijen zijn veilig, een webhoster niet. Dat onderscheid is de
//    hele reden dat deze controle bestaat.
assert.equal(mailDiagnose(["aspmx.l.google.com"]).extern, true);
assert.equal(mailDiagnose(["mx.soverin.net"]).extern, true);
assert.equal(mailDiagnose(["mail.vandenbergmediation.nl"]).extern, false, "onbekende partij mag niet als veilig gelden");
assert.match(
  mailDiagnose(["mail.vandenbergmediation.nl"]).tekst,
  /niet opgezegd/,
  "er wordt niet gewaarschuwd dat de hosting moet blijven staan"
);

// 3. Twee SPF-records is een klassieke fout: dan faalt de controle bij de
//    ontvanger en belandt ALLE post in de spam. Dringend dus.
const tweeSpf = mailBevindingen({ ...leeg, mx: ["mx.soverin.net"], txt: ["v=spf1 include:a ~all", "v=spf1 include:b ~all"] });
assert.equal(vind(tweeSpf, "mail-spf")?.ok, false);
assert.equal(vind(tweeSpf, "mail-spf")?.dringend, true, "twee SPF-records horen dringend te zijn");
assert.equal(spfRecords(["v=spf1 a ~all", "google-site-verification=x"]).length, 1, "TXT dat geen SPF is wordt meegeteld");

// 4. Het a-mechanisme: dat geeft de WEBserver toestemming om post te sturen.
//    Zodra de site bij ons draait hoort dat eruit.
const metA = mailBevindingen({ ...leeg, mx: ["mail.ergens.nl"], txt: ["v=spf1 a mx include:_spf.dewebsmid.nl ~all"] });
assert.ok(vind(metA, "mail-spf-a"), "het a-mechanisme in de SPF wordt niet opgemerkt");
// Maar niet vals alarm slaan op een include die toevallig een a bevat
const zonderA = mailBevindingen({ ...leeg, mx: ["mail.ergens.nl"], txt: ["v=spf1 mx include:amazonses.com ~all"] });
assert.equal(vind(zonderA, "mail-spf-a"), undefined, "vals alarm: include:amazonses bevat geen los a-mechanisme");

// 5. DKIM niet gevonden mag NOOIT gelezen worden als "er is geen DKIM".
const geenDkim = mailBevindingen({ ...leeg, mx: ["mail.ergens.nl"] });
assert.match(
  vind(geenDkim, "mail-dkim")?.uitleg ?? "",
  /betekent niet dat het er niet is/,
  "de uitleg wekt de indruk dat er geen DKIM is"
);
assert.match(vind(geenDkim, "mail-dkim")?.uitleg ?? "", /mail-tester/, "er staat niet hoe je het dan wél vindt");

// 6. Route B (Van den Berg, 02-10-2026): website bij ons, mail en DNS bewust
//    bij De Websmid, formulieren via zijn eigen SMTP. Dan is "mail bij de
//    hoster" geen open punt, en is de 'a' in de SPF geen klus voor ons. De
//    waarschuwing om de hosting niet op te zeggen moet wel blijven staan.
const vdb: MailFeiten = {
  ...leeg,
  mx: ["mail.vandenbergmediation.nl"],
  txt: ["v=spf1 a mx include:_spf.dewebsmid.nl ~all"],
};
const routeB = mailBevindingen(vdb, { routeB: true, smtpHost: "mail.vandenbergmediation.nl" });
assert.equal(vind(routeB, "mail-waar")?.ok, true, "route B: mail bij de hoster staat onterecht open");
assert.match(vind(routeB, "mail-waar")?.uitleg ?? "", /dewebsmid/, "de hoster uit de SPF wordt niet genoemd");
assert.match(vind(routeB, "mail-waar")?.uitleg ?? "", /niet opgezegd/, "route B: waarschuwing om de hosting te houden is weg");
assert.match(vind(routeB, "mail-waar")?.uitleg ?? "", /SMTP \(mail\.vandenbergmediation\.nl\)/, "de gekoppelde SMTP wordt niet genoemd");
assert.equal(vind(routeB, "mail-spf-a")?.ok, true, "route B: de 'a' in de SPF staat onterecht open");
// Zonder route B blijft het gewoon open, nu mét de hoster uit de SPF erbij
const gewoon = mailBevindingen(vdb);
assert.equal(vind(gewoon, "mail-waar")?.ok, false, "zonder route B hoort dit open te blijven");
assert.match(vind(gewoon, "mail-waar")?.uitleg ?? "", /dewebsmid/, "zonder route B: hoster uit de SPF niet herkend");
assert.equal(vind(gewoon, "mail-spf-a")?.ok, false, "zonder route B hoort de 'a' een klus te blijven");
// Alleen 'a' zonder mx of include: dan hangt de post er wél aan, ook bij route B open
const alleenA = mailBevindingen({ ...vdb, txt: ["v=spf1 a ~all"] }, { routeB: true });
assert.equal(vind(alleenA, "mail-spf-a")?.ok, false, "SPF met alleen 'a' is bij route B wel een probleem");

// 7. En het hangt echt in de livegang-checklist, anders ziet niemand het.
const livegang = await readFile(new URL("../lib/livegang.ts", import.meta.url), "utf8");
assert.ok(livegang.includes("mailBevindingen(await mailFeiten("), "de mailcontrole hangt niet in de checklist");

console.log("mail-controle: ok");
