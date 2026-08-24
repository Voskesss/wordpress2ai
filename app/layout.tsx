import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = "https://wordpresstoai.nl";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WordPressToAI — Je website aanpassen door het gewoon te vragen",
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
  openGraph: {
    type: "website",
    locale: "nl_NL",
    url: siteUrl,
    siteName: "WordPressToAI",
    title: "WordPressToAI — Je website aanpassen door het gewoon te vragen",
    description:
      "Weg met plugin-updates en hosting-gedoe. Eén keer overzetten, daarna wijzig je alles via AI-chat.",
  },
  robots: { index: true, follow: true },
};

const nav = [
  { href: "/hoe-het-werkt", label: "Hoe het werkt" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-zinc-900">
        <header className="border-b border-zinc-200">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg">
              WordPress<span className="text-emerald-600">To</span>AI
            </Link>
            <nav className="flex gap-6 text-sm">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:text-emerald-600"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 text-sm text-zinc-500">
          <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col sm:flex-row justify-between gap-4">
            <p>© {new Date().getFullYear()} WordPressToAI</p>
            <p>Van WordPress-stress naar rust.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
