"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { LogoIcoon, LogoWoordmerk } from "@/app/Logo";
import { PORTAAL_TABS, type PortaalTab } from "@/lib/portaal-tabs";

/** Hoogte van de balk en van de gele dev-strook erboven (px). */
const BALK_HOOGTE = 56;
const DEV_STROOK = 28;

const LABELS: Record<PortaalTab, { lang: string; kort: string; icoon: ReactNode }> = {
  website: {
    lang: "Website bewerken",
    kort: "Website",
    icoon: <path d="M4 20h4L19 9l-4-4L4 16v4ZM14 6l4 4" />,
  },
  berichten: {
    lang: "Berichten & mail",
    kort: "Berichten",
    icoon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  account: {
    lang: "Account",
    kort: "Account",
    icoon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </>
    ),
  },
};

/**
 * De vaste bovenbalk van het portaal met tabbladen. Vroeger lag de werkweergave
 * schermvullend óver de pagina en moest je met "Volledig scherm uit" terug naar
 * je berichten en instellingen; dat snapte niemand. Nu staat de navigatie er
 * altijd, en schuift de werkweergave eronder.
 *
 * Alle tabbladen blijven gemount en worden alleen verborgen: zo werkt de chat
 * gewoon door als de klant even naar zijn berichten kijkt. Het adres krijgt
 * ?tab=, zodat een link naar een tabblad werkt, en een #-adres (bijvoorbeeld
 * #afspraak uit een mail) schakelt vanzelf naar het tabblad waar het staat.
 */
export default function PortaalSchil({
  isDev,
  isAdmin,
  meerdereSites,
  siteNaam,
  metTabs,
  beginTab,
  boven,
  website,
  berichten,
  account,
}: {
  isDev: boolean;
  isAdmin: boolean;
  meerdereSites: boolean;
  siteNaam: string | null;
  metTabs: boolean;
  beginTab: PortaalTab;
  boven?: ReactNode;
  website: ReactNode;
  berichten?: ReactNode;
  account?: ReactNode;
}) {
  const [tab, setTab] = useState<PortaalTab>(metTabs ? beginTab : "website");
  const top = isDev ? DEV_STROOK : 0;

  const kies = (t: PortaalTab) => {
    setTab(t);
    try {
      const url = new URL(window.location.href);
      if (t === "website") url.searchParams.delete("tab");
      else url.searchParams.set("tab", t);
      url.hash = "";
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      /* adres bijwerken is een gemak, geen voorwaarde */
    }
    window.scrollTo({ top: 0 });
  };

  // #afspraak en dergelijke: naar het tabblad waar dat onderdeel staat
  useEffect(() => {
    if (!metTabs || !window.location.hash) return;
    const doel = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    const paneel = doel?.closest<HTMLElement>("[data-portaal-tab]");
    const t = paneel?.dataset.portaalTab as PortaalTab | undefined;
    if (!doel || !t) return;
    setTab(t);
    setTimeout(() => doel.scrollIntoView({ block: "start" }), 60);
  }, [metTabs]);

  const tabs = metTabs ? PORTAAL_TABS : [];
  const stijl = {
    "--portaal-nav": `${top + BALK_HOOGTE}px`,
    paddingTop: BALK_HOOGTE,
  } as CSSProperties;

  return (
    <div data-portaal-schil style={stijl}>
      <nav
        aria-label="Portaal"
        style={{ top, height: BALK_HOOGTE }}
        className="fixed inset-x-0 z-[82] border-b border-stone-200 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex h-full max-w-[1500px] items-center gap-2 px-2 sm:gap-4 sm:px-6">
          <Link href="/" aria-label="WordSwap home" className="shrink-0">
            <span className="hidden md:inline">
              <LogoWoordmerk klein />
            </span>
            <span className="text-[#172E3B] md:hidden">
              <LogoIcoon maat={28} />
            </span>
          </Link>
          {siteNaam && (
            <span className="hidden min-w-0 truncate border-l border-stone-200 pl-4 text-sm font-semibold text-stone-700 lg:block" title={siteNaam}>
              {siteNaam}
            </span>
          )}
          {tabs.length > 0 && (
            <div role="tablist" aria-label="Onderdelen" className="flex min-w-0 flex-1 items-center justify-center gap-1">
              {tabs.map((t) => {
                const actief = t === tab;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={actief}
                    aria-controls={`portaal-tab-${t}`}
                    onClick={() => kies(t)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition cursor-pointer ${
                      actief ? "bg-violet-700 text-white shadow" : "text-stone-600 hover:bg-stone-100 hover:text-violet-700"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {LABELS[t].icoon}
                    </svg>
                    <span className="hidden sm:inline">{LABELS[t].lang}</span>
                    <span className="sm:hidden">{LABELS[t].kort}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className={`flex shrink-0 items-center gap-1 sm:gap-3 ${tabs.length ? "" : "ml-auto"}`}>
            {meerdereSites && (
              <a
                href="/portal"
                aria-label="Alle websites"
                title="Alle websites"
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-stone-600 hover:text-violet-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span className="hidden md:inline">Alle websites</span>
              </a>
            )}
            {isAdmin && (
              <a href="/admin" className="hidden rounded-full px-2 py-1 text-sm font-semibold text-violet-700 hover:text-violet-900 md:inline">
                Admin
              </a>
            )}
            <UserButton />
          </div>
        </div>
      </nav>
      {boven}
      <div id="portaal-tab-website" data-portaal-tab="website" role={metTabs ? "tabpanel" : undefined} hidden={tab !== "website"}>
        {website}
      </div>
      {metTabs && (
        <>
          <div id="portaal-tab-berichten" data-portaal-tab="berichten" role="tabpanel" hidden={tab !== "berichten"}>
            {berichten}
          </div>
          <div id="portaal-tab-account" data-portaal-tab="account" role="tabpanel" hidden={tab !== "account"}>
            {account}
          </div>
        </>
      )}
    </div>
  );
}
