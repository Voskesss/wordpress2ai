import { ClerkProvider } from "@clerk/nextjs";
import { nlNL } from "@clerk/localizations";
import HeaderNav from "./HeaderNav";
import Logo from "./Logo";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Geist, Fraunces, EB_Garamond } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const garamond = EB_Garamond({
  variable: "--font-garamond",
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
    default: "WordSwap — Een website die doet wat je zegt",
    template: "%s | WordSwap",
  },
  description:
    "Wij zetten je WordPress-site om naar een snelle, veilige site zonder onderhoud. Wijzigingen geef je daarna gewoon door in gewone taal — de AI voert ze uit, jij keurt ze goed.",
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
    title: "WordSwap — Een website die doet wat je zegt",
    description:
      "Weg met plugin-updates en hosting-gedoe. Eén keer overzetten, daarna wijzig je alles via AI-chat.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "WordSwap",
  url: siteUrl,
  description:
    "Migratie van WordPress-websites naar snelle, onderhoudsvrije statische sites met AI-chat voor wijzigingen.",
  areaServed: "NL",
  priceRange: "€€",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const isAdmin = user?.publicMetadata?.role === "admin";
  // Alles wat niet de echte productie-omgeving is, krijgt een duidelijke DEV-balk
  const isDev = process.env.VERCEL_ENV !== "production";
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${fraunces.variable} ${garamond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-[family-name:var(--font-geist-sans)]">
        {!isDev && (
          <>
            <Script src="https://www.googletagmanager.com/gtag/js?id=G-S0169SZ52B" strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-S0169SZ52B');`}
            </Script>
          </>
        )}
        <ClerkProvider localization={nlNL}>
          <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          {isDev && (
            <div className="sticky top-0 z-[60] bg-amber-400 text-amber-950 text-center text-xs font-bold uppercase tracking-widest py-1.5">
              ⚠ Dev-omgeving — testversie, niet de echte site
            </div>
          )}
          <header className={`sticky ${isDev ? "top-7" : "top-0"} z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-lg`}>
          <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Link href="/" aria-label="WordSwap home">
          <Logo klein />
          </Link>
          <HeaderNav isAdmin={isAdmin} />
          </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-200 bg-zinc-50 text-zinc-500">
          <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
          <div>
          <p className="text-lg"><Logo klein /></p>
          <p className="mt-2 text-sm max-w-xs">
          Van WordPress-stress naar rust. Eén keer overzetten, daarna
          aanpassen door het gewoon te vragen.
          </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm">
          <Link href="/hoe-het-werkt" className="hover:text-violet-600">Hoe het werkt</Link>
          <Link href="/prijzen" className="hover:text-violet-600">Prijzen</Link>
          <Link href="/nieuwe-website" className="hover:text-violet-600">Nieuwe website</Link>
          <Link href="/wordpress-overzetten" className="hover:text-violet-600">WordPress overzetten</Link>
          <Link href="/wordpress-alternatief" className="hover:text-violet-600">WordPress-alternatief</Link>
          <Link href="/website-zonder-onderhoud" className="hover:text-violet-600">Website zonder onderhoud</Link>
          <Link href="/wordpress-website-traag" className="hover:text-violet-600">Trage WordPress-site</Link>
          <Link href="/wordpress-website-maken-met-ai" className="hover:text-violet-600">Website maken met AI</Link>
          <Link href="/wordpress-omzetten-naar-gewone-website" className="hover:text-violet-600">WordPress omzetten</Link>
          <Link href="/wordpress-aansturen-met-ai" className="hover:text-violet-600">Website aansturen met AI</Link>
          <Link href="/wordpress-omzetten-snel-en-ai-vriendelijk" className="hover:text-violet-600">Snel &amp; AI-vriendelijk</Link>
          <Link href="/contact" className="hover:text-violet-600">Contact</Link>
          <Link href="/privacy" className="hover:text-violet-600">Privacy</Link>
          <Link href="/voorwaarden" className="hover:text-violet-600">Algemene voorwaarden</Link>
          </nav>
          </div>
          <p className="mt-10 pt-6 border-t border-zinc-200 text-xs">
          © {new Date().getFullYear()} WordSwap · van WordPress naar een website die doet wat je zegt
          </p>
          <p className="mt-2 text-xs text-zinc-400">
          WordSwap is een dienst van AI Backoffice (J.K. Klijnhout Holding B.V.) · KvK 09190650 · Lebretweg 72, 6861 ZZ Oosterbeek · info@aibackoffice.nl
          </p>
          </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}