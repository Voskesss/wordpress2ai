/** Test voor het WhatsApp-kanaal: webhook lezen, koppelcodes, knoppen,
 * keuzes, bundelen en de handtekeningcontrole.
 * Draaien: node --import tsx tests/whatsapp.mts — geen database of netwerk nodig. */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  conceptCommando,
  wisselCommando,
  vraagtOmMakeover,
  MAKEOVER_KEUZE,
  normaliseerNummer,
  leesKnop,
  leesWebhook,
  paginaVoorConcept,
  toonNummer,
  splitsKeuzes,
  voegSamen,
  haalAan,
  werkMelding,
} from "../lib/whatsapp/berichten";
import { handtekeningKlopt } from "../lib/whatsapp/api";
import { INTERN_KOP, gebruikerVanVerzoek, leesInternLabel, maakInternLabel } from "../lib/intern-verzoek";

// 1) Webhook: berichten eruit, afleverstatussen niet
const webhook = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              { id: "m1", from: "31610000000", type: "text", text: { body: "Zet de openingstijden op 9-17" } },
              { id: "m2", from: "31610000000", type: "image", image: { id: "media1", mime_type: "image/jpeg", caption: "Nieuwe foto" } },
              { id: "m3", from: "31610000000", type: "document", document: { id: "media2", mime_type: "application/pdf", filename: "Vacature.pdf" } },
              { id: "m4", from: "31610000000", type: "audio", audio: { id: "media3", mime_type: "audio/ogg; codecs=opus" } },
              { id: "m5", from: "31610000000", type: "interactive", interactive: { type: "button_reply", button_reply: { id: "pub:42", title: "Publiceren" } } },
              { id: "m6", from: "31610000000", type: "interactive", interactive: { type: "list_reply", list_reply: { id: "k:Doe maar zoals jij voorstelt", title: "Doe maar" } } },
              { id: "m7", from: "31610000000", type: "sticker", sticker: { id: "x" } },
            ],
          },
        },
        { value: { statuses: [{ id: "s1", status: "read" }] } },
      ],
    },
  ],
};
const binnen = leesWebhook(webhook);
assert.deepEqual(binnen.map((b) => b.soort), ["tekst", "foto", "document", "spraak", "knop", "keuze", "anders"]);
assert.equal(binnen[1].mediaId, "media1");
assert.equal(binnen[1].inhoud, "Nieuwe foto");
assert.equal(binnen[2].bestandsnaam, "Vacature.pdf");
assert.equal(binnen[4].inhoud, "pub:42");
assert.deepEqual(leesWebhook({}), [], "rommel geeft geen berichten");
assert.deepEqual(leesWebhook(null), []);

// 2) Telefoonnummers: landcode verplicht, opmaak maakt niet uit
assert.equal(normaliseerNummer("+31612345678"), "31612345678");
assert.equal(normaliseerNummer("+31 (0)6 12 34 56 78"), "31612345678", "spaties en (0) eruit");
assert.equal(normaliseerNummer("0031-6-12345678"), "31612345678", "00 telt als landcode");
assert.equal(normaliseerNummer("  +49 171 1234567 "), "491711234567");
assert.equal(normaliseerNummer("0612345678"), null, "zonder landcode weigeren");
assert.equal(normaliseerNummer("612345678"), null);
assert.equal(normaliseerNummer("+31 6"), null, "te kort");
assert.equal(normaliseerNummer("+3112345678901234567"), null, "te lang");
assert.equal(normaliseerNummer(""), null);
assert.equal(normaliseerNummer(null), null);
assert.equal(toonNummer("31610911365"), "+31 •••• 1365");
assert.equal(toonNummer(null), "");

// 3) Knoppen en getypte commando's
assert.deepEqual(leesKnop("pub:42"), { actie: "publiceer", changeId: 42 });
assert.deepEqual(leesKnop("weg:7"), { actie: "weggooien", changeId: 7 });
assert.deepEqual(leesKnop("duim:goed"), { actie: "duim-goed", changeId: null });
assert.deepEqual(leesKnop("duim:slecht"), { actie: "duim-slecht", changeId: null });
assert.equal(leesKnop("duim:"), null);
assert.equal(leesKnop("pub:abc"), null);
assert.equal(leesKnop("pub:-1"), null);
assert.equal(conceptCommando("Publiceer!"), "publiceer");
assert.equal(conceptCommando("zet het live"), "publiceer");
assert.equal(conceptCommando("gooi weg"), "weggooien");
assert.equal(conceptCommando("publiceer de nieuwe vacature ook op de homepage"), null, "gewone opdracht blijft een opdracht");

// 3b) Wisselen van website (nummer aan meerdere sites)
assert.ok(wisselCommando("andere website"));
assert.ok(wisselCommando("Andere site!"));
assert.ok(wisselCommando("wissel van website"));
assert.ok(!wisselCommando("zet op de andere website ook de openingstijden"), "gewone opdracht blijft een opdracht");
assert.ok(!wisselCommando(null));

// 3c) Make-over doorgeven aan WordSwap
assert.ok(vraagtOmMakeover(MAKEOVER_KEUZE));
assert.ok(vraagtOmMakeover(`k:${MAKEOVER_KEUZE}`), "ook als keuze uit de lijst");
assert.ok(vraagtOmMakeover(" ja, laat wordswap contact opnemen "));
assert.ok(!vraagtOmMakeover("ja"), "alleen de hele keuze telt");
assert.ok(!vraagtOmMakeover(null));

// 4) KEUZES-regel
const k = splitsKeuzes("Waar moet hij komen?\nKEUZES: Doe maar zoals jij voorstelt | Op de homepage | ✏️ Ik vertel het zelf");
assert.equal(k.schoon, "Waar moet hij komen?");
assert.deepEqual(k.keuzes, ["Doe maar zoals jij voorstelt", "Op de homepage"]);
assert.deepEqual(splitsKeuzes("Gedaan.").keuzes, []);

// 5) Bundelen van losse berichten
assert.equal(
  voegSamen([
    { soort: "foto", inhoud: null },
    { soort: "foto", inhoud: "Zet deze in de galerij" },
    { soort: "keuze", inhoud: "k:Op de homepage" },
  ]),
  "Zet deze in de galerij\nOp de homepage",
);
assert.equal(voegSamen([{ soort: "foto", inhoud: null }, { soort: "foto", inhoud: null }]), "Hierbij 2 foto's.");
assert.equal(voegSamen([{ soort: "document", inhoud: null }]), "Hierbij een document.");

// 6) Conceptpagina
assert.equal(paginaVoorConcept(["delen/menu.html", "contact/index.html"]), "/contact/");
assert.equal(paginaVoorConcept(["over-ons.html"]), "/over-ons/");
assert.equal(paginaVoorConcept(["index.html"]), "/");
assert.equal(paginaVoorConcept(["afbeeldingen/x.webp"]), "/");

// 6b) Concrete werkmelding: wát hij gaat doen, niet alleen "ik ga ermee aan de slag"
assert.equal(
  werkMelding("Ik pas mijn homepage aan...", "maak de knop blauw"),
  "Ik pas mijn homepage aan. Je hoort het zodra het klaar is.",
);
assert.equal(
  werkMelding("Ik ben mijn contact-pagina aan het schrijven — bij een grote pagina duurt dat even...", "x"),
  "Ik ben mijn contact-pagina aan het schrijven. Je hoort het zodra het klaar is.",
);
assert.equal(
  werkMelding(null, "Ok en nu"),
  "Ik ga aan de slag met “Ok en nu”. Je hoort het zodra het klaar is.",
  "zonder werkstap de opdracht zelf aanhalen",
);
assert.equal(
  werkMelding("Ik werk mijn homepage bij...", "x", "*Aimia* (aimia.nl)"),
  "Voor *Aimia* (aimia.nl): ik werk mijn homepage bij. Je hoort het zodra het klaar is.",
);
assert.equal(haalAan("a".repeat(100)).length, 80);
assert.equal(haalAan("  zet\n de   tijden  "), "zet de tijden");

// 7) Handtekening van Meta
const ruw = JSON.stringify(webhook);
const goed = "sha256=" + createHmac("sha256", "geheim").update(ruw).digest("hex");
assert.ok(handtekeningKlopt(ruw, goed, "geheim"));
assert.ok(!handtekeningKlopt(ruw + " ", goed, "geheim"), "aangepaste body");
assert.ok(!handtekeningKlopt(ruw, "sha256=00", "geheim"));
assert.ok(!handtekeningKlopt(ruw, null, "geheim"));
assert.ok(!handtekeningKlopt(ruw, goed, undefined), "zonder geheim altijd weigeren");

// 8) Interne verzoeken (WhatsApp → chat/publiceer namens de eigenaar)
process.env.INTERN_SIGNING_SECRET = "test-sleutel";
const nu = 1_800_000_000_000;
const label = maakInternLabel("user_abc", nu);
assert.equal(leesInternLabel(label, nu), "user_abc");
assert.equal(leesInternLabel(label, nu + 59_000), "user_abc", "binnen een minuut geldig");
assert.equal(leesInternLabel(label, nu + 61_000), null, "verlopen");
assert.equal(leesInternLabel(label, nu - 10_000), null, "uit de toekomst");
const [t, g] = label.split(".");
assert.equal(leesInternLabel(`${t}.${Buffer.from("user_ander").toString("base64url")}.${label.split(".")[2]}`, nu), null, "andere gebruiker, zelfde handtekening");
assert.equal(leesInternLabel(`${t}.${g}.nep`, nu), null);
assert.equal(leesInternLabel("rommel", nu), null);
process.env.INTERN_SIGNING_SECRET = "andere-sleutel";
assert.equal(leesInternLabel(label, nu), null, "andere sleutel");
process.env.INTERN_SIGNING_SECRET = "test-sleutel";
// Een label dat niet klopt valt NIET terug op de browsersessie
assert.equal(
  await gebruikerVanVerzoek(new Request("http://x/api/chat", { method: "POST", headers: { [INTERN_KOP]: "nep" } })),
  null,
);
assert.equal(
  await gebruikerVanVerzoek(new Request("http://x/api/chat", { method: "POST", headers: { [INTERN_KOP]: maakInternLabel("user_abc") } })),
  "user_abc",
);

console.log("whatsapp: alle tests geslaagd");
