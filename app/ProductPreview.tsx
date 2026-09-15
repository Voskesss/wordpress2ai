"use client";
import { useEffect, useRef, useState } from "react";
import { trackMarketing } from "./MarketingEvents";
const examples = [
  {
    label: "Openingstijden",
    question:
      "We zijn voortaan ook op zaterdag open, van 9 tot 16 uur. Pas je dat aan?",
    title: "Een tuin om van te genieten.",
    before: "Ma–vr 09:00–18:00 · Za gesloten",
    detail: "Ma–vr 09:00–18:00 · Za 09:00–16:00",
    answer:
      "Zeker! Zaterdag staat erbij. Kijk even of het zo klopt — daarna zet je het live.",
  },
  {
    label: "Nieuwe dienst",
    question: "Voeg tuinonderhoud toe aan onze diensten.",
    title: "Een tuin om van te genieten.",
    before: "Tuinontwerp · Aanleg",
    detail: "Tuinontwerp · Aanleg · Tuinonderhoud",
    answer:
      "Staat erbij! Tuinonderhoud heeft nu een plek bij je diensten. Kijk maar even.",
  },
  {
    label: "Contactgegevens",
    question:
      "Ons nieuwe e-mailadres is hallo@buitenvoorbeeld.nl. Wil je dat vervangen?",
    title: "Een mooi plan begint hier.",
    before: "info@buitenvoorbeeld.nl",
    detail: "hallo@buitenvoorbeeld.nl",
    answer: "Gedaan! Je nieuwe e-mailadres staat klaar. Klopt het zo?",
  },
];
export default function ProductPreview() {
  const [selected, setSelected] = useState(0);
  const [stage, setStage] = useState<"before" | "preview" | "published">(
    "before",
  );
  // Speelt één keer vanzelf af zodra het voorbeeld in beeld komt; elke
  // interactie van de bezoeker neemt het meteen over.
  const [autoplay, setAutoplay] = useState(true);
  const [typedChars, setTypedChars] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const published = stage === "published";
  const example = examples[selected];
  useEffect(() => {
    if (!autoplay) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setAutoplay(false);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const vraag = [...examples[0].question];
        timers.push(setTimeout(() => setTypedChars(0), 700));
        vraag.forEach((_, i) =>
          timers.push(setTimeout(() => setTypedChars(i + 1), 700 + 45 * i)),
        );
        timers.push(
          setTimeout(
            () => {
              setTypedChars(null);
              setStage("preview");
            },
            700 + 45 * vraag.length + 900,
          ),
        );
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [autoplay]);
  const stopAutoplay = () => {
    setAutoplay(false);
    setTypedChars(null);
  };
  return (
    <div className="product-demo" ref={wrapRef}>
      <div className="demo-top">
        <span className="demo-dots" aria-hidden="true">
          ● ● ●
        </span>
        <span>Je eigen website · Zonder WordPress</span>
        <span className="demo-status">Interactief voorbeeld</span>
      </div>
      <div className="demo-site">
        <div className="demo-site-nav">
          <strong>
            buiten<span>↗</span>
          </strong>
          <span>Tuinen met aandacht</span>
        </div>
        <div className="demo-site-content">
          <span className="eyebrow">RUIMTE VOOR GROEN</span>
          <p className="demo-site-kop">{example.title}</p>
          <p className={stage === "before" ? "" : "demo-change-highlight"}>
            {stage === "before" ? example.before : example.detail}
          </p>
          <div className="garden-art" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <span className="preview-tag">
          {published
            ? "Gepubliceerd in dit voorbeeld"
            : stage === "before"
              ? "Vóór de wijziging"
              : "Concept · Nog niet live"}
        </span>
      </div>
      <div className="demo-chat">
        <div className="demo-chat-heading">
          <span className="ai-spark">✳</span>
          <strong>Even je website aanpassen</strong>
          <span>Interactief voorbeeld</span>
        </div>
        <div className="demo-tabs" aria-label="Kies een voorbeeld">
          {examples.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={index === selected}
              onClick={() => {
                stopAutoplay();
                setSelected(index);
                setStage("before");
                trackMarketing("example_select", { example: item.label });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="chat-question">
          {typedChars !== null
            ? [...example.question].slice(0, typedChars).join("")
            : example.question}
          {typedChars !== null && <span className="demo-caret">▍</span>}
        </p>
        <p className="chat-answer" aria-live="polite">
          <span aria-hidden="true">✳</span>
          {stage === "before"
            ? "Je vraag staat klaar. Klik op ‘Laat de wijziging zien’ en bekijk wat er verandert."
            : example.answer}
        </p>
        <div className="demo-publish">
          <span role="status">
            {published
              ? "✓ Voorbeeld gepubliceerd"
              : stage === "before"
                ? "1. Vraag → 2. Bekijk → 3. Keur goed"
                : "Eerst controleren. Jij beslist."}
          </span>
          <button
            type="button"
            disabled={published}
            onClick={() => {
              stopAutoplay();
              setStage(stage === "before" ? "preview" : "published");
              trackMarketing(
                stage === "before" ? "example_preview" : "example_approve",
                { example: example.label },
              );
            }}
          >
            {published
              ? "Goedgekeurd ✓"
              : stage === "before"
                ? "Laat de wijziging zien →"
                : "Keur voorbeeld goed ↗"}
          </button>
        </div>
      </div>
      <p className="demo-caption">
        Oefenvoorbeeld. Geen echte AI of publicatie.{" "}
        <a href="/demo#echte-demo">Zelf de echte demo proberen →</a>
      </p>
    </div>
  );
}
