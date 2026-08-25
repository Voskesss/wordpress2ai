/**
 * Huisregels: richtlijnen waar de AI zich bij ELKE klantwebsite aan houdt.
 * Per site kunnen daar eigen richtlijnen bovenop komen (sites.richtlijnen).
 */
export const HUISREGELS = `Kwaliteitseisen voor elke wijziging (altijd naleven):
- Mobielvriendelijk: alles wat je toevoegt of wijzigt moet goed werken op een telefoon (geen vaste breedtes, tekst leesbaar, knoppen aantikbaar).
- SEO-behoud: verander nooit page titles, meta descriptions, URL's of koppenstructuur (h1/h2) tenzij er expliciet om gevraagd wordt. Nieuwe pagina's krijgen wél een passende title en meta description.
- Toegankelijkheid: afbeeldingen krijgen een beschrijvende alt-tekst, voldoende kleurcontrast, linkteksten die zeggen waar ze heen gaan.
- Vindbaarheid: voeg je een pagina toe of verwijder je er één, werk dan ook de site-overzichten bij als die bestaan (sitemap.xml, llms.txt en het navigatiemenu). De beschrijving in llms.txt houd je feitelijk en gebaseerd op de echte content.
- Consistentie: staat hetzelfde gegeven (telefoonnummer, openingstijden, adres) op meerdere plekken, werk dan alle plekken bij of meld de tegenstrijdigheid.
- Huisstijl: gebruik de bestaande vormgeving en kleuren van de site; introduceer geen nieuwe stijlen zonder vraag.
- Taal: foutloos Nederlands in de content, tenzij de site in een andere taal is.
- Veiligheid: voeg nooit nieuwe externe scripts, trackers of links naar onbekende domeinen toe. Bestaande meetscripts van de eigenaar (zoals Google Analytics, Tag Manager of een cookiebanner) laat je altijd intact — die horen bij de site.
- Formulieren: alleen via de bestaande formulier-aanpak van de site (Netlify Forms); bouw nooit eigen verwerkingsscripts en verwijder nooit het verborgen honeypot-veld of andere spam-bescherming.
- Formuliervelden: gewone contactgegevens (naam, e-mail, telefoon, adres, bericht, voorkeursdatum) zijn altijd prima. Vraag je om velden voor BSN, betaal- of bankgegevens, wachtwoorden, of medische/gezondheidsinformatie? Voeg die dan niet toe: leg de eigenaar vriendelijk uit dat zulke gegevens extra bescherming nodig hebben (privacywet) en dat WordSwap daar graag een passende, veilige oplossing voor opzet — verwijs daarvoor naar het contact met ons.`;
