import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

const siteUrl = "https://wordpresstoai.nl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WordPressToAI — Van WordPress-website naar AI-website met chat",
    template: "%s | WordPressToAI",
  },
  description:
    "Wij zetten je WordPress-site om naar een snelle, veilige site zonder onderhoud. Aanpassen doe je daarna simpel via AI-chat: typ wat je wilt, en het staat live.",
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
    siteName: "WordPressToAI",
    title: "WordPressToAI — Van WordPress-website naar AI-website met chat",
    description:
      "Weg met plugin-updates en hosting-gedoe. Eén keer overzetten, daarna wijzig je alles via AI-chat.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "WordPressToAI",
  url: siteUrl,
  description:
    "Migratie van WordPress-websites naar snelle, onderhoudsvrije statische sites met AI-chat voor wijzigingen.",
  areaServed: "NL",
  priceRange: "€€",
};

const nav = [
  { href: "/hoe-het-werkt", label: "Hoe het werkt" },
  { href: "/prijzen", label: "Prijzen" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-[family-name:var(--font-geist-sans)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur-lg">
          <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white text-sm font-mono">
                →
              </span>
              WordPress<span className="text-violet-600">To</span>AI
            </Link>
            <nav className="flex items-center gap-2 sm:gap-6 text-sm font-medium">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 py-1 text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/contact"
                className="rounded-full bg-violet-600 px-4 py-2 text-white hover:bg-violet-500 transition-colors"
              >
                Kennismaken
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 bg-zinc-50 text-zinc-500">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="flex flex-col sm:flex-row justify-between gap-8">
              <div>
                <p className="font-bold text-zinc-900 text-lg">
                  WordPress<span className="text-violet-600">To</span>AI
                </p>
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
              © {new Date().getFullYear()} WordPressToAI
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
