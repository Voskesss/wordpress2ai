"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Fotobank from "./Fotobank";
import Vindbaarheid from "./Vindbaarheid";

type Bericht = {
  rol: "klant" | "assistent";
  tekst: string;
  metVerversTip?: boolean;
};

type Concept = {
  changeId: number;
  previewUrl: string | null;
  prompt: string;
  paginas: string[];
};

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
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[15rem] -translate-x-1/2 rounded-xl bg-stone-900 px-3 py-2 text-center text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        {tekst}
      </span>
    </span>
  );
}

export default function Chat({
  siteId,
  historie,
  liveUrl,
  werkversieUrl,
  openConcept,
  suggesties,
}: {
  siteId: number;
  historie: Bericht[];
  liveUrl?: string | null;
  werkversieUrl?: string | null;
  openConcept?: Concept;
  suggesties?: string[];
}) {
  const [berichten, setBerichten] = useState<Bericht[]>(historie);
  const [invoer, setInvoer] = useState("");
  const [bezig, setBezig] = useState(false);
  const [statusTekst, setStatusTekst] = useState<string | null>(null);
  const [afbeeldingen, setAfbeeldingen] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [huidigePagina, setHuidigePagina] = useState("/");
  const huidigeRef = useRef("/");
  const [concept, setConcept] = useState<Concept | null>(openConcept ?? null);
  const [chatOpen, setChatOpen] = useState(false);
  // Aandachttrekker voor nieuwe gebruikers; verdwijnt zodra er getypt wordt.
  const [hintWeg, setHintWeg] = useState(false);
  const toonHint = !hintWeg && berichten.length === 0 && !bezig && !chatOpen;
  const [reloadTeller, setReloadTeller] = useState(0);
  const [conceptActie, setConceptActie] = useState<string | null>(null);
  const [apparaat, setApparaat] = useState<"telefoon" | "tablet" | "desktop">(
    "desktop"
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const invoerRef = useRef<HTMLTextAreaElement>(null);
  // Deploy-stempel van de pagina in het voorbeeld; gebruikt om na een wijziging
  // automatisch te blijven verversen tot Cloudflare de nieuwe versie echt toont
  const stempelRef = useRef<number>(0);
  const wachtOpVerseRef = useRef<{ oudeStempel: number; pogingen: number } | null>(null);
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
  // Schermvullende weergave (handig in de admin en op kleinere schermen)
  const [volledigScherm, setVolledigScherm] = useState(false);
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

  /** Herlaadt de werkversie en springt naar de opgegeven pagina. */
  function gaNaar(pad: string) {
    if (isMobiel) setMobielWeergave("site");
    const p = pad === "index.html" ? "" : pad;
    huidigeRef.current = "/" + p;
    setHuidigePagina("/" + p);
    setIframeSrc(basisVoor(true) + p);
    setReloadTeller((t) => t + 1);
    setOplevering(null);
  }

  function stop() {
    stopRef.current?.abort();
  }

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
    return conceptActief && werkversieUrl
      ? `https://${werkversieUrl}/`
      : liveUrl
        ? `https://${liveUrl}/`
        : `/site-weergave/${siteId}/`;
  }
  const [iframeSrc, setIframeSrc] = useState(() => basisVoor(Boolean(openConcept)));

  /** Herlaadt het voorbeeld op de pagina waar de eigenaar nu naar kijkt. */
  function herlaad(conceptActief: boolean) {
    const pad =
      huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
    setIframeSrc(basisVoor(conceptActief) + pad);
    setReloadTeller((t) => t + 1);
  }

  /** Na een wijziging: de verse versie METEEN laten zien via de directe
   * weergave (rechtstreeks uit de bron, dus altijd actueel), en op de
   * achtergrond stil terugwisselen naar de snelle Cloudflare-versie zodra
   * die is bijgetrokken (dat duurt 15-30 seconden). */
  function wachtOpVerseVersie(conceptActief = true) {
    const pad = huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
    if (!werkversieUrl || !conceptActief) {
      // Geen snelle werkversie om naar te wisselen: gewoon één keer herladen
      herlaad(conceptActief);
      return;
    }
    const oudeStempel = stempelRef.current;
    // 1. Direct de verse inhoud tonen
    setIframeSrc(`/site-weergave/${siteId}/${pad}`);
    setReloadTeller((t) => t + 1);
    setLaderTekst(null);
    // 2. Achter de schermen wachten tot Cloudflare vers is, dan stil wisselen
    wachtOpVerseRef.current = { oudeStempel, pogingen: 0 };
    const controleer = async () => {
      const wacht = wachtOpVerseRef.current;
      if (!wacht) return;
      wacht.pogingen += 1;
      let vers = false;
      try {
        const res = await fetch(
          `/api/stempel?host=${encodeURIComponent(werkversieUrl)}&pad=${encodeURIComponent("/" + pad)}`
        );
        const data = (await res.json()) as { stempel?: number };
        vers = Boolean(data.stempel && data.stempel !== wacht.oudeStempel);
      } catch {
        // volgende poging
      }
      if (vers || wacht.pogingen >= 15) {
        wachtOpVerseRef.current = null;
        // Alleen wisselen als de kijker niet inmiddels ergens anders zit
        const huidigPad = huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
        setIframeSrc(`https://${werkversieUrl}/${huidigPad}`);
        setReloadTeller((t) => t + 1);
        return;
      }
      setTimeout(controleer, 4000);
    };
    setTimeout(controleer, 5000);
  }

  /** Direct de verse inhoud tonen (rechtstreeks uit de bron) en op de
   * achtergrond stil doorwisselen naar het snelle adres zodra dat is
   * bijgetrokken. Voor werkversies polsen we de deploy-stempel; voor
   * klantdomeinen wisselen we na een ruime vaste wachttijd. */
  function toonVersEnWisselStil(doelHost: string | null | undefined) {
    const pad = huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
    setIframeSrc(`/site-weergave/${siteId}/${pad}`);
    setReloadTeller((t) => t + 1);
    setLaderTekst(null);
    if (!doelHost) return;
    const oudeStempel = stempelRef.current;
    const isWorker = /\.workers\.dev$/.test(doelHost);
    let pogingen = 0;
    const wissel = () => {
      const huidigPad = huidigeRef.current === "/" ? "" : huidigeRef.current.replace(/^\//, "");
      setIframeSrc(`https://${doelHost}/${huidigPad}`);
      setReloadTeller((t) => t + 1);
    };
    const controleer = async () => {
      pogingen += 1;
      let vers = false;
      if (isWorker) {
        try {
          const res = await fetch(
            `/api/stempel?host=${encodeURIComponent(doelHost)}&pad=${encodeURIComponent("/" + pad)}`
          );
          const data = (await res.json()) as { stempel?: number };
          vers = Boolean(data.stempel && data.stempel !== oudeStempel);
        } catch {
          // volgende poging
        }
      }
      if (vers || pogingen >= (isWorker ? 15 : 9)) {
        wissel();
        return;
      }
      setTimeout(controleer, 4000);
    };
    setTimeout(controleer, isWorker ? 5000 : 8000);
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

  // De site alvast ophalen zodra het portaal opent: de eerste chatvraag
  // hoeft dan niet meer op de download te wachten.
  useEffect(() => {
    fetch("/api/voorverwarm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    }).catch(() => {});
  }, [siteId]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "wp2ai-pagina" && typeof e.data.pad === "string") {
        const pad = e.data.pad.replace(/^\/preview\/\d+/, "") || "/";
        setHuidigePagina(pad);
        huidigeRef.current = pad;
      }
      if (e.data?.type === "wp2ai-stempel" && typeof e.data.stempel === "number") {
        stempelRef.current = e.data.stempel;
        // Verse versie binnen? Dan is het wachten meteen voorbij.
        if (wachtOpVerseRef.current && e.data.stempel !== wachtOpVerseRef.current.oudeStempel) {
          wachtOpVerseRef.current = null;
          setLaderTekst(null);
        }
      }
      if (e.data?.type === "wp2ai-aanwijs-focus") {
        setAanwijsKandidaat({ tag: String(e.data.tag ?? ""), tekst: String(e.data.tekst ?? "") });
      }
      if (e.data?.type === "wp2ai-selectie") {
        setAanwijsKandidaat(null);
        setSelectie({
          pad: String(e.data.pad ?? "/"),
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

  async function verstuur(overrideTekst?: unknown, overrideAfbeelding?: File) {
    const tekst = (typeof overrideTekst === "string" ? overrideTekst : invoer).trim();
    if (!tekst || bezig) return;
    setInvoer("");
    setChatOpen(true);
    const teVersturen = overrideAfbeelding ? [overrideAfbeelding] : afbeeldingen;
    setAfbeeldingen([]);
    const gekozen = selectie;
    setSelectie(null);
    const gekozenKleur = kleur;
    setKleur(null);
    setBerichten((b) => [
      ...b,
      { rol: "klant", tekst: teVersturen.length > 0 ? `\u{1F4CE} ${tekst}` : tekst },
    ]);
    setBezig(true);
    setStatusTekst(teVersturen.length > 0 ? `Ik verwerk je foto${teVersturen.length > 1 ? "\u2019s" : ""}...` : null);
    const stopper = new AbortController();
    stopRef.current = stopper;
    try {
      let res: Response;
      if (teVersturen.length > 0) {
        const form = new FormData();
        form.set("siteId", String(siteId));
        form.set("bericht", tekst);
        form.set("huidigePagina", huidigePagina);
        for (const f of teVersturen) form.append("afbeelding", f);
        if (gekozen) form.set("selectie", JSON.stringify(gekozen));
        if (gekozenKleur) form.set("kleur", gekozenKleur);
        res = await fetch("/api/chat", { method: "POST", body: form, signal: stopper.signal });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: stopper.signal,
          body: JSON.stringify({
            siteId,
            bericht: tekst,
            huidigePagina,
            selectie: gekozen ?? undefined,
            kleur: gekozenKleur ?? undefined,
          }),
        });
      }
      if (!res.body) throw new Error("geen stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let klaar: {
        reply?: string;
        previewUrl?: string | null;
        changeId?: number | null;
        bestanden?: string[];
        prompt?: string;
      } | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const regels = buffer.split("\n");
        buffer = regels.pop() ?? "";
        for (const regel of regels) {
          if (!regel.trim()) continue;
          try {
            const event = JSON.parse(regel);
            if (event.type === "status") setStatusTekst(event.tekst);
            if (event.type === "tekst-live" && typeof event.zoek === "string") {
              iframeRef.current?.contentWindow?.postMessage(
                { type: "wp2ai-tekst-live", zoek: event.zoek, vervang: event.vervang },
                "*"
              );
            }
            if (event.type === "bewerkt" && typeof event.pad === "string") {
              // Voorbeeld live meebewegen naar de pagina die bewerkt wordt
              if (huidigeRef.current !== event.pad) {
                huidigeRef.current = event.pad;
                setHuidigePagina(event.pad);
                herlaad(true);
              }
            }
            if (event.type === "klaar") klaar = event;
            if (!event.type && typeof event.error === "string") klaar = { reply: event.error };
          } catch {
            // halve regel
          }
        }
      }
      const data = klaar ?? {};
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: data.reply ?? "Er ging iets mis, probeer het opnieuw.",
          metVerversTip: Boolean(data.previewUrl && data.changeId),
        },
      ]);
      if (data.previewUrl && data.changeId) {
        setConcept({
          changeId: data.changeId,
          previewUrl: data.previewUrl,
          prompt: data.prompt ?? "",
          paginas: data.bestanden ?? [],
        });
        herlaad(true);
        wachtOpVerseVersie();
        setOngedaanKans(null);
        const paginas = (data.bestanden ?? []).filter((b) => /\.html?$/i.test(b));
        setOplevering({ paden: paginas.length > 0 ? paginas : ["index.html"] });
        // Gesprek inklappen zodat de "wijziging staat klaar"-kaart vrij zicht heeft
        setChatOpen(false);
      }
    } catch {
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst: stopper.signal.aborted
            ? "Gestopt — er is niets gewijzigd. Geef gerust een nieuwe opdracht."
            : "Er ging iets mis, probeer het opnieuw.",
        },
      ]);
    } finally {
      stopRef.current = null;
      setBezig(false);
      setStatusTekst(null);
    }
  }

  async function zelfToepassen() {
    if (!selectie || zelfTekst === null || zelfBezig) return;
    const oud = (selectie.tekst ?? "").trim();
    const nieuw = zelfTekst.trim();
    if (!oud || !nieuw || oud === nieuw) return;
    setZelfBezig(true);
    setLaderTekst("Even geduld — je tekst wordt aangepast...");
    try {
      const res = await fetch("/api/tekst-wijzig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, oud, nieuw }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        fallback?: boolean;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        error?: string;
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
        wachtOpVerseVersie();
        setOngedaanKans(null);
        const paginas = (data.bestanden ?? []).filter((p) => /\.html?$/i.test(p));
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
          { rol: "assistent", tekst: data.error ?? "Er ging iets mis, probeer het opnieuw." },
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
    setLaderTekst("Achtergrond weghalen — dit gebeurt in je eigen browser en duurt ±15 seconden...");
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const bron = await fetch(`/site-weergave/${siteId}/${pad}`).then((r) => r.blob());
      const uit = await removeBackground(bron);
      const bestand = new File([uit], pad.split("/").pop()?.replace(/\.[^.]+$/, ".png") ?? "foto.png", {
        type: "image/png",
      });
      setLaderTekst(null);
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
    setLaderTekst("Even geduld — je nieuwe foto wordt geplaatst...");
    setChatOpen(true);
    setBerichten((b) => [...b, { rol: "klant", tekst: "📷 Foto vervangen (zelf gekozen bestand)" }]);
    try {
      const form = new FormData();
      form.set("siteId", String(siteId));
      form.set("pad", src);
      form.set("afbeelding", bestand);
      const res = await fetch("/api/foto-wijzig", { method: "POST", body: form });
      const data = (await res.json()) as {
        ok?: boolean;
        fallback?: boolean;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        error?: string;
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
        wachtOpVerseVersie();
        setOngedaanKans(null);
        setOplevering({ paden: [huidigeRef.current === "/" ? "index.html" : huidigeRef.current] });
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
          { rol: "assistent", tekst: data.error ?? "Er ging iets mis, probeer het opnieuw." },
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
    setLaderTekst("Even geduld — de kleur wordt overal doorgevoerd...");
    try {
      const res = await fetch("/api/tekst-wijzig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, oud: oudeKleur, nieuw: kleur, kleur: true }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        fallback?: boolean;
        reply?: string;
        previewUrl?: string;
        changeId?: number;
        bestanden?: string[];
        error?: string;
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
        wachtOpVerseVersie();
        setOngedaanKans(null);
        const paginas = (data.bestanden ?? []).filter((p) => /\.html?$/i.test(p));
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
          { rol: "assistent", tekst: data.error ?? "Er ging iets mis, probeer het opnieuw." },
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
      const data = (await res.json().catch(() => ({}))) as { melding?: string };
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
        herlaad(false);
        wachtOpVerseVersie(false);
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
        herlaad(true);
        wachtOpVerseVersie();
      }
    } finally {
      setStapTerugBezig(false);
    }
  }

  async function conceptVerwerken(actie: "publiceer" | "verwerp") {
    if (!concept || conceptActie) return;
    setConceptActie(actie);
    const res = await fetch(`/api/${actie}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeId: concept.changeId }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { melding?: string };
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
      if (data.melding) {
        // Concept bestaat niet meer (bv. demo-reset): opruimen en terug naar live
        setConcept(null);
        herlaad(false);
      }
      setConceptActie(null);
      return;
    }
    if (res.ok) {
      setBerichten((b) => [
        ...b,
        {
          rol: "assistent",
          tekst:
            actie === "publiceer"
              ? "Gepubliceerd! Je ziet het hier meteen; op je echte adres duurt het nog een minuutje voordat iedereen de nieuwe versie krijgt."
              : "Het concept is verwijderd. Je website blijft zoals hij was.",
        },
      ]);
      setChatOpen(true);
      if (actie === "publiceer" && concept) setOngedaanKans(concept.changeId);
      setConcept(null);
      if (actie === "publiceer") {
        // Meteen de gepubliceerde versie laten zien; stil doorwisselen naar
        // het echte adres zodra dat is bijgetrokken (voorkomt "oude site"-schrik)
        toonVersEnWisselStil(liveUrl);
      } else {
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
            <Tip tekst={volledigScherm ? "Terug naar normale weergave" : "Voorbeeld schermvullend maken"}>
              <button
                onClick={() => setVolledigScherm(!volledigScherm)}
                aria-label={volledigScherm ? "Volledig scherm sluiten" : "Volledig scherm"}
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-500 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  {volledigScherm ? (
                    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  ) : (
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                </svg>
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
          <div className="pointer-events-none absolute left-1/2 top-4 z-[25] -translate-x-1/2">
            <div className="flex items-center gap-2.5 rounded-full bg-stone-900/85 px-5 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
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
                Tevreden? Publiceer hem daarna met de knop onderin.
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
          {mobielChat && concept && (
            <button
              onClick={() => setMobielWeergave("site")}
              className="mb-2 w-full rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 cursor-pointer"
            >
              👀 Bekijk de wijziging op je site →
            </button>
          )}
          <div className={splitModus || isMobiel ? "contents" : "absolute bottom-full left-0 right-0"}>
          {/* Gespreksvenster (inklapbaar; in splitmodus altijd open en vullend) */}
          {(chatOpen || splitModus || mobielChat) && (
            <div className={`mb-3 rounded-3xl border border-stone-200 bg-white/95 shadow-2xl backdrop-blur ${splitModus || mobielChat ? "flex min-h-0 flex-1 flex-col" : ""}`}>
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Gesprek
                </span>
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
                      <li><span className="font-semibold text-stone-700">↩︎ Fout gegaan?</span> Elke stap is terug te draaien, ook na publiceren.</li>
                    </ul>
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
                      className={`w-fit max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                        m.rol === "klant"
                          ? "ml-auto bg-violet-600 text-white rounded-br-sm"
                          : "bg-stone-100 text-stone-800 rounded-bl-sm"
                      }`}
                    >
                      {schoon}
                    </div>
                    {i === berichten.length - 1 &&
                      m.rol === "assistent" &&
                      keuzes.length > 0 &&
                      !bezig && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {keuzes.map((keuze, ki) => (
                            <button
                              key={keuze}
                              onClick={() => verstuur(keuze)}
                              className={`rounded-full px-4 py-2 text-sm font-semibold cursor-pointer ${
                                ki === 0
                                  ? "bg-violet-700 text-white shadow-md shadow-violet-200 hover:bg-violet-600"
                                  : "border border-violet-300 bg-white text-violet-700 hover:bg-violet-50"
                              }`}
                            >
                              {ki === 0 ? `✨ ${keuze}` : keuze}
                            </button>
                          ))}
                        </div>
                      )}
                    {i === berichten.length - 1 &&
                      m.rol === "assistent" &&
                      (m.metVerversTip || concept != null) && (
                      <button
                        onClick={() => herlaad(Boolean(concept))}
                        className="mt-1.5 flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-violet-400 hover:text-violet-700 cursor-pointer"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Zie je de wijziging niet? Ververs het voorbeeld
                      </button>
                    )}
                  </div>
                  );
                })}
                {bezig && (
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
                  </div>
                )}
              </div>
            </div>
          )}

          {fotobankOpen && (
            <Fotobank
              siteId={siteId}
              beeldBasis={werkversieUrl ?? liveUrl}
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
                  wachtOpVerseVersie();
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
                  wachtOpVerseVersie();
                  setOngedaanKans(null);
                }
              }}
            />
          )}

          {/* Concept-strip */}
          {concept && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <p className="min-w-0 flex-1 text-sm text-amber-950">
                <span className="font-semibold">Concept klaar.</span>{" "}
                {concept.paginas.length > 0 && (
                  <span className="text-amber-800 hidden sm:inline">
                    Aangepast:{" "}
                    {concept.paginas.map((pad, i) => (
                      <span key={pad + i}>
                        {i > 0 && ", "}
                        {/\.html?$/i.test(pad) ? (
                          <button
                            onClick={() => gaNaar(pad)}
                            className="font-semibold underline decoration-amber-400 hover:text-amber-950 cursor-pointer"
                          >
                            {paginaLabel(pad)}
                          </button>
                        ) : (
                          paginaLabel(pad)
                        )}
                      </span>
                    ))}
                    .
                  </span>
                )}{" "}
                Tevreden?
              </p>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => conceptVerwerken("publiceer")}
                  disabled={conceptActie !== null}
                  className="rounded-full bg-violet-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
                >
                  {conceptActie === "publiceer" ? "Bezig..." : "Publiceer"}
                </button>
                {isMobiel ? (
                  <button
                    onClick={() => setMobielWeergave("site")}
                    className="flex items-center gap-1 rounded-full border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 cursor-pointer"
                  >
                    👀 Bekijk
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
                      Bekijk
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
                  disabled={conceptActie !== null}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  {conceptActie === "verwerp" ? "Bezig..." : "Verwijder"}
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
                  Hier praat je met je website
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

          {/* Aangewezen onderdeel */}
          {selectie && (
            <div className="mb-3 rounded-2xl border border-violet-300 bg-violet-50/95 px-4 py-2.5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 truncate text-sm text-violet-900">
                  <span className="font-semibold">Aangewezen:</span>{" "}
                  {selectie.tag === "img"
                    ? `foto: ${selectie.tekst || "zonder omschrijving"}`
                    : selectie.tekst || `een ${selectie.tag}-onderdeel`}{" "}
                  <span className="text-violet-600">
                    ({paginaLabel(selectie.pad === "/" ? "index.html" : selectie.pad)})
                  </span>
                </p>
                {selectie.tag === "img" && (
                  <button
                    onClick={() => {
                      fotoVervangRef.current = true;
                      fileInputRef.current?.click();
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
            className={`${smalleBalk ? "rounded-3xl" : "rounded-full"} border bg-white/95 p-1.5 shadow-2xl backdrop-blur ${
              toonHint
                ? "border-violet-500 ring-4 ring-violet-300/50"
                : "border-stone-200"
            }`}
          >
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
                  {afbeeldingen.length} foto{afbeeldingen.length > 1 ? "'s" : ""} — je kunt er meer toevoegen
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
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const alles = Array.from(e.target.files ?? []);
                  // Videobestanden zijn te groot voor een website — vriendelijk uitleggen
                  if (alles.some((f) => f.type.startsWith("video/"))) {
                    setStatusTekst(
                      "Video's kunnen niet als bestand op de site (te groot). Zet je video op YouTube of Vimeo en plak de link hier in de chat — dan zet ik hem netjes op de pagina."
                    );
                    setTimeout(() => setStatusTekst(null), 9000);
                  }
                  const bestanden = alles.filter((f) => !f.type.startsWith("video/"));
                  if (bestanden[0] && fotoVervangRef.current) {
                    // Foto-vervangen-flow: eerste bestand direct verwerken (zonder AI)
                    fotoVervangRef.current = false;
                    fotoDirect(bestanden[0]);
                  } else if (bestanden.length > 0) {
                    setAfbeeldingen((vorige) => [...vorige, ...bestanden].slice(0, 12));
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
              <Tip tekst="Stuur eigen foto's mee om op de site te zetten (meerdere tegelijk kan — bijv. voor een portfolio)">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={bezig}
                aria-label="Afbeelding toevoegen"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="10" r="1.8" fill="currentColor" />
                  <path d="M5 17l4.5-4 3.5 3 2.5-2L19 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              </Tip>
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
              <textarea
                ref={invoerRef}
                value={invoer}
                rows={1}
                onChange={(e) => {
                  setInvoer(e.target.value);
                  if (e.target.value) setHintWeg(true);
                }}
                onFocus={() => {
                  setHintWeg(true);
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
                    ? (statusTekst ?? "Momentje...")
                    : `Wat wil je aanpassen${huidigePagina !== "/" ? ` op ${paginaLabel(huidigePagina)}` : ""}?`
                }
                className={`${smalleBalk ? "order-first basis-full px-3" : "px-2"} flex-1 min-w-0 resize-none bg-transparent py-2 text-base sm:text-sm focus:outline-none leading-snug max-h-[120px]`}
                disabled={bezig}
              />
              <button
                onClick={bezig ? stop : verstuur}
                aria-label={bezig ? "Stop de wijziging" : "Verstuur"}
                title={bezig ? "Stop — er wordt dan niets gewijzigd" : "Verstuur"}
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
