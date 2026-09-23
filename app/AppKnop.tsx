"use client";

import { usePathname } from "next/navigation";
import { appLink, toonZwevendeKnop } from "@/lib/appen";

/**
 * Zwevende appknop rechtsonder.
 *
 * Bewust klein en rond, geen chatballon die op een telefoon het halve scherm
 * opeet. Geen "we zijn nu online"-bolletje: Jos is niet altijd bereikbaar en
 * dat weet je van tevoren, dus dat zou een loze belofte zijn.
 *
 * Op een grotere schermbreedte klapt er een label naast uit, op mobiel blijft
 * het alleen het icoon.
 */
export default function AppKnop() {
  const pad = usePathname() ?? "/";
  if (!toonZwevendeKnop(pad)) return null;

  return (
    <a
      href={appLink(pad)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Stuur een WhatsApp-bericht naar Jos"
      className="group fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-3 text-white shadow-lg shadow-black/15 transition hover:brightness-95 sm:bottom-6 sm:right-6"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" className="shrink-0">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.53 3.7-8.22 8.24-8.22 2.2 0 4.26.86 5.82 2.41a8.16 8.16 0 0 1 2.41 5.82c0 4.54-3.7 8.22-8.24 8.22z" />
      </svg>
      <span className="hidden text-sm font-semibold sm:inline">App me</span>
    </a>
  );
}
