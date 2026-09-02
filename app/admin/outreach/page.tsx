import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { mailSjablonen, prospectMails, prospects } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import ActieKnop from "../klant/[id]/ActieKnop";
import { outreachTestmail, prospectBijwerken, prospectMailOpslaan, prospectToevoegen, prospectVerwijderen, verstuurOutreach } from "../acties";
import { kiesMail, vulIn } from "@/lib/outreach";
import MailBewerker from "./MailBewerker";
import ObservatieVeld from "./ObservatieVeld";
import ScanVak from "./ScanVak";
import WatWerkt from "./WatWerkt";

export const metadata: Metadata = {
  title: "Outreach",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const invoerStijl =
  "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2 font-normal text-sm focus:border-violet-600 focus:outline-none";

const statusLabel: Record<string, [string, string]> = {
  nieuw: ["nieuw", "bg-stone-100 border-stone-200 text-stone-600"],
  mail1: ["mail 1 verstuurd", "bg-violet-50 border-violet-200 text-violet-700"],
  mail2: ["mail 2 verstuurd", "bg-violet-50 border-violet-200 text-violet-700"],
  mail3: ["mail 3 verstuurd (laatste)", "bg-stone-100 border-stone-200 text-stone-500"],
  gereageerd: ["gereageerd 🎉", "bg-emerald-50 border-emerald-200 text-emerald-700"],
  klant: ["klant ✓", "bg-emerald-100 border-emerald-300 text-emerald-800"],
  niet_mailen: ["niet mailen", "bg-red-50 border-red-200 text-red-700"],
};

const dagen = (d: Date | null) =>
  d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null;

export default async function Outreach({
  searchParams,
}: {
  searchParams: Promise<{ toon?: string }>;
}) {
  await requireAdmin();
  const { toon = "actie" } = await searchParams;
  const alle = await db.select().from(prospects).orderBy(desc(prospects.id));
  const sjablonen = await db.select().from(mailSjablonen);
  const persoonlijk = await db.select().from(prospectMails);
  const actiefSjabloon = (nr: number) => sjablonen.find((s) => s.nummer === nr && s.actief) ?? null;
  const persVoor = (pid: number, nr: number) =>
    persoonlijk.find((m) => m.prospectId === pid && m.nummer === nr) ?? null;
  const afgemeld = alle.filter((p) => p.status === "niet_mailen");
  const filters: Record<string, (p: (typeof alle)[number]) => boolean> = {
    actie: (p) => p.status !== "niet_mailen" && !["gereageerd", "klant"].includes(p.status),
    nieuw: (p) => p.status === "nieuw",
    loopt: (p) => p.status.startsWith("mail"),
    raak: (p) => ["gereageerd", "klant"].includes(p.status),
    alles: (p) => p.status !== "niet_mailen",
  };
  const filter = filters[toon] ?? filters.actie;
  // Sortering: eerst wie nog nooit gemaild is, dan wie het langst stil is
  const lijst = alle.filter(filter).sort((a, b) => {
    const rang = (p: typeof a) => (p.status === "nieuw" ? 0 : p.status.startsWith("mail") ? 1 : 2);
    if (rang(a) !== rang(b)) return rang(a) - rang(b);
    const la = (a.mail3Op ?? a.mail2Op ?? a.mail1Op)?.getTime() ?? 0;
    const lb = (b.mail3Op ?? b.mail2Op ?? b.mail1Op)?.getTime() ?? 0;
    return la - lb;
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/admin" className="text-sm text-stone-500 hover:text-violet-700">
        ← Alle klanten
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight">Outreach</h1>
        <Link
          href="/admin/outreach/sjablonen"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700"
        >
          📝 Mailsjablonen bewerken
        </Link>
      </div>
      <p className="mt-3 text-stone-600 leading-relaxed max-w-2xl">
        Zet hier bedrijven in waarvan je denkt: die willen dit. Maximaal drie
        mails, niet opdringerig, met jouw persoonlijke observatie over hun site
        verweven in mail&nbsp;1. Aanbevolen ritme: mail&nbsp;2 na ±5 dagen
        stilte, mail&nbsp;3 na nog ±7 dagen. Elke mail heeft een afmeldlink die
        de prospect automatisch op &ldquo;niet mailen&rdquo; zet.
      </p>

      {/* Overzicht per fase — klik om de lijst te filteren */}
      <div className="mt-8 grid gap-2 sm:grid-cols-5">
        {(
          [
            ["actie", "Actie nodig", alle.filter(filters.actie).length, "bg-amber-100 text-amber-800"],
            ["nieuw", "Nog te mailen", alle.filter((p) => p.status === "nieuw").length, "bg-stone-100 text-stone-700"],
            ["loopt", "Loopt (mail 1-3)", alle.filter((p) => p.status.startsWith("mail")).length, "bg-violet-100 text-violet-800"],
            ["raak", "Gereageerd / klant", alle.filter((p) => ["gereageerd", "klant"].includes(p.status)).length, "bg-emerald-100 text-emerald-800"],
            ["alles", "Alles", alle.filter(filters.alles).length, "bg-white border border-stone-200 text-stone-700"],
          ] as const
        ).map(([sleutel, label, aantal, kleur]) => (
          <Link
            key={sleutel}
            href={`/admin/outreach?toon=${sleutel}`}
            className={`rounded-2xl px-4 py-3 transition ${kleur} ${
              toon === sleutel ? "ring-2 ring-violet-600 ring-offset-2" : "opacity-80 hover:opacity-100"
            }`}
          >
            <p className="font-display text-2xl font-semibold">{aantal}</p>
            <p className="text-xs font-medium">{label}</p>
          </Link>
        ))}
      </div>

      {/* Testmail */}
      <form action={outreachTestmail} className="mt-6 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-display text-xl font-semibold">✉️ Testmail naar jezelf</h2>
        <p className="mt-1 text-sm text-stone-600">
          Stuur een van de drie mails naar je eigen adres om te zien hoe hij in
          een echte inbox oogt (met voorbeeldgegevens).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            name="naar"
            type="email"
            required
            defaultValue="josklijnhout@hotmail.com"
            className="flex-1 min-w-[14rem] rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none"
          />
          <select name="nummer" className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none">
            <option value="1">Mail 1 (eerste contact)</option>
            <option value="2">Mail 2 (herinnering)</option>
            <option value="3">Mail 3 (laatste)</option>
          </select>
          <ActieKnop
            label="Stuur testmail"
            bezigLabel="Versturen..."
            className="rounded-full bg-violet-700 px-5 py-2 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </div>
      </form>

      <ScanVak
        bestaandeDomeinen={alle.map((p) =>
          p.website.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "")
        )}
      />

      <WatWerkt rijen={alle} />

      {/* Toevoegen */}
      <form
        id="prospect-formulier"
        action={prospectToevoegen}
        className="mt-8 rounded-3xl border-2 border-violet-200 bg-violet-50/40 p-6 grid gap-3 sm:grid-cols-2"
      >
        <h2 className="font-display text-xl font-semibold sm:col-span-2">
          Prospect toevoegen
        </h2>
        <p className="text-xs text-stone-500 sm:col-span-2">
          Dubbelen worden automatisch geweigerd: een bedrijfsnaam, website of
          e-mailadres dat al in de lijst (of op de niet-mailen-lijst) staat wordt
          niet nog een keer toegevoegd.
        </p>
        <input type="hidden" name="branche" />
        <input type="hidden" name="plaats" />
        <input type="hidden" name="score" />
        <input type="hidden" name="laadMs" />
        <input type="hidden" name="kenmerken" />
        <label className="block text-sm font-semibold">
          Bedrijfsnaam
          <input name="bedrijf" required placeholder="Bakkerij De Korenbloem" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Website
          <input name="website" required placeholder="www.bedrijf.nl" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          E-mailadres
          <input name="email" type="email" required placeholder="info@bedrijf.nl" className={invoerStijl} />
        </label>
        <label className="block text-sm font-semibold">
          Prijs in de mail (optioneel)
          <input name="prijs" placeholder="bv. €500 — leeg = vanaf €250" className={invoerStijl} />
          <span className="text-[11px] font-normal text-stone-400">
            De zoeker/scanner vult automatisch een richtprijs in op basis van
            het aantal pagina&apos;s. Weghalen mag altijd.
          </span>
        </label>
        <label className="block text-sm font-semibold sm:col-span-2">
          Wat zie je aan hun site? (komt letterlijk in mail 1)
          <ObservatieVeld naam="observatie" className={invoerStijl} />
        </label>
        <div className="sm:col-span-2">
          <ActieKnop
            label="Toevoegen"
            bezigLabel="Toevoegen..."
            className="rounded-full bg-violet-700 px-6 py-2.5 text-white text-sm font-semibold hover:bg-violet-600 cursor-pointer"
          />
        </div>
      </form>

      {/* Lijst */}
      <div className="mt-8 space-y-4">
        {lijst.length === 0 && (
          <p className="text-stone-500">
            {alle.length === 0
              ? "Nog geen prospects — voeg de eerste toe."
              : "Niets in deze weergave — klik hierboven op een ander vakje."}
          </p>
        )}
        {lijst.map((p) => {
          const [label, kleur] = statusLabel[p.status] ?? statusLabel.nieuw;
          const laatste = p.mail3Op ?? p.mail2Op ?? p.mail1Op;
          const dagenStil = dagen(laatste);
          const volgende =
            p.status === "nieuw" ? 1 : p.status === "mail1" ? 2 : p.status === "mail2" ? 3 : null;
          const aanbevolenNa = volgende === 2 ? 5 : volgende === 3 ? 7 : 0;
          const teVroeg =
            volgende !== null && volgende > 1 && dagenStil !== null && dagenStil < aanbevolenNa;
          const mailBaar = volgende !== null && !["niet_mailen", "gereageerd", "klant"].includes(p.status);
          return (
            <div key={p.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p.bedrijf}{" "}
                    <a
                      href={`https://${p.website.replace(/^https?:\/\//, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-sm font-normal text-violet-700 hover:underline"
                    >
                      {p.website} ↗
                    </a>
                  </p>
                  <p className="text-sm text-stone-500 break-all">{p.email}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${kleur}`}>
                  {label}
                  {dagenStil !== null && p.status.startsWith("mail") && (
                    <> · {dagenStil === 0 ? "vandaag" : `${dagenStil} dg geleden`}</>
                  )}
                </span>
                {p.status.startsWith("mail") && (
                  <form action={prospectBijwerken}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value="gereageerd" />
                    <ActieKnop
                      label="🎉 Heeft geantwoord (stop de mails)"
                      title="Klik dit als je in je inbox een antwoord van deze prospect ziet — mail 2 en 3 gaan dan niet meer weg"
                      bezigLabel="..."
                      className="rounded-full border border-emerald-300 px-4 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                    />
                  </form>
                )}
                {mailBaar && (
                  <form action={verstuurOutreach}>
                    <input type="hidden" name="id" value={p.id} />
                    <ActieKnop
                      label={`Verstuur mail ${volgende}${teVroeg ? ` (liever na ${aanbevolenNa} dg)` : ""}`}
                      bezigLabel="Versturen..."
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold cursor-pointer ${
                        teVroeg
                          ? "border border-amber-300 text-amber-700 hover:bg-amber-50"
                          : "bg-violet-700 text-white hover:bg-violet-600"
                      }`}
                    />
                  </form>
                )}
              </div>
              {p.status === "niet_mailen" && (
                <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm text-red-800">
                  🚫 Deze persoon wil geen mail meer. Er kan niets meer verstuurd
                  worden — ook niet door dit adres opnieuw toe te voegen.
                </p>
              )}
              {p.observatie && (
                <p className="mt-2 rounded-xl bg-stone-50 border border-stone-200 px-3.5 py-2 text-sm text-stone-600">
                  💬 {p.observatie}
                </p>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                  📧 Bekijk de mails zoals ze verstuurd (zijn/worden)
                </summary>
                <div className="mt-3 space-y-3">
                  {([1, 2, 3] as const).map((nr) => {
                    const mail = kiesMail(nr, p, actiefSjabloon(nr), persVoor(p.id, nr));
                    const verstuurd =
                      nr === 1 ? p.mail1Op : nr === 2 ? p.mail2Op : p.mail3Op;
                    const isVolgende = volgende === nr;
                    return (
                      <div
                        key={nr}
                        className={`rounded-2xl border p-4 ${
                          isVolgende ? "border-violet-300 bg-violet-50/40" : "border-stone-200 bg-white"
                        }`}
                      >
                        <p className="text-xs font-semibold text-stone-500">
                          Mail {nr}
                          {mail.bron === "persoonlijk" && (
                            <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">✍️ gepersonaliseerd</span>
                          )}
                          {verstuurd
                            ? ` — verstuurd op ${verstuurd.toLocaleDateString("nl-NL")}`
                            : isVolgende
                              ? " — dit is de volgende die verstuurd wordt"
                              : ""}
                        </p>
                        <p className="mt-1 text-sm font-semibold">Onderwerp: {mail.onderwerp}</p>
                        {isVolgende && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-violet-700 hover:underline">
                              ✍️ {mail.bron === "persoonlijk" ? "Persoonlijke versie bewerken" : "Personaliseer deze mail voor deze prospect"}
                            </summary>
                            <form action={prospectMailOpslaan} className="mt-3 grid gap-2">
                              <input type="hidden" name="prospectId" value={p.id} />
                              <input type="hidden" name="nummer" value={nr} />
                              <MailBewerker
                                beginOnderwerp={persVoor(p.id, nr)?.onderwerp ?? mail.onderwerp}
                                beginTekst={persVoor(p.id, nr)?.tekst ?? mail.tekst}
                                bedrijf={p.bedrijf}
                                website={p.website}
                                observatie={p.observatie}
                              />
                              <div>
                                <ActieKnop label="Bewaar persoonlijke versie" bezigLabel="Opslaan..." className="rounded-full border border-violet-300 px-4 py-1.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer" />
                              </div>
                            </form>
                          </details>
                        )}
                        <div
                          className="mt-2 rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm [&_p]:mb-2 [&_a]:text-violet-700"
                          dangerouslySetInnerHTML={{ __html: mail.html }}
                        />
                      </div>
                    );
                  })}
                  <p className="text-xs text-stone-400">
                    Pas je de observatie hieronder aan, dan verandert mail 1 automatisch mee.
                  </p>
                </div>
              </details>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-stone-400 hover:text-stone-600">
                  Bewerken / status wijzigen
                </summary>
                <form action={prospectBijwerken} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={p.id} />
                  <label className="block text-sm font-semibold">
                    E-mailadres
                    <input name="email" defaultValue={p.email} className={invoerStijl} />
                  </label>
                  <label className="block text-sm font-semibold">
                    Status
                    <select name="status" defaultValue={p.status} className={invoerStijl}>
                      <option value="nieuw">nieuw</option>
                      <option value="mail1">mail 1 verstuurd</option>
                      <option value="mail2">mail 2 verstuurd</option>
                      <option value="mail3">mail 3 verstuurd</option>
                      <option value="gereageerd">gereageerd</option>
                      <option value="klant">klant geworden</option>
                      <option value="niet_mailen">niet mailen</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold">
                    Prijs in de mail (leeg = vanaf €250)
                    <input name="prijs" defaultValue={p.prijs ?? ""} placeholder="bv. €500" className={invoerStijl} />
                  </label>
                  <label className="block text-sm font-semibold sm:col-span-2">
                    Observatie (voor mail 1)
                    <ObservatieVeld naam="observatie" beginwaarde={p.observatie ?? ""} className={invoerStijl} />
                  </label>
                  <div className="sm:col-span-2">
                    <ActieKnop
                      label="Opslaan"
                      bezigLabel="Opslaan..."
                      className="rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                    />
                  </div>
                </form>
                <form action={prospectVerwijderen} className="mt-2">
                  <input type="hidden" name="id" value={p.id} />
                  <ActieKnop
                    label="Prospect verwijderen"
                    bezigLabel="Verwijderen..."
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  />
                </form>
              </details>
            </div>
          );
        })}
      </div>

      {/* Blokkeerlijst */}
      <div className="mt-10 rounded-3xl border border-red-200 bg-red-50/40 p-6">
        <h2 className="font-display text-xl font-semibold text-red-900">
          🚫 Niet-mailen-lijst ({afgemeld.length})
        </h2>
        <p className="mt-1 text-sm text-red-800">
          Deze mensen hebben zich afgemeld (of jij hebt ze zo gezet). Ze krijgen
          nooit meer mail van ons — ook niet als je het adres opnieuw probeert
          toe te voegen. Deze lijst is bewust niet te wissen.
        </p>
        {afgemeld.length === 0 ? (
          <p className="mt-3 text-sm text-red-700">Nog niemand afgemeld.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm text-red-900">
            {afgemeld.map((p) => (
              <li key={p.id} className="flex flex-wrap gap-x-2">
                <span className="font-medium">{p.bedrijf}</span>
                <span className="text-red-700">{p.email}</span>
                <span className="text-red-500">· {p.website}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
