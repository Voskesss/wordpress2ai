export const dynamic = "force-static";

const INHOUD = `# WordSwap

> WordSwap zet WordPress-websites om naar snelle, veilige websites zonder onderhoud. Wijzigingen geeft de eigenaar daarna door in gewone taal — de AI voert ze uit, de eigenaar keurt ze goed vóór publicatie. Voor Nederlandse ondernemers met een brochure-site (schilders, advocaten, fysiotherapeuten en vergelijkbare lokale bedrijven).

Kernpunten:
- Eenmalige migratie vanaf €250 (eenvoudige sites), daarna €20 per maand voor de AI-koppeling
- Geen plugin-updates, geen hosting-gedoe, niets te hacken; contactformulier inbegrepen; e-mailmigratie als aanvulling mogelijk
- SEO blijft behouden: URL's, paginatitels, meta descriptions en redirects worden 1-op-1 overgenomen
- Elke wijziging eerst als concept met preview; de eigenaar publiceert zelf
- Geen lock-in: maandelijks opzegbaar, de klant kan altijd met eigen AI-tools verder

## Pagina's

- [Home](https://wordswap.nl/): wat WordSwap is en waarom het beter is dan zelf WordPress bijhouden
- [Hoe het werkt](https://wordswap.nl/hoe-het-werkt): het migratieproces in stappen, de preview-flow en veelgestelde vragen
- [Prijzen](https://wordswap.nl/prijzen): de eenmalige overstap, het maandabonnement en maatwerk
- [Contact](https://wordswap.nl/contact): gratis site-check aanvragen, antwoord binnen één werkdag
`;

export function GET() {
  return new Response(INHOUD, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
