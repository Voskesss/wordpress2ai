"use client";
import { useRef, useState } from "react";
import { trackMarketing } from "./MarketingEvents";

/**
 * De demovideo (ruim 40 s, zonder geluid) bovenaan de homepage: vier echte
 * klussen in het portaal. Keuze Jos 29-09: het klikbare voorbeeld werd
 * nauwelijks gebruikt, de video krijgt de beste plek.
 * Twee uitvoeringen: vierkant voor brede schermen, staand voor de telefoon.
 * preload="none" en een eigen afspeelknop over het startbeeld: er wordt
 * niets geladen tot iemand drukt, dus de pagina wordt er niet trager van.
 * Op de telefoon gaat de video bij het afspelen meteen schermvullend.
 */
const UITVOERINGEN = [
  { soort: "vierkant", video: "/social/wordswap-demo-vierkant.mp4", beeld: "/social/wordswap-demo-vierkant.webp", breedte: 1080, hoogte: 1080 },
  { soort: "staand", video: "/social/wordswap-demo-reels.mp4", beeld: "/social/wordswap-demo-reels.webp", breedte: 1080, hoogte: 1920 },
] as const;

type Uitvoering = { soort: string; video: string; beeld: string; breedte: number; hoogte: number; label?: string };

function Uitvoering({ u }: { u: Uitvoering }) {
  const video = useRef<HTMLVideoElement>(null);
  const [gestart, setGestart] = useState(false);
  return (
    <div className={`demo-video-kader demo-video-${u.soort}`}>
      <video
        ref={video}
        src={u.video}
        poster={u.beeld}
        width={u.breedte}
        height={u.hoogte}
        controls={gestart}
        muted
        playsInline
        preload="none"
        aria-label={u.label ?? "Demovideo: zo pas je je website aan met de WordSwap-chat"}
      />
      {!gestart && (
        <button
          type="button"
          className="demo-video-knop"
          aria-label="Speel de video af (ingekorte opname, zonder geluid)"
          onClick={() => {
            setGestart(true);
            const v = video.current;
            if (!v) return;
            void v.play();
            // Op de telefoon is het kader te klein om iets te zien: meteen
            // schermvullend (wens Jos 15-10-2026). iPhone kent alleen de
            // webkit-variant op het video-element; beide moeten binnen de tik.
            if (window.matchMedia("(max-width: 900px)").matches) {
              const vol = v as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
              if (vol.webkitEnterFullscreen) vol.webkitEnterFullscreen();
              else void v.requestFullscreen?.().catch(() => {});
            }
            trackMarketing("demo_video_start", { uitvoering: u.soort });
          }}
        >
          <span aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default function DemoVideo() {
  return (
    <div className="demo-video">
      {UITVOERINGEN.map((u) => (
        <Uitvoering key={u.soort} u={u} />
      ))}
    </div>
  );
}

/** Filmpje "Onderweg? Gewoon via WhatsApp" (wens Jos 15-10-2026): vierkant, op elk scherm. */
export function WhatsAppVideo() {
  return (
    <div className="demo-video">
      <Uitvoering
        u={{
          soort: "whatsapp",
          video: "/video/wordswap-whatsapp.mp4",
          beeld: "/video/wordswap-whatsapp-beeld.webp",
          breedte: 1080,
          hoogte: 1080,
          label: "Video: je website aanpassen door een WhatsApp-bericht te sturen",
        }}
      />
    </div>
  );
}
