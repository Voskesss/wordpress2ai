# Ontwerp-route: een nieuw ontwerp naast live en werkversie

Voor een opfrisbeurt of totale herbouw van een klantsite, zonder de live site
of het concept van de klant te raken. Alles mag anders zijn; de poort is de
bouw-controle (lib/bouw-controle.ts), niet de gelijkenis met het oude ontwerp.

## De drie omgevingen per site

| omgeving   | branch            | worker                  | wie kijkt er            |
|------------|-------------------|-------------------------|-------------------------|
| live       | main              | `<slug>` (+ eigen domein) | iedereen              |
| werkversie | concept-branches  | `wv-<slug>`             | klant (concepten uit de chat) |
| ontwerp    | `ontwerp` (vast)  | `ontwerp-<slug>`        | wij; klant pas als Jos de link deelt |

De ontwerp-worker krijgt automatisch een balk "Ontwerpvoorstel door WordSwap —
dit is niet je echte website" (injectie in lib/cloudflare.ts) en is noindex
(workers.dev-kop in het leesscript).

## Werkwijze

1. **Aanmaken** — admin-knop op de klantpagina, of
   `npx tsx --env-file=.env.local scripts/ontwerp.mts start <repo>`.
   Maakt branch `ontwerp` vanaf main en deployt naar `ontwerp-<slug>`.
2. **Bouwen** — lokaal vanuit Claude Code: in `~/wordswap-klanten/<repo>`
   `git fetch origin && git checkout ontwerp`, bouwen volgens de gewone
   bouwrichtlijnen (migreer-klant SKILL.md, stap 2), pushen, en
   `scripts/ontwerp.mts deploy <repo>`. Tussentijds checken:
   `scripts/ontwerp.mts controle <repo>`.
3. **Bijwerken vanaf live** — de klant wijzigt intussen teksten op main.
   Vóór promotie altijd `bijwerken` (of de admin-knop): merget main het
   ontwerp in. Conflict? Lokaal oplossen en pushen.
4. **Promoveren** — admin-knop "Naar de werkversie" of
   `scripts/ontwerp.mts promoveer <repo>`. Blokkeert hard op: een al open
   concept, een ontwerp dat achterloopt op main, en fouten uit de
   bouw-controle. Daarna: de ontwerp-inhoud wordt één commit bovenop main
   (zetBranchOpInhoudVan), er komt een gewone concept-rij, en de werkversie
   toont het nieuwe ontwerp. De klant geeft akkoord in zijn portaal en
   Publiceren zet het live — het bestaande pad, geen tweede route.
5. **Opruimen** — na livegang (of afblazen): admin-knop of
   `scripts/ontwerp.mts weg <repo>`.

## Waarom promotie via één vervang-commit

Een totaal ander ontwerp laat zich niet regel-voor-regel mergen met main.
Daarom zet promotie de complete ontwerp-inhoud als één commit met de kop van
main als ouder: voor git is het daarna een gewone wijziging, dus Publiceren
(merge in main) verloopt schoon. Voorwaarde is stap 3: eerst live-wijzigingen
het ontwerp in halen, anders zouden die overschreven worden — de promotie
weigert daarom zolang het ontwerp achterloopt.
