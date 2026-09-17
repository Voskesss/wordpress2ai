"use client";

import { type ReactNode, useEffect, useRef, useState, useCallback } from "react";
import Fotobank from "./Fotobank";
import ChatHulp from "./ChatHulp";
import { readChatResponse } from "@/lib/chat-response";
import { metSlotWacht, SLOT_WACHTTEKST } from "@/lib/slot-wacht";
import Vindbaarheid from "./Vindbaarheid";

type Bericht = {
  rol: "klant" | "assistent";
  tekst: string;
  metVerversTip?: boolean;
  /** Commentaar tijdens het werken ("Ik ga eerst kijken...") — blijft staan, iets gedempt */
  tussenstap?: boolean;
};

type Concept = {
  changeId: number;
  previewUrl: string | null;
  prompt: string;
  paginas: string[];
};

/** Keuzes die betekenen "dat vertel/typ ik zelf": zo'n knop verstuurt niets,
 * maar opent alleen het typveld — anders moet de eigenaar eerst een zinloze
 * AI-beurt afwachten die vraagt wat hij dan wil zeggen. */
function isZelfTypKeuze(k: string) {
  return (
    k.startsWith("\u270F\uFE0F") ||
    /^ik (vertel|typ|zeg|kies|geef|beschrijf|leg)\b.*\bzelf\b/i.test(k) ||
    /\bzelf\b.*\b(vertellen|typen|aangeven|kiezen|invullen|uitleggen)\b/i.test(k)
  );
}

/** Haalt de KEUZES-regel (snelkeuze-knoppen) uit een assistent-bericht. */
function parseKeuzes(tekst: string): { schoon: string; keuzes: string[] } {
  const m = tekst.match(/\n?\s*KEUZES:\s*(.+)\s*$/);
  if (!m) return { schoon: tekst, keuzes: [] };
  const keuzes = m[1]
    .split("|")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 4);
  return { schoon: tekst.slice(0, m.index).trimEnd(), keuzes };
}

/** Alleen échte pagina's zijn klikbaar: deelbestanden (delen/menu.html e.d.)
 * worden op pagina's INGEVOEGD en bestaan niet als eigen adres — doorklikken
 * gaf daar een 404. */
function isEchtePagina(pad: string) {
  return /\.html?$/i.test(pad) && !pad.replace(/^\/+/, "").startsWith("delen/");
}

/** Foto's in de browser verkleinen vóór het versturen. Nodig omdat de server
 * een verzoek boven ~4,5 MB helemaal weigert (met een melding die geen JSON is,
 * dus die kwam bij de eigenaar aan als "De opdracht kon niet worden verwerkt").
 * Een telefoonfoto van 5 MB wordt zo ~200 kB; de server verkleint daarna nog
 * naar zijn eigen maat. Lukt het verkleinen niet, dan gaat het origineel mee. */
async function verkleinVoorUpload(bestand: File): Promise<File> {
  if (!bestand.type.startsWith("image/") || bestand.type === "image/svg+xml")
    return bestand;
  try {
    const beeld = await createImageBitmap(bestand, { imageOrientation: "from-image" });
    const schaal = Math.min(1, 1600 / Math.max(beeld.width, beeld.height));
    const breedte = Math.round(beeld.width * schaal);
    const hoogte = Math.round(beeld.height * schaal);
    const doek = document.createElement("canvas");
    doek.width = breedte;
    doek.height = hoogte;
    const ctx = doek.getContext("2d");
    if (!ctx) return bestand;
    ctx.drawImage(beeld, 0, 0, breedte, hoogte);
    beeld.close?.();
    const blob = await new Promise<Blob | null>((ok) =>
      doek.toBlob(ok, "image/webp", 0.8),
    );
    if (!blob || blob.size >= bestand.size) return bestand;
    return new File([blob], bestand.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
    });
  } catch {
    return bestand;
  }
}

/** Zoveel foto's mogen er in één bericht mee. Klein gehouden omdat niet de
 * foto's traag zijn, maar de pagina die eruit volgt; in porties ziet de
 * eigenaar veel sneller resultaat. Moet gelijk blijven aan MAX_FOTOS in de
 * chat-route. */
const MAX_FOTOS = 10;

function paginaLabel(pad: string) {
  const schoon = pad.replace(/^\/+|\/+$/g, "");
  if (!schoon) return "homepage";
  const delen = schoon.split("/");
  const naam = delen.pop() ?? pad;
  if (naam === "index.html") {
    // /index.html = homepage; map/index.html = die map
    return delen.length === 0 ? "homepage" : delen[delen.length - 1];
  }
  if (naam.endsWith(".css")) return "vormgeving";
  return naam.replace(/\.html?$/, "");
}

type Selectie = {
  pad: string;
  tag: string;
  tekst: string;
  html: string;
  kleuren?: { achtergrond?: string; tekst?: string };
};

type SpeechRecognitionachtig = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } }; length: number } }) => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  start: () => void;
  stop: () => void;
};

/** Direct zichtbare tooltip bij hover (de native title-tooltip is te traag). */
function Tip({ tekst, children }: { tekst: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-max max-w-[15rem] rounded-xl bg-stone-900 px-3 py-2 text-center text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        {tekst}
      </span>
    </span>
  );
}

export default function Chat({
  siteId,
  previewAccess,
  historie,
  liveUrl: liveUrlProp,
  werkversieUrl,
  openConcept,
  suggesties,
  terugLink,
  isDemo = false,
}: {
  siteId: number;
  /** Probeer-demo: foto's meesturen in de chat kan daar niet (wel: foto vervangen via aanwijzen) */
  isDemo?: boolean;
  /** Link naar het websiteoverzicht (alleen bij meerdere websites) */
  terugLink?: string | null;
  previewAccess: string;
  historie: Bericht[];
  liveUrl?: string | null;
  werkversieUrl?: string | null;
  openConcept?: Concept;
  suggesties?: string[];
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [nieuwBezig, setNieuwBezig] = useState(false);
  const nieuwBezigRef = useRef(false);
  const [herstelFout, setHerstelFout] = useState<{ soort: "gesprek" | "bericht" | "publiceer" | "verwerp"; tekst: string } | null>(null);
  const mislukteOpdracht = useRef<{ tekst: string; fotos: File[]; docs?: File[]; video: { commandId: string; naam: string } | null; sel: Selectie | null; kleur: string | null; bankFoto: string | null; pagina: string } | null>(null);

  const [bezig, setBezigState] = useState(false);
  const bezigRef = useRef(false);
  function setBezig(v: boolean) {
    bezigRef.current = v;
    setBezigState(v);
  }
  const [statusTekst, setStatusTekst] = useState<string | null>(null);
  // Antwoord dat woord voor woord binnenstroomt (native agent): live tonen
  const [liveTekst, setLiveTekst] = useState<string | null>(null);
  // Feedback op de chatbeleving: duimpjes per antwoord + algemene opmerkingen
  const [feedbackGegeven, setFeedbackGegeven] = useState<Record<number, "goed" | "slecht">>({});
  const [redenVoor, setRedenVoor] = useState<number | "algemeen" | null>(null);
  const [redenTekst, setRedenTekst] = useState("");
  const [redenBezig, setRedenBezig] = useState(false);
  const [redenKlaar, setRedenKlaar] = useState(false);

  async function stuurFeedback(
    oordeel: "goed" | "slecht" | "algemeen",
    opties?: { antwoord?: string; reden?: string; index?: number },
  ) {
    try {
      await fetch("/api/portal/chat-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          oordeel,
          reden: opties?.reden,
          antwoord: opties?.antwoord,
        }),
      });
    } catch {}
    if (oordeel !== "algemeen" && opties?.index !== undefined) {
      setFeedbackGegeven((f) => ({ ...f, [opties.index!]: oordeel === "goed" ? "goed" : "slecht" }));
    }
  }
  const [afbeeldingen, setAfbeeldingen] = useState<File[]>([]);
  // Meegestuurde pdf's (vacature, voorwaarden, menukaart): worden op de site
  // een downloadlink — ze gaan apart mee, niet door de fotoverwerking heen
  const [documenten, setDocumenten] = useState<File[]>([]);
  // Video via Rendi: na uploaden+comprimeren staat hier het opdracht-id klaar
  const [videoKlaar, setVideoKlaarState] = useState<{ commandId: string; naam: string } | null>(null);
  // Ref ernaast: verstuur() wordt soms direct na het zetten aangeroepen en
  // zou anders de oude (lege) state uit zijn closure lezen
  const videoKlaarRef = useRef<{ commandId: string; naam: string } | null>(null);
  function setVideoKlaar(v: { commandId: string; naam: string } | null) {
    videoKlaarRef.current = v;
    setVideoKlaarState(v);
  }
  const [videoBezig, setVideoBezig] = useState(false);
  // Keuzemenu onder de paperclip: zo is meteen duidelijk dat er naast foto's
  // ook een video of een pdf mee kan
  const [bijlageMenu, setBijlageMenu] = useState(false);
  /** Opent de bestandskiezer, met alleen het gekozen soort bestand erin. */
  function kiesBijlage(soort: "foto" | "video" | "pdf") {
    setBijlageMenu(false);
    const invoerveld = fileInputRef.current;
    if (!invoerveld) return;
    invoerveld.accept =
      soort === "foto"
        ? "image/*"
        : soort === "video"
          ? "video/mp4,video/quicktime,video/webm"
          : "application/pdf,.pdf";
    invoerveld.multiple = soort !== "video";
    invoerveld.click();
  }
  // Werkbalk rustig houden: extra gereedschap pas na een klik op ⋯
  const [meerOpties, setMeerOpties] = useState(false);
  // Aanwijs-flow: na de upload automatisch "vervang de aangewezen video" sturen
  const videoVervangRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [huidigePagina, setHuidigePagina] = useState("/");
  const huidigeRef = useRef("/");
  const [concept, setConcept] = useState<Concept | null>(openConcept ?? null);
  const [chatOpen, setChatOpen] = useState(false);
  // Aandachttrekker voor nieuwe gebruikers; verdwijnt zodra er getypt wordt.
  const [hintWeg, setHintWeg] = useState(false);
  const toonHint = !hintWeg && berichten.length === 0 && !bezig && !chatOpen && !concept;
  const [reloadTeller, setReloadTeller] = useState(0);
  // Live-adres kan na publiceren wijzigen (demo: van de gedeelde demo naar de eigen live-site)
  const [liveUrl, setLiveUrl] = useState<string | null | undefined>(liveUrlProp);
  const [conceptActie, setConceptActie] = useState<string | null>(null);
  const [apparaat, setApparaat] = useState<"telefoon" | "tablet" | "desktop">(
    "desktop"
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const invoerRef = useRef<HTMLTextAreaElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [schaal, setSchaal] = useState(1);
  const [aanwijzen, setAanwijzen] = useState(false);
  const [selectie, setSelectie] = useState<Selectie | null>(null);
  const [suggestiesOpen, setSuggestiesOpen] = useState(false);
  // Zelf tekst aanpassen (aanwijzen → letterlijk vervangen, zonder AI)
  const [zelfTekst, setZelfTekst] = useState<string | null>(null);
  const [zelfBezig, setZelfBezig] = useState(false);
  // Na publiceren: even de kans geven om hem met één klik terug te draaien
  const [ongedaanKans, setOngedaanKans] = useState<number | null>(null);
  const [ongedaanBezig, setOngedaanBezig] = useState(false);
  const [stapTerugBezig, setStapTerugBezig] = useState(false);
  // Vriendelijke lader over het voorbeeld bij directe acties en het verversen
  const [laderTekst, setLaderTekst] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [fotobankOpen, setFotobankOpen] = useState(false);
  const [fotobankDoel, setFotobankDoel] = useState<string | null>(null);
  // Uit de fotobank gekozen foto om in de volgende chatopdracht te gebruiken
  const [fotobankKeuze, setFotobankKeuze] = useState<string | null>(null);
  // Schermvullende weergave (handig in de admin en op kleinere schermen)
  const [volledigScherm, setVolledigScherm] = useState(false);
  // Grote schermen: standaard de gesplitste weergave (site links, gesprek
  // rechts) — veel overzichtelijker. Kleinere laptops en iPads houden de
  // ingebedde weergave, daar zou de site te smal worden.
  useEffect(() => {
    if (window.innerWidth >= 1280) setVolledigScherm(true);
  }, []);
  // Foto-vervangen-flow: volgende gekozen afbeelding meteen versturen
  const fotoVervangRef = useRef(false);
  const [kleur, setKleur] = useState<string | null>(null);
  const kleurInputRef = useRef<HTMLInputElement>(null);
  const [luistert, setLuistert] = useState(false);
  const [spraakKan, setSpraakKan] = useState(false);
  const herkenningRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSpraakKan(Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition));
  }, []);

  // Invoerveld laten meegroeien met de tekst (tot ~5 regels) — ook bij spraakinvoer,
  // zodat je altijd de volledige tekst ziet die je gaat opsturen
  useEffect(() => {
    const el = invoerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [invoer]);

  // Escape sluit de schermvullende weergave
  useEffect(() => {
    if (!volledigScherm) return;
    const opToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVolledigScherm(false);
    };
    window.addEventListener("keydown", opToets);
    return () => window.removeEventListener("keydown", opToets);
  }, [volledigScherm]);

  // Zodra de AI klaar is: de invoerbalk weer focus geven, zodat je meteen door kunt typen
  const wasBezig = useRef(false);
  useEffect(() => {
    if (wasBezig.current && !bezig) {
      setTimeout(() => invoerRef.current?.focus(), 50);
    }
    wasBezig.current = bezig;
  }, [bezig]);

  function wisselSpraak() {
    if (luistert) {
      herkenningRef.current?.stop();
      return;
    }
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionachtig;
      webkitSpeechRecognition?: new () => SpeechRecognitionachtig;
    };
    const Herkenning = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Herkenning) return;
    const rec = new Herkenning();
    rec.lang = "nl-NL";
    rec.continuous = true;
    rec.interimResults = true;
    const basis = invoer ? invoer.replace(/\s+$/, "") + " " : "";
    rec.onresult = (e) => {
      let tekst = "";
      for (let i = 0; i < e.results.length; i++) tekst += e.results[i][0].transcript;
      setInvoer(basis + tekst.trim());
    };
    rec.onend = () => {
      setLuistert(false);
      herkenningRef.current = null;
    };
    rec.onerror = () => setLuistert(false);
    herkenningRef.current = rec;
    setHintWeg(true);
    setLuistert(true);
    rec.start();
  }
  // Grote herlaad-overlay na een oplevering: springt naar de gewijzigde pagina
  const [oplevering, setOplevering] = useState<{ paden: string[] } | null>(null);
  const stopRef = useRef<AbortController | null>(null);
  // Hulpvraag die óók naar Jos is gemaild: na het chat-antwoord vragen we of
  // de klant zo geholpen is, of dat Jos alsnog contact moet opnemen.
  const [hulpvraagOpen, setHulpvraagOpen] = useState<string | null>(null);
  function hulpvraagInChat(vraag: string) {
    setHulpvraagOpen(vraag);
    setChatOpen(true);
    void verstuur(`Hulpvraag (ook naar Jos gemaild): ${vraag}`);
  }
  async function hulpvraagVervolg(vervolg: "opgelost" | "contact") {
    const vraag = hulpvraagOpen;
    setHulpvraagOpen(null);
    if (vraag) {
      void fetch("/api/portal/hulpvraag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tekst: vraag, vervolg }),
      }).catch(() => {});
    }
    setBerichten((b) => [
      ...b,
      {
        rol: "assistent",
        tekst:
          vervolg === "opgelost"
            ? "Fijn! Ik heb Jos laten weten dat het al is opgelost."
            : "Doorgegeven — Jos neemt persoonlijk contact met je op.",
      },
    ]);
  }
  // Wachtbeleving: hoe lang loopt de huidige beurt, en hoe lang duurde het
  // meestal (mediaan van de laatste beurten, per site in de browser bewaard)?
  const [wachtSec, setWachtSec] = useState(0);
  const [duurSchatting, setDuurSchatting] = useState<number | null>(null);
  const beurtStart = useRef(0);
  useEffect(() => {
    if (!bezig) return;
    beurtStart.current = Date.now();
    setWachtSec(0);
    try {
      const eerder = JSON.parse(localStorage.getItem(`wp2ai-duur-${siteId}`) ?? "[]") as number[];
      if (eerder.length >= 2) {
        const sorted = [...eerder].sort((a, b) => a - b);
        setDuurSchatting(sorted[Math.floor(sorted.length / 2)]);
      } else setDuurSchatting(null);
    } catch { setDuurSchatting(null); }
    const t = setInterval(() => setWachtSec(Math.round((Date.now() - beurtStart.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [bezig, siteId]);
  function bewaarBeurtDuur() {
    if (!beurtStart.current) return;
    const duur = Math.round((Date.now() - beurtStart.current) / 1000);
    if (duur < 2) return;
    try {
      const eerder = JSON.parse(localStorage.getItem(`wp2ai-duur-${siteId}`) ?? "[]") as number[];
      localStorage.setItem(`wp2ai-duur-${siteId}`, JSON.stringify([...eerder, duur].slice(-7)));
    } catch {}
  }
  // Bericht dat tijdens een lopende AI-beurt is verstuurd: gaat automatisch
  // de deur uit zodra de beurt klaar is
  const wachtrijRef = useRef<{
    tekst: string;
    fotos: File[];
    docs?: File[];
    video: { commandId: string; naam: string } | null;
    sel: Selectie | null;
    kleur: string | null;
    bankFoto: string | null;
  } | null>(null);

  /** Herlaadt de werkversie en springt naar de opgegeven pagina. */
  function gaNaar(pad: string) {
    if (isMobiel) setMobielWeergave("site");
    // Het basisadres eindigt al op een slash: een pad dat er ook mee begint
    // gaf "site.nl//galerij/" — en dat is een 404.
    const schoon = pad.replace(/^\/+/, "");
    const p = schoon === "index.html" ? "" : schoon;
    huidigeRef.current = "/" + p;
    setHuidigePagina("/" + p);
    setIframeSrc(basisVoor(true) + p);
    setReloadTeller((t) => t + 1);
    setOplevering(null);
  }

  /** Foto's bijvoegen: verkleinen, aanvullen tot het maximum, en eerlijk
   * zeggen wat er niet paste. Tot nu toe verdwenen foto's boven het maximum
   * zonder één woord, waarna de chat meldde "ik bekijk je 30 foto's". */
  function voegFotosToe(nieuwe: File[]) {
    if (!nieuwe.length) return;
    void Promise.all(nieuwe.map(verkleinVoorUpload)).then((klein) => {
      setAfbeeldingen((vorige) => {
        const ruimte = Math.max(0, MAX_FOTOS - vorige.length);
        const teveel = klein.length - ruimte;
        if (teveel > 0) {
          setChatOpen(true);
          setBerichten((b) => [
            ...b,
            {
              rol: "assistent",
              tekst:
                ruimte === 0
                  ? `Er staan al ${MAX_FOTOS} foto's klaar — meer neem ik niet in één bericht mee, anders duurt het onnodig lang. Stuur dit bericht eerst; daarna zet ik de volgende ${teveel} er zo bij.`
                  : `Ik neem er maximaal ${MAX_FOTOS} per bericht mee, anders duurt het onnodig lang. De eerste ${ruimte} staan klaar; stuur dit bericht eerst en daarna de andere ${teveel}, dan zet ik ze er gewoon bij op dezelfde pagina.`,
            },
          ]);
        }
        return [...vorige, ...klein.slice(0, ruimte)];
      });
    });
  }

  /** Stoppen dat écht stopt: het afbreken van het verzoek bereikt de server
   * niet altijd, dus halen we ook het bewerkingsslot weg. De lopende bewerking
   * ziet dat binnen tien seconden en stopt zonder iets op te slaan — anders
   * moet een volgende opdracht minutenlang wachten op een beurt die niemand
   * meer wil. */
  function meldStopAanServer() {
    try {
      const body = JSON.stringify({ siteId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/stop", new Blob([body], { type: "application/json" }));
        return;
      }
      void fetch("/api/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }

  // Directe foto-acties (weghalen, een plek opschuiven). De pijltjes tonen we
  // alleen als de foto echt in een reeks staat — anders wordt de balk een
  // knoppenfabriek voor niets.
  const [fotoReeks, setFotoReeks] = useState<{ positie: number; totaal: number } | null>(null);
  const [fotoActieBezig, setFotoActieBezig] = useState(false);
  async function fotoActie(actie: "info" | "verwijder" | "voor" | "achter") {
    const src = selectie?.html.match(/src=["']([^"']+)["']/)?.[1];
    if (!src) return;
    if (actie !== "info") {
      if (fotoActieBezig || bezig) return;
      if (
        actie === "verwijder" &&
        !window.confirm("Deze foto van de pagina halen? Je ziet het eerst als concept.")
      )
        return;
      setFotoActieBezig(true);
      setOplevering(null);
      setLaderTekst(actie === "verwijder" ? "Foto weghalen..." : "Foto verplaatsen...");
    }
    try {
      const res = await metSlotWacht(
        () =>
          fetch("/api/foto-ordenen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siteId, src, pagina: huidigePagina, actie }),
          }),
        { opWacht: () => actie !== "info" && setLaderTekst(SLOT_WACHTTEKST) },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean; inReeks?: boolean; positie?: number; totaal?: number;
        reply?: string; melding?: string; previewUrl?: string; changeId?: number; bestanden?: string[];
      };
      if (actie === "info") {
        setFotoReeks(data.ok && data.inReeks ? { positie: data.positie ?? 1, totaal: data.totaal ?? 1 } : null);
        return;
      }
      if (!res.ok || !data.ok) {
        setBerichten((b) => [...b, { rol: "assistent", tekst: data.melding ?? "Dat lukte niet — vraag het gerust in de chat." }]);
        setChatOpen(true);
        return;
      }
      setBerichten((b) => [
        ...b,
        { rol: "klant", tekst: actie === "verwijder" ? "🗑️ Foto weggehaald" : "↔️ Foto verplaatst" },
        { rol: "assistent", tekst: data.reply ?? "Aangepast!", metVerversTip: true },
      ]);
      if (data.previewUrl && data.changeId) {
        setConcept({ changeId: data.changeId, previewUrl: data.previewUrl, prompt: "Foto-actie", paginas: data.bestanden ?? [] });
      }
      setSelectie(null);
      setFotoReeks(null);
      herlaad(true);
      toonWerkversie();
    } finally {
      setFotoActieBezig(false);
      setLaderTekst(null);
    }
  }
  // Zodra de eigenaar een foto aanwijst: één keer opvragen of hij in een reeks staat
  useEffect(() => {
    if (selectie?.tag === "img") void fotoActie("info");
    else setFotoReeks(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectie?.html]);

  function stop() {
    stopRef.current?.abort();
    meldStopAanServer();
  }

  // Pagina verlaten of verversen tijdens een beurt: ook dan het slot vrijgeven,
  // anders blijft een beurt draaien die niemand meer ziet.
  useEffect(() => {
    function bijVerlaten() {
      if (bezigRef.current) meldStopAanServer();
    }
    window.addEventListener("pagehide", bijVerlaten);
    return () => window.removeEventListener("pagehide", bijVerlaten);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function meldAanwijzen(aan: boolean) {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wp2ai-aanwijzen", aan },
      "*"
    );
  }

  function zetAanwijzen(aan: boolean) {
    setAanwijzen(aan);
    meldAanwijzen(aan);
    if (!aan) setAanwijsKandidaat(null);
    // Mobiel: aanwijzen doe je óp de site — automatisch heen wisselen
    if (aan && isMobiel) setMobielWeergave("site");
  }

  function basisVoor(conceptActief: boolean) {
    // Klantsites staan inlijsten alleen toe vanaf wordswap.nl (beveiligingsregel
    // frame-ancestors in hun _headers). Op de dev- of voorbeeldomgeving zou het
    // venster dus leeg blijven; daar tonen we de site via onze eigen
    // voorbeeldweg, die op hetzelfde adres draait en dus wél mag.
    const eigenWeg =
      typeof window !== "undefined" &&
      !/(^|\.)wordswap\.nl$/.test(window.location.hostname) &&
      window.location.hostname !== "localhost";
    if (eigenWeg) return `/site-weergave/${previewAccess}/`;
    return conceptActief && werkversieUrl
      ? `https://${werkversieUrl}/`
      : liveUrl
        ? `https://${liveUrl}/`
        : `/site-weergave/${previewAccess}/`;
  }
  const [iframeSrc, setIframeSrc] = useState(() => basisVoor(Boolean(openConcept)));

  /** Herlaadt het voorbeeld op de pagina waar de eigenaar nu naar kijkt. */
  /** Na weggooien of terugdraaien kan de huidige pagina verdwenen zijn
   * (bv. een pagina die alleen in het concept bestond) — herladen toont dan
   * een verwarrende 404. Daarom: altijd voorspelbaar terug naar de homepage. */
  function naarHome() {
    huidigeRef.current = "/";
    setHuidigePagina("/");
    setOplevering(null);
  }

  function herlaad(conceptActief: boolean) {
    const pad =
      huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
    setIframeSrc(basisVoor(conceptActief) + pad);
    setReloadTeller((t) => t + 1);
  }

  /** Na een wijziging: de werkversie herladen. De sites komen uit R2 en dat is
   * direct consistent — wat er staat, ís de nieuwe versie. Geen polsen, geen
   * stil wisselen meer. */
  function toonWerkversie(conceptActief = true) {
    setLaderTekst(null);
    herlaad(conceptActief);
  }

  /** Na publiceren: meteen het live-adres tonen op de pagina die open staat. */
  function toonLive(doelHost: string | null | undefined) {
    setLaderTekst(null);
    if (!doelHost) {
      herlaad(false);
      return;
    }
    const pad = huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
    setIframeSrc(`https://${doelHost}/${pad}`);
    setReloadTeller((t) => t + 1);
  }

  const [viewerBreedte, setViewerBreedte] = useState(0);
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;
    const meet = () => {
      setSchaal(Math.min(1, el.clientWidth / 1280));
      setViewerBreedte(el.clientWidth);
    };
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Op een telefoon: site op ware grootte tonen (die is zelf al responsive)
  // in plaats van een gekrompen desktop-weergave
  const [isMobiel, setIsMobiel] = useState(false);
  // Op mobiel start de chatbalk ingeklapt, zodat je eerst lekker de site ziet
  const [balkOpen, setBalkOpen] = useState(true);
  // Mobiel: chat en site als twee volledige schermen (zoals een artifact)
  const [mobielWeergave, setMobielWeergave] = useState<"site" | "chat">("site");
  // Mobiel: editor schermvullend; via ✕ terug naar de gewone pagina (met menu)
  const [mobielVol, setMobielVol] = useState(true);
  // Mobiel aanwijzen in twee stappen: eerst tikken (randje), dan bevestigen
  const [aanwijsKandidaat, setAanwijsKandidaat] = useState<{ tag: string; tekst: string } | null>(null);
  // Schermvullend op desktop: chat als vast paneel naast het voorbeeld
  const splitModus = volledigScherm && !isMobiel;
  const mobielChat = isMobiel && mobielWeergave === "chat";
  // Smalle invoerbalk-indeling: op mobiel én in het smalle zijpaneel
  const smalleBalk = isMobiel || splitModus;
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const zet = () => setIsMobiel(mq.matches);
    zet();
    if (mq.matches) setBalkOpen(false);
    mq.addEventListener("change", zet);
    return () => mq.removeEventListener("change", zet);
  }, []);

  // Voorbeeldopdracht uit het demo-welkomscherm klaarzetten in de invoerbalk
  useEffect(() => {
    function opStart(e: Event) {
      const tekst = (e as CustomEvent<string>).detail;
      if (!tekst || nieuwBezigRef.current || conceptActie) return;
      setInvoer(tekst);
      setHintWeg(true);
      setMobielWeergave("chat");
      setMobielVol(true);
      setTimeout(() => invoerRef.current?.focus(), 100);
    }
    window.addEventListener("wp2ai-startopdracht", opStart);
    return () => window.removeEventListener("wp2ai-startopdracht", opStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Onafgemaakte videoverwerking (bv. na verversen of wachtrij) hervatten
  useEffect(() => {
    try {
      const ruw = localStorage.getItem(`ws-video-${siteId}`);
      if (!ruw) return;
      const { commandId, naam, vervang, blobUrl } = JSON.parse(ruw) as {
        commandId: string; naam: string; vervang: boolean; blobUrl: string | null;
      };
      if (commandId) volgVideo(commandId, naam ?? "video", false || Boolean(vervang), blobUrl ?? null);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // De site alvast ophalen zodra het portaal opent: de eerste chatvraag
  // hoeft dan niet meer op de download te wachten.
  const laatsteVoorverwarm = useRef(0);
  const voorverwarm = useCallback(() => {
    // Ook opnieuw bij focus op het invoerveld: wie een tijd rondkeek voordat
    // hij ging typen, krijgt zo alsnog een warme start.
    if (Date.now() - laatsteVoorverwarm.current < 3 * 60_000) return;
    laatsteVoorverwarm.current = Date.now();
    fetch("/api/voorverwarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    }).catch(() => {});
  }, [siteId]);
  useEffect(() => {
    laatsteVoorverwarm.current = 0;
    voorverwarm();
  }, [siteId, voorverwarm]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "wp2ai-pagina" && typeof e.data.pad === "string") {
        // Pad zonder het voorvoegsel van de preview- of directe weergave,
        // anders belandt "/site-weergave/17/offerte" straks op het echte adres (404)
        const pad = e.data.pad.replace(/^\/(?:preview|site-weergave)\/[^/]+/, "") || "/";
        setHuidigePagina(pad);
        huidigeRef.current = pad;
      }
      if (e.data?.type === "wp2ai-aanwijs-focus") {
        setAanwijsKandidaat({ tag: String(e.data.tag ?? ""), tekst: String(e.data.tekst ?? "") });
      }
      if (e.data?.type === "wp2ai-selectie") {
        setAanwijsKandidaat(null);
        setSelectie({
          pad: String(e.data.pad ?? "/").replace(/^\/(?:preview|site-weergave)\/[^/]+/, "") || "/",
          tag: String(e.data.tag ?? ""),
          tekst: String(e.data.tekst ?? ""),
          html: String(e.data.html ?? ""),
          kleuren: e.data.kleuren as Selectie["kleuren"],
        });
        setAanwijzen(false);
        // Mobiel: terug naar de chat, waar de keuzeknoppen staan
        setMobielWeergave("chat");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [berichten, bezig, chatOpen]);

  /** Video uploaden in delen van 4 MB (via onze server naar Rendi) en laten
   * comprimeren; daarna staat het opdracht-id klaar om met het bericht mee te
   * sturen. Werkt ook voor grote telefoonvideo's. */
  /** Wacht (op de achtergrond) tot Rendi klaar is met comprimeren en handel
   * dan af: chip klaarzetten of, in de vervang-flow, direct versturen zodra
   * de chat vrij is. Overleeft een verversing via localStorage. */
  async function volgVideo(commandId: string, naam: string, vervang: boolean, blobUrl: string | null) {
    try {
      localStorage.setItem(
        `ws-video-${siteId}`,
        JSON.stringify({ commandId, naam, vervang, blobUrl })
      );
    } catch {}
    const gestart = Date.now();
    let inWachtrijGemeld = false;
    // Ruim een kwartier de tijd: eerst elke 4 s, na 2 minuten elke 10 s
    while (Date.now() - gestart < 15 * 60 * 1000) {
      await new Promise((ok) => setTimeout(ok, Date.now() - gestart < 120_000 ? 4000 : 10_000));
      let st: { klaar?: boolean; fout?: string; status?: string; groottemb?: number };
      try {
        st = await fetch("/api/video-upload?stap=status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandId, blobUrl: blobUrl ?? undefined }),
        }).then((r) => r.json());
      } catch {
        continue; // netwerkhikje: gewoon nog eens proberen
      }
      if (st.fout) {
        try { localStorage.removeItem(`ws-video-${siteId}`); } catch {}
        setStatusTekst(null);
        setVideoBezig(false);
        setBerichten((b) => [...b, { rol: "assistent", tekst: `De video kon niet verwerkt worden: ${st.fout}` }]);
        setChatOpen(true);
        return;
      }
      if (st.status === "QUEUED" && Date.now() - gestart > 30_000 && !inWachtrijGemeld) {
        inWachtrijGemeld = true;
        setStatusTekst(null);
        setVideoBezig(false);
        setBerichten((b) => [
          ...b,
          {
            rol: "assistent",
            tekst: "Het is even druk bij de videoverwerker — je video staat in de wachtrij. Je kunt gewoon verder werken (of dit venster sluiten); ik meld me hier zodra hij klaar is.",
          },
        ]);
        setChatOpen(true);
      }
      if (st.klaar) {
        try { localStorage.removeItem(`ws-video-${siteId}`); } catch {}
        setStatusTekst(null);
        setVideoBezig(false);
        if (vervang) {
          // Wachten tot de chat vrij is, dan pas de vervang-opdracht sturen
          while (bezigRef.current) await new Promise((ok) => setTimeout(ok, 1500));
          await verstuurMetVideo(
            "Vervang de aangewezen video door de meegestuurde nieuwe video, op precies dezelfde plek. Neem de weergave van de OUDE video exact over: had hij afspeelknoppen (controls), dan houdt de nieuwe die ook; was het een achtergrondloop (autoplay muted loop playsinline), dan dat. Verander verder niets aan de instellingen, gebruik wel de nieuwe poster. Laat het oude videobestand staan.",
            commandId
          );
          return;
        }
        setVideoKlaar({ commandId, naam });
        setBerichten((b) => [
          ...b,
          {
            rol: "assistent",
            tekst: `Je video "${naam}" is klaar (gecomprimeerd tot ${st.groottemb ? st.groottemb.toFixed(1) + " MB" : "webformaat"}). Typ nu waar hij moet komen — bijvoorbeeld "zet deze video als achtergrond van de homepage".`,
          },
        ]);
        setChatOpen(true);
        return;
      }
    }
    try { localStorage.removeItem(`ws-video-${siteId}`); } catch {}
    setStatusTekst(null);
    setVideoBezig(false);
    setBerichten((b) => [
      ...b,
      { rol: "assistent", tekst: "De videoverwerking duurt ongebruikelijk lang. Probeer het later nog eens — je tegoed is niet verbruikt als hij niet geplaatst is." },
    ]);
    setChatOpen(true);
  }

  async function videoUploaden(bestand: File) {
    if (videoBezig) return;
    setVideoBezig(true);
    setVideoKlaar(null);
    setChatOpen(true);
    setBerichten((b) => [...b, { rol: "klant", tekst: `🎬 Video meegestuurd: ${bestand.name}` }]);
    const vervang = videoVervangRef.current;
    videoVervangRef.current = false;
    let blobUrl: string | null = null;
    try {
      setStatusTekst("Video uploaden... 0%");
      const { upload } = await import("@vercel/blob/client");
      const blob = await upload(bestand.name, bestand, {
        access: "public",
        handleUploadUrl: "/api/video-upload?stap=token",
        clientPayload: JSON.stringify({ siteId }),
        onUploadProgress: (p) => setStatusTekst(`Video uploaden... ${Math.round(p.percentage)}%`),
      });
      blobUrl = blob.url;
      setStatusTekst("Video wordt gecomprimeerd voor het web (±1 minuut)...");
      const klaar = await fetch("/api/video-upload?stap=klaar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, blobUrl, basisnaam: bestand.name.replace(/\.[^.]+$/, "") }),
      }).then((r) => r.json() as Promise<{ commandId?: string; error?: string }>);
      if (!klaar.commandId) throw new Error(klaar.error ?? "Comprimeren starten mislukte");
      await volgVideo(klaar.commandId, bestand.name, vervang, blobUrl);
    } catch (e) {
      setStatusTekst(null);
      setVideoBezig(false);
      const m = (e as Error).message ?? "";
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: /tegoed|pakket/.test(m) ? m : `De video kon niet verwerkt worden: ${m || "onbekende fout"}`,
        },
      ]);
      setChatOpen(true);
    }
  }

  async function verstuurMetVideo(tekst: string, commandId: string) {
    setVideoKlaar({ commandId, naam: "video" });
    await verstuur(tekst);
  }

  async function verstuur(
    overrideTekst?: unknown,
    overrideAfbeelding?: File,
    uitWachtrij?: { fotos: File[]; docs?: File[]; video: { commandId: string; naam: string } | null; sel: Selectie | null; kleur: string | null; bankFoto?: string | null },
    extra?: { controle?: boolean }
  ) {
    const tekst = (typeof overrideTekst === "string" ? overrideTekst : invoer).trim();
    if (!tekst) return;
    if (bezigRef.current && !uitWachtrij) {
      // AI is nog bezig: bericht in de wachtrij zetten en meteen tonen
      const q = wachtrijRef.current;
      wachtrijRef.current = {
        tekst: q ? `${q.tekst}\n${tekst}` : tekst,
        fotos: [...(q?.fotos ?? []), ...(overrideAfbeelding ? [overrideAfbeelding] : afbeeldingen)].slice(0, MAX_FOTOS),
        docs: [...(q?.docs ?? []), ...(overrideAfbeelding ? [] : documenten)].slice(0, 4),
        video: videoKlaarRef.current ?? q?.video ?? null,
        sel: selectie ?? q?.sel ?? null,
        kleur: kleur ?? q?.kleur ?? null,
        bankFoto: fotobankKeuze ?? q?.bankFoto ?? null,
      };
      setInvoer("");
      setAfbeeldingen([]);
      setDocumenten([]);
      setVideoKlaar(null);
      setSelectie(null);
      setKleur(null);
      setFotobankKeuze(null);
      setChatOpen(true);
      setBerichten((b) => [
        ...b,
        { rol: "klant", tekst },
        ...(q ? [] : [{ rol: "assistent" as const, tekst: "⏳ Ik maak eerst de vorige wijziging af — daarna pak ik dit meteen op." }]),
      ]);
      return;
    }
    setHerstelFout(null);
    setInvoer("");
    setChatOpen(true);
    const teVersturen = uitWachtrij ? uitWachtrij.fotos : overrideAfbeelding ? [overrideAfbeelding] : afbeeldingen;
    setAfbeeldingen([]);
    const teVersturenDocs = uitWachtrij ? (uitWachtrij.docs ?? []) : overrideAfbeelding ? [] : documenten;
    setDocumenten([]);
    const meegestuurdeVideo = uitWachtrij ? uitWachtrij.video : videoKlaarRef.current;
    setVideoKlaar(null);
    const gekozen = uitWachtrij ? uitWachtrij.sel : selectie;
    setSelectie(null);
    const gekozenKleur = uitWachtrij ? uitWachtrij.kleur : kleur;
    setKleur(null);
    const gekozenBankFoto = uitWachtrij ? (uitWachtrij.bankFoto ?? null) : fotobankKeuze;
    setFotobankKeuze(null);
    if (!uitWachtrij) {
      setBerichten((b) => [
        ...b,
        { rol: "klant", tekst: teVersturen.length > 0 || teVersturenDocs.length > 0 ? `\u{1F4CE} ${tekst}` : tekst },
      ]);
    }
    setBezig(true);
    setStatusTekst(
      teVersturen.length > 0
        ? `Ik verwerk je foto${teVersturen.length > 1 ? "\u2019s" : ""}...`
        : teVersturenDocs.length > 0
          ? `Ik zet je ${teVersturenDocs.length > 1 ? "documenten" : "document"} klaar...`
          : null,
    );
    const opdracht = { tekst, fotos: teVersturen, docs: teVersturenDocs, video: meegestuurdeVideo, sel: gekozen, kleur: gekozenKleur, bankFoto: gekozenBankFoto, pagina: huidigePagina };
    let gelukt = false;
    const stopper = new AbortController();
    stopRef.current = stopper;
    try {
      // Een verzoek aan de server mag hooguit ~4,5 MB zijn. Passen de foto's
      // daar (ook na het verkleinen in de browser) niet in — een telefoonfoto
      // is zo 10 MB en een galerij bestaat uit tientallen foto's — dan gaan ze
      // eerst rechtstreeks naar de opslag en sturen we alleen de adressen mee.
      const samen = teVersturen.reduce((som, f) => som + f.size, 0);
      let fotoUrls: string[] | null = null;
      if (teVersturen.length > 0 && samen > 3_500_000) {
        setStatusTekst(
          `Ik zet je ${teVersturen.length} foto${teVersturen.length > 1 ? "'s" : ""} klaar...`,
        );
        const { upload } = await import("@vercel/blob/client");
        fotoUrls = await Promise.all(
          teVersturen.map(async (f) => {
            const res = await upload(`chat/${Date.now()}-${f.name}`, f, {
              access: "public",
              handleUploadUrl: "/api/foto-upload",
              clientPayload: JSON.stringify({ siteId }),
            });
            return res.url;
          }),
        );
      }
      const verstuurNaarServer = () => {
        if ((teVersturen.length > 0 && !fotoUrls) || teVersturenDocs.length > 0) {
          const form = new FormData();
          form.set("siteId", String(siteId));
          form.set("bericht", tekst);
          form.set("huidigePagina", huidigePagina);
          if (fotoUrls) form.set("fotoUrls", JSON.stringify(fotoUrls));
          else for (const f of teVersturen) form.append("afbeelding", f);
          for (const f of teVersturenDocs) form.append("document", f);
          if (meegestuurdeVideo) form.set("videoCommandId", meegestuurdeVideo.commandId);
          if (gekozen) form.set("selectie", JSON.stringify(gekozen));
          if (gekozenKleur) form.set("kleur", gekozenKleur);
          if (gekozenBankFoto) form.set("fotobankPad", gekozenBankFoto);
          if (extra?.controle) { form.set("controle", "1"); form.set("apparaat", apparaat); }
          return fetch("/api/chat", { method: "POST", body: form, signal: stopper.signal });
        }
        return fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: stopper.signal,
          body: JSON.stringify({
            siteId,
            bericht: tekst,
            huidigePagina,
            selectie: gekozen ?? undefined,
            kleur: gekozenKleur ?? undefined,
            fotobankPad: gekozenBankFoto ?? undefined,
            fotoUrls: fotoUrls ?? undefined,
            videoCommandId: meegestuurdeVideo?.commandId,
            controle: extra?.controle || undefined,
            apparaat: extra?.controle ? apparaat : undefined,
          }),
        });
      };
      // Stopbaar wachten: bij stop breekt ook het wachten meteen af
      const wachtEven = (ms: number) =>
        new Promise<void>((klaar, faal) => {
          const t = setTimeout(klaar, ms);
          stopper.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(t);
              faal(new DOMException("Gestopt", "AbortError"));
            },
            { once: true },
          );
        });
      let res = await verstuurNaarServer();
      // Bezet slot (er loopt nog een bewerking op de server)? Geen foutmelding,
      // maar rustig wachten en vanzelf opnieuw proberen. Het slot vernieuwt
      // zichzelf elke 30 s en valt na een crash binnen ±1,5 minuut vrij, dus
      // na hooguit ~2 minuten proberen geven we het pas op.
      for (let poging = 0; res.status === 409; poging++) {
        const data = (await res
          .clone()
          .json()
          .catch(() => ({}))) as { slot?: boolean };
        if (!data.slot || poging >= 11) break;
        setStatusTekst(
          "Er wordt nog aan je website gewerkt — ik wacht even en ga daarna vanzelf met jouw opdracht verder...",
        );
        await wachtEven(10_000);
        res = await verstuurNaarServer();
      }
      const data = await readChatResponse(res, (event) => {
        if (event.type === "status" && typeof event.tekst === "string") {
          setStatusTekst(event.tekst);
          // Nieuwe werkstap: het commentaar tot nu toe blijft staan als
          // tussenbericht (net als in een echt gesprek), de stroom gaat verder
          setLiveTekst((t) => {
            if (t && t.trim()) {
              setBerichten((b) => [
                ...b,
                { rol: "assistent", tekst: t.trim(), tussenstap: true },
              ]);
            }
            return null;
          });
        }
        if (event.type === "tekst-delta" && typeof event.tekst === "string") {
          setLiveTekst((t) => (t ?? "") + event.tekst);
        }
        if (event.type === "tekst-live" && typeof event.zoek === "string") {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "wp2ai-tekst-live", zoek: event.zoek, vervang: event.vervang }, "*"
          );
        }
        if (event.type === "tekst-live-plek" && typeof event.zoek === "string") {
          // Laten zien wáár gewerkt wordt: meescrollen en kort oplichten
          iframeRef.current?.contentWindow?.postMessage(
            { type: "wp2ai-werkplek", zoek: event.zoek }, "*"
          );
        }
        if (event.type === "bewerkt" && typeof event.pad === "string" && huidigeRef.current !== event.pad) {
          huidigeRef.current = event.pad;
          setHuidigePagina(event.pad);
          herlaad(true);
        }
      });
      gelukt = true;
      mislukteOpdracht.current = null;
      const eindTekst = data.reply ?? "Er ging iets mis, probeer het opnieuw.";
      setBerichten((b) => {
        // Kwam het eindantwoord al binnen als "tussenstap" (omdat er daarna nog
        // een statusmelding volgde)? Dan niet nog een keer tonen.
        const laatste = b[b.length - 1];
        const basis =
          laatste?.rol === "assistent" && laatste.tussenstap && laatste.tekst.trim() === eindTekst.trim()
            ? b.slice(0, -1)
            : b;
        return [
          ...basis,
          {
            rol: "assistent",
            tekst: eindTekst,
            metVerversTip: Boolean(data.previewUrl && data.changeId),
          },
        ];
      });
      if (data.previewUrl && data.changeId) {
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: data.prompt ?? "",
          paginas: data.bestanden ?? [],
        });
        herlaad(true);
        toonWerkversie();
        setOngedaanKans(null);
        const paginas = (data.bestanden ?? []).filter(isEchtePagina);
        setOplevering({ paden: paginas.length > 0 ? paginas : ["index.html"] });
        // Gesprek inklappen zodat de "wijziging staat klaar"-kaart vrij zicht heeft
        setChatOpen(false);
      }
    } catch (error) {
      mislukteOpdracht.current = opdracht;
      const melding = stopper.signal.aborted
        ? "De opdracht is gestopt. Je kunt hem hieronder terugzetten, of gewoon een nieuwe opdracht sturen — als er op de achtergrond nog iets afrondt, wacht ik daar vanzelf op."
        : error instanceof Error && !(error instanceof TypeError) ? error.message : "De verbinding viel weg.";
      setHerstelFout({
        soort: "bericht",
        tekst: stopper.signal.aborted
          ? melding
          : melding + " Controleer eerst je websitevoorbeeld. Je kunt de opdracht hieronder terugzetten om hem zelf opnieuw te versturen.",
      });
      setChatOpen(true);
      setBerichten((b) => [...b, { rol: "assistent", tekst: melding }]);
    } finally {
      if (gelukt) bewaarBeurtDuur();
      stopRef.current = null;
      setBezig(false);
      setLiveTekst(null);
      const q = wachtrijRef.current;
      if (q && gelukt) {
        wachtrijRef.current = null;
        void verstuur(q.tekst, undefined, { fotos: q.fotos, docs: q.docs, video: q.video, sel: q.sel, kleur: q.kleur, bankFoto: q.bankFoto });
      }
      setStatusTekst(null);
    }
  }

  async function zelfToepassen() {
    if (!selectie || zelfTekst === null || zelfBezig) return;
    const oud = (selectie.tekst ?? "").trim();
    const nieuw = zelfTekst.trim();
    if (!oud || !nieuw || oud === nieuw) return;
    setZelfBezig(true);
    setOplevering(null);
    setLaderTekst("Even geduld — je tekst wordt aangepast...");
    try {
      const res = await metSlotWacht(
        () =>
          fetch("/api/tekst-wijzig", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siteId, oud, nieuw }),
          }),
        { opWacht: () => setLaderTekst(SLOT_WACHTTEKST) },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        fallback?: boolean;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        error?: string;
        melding?: string;
      };
      if (data.ok && data.previewUrl && data.changeId) {
        setSelectie(null);
        setZelfTekst(null);
        setBerichten((b) => [
          ...b,
          { rol: "klant", tekst: `✏️ Zelf aangepast: "${oud.slice(0, 60)}" → "${nieuw.slice(0, 60)}"` },
          { rol: "assistent", tekst: data.reply ?? "Aangepast!", metVerversTip: true },
        ]);
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: "Tekst zelf aangepast",
          paginas: data.bestanden ?? [],
        });
        herlaad(true);
        toonWerkversie();
        setOngedaanKans(null);
        const paginas = (data.bestanden ?? []).filter(isEchtePagina);
        setOplevering({ paden: paginas.length > 0 ? paginas : ["index.html"] });
        setChatOpen(false);
      } else if (data.fallback) {
        setLaderTekst(null);
        // Tekst niet eenduidig terug te vinden — de AI lost het veilig op
        setZelfTekst(null);
        setInvoer(`Vervang de tekst "${oud}" door "${nieuw}"`);
        setChatOpen(true);
        setBerichten((b) => [
          ...b,
          {
            rol: "assistent",
            tekst:
              "Deze tekst staat op meerdere plekken of kon ik niet 1-op-1 terugvinden. Ik heb je wijziging klaargezet in de invoerbalk — verstuur hem, dan past de AI hem veilig op de juiste plek aan.",
          },
        ]);
      } else {
        setLaderTekst(null);
        setChatOpen(true);
        setBerichten((b) => [
          ...b,
          { rol: "assistent", tekst: data.error ?? data.melding ?? "Er ging iets mis, probeer het opnieuw." },
        ]);
      }
    } catch {
      setLaderTekst(null);
      setChatOpen(true);
      setBerichten((b) => [
        ...b,
        { rol: "assistent", tekst: "Er ging iets mis, probeer het opnieuw." },
      ]);
    } finally {
      setZelfBezig(false);
    }
  }

  /** Achtergrond van de aangewezen foto weghalen — draait volledig in de
   * browser (klein AI-model, geen kosten), daarna via de gewone vervang-flow. */
  async function achtergrondWeg() {
    const src = selectie?.html.match(/src=["']([^"']+)["']/)?.[1];
    if (!src || bezig) return;
    let pad = src.replace(/^https?:\/\/[^/]+/, "").split("?")[0].split("#")[0];
    pad = pad.replace(/^\/preview\/\d+\//, "/").replace(/^\/+/, "");
    setOplevering(null);
    setLaderTekst("Achtergrond weghalen — dit gebeurt in je eigen browser, even geduld...");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const bron = await fetch(`/site-weergave/${previewAccess}/${pad}`).then((r) => r.blob());
      const uit = await removeBackground(bron);
      const bestand = new File([uit], pad.split("/").pop()?.replace(/\.[^.]+$/, ".png") ?? "foto.png", {
        type: "image/png",
      });
      // Niet eerst leegmaken: dan flikkert de melding weg en lijkt het of er
      // niets gebeurt. fotoDirect zet er meteen zijn eigen tekst overheen.
      await fotoDirect(bestand);
    } catch {
      setLaderTekst(null);
      setBerichten((b) => [
        ...b,
        { rol: "assistent", tekst: "De achtergrond weghalen lukte niet bij deze foto — probeer het nog eens, of stuur een andere foto." },
      ]);
      setChatOpen(true);
    }
  }

  async function fotoDirect(bestand: File) {
    const src = selectie?.html.match(/src=["']([^"']+)["']/)?.[1];
    if (!src) {
      // Geen bronpad te vinden → veilig via de AI
      verstuur(
        "Vervang de aangewezen foto door de meegestuurde nieuwe afbeelding — zelfde plek, zelfde formaat/uitsnede, en pas de alt-tekst logisch aan.",
        bestand
      );
      return;
    }
    setZelfBezig(true);
    setOplevering(null);
    setLaderTekst("Even geduld — je nieuwe foto wordt geplaatst...");
    setChatOpen(true);
    setBerichten((b) => [...b, { rol: "klant", tekst: "📷 Foto vervangen (zelf gekozen bestand)" }]);
    try {
      const form = new FormData();
      form.set("siteId", String(siteId));
      form.set("pad", src);
      form.set("afbeelding", bestand);
      const res = await metSlotWacht(
        () => fetch("/api/foto-wijzig", { method: "POST", body: form }),
        { opWacht: () => setLaderTekst(SLOT_WACHTTEKST) },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        fallback?: boolean;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        error?: string;
        melding?: string;
      };
      if (data.ok && data.previewUrl && data.changeId) {
        setSelectie(null);
        setBerichten((b) => [
          ...b,
          { rol: "assistent", tekst: data.reply ?? "Foto vervangen!", metVerversTip: true },
        ]);
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: "Foto vervangen",
          paginas: data.bestanden ?? [],
        });
        herlaad(true);
        toonWerkversie();
        setOngedaanKans(null);
        setOplevering({
          paden: [
            huidigeRef.current === "/"
              ? "index.html"
              : `${huidigeRef.current.replace(/^\/+|\/+$/g, "")}/index.html`,
          ],
        });
        setChatOpen(false);
      } else if (data.fallback) {
        setLaderTekst(null);
        setBerichten((b) => [
          ...b,
          { rol: "assistent", tekst: "Dit fotobestand kon ik niet rechtstreeks vinden — ik geef hem aan de AI, momentje..." },
        ]);
        verstuur(
          "Vervang de aangewezen foto door de meegestuurde nieuwe afbeelding — zelfde plek, zelfde formaat/uitsnede, en pas de alt-tekst logisch aan.",
          bestand
        );
      } else {
        setBerichten((b) => [
          ...b,
          { rol: "assistent", tekst: data.error ?? data.melding ?? "Er ging iets mis, probeer het opnieuw." },
        ]);
      }
    } catch {
      setBerichten((b) => [
        ...b,
        { rol: "assistent", tekst: "Er ging iets mis, probeer het opnieuw." },
      ]);
    } finally {
      setZelfBezig(false);
    }
  }

  async function kleurDirect(oudeKleur: string) {
    if (!kleur || zelfBezig) return;
    setZelfBezig(true);
    setOplevering(null);
    setLaderTekst("Even geduld — de kleur wordt overal doorgevoerd...");
    try {
      const res = await metSlotWacht(
        () =>
          fetch("/api/tekst-wijzig", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ siteId, oud: oudeKleur, nieuw: kleur, kleur: true }),
          }),
        { opWacht: () => setLaderTekst(SLOT_WACHTTEKST) },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        fallback?: boolean;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        error?: string;
        melding?: string;
      };
      if (data.ok && data.previewUrl && data.changeId) {
        const nieuweKleur = kleur;
        setSelectie(null);
        setKleur(null);
        setBerichten((b) => [
          ...b,
          { rol: "klant", tekst: `🎨 Kleur direct aangepast naar ${nieuweKleur}` },
          { rol: "assistent", tekst: data.reply ?? "Kleur aangepast!", metVerversTip: true },
        ]);
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: "Kleur direct aangepast",
          paginas: data.bestanden ?? [],
        });
        herlaad(true);
        toonWerkversie();
        setOngedaanKans(null);
        const paginas = (data.bestanden ?? []).filter(isEchtePagina);
        setOplevering({ paden: paginas.length > 0 ? paginas : ["index.html"] });
        setChatOpen(false);
      } else if (data.fallback) {
        setLaderTekst(null);
        setInvoer("Geef het aangewezen onderdeel de gekozen kleur");
        setChatOpen(true);
        setBerichten((b) => [
          ...b,
          {
            rol: "assistent",
            tekst:
              "Deze kleur kon ik niet rechtstreeks in de bestanden terugvinden (hij komt waarschijnlijk uit een berekening of afbeelding). Ik heb de opdracht klaargezet in de invoerbalk — verstuur hem, dan doet de AI het.",
          },
        ]);
      } else {
        setLaderTekst(null);
        setChatOpen(true);
        setBerichten((b) => [
          ...b,
          { rol: "assistent", tekst: data.error ?? data.melding ?? "Er ging iets mis, probeer het opnieuw." },
        ]);
      }
    } catch {
      setLaderTekst(null);
      setChatOpen(true);
      setBerichten((b) => [
        ...b,
        { rol: "assistent", tekst: "Er ging iets mis, probeer het opnieuw." },
      ]);
    } finally {
      setZelfBezig(false);
    }
  }

  async function ongedaanMaken() {
    if (ongedaanKans === null || ongedaanBezig) return;
    setOngedaanBezig(true);
    try {
      const res = await fetch("/api/ongedaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId: ongedaanKans }),
      });
      const data = (await res.json().catch(() => ({}))) as { melding?: string; error?: string };
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: res.ok
            ? "Teruggedraaid! Je site staat weer zoals vóór deze wijziging."
            : (data.melding ?? "Terugdraaien lukte niet — vraag het gerust in de chat, dan doe ik het."),
        },
      ]);
      setChatOpen(true);
      if (res.ok) {
        setOngedaanKans(null);
        naarHome();
        // Direct de teruggedraaide versie tonen (vers uit de bron) en stil
        // doorwisselen naar het echte adres zodra dat is bijgetrokken —
        // zelfde aanpak als bij wijzigen en publiceren
        toonLive(liveUrl);
      }
    } finally {
      setOngedaanBezig(false);
    }
  }

  async function stapTerug() {
    if (!concept || stapTerugBezig || conceptActie) return;
    setStapTerugBezig(true);
    try {
      const res = await fetch("/api/stap-terug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId: concept.changeId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        overgebleven?: number;
        melding?: string;
      };
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: res.ok
            ? data.overgebleven === 0
              ? "Laatste stap teruggedraaid — het concept is nu weer leeg. Wil je helemaal stoppen, klik dan op Verwijder."
              : "Laatste stap teruggedraaid. De eerdere stappen van dit concept staan er nog."
            : (data.melding ?? "Terugdraaien lukte niet — probeer het zo nog eens."),
        },
      ]);
      setChatOpen(true);
      if (res.ok) {
        naarHome();
        toonWerkversie();
      }
    } finally {
      setStapTerugBezig(false);
    }
  }

  async function nieuwGesprek() {
    if (bezigRef.current || nieuwBezigRef.current || conceptActie) return;
    if (!window.confirm("Nieuw gesprek beginnen? De AI vergeet dan het eerdere gesprek. Je website en open concept blijven behouden.")) return;
    nieuwBezigRef.current = true;
    setNieuwBezig(true);
    setHerstelFout(null);
    try {
      const res = await fetch("/api/gesprek-nieuw", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) throw new Error(data.error ?? "Nieuw gesprek starten is niet bevestigd.");
      setBerichten([{ rol: "assistent", tekst: "Je nieuwe gesprek is gestart. Je website en eventuele concept zijn behouden. Wat wil je aanpassen?" }]);
      setSelectie(null);
      setVideoKlaar(null);
      setAfbeeldingen([]);
      wachtrijRef.current = null;
      mislukteOpdracht.current = null;
    } catch (error) {
      setHerstelFout({ soort: "gesprek", tekst: (error instanceof Error && !(error instanceof TypeError) ? error.message : "De verbinding viel weg.") + " Je gesprek blijft hier zichtbaar. Probeer opnieuw of herlaad de pagina om de opgeslagen status te controleren." });
    } finally {
      nieuwBezigRef.current = false;
      setNieuwBezig(false);
    }
  }

  function zetOpdrachtTerug() {
    const opdracht = mislukteOpdracht.current;
    if (!opdracht) return;
    if ((invoer.trim() || afbeeldingen.length || videoKlaarRef.current) && !window.confirm("Je huidige invoer vervangen door de bewaarde opdracht?")) return;
    setInvoer(opdracht.tekst);
    setAfbeeldingen(opdracht.fotos);
    setDocumenten(opdracht.docs ?? []);
    setVideoKlaar(opdracht.video);
    setSelectie(opdracht.sel);
    setKleur(opdracht.kleur);
    setFotobankKeuze(opdracht.bankFoto);
    setHuidigePagina(opdracht.pagina);
    huidigeRef.current = opdracht.pagina;
    setHerstelFout(null);
    invoerRef.current?.focus();
  }

  async function conceptVerwerken(actie: "publiceer" | "verwerp") {
    if (!concept || conceptActie || bezigRef.current || nieuwBezigRef.current) return;
    setHerstelFout(null);
    setConceptActie(actie);
    const res = await fetch(`/api/${actie}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId: concept.changeId }),
    }).catch(() => null);
    if (!res) {
      setBerichten((b) => [...b, { rol: "assistent", tekst: "De verbinding viel weg. Je concept blijft beschikbaar. Controleer de status of probeer opnieuw." }]);
      setHerstelFout({ soort: actie, tekst: "Geen bevestiging ontvangen. Controleer de opgeslagen status of probeer dezelfde actie opnieuw. Je concept blijft hier beschikbaar." });
      setChatOpen(true);
      setConceptActie(null);
      return;
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { melding?: string; error?: string };
      setHerstelFout({ soort: actie, tekst: data.melding ?? data.error ?? "Deze actie is niet bevestigd. Controleer de status of probeer opnieuw." });
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst:
            data.melding ??
            "Dat lukte helaas niet — probeer het zo nog eens.",
        },
      ]);
      setChatOpen(true);
      if (res.status === 410) {
        // Concept bestaat niet meer (bv. demo-reset): opruimen en terug naar live
        setHerstelFout(null);
        setConcept(null);
        herlaad(false);
      }
      setConceptActie(null);
      return;
    }
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { liveUrl?: string };
      const nieuwLive = data.liveUrl ?? liveUrl;
      if (data.liveUrl) setLiveUrl(data.liveUrl);
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst:
            actie === "publiceer"
              ? "Gepubliceerd! Je wijziging staat nu live, voor iedereen."
              : "Het concept is verwijderd. Je website blijft zoals hij was.",
        },
      ]);
      setChatOpen(true);
      if (actie === "publiceer" && concept) setOngedaanKans(concept.changeId);
      setConcept(null);
      if (actie === "publiceer") {
        // Meteen de gepubliceerde versie laten zien; stil doorwisselen naar
        // het echte adres zodra dat is bijgetrokken (voorkomt "oude site"-schrik)
        toonLive(nieuwLive);
      } else {
        naarHome();
        herlaad(false);
      }
    }
    setConceptActie(null);
  }

  return (
    <div className="min-w-0">
      <div
        className={`bg-white overflow-hidden flex flex-col ${
          volledigScherm || (isMobiel && mobielVol)
            ? "fixed inset-0 z-[80]"
            : "relative rounded-3xl border-2 shadow-sm"
        } ${concept ? "border-amber-400" : "border-stone-200"}`}
      >
        {/* Publiceren/verwijderen: duidelijke overlay over venster én chat, zodat niemand ondertussen doorklikt */}
        {conceptActie && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-stone-900/50 backdrop-blur-[2px]" role="status" aria-live="polite">
            <div className="mx-4 max-w-sm rounded-3xl bg-white px-8 py-7 text-center shadow-2xl">
              <svg className="mx-auto mb-4 h-10 w-10 animate-spin text-violet-700" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="text-lg font-semibold text-stone-900">
                {conceptActie === "publiceer" ? "Je wijziging gaat live…" : "Concept wordt verwijderd…"}
              </p>
              <p className="mt-1.5 text-sm text-stone-500">
                {conceptActie === "publiceer"
                  ? "Een paar seconden. Daarna zie je hier meteen de gepubliceerde versie."
                  : "Je website blijft zoals hij was."}
              </p>
            </div>
          </div>
        )}
        {/* Mobiel: wisselaar tussen chat en site */}
        {isMobiel && (
          <div className="flex shrink-0 items-center gap-1 border-b border-stone-200 bg-stone-50 p-1.5">
            {(
              [
                ["chat", "💬 Chat"],
                ["site", concept ? "🌐 Jouw site (concept)" : "🌐 Jouw site"],
              ] as const
            ).map(([sleutel, label]) => (
              <button
                key={sleutel}
                onClick={() => {
                  setMobielWeergave(sleutel);
                  setMobielVol(true);
                }}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold cursor-pointer ${
                  mobielWeergave === sleutel
                    ? "bg-violet-700 text-white shadow"
                    : "text-stone-600"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setMobielVol(false)}
              aria-label="Editor verkleinen — terug naar de pagina"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-400 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Bovenbalk */}
        <div className={`${mobielChat ? "hidden" : "flex"} items-center justify-between gap-3 border-b border-stone-200 px-4 py-2.5 text-sm`}>
          {concept ? (
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-3.5 py-1.5 text-sm font-medium text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Concept — nog niet zichtbaar voor bezoekers
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-sm font-medium text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Gelijk aan de live site
            </span>
          )}
          {/* Adres van de pagina die je nu bekijkt, zoals bezoekers hem zien */}
          {liveUrl && (
            <span
              title={`${liveUrl}${huidigePagina === "/" ? "" : huidigePagina}`}
              className="hidden lg:flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-500"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-stone-400">
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span className="truncate">
                {liveUrl}
                <span className="text-stone-800">
                  {huidigePagina === "/" ? "" : huidigePagina}
                </span>
              </span>
            </span>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => herlaad(Boolean(concept))}
              aria-label="Voorbeeld verversen"
              title="Voorbeeld verversen"
              className="flex h-8 items-center gap-1.5 rounded-full border border-stone-200 px-3 text-sm font-medium text-stone-500 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ververs
            </button>
            <div className="hidden md:flex items-center gap-1 rounded-full border border-stone-200 p-0.5">
              {(
                [
                  ["telefoon", "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm4 17.2h.01"],
                  ["tablet", "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 17h.01"],
                  ["desktop", "M3 4h18v12H3zM9 20h6m-3-4v4"],
                ] as const
              ).map(([naam, pad]) => (
                <button
                  key={naam}
                  onClick={() => setApparaat(naam)}
                  aria-label={`Bekijk op ${naam}`}
                  title={`Bekijk op ${naam}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full cursor-pointer ${
                    apparaat === naam
                      ? "bg-stone-900 text-white"
                      : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d={pad} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
            {volledigScherm && !isMobiel && (
              <>
                {/* Schermvullend: duidelijke weg terug naar de rest van het dashboard */}
                {terugLink && (
                  <a
                    href={terugLink}
                    className="hidden sm:inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 text-xs font-medium text-stone-600 hover:border-violet-400 hover:text-violet-700"
                  >
                    ← Alle websites
                  </a>
                )}
                <button
                  onClick={() => {
                    setVolledigScherm(false);
                    setTimeout(() => document.querySelector("[data-site-extra]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 cursor-pointer"
                  title="Berichten van je formulieren, e-mailinstellingen en handtekening"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  Berichten &amp; instellingen
                </button>
              </>
            )}
            {concept && werkversieUrl && (
              <a
                href={`https://${werkversieUrl}`}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-amber-700 hover:underline"
              >
                Open concept
              </a>
            )}
            {liveUrl && (
              <a
                href={`https://${liveUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-violet-700 font-medium hover:underline"
              >
                Open live site
              </a>
            )}
            <Tip
              tekst={
                volledigScherm
                  ? "Terug naar de normale weergave (kan ook met Esc)"
                  : "Voorbeeld schermvullend maken"
              }
            >
              {/* Schermvullend krijgt er tekst bij: een los icoontje wordt niet
                  door iedereen herkend als "hier kom je er weer uit". */}
              <button
                onClick={() => setVolledigScherm(!volledigScherm)}
                aria-label={volledigScherm ? "Volledig scherm sluiten" : "Volledig scherm"}
                className={`hidden sm:flex items-center justify-center rounded-full border cursor-pointer ${
                  volledigScherm
                    ? "gap-1.5 border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-600 hover:border-violet-400 hover:text-violet-700"
                    : "h-8 w-8 border-stone-200 text-stone-500 hover:border-violet-400 hover:text-violet-700"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  {volledigScherm ? (
                    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
                {volledigScherm && <span className="hidden md:inline">Volledig scherm uit</span>}
              </button>
            </Tip>
          </div>
        </div>

        <div className={mobielChat ? "flex min-h-0 flex-1 flex-col" : splitModus ? "flex flex-1 min-h-0" : isMobiel && mobielVol ? "flex min-h-0 flex-1 flex-col" : "contents"}>
        {/* Website-viewer */}
        <div
          ref={viewerRef}
          className={`relative ${mobielChat ? "hidden" : ""} ${
            volledigScherm || (isMobiel && mobielVol)
              ? "flex-1 min-h-0"
              : "h-[calc(100dvh-17rem)] sm:h-[calc(100dvh-20rem)] min-h-[24rem]"
          } ${
            isMobiel || apparaat === "desktop"
              ? "overflow-hidden"
              : "bg-stone-100 flex justify-center overflow-y-auto py-6"
          }`}
        >
          {isMobiel ? (
            // Telefoon: op exacte pixelbreedte (iOS negeert width:100% bij iframes
            // en rekt hem anders op tot de inhoudsbreedte)
            <iframe
              key={`${reloadTeller}-${viewerBreedte}`}
              ref={iframeRef}
              src={iframeSrc}
              title="Je website"
              onLoad={() => aanwijzen && meldAanwijzen(true)}
              width={viewerBreedte || undefined}
              style={{ width: viewerBreedte ? `${viewerBreedte}px` : "100%", height: "100%" }}
              className="bg-white"
            />
          ) : apparaat === "desktop" ? (
            // Echte desktop-breedte (1280px), geschaald naar het venster
            <iframe
              key={reloadTeller}
              ref={iframeRef}
              src={iframeSrc}
              title="Je website"
              onLoad={() => aanwijzen && meldAanwijzen(true)}
              style={{
                width: 1280,
                height: `${100 / schaal}%`,
                transform: `scale(${schaal})`,
                transformOrigin: "top left",
                marginInline: schaal >= 1 ? "auto" : undefined,
              }}
              className="bg-white"
            />
          ) : (
            <iframe
              key={reloadTeller}
              ref={iframeRef}
              src={iframeSrc}
              title="Je website"
              onLoad={() => aanwijzen && meldAanwijzen(true)}
              className={
                apparaat === "tablet"
                  ? "w-[768px] max-w-full h-[1024px] shrink-0 bg-white rounded-2xl border-8 border-stone-800 shadow-xl"
                  : "w-[375px] h-[812px] shrink-0 bg-white rounded-[2rem] border-8 border-stone-800 shadow-xl"
              }
            />
          )}
        </div>

        {/* Vriendelijke lader tijdens klaarzetten/verversen */}
        {laderTekst && !oplevering && (
          <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center bg-stone-900/30 backdrop-blur-[1px]">
            <div className="mx-4 flex max-w-md items-center gap-3 rounded-2xl bg-stone-900/90 px-6 py-4 text-sm font-medium text-white shadow-2xl">
              <svg className="h-5 w-5 shrink-0 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              {laderTekst}
            </div>
          </div>
        )}

        {/* Herlaad-overlay na een oplevering */}
        {oplevering && !bezig && (
          <div className="absolute inset-0 z-[30] flex items-center justify-center bg-stone-900/40 backdrop-blur-[2px]">
            <div className="relative mx-4 max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
              <button
                onClick={() => setOplevering(null)}
                aria-label="Sluiten"
                className="absolute right-4 top-4 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
              <p className="font-display text-2xl font-semibold">
                Je wijziging staat klaar
              </p>
              <p className="mt-2 text-stone-600">
                {oplevering.paden.length === 1
                  ? `op ${paginaLabel(oplevering.paden[0])}`
                  : `op ${oplevering.paden.length} pagina's — bekijk ze een voor een:`}
              </p>
              <button
                onClick={() => gaNaar(oplevering.paden[0])}
                className="lift mt-6 inline-flex items-center gap-2 rounded-full bg-violet-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-violet-300 hover:bg-violet-600 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {oplevering.paden.length === 1
                  ? "Herlaad en bekijk →"
                  : `Bekijk ${paginaLabel(oplevering.paden[0])} →`}
              </button>
              {oplevering.paden.length > 1 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {oplevering.paden.slice(1, 6).map((pad) => (
                    <button
                      key={pad}
                      onClick={() => gaNaar(pad)}
                      className="rounded-full border border-violet-300 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-50 cursor-pointer"
                    >
                      {paginaLabel(pad)} →
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-stone-400">
                Controleer het voorbeeld vóór je publiceert. Publiceer hem daarna met de knop onderin.
              </p>
            </div>
          </div>
        )}

        {/* Mobiel: aanwijs-hint over de site heen */}
        {isMobiel && !mobielChat && aanwijzen && (
          <div className="absolute left-1/2 top-3 z-20 flex w-[94%] -translate-x-1/2 items-center gap-3 rounded-2xl bg-stone-900/85 px-4 py-3 text-sm font-medium text-white shadow-2xl backdrop-blur">
            <span className="min-w-0 flex-1 truncate">
              {aanwijsKandidaat
                ? aanwijsKandidaat.tag === "img"
                  ? "📷 Foto geselecteerd — of tik iets anders aan"
                  : `"${aanwijsKandidaat.tekst || `een ${aanwijsKandidaat.tag}-onderdeel`}"`
                : "👆 Tik aan wat je wilt aanpassen"}
            </span>
          </div>
        )}

        {/* Mobiel: ingeklapte chat — eerst lekker de site bekijken */}
        {/* Mobiel aanwijzen: grote bevestigbalk onderin (waar de duim zit) */}
        {isMobiel && !mobielChat && aanwijzen && (
          <div className="absolute bottom-4 left-1/2 z-10 flex w-[94%] -translate-x-1/2 items-center gap-2">
            {aanwijsKandidaat && (
              <button
                onClick={() =>
                  iframeRef.current?.contentWindow?.postMessage({ type: "wp2ai-aanwijs-bevestig" }, "*")
                }
                className="flex-1 rounded-full bg-violet-700 px-6 py-3.5 text-center font-semibold text-white shadow-2xl shadow-violet-400/50 cursor-pointer"
              >
                ✔️ Deze aanpassen
              </button>
            )}
            <button
              onClick={() => zetAanwijzen(false)}
              className={`rounded-full py-3.5 font-semibold shadow-2xl cursor-pointer ${
                aanwijsKandidaat
                  ? "bg-white px-5 text-stone-600"
                  : "flex-1 bg-stone-900/80 px-6 text-white backdrop-blur"
              }`}
            >
              {aanwijsKandidaat ? "✕" : "✕ Toch niet aanwijzen"}
            </button>
          </div>
        )}
        {isMobiel && !mobielChat && !aanwijzen && (
          <button
            onClick={() => {
              setMobielWeergave("chat");
              setMobielVol(true);
            }}
            className={`absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 font-semibold text-white shadow-2xl cursor-pointer ${
              concept
                ? "bg-amber-500 shadow-amber-400/50"
                : "bg-violet-700 shadow-violet-400/50"
            }`}
          >
            {concept ? "📋 Concept klaar — bekijk & publiceer" : "💬 Site aanpassen"}
            {!concept && berichten.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold">
                {berichten.length}
              </span>
            )}
          </button>
        )}

        {/* Zwevend chatpaneel over de preview — of vast zijpaneel bij schermvullend */}
        <div
          className={
            splitModus
              ? "flex w-[26rem] xl:w-[30rem] 2xl:w-[34rem] shrink-0 flex-col justify-end gap-0 overflow-y-auto border-l border-stone-200 bg-stone-100/80 p-3"
              : mobielChat
                ? "flex min-h-0 flex-1 flex-col justify-end gap-0 overflow-y-auto bg-white p-3"
                : isMobiel
                  ? "hidden"
                : // Desktop: invoerbalk als vast blok onder het voorbeeld; het
                  // gesprek en de panelen zweven eroverheen (absolute, bottom-full)
                  "relative z-10 mx-auto w-[min(96%,44rem)] lg:w-[min(94%,52rem)] xl:w-[min(92%,62rem)] 2xl:w-[min(90%,72rem)] pb-3"
          }
        >
          <ChatHulp onInChat={hulpvraagInChat} />
          {herstelFout && (
            <div role="alert" className="mb-2 shrink-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-950">
              <p>{herstelFout.tekst}</p>
              {herstelFout.soort === "bericht" && wachtrijRef.current && <p className="mt-1">Je vervolgopdracht wacht tot een opdracht weer succesvol is afgerond.</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" disabled={bezig || nieuwBezig || conceptActie !== null}
                  className="rounded-lg bg-red-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
                  onClick={() => {
                    if (herstelFout.soort === "gesprek") void nieuwGesprek();
                    else if (herstelFout.soort === "bericht") zetOpdrachtTerug();
                    else void conceptVerwerken(herstelFout.soort);
                  }}>
                  {herstelFout.soort === "bericht" ? "Opdracht terugzetten" : "Opnieuw proberen"}
                </button>
                <button type="button" className="underline" onClick={() => {
                  if ((mislukteOpdracht.current || invoer.trim() || afbeeldingen.length || videoKlaarRef.current || wachtrijRef.current) && !window.confirm("Herlaad om opgeslagen wijzigingen te controleren. Bewaarde invoer en bijlagen op dit scherm gaan dan verloren. Doorgaan?")) return;
                  window.location.reload();
                }}>Opgeslagen status bekijken</button>
              </div>
            </div>
          )}
          <div className={splitModus || isMobiel ? "contents" : "absolute bottom-full left-0 right-0"}>
          {/* Gespreksvenster (inklapbaar; in splitmodus altijd open en vullend) */}
          {(chatOpen || splitModus || mobielChat) && (
            <div className={`mb-3 rounded-3xl border border-stone-200 bg-white/95 shadow-2xl backdrop-blur ${splitModus || mobielChat ? "flex min-h-0 flex-1 flex-col" : ""}`}>
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Gesprek
                </span>
                <div className="flex items-center gap-1">
                <button
                  onClick={nieuwGesprek}
                  disabled={bezig || nieuwBezig || conceptActie !== null}
                  title="Nieuw gesprek: de AI vergeet het eerdere gesprek (je site blijft zoals hij is)"
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50 cursor-pointer"
                >
                  {nieuwBezig ? "Gesprek starten..." : "🧹 Nieuw gesprek"}
                </button>
                <button
                  onClick={() => { setRedenVoor(redenVoor === "algemeen" ? null : "algemeen"); setRedenTekst(""); setRedenKlaar(false); }}
                  title="We verbeteren de chatbeleving continu — vertel wat er beter kan"
                  className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 cursor-pointer"
                >
                  💬 Feedback
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  aria-label="Gesprek inklappen"
                  title="Gesprek inklappen"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)" />
                  </svg>
                </button>
                </div>
              </div>
              <div
                ref={scrollRef}
                className={
                  splitModus || mobielChat
                    ? "flex-1 min-h-0 overflow-y-auto p-4 space-y-3"
                    : `${concept ? "max-h-[22dvh]" : "max-h-[40dvh]"} sm:max-h-72 overflow-y-auto p-4 space-y-3`
                }
              >
                {berichten.length === 0 && !bezig && (
                  <div className="text-sm">
                    <p className="font-semibold text-stone-800">Zo pas je je website aan</p>
                    <p className="mt-1 text-stone-500">
                      Typ gewoon wat er anders moet, in je eigen woorden. Je ziet
                      eerst een voorbeeld — pas als jij op Publiceer klikt staat het live.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "Zet de openingstijden op zaterdag tot 17:00",
                        "Maak de kop op deze pagina wat pakkender",
                        "Voeg een knop 'Bel ons' toe bovenaan",
                      ].map((vb) => (
                        <button
                          key={vb}
                          onClick={() => {
                            setInvoer(vb);
                            invoerRef.current?.focus();
                          }}
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-left text-xs font-medium text-violet-800 hover:bg-violet-100 cursor-pointer"
                        >
                          {vb}
                        </button>
                      ))}
                    </div>
                    <ul className="mt-4 space-y-1.5 text-xs text-stone-500">
                      <li><span className="font-semibold text-stone-700">➤ Wijs aan</span> — tik iets op je site aan (een tekst, een foto) en zeg wat ermee moet.</li>
                      <li><span className="font-semibold text-stone-700">🖼 Foto</span> — nieuwe foto's meesturen, of kiezen uit alles wat al op je site stond.</li>
                      <li><span className="font-semibold text-stone-700">🎨 Kleur</span> en <span className="font-semibold text-stone-700">SEO</span> — zelf aanpassen zonder te wachten op de AI.</li>
                      <li><span className="font-semibold text-stone-700">↩︎ Fout gegaan?</span> Gebruik “Stap terug” voor je laatste conceptwijziging. Na publicatie kun je de vorige versie herstellen.</li>
                    </ul>
                  </div>
                )}
                {redenVoor === "algemeen" && (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3 text-sm">
                    {redenKlaar ? (
                      <p className="font-medium text-emerald-700">Dank je wel! Je feedback is bij Jos beland. 🙏</p>
                    ) : (
                      <>
                        <p className="font-semibold text-stone-700">
                          We verbeteren de chatbeleving continu — wat kan er beter?
                        </p>
                        <textarea
                          value={redenTekst}
                          onChange={(e) => setRedenTekst(e.target.value)}
                          rows={2}
                          placeholder="Vertel wat er niet goed ging of anders moet..."
                          className="mt-2 w-full resize-none rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={async () => {
                              if (redenTekst.trim().length < 3 || redenBezig) return;
                              setRedenBezig(true);
                              await stuurFeedback("algemeen", { reden: redenTekst });
                              setRedenBezig(false);
                              setRedenKlaar(true);
                              setTimeout(() => { setRedenVoor(null); setRedenKlaar(false); }, 2500);
                            }}
                            disabled={redenBezig || redenTekst.trim().length < 3}
                            className="rounded-full bg-violet-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
                          >
                            {redenBezig ? "Versturen..." : "Verstuur"}
                          </button>
                          <button
                            onClick={() => setRedenVoor(null)}
                            className="rounded-full px-3 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 cursor-pointer"
                          >
                            Annuleren
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {berichten.map((m, i) => {
                  const { schoon, keuzes } =
                    m.rol === "assistent"
                      ? parseKeuzes(m.tekst)
                      : { schoon: m.tekst, keuzes: [] as string[] };
                  return (
                  <div key={i}>
                    <div
                      className={`w-fit max-w-[90%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap break-words ${
                        m.rol === "klant"
                          ? "ml-auto bg-violet-600 text-white rounded-br-sm text-sm"
                          : m.tussenstap
                            ? "bg-stone-50 text-stone-500 rounded-bl-sm text-[13px]"
                            : "bg-stone-100 text-stone-800 rounded-bl-sm text-sm"
                      }`}
                    >
                      {schoon.split(/(\*\*[^*]+\*\*)/g).map((deel, j) =>
                        deel.startsWith("**") && deel.endsWith("**") ? (
                          <strong key={j}>{deel.slice(2, -2)}</strong>
                        ) : (
                          <span key={j}>{deel}</span>
                        )
                      )}
                    </div>
                    {m.rol === "assistent" && !m.tussenstap && (
                      <div className="mt-1 flex items-center gap-1">
                        {feedbackGegeven[i] ? (
                          <span className="flex items-center gap-1 px-1 text-xs text-stone-400">
                            <svg width="13" height="13" viewBox="0 0 24 24" className={feedbackGegeven[i] === "goed" ? "fill-emerald-100 text-emerald-600" : "rotate-180 fill-stone-200 text-stone-500"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                            </svg>
                            Dank je!
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => stuurFeedback("goed", { antwoord: m.tekst, index: i })}
                              title="Goed antwoord"
                              className="group rounded-full p-1 text-stone-300 hover:text-emerald-600 cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="group-hover:fill-emerald-100" aria-hidden>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                            </button>
                            <button
                              onClick={() => { setRedenVoor(redenVoor === i ? null : i); setRedenTekst(""); }}
                              title="Dit antwoord was niet goed"
                              className="group rounded-full p-1 text-stone-300 hover:text-red-500 cursor-pointer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="rotate-180 group-hover:fill-red-100" aria-hidden>
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {redenVoor === i && !feedbackGegeven[i] && (
                      <div className="mt-1 w-fit max-w-[90%] rounded-2xl border border-stone-200 bg-white p-3 text-sm">
                        <p className="text-xs font-semibold text-stone-600">Wat was er niet goed aan dit antwoord?</p>
                        <textarea
                          value={redenTekst}
                          onChange={(e) => setRedenTekst(e.target.value)}
                          rows={2}
                          placeholder="Bijvoorbeeld: hij deed iets anders dan ik vroeg..."
                          className="mt-1.5 w-64 max-w-full resize-none rounded-xl border border-stone-300 px-2.5 py-1.5 text-xs focus:border-violet-500 focus:outline-none"
                        />
                        <div className="mt-1.5 flex gap-2">
                          <button
                            onClick={async () => {
                              if (redenBezig) return;
                              setRedenBezig(true);
                              await stuurFeedback("slecht", { antwoord: m.tekst, reden: redenTekst, index: i });
                              setRedenBezig(false);
                              setRedenVoor(null);
                            }}
                            disabled={redenBezig}
                            className="rounded-full bg-violet-700 px-3.5 py-1 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
                          >
                            {redenBezig ? "Versturen..." : "Verstuur"}
                          </button>
                          <button
                            onClick={() => setRedenVoor(null)}
                            className="rounded-full px-2.5 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100 cursor-pointer"
                          >
                            Annuleren
                          </button>
                        </div>
                      </div>
                    )}
                    {i === berichten.length - 1 &&
                      m.rol === "assistent" &&
                      keuzes.length > 0 &&
                      !bezig && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {keuzes.map((keuze, ki) => (
                            <button
                              key={keuze}
                              onClick={() => {
                                if (isZelfTypKeuze(keuze)) {
                                  // Niets versturen: gewoon het typveld openen
                                  invoerRef.current?.focus();
                                  return;
                                }
                                verstuur(keuze);
                              }}
                              className={`rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${
                                ki === 0
                                  ? "bg-violet-700 text-white shadow-md shadow-violet-200 hover:bg-violet-600"
                                  : "border border-violet-300 bg-white text-violet-700 hover:bg-violet-50"
                              }`}
                            >
                              {isZelfTypKeuze(keuze)
                                ? `✏️ ${keuze.replace(/^\u270F\uFE0F\s*/, "")}`
                                : ki === 0
                                  ? `✨ ${keuze}`
                                  : keuze}
                            </button>
                          ))}
                        </div>
                      )}
                    {i === berichten.length - 1 &&
                      m.rol === "assistent" &&
                      hulpvraagOpen &&
                      !bezig && (
                        <div className="mt-2">
                          <p className="text-xs text-stone-500">Ben je hiermee geholpen?</p>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            <button
                              onClick={() => hulpvraagVervolg("opgelost")}
                              className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-600 cursor-pointer"
                            >
                              ✅ Ja, zo geholpen
                            </button>
                            <button
                              onClick={() => hulpvraagVervolg("contact")}
                              className="rounded-full border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 cursor-pointer"
                            >
                              📞 Laat Jos toch contact opnemen
                            </button>
                          </div>
                        </div>
                      )}
                    {i === berichten.length - 1 &&
                      m.rol === "assistent" &&
                      (m.metVerversTip || concept != null) && (
                      <button
                        onClick={() => verstuur("Dit klopt niet. Kijk zelf even naar wat ik nu zie.", undefined, undefined, { controle: true })}
                        disabled={bezig || conceptActie !== null}
                        className="mt-1.5 flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-violet-400 hover:text-violet-700 disabled:opacity-50 cursor-pointer"
                        title="De AI maakt een schermafbeelding van precies wat jij nu ziet en beoordeelt zijn eigen werk"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        Klopt het niet? Laat de AI zelf kijken
                      </button>
                    )}
                  </div>
                  );
                })}
                {bezig && liveTekst && (
                  <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-2.5 text-sm whitespace-pre-wrap break-words text-stone-800">
                    {liveTekst.split(/(\*\*[^*]+\*\*)/g).map((deel, j) =>
                      deel.startsWith("**") && deel.endsWith("**") ? (
                        <strong key={j}>{deel.slice(2, -2)}</strong>
                      ) : (
                        <span key={j}>{deel}</span>
                      )
                    )}
                    <span className="ml-1 inline-block h-3.5 w-0.5 animate-pulse bg-violet-500 align-middle" aria-hidden />
                  </div>
                )}
                {(bezig || videoBezig) && (
                  <div className="flex w-fit items-center gap-3 rounded-2xl rounded-bl-sm bg-stone-100 px-4 py-3">
                    <span className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-2 w-2 animate-bounce rounded-full bg-violet-500"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </span>
                    <span className="text-sm font-medium text-stone-600">
                      {statusTekst ?? "..."}
                    </span>
                    {wachtSec >= 5 && (
                      <span className="text-xs text-stone-400">
                        {wachtSec}s{duurSchatting && duurSchatting > wachtSec ? ` — duurt bij jou meestal ±${duurSchatting}s` : ""}
                      </span>
                    )}
                  </div>
                )}
                {(bezig || videoBezig) && wachtSec >= 15 && (
                  <p className="mt-1 max-w-[90%] text-xs text-stone-400">
                    Je kunt gerust even iets anders doen in een ander tabblad — ik
                    werk gewoon door en het resultaat verschijnt hier vanzelf.
                  </p>
                )}
              </div>
            </div>
          )}

          {fotobankOpen && (
            <Fotobank
              siteId={siteId}
              onGebruik={(pad) => {
                setFotobankKeuze(pad);
                setFotobankOpen(false);
                setChatOpen(true);
                invoerRef.current?.focus();
              }}
              // Zonder open concept van het live-adres laden: de werkversie kan dan
              // nog niet bestaan (demo: persoonlijke sandbox ontstaat pas bij de eerste wijziging)
              beeldBasis={concept ? (werkversieUrl ?? liveUrl) : (liveUrl ?? werkversieUrl)}
              vervangDoel={fotobankDoel}
              onSluit={() => {
                setFotobankOpen(false);
                setFotobankDoel(null);
              }}
              onKlaar={(data) => {
                setFotobankOpen(false);
                setFotobankDoel(null);
                setSelectie(null);
                setChatOpen(true);
                setBerichten((b) => [
                  ...b,
                  { rol: "klant", tekst: fotobankDoel ? "🖼️ Foto vervangen uit de fotobank" : "🖼️ Oude foto teruggezet" },
                  { rol: "assistent", tekst: data.reply ?? "Teruggezet!", metVerversTip: true },
                ]);
                if (data.previewUrl && data.changeId) {
                  setConcept({
                    changeId: data.changeId,
                    previewUrl: data.previewUrl,
                    prompt: "Oude foto teruggezet",
                    paginas: data.bestanden ?? [],
                  });
                  herlaad(true);
                  toonWerkversie();
                  setOngedaanKans(null);
                }
              }}
            />
          )}
          {seoOpen && (
            <Vindbaarheid
              siteId={siteId}
              pad={huidigePagina}
              domein={liveUrl}
              onSluit={() => setSeoOpen(false)}
              onKlaar={(data) => {
                setSeoOpen(false);
                setChatOpen(true);
                setBerichten((b) => [
                  ...b,
                  { rol: "klant", tekst: "🔍 Vindbaarheid aangepast" },
                  { rol: "assistent", tekst: data.reply ?? "Bijgewerkt!", metVerversTip: true },
                ]);
                if (data.previewUrl && data.changeId) {
                  setConcept({
                    changeId: data.changeId,
                    previewUrl: data.previewUrl,
                    prompt: "Vindbaarheid aangepast",
                    paginas: data.bestanden ?? [],
                  });
                  // Adres gewijzigd? Voorbeeld naar het nieuwe adres sturen
                  if (data.nieuwAdres) {
                    huidigeRef.current = data.nieuwAdres;
                    setHuidigePagina(data.nieuwAdres);
                  }
                  herlaad(true);
                  toonWerkversie();
                  setOngedaanKans(null);
                }
              }}
            />
          )}

          {/* Concept-strip */}
          {concept && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="min-w-0 flex-1 text-sm text-amber-950">
                <span className="font-semibold">Concept klaar — nog niet live.</span>{" "}
                {concept.paginas.length > 0 && (() => {
                  const paginas = concept.paginas.filter(isEchtePagina);
                  const overig = concept.paginas.length - paginas.length;
                  return (
                    <span className="text-amber-800 hidden sm:inline">
                      Aangepast:{" "}
                      {paginas.slice(0, 3).map((pad, i) => (
                        <span key={pad + i}>
                          {i > 0 && ", "}
                          <button
                            onClick={() => gaNaar(pad)}
                            className="font-semibold underline decoration-amber-400 hover:text-amber-950 cursor-pointer"
                          >
                            {paginaLabel(pad)}
                          </button>
                        </span>
                      ))}
                      {paginas.length > 3 && ` +${paginas.length - 3} pagina's`}
                      {overig > 0 && `${paginas.length > 0 ? " en " : ""}${overig} bestand${overig === 1 ? "" : "en"}`}
                      .
                    </span>
                  );
                })()}{" "}
                Controleer het voorbeeld vóór je publiceert.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => conceptVerwerken("publiceer")}
                  disabled={conceptActie !== null || bezig || nieuwBezig}
                  className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
                >
                  {conceptActie === "publiceer" ? "Bezig..." : "Publiceer"}
                </button>
                {conceptActie === "publiceer" && (
                  <span className="basis-full text-xs text-amber-800">
                    We zetten je wijziging live en lopen alles nog even na
                    (koppelingen en vindbaarheid), zodat alles goed blijft
                    werken. Dit duurt zo'n halve minuut.
                  </span>
                )}
                {isMobiel ? (
                  <button
                    onClick={() => setMobielWeergave("site")}
                    className="flex items-center gap-1 rounded-full border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    👀 Bekijk concept
                  </button>
                ) : (
                  <Tip tekst="Bekijk het complete voorbeeld in een nieuw tabblad">
                    <a
                      href={basisVoor(true)}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-1 rounded-full border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M14 4h6v6M20 4L10 14M9 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Bekijk concept
                    </a>
                  </Tip>
                )}
                <Tip tekst="Draait alleen je laatste stap terug — eerdere stappen van dit concept blijven staan">
                  <button
                    onClick={stapTerug}
                    disabled={conceptActie !== null || stapTerugBezig || bezig}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                  >
                    {stapTerugBezig ? "Bezig..." : "↩ Stap terug"}
                  </button>
                </Tip>
                <button
                  onClick={() => conceptVerwerken("verwerp")}
                  disabled={conceptActie !== null || bezig || nieuwBezig}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  {conceptActie === "verwerp" ? "Bezig..." : "Concept weggooien"}
                </button>
              </div>
            </div>
          )}

          {/* Na publiceren: één klik om toch terug te draaien */}
          {ongedaanKans !== null && !concept && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="min-w-0 flex-1 text-sm text-emerald-900">
                <span className="font-semibold">Gepubliceerd.</span> Toch niet
                goed? Je kunt hem nog terugdraaien.
              </p>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={ongedaanMaken}
                  disabled={ongedaanBezig}
                  className="rounded-full border border-emerald-400 px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                >
                  {ongedaanBezig ? "Bezig..." : "↩ Draai terug"}
                </button>
                <button
                  onClick={() => setOngedaanKans(null)}
                  aria-label="Sluiten"
                  className="text-emerald-400 hover:text-emerald-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Aanwijzer voor nieuwe gebruikers */}
          {toonHint && (
            <div className="pointer-events-none mb-2 flex flex-col items-center">
              <div className="rounded-2xl bg-violet-700 px-5 py-3 text-white shadow-2xl">
                <p className="font-semibold">
                  Wat wil je op je website veranderen?
                </p>
                <p className="mt-0.5 text-sm text-violet-100">
                  Typ wat je veranderd wilt hebben — bijvoorbeeld:
                  &ldquo;zet de openingstijden op zaterdag tot 17:00&rdquo;
                </p>
              </div>
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                className="mt-1 animate-bounce text-violet-700"
                aria-hidden
              >
                <path d="M12 3v15m0 0l-6-6m6 6l6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {/* Aanwijs-modus actief */}
          {aanwijzen && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-violet-500 bg-white/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="text-sm font-medium text-violet-900">
                Klik in het voorbeeld hierboven op het onderdeel dat je bedoelt.
              </p>
              <button
                onClick={() => zetAanwijzen(false)}
                className="text-sm text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Annuleer
              </button>
            </div>
          )}

          {/* Uit de fotobank gekozen foto */}
          {fotobankKeuze && (
            <div className="mb-3 min-w-0 max-w-full overflow-hidden rounded-2xl border border-violet-300 bg-violet-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <p className="line-clamp-2 min-w-0 flex-1 break-words text-sm text-violet-900">
                  <span className="font-semibold">Foto uit de bank:</span>{" "}
                  {fotobankKeuze.split("/").pop()}
                  <span className="text-violet-600"> — vertel hieronder wat ermee moet gebeuren</span>
                </p>
                <button
                  onClick={() => setFotobankKeuze(null)}
                  aria-label="Foto-keuze wissen"
                  className="shrink-0 cursor-pointer text-violet-400 hover:text-violet-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          {/* Aangewezen onderdeel */}
          {selectie && (
            <div className="mb-3 min-w-0 max-w-full overflow-hidden rounded-2xl border border-violet-300 bg-violet-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              {/* Knoppen breken af naar een volgende regel. De omschrijving mag
                  over twee regels lopen in plaats van op één regel te blijven:
                  een lange foto-omschrijving op één regel maakte de balk (en de
                  hele chatkolom) breder dan het scherm. */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                <p className="line-clamp-2 min-w-0 basis-full break-words text-sm text-violet-900">
                  <span className="font-semibold">Aangewezen:</span>{" "}
                  {selectie.tag === "img"
                    ? `foto: ${selectie.tekst || "zonder omschrijving"}`
                    : selectie.tag === "video"
                      ? "video"
                      : selectie.tekst || `een ${selectie.tag}-onderdeel`}{" "}
                  <span className="text-violet-600">
                    ({paginaLabel(selectie.pad === "/" ? "index.html" : selectie.pad)})
                  </span>
                </p>
                {selectie.tag === "img" && (
                  <button
                    onClick={() => {
                      fotoVervangRef.current = true;
                      kiesBijlage("foto");
                    }}
                    disabled={bezig}
                    className="shrink-0 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                  >
                    📷 Vervang deze foto
                  </button>
                )}
                {selectie.tag === "img" && (
                  <button
                    onClick={() => {
                      const src = selectie.html.match(/src=["']([^"']+)["']/)?.[1];
                      if (!src) return;
                      setFotobankDoel(src);
                      setFotobankOpen(true);
                    }}
                    disabled={bezig}
                    className="shrink-0 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                  >
                    🖼️ Kies uit de fotobank
                  </button>
                )}
                {selectie.tag === "video" && (
                  <button
                    onClick={() => {
                      videoVervangRef.current = true;
                      kiesBijlage("video");
                    }}
                    disabled={bezig || videoBezig}
                    className="shrink-0 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                  >
                    🎬 Vervang deze video
                  </button>
                )}
                {selectie.tag === "img" && fotoReeks && (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => fotoActie("voor")}
                      disabled={bezig || fotoActieBezig || fotoReeks.positie <= 1}
                      title="Een plek naar voren"
                      className="rounded-full border border-violet-400 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40 cursor-pointer"
                    >
                      ←
                    </button>
                    <span className="text-xs text-violet-700">
                      {fotoReeks.positie} van {fotoReeks.totaal}
                    </span>
                    <button
                      onClick={() => fotoActie("achter")}
                      disabled={bezig || fotoActieBezig || fotoReeks.positie >= fotoReeks.totaal}
                      title="Een plek naar achteren"
                      className="rounded-full border border-violet-400 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40 cursor-pointer"
                    >
                      →
                    </button>
                  </span>
                )}
                {selectie.tag === "img" && (
                  <button
                    onClick={() => fotoActie("verwijder")}
                    disabled={bezig || fotoActieBezig}
                    className="shrink-0 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                  >
                    🗑️ Weghalen
                  </button>
                )}
                {selectie.tag === "img" && (
                  <button
                    onClick={achtergrondWeg}
                    disabled={bezig}
                    className="shrink-0 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                  >
                    ✨ Achtergrond weghalen
                  </button>
                )}
                {selectie.tekst && selectie.tag !== "img" && zelfTekst === null && (
                  <button
                    onClick={() => setZelfTekst(selectie.tekst ?? "")}
                    className="shrink-0 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 cursor-pointer"
                  >
                    ✏️ Zelf aanpassen
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectie(null);
                    setZelfTekst(null);
                  }}
                  aria-label="Selectie verwijderen"
                  className="text-violet-400 hover:text-violet-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {zelfTekst !== null && (
                <div className="mt-2.5 border-t border-violet-200 pt-2.5">
                  <p className="text-xs font-semibold text-violet-800">
                    Pas de tekst aan en klik op Toepassen — zonder AI, in een paar
                    seconden. Je ziet hem eerst als voorbeeld; er gaat niets live
                    zonder Publiceer.
                  </p>
                  <textarea
                    value={zelfTekst}
                    onChange={(e) => setZelfTekst(e.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-violet-300 bg-white px-3 py-2 text-sm focus:border-violet-600 focus:outline-none"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={zelfToepassen}
                      disabled={zelfBezig || !zelfTekst.trim() || zelfTekst.trim() === (selectie.tekst ?? "").trim()}
                      className="rounded-full bg-violet-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
                    >
                      {zelfBezig ? "Bezig..." : "Toepassen →"}
                    </button>
                    <button
                      onClick={() => setZelfTekst(null)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 cursor-pointer"
                    >
                      Annuleer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gekozen kleur */}
          {kleur && (
            <div className="mb-3 rounded-2xl border border-violet-300 bg-violet-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm text-violet-900">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-stone-300"
                    style={{ backgroundColor: kleur }}
                  />
                  <span className="font-semibold">Gekozen kleur:</span>{" "}
                  <span className="font-mono">{kleur}</span>
                  {!selectie && (
                    <span className="text-violet-600">
                      — typ erbij wat deze kleur moet krijgen, of wijs eerst
                      een onderdeel aan voor direct toepassen
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setKleur(null)}
                  aria-label="Kleur verwijderen"
                  className="text-violet-400 hover:text-violet-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {selectie?.kleuren && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-violet-200 pt-2">
                  <span className="text-xs font-semibold text-violet-800">
                    ⚡ Direct toepassen (zonder AI, vervangt deze kleur overal):
                  </span>
                  {selectie.kleuren.achtergrond &&
                    !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/.test(selectie.kleuren.achtergrond) && (
                      <button
                        onClick={() => kleurDirect(selectie.kleuren!.achtergrond!)}
                        disabled={zelfBezig}
                        className="flex items-center gap-1.5 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 rounded-full border border-stone-300"
                          style={{ backgroundColor: selectie.kleuren.achtergrond }}
                        />
                        achtergrondkleur → nieuw
                      </button>
                    )}
                  {selectie.kleuren.tekst && (
                    <button
                      onClick={() => kleurDirect(selectie.kleuren!.tekst!)}
                      disabled={zelfBezig}
                      className="flex items-center gap-1.5 rounded-full border border-violet-400 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-stone-300"
                        style={{ backgroundColor: selectie.kleuren.tekst }}
                      />
                      tekstkleur → nieuw
                    </button>
                  )}
                  {zelfBezig && <span className="text-xs text-violet-600">Bezig...</span>}
                </div>
              )}
            </div>
          )}

          </div>

          {/* Invoerbalk */}
          <div
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) e.preventDefault();
            }}
            onDrop={(e) => {
              const alles = Array.from(e.dataTransfer.files ?? []);
              if (alles.length === 0) return;
              e.preventDefault();
              const video = alles.find((f) => f.type.startsWith("video/"));
              if (video) videoUploaden(video);
              const plaatjes = alles.filter((f) => f.type.startsWith("image/"));
              if (plaatjes.length > 0) {
                voegFotosToe(plaatjes);
                setHintWeg(true);
                setChatOpen(true);
              }
            }}
            className={`${smalleBalk ? "rounded-3xl" : "rounded-full"} border bg-white/95 p-1.5 shadow-2xl backdrop-blur ${
              toonHint
                ? "border-violet-500 ring-4 ring-violet-300/50"
                : "border-stone-200"
            }`}
          >
            {videoKlaar && (
              <div className="mx-2 mt-1 mb-2 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs text-violet-800">
                🎬 <span className="max-w-[12rem] truncate">{videoKlaar.naam}</span>
                <span className="text-violet-500">— klaar, typ waar hij moet komen</span>
                <button
                  onClick={() => setVideoKlaar(null)}
                  aria-label="Video verwijderen"
                  className="ml-auto text-violet-400 hover:text-violet-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
            {afbeeldingen.length > 0 && (
              <div className="mx-2 mt-1 mb-2 flex flex-wrap items-center gap-2">
                {afbeeldingen.map((foto, fi) => (
                  <div
                    key={`${foto.name}-${fi}`}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={URL.createObjectURL(foto)}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <span className="max-w-[7rem] truncate text-xs text-stone-600">{foto.name}</span>
                    <button
                      onClick={() => setAfbeeldingen((v) => v.filter((_, i) => i !== fi))}
                      aria-label={`${foto.name} verwijderen`}
                      className="text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <span className="text-xs text-stone-400">
                  {afbeeldingen.length} foto{afbeeldingen.length > 1 ? "'s" : ""}
                  {afbeeldingen.length >= MAX_FOTOS
                    ? ` — het maximum per bericht. Stuur dit eerst; daarna kun je er zo weer ${MAX_FOTOS} bij doen`
                    : ` — tot ${MAX_FOTOS} per bericht; heb je er meer, dan stuur je ze in porties`}
                </span>
              </div>
            )}
            {documenten.length > 0 && (
              <div className="mx-2 mt-1 mb-2 flex flex-wrap items-center gap-2">
                {documenten.map((doc, di) => (
                  <div
                    key={`${doc.name}-${di}`}
                    className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5"
                  >
                    <span aria-hidden className="text-base">📄</span>
                    <span className="max-w-[10rem] truncate text-xs text-stone-600">{doc.name}</span>
                    <span className="text-xs text-stone-400">{Math.max(1, Math.round(doc.size / 1024))} kB</span>
                    <button
                      onClick={() => setDocumenten((v) => v.filter((_, i) => i !== di))}
                      aria-label={`${doc.name} verwijderen`}
                      className="text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <span className="text-xs text-stone-400">
                  Typ erbij waar het document moet komen — ik maak er een downloadlink van
                </span>
              </div>
            )}
            <div className={`flex items-center gap-x-2 gap-y-1 ${smalleBalk ? "flex-wrap" : "flex-nowrap"}`}>
              {!chatOpen && berichten.length > 0 && (
                <button
                  onClick={() => setChatOpen(true)}
                  aria-label="Gesprek openen"
                  title="Gesprek openen"
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 cursor-pointer"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M21 12a8 8 0 0 1-8 8H4l2.4-2.9A8 8 0 1 1 21 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                    {berichten.length}
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const alles = Array.from(e.target.files ?? []);
                  // Video: apart uploaden en comprimeren (via Rendi), daarna meesturen
                  const video = alles.find((f) => f.type.startsWith("video/"));
                  if (video) videoUploaden(video);
                  // Pdf's gaan als document mee: ze worden een downloadlink op de
                  // site, dus ze horen niet in de fotoverwerking
                  const isPdf = (f: File) =>
                    f.type === "application/pdf" || /\.pdf$/i.test(f.name);
                  const pdfs = alles.filter(isPdf);
                  if (pdfs.length > 0) {
                    const teGroot = pdfs.find((f) => f.size > 10 * 1024 * 1024);
                    if (teGroot) {
                      setChatOpen(true);
                      setBerichten((b) => [
                        ...b,
                        {
                          rol: "assistent",
                          tekst: `"${teGroot.name}" is groter dan 10 MB. Sla de pdf op in een kleiner formaat (in Word of Acrobat: "verkleinde grootte" of "geoptimaliseerd voor web") en stuur hem dan opnieuw — dan blijft je site ook snel voor bezoekers.`,
                        },
                      ]);
                    } else if (isDemo) {
                      setChatOpen(true);
                      setBerichten((b) => [
                        ...b,
                        {
                          rol: "assistent",
                          tekst:
                            "In deze demo kun je geen document meesturen. Bij je eigen website stuur je gewoon een pdf mee — bijvoorbeeld een vacature of je voorwaarden — en zet ik hem op je site met een nette downloadlink.",
                        },
                      ]);
                    } else {
                      setDocumenten((vorige) => [...vorige, ...pdfs].slice(0, 4));
                    }
                  }
                  const bestanden = alles.filter((f) => !f.type.startsWith("video/") && !isPdf(f));
                  // Alleen een pdf gekozen tijdens "vervang deze foto"? Dan is
                  // die flow hier klaar — anders zou de volgende foto er stil in vallen.
                  if (bestanden.length === 0 && pdfs.length > 0) fotoVervangRef.current = false;
                  if (bestanden[0] && fotoVervangRef.current) {
                    // Foto-vervangen-flow: eerste bestand direct verwerken (zonder AI)
                    fotoVervangRef.current = false;
                    fotoDirect(bestanden[0]);
                  } else if (bestanden.length > 0 && isDemo) {
                    // Demo: duidelijk zeggen dat dit hier niet kan, in plaats van stil negeren
                    setChatOpen(true);
                    setBerichten((b) => [
                      ...b,
                      {
                        rol: "assistent",
                        tekst:
                          "In deze demo kun je helaas geen eigen foto's meesturen. Wat wél kan: klik op \"Wijs aan\", kies een foto op de site en vervang die door een andere uit de fotobank. Bij je eigen website stuur je gewoon foto's mee in de chat en zet de AI ze op de juiste plek.",
                      },
                    ]);
                  } else if (bestanden.length > 0) {
                    voegFotosToe(bestanden);
                  }
                  e.target.value = "";
                }}
              />
              <Tip tekst="Klik hierna in het voorbeeld op het onderdeel dat je bedoelt — dan weet ik precies waar je het over hebt">
              <button
                onClick={() => {
                  setHintWeg(true);
                  zetAanwijzen(!aanwijzen);
                }}
                disabled={bezig}
                aria-label="Onderdeel aanwijzen in het voorbeeld"
                className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium disabled:opacity-50 cursor-pointer ${
                  aanwijzen
                    ? "bg-violet-700 text-white"
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M4 4l7.5 16 2-6.5L20 11.5 4 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <span className="hidden sm:inline whitespace-nowrap">Wijs aan</span>
              </button>
              </Tip>
              <div className="relative shrink-0">
                {bijlageMenu && (
                  <>
                    {/* Klik ernaast = menu dicht */}
                    <button
                      onClick={() => setBijlageMenu(false)}
                      aria-label="Menu sluiten"
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <div className="absolute bottom-12 left-0 z-40 w-64 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1 shadow-xl">
                      {(
                        [
                          { soort: "foto", icoon: "🖼️", titel: "Foto’s", uitleg: "meerdere tegelijk kan" },
                          { soort: "video", icoon: "🎬", titel: "Video", uitleg: "wordt automatisch verkleind" },
                          { soort: "pdf", icoon: "📄", titel: "PDF-document", uitleg: "vacature, voorwaarden, brochure" },
                        ] as const
                      ).map((k) => (
                        <button
                          key={k.soort}
                          onClick={() => kiesBijlage(k.soort)}
                          className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-stone-50 cursor-pointer"
                        >
                          <span aria-hidden className="mt-0.5 text-base">{k.icoon}</span>
                          <span>
                            <span className="block text-sm font-semibold text-stone-800">{k.titel}</span>
                            <span className="block text-xs text-stone-500">{k.uitleg}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <Tip tekst="Stuur een foto, video of pdf mee. Een pdf — bijvoorbeeld een vacature of je voorwaarden — zet ik op je site met een nette downloadlink.">
                <button
                  onClick={() => setBijlageMenu((v) => !v)}
                  disabled={bezig}
                  aria-label="Bestand toevoegen: foto, video of pdf"
                  aria-expanded={bijlageMenu}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50 cursor-pointer ${
                    bijlageMenu ? "bg-stone-100 text-stone-800" : "text-stone-500 hover:bg-stone-100"
                  }`}
                >
                  {/* Paperclip: deze knop is niet meer alleen voor foto's — er
                      kunnen ook video's en pdf's mee */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                </Tip>
              </div>
              {!meerOpties && (
                <Tip tekst="Meer gereedschap: inspreken, kleur kiezen, fotobank en SEO">
                <button
                  onClick={() => setMeerOpties(true)}
                  aria-label="Meer opties"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="5" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="19" cy="12" r="1.8" fill="currentColor" />
                  </svg>
                </button>
                </Tip>
              )}
              {meerOpties && (<>
              {spraakKan && (
                <Tip tekst={luistert ? "Klik om te stoppen met luisteren" : "Spreek je wijziging in"}>
                <button
                  onClick={wisselSpraak}
                  disabled={bezig}
                  aria-label={luistert ? "Stop met inspreken" : "Spreek je wijziging in"}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50 cursor-pointer ${
                    luistert ? "bg-red-600 text-white animate-pulse" : "text-stone-500 hover:bg-stone-100"
                  }`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                </Tip>
              )}
              <Tip tekst="Kies een kleur — handig voor 'maak de knoppen deze kleur'">
              <button
                onClick={() => kleurInputRef.current?.click()}
                disabled={bezig}
                aria-label="Kleur kiezen"
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h5a4 4 0 0 0 4-4c0-4-4.5-7-9-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="7.5" cy="11" r="1.3" fill="currentColor" />
                  <circle cx="10.5" cy="7.5" r="1.3" fill="currentColor" />
                  <circle cx="15" cy="7.5" r="1.3" fill="currentColor" />
                </svg>
                <input
                  ref={kleurInputRef}
                  type="color"
                  defaultValue="#7c3aed"
                  onChange={(e) => setKleur(e.target.value)}
                  className="absolute h-0 w-0 opacity-0"
                  tabIndex={-1}
                />
              </button>
              </Tip>
              <Tip tekst="Fotobank: alle foto's die ooit op je site stonden — oude versies terugzetten">
              <button
                onClick={() => {
                  setFotobankDoel(null);
                  setFotobankOpen((v) => !v);
                }}
                disabled={bezig}
                aria-label="Fotobank"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-50 cursor-pointer ${
                  fotobankOpen ? "bg-violet-700 text-white" : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="10" r="1.6" fill="currentColor" />
                  <path d="M5 17l4.5-4.5 3 3L17 11l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              </Tip>
              <Tip tekst="Titel, Google-omschrijving en webadres van deze pagina zelf regelen">
              <button
                onClick={() => setSeoOpen((v) => !v)}
                disabled={bezig}
                aria-label="Vindbaarheid van deze pagina"
                className={`flex h-10 shrink-0 items-center justify-center rounded-full px-3 disabled:opacity-50 cursor-pointer ${
                  seoOpen ? "bg-violet-700 text-white" : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                <span className="text-xs font-bold tracking-tight">SEO</span>
              </button>
              </Tip>
              </>)}
              <textarea
                ref={invoerRef}
                aria-label="Beschrijf wat je op je website wilt aanpassen"
                value={invoer}
                rows={1}
                onPaste={(e) => {
                  // Schermafdruk plakken (Cmd/Ctrl+V) = meteen als foto bijvoegen
                  const items = Array.from(e.clipboardData?.items ?? []);
                  const plaatjes = items
                    .filter((it) => it.type.startsWith("image/"))
                    .map((it) => it.getAsFile())
                    .filter((f): f is File => Boolean(f));
                  if (plaatjes.length > 0) {
                    e.preventDefault();
                    voegFotosToe(plaatjes);
                    setHintWeg(true);
                  }
                }}
                onChange={(e) => {
                  setInvoer(e.target.value);
                  if (e.target.value) setHintWeg(true);
                }}
                onFocus={() => {
                  setHintWeg(true);
                  voorverwarm();
                  if (berichten.length > 0) setChatOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    verstuur();
                    if (invoerRef.current) invoerRef.current.style.height = "auto";
                  }
                }}
                placeholder={
                  bezig
                    ? "De AI is bezig — typ alvast je volgende opdracht (Enter = klaarzetten)"
                    : `Wat wil je aanpassen${huidigePagina !== "/" ? ` op ${paginaLabel(huidigePagina)}` : ""}?`
                }
                className={`${smalleBalk ? "order-first basis-full px-3" : "px-2"} flex-1 min-w-0 resize-none bg-transparent py-2 text-base sm:text-sm focus:outline-none leading-snug max-h-[120px]`}
              />
              <button
                onClick={bezig ? stop : verstuur}
                disabled={nieuwBezig || conceptActie !== null}
                aria-label={bezig ? "Stop de wijziging" : "Verstuur"}
                title={bezig ? "Stop de lopende opdracht" : "Verstuur je wijzigingsverzoek"}
                className={`${smalleBalk ? "ml-auto" : ""} shrink-0 rounded-full h-10 w-10 flex items-center justify-center text-white cursor-pointer ${
                  bezig ? "bg-red-600 hover:bg-red-500" : "bg-violet-700 hover:bg-violet-600"
                }`}
              >
                {bezig ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <Tip tekst="Voorbeeld verversen — als je een wijziging nog niet ziet">
              <button
                onClick={() => herlaad(Boolean(concept))}
                aria-label="Voorbeeld verversen"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              </Tip>
            </div>
          </div>

          {/* Suggesties onder de invoerbalk */}
          {suggesties && suggesties.length > 0 && !bezig && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
              {!suggestiesOpen ? (
                <button
                  onClick={() => {
                    setHintWeg(true);
                    setSuggestiesOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white/95 px-4 py-1.5 text-sm font-medium text-stone-600 shadow-lg backdrop-blur hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1 2V17h-5v-1.1c0-.8-.4-1.5-1-2A6 6 0 0 1 12 3zM10 20h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Suggesties — geen idee wat je kunt vragen?
                </button>
              ) : (
                <>
                  {suggesties.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInvoer(s);
                        invoerRef.current?.focus();
                        setSuggestiesOpen(false);
                      }}
                      className="rounded-full border border-violet-300 bg-white/95 px-4 py-1.5 text-sm font-medium text-violet-800 shadow-lg backdrop-blur hover:bg-violet-50 cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                  <button
                    onClick={() => setSuggestiesOpen(false)}
                    aria-label="Suggesties sluiten"
                    className="rounded-full border border-stone-300 bg-white/95 px-3 py-1.5 text-sm text-stone-500 shadow-lg backdrop-blur hover:text-stone-800 cursor-pointer"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
