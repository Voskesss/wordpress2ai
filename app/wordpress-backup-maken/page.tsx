import type { Metadata } from "next";
import SeoLanding from "../SeoLanding";

export const metadata: Metadata = {
  title: "Een complete backup van je WordPress-site maken",
  description:
    "Zo maak je in 10 minuten gratis een volledige kopie van je WordPress-site (bestanden én database) met UpdraftPlus — zonder technische kennis. Handig vóór elke overstap of grote wijziging.",
  alternates: { canonical: "/wordpress-backup-maken" },
};

export default function Pagina() {
  return (
    <SeoLanding
      data={{
        slug: "wordpress-backup-maken",
        label: "WordPress-backup",
        titel: "Een complete kopie van je WordPress-site maken — in 10 minuten, gratis",
        intro:
          "Een echte backup van WordPress bestaat uit twee delen: de bestanden (thema, plugins, afbeeldingen) én de database (al je teksten en instellingen). Alleen met allebei kun je je site later ergens anders exact terugzetten. Zo maak je die kopie zelf, zonder technische kennis en zonder iemand je inloggegevens te geven. Wij laten elke klant dit doen vóór hij zijn oude hosting opzegt — zo kun je bij WordSwap altijd terug.",
        blokken: [
          {
            kop: "Stap 1 — Installeer UpdraftPlus (gratis)",
            tekst:
              "Log in op je WordPress-beheer (meestal jouwdomein.nl/wp-admin). Ga in het menu naar Plugins → Nieuwe plugin, zoek op “UpdraftPlus”, klik Nu installeren en daarna Activeren. UpdraftPlus is al jaren de meest gebruikte gratis backup-plugin; ook het terugzetten is gratis, zonder groottelimiet.",
          },
          {
            kop: "Stap 2 — Maak de backup",
            tekst:
              "Ga naar Instellingen → UpdraftPlus Back-ups en klik op de grote knop “Nu back-uppen”. Vink beide opties aan (database én bestanden) en bevestig. Afhankelijk van de grootte van je site duurt dit enkele minuten; je kunt gewoon wachten op dezelfde pagina.",
          },
          {
            kop: "Stap 3 — Download de bestanden",
            tekst:
              "Na afloop verschijnt de backup onderaan onder “Bestaande back-ups”, als rijtje knoppen: Database, Plugins, Thema's, Uploads en Overige. Klik ze één voor één aan en download elk bestand naar je computer. Samen vormen deze zipbestanden je complete kopie — bewaar ze in één map met de datum erbij.",
          },
          {
            kop: "Stap 4 — Bewaar hem op twee plekken",
            tekst:
              "Eén kopie op je eigen computer of externe schijf, en één ergens anders (bijvoorbeeld in je clouddrive). Stap je over naar WordSwap? Dan stuur je ons desgewenst ook een kopie — die bewaren wij twaalf maanden mee, als onderdeel van onze terugweg-garantie. Het origineel blijft altijd van jou.",
          },
          {
            kop: "Alternatief: de backup-knop van je hoster",
            tekst:
              "Kun of wil je geen plugin installeren? Vrijwel elke hostingpartij heeft in het klantenpaneel (cPanel, DirectAdmin of Plesk) een knop om een volledige back-up van je account te downloaden — bestanden en database in één keer. Technisch net zo goed; je moet alleen weten hoe je in dat paneel inlogt.",
          },
          {
            kop: "Waarom wij hierop hameren",
            tekst:
              "WordSwap zet WordPress-sites om naar snelle statische websites die je daarna aanpast door gewoon te typen wat er anders moet. Maar overstappen moet nooit een fuik zijn: vóór je je oude hosting opzegt, maak je deze kopie. Wil je later terug naar WordPress, dan huur je hosting, zet je de backup terug en wijs je je domein om — en alles is weer zoals het was. Je hoeft ons er nooit je wachtwoorden voor te geven.",
          },
        ],
        faq: [
          {
            vraag: "Is mijn WordPress-export bij WordSwap ook de backup?",
            antwoord:
              "Nee. De export die je via Extra → Exporteren maakt (een XML-bestand) bevat alleen je teksten, niet je thema, plugins en instellingen. Voor een complete kopie waarmee je je site exact kunt terugzetten heb je de volledige backup uit deze stappen nodig: bestanden én database.",
          },
          {
            vraag: "Hoe groot wordt zo'n backup?",
            antwoord:
              "Meestal tussen de 100 MB en een paar GB — afbeeldingen en video's bepalen het grootste deel. Te groot om te mailen? Verstuur hem dan met een dienst als WeTransfer, of lever hem aan op een USB-stick.",
          },
          {
            vraag: "Moet ik dit regelmatig doen?",
            antwoord:
              "Zolang je site op WordPress draait: ja, zeker vóór elke grote update of wijziging. Veel hosters maken zelf dagelijkse back-ups, maar controleer of dat echt zo is en hoe lang ze bewaard blijven. Na een overstap naar WordSwap speelt dit niet meer: van elke gepubliceerde wijziging bewaren wij automatisch versies.",
          },
          {
            vraag: "Kan WordSwap de backup voor mij maken?",
            antwoord:
              "We lopen de stappen graag samen met je door, aan de telefoon of via een korte videocall — dat is in tien minuten gebeurd. We vragen je bewust niet om je inloggegevens: jouw toegang blijft van jou. Lukt het echt niet, dan kijken we samen naar de hoster-route.",
          },
        ],
      }}
    />
  );
}
