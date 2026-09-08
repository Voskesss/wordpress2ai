import { ClerkProvider } from "@clerk/nextjs";
import { nlNL } from "@clerk/localizations";
import CookieKeuze from "./CookieKeuze";
import HeaderNav from "./HeaderNav";
import Logo from "./Logo";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { aanbod } from "@/lib/aanbod";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const siteUrl = "https://wordswap.nl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WordSwap — WordPress overzetten en beheren via AI-chat",
    template: "%s | WordSwap",
  },
  description: aanbod.omschrijving,
  keywords: [
    "WordPress overzetten",
    "statische website",
    "website onderhoud",
    "AI website beheer",
    "WordPress alternatief",
  ],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: siteUrl,
    siteName: "WordSwap",
    title: "WordSwap — WordPress overzetten en beheren via AI-chat",
    description: aanbod.omschrijving,
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
      alternateName: "WordSwap — AI Backoffice",
      url: siteUrl,
      logo: `${siteUrl}/logo-mail.png`,
      description:
        "WordSwap is een Nederlandse dienst die WordPress-websites omzet naar snelle, veilige websites zonder onderhoud. De eigenaar past de site daarna aan door in gewone taal te typen wat er anders moet; een AI voert het uit en de eigenaar keurt het goed vóór publicatie.",
      foundingDate: "2026",
      founder: {
        "@type": "Person",
        name: "Jos Klijnhout",
        jobTitle: "Oprichter",
      },
      parentOrganization: {
        "@type": "Organization",
        name: "AI Backoffice (J.K. Klijnhout Holding B.V.)",
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
      areaServed: { "@type": "Country", name: "Nederland" },
      knowsLanguage: "nl",
    },
    {
      "@type": "Service",
      "@id": `${siteUrl}/#overstap`,
      name: "WordPress-website overzetten naar een website zonder onderhoud",
      serviceType:
        "Websitemigratie van WordPress naar statische website met AI-beheer",
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
          name: "AI-koppeling (beheer via chat)",
          price: "5",
          priceCurrency: "EUR",
          description:
            "€5 tot €20 per maand, afgestemd op gebruik; maandelijks opzegbaar",
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
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
        <ClerkProvider localization={nlNL}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {isDev && (
            <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 text-center text-[9px] sm:text-xs font-bold uppercase tracking-widest h-7 flex items-center justify-center px-2">
              ⚠ Dev-omgeving — niet de live website
            </div>
          )}
          <header
            className={`sticky ${isDev ? "top-7" : "top-0"} z-50 site-header`}
          >
            <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
              <Link href="/" aria-label="WordSwap home">
                <Logo klein />
              </Link>
              <HeaderNav isAdmin={isAdmin} />
            </div>
          </header>
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
                </p>
              </div>
              <nav aria-label="Ontdek WordSwap">
                <h3>Ontdek WordSwap</h3>
                <Link href="/hoe-het-werkt">Hoe het werkt</Link>
                <Link href="/prijzen">Prijzen</Link>
                <Link href="/demo">Probeer de demo</Link>
                <Link href="/nieuwe-website">Nieuwe website</Link>
              </nav>
              <nav aria-label="Meer weten">
                <h3>Goed om te weten</h3>
                <Link href="/wordswap-vs-wordpress">
                  WordSwap vs. WordPress
                </Link>
                <Link href="/veiligheid">Veiligheid & controle</Link>
                <Link href="/seo-behoud">SEO bij de overstap</Link>
                <Link href="/eigen-ai-koppelen">Je eigen AI koppelen</Link>
                <Link href="/zelf-doen">Zelf aan de slag</Link>
              </nav>
              <nav aria-label="Over ons">
                <h3>Een echt mens erachter</h3>
                <Link href="/over-wordswap">Over WordSwap</Link>
                <Link href="/contact">Gratis websitecheck</Link>
                <Link href="/partners">Samenwerken</Link>
                <Link href="/webinar">Gratis webinar</Link>
                <Link href="/portal">Mijn website</Link>
              </nav>
            </div>
            <details className="shell footer-resources">
              <summary>Meer over eenvoudiger websitebeheer</summary>
              <nav>
                {[
                  ["wordpress-overzetten", "WordPress overzetten"],
                  ["wordpress-alternatief", "WordPress-alternatief"],
                  ["website-zonder-onderhoud", "Zonder onderhoud"],
                  ["website-zonder-cms", "Zonder CMS"],
                  ["wordpress-website-traag", "Trage website"],
                  ["wordpress-website-maken-met-ai", "Website maken met AI"],
                  [
                    "wordpress-omzetten-naar-gewone-website",
                    "WordPress omzetten",
                  ],
                  ["wordpress-aansturen-met-ai", "Aansturen met AI"],
                  ["website-koppelen-aan-ai", "Website koppelen aan AI"],
                  ["wordpress-koppelen-aan-ai", "WordPress en AI"],
                  [
                    "wordpress-omzetten-snel-en-ai-vriendelijk",
                    "Snel & AI-vriendelijk",
                  ],
                ].map(([slug, label]) => (
                  <Link key={slug} href={`/${slug}`}>
                    {label}
                  </Link>
                ))}
              </nav>
            </details>
            <div className="shell footer-bottom">
              <span>
                © {new Date().getFullYear()} WordSwap · AI Backoffice · KvK
                09190650
              </span>
              <span>
                <Link href="/privacy">Privacy</Link> ·{" "}
                <Link href="/voorwaarden">Voorwaarden</Link> · Oosterbeek,
                Nederland
              </span>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
