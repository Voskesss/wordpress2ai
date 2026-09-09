import Link from "next/link";
import { josFoto } from "@/lib/persoonlijk";

export default function PersoonlijkBlok({ hero = false }: { hero?: boolean }) {
  const foto = josFoto();
  return (
    <aside
      className={
        hero ? "personal-portrait personal-portrait-hero" : "personal-portrait"
      }
      aria-label="Je aanspreekpunt bij WordSwap"
    >
      {foto && (
        <div className="personal-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="Jos Klijnhout, oprichter van WordSwap" />
        </div>
      )}
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
