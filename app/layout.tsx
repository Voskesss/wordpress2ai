import { ClerkProvider } from "@clerk/nextjs";
import { nlNL } from "@clerk/localizations";
import HeaderNav from "./HeaderNav";
import Logo from "./Logo";
import { currentUser } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Geist, Fraunces, EB_Garamond } from "next/font/google";
import Link from "next/link";
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
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${fraunces.variable} ${garamond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-[family-name:var(--font-geist-sans)]">
        <ClerkProvider localization={nlNL}>
          <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-lg">
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
          <Link href="/contact" className="hover:text-violet-600">Contact</Link>
          </nav>
          </div>
          <p className="mt-10 pt-6 border-t border-zinc-200 text-xs">
          © {new Date().getFullYear()} WordSwap · van WordPress naar een website die doet wat je zegt
          </p>
          </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}