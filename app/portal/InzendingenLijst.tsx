"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { afzenderVan, bakVan, filterInzendingen, kernVan, tellingPerFormulier, type Bak, type InzendingRij } from "@/lib/inzendingen";
import { inzendingVerwerken } from "./acties";
import InzendingKnop from "./InzendingKnop";

const datum = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function Bijlagen({ id, bijlagen }: { id: number; bijlagen: InzendingRij["bijlagen"] }) {
  if (!bijlagen?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {bijlagen.map((b, i) => (
        <a
          key={`${b.naam}-${i}`}
          href={`/api/inzending-bijlage?id=${id}&n=${i}`}
          className="inline-flex items-center gap-1 rounded-full border border-violet-300 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-50"
        >
          📎 {b.naam}
          {b.bytes ? ` (${Math.round(b.bytes / 1024)} kB)` : ""}
        </a>
      ))}
    </div>
  );
}

function Actie({ id, siteId, actie, label, bezigLabel, bevestig, className }: { id: number | string; siteId: number; actie: string; label: string; bezigLabel: string; bevestig?: string; className: string }) {
  return (
    <form action={inzendingVerwerken}>
      <input type="hidden" name={typeof id === "number" ? "id" : "ids"} value={id} />
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="actie" value={actie} />
      <InzendingKnop label={label} bezigLabel={bezigLabel} bevestig={bevestig} className={className} />
    </form>
  );
}

/** Berichten via de formulieren: filter per formulier, zoeken, uitklappen,
 * per stuk of in bulk afhandelen, terugzetten of verwijderen. */
export default function InzendingenLijst({ siteId, rijen }: { siteId: number; rijen: InzendingRij[] }) {
  const [formulier, setFormulier] = useState<string | null>(null);
  const [zoek, setZoek] = useState("");
  // Drie bakken: open, afgehandeld en (alleen als er iets in zit) spam.
  // Spam telt nergens anders mee: niet in Open, niet in Afgehandeld.
  const [bak, setBak] = useState<Bak>("open");
  const toonAfgehandeld = bak === "afgehandeld";
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [gekozen, setGekozen] = useState<Set<number>>(new Set());
  // Verversen zonder de pagina te herladen: router.refresh() haalt alleen de
  // servergegevens opnieuw op, de scrollpositie en de filters blijven staan.
  const router = useRouter();
  const [ververst, startVerversen] = useTransition();

  const basis = useMemo(
    () => rijen.filter((r) => bakVan(r) === bak),
    [rijen, bak],
  );
  const telling = useMemo(() => tellingPerFormulier(basis), [basis]);
  const zichtbaar = useMemo(() => filterInzendingen(basis, { formulier, zoek }), [basis, formulier, zoek]);
  const openAantal = rijen.filter((r) => bakVan(r) === "open").length;
  const afgehandeldAantal = rijen.filter((r) => bakVan(r) === "afgehandeld").length;
  const spamAantal = rijen.filter((r) => bakVan(r) === "spam").length;

  const wissel = (set: Set<number>, id: number) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };
  const gekozenZichtbaar = zichtbaar.filter((r) => gekozen.has(r.id)).map((r) => r.id);
  const veldStijl = "rounded-xl border border-stone-300 px-3 py-1.5 text-sm focus:border-violet-600 focus:outline-none";
  const chip = (actief: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold ${actief ? "border-violet-600 bg-violet-600 text-white" : "border-stone-300 text-stone-600 hover:border-violet-400 hover:text-violet-700"}`;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setBak("open"); setFormulier(null); }} className={chip(bak === "open")}>
          Open ({openAantal})
        </button>
        <button type="button" onClick={() => { setBak("afgehandeld"); setFormulier(null); }} className={chip(bak === "afgehandeld")}>
          Afgehandeld ({afgehandeldAantal})
        </button>
        {spamAantal > 0 && (
          <button
            type="button"
            onClick={() => { setBak("spam"); setFormulier(null); }}
            className={chip(bak === "spam")}
            title="Berichten die de automatische controle als massaspam zag. Je kreeg er geen melding van en de afzender geen bevestiging."
          >
            Spam ({spamAantal})
          </button>
        )}
        {telling.length > 1 && (
          <>
            <span className="mx-1 text-stone-300">|</span>
            <button type="button" onClick={() => setFormulier(null)} className={chip(formulier === null)}>
              Alle formulieren
            </button>
            {telling.map(([naam, n]) => (
              <button key={naam} type="button" onClick={() => setFormulier(naam)} className={`${chip(formulier === naam)} capitalize`}>
                {naam} ({n})
              </button>
            ))}
          </>
        )}
        <input
          type="search"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          placeholder="Zoek in berichten…"
          aria-label="Zoek in berichten"
          className={`${veldStijl} ml-auto w-full sm:w-64`}
        />
        <button
          type="button"
          onClick={() => startVerversen(() => router.refresh())}
          disabled={ververst}
          title="Nieuwe berichten ophalen zonder de pagina te herladen"
          className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-600 hover:border-violet-400 hover:text-violet-700 disabled:opacity-50"
        >
          {ververst ? "Bezig…" : "↻ Verversen"}
        </button>
      </div>

      {bak === "spam" && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Deze berichten zag de automatische controle als massaspam. Je kreeg er geen melding van en de afzender kreeg geen bevestiging. Toch een echt bericht? Klik op &ldquo;Geen spam&rdquo;, dan staat het weer bij je open berichten.
        </p>
      )}
      {zichtbaar.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          {rijen.length === 0 ? "Nog geen berichten ontvangen." : zoek || formulier ? "Niets gevonden met dit filter." : bak === "spam" ? "Geen spam." : toonAfgehandeld ? "Nog niets afgehandeld." : "Alles is afgehandeld."}
        </p>
      ) : (
        <>
          {gekozenZichtbaar.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm">
              <span className="font-semibold text-violet-900">{gekozenZichtbaar.length} gekozen</span>
              {bak === "spam" ? (
                <Actie id={gekozenZichtbaar.join(",")} siteId={siteId} actie="geen-spam" label="Geen spam" bezigLabel="Bezig..." className="font-medium text-violet-700 hover:underline cursor-pointer" />
              ) : toonAfgehandeld ? (
                <Actie id={gekozenZichtbaar.join(",")} siteId={siteId} actie="terug" label="↩ Terugzetten" bezigLabel="Bezig..." className="font-medium text-violet-700 hover:underline cursor-pointer" />
              ) : (
                <Actie id={gekozenZichtbaar.join(",")} siteId={siteId} actie="archiveer" label="✓ Markeer als afgehandeld" bezigLabel="Bezig..." className="font-medium text-violet-700 hover:underline cursor-pointer" />
              )}
              <Actie id={gekozenZichtbaar.join(",")} siteId={siteId} actie="verwijder" label="Verwijderen" bezigLabel="Verwijderen..." bevestig={`${gekozenZichtbaar.length} berichten definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`} className="text-stone-500 hover:text-red-600 cursor-pointer" />
              <button type="button" onClick={() => setGekozen(new Set())} className="ml-auto text-xs text-stone-500 hover:underline">
                Keuze wissen
              </button>
            </div>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-stone-400">
                  <th className="w-8 py-2 pr-2">
                    <input
                      type="checkbox"
                      aria-label="Alles kiezen"
                      checked={zichtbaar.length > 0 && zichtbaar.every((r) => gekozen.has(r.id))}
                      onChange={(e) => setGekozen(e.target.checked ? new Set([...gekozen, ...zichtbaar.map((r) => r.id)]) : new Set([...gekozen].filter((id) => !zichtbaar.some((r) => r.id === id))))}
                    />
                  </th>
                  <th className="py-2 pr-4 whitespace-nowrap">Datum</th>
                  <th className="py-2 pr-4">Formulier</th>
                  <th className="py-2 pr-4">Van</th>
                  <th className="py-2 pr-4">Bericht</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map((r) => {
                  const isOpen = open.has(r.id);
                  return (
                    <Rij key={r.id} r={r} isOpen={isOpen} gekozen={gekozen.has(r.id)} siteId={siteId}
                      onOpen={() => setOpen(wissel(open, r.id))} onKies={() => setGekozen(wissel(gekozen, r.id))} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Rij({ r, isOpen, gekozen, siteId, onOpen, onKies }: { r: InzendingRij; isOpen: boolean; gekozen: boolean; siteId: number; onOpen: () => void; onKies: () => void }) {
  const knop = "text-xs font-medium cursor-pointer whitespace-nowrap";
  return (
    <>
      <tr className={`border-t border-stone-100 align-top ${isOpen ? "bg-stone-50" : "hover:bg-stone-50"}`}>
        <td className="py-2 pr-2">
          <input type="checkbox" checked={gekozen} onChange={onKies} aria-label="Kies dit bericht" />
        </td>
        <td className="py-2 pr-4 whitespace-nowrap text-stone-500">{datum(r.aangemaakt)}</td>
        <td className="py-2 pr-4">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium capitalize text-violet-700">{r.formulier}</span>
        </td>
        <td className="py-2 pr-4 max-w-[220px] truncate font-medium text-stone-800" title={afzenderVan(r.velden)}>{afzenderVan(r.velden) || "-"}</td>
        <td className="py-2 pr-4 text-stone-600">
          <button type="button" onClick={onOpen} className="text-left hover:text-violet-700" aria-expanded={isOpen}>
            {isOpen ? "▾ " : "▸ "}
            {kernVan(r.velden) || "(leeg)"}
            {r.bijlagen?.length ? ` 📎${r.bijlagen.length}` : ""}
          </button>
          {r.spam && r.spamReden && (
            <p className="mt-0.5 text-xs text-amber-700">Waarom spam: {r.spamReden}</p>
          )}
          {!r.spam && r.spamStand === "waarschijnlijk" && (
            <p className="mt-0.5 text-xs text-amber-700">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">Mogelijk spam</span>
              {r.spamReden ? ` ${r.spamReden}.` : ""} De afzender kreeg geen automatische bevestiging.
            </p>
          )}
        </td>
        <td className="py-2">
          <div className="flex justify-end gap-3">
            {r.spam ? (
              <Actie id={r.id} siteId={siteId} actie="geen-spam" label="Geen spam" bezigLabel="Bezig..." className={`${knop} text-stone-500 hover:text-violet-700`} />
            ) : r.spamStand === "waarschijnlijk" ? (
              <>
                <Actie id={r.id} siteId={siteId} actie="wel-spam" label="Spam" bezigLabel="Bezig..." className={`${knop} text-stone-500 hover:text-amber-700`} />
                <Actie id={r.id} siteId={siteId} actie="geen-spam" label="Geen spam" bezigLabel="Bezig..." className={`${knop} text-stone-500 hover:text-violet-700`} />
              </>
            ) : r.gearchiveerd ? (
              <Actie id={r.id} siteId={siteId} actie="terug" label="↩ Terugzetten" bezigLabel="Bezig..." className={`${knop} text-stone-500 hover:text-violet-700`} />
            ) : (
              <Actie id={r.id} siteId={siteId} actie="archiveer" label="✓ Afgehandeld" bezigLabel="Bezig..." className={`${knop} text-stone-500 hover:text-violet-700`} />
            )}
            <Actie id={r.id} siteId={siteId} actie="verwijder" label="Verwijderen" bezigLabel="Verwijderen..." bevestig="Dit bericht definitief verwijderen? Dit kan niet ongedaan worden gemaakt." className={`${knop} text-stone-400 hover:text-red-600`} />
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-stone-50">
          <td></td>
          <td colSpan={5} className="pb-4 pr-4">
            <dl className="space-y-1">
              {Object.entries(r.velden).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="shrink-0 font-semibold capitalize text-stone-700">{k}:</dt>
                  <dd className="min-w-0 whitespace-pre-wrap break-words text-stone-600">{String(v ?? "")}</dd>
                </div>
              ))}
            </dl>
            <Bijlagen id={r.id} bijlagen={r.bijlagen} />
          </td>
        </tr>
      )}
    </>
  );
}
