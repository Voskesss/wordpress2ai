"use client";
import { useState } from "react";
const examples = [
  {
    label: "Openingstijden",
    question:
      "We zijn voortaan ook op zaterdag open, van 9 tot 16 uur. Pas je dat aan?",
    title: "Ook op zaterdag welkom.",
    detail: "Ma–vr 09:00–18:00 · Za 09:00–16:00",
    answer:
      "Zeker! Zaterdag staat erbij. Kijk even of het zo klopt — daarna zet je het live.",
  },
  {
    label: "Nieuwe dienst",
    question: "Voeg tuinonderhoud toe aan onze diensten.",
    title: "Een tuin om van te genieten.",
    detail: "Tuinontwerp · Aanleg · Tuinonderhoud",
    answer:
      "Staat erbij! Tuinonderhoud heeft nu een plek bij je diensten. Kijk maar even.",
  },
  {
    label: "Contactgegevens",
    question:
      "Ons nieuwe e-mailadres is hallo@buitenvoorbeeld.nl. Wil je dat vervangen?",
    title: "Een mooi plan begint hier.",
    detail: "hallo@buitenvoorbeeld.nl",
    answer: "Gedaan! Je nieuwe e-mailadres staat klaar. Klopt het zo?",
  },
];
export default function ProductPreview() {
  const [selected, setSelected] = useState(0);
  const [published, setPublished] = useState(false);
  const example = examples[selected];
  return (
    <div className="product-demo">
      <div className="demo-top">
        <span className="demo-dots" aria-hidden="true">
          ● ● ●
        </span>
        <span>Jouw website, eenvoudig geregeld</span>
        <span className="demo-status">● Online</span>
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
          <p>{example.detail}</p>
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
            : "Voorbeeld van je wijziging"}
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
                setPublished(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="chat-question">{example.question}</p>
        <p className="chat-answer">
          <span aria-hidden="true">✳</span>
          {example.answer}
        </p>
        <div className="demo-publish">
          <span role="status">
            {published
              ? "✓ Voorbeeld gepubliceerd"
              : "Pas live als jij tevreden bent."}
          </span>
          <button
            type="button"
            disabled={published}
            onClick={() => setPublished(true)}
          >
            {published ? "Goedgekeurd ✓" : "Keur voorbeeld goed ↗"}
          </button>
        </div>
      </div>
      <p className="demo-caption">
        Illustratie van de werkwijze.{" "}
        <a href="/demo#echte-demo">Zelf de echte demo proberen →</a>
      </p>
    </div>
  );
}
