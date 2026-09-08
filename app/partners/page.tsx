import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Samenwerken: bestaande WordPress-klantsites overzetten",
  description:
    "Voor IT-beheerders, ontwerpers en bureaus: verken een samenwerking voor eenvoudige WordPress-sites die klanten daarna met AI bijhouden.",
  alternates: { canonical: "/partners" },
};
export default function Partners() {
  return (
    <div className="marketing-home">
      <section className="shell section-space pricing-heading">
        <p className="eyebrow">
          VOOR IT-BEHEERDERS, ONTWERPERS EN KLEINE BUREAUS
        </p>
        <h1>
          Je klant wil zijn website houden.
          <br />
          <em>Het beheer kan eenvoudiger.</em>
        </h1>
        <p className="section-intro">
          Heb je klanten met een eenvoudige WordPress-bedrijfssite? WordSwap
          verzorgt de overstap met de bestaande vormgeving, URL’s en
          SEO-inrichting als uitgangspunt. Daarna houdt de klant de site bij met
          AI-chat.
        </p>
        <Link href="/contact?onderwerp=samenwerken" className="button-primary">
          Bespreek één geschikte klantsite →
        </Link>
      </section>
      <section className="shell section-space">
        <div className="benefit-grid">
          <article className="benefit">
            <h2>Begin met één site</h2>
            <p>
              We bekijken samen de functies en de aandachtspunten.
              Bedrijfssites, blogs en contactformulieren passen; webshops en
              ledenportalen vallen buiten de standaardoverstap.
            </p>
          </article>
          <article className="benefit">
            <h2>Heldere rolverdeling</h2>
            <p>
              Vooraf spreken we af wie de klant begeleidt, wie ondersteuning
              levert en hoe doorverwijzing of vergoeding werkt. Er is nog geen
              vast partnerpakket: we toetsen de samenwerking eerst in de
              praktijk.
            </p>
          </article>
          <article className="benefit">
            <h2>De klant ziet het eerst</h2>
            <p>
              We nemen de bestaande site zorgvuldig over. De klant beoordeelt
              het resultaat voordat de domeinkoppeling verandert. Extra functies
              en afwijkingen bespreken we vooraf.
            </p>
          </article>
        </div>
        <p className="section-intro">
          Neem contact op met de vermelding ‘samenwerken’. Deel eerst alleen het
          openbare websiteadres; inloggegevens zijn voor dit gesprek niet nodig.
        </p>
      </section>
    </div>
  );
}
