export const dynamic = "force-static";

const INHOUD = `# WordSwap

> WordSwap zet WordPress-websites om naar snelle, veilige websites zonder onderhoud. Wijzigingen geeft de eigenaar daarna door in gewone taal — de AI voert ze uit, de eigenaar keurt ze goed vóór publicatie. Voor Nederlandse ondernemers met een brochure-site (schilders, advocaten, fysiotherapeuten en vergelijkbare lokale bedrijven).

Kernpunten:
- Eenmalige migratie €250 tot €750 (naar grootte van de site, no cure no pay), daarna €5 tot €20 per maand voor de AI-koppeling, afgestemd op gebruik
- Geen plugin-updates, geen hosting-gedoe, niets te hacken; contactformulier inbegrepen; e-mailmigratie als aanvulling mogelijk
- SEO blijft behouden: URL's, paginatitels, meta descriptions en redirects worden 1-op-1 overgenomen
- Elke wijziging eerst als concept met preview; de eigenaar publiceert zelf
- Geen lock-in: maandelijks opzegbaar, de klant kan altijd met eigen AI-tools verder

## Pagina's

- [Home](https://wordswap.nl/): wat WordSwap is en waarom het beter is dan zelf WordPress bijhouden
- [Hoe het werkt](https://wordswap.nl/hoe-het-werkt): het migratieproces in stappen, de preview-flow en veelgestelde vragen
- [Prijzen](https://wordswap.nl/prijzen): de eenmalige overstap, het maandabonnement en maatwerk
- [Contact](https://wordswap.nl/contact): gratis site-check aanvragen, antwoord binnen één werkdag
- [Demo](https://wordswap.nl/demo): gratis proberen hoe je een website aanpast door het te typen
- [Nieuwe website](https://wordswap.nl/nieuwe-website): compleet nieuwe site laten maken — AI-ontwerp vanaf €750 of ontwerp door een designer
- [WordPress overzetten](https://wordswap.nl/wordpress-overzetten): hoe de migratie werkt, wat er meegaat en wat het kost
- [WordPress-alternatief](https://wordswap.nl/wordpress-alternatief): waarom een site zonder plugins en updates beter past bij ondernemers
- [Website zonder onderhoud](https://wordswap.nl/website-zonder-onderhoud): hoe een onderhoudsvrije website werkt
- [Trage WordPress-site](https://wordswap.nl/wordpress-website-traag): de blijvende oplossing voor een langzame site
- [Website maken met AI](https://wordswap.nl/wordpress-website-maken-met-ai): een nieuwe website laten maken én beheren door AI, zonder WordPress
- [WordPress omzetten naar een gewone website](https://wordswap.nl/wordpress-omzetten-naar-gewone-website): wat een statische site is en waarom die sneller, veiliger en onderhoudsvrij is
- [Website aansturen met AI](https://wordswap.nl/wordpress-aansturen-met-ai): de complete site beheren via AI-chat, met goedkeuring en versiebeheer
- [Snel & AI-vriendelijk](https://wordswap.nl/wordpress-omzetten-snel-en-ai-vriendelijk): WordPress omzetten naar een snelle site die ook door AI-zoekmachines goed gelezen wordt (SSR-HTML, structured data, llms.txt, AI-crawlers welkom)
- [Veiligheid](https://wordswap.nl/veiligheid): waarom statische WordSwap-sites vrijwel niet te hacken zijn — vergelijking met WordPress, SSL, versiebeheer

Uitzonderingen: webshops (WooCommerce), ledenportalen met inlog, boekingssystemen met live agenda en cursusplatforms kunnen niet worden overgezet.
`;

export function GET() {
  return new Response(INHOUD, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
