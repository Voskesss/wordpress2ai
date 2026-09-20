import assert from "node:assert/strict";
import { MAIL_BEELD_BREEDTE, losseMailNaarHtml } from "../lib/mailer";

const beeld = "https://opslag.example.com/mail/123-abc.jpg";

// Een alinea die alleen de markering bevat wordt de afbeelding zelf
{
  const html = losseMailNaarHtml(`Hallo Albert,\n\n[afbeelding: ${beeld}]\n\nZo zou het eruit kunnen zien.`, false);
  assert.ok(html.includes(`<img src="${beeld}"`));
  // Schaalt mee in smalle mailvensters, en heeft een vaste breedte voor Outlook
  assert.ok(html.includes('width="560"'));
  assert.ok(html.includes("max-width:560px"));
  assert.ok(html.includes("height:auto"));
  // De markering zelf mag nergens meer als tekst staan
  assert.ok(!html.includes("[afbeelding:"));
  // De tekst eromheen blijft gewoon staan, in de juiste volgorde
  assert.ok(html.indexOf("Hallo Albert") < html.indexOf("<img"));
  assert.ok(html.indexOf("<img") < html.indexOf("Zo zou het eruit kunnen zien"));
}

// Let op: de handtekening bevat zelf een logo-<img>, dus altijd op de beeld-URL toetsen
const heeftBeeld = (html: string) => html.includes(`<img src="${beeld}"`);

// Een losse link in een gewone zin blijft een klikbare link, geen afbeelding
{
  const html = losseMailNaarHtml(`Kijk op ${beeld} voor meer.`, false);
  assert.ok(html.includes(`<a href="${beeld}"`));
  assert.ok(!heeftBeeld(html));
}

// Alleen een exacte markering telt; losse tekst eromheen maakt het gewone tekst
{
  const html = losseMailNaarHtml(`Let op [afbeelding: ${beeld}] hiernaast`, false);
  assert.ok(!heeftBeeld(html));
}

// Geen markering? Dan verandert er niets aan het bestaande gedrag
{
  const html = losseMailNaarHtml("Hallo,\n\nGewone mail zonder beeld.", false);
  assert.ok(!heeftBeeld(html));
  assert.ok(html.includes("Met vriendelijke groet,"));
  assert.ok(html.includes("logo-mail-groen.png")); // de handtekening staat er nog
}

// De opslagbreedte is tweemaal de toonbreedte, zodat hij scherp is op retina
assert.equal(MAIL_BEELD_BREEDTE, 1120);

console.log("mail-afbeelding: alle checks geslaagd");
