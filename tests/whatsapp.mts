/** Test voor het WhatsApp-kanaal: webhook lezen, koppelcodes, knoppen,
 * keuzes, bundelen en de handtekeningcontrole.
 * Draaien: node --import tsx tests/whatsapp.mts — geen database of netwerk nodig. */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  conceptCommando,
  koppelcodeUit,
  leesKnop,
  leesWebhook,
  paginaVoorConcept,
  splitsKeuzes,
  voegSamen,
} from "../lib/whatsapp/berichten";
import { handtekeningKlopt } from "../lib/whatsapp/api";
import { documentNaam } from "../lib/chat-beurt";

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

// 2) Koppelcode
assert.equal(koppelcodeUit("KOPPEL 123456"), "123456");
assert.equal(koppelcodeUit("  koppel   654321 "), "654321");
assert.equal(koppelcodeUit("koppel 12345"), null, "te kort");
assert.equal(koppelcodeUit("wil je koppel 123456 doen"), null, "alleen het hele bericht");

// 3) Knoppen en getypte commando's
assert.deepEqual(leesKnop("pub:42"), { actie: "publiceer", changeId: 42 });
assert.deepEqual(leesKnop("weg:7"), { actie: "weggooien", changeId: 7 });
assert.equal(leesKnop("pub:abc"), null);
assert.equal(leesKnop("pub:-1"), null);
assert.equal(conceptCommando("Publiceer!"), "publiceer");
assert.equal(conceptCommando("zet het live"), "publiceer");
assert.equal(conceptCommando("gooi weg"), "weggooien");
assert.equal(conceptCommando("publiceer de nieuwe vacature ook op de homepage"), null, "gewone opdracht blijft een opdracht");

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

// 7) Handtekening van Meta
const ruw = JSON.stringify(webhook);
const goed = "sha256=" + createHmac("sha256", "geheim").update(ruw).digest("hex");
assert.ok(handtekeningKlopt(ruw, goed, "geheim"));
assert.ok(!handtekeningKlopt(ruw + " ", goed, "geheim"), "aangepaste body");
assert.ok(!handtekeningKlopt(ruw, "sha256=00", "geheim"));
assert.ok(!handtekeningKlopt(ruw, null, "geheim"));
assert.ok(!handtekeningKlopt(ruw, goed, undefined), "zonder geheim altijd weigeren");

// 8) Pdf-namen (portaal én WhatsApp)
const namen = new Set<string>();
assert.equal(documentNaam("Vacature Kok (2026).pdf", namen), "vacature-kok-2026.pdf");
assert.equal(documentNaam("vacature kok 2026.PDF", namen), "vacature-kok-2026-2.pdf");
assert.equal(documentNaam("Één café.pdf", namen), "een-cafe.pdf");

console.log("whatsapp: alle tests geslaagd");
