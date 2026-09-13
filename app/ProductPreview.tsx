"use client";
import { useState } from "react";
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
  const published = stage === "published";
  const example = examples[selected];
  return (
    <div className="product-demo">
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
          <h3>{example.title}</h3>
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
                setSelected(index);
                setStage("before");
                trackMarketing("example_select", { example: item.label });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="chat-question">{example.question}</p>
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
