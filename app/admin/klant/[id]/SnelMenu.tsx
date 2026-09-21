/**
 * Snelmenu bovenaan de klantpagina: de pagina is lang, dit scheelt scrollen.
 * Blijft onder in beeld plakken, en slaat blokken over die er niet zijn.
 */
export default function SnelMenu({ heeft }: { heeft: Record<string, boolean> }) {
  const items: { anker: string; label: string }[] = [
    { anker: "livegang", label: "🚀 Livegang" },
    { anker: "online", label: "Online zetten" },
    { anker: "chat", label: "Beheer via chat" },
    { anker: "instellingen", label: "Instellingen" },
    { anker: "account", label: "Klantaccount" },
    { anker: "incasso", label: "💶 Incasso" },
    { anker: "afspraken-blok", label: "📅 Afspraken" },
    { anker: "review", label: "⭐ Review" },
    { anker: "richtlijnen", label: "Richtlijnen" },
    { anker: "wijzigingen", label: "Wijzigingen" },
    { anker: "versies", label: "Versies" },
    { anker: "sjabloon", label: "↺ Sjabloon" },
    { anker: "feedback", label: "👍👎 Feedback" },
    { anker: "formulier-privacy", label: "🔒 Berichten bewaren" },
    { anker: "chatgeschiedenis", label: "💬 Chats" },
    { anker: "wordpress-kopie", label: "🛟 WP-kopie" },
    { anker: "video", label: "🎬 Video" },
    { anker: "audio", label: "🎧 Audio" },
    { anker: "ai-budget", label: "🤖 AI-budget" },
    { anker: "whatsapp", label: "💬 WhatsApp" },
    { anker: "eigen-mail", label: "E-mail eigen naam" },
    { anker: "verwijderen", label: "Verwijderen" },
  ].filter((i) => heeft[i.anker] !== false);

  return (
    <nav
      aria-label="Snel naar een onderdeel"
      className="sticky top-0 z-40 -mx-6 mb-4 border-b border-stone-200 bg-[#fdfbf7]/95 px-6 py-2 backdrop-blur"
    >
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <a
            key={i.anker}
            href={`#${i.anker}`}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              i.anker === "verwijderen"
                ? "border-red-200 text-red-700 hover:bg-red-50"
                : "border-stone-200 text-stone-600 hover:border-violet-400 hover:text-violet-700"
            }`}
          >
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
