"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Wisselende achtergrondfoto's in de homepage-hero (wens Jos 14-10-2026).
 * De eerste foto staat gewoon in de HTML (priority, telt voor Google en de
 * laadsnelheid). De rest wordt pas na het laden van de pagina opgehaald,
 * telkens alleen de volgende, en is decoratief (lege alt). Stilstaan bij
 * "minder beweging" en als het tabblad niet zichtbaar is.
 */
const WISSEL_MS = 6000;

export default function HeroWisselaar({ eerste, alt, extra }: { eerste: string; alt: string; extra: string[] }) {
  const fotos = [eerste, ...extra];
  const [actief, setActief] = useState(0);
  // Hoeveel foto's er in de pagina staan: begint bij 1, groeit één vooruit
  const [geladen, setGeladen] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Pas na het laden van de pagina de tweede foto ophalen
    const start = window.setTimeout(() => setGeladen(2), 2500);
    const tik = window.setInterval(() => {
      if (document.hidden) return;
      setActief((a) => {
        const volgende = (a + 1) % fotos.length;
        setGeladen((g) => Math.min(fotos.length, Math.max(g, volgende + 2)));
        return volgende;
      });
    }, WISSEL_MS);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(tik);
    };
  }, [fotos.length]);

  return (
    <>
      {fotos.slice(0, geladen).map((src, i) => (
        <Image
          key={src}
          src={src}
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
    </>
  );
}
