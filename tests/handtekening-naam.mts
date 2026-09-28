/**
 * Naam onder het logo weglaten (wens Jos 28-09, Van den Berg Mediation): het
 * logo bevat de bedrijfsnaam vaak al, dan stond hij er dubbel en kon niemand
 * dat aanpassen. Bewaakt: de keuze werkt door het echte opmaakpad, de naam
 * verdwijnt NOOIT zonder logo (anders is de mail naamloos), en de keuze zit
 * in het formulier, de opslag en de migratie.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { metKlantOpmaak } from "../lib/mail";

const basis = { naam: "Van den Berg Mediation", domein: null, smtpHost: null, smtpPoort: null, smtpGebruiker: null, smtpWachtwoord: null, smtpAfzender: null };
const logo = "https://voorbeeld.nl/logo.png";
const naamRegel = /<p style="margin:0;font-weight:700[^>]*>Van den Berg Mediation<\/p>/;

// 1. Standaard: logo + naam (bestaande klanten merken niets)
const standaard = metKlantOpmaak({ ...basis, mailLogoUrl: logo }, "<p>x</p>");
assert.ok(standaard.includes("<img") && naamRegel.test(standaard), "standaard hoort de naam onder het logo te staan");

// 2. Uitgezet mét logo: naam weg, logo blijft
const zonder = metKlantOpmaak({ ...basis, mailLogoUrl: logo, mailNaamVerbergen: true }, "<p>x</p>");
assert.ok(zonder.includes("<img"), "het logo is verdwenen");
assert.ok(!naamRegel.test(zonder), "de naam staat er nog terwijl hij uitgezet is");

// 3. Uitgezet ZONDER logo: de naam blijft, anders is de mail naamloos
const naamloos = metKlantOpmaak({ ...basis, mailLogoUrl: null, mailNaamVerbergen: true }, "<p>x</p>");
assert.ok(naamRegel.test(naamloos), "zonder logo mag de naam nooit verdwijnen");

// 4. Formulier, opslag, schema en migratie
const formulier = await readFile("app/portal/SiteExtra.tsx", "utf8");
assert.ok(formulier.includes('name="naamTonen"') && formulier.includes("defaultChecked={!mailNaamVerbergen}"), "de keuze ontbreekt in het handtekeningformulier");
const acties = await readFile("app/portal/acties.ts", "utf8");
assert.ok(acties.includes('mailNaamVerbergen: formData.get("naamTonen") !== "ja"'), "de keuze wordt niet opgeslagen");
for (const pad of ["app/portal/page.tsx", "app/admin/klant/[id]/page.tsx"]) {
  assert.ok((await readFile(pad, "utf8")).includes("mailNaamVerbergen={site.mailNaamVerbergen}"), pad + " geeft de keuze niet door aan het formulier");
}
assert.ok((await readFile("db/schema.ts", "utf8")).includes('boolean("mail_naam_verbergen").notNull().default(false)'), "de kolom ontbreekt in het schema");
assert.ok((await readFile("db/migrations/20260928-mail-naam-verbergen.sql", "utf8")).includes("ADD COLUMN IF NOT EXISTS mail_naam_verbergen"), "de migratie ontbreekt");

console.log("handtekening-naam: ok");
