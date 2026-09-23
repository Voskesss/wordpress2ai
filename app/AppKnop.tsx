"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { appLinkMetVraag, toonZwevendeKnop } from "@/lib/appen";
import { TELEFOON, TELEFOON_LINK } from "@/lib/contactgegevens";

/**
 * Rechtsonder: eerst je vraag typen, dan pas WhatsApp.
 *
 * Waarom niet meteen doorlinken: dan komt er "Hoi Jos, ik heb een vraag over
 * de prijzen" binnen en moet Jos terugvragen wélke vraag. Eén heen en weer
 * extra, en in de tussentijd is de bezoeker weg. Typt iemand hem hier, dan
 * staat de echte vraag er meteen.
 *
 * Wat er NIET staat is "versturen" zonder meer: deze knop kan niet versturen.
 * Hij opent WhatsApp met de tekst erin en de bezoeker drukt daar zelf op
 * verzenden. Dat zeggen we er met zoveel woorden bij, anders denkt iemand dat
 * zijn vraag onderweg is terwijl hij nog in WhatsApp staat.
 */
export default function AppKnop() {
  const pad = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [vraag, setVraag] = useState("");
  const vak = useRef<HTMLTextAreaElement>(null);
  const omhulsel = useRef<HTMLDivElement>(null);

  // Openen betekent: de cursor staat meteen goed. Anders moet je nog een keer tikken.
  useEffect(() => {
    if (open) vak.current?.focus();
  }, [open]);

  // Escape sluit, en klikken buiten het vak ook: een paneeltje dat blijft
  // hangen terwijl je verder wilt lezen is irritanter dan geen paneeltje.
  useEffect(() => {
    if (!open) return;
    const toets = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const klik = (e: MouseEvent) => {
      if (omhulsel.current && !omhulsel.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", toets);
    document.addEventListener("mousedown", klik);
    return () => {
      document.removeEventListener("keydown", toets);
      document.removeEventListener("mousedown", klik);
    };
  }, [open]);

  if (!toonZwevendeKnop(pad)) return null;

  function verstuur() {
    window.open(appLinkMetVraag(pad, vraag), "_blank", "noopener,noreferrer");
    setOpen(false);
    setVraag("");
  }

  return (
    <div
      ref={omhulsel}
      className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {open && (
        <div className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white p-4 shadow-xl shadow-black/10">
          <p className="font-display text-base font-semibold text-stone-900">Stel je vraag</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Schrijf hem hier op. Je vraag opent daarna in WhatsApp, waar je hem zelf verstuurt.
          </p>
          <textarea
            ref={vak}
            value={vraag}
            onChange={(e) => setVraag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) verstuur();
            }}
            rows={3}
            placeholder="Waar kan ik je mee helpen?"
            className="mt-3 w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-[#25D366] focus:outline-none"
          />
          <button
            type="button"
            onClick={verstuur}
            className="lift mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 cursor-pointer"
          >
            <Icoon />
            Verder in WhatsApp
          </button>
          <p className="mt-2.5 text-center text-xs text-stone-400">
            Liever bellen?{" "}
            <a href={`tel:${TELEFOON_LINK}`} className="font-semibold text-stone-600 underline underline-offset-2">
              {TELEFOON}
            </a>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Sluit het vraagvenster" : "Stel je vraag via WhatsApp"}
        className="flex items-center gap-2 self-end rounded-full bg-[#25D366] px-3.5 py-3 text-white shadow-lg shadow-black/15 transition hover:brightness-95 cursor-pointer"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="shrink-0">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <Icoon />
        )}
        {!open && <span className="hidden text-sm font-semibold sm:inline">Stel je vraag</span>}
      </button>
    </div>
  );
}

function Icoon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.53 3.7-8.22 8.24-8.22 2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.82c0 4.54-3.7 8.22-8.24 8.22z" />
    </svg>
  );
}
