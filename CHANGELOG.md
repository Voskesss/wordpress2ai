# Wat er verandert aan WordSwap

Dit is de lijst in gewone taal: wat een klant zou snappen, niet wat een
programmeur leest. De technische historie staat in git, dit bestand is de
menselijke samenvatting. Het is ook de bron voor serviceberichten aan klanten.

**Een nieuwe versie uitbrengen:** het nummer bijwerken in `lib/versie.ts` en in
`package.json`, hieronder een blok erbij, en daarna een label op de commit die
live ging:

```bash
git tag -a v1.0.1 -m "Korte omschrijving" && git push origin v1.0.1
```

Elke klantsite krijgt bij het overzetten een `wordswap.json` mee met de versie
waarmee hij gebouwd is. Doet een site later iets raars, dan zie je daar met
welke stand van de bouwmotor hij gemaakt is.

Nummers: het eerste cijfer gaat omhoog bij iets waar een klant zijn manier van
werken voor moet aanpassen, het tweede bij nieuwe mogelijkheden, het derde bij
reparaties.

## 1.0.0 (20 september 2026)

De eerste echte versie. Aanleiding: Roelie (RoelArt) staat live, heeft betaald
en haar incasso loopt. Vanaf hier is WordSwap geen project meer maar een dienst
met een klant erop.

Vier weken bouwen, van niets tot dit.

**Een WordPress-site overzetten.** Rechtstreeks vanaf de live site, een export
is niet nodig. Alle pagina's, berichten, foto's, documenten, audio en video
gaan mee. Foto's worden automatisch naar webformaat omgezet zodat de site snel
blijft, en pagina's met veel beeld krijgen vanzelf een nette fotogalerij. De
site komt te draaien op Cloudflare en is daarmee een stuk sneller dan daarvoor.
Vindbaarheid blijft gelijk of wordt beter: de oude adressen blijven werken.

**De website aanpassen door het te typen.** De klant logt in op zijn eigen
portaal, typt wat er anders moet, en de website gaat er zelf mee aan de slag.
Hij krijgt een concept te zien en keurt dat goed voordat het live staat. Wijzen
op de pagina kan ook: klik iets aan en zeg wat eraan moet veranderen.

**Een vangnet tegen halve wijzigingen.** Staat dezelfde tekst of foto op meer
plekken, dan meldt het systeem dat en vraagt of de rest mee moet. Dat gebeurt
mechanisch, niet op gevoel van de AI.

**Foto's, video's, audio en documenten** hebben elk een eigen bank in het
portaal: terugzien wat er op de site staat, opnieuw plaatsen of opruimen.
Uploaden gaat via de paperclip in de chat.

**Formulieren** op de site komen binnen in het portaal en per mail, met een
bevestigingsmail aan de invuller die per formulier in te stellen is. Er zit een
spamrem op zonder dat de bezoeker een puzzel hoeft op te lossen.

**Afspraken maken** vanuit de site, met uitnodiging, bevestiging, afzegging en
agendabestand, allemaal met eigen tekst.

**Je website appen (bèta).** Een klus doorgeven via WhatsApp, met foto's,
spraak of een pdf erbij.

**Een nieuw ontwerp naast de bestaande site.** De klant kan het bekijken voordat
er iets verandert, op een adres dat alleen hij kent.

**Onder de motorkap:** een opleveringspoort die elke site controleert voordat
hij live mag, een fair-use-teller per klant, een AI-budget per site, automatisch
incasseren via Mollie, en een leadadministratie die bijhoudt wie wanneer
gemaild is.

**Wat er nog niet is** en waar we eerlijk over zijn: reacties onder
blogberichten, een nieuwsbrief naar je lezers, en zoeken in je eigen archief.
Die staan op de planning.
