/**
 * Verzendrem outreach (echt gebeurd 27-09, Willemsen): het bewerkformulier
 * had VERSTUREN als standaardactie, dus een Enter in het onderwerpveld
 * verstuurde de mail zonder enige vraag. En doordat useFormStatus voor het
 * hele formulier geldt, toonden na "Alleen opslaan" BEIDE knoppen een groen
 * vinkje ("✓ Verstuurd" terwijl er niets verstuurd was).
 * Drie sloten: opslaan is de standaardactie, elke verstuurknop stelt een
 * bevestigingsvraag, en het vinkje verschijnt alleen op de gedrukte knop.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// 1. Bewerkformulier: opslaan is de standaardactie, nooit versturen
const pagina = await readFile("app/admin/outreach/page.tsx", "utf8");
assert.ok(
  !pagina.includes("<form action={verstuurOutreach} className=\"grid gap-3"),
  "het bewerkformulier heeft versturen weer als standaardactie: Enter verstuurt dan zonder vraag",
);
assert.ok(
  pagina.includes("<form action={prospectMailOpslaan}"),
  "het bewerkformulier heeft opslaan niet als standaardactie",
);

// 2. Elke verstuurknop op de outreachpagina's is een BevestigKnop met vraag
for (const [pad, inhoud] of [
  ["app/admin/outreach/page.tsx", pagina],
  ["app/admin/outreach/concepten/page.tsx", await readFile("app/admin/outreach/concepten/page.tsx", "utf8")],
] as const) {
  for (const stuk of inhoud.split(/<(?:ActieKnop|BevestigKnop)/).slice(1)) {
    const knop = stuk.slice(0, stuk.indexOf("/>"));
    if (!/label=\{?[`"']?[^`"']*Verstuur/i.test(knop)) continue;
    assert.ok(
      inhoud.includes("<BevestigKnop" + stuk.slice(0, 40)),
      `${pad}: een verstuurknop is geen BevestigKnop (geen bevestigingsvraag)`,
    );
    assert.ok(/vraag=\{/.test(knop) && /versturen naar/.test(knop), `${pad}: de bevestigingsvraag ontbreekt of noemt het adres niet`);
  }
}
// En de vraag noemt het e-mailadres, zodat je ziet naar wie hij gaat
assert.ok(pagina.includes("${p.email}?"), "de bevestigingsvraag toont het e-mailadres niet");

// 3. In het bewerkformulier verstuurt de knop via formAction (los van de standaardactie)
assert.ok(
  pagina.includes("formAction={verstuurOutreach}"),
  "de verstuurknop in het bewerkformulier mist formAction={verstuurOutreach}",
);

// 4. BevestigKnop kent formAction en vraagt echt om bevestiging
const bevestig = await readFile("app/admin/klant/[id]/BevestigKnop.tsx", "utf8");
assert.ok(bevestig.includes("formAction?:"), "BevestigKnop mist de formAction-prop");
assert.ok(bevestig.includes("window.confirm(vraag)") && bevestig.includes("preventDefault"), "BevestigKnop vraagt niet echt om bevestiging");

// 5. ActieKnop: het vinkje verschijnt alleen op de knop die echt gedrukt is
const actie = await readFile("app/admin/klant/[id]/ActieKnop.tsx", "utf8");
assert.ok(actie.includes("zelfGedrukt"), "ActieKnop houdt niet bij welke knop gedrukt is");
assert.ok(/zelfGedrukt\.current = true/.test(actie), "de klik zet de gedrukt-markering niet");
assert.ok(/!pending && zelfGedrukt\.current/.test(actie), "het klaarlabel kijkt niet naar de gedrukt-markering: beide knoppen tonen dan weer een vinkje");

console.log("outreach-verzendrem: ok");
