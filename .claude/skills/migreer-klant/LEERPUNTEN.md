# Leerpunten uit eerdere migraties

Lees dit vóór elke migratie. Leer je iets nieuws: voeg het hier direct toe (datum + les), meld het aan Jos en commit.

- **2026-08-26 (VGK):** Custom post types (bv. `onze_diensten`, teamleden) zitten NIET in de WXR-export — het importoverzicht meldt ze als "overgeslagen". Altijd van de live site halen, anders missen hele pagina's.
- **2026-08-26 (VGK):** `delen/` met menu/footer moet in de map die gepusht wordt (wortel van de klant-map), anders blijven de invoeg-markers leeg → site zonder menu/footer. Controleer na de bouw dat elke gebruikte marker een bestaand delen-bestand heeft.
- **2026-08-26 (VGK):** WordPress bewaart elke foto in 5-6 formaten (-300x200 enz.). Altijd dedupliceren op basisnaam en alleen het grootste/origineel downloaden — anders gaat het budget op aan duplicaten en missen echte foto's (het voorbereid-script doet dit al).
- **2026-08-26 (VGK):** Teamfoto's en andere beelden laden vaak lazy (`data-src`) — een simpele src-scan mist ze. Het voorbereid-script vangt dit; bij handmatig oogsten zelf op letten.
- **2026-08-26 (VGK):** Thema-restanten zoals "Principles of our work" met lorem ipsum stonden écht in de bron — altijd wegfilteren, nooit overnemen.
- **2026-08-26 (VGK):** Teamsecties origineel = ronde portretten op gekleurde cirkels zonder kaderdozen; bekijk de bron-screenshots voordat je een eigen kaartontwerp kiest.
- **2026-08-26 (VGK):** Sitetitels in WXR bevatten soms dubbel-gecodeerde entiteiten (`&#124;` = |). Decoderen in titels; in pagina-inhoud juist laten staan.
- **2026-08-26 (algemeen):** De artikelen/"Actueel" van sommige sites komen uit een externe plugin/feed en staan niet (volledig) in de export. Check of de live site meer berichten toont dan de export bevat; overleg met Jos (weglaten, bevriezen of maatwerk-sync).
