# Continuïteitsplan WordSwap

**Voor wie:** degene die WordSwap moet afwikkelen of overnemen als Jos Klijnhout
dat zelf niet meer kan (overlijden of langdurige uitval). Dit document bevat
géén wachtwoorden — alle inloggegevens staan in de wachtwoordmanager van Jos,
waar de aangewezen vertrouwenspersoon via nood-toegang bij kan.

**Het doel in één zin:** elke klant krijgt zijn website en zijn bestanden;
niemand raakt zijn site kwijt.

**Geen haast:** de websites blijven automatisch draaien zolang de rekeningen
doorlopen (automatische incasso bij de leveranciers hieronder). Er is maanden
ruimte om dit rustig te doen.

## Wat WordSwap is

WordSwap (dienst van AI Backoffice / J.K. Klijnhout Holding B.V., KvK 09190650)
host statische websites voor kleine ondernemers, die zij via een AI-chat
beheren op wordswap.nl. Elke klantsite is een map platte HTML-bestanden — er is
geen database of CMS per site nodig. Dat maakt overdracht eenvoudig: de
bestanden zíjn de site.

## Waar alles draait

| Dienst | Wat | Account |
|---|---|---|
| GitHub (org `wordpress2ai`) | broncode van wordswap.nl én alle klantsites (één repo per klant) | zie wachtwoordmanager |
| Cloudflare | hosting van de klantsites (Workers + R2) en DNS van klantdomeinen | idem |
| Vercel | wordswap.nl zelf (site, portaal, admin) | idem |
| Neon | database (accounts, chats, inzendingen) | idem |
| Clerk | inloggen van klanten | idem |
| Resend | uitgaande mail | idem |
| Soverin | mailbox jos@wordswap.nl | idem |
| TransIP | domeinregistratie — **domeinen staan op naam van de klant zelf** | idem |
| SnelStart | boekhouding en klantfacturen | idem |
| Meta/Facebook | advertenties (prepaid saldo, geen doorlopende verplichting) | idem |

## Eén klant zijn website geven (het vrijgave-draaiboek)

1. **Bestanden:** download de klant-repo als zip via GitHub
   (`github.com/wordpress2ai/<repo-naam>` → Code → Download ZIP). Die zip is de
   complete website; elke webbouwer of hostingpartij kan hem direct plaatsen.
2. **Mail de klant** (adres staat in de admin op wordswap.nl/admin, of in
   SnelStart): leg uit wat er speelt, stuur de zip (of een downloadlink), en
   meld dat zijn domein al op zijn eigen naam staat bij TransIP — hij kan dus
   zelf (of via een nieuwe webbouwer) de site elders onderbrengen door de
   DNS te laten aanpassen. Formulieren werken elders niet automatisch; een
   webbouwer vervangt ze eenvoudig.
3. **WordPress-terugweg:** van sommige klanten bewaren wij een volledige
   WordPress-backup (map "klant-backups", zie wachtwoordmanager voor de
   locatie). Stuur die mee als hij er is.
4. **Niets overhaast uitzetten:** laat de Cloudflare-worker draaien tot de
   klant bevestigt dat hij is overgestapt.

## Volgorde van afwikkelen (alle klanten)

1. Stuur alle klanten in één keer het bericht uit stap 2 hierboven; geef ze
   ruim de tijd (minimaal 3 maanden) en herinner één keer.
2. Houd wordswap.nl en de workers in de lucht tot iedereen over is.
3. Zeg daarna pas abonnementen op, in deze volgorde: Meta (staat al op prepaid),
   Resend, Clerk, Neon, Vercel, Cloudflare, GitHub, Soverin. TransIP-domeinen
   van klanten lopen buiten ons om (eigen naam klant); wordswap.nl zelf kan
   opgezegd of verkocht.
4. De administratie (SnelStart) bewaren volgens de wettelijke termijn (7 jaar).

## Contact en hulp

Wie dit uitvoert hoeft geen programmeur te zijn, maar enige webkennis helpt.
Kom je er niet uit: elk webbureau kan met dit document en de zip-bestanden per
klant uit de voeten. De AI-hulpmiddelen in deze repo (Claude Code met de
skills in `.claude/skills/`) kennen het hele systeem en kunnen stap voor stap
begeleiden — ook dat staat de vertrouwenspersoon vrij te gebruiken.
