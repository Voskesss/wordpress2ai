"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Homepage-hero als dia's (wens Jos 14-10-2026): elke dia een voordeel van
 * WordSwap met een eigen foto, pijltjes aan de zijkant en puntjes onderaan.
 *
 * Snel en goed voor Google: alle teksten staan in de HTML (het label van de eerste als h1),
 * maar alleen de eerste foto laadt direct. De volgende foto wordt pas
 * opgehaald als hij bijna aan de beurt is. Automatisch doorschuiven stopt bij
 * "minder beweging", in een verborgen tabblad, als de muis erop staat en
 * zodra iemand zelf bladert.
 *
 * Met de muis over de hero komt rond de cursor heel vaag het WordSwap-logo
 * tevoorschijn. Alleen op apparaten met een muis; de positie gaat via
 * CSS-variabelen, dus zonder React te laten herrenderen.
 */
export type Dia = { foto: string; label: string; kop: ReactNode; tekst?: string; kopKlasse?: string };

const WISSEL_MS = 7000;

export default function HeroDias({ dias, alt, onder }: { dias: Dia[]; alt: string; onder: ReactNode }) {
  const [actief, setActief] = useState(0);
  // Hoeveel foto's er in de pagina staan: begint bij 1
  const [geladen, setGeladen] = useState(1);
  const [zelfGebladerd, setZelfGebladerd] = useState(false);
  const pauze = useRef(false);
  const hero = useRef<HTMLDivElement>(null);
  const veegStart = useRef<number | null>(null);
  const n = dias.length;

  const ga = useCallback(
    (i: number, zelf = false) => {
      const doel = (i + n) % n;
      setGeladen((g) => Math.max(g, Math.min(n, doel + 2)));
      setActief(doel);
      if (zelf) setZelfGebladerd(true);
    },
    [n],
  );

  // Automatisch doorschuiven
  useEffect(() => {
    if (zelfGebladerd || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = window.setTimeout(() => setGeladen((g) => Math.max(g, 2)), 2500);
    const tik = window.setInterval(() => {
      if (document.hidden || pauze.current) return;
      setActief((a) => {
        const volgende = (a + 1) % n;
        setGeladen((g) => Math.min(n, Math.max(g, volgende + 2)));
        return volgende;
      });
    }, WISSEL_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tik);
    };
  }, [n, zelfGebladerd]);

  // Vaag logo rond de muis
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const beweeg = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    const binnen = () => el.classList.add("hero-logo-aan");
    const buiten = () => el.classList.remove("hero-logo-aan");
    el.addEventListener("pointermove", beweeg);
    el.addEventListener("pointerenter", binnen);
    el.addEventListener("pointerleave", buiten);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", beweeg);
      el.removeEventListener("pointerenter", binnen);
      el.removeEventListener("pointerleave", buiten);
    };
  }, []);

  return (
    <div
      ref={hero}
      className="home-hero-foto hero-dias"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Wat WordSwap voor je doet"
      onMouseEnter={() => (pauze.current = true)}
      onMouseLeave={() => (pauze.current = false)}
      onFocus={() => (pauze.current = true)}
      onBlur={() => (pauze.current = false)}
      onTouchStart={(e) => (veegStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (veegStart.current === null) return;
        const dx = e.changedTouches[0].clientX - veegStart.current;
        veegStart.current = null;
        if (Math.abs(dx) > 50) ga(actief + (dx < 0 ? 1 : -1), true);
      }}
    >
      {dias.slice(0, geladen).map((d, i) => (
        <Image
          key={d.foto}
          src={d.foto}
          alt={i === 0 ? alt : ""}
          aria-hidden={i === 0 ? undefined : true}
          fill
          priority={i === 0}
          loading={i === 0 ? undefined : "lazy"}
          sizes="100vw"
          className="landing-breed-foto hero-wissel"
          style={{ opacity: i === actief ? 1 : 0 }}
        />
      ))}
      <div className="landing-breed-schaduw" aria-hidden />
      <div className="hero-logo-laag" aria-hidden />
      <div className="shell home-hero-grid">
        <div className="home-hero-tekst">
          <div className="hero-dia-stapel" aria-live={zelfGebladerd ? "polite" : "off"}>
            {dias.map((d, i) => (
              <div
                key={i}
                className={`hero-dia${i === actief ? " is-actief" : ""}`}
                role="group"
                aria-roledescription="dia"
                aria-label={`${i + 1} van ${n}`}
                aria-hidden={i === actief ? undefined : true}
              >
                {/* De h1 zegt wát WordSwap is (15-10-2026: Google en AI-zoekmachines
                    moeten ons kunnen indelen); de grote zin eronder is de belofte. */}
                {i === 0 ? <h1 className="hero-h1">{d.label}</h1> : <p className="landing-breed-label">{d.label}</p>}
                <p className={`hero-dia-kop${d.kopKlasse ? ` ${d.kopKlasse}` : ""}`}>{d.kop}</p>
                {d.tekst && <p className="hero-dia-tekst">{d.tekst}</p>}
              </div>
            ))}
          </div>
          {onder}
        </div>
      </div>
      <button type="button" className="hero-pijl hero-pijl-links" aria-label="Vorige" onClick={() => ga(actief - 1, true)}>
        ‹
      </button>
      <button type="button" className="hero-pijl hero-pijl-rechts" aria-label="Volgende" onClick={() => ga(actief + 1, true)}>
        ›
      </button>
      <div className="hero-puntjes">
        {dias.map((d, i) => (
          <button
            key={i}
            type="button"
            className={`hero-punt${i === actief ? " is-actief" : ""}`}
            aria-label={`Ga naar dia ${i + 1}: ${d.label}`}
            aria-current={i === actief ? "true" : undefined}
            onClick={() => ga(i, true)}
          />
        ))}
      </div>
    </div>
  );
}
