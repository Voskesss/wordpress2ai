import { ClerkProvider } from "@clerk/nextjs";
import { nlNL } from "@clerk/localizations";
import CookieKeuze from "./CookieKeuze";
import InlogVenster from "./InlogVenster";
import { SEO_PAGINAS, GROEP_KOP } from "@/lib/seo-paginas";
import { Suspense } from "react";
import HeaderNav from "./HeaderNav";
import Logo from "./Logo";
import SiteKop from "./SiteKop";
import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import Link from "next/link";
import AppKnop from "./AppKnop";
import { appLink } from "@/lib/appen";
import "./globals.css";
import { aanbod } from "@/lib/aanbod";
import { deelAfbeelding } from "./deel-afbeelding";
import { TELEFOON, TELEFOON_LINK } from "@/lib/persoonlijk";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  // De sierletter is 118 KiB en is alleen decoratie voor koppen: niet
  // voorladen, zodat de eerste weergave niet op deze download wacht.
  // Door font-display: swap verschijnen de koppen meteen in de terugvalletter.
  preload: false,
});

const siteUrl = "https://www.wordswap.nl";

// Nederlandse Clerk-teksten, met bij de codestap de tip om in spam te kijken
// (we loggen in met een code per mail, en die belandt soms in de spammap)
const spamTip = "Geen code binnen een minuut? Kijk ook even in je spam of ongewenste mail.";
const inlogTeksten = {
  ...nlNL,
  signIn: { ...nlNL.signIn, emailCode: { ...nlNL.signIn?.emailCode, subtitle: spamTip } },
  signUp: { ...nlNL.signUp, emailCode: { ...nlNL.signUp?.emailCode, subtitle: spamTip } },
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WordSwap: WordPress overzetten en bijhouden met AI",
    template: "%s | WordSwap",
  },
  description: aanbod.omschrijving,
  keywords: [
    "WordPress overzetten",
    "statische website",
    "website onderhoud",
    "AI website beheer",
    "WordPress alternatief",
    "alternatief voor WordPress met AI-beheer",
    "AI-gestuurde websitemigratie",
    "WordPress AI-alternatief",
    "AI website builder Nederland",
  ],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "WordSwap",
    images: [deelAfbeelding],
  },
  twitter: {
    card: "summary_large_image",
    images: [deelAfbeelding.url],
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organisatie`,
      name: "WordSwap",
      url: siteUrl,
      logo: `${siteUrl}/logo-mail.png`,
      description: aanbod.omschrijving,
      knowsAbout: [
        "Alternatief voor WordPress met AI-beheer",
        "AI-gestuurde websitemigratie",
        "Statische websites",
        "Websitebeheer met AI",
        "AI website builder",
      ],
      foundingDate: "2026",
      founder: {
        "@type": "Person",
        name: "Jos Klijnhout",
        jobTitle: "Oprichter",
        url: `${siteUrl}/over-wordswap`,
        image: `${siteUrl}/team/jos.webp`,
        worksFor: { "@id": `${siteUrl}/#organisatie` },
      },
      parentOrganization: {
        "@type": "Organization",
        name: "J.K. Klijnhout Holding B.V.",
        identifier: "KvK 09190650",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Lebretweg 72",
        postalCode: "6861 ZZ",
        addressLocality: "Oosterbeek",
        addressCountry: "NL",
      },
      email: "info@wordswap.nl",
      telephone: "+31262340122",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "klantenservice",
        telephone: "+31262340122",
        email: "info@wordswap.nl",
        areaServed: "NL",
        availableLanguage: "nl",
      },
      areaServed: { "@type": "Country", name: "Nederland" },
      knowsLanguage: "nl",
    },
    {
      "@type": "Service",
      "@id": `${siteUrl}/#overstap`,
      name: "WordPress-website overzetten en daarna bijhouden met AI",
      serviceType:
        "AI-gestuurde websitemigratie van WordPress naar een statische website met AI-beheer",
      category: "Alternatief voor WordPress met AI-beheer",
      provider: { "@id": `${siteUrl}/#organisatie` },
      areaServed: "NL",
      offers: [
        {
          "@type": "Offer",
          name: "Overstap kleine site",
          price: "150",
          priceCurrency: "EUR",
          description: "Eenmalig, no cure no pay",
        },
        {
          "@type": "Offer",
          name: "Overstap grote of complexe site",
          price: "650",
          priceCurrency: "EUR",
          description: "Eenmalig, no cure no pay",
        },
        {
          "@type": "Offer",
          name: "Basispakket: hosting, beheer en AI-chat",
          price: "19",
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "19",
            priceCurrency: "EUR",
            valueAddedTaxIncluded: false,
            unitText: "maand",
            referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
          },
          description:
            "vanaf €19 per maand excl. btw: hosting, beveiliging, AI-chat (fair use) en hulp per e-mail; maandelijks opzegbaar",
        },
        {
          "@type": "Offer",
          name: "Optimaal ontzorgd",
          price: "39",
          priceCurrency: "EUR",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "39",
            priceCurrency: "EUR",
            valueAddedTaxIncluded: false,
            unitText: "maand",
            referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
          },
          description:
            "€39 per maand excl. btw: basispakket plus voorrang bij je vragen en je website bijhouden via WhatsApp; maandelijks opzegbaar",
        },
      ],
    },
    {
      "@type": "Service",
      "@id": `${siteUrl}/#nieuwe-website`,
      name: "Nieuwe website laten maken met AI-beheer",
      provider: { "@id": `${siteUrl}/#organisatie` },
      areaServed: "NL",
      offers: [
        {
          "@type": "Offer",
          name: "AI-ontwerp tot 8 pagina's",
          price: "250",
          priceCurrency: "EUR",
        },
        {
          "@type": "Offer",
          name: "Ontwerp door een designer",
          price: "1750",
          priceCurrency: "EUR",
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Alles wat niet de echte productie-omgeving is, krijgt een duidelijke DEV-balk
  const isDev =
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV !== "production";
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-zinc-900 font-[family-name:var(--font-geist-sans)]">
        <a
          href="#inhoud"
          className="sr-only focus:not-sr-only focus:fixed focus:top-10 focus:left-4 focus:z-[100] focus:bg-white focus:p-3"
        >
          Naar de inhoud
        </a>
        {/* Analytics laadt pas na expliciete toestemming (zie CookieKeuze) */}
        {!isDev && <CookieKeuze />}
        <ClerkProvider localization={inlogTeksten}>
          <Suspense fallback={null}>
            <InlogVenster />
          </Suspense>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {isDev && (
            <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 text-center text-[9px] sm:text-xs font-bold uppercase tracking-widest h-7 flex items-center justify-center px-2">
              ⚠ Dev-omgeving — niet de live website
            </div>
          )}
          <SiteKop>
            <header
              className={`sticky ${isDev ? "top-7" : "top-0"} z-50 site-header`}
            >
              <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
                <Link href="/" aria-label="WordSwap home">
                  <Logo klein />
                </Link>
                <HeaderNav />
              </div>
            </header>
          </SiteKop>
          <main id="inhoud" className="flex-1">
            {children}
          </main>
          <footer className="site-footer">
            <div className="shell footer-grid">
              <div>
                <Link href="/" aria-label="WordSwap home">
                  <Logo klein />
                </Link>
                <p>
                  Je website blijft. Het gedoe verdwijnt.
                  <br />
                  Persoonlijk geregeld vanuit Oosterbeek.
                </p>
                <p>
                  <a href="mailto:info@wordswap.nl">info@wordswap.nl ↗</a>
                  <br />
                  <a href={`tel:${TELEFOON_LINK}`}>{TELEFOON}</a>
                  <br />
                  <a href={appLink("/")} target="_blank" rel="noopener noreferrer">
                    WhatsApp ↗
                  </a>
                </p>
              </div>
              <nav aria-label="Ontdek WordSwap">
                <h3>Ontdek WordSwap</h3>
                <Link href="/hoe-het-werkt">Hoe het werkt</Link>
                <Link href="/prijzen">Prijzen</Link>
                <Link href="/website-abonnement">Website abonnement</Link>
                <Link href="/demo">Probeer de demo</Link>
                <Link href="/nieuwe-website">Nieuwe website</Link>
              </nav>
              <nav aria-label="Meer weten">
                <h3>Goed om te weten</h3>
                <Link href="/veelgestelde-vragen">Veelgestelde vragen</Link>
                <Link href="/wordswap-vs-wordpress">
                  WordSwap vs. WordPress
                </Link>
                <Link href="/veiligheid">Veiligheid & controle</Link>
                <Link href="/seo-behoud">SEO bij de overstap</Link>
                <Link href="/ai-website">Goedkope AI-website? Let hierop</Link>
                <Link href="/eigen-ai-koppelen">Je eigen AI koppelen</Link>
                <Link href="/zelf-doen">Zelf aan de slag</Link>
              </nav>
              <nav aria-label="Over ons">
                <h3>Een echt mens erachter</h3>
                <Link href="/over-wordswap">Over WordSwap</Link>
                <Link href="/contact">Gratis websitecheck</Link>
                <Link href="/partners">Samenwerken</Link>
                <Link href="/webinar">Gratis webinar</Link>
                <Link href="/portal" rel="nofollow">Mijn website</Link>
              </nav>
            </div>
            <nav className="shell footer-resources" aria-label="Onderwerpen">
              {(["overstappen", "nieuw", "bijhouden", "kennis", "branche"] as const).map((g) => (
                <div key={g}>
                  <h3>{GROEP_KOP[g]}</h3>
                  {SEO_PAGINAS.filter((p) => p.groep === g).map((p) => (
                    <Link key={p.pad} href={p.pad}>
                      {p.naam}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div className="shell footer-bottom">
              <span>
                © {new Date().getFullYear()} WordSwap · KvK 09190650
              </span>
              <span>
                <Link href="/privacy">Privacy</Link> ·{" "}
                <Link href="/voorwaarden">Voorwaarden</Link> · Oosterbeek,
                Nederland
              </span>
            </div>
          </footer>
          <AppKnop />
        </ClerkProvider>
      </body>
    </html>
  );
}
