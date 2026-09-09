import Link from "next/link";

export default function PersoonlijkBlok({ hero = false }: { hero?: boolean }) {
  return (
    <aside
      className={
        hero ? "personal-portrait personal-portrait-hero" : "personal-portrait"
      }
      aria-label="Je aanspreekpunt bij WordSwap"
    >
      <div className="personal-caption">
        <div>
          <strong>Jos Klijnhout</strong>
          <span>Oprichter · jouw aanspreekpunt</span>
        </div>
        <span className="personal-location">Oosterbeek</span>
      </div>
      <div className="personal-note">
        <p>
          Je hebt rechtstreeks contact met Jos. Van de eerste vraag tot de
          overstap van je website.
        </p>
        <Link href="/contact">Neem contact op met Jos →</Link>
      </div>
    </aside>
  );
}
