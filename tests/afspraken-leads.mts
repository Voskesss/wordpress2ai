/**
 * Afspraken met potentiële klanten (leads). Twee dingen die makkelijk stuk gaan
 * en die je niet in de browser terugziet:
 *
 *  1. Een blok of afspraak hoort bij precies één eigenaar. Als dat wegvalt,
 *     weet afspraakStand() niet meer van wie iets is.
 *  2. Als een lead klant wordt, blijft de kennismaking aan de lead hangen. Zou
 *     die verhuizen of verdwijnen, dan raak je precies dat ene gesprek kwijt dat
 *     al in de agenda stond.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eigenaarKolommen, eigenaarPad, eigenaarVan } from "../lib/afspraken";
import { bouwAfspraakUitnodiging } from "../lib/klant-mails";
import { statusBijAfspraak } from "../lib/leads";

// Precies één eigenaar, welke kant je ook op kijkt
{
  assert.deepEqual(eigenaarKolommen({ soort: "site", id: 7 }), { siteId: 7, leadId: null });
  assert.deepEqual(eigenaarKolommen({ soort: "lead", id: 7 }), { siteId: null, leadId: 7 });
  for (const soort of ["site", "lead"] as const) {
    const k = eigenaarKolommen({ soort, id: 3 });
    assert.equal([k.siteId, k.leadId].filter((w) => w !== null).length, 1, `${soort} moet één kolom vullen`);
  }
  assert.deepEqual(eigenaarVan({ siteId: 4, leadId: null }), { soort: "site", id: 4 });
  assert.deepEqual(eigenaarVan({ siteId: null, leadId: 4 }), { soort: "lead", id: 4 });
  assert.equal(eigenaarVan({ siteId: null, leadId: null }), null);
  assert.equal(eigenaarPad({ soort: "site", id: 9 }), "/admin/klant/9");
  assert.equal(eigenaarPad({ soort: "lead", id: 9 }), "/admin/leads");
}

// De database eist het ook, niet alleen de code
{
  const sql = readFileSync("db/migrations/20260922-afspraak-leads.sql", "utf8");
  for (const tabel of ["afspraak_blokken", "afspraken"]) {
    assert.match(
      sql,
      new RegExp(`ALTER TABLE ${tabel} ADD CONSTRAINT ${tabel}_een_eigenaar CHECK \\(\\(site_id IS NULL\\) <> \\(lead_id IS NULL\\)\\)`),
      `${tabel} mist de CHECK op precies één eigenaar`,
    );
    assert.match(sql, new RegExp(`ALTER TABLE ${tabel} ALTER COLUMN site_id DROP NOT NULL`));
  }
  // Commentaarregels zonder puntkomma, anders breekt het per-statement draaien
  for (const regel of sql.split("\n")) {
    if (regel.trim().startsWith("--")) assert.ok(!regel.includes(";"), `puntkomma in commentaar: ${regel}`);
  }
}

// Lead wordt klant: de kennismaking blijft bij de lead staan
{
  const bron = readFileSync("app/admin/acties-leads.ts", "utf8");
  const start = bron.indexOf("export async function leadWordtKlant");
  assert.ok(start > 0, "leadWordtKlant bestaat niet meer");
  const functie = bron.slice(start);
  assert.ok(
    !/(update|delete)\(afspraken\)|(update|delete)\(afspraakBlokken\)/.test(functie),
    "leadWordtKlant mag de afspraken van de lead niet verplaatsen of weggooien",
  );
  // Verwijderen is wél opruimen: anders blijft een bevestigde kennismaking tijd blokkeren
  const verwijder = bron.slice(
    bron.indexOf("export async function leadVerwijderen"),
    bron.indexOf("export async function leadsNuBijwerken"),
  );
  assert.match(verwijder, /delete\(afspraakBlokken\)/);
  assert.match(verwijder, /delete\(afspraken\)/);
}

// De uitnodiging aan een lead gaat over kennismaken, niet over "je website",
// belooft geen telefoontje en stuurt hem niet naar een portaal dat hij niet heeft
{
  const dagen = [{ datum: "2026-09-24", van: "09:00", tot: "12:00" }];
  const lead = bouwAfspraakUitnodiging({
    siteNaam: "Rogier Advies",
    naam: "Rogier",
    link: "https://www.wordswap.nl/afspraak/abc",
    duurMinuten: 30,
    dagen,
    soort: "lead",
  });
  assert.equal(lead.onderwerp, "Even kennismaken?");
  assert.ok(!lead.html.includes("/portal#afspraak"), "een lead heeft geen portaal");
  assert.ok(!/ik bel je/i.test(lead.html), "bij een lead beloven we geen telefoontje");
  assert.match(lead.html, /kennis te maken/);

  const klant = bouwAfspraakUitnodiging({
    siteNaam: "Bakkerij Jansen",
    naam: "Jan",
    link: "https://www.wordswap.nl/afspraak/abc",
    duurMinuten: 30,
    dagen,
  });
  assert.equal(klant.onderwerp, "Even samen kijken naar Bakkerij Jansen?");
  assert.match(klant.html, /\/portal#afspraak/);
  assert.match(klant.html, /ik bel je/i);
}

// De leadstatus schuift mee met de agenda, maar alleen waar dat mag
{
  // Bevestigde afspraak: van open status naar "Afspraak gepland"
  assert.equal(statusBijAfspraak("nieuw", true), "afspraak");
  assert.equal(statusBijAfspraak("wacht_op_reactie", true), "afspraak");
  assert.equal(statusBijAfspraak("in_gesprek", true), "afspraak");
  assert.equal(statusBijAfspraak("afspraak", true), null, "al goed, dus niets te doen");

  // Afgezegd: terug naar "in gesprek", maar alleen vanuit "afspraak" zelf
  assert.equal(statusBijAfspraak("afspraak", false), "in_gesprek");
  assert.equal(statusBijAfspraak("in_gesprek", false), null);
  assert.equal(statusBijAfspraak("nieuw", false), null, "zonder afspraak blijft nieuw gewoon nieuw");

  // Wat Jos met de hand afsloot blijft staan, ook als er nog een afspraak loopt
  for (const afgerond of ["klant", "geen_match", "afgehaakt"]) {
    assert.equal(statusBijAfspraak(afgerond, true), null, `${afgerond} mag niet meeschuiven`);
    assert.equal(statusBijAfspraak(afgerond, false), null, `${afgerond} mag niet meeschuiven`);
  }
}

// Niets in de afsprakenmodule verstuurt uit zichzelf mail: elke verzending
// hangt aan een klik van Jos of van degene die de planlink opent.
{
  const bronnen = ["app/admin/acties-afspraken.ts", "app/afspraak/[token]/acties.ts"];
  for (const pad of bronnen) {
    const bron = readFileSync(pad, "utf8");
    for (const stuk of bron.split("mailVanJos(").slice(1)) {
      const naar = stuk.slice(0, 400);
      assert.ok(
        /naar:\s*"jos@wordswap\.nl"|naar:\s*(afspraak\.email|email|info\.email|ontvanger\.email)/.test(naar),
        `${pad}: mail gaat naar een onverwacht adres — ${naar.slice(0, 80)}`,
      );
    }
  }
}

console.log(
  "PASS afspraken-leads: precies één eigenaar (code én database), kennismaking blijft bij de lead, lead-uitnodiging zonder portaal en zonder belbelofte, leadstatus schuift alleen mee waar dat mag, en mail gaat alleen naar Jos of naar de aanvrager zelf.",
);
