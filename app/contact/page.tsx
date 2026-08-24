import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Neem vrijblijvend contact op over het overzetten van je WordPress-site. We denken graag mee.",
};

export default function Contact() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight">Contact</h1>
      <p className="mt-4 text-zinc-600">
        Benieuwd of jouw site geschikt is? Stuur een bericht — we kijken
        vrijblijvend mee en je krijgt binnen één werkdag antwoord.
      </p>
      <form
        className="mt-10 space-y-5"
        action="https://formspree.io/f/VERVANG_MET_JOUW_ID"
        method="POST"
      >
        <div>
          <label htmlFor="naam" className="block text-sm font-medium">
            Naam
          </label>
          <input
            id="naam"
            name="naam"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mailadres
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="website" className="block text-sm font-medium">
            Je huidige website (optioneel)
          </label>
          <input
            id="website"
            name="website"
            type="url"
            placeholder="https://"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="bericht" className="block text-sm font-medium">
            Bericht
          </label>
          <textarea
            id="bericht"
            name="bericht"
            rows={5}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-4 py-2 focus:border-emerald-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-6 py-3 text-white font-medium hover:bg-emerald-700"
        >
          Versturen
        </button>
      </form>
    </div>
  );
}
