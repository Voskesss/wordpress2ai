"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import MarketingEvents from "./MarketingEvents";

const SLEUTEL = "ws-cookie-keuze"; // "ja" of "nee"
const META_PIXEL = "439869563675222";

/** Kleine toestemmingsbalk: Google Analytics en de Meta-pixel laden pas ná een
 * expliciete "ja". Weigeren (of niets kiezen) = geen enkel meetscript, geen
 * cookies. De Meta-pixel laat ons zien welke advertentie een aanmelding
 * oplevert; zie ook /privacy. */
export default function CookieKeuze() {
  // null = nog geen keuze bekend (ook tijdens server-render, dan tonen we niets)
  const [keuze, setKeuze] = useState<"ja" | "nee" | null>(null);
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(SLEUTEL);
      if (v === "ja" || v === "nee") setKeuze(v);
    } catch {
      // opslag geblokkeerd: behandel als geen keuze
    }
    setGeladen(true);
  }, []);

  function kies(v: "ja" | "nee") {
    try {
      localStorage.setItem(SLEUTEL, v);
    } catch {
      // niet erg: de balk komt dan volgende keer terug
    }
    setKeuze(v);
  }

  return (
    <>
      {keuze === "ja" && (
        <>
          <MarketingEvents />
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-S0169SZ52B"
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-S0169SZ52B', { anonymize_ip: true });`}
          </Script>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL}');
fbq('track','PageView');`}
          </Script>
        </>
      )}
      {geladen && keuze === null && (
        <div className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl sm:left-auto sm:right-6 sm:mx-0">
          <p className="text-sm text-zinc-700">
            Mogen we meten hoe de site gebruikt wordt en welke advertentie
            iemand hierheen bracht? Dat doen we met Google Analytics en een
            meetpunt van Meta. Zeg je nee, dan plaatsen we geen enkele meet- of
            advertentiecookie.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => kies("ja")}
              className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
            >
              Prima
            </button>
            <button
              onClick={() => kies("nee")}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:border-zinc-400 cursor-pointer"
            >
              Liever niet
            </button>
          </div>
        </div>
      )}
    </>
  );
}
