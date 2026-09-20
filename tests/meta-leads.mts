import assert from "node:assert/strict";
import { mapMetaLead, schoonDomein } from "../lib/meta-leads";

// Domeinen worden opgeschoond zoals in de admin: protocol, www en pad eraf
assert.equal(schoonDomein("https://www.Trendprior.nl/winkel"), "trendprior.nl");
assert.equal(schoonDomein("LdB-K.nl"), "ldb-k.nl");
assert.equal(schoonDomein("duikfoto.remcovandermeide.nl"), "duikfoto.remcovandermeide.nl");
// Wat geen domein is, wordt geen domein
assert.equal(schoonDomein("geen website"), null);
assert.equal(schoonDomein("jos@wordswap.nl"), null);
assert.equal(schoonDomein(null), null);

// Een echte Meta-lead: de websitevraag heeft een eigen naam per formulier
{
  const lead = mapMetaLead({
    id: "123",
    created_time: "2026-09-20T08:40:00+0000",
    field_data: [
      { name: "wat_is_het_adres_van_je_website?", values: ["christenreconstructie.nl"] },
      { name: "email", values: ["bobvdijk@outlook.com"] },
      { name: "full_name", values: ["Bob van Dijk"] },
      { name: "phone_number", values: ["+31640118925"] },
    ],
  });
  assert.ok(lead);
  assert.equal(lead.naam, "Bob van Dijk");
  assert.equal(lead.email, "bobvdijk@outlook.com");
  assert.equal(lead.telefoon, "+31640118925");
  assert.equal(lead.website, "christenreconstructie.nl");
  assert.equal(lead.metaId, "123");
  assert.equal(lead.aangemaakt.toISOString(), "2026-09-20T08:40:00.000Z");
}

// Herkent de website ook zonder "website" in de veldnaam (terugval op domein-achtig antwoord)
{
  const lead = mapMetaLead({
    id: "124",
    field_data: [
      { name: "vraag_1", values: ["www.vtvdekrommeelleboog.nl"] },
      { name: "email", values: ["robertflens@protonmail.com"] },
      { name: "full_name", values: ["R.W FLENS"] },
    ],
  });
  assert.equal(lead?.website, "vtvdekrommeelleboog.nl");
  assert.equal(lead?.telefoon, null);
}

// Zonder naam én mail valt er niets op te volgen
assert.equal(mapMetaLead({ id: "125", field_data: [{ name: "phone_number", values: ["061234"] }] }), null);
// Zonder naam maar mét mail: het mailadres wordt de naam
assert.equal(mapMetaLead({ id: "126", field_data: [{ name: "email", values: ["x@y.nl"] }] })?.naam, "x@y.nl");

console.log("meta-leads: alle checks geslaagd");
