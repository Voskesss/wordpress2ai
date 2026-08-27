# Draaiboek e-mailmigratie

E-mail is het grootste risico bij een sitemigratie: zegt de klant z'n oude hosting op terwijl de mail daar nog draait, dan is hij z'n mail kwijt. Dit draaiboek voorkomt dat. **Gouden regel: de oude hosting wordt pas opgezegd als de mail aantoonbaar ergens anders draait.**

## Stap 1 — Diagnose bij elke intake (10 seconden)

```bash
npx tsx scripts/mail-check.mts klantdomein.nl
```

Drie uitkomsten:

**A. Mail draait extern** (Microsoft 365, Google Workspace, Soverin, aparte mailhoster) — ±helft van de gevallen.
→ Géén mailmigratie nodig. Alleen bij de DNS-verhuizing naar Cloudflare ALLE records exact overnemen: MX, SPF (let op includes!), DKIM (vaak CNAME's als `selector1._domainkey`), DMARC, en autodiscover-records. Na de nameserver-wissel testen: mail sturen én ontvangen.

**B. Mail draait bij de webhoster** (Vimexx, Antagonist, SiteGround, Hostnet, Mijndomein, one.com...).
→ E-mailmigratie nodig, als betaalde aanvulling. Ga naar stap 2.

**C. Geen MX-records** — klant gebruikt geen mail op het domein (gmail.com-adres o.i.d.).
→ Niets doen. Wel kans om een professioneel adres te verkopen ("info@jouwbedrijf.nl staat een stuk beter").

## Stap 2 — Intakevragen bij geval B

1. Hoeveel mailboxen zijn er, en welke adressen? (webmail/hostingpaneel van de oude hoster tonen ze)
2. Zijn er aliassen of doorstuuradressen? (info@ → privé-gmail komt veel voor)
3. Hoe lezen ze mail: webmail, Outlook/Mail-app op computer, telefoon? (bepaalt de supportlast bij stap 4)
4. Hoeveel mail moet mee (GB per box)? Moet álles mee of alleen recent?
5. Gebruiken ze agenda/contacten via de hoster? (zeldzaam; zo ja → Microsoft 365 aanraden)

## Stap 3 — Doelprovider kiezen (advies aan de klant)

| Situatie | Advies | Prijs p/box p/m |
|---|---|---|
| Alleen mail, simpel en Nederlands | **Soverin** (of TransIP mail-only) | ± €3-4 |
| Ze gebruiken Word/Excel/Teams | **Microsoft 365 Business Basic** | ± €6 |
| Ze leven in Google-land | **Google Workspace Starter** | ± €6 |

Het abonnement sluit de KLANT af (eigen naam, eigen betaling — geen lock-in bij ons, zoals op de prijzenpagina staat). Wij regelen de inrichting en verhuizing.

## Stap 4 — Het verhuisdraaiboek (geval B)

**Dag -3 à -7:**
1. Nieuwe mailomgeving aanmaken: zelfde adressen, sterke wachtwoorden (wachtwoordmanager of veilig doorgeven), aliassen/doorstuurregels nabouwen.
2. Oude mail kopiëren met **imapsync** (draait lokaal, per mailbox oud-IMAP → nieuw-IMAP; kan herhaald draaien, pakt alleen nieuwe berichten). Grote boxen: eerste sync vroeg starten.
3. TTL van de DNS-records alvast laag zetten (300s) als dat kan.

**Dag 0 (de omschakeling, bij voorkeur eind van de middag):**
4. Laatste imapsync-run (delta).
5. DNS omzetten: MX naar de nieuwe provider + nieuwe SPF/DKIM/DMARC erbij. (Bij gelijktijdige site-migratie: dit is hetzelfde moment als de nameserver-wissel naar Cloudflare — neem dan meteen alles goed mee.)
6. Testmails: extern → elk adres, en vanaf elk adres → extern (check ook spam-map van de ontvanger).

**Dag 0/+1 (apparaten — de grootste supportlast, plan er tijd voor):**
7. Per gebruiker de nieuwe account instellen in Outlook/Mail/telefoon; oude account laten staan tot alles zichtbaar goed is, daarna verwijderen. Korte handleiding met schermafbeeldingen meesturen scheelt telefoontjes.

**Dag +7:**
8. Controle: komt alles aan, verstuurt alles netjes (geen spam-markering)? DMARC-rapporten checken indien ingesteld.
9. Klant bevestigt akkoord → **nu pas** mag de oude hosting opgezegd worden.

## Stap 5 — Prijs en scope

- Richtprijs: **€49 per mailbox** (verhuizing + inrichting + apparaathulp op afstand), minimum €99 per traject. Het mailabonnement zelf betaalt de klant rechtstreeks aan de provider (vanaf ± €3-6 p/box p/m) — zo staat het ook op de prijzenpagina.
- Niet inbegrepen (apart offreren): agenda-/contactenmigratie, gedeelde mailboxen, meer dan 10 GB per box, ter plaatse langskomen.

## Valkuilen

- **SPF-includes vergeten** bij de DNS-verhuizing → mail van de klant belandt in spam. Neem het oude SPF-record altijd letterlijk over en breid uit, gooi nooit zomaar includes weg (nieuwsbrieftools als Sendgrid/Mailchimp zitten er vaak in).
- **Formulier-mail**: WordPress-formulieren verstuurden vaak via de hoster (wp_mail). Ons formulier-systeem lost dat al op (Resend), maar check of de klant nog ergens anders vanaf het domein mailt.
- **Autodiscover/autoconfig-records** vergeten → Outlook kan de account niet automatisch instellen.
- **Te vroeg opzeggen**: nooit, echt nooit, de oude hosting opzeggen vóór stap 9.
