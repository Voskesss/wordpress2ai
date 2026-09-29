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
 */
const UITVOERINGEN = [
  { soort: "vierkant", video: "/social/wordswap-demo-vierkant.mp4", beeld: "/social/wordswap-demo-vierkant.webp", breedte: 1080, hoogte: 1080 },
  { soort: "staand", video: "/social/wordswap-demo-reels.mp4", beeld: "/social/wordswap-demo-reels.webp", breedte: 1080, hoogte: 1920 },
] as const;

function Uitvoering({ u }: { u: (typeof UITVOERINGEN)[number] }) {
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
        aria-label="Demovideo: zo pas je je website aan met de WordSwap-chat"
      />
      {!gestart && (
        <button
          type="button"
          className="demo-video-knop"
          aria-label="Speel de video af (ruim 40 seconden, zonder geluid)"
          onClick={() => {
            setGestart(true);
            void video.current?.play();
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
