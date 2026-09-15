# Vertrek van een klant (offboarding)

Wat we beloven en doen als een klant opzegt. De opzegknop in het portaal regelt stap 1 en de
mails automatisch; de rest is handwerk van Jos, met de checklist die in de opzeg-mail aan
jos@wordswap.nl staat.

## De afspraken (staan ook zo in het portaal en de opzegbevestiging)

1. **Incasso stopt per direct** — de opzegknop annuleert het abonnement bij Mollie.
2. **Website blijft online** tot het einde van de betaalde periode **plus één maand uitloop**.
   Daarna de workers (`<slug>` en `wv-<slug>`) verwijderen in Cloudflare.
3. **Domein**: staat bij TransIP op naam van de klant — hij kan er altijd zelf bij, ook zonder
   ons (dit is ons antwoord op "bij Vimexx kan ik zelf mijn DNS aanpassen"). Wij mailen een
   **DNS-overzicht** (alle records uit ons Cloudflare-account, vooral MX/SPF/DKIM voor mail),
   zodat de klant of zijn nieuwe bouwer het domein zonder mailstoring kan verhuizen. Na de
   verhuizing de zone uit ons Cloudflare-account verwijderen.
4. **Bestanden en gegevens**: de klant downloadt zelf in het portaal (websitebestanden-zip en
   gegevens-zip met inzendingen, chats en facturen). Dat blijft werken tot de verwijdering.
5. **Verwijderen** (alleen als de klant het aanvinkte): account, site-record, chats en
   inzendingen binnen drie maanden weg; facturen zeven jaar bewaren (wettelijk). Zie ook de
   verwerkersovereenkomst.
6. **Terugweg-garantie**: ligt er nog een WordPress-kopie van vóór de overstap (eerste jaar),
   wijs de klant daar dan op.

## Volgorde in de praktijk

Opzegging binnen → DNS-overzicht mailen → einddatum + 1 maand in de agenda → na verhuizing of
einddatum: workers weg, zone weg → (indien gevraagd) gegevens verwijderen → klant uit de
klantenlijst op "opgezegd".
