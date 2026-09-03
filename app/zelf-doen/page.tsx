import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zelf je WordPress-site omzetten — de complete handleiding",
  description:
    "Stap voor stap je WordPress-site zelf omzetten naar een snelle statische website: export, hosting, formulieren, 301-redirects en SEO-behoud. Gratis en zonder addertjes — en eerlijk over waar het lastig wordt.",
};

type Stap = {
  titel: string;
  duur: string;
  niveau: "makkelijk" | "gemiddeld" | "lastig";
  tekst: string;
  valkuil?: string;
  /** Hoe een AI (zoals Claude) deze stap lichter maakt, met een voorbeeldopdracht */
  metAi?: string;
};

const stappen: Stap[] = [
  {
    titel: "Maak een volledige export van je site",
    duur: "± 15 min",
    niveau: "makkelijk",
    tekst:
      "In WordPress: Extra → Exporteren → \"Alle content\". Je krijgt een XML-bestand met al je teksten. Download daarnaast via FTP of je hostingpaneel de map wp-content/uploads — daar staan al je afbeeldingen. Bewaar ook een lijst van al je pagina-adressen: open je sitemap (meestal /sitemap.xml) en sla die op. Die lijst heb je bij stap 5 keihard nodig.",
    valkuil:
      "Sla óók de HTML van je belangrijkste pagina's op (rechtermuisknop → pagina opslaan). De export bevat je teksten, maar niet hoe je site eruitziet — dat zit in je thema, en dat krijg je niet mee.",
    metAi:
      "Geef Claude je XML-export en vraag: \"maak per pagina een overzicht van titel, adres en tekst, en zet de afbeeldings-verwijzingen op een rij.\" Dan heb je in één keer je werklijst.",
  },
  {
    titel: "Zet de site om naar statische bestanden",
    duur: "2 uur tot meerdere dagen",
    niveau: "lastig",
    tekst:
      "Twee routes. De snelle: een plugin als Simply Static maakt een statische kopie van je hele site — inclusief alle WordPress-ballast (tientallen css/js-bestanden, div-torens van je pagebuilder), dus snel wordt hij daar maar beperkt van. De nette: bouw de pagina's opnieuw op in schone HTML en CSS met je eigen teksten en afbeeldingen. Dat geeft een écht snelle site, maar kost per pagina al gauw een uur of meer handwerk — of je laat een AI-codetool meehelpen.",
    valkuil:
      "Vergeet je 404-pagina niet, en geef die absolute paden (/stijl.css in plaats van stijl.css) — een foutpagina verschijnt op elk willekeurig adres en anders laadt zijn opmaak niet. Wij trapten hier zelf in.",
    metAi:
      "Dit is de stap waar een AI het meeste scheelt. Geef Claude (bijvoorbeeld in Claude Code) de opgeslagen HTML van een pagina plus je teksten en vraag: \"bouw deze pagina na in schone HTML en CSS, zelfde uitstraling, zonder WordPress-ballast.\" Reken op een middag mét AI in plaats van dagen zonder — jij beoordeelt, de AI typt.",
  },
  {
    titel: "Regel je formulieren opnieuw",
    duur: "± 1 uur",
    niveau: "gemiddeld",
    tekst:
      "Een statische site heeft geen server die je contactformulier kan verwerken — dat deed WordPress voor je. Je hebt een externe dienst nodig: Formspree, Web3Forms of Basin hebben gratis instapvarianten. Je wijzigt de action van je formulier naar hun adres en zij mailen de inzending door. Maak ook een nette bedanktpagina.",
    valkuil:
      "Test het formulier écht, met een echte inzending. Een formulier dat er goed uitziet maar niets verstuurt is de meest voorkomende stille fout op overgezette sites — en je komt er pas achter als een klant belt waarom je nooit reageerde.",
    metAi:
      "Vraag Claude: \"pas mijn contactformulier aan zodat het via Formspree verstuurt, en maak een bedanktpagina in de stijl van de site.\" Het testen blijft wél mensenwerk.",
  },
  {
    titel: "Kies hosting en zet je domein over",
    duur: "± 2 uur",
    niveau: "gemiddeld",
    tekst:
      "Statische bestanden host je gratis bij Cloudflare Pages, Netlify of GitHub Pages. Upload je bestanden, koppel je domein via een DNS-wijziging bij je registrar, en https-certificaten regelen ze automatisch. Let op: draait je e-mail bij je oude WordPress-hoster in het pakket? Verhuis die dan éérst naar een aparte e-maildienst, anders ligt je mail eruit op het moment dat je de oude hosting opzegt.",
    valkuil:
      "Zeg je oude hosting pas op als alles al weken goed draait op de nieuwe. De maand dubbel betalen is goedkoper dan één dag offline.",
    metAi:
      "Claude kan je stap voor stap door de DNS-wijziging praten als je een screenshot van je registrar-paneel deelt — precies zeggen welk record je aanpast en welke je met rust laat.",
  },
  {
    titel: "Bewaak je vindbaarheid: elke oude URL moet landen",
    duur: "± 2 uur, en cruciaal",
    niveau: "lastig",
    tekst:
      "Dit is de stap die bijna iedereen overslaat en die je Google-positie kost. Pak de lijst adressen uit stap 1 en controleer ze stuk voor stuk op de nieuwe site: bestaat elk adres nog exact, of verwijst het met een 301-redirect door naar de nieuwe plek? WordPress-adressen eindigen vaak op een slash of zitten in mappen die je nieuwe structuur niet heeft. Neem ook je paginatitels en meta-omschrijvingen letterlijk mee, en zet een nieuwe sitemap.xml neer.",
    valkuil:
      "Elk oud adres dat een 404 geeft, is voor Google een verdwenen pagina — en je positie verdampt binnen weken. Toen wij ons eigen proces controleerden vonden we er 21 die stilletjes kapot waren, ondanks alle zorgvuldigheid. Check het dus twee keer.",
    metAi:
      "Geef Claude je oude sitemap en de lijst nieuwe adressen en vraag: \"controleer per oud adres of het nog bestaat of een redirect nodig heeft, en genereer de redirect-regels.\" Machinewerk waar een AI beter in is dan een mens met een lijstje.",
  },
  {
    titel: "En daarna: elke wijziging gaat in de code",
    duur: "blijvend",
    niveau: "lastig",
    tekst:
      "Hier verandert het karakter van de klus. Je site is nu snel, veilig en gratis gehost — maar er is geen beheerscherm meer. Nieuwe openingstijden, een foto vervangen, een blogbericht erbij: het betekent HTML-bestanden aanpassen en opnieuw uploaden. Ook dát kan met Claude — maar dan moet je er wel elke keer zelf voor gaan zitten: bestanden aanleveren, het resultaat controleren, uploaden, checken of er niets anders is meegewijzigd. Voor wie het leuk vindt is dat prima; voor de meeste ondernemers is het precies het klusje dat blijft liggen.",
  },
];

const niveauKleur: Record<Stap["niveau"], string> = {
  makkelijk: "bg-emerald-50 border-emerald-200 text-emerald-700",
  gemiddeld: "bg-amber-50 border-amber-200 text-amber-700",
  lastig: "bg-red-50 border-red-200 text-red-700",
};

export default function ZelfDoen() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-4 sm:flex sm:items-center sm:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
            Zelf je WordPress-site omzetten
          </h1>
          <p className="mt-5 text-lg text-stone-600 leading-relaxed">
            Alles wat wij doen, kun je in principe zelf — zeker met een
            AI-hulp als Claude ernaast, die het meeste handwerk uit handen
            neemt. Hier staat precies hoe, zonder addertjes, inclusief de
            valkuilen waar wij zelf in zijn getrapt én de opdrachten die je de
            AI kunt geven. Kom je er zelf uit: fantastisch. Kom je er
            halverwege achter dat je hier je tijd niet in wilt stoppen: dan
            weet je ons te vinden, en snap je meteen wat je bij ons afneemt.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <ol className="space-y-10">
          {stappen.map((stap, i) => (
            <li key={stap.titel} className="reveal flex gap-5">
              <span className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-700 text-white font-semibold text-lg">
                {i + 1}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-xl font-semibold">{stap.titel}</h2>
                <p className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-stone-500">
                    ⏱ {stap.duur}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 font-medium ${niveauKleur[stap.niveau]}`}>
                    {stap.niveau}
                  </span>
                </p>
                <p className="mt-3 text-stone-600 leading-relaxed">{stap.tekst}</p>
                {stap.metAi && (
                  <p className="mt-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 text-sm text-violet-900 leading-relaxed">
                    <strong>🤖 Met AI:</strong> {stap.metAi}
                  </p>
                )}
                {stap.valkuil && (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 leading-relaxed">
                    <strong>⚠️ Valkuil:</strong> {stap.valkuil}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-[#f6f1e7] border-y border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Eerlijk opgeteld
          </h2>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Met een AI als Claude ernaast is dit voor een kleine site in een
            dag of een weekend te doen — zonder AI eerder meerdere dagen. Ben
            je handig en vind je dit leuk: doen! Je site wordt er echt beter
            van, en dit stappenplan brengt je er.
          </p>
          <p className="mt-4 text-stone-600 leading-relaxed">
            Wat wij toevoegen zit vooral in de laatste stap: bij ons zit
            diezelfde AI vást aan je site. Je typt in een chat wat er anders
            moet, ziet het resultaat als concept en klikt op publiceer — geen
            bestanden aanleveren, niets uploaden, geen controle of er per
            ongeluk iets anders is meegewijzigd. Dat verschil voel je pas bij
            de tiende wijziging, en het is de reden dat onze klanten blijven.
            De overstap zelf doen we no cure, no pay: je ziet eerst de complete
            kopie, en alleen als je tevreden bent betaal je (vanaf €250).
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-full bg-violet-700 px-6 py-3 text-white font-semibold hover:bg-violet-600"
            >
              Toch liever laten doen
            </Link>
            <Link
              href="/demo"
              className="rounded-full border border-stone-300 px-6 py-3 font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
            >
              Eerst de AI-chat proberen
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
