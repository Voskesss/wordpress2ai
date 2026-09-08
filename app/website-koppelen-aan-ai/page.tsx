import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "Je website koppelen aan AI — zo werkt het écht",
  description:
    "Je website koppelen aan AI: geen plug-in of chatbot erbij, maar een AI die je hele site beheert. Je typt wat er anders moet en het staat live. Overstap vanaf €150, no cure no pay.",
  alternates: { canonical: "/website-koppelen-aan-ai" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "website-koppelen-aan-ai",
        label: "Website koppelen aan AI",
        titel: "Je website koppelen aan AI — zonder plug-ins, zonder gedoe",
        intro:
          "Steeds meer ondernemers willen hun website aan AI koppelen. Meestal krijg je dan een plug-in die teksten voorstelt of een chatbot in de hoek van je scherm — terwijl je zélf nog steeds door het beheerscherm moet klikken. WordSwap koppelt het andersom: de AI wórdt je websitebeheerder. Je typt in gewone taal wat er anders moet (\"zet de zomeropeningstijden erop\", \"voeg een pagina toe over dakisolatie\"), je ziet het resultaat als voorbeeld en klikt op Publiceer. Dat is de koppeling.",
        blokken: [
          {
            kop: "Wat 'website koppelen aan AI' meestal betekent — en waarom dat tegenvalt",
            tekst:
              "De meeste AI-koppelingen zijn hulpjes ín je bestaande systeem: een WordPress-plug-in die een alinea schrijft, een chatbot die vragen van bezoekers beantwoordt, een tool die je SEO-teksten aanvult. Handig, maar de site zelf blijft een machine die jij moet bedienen: inloggen, het juiste blok vinden, opslaan, hopen dat er niets breekt. En elke plug-in is er weer een die om updates vraagt en kan botsen met de rest.",
          },
          {
            kop: "Hoe WordSwap je website aan AI koppelt",
            tekst:
              "Wij zetten je site eerst om naar snelle, platte web-bestanden zonder draaiende machine — geen database, geen plug-ins, minder WordPress-onderdelen om te beveiligen. Daaraan koppelen we een AI die je site kent: elke pagina, elke tekst, elke foto. Vanaf dat moment beheer je je website via een chat. De AI voert de wijziging uit in de stijl van je site, jij beoordeelt het voorbeeld en publiceert. Niet goed? Typ wat er anders moet, of ga terug naar een eerdere versie.",
          },
          {
            kop: "Wat je er in de praktijk mee doet",
            tekst:
              "Openingstijden, prijzen en teksten aanpassen. Een foto vervangen door aan te wijzen welke — zonder AI als je wilt. Een nieuwe pagina laten schrijven en bouwen in de stijl van je site. Een blogbericht insturen vanaf je telefoon, desnoods ingesproken. Je paginatitels en Google-omschrijvingen zelf regelen. Alles vanuit één scherm, ook op je telefoon, en altijd eerst als voorbeeld.",
          },
          {
            kop: "Veilig gekoppeld",
            tekst:
              "De AI kan uitsluitend bij de bestanden van jouw site voor het uitvoeren van je wijzigingen. Elke wijziging is een concept dat jij goedkeurt, en van elke versie blijft een kopie bewaard. De publieke website heeft geen WordPress-plugins of database. Accounts, formulieren en hosting blijven beveiliging nodig hebben.",
          },
        ],
        faq: [
          {
            vraag: "Kan ik mijn huidige WordPress-site aan AI koppelen zonder over te stappen?",
            antwoord:
              "Met een plug-in kan dat, maar dan houd je alle nadelen van WordPress (updates, plug-ins, beveiliging, traagheid). Wij zetten je site daarom eerst om naar een versie zonder onderhoud en koppelen de AI daaraan — een zo getrouw mogelijke kopie, no cure no pay, vanaf €150.",
          },
          {
            vraag: "Is dit een chatbot voor mijn bezoekers?",
            antwoord:
              "Nee — dit is een AI voor jóú, om je site mee te beheren. Bezoekers merken alleen dat je site sneller is en altijd actueel. (Een bezoekers-chatbot kan er los van worden toegevoegd als je dat wilt.)",
          },
          {
            vraag: "Wat als de AI iets verkeerd doet?",
            antwoord:
              "Dan zie je dat in het voorbeeld vóórdat het live gaat en typ je wat er anders moet. En ook na publiceren kun je elke versie met één klik terugzetten. Er kan niets definitief stuk.",
          },
          {
            vraag: "Wat kost een website die aan AI gekoppeld is?",
            antwoord:
              "Eenmalig €150 tot €650 voor de overstap (afhankelijk van de grootte), daarna €5 tot €20 per maand voor de AI-koppeling — afgestemd op hoe vaak je iets wijzigt. Hosting is inbegrepen in de koppeling; je publieke site gebruikt geen WordPress-plugins meer.",
          },
        ],
      }}
    />
  );
}
