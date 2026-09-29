"use client";
import { useRef } from "react";
import { trackMarketing } from "./MarketingEvents";

/**
 * De demovideo (46 s, zonder geluid) lager op de homepage: vier echte klussen
 * in het portaal. Het klikbare voorbeeld bovenaan blijft de eerste indruk.
 * Twee uitvoeringen: vierkant voor brede schermen, staand voor de telefoon.
 * preload="none": er wordt niets geladen tot iemand op afspelen drukt, dus de
 * pagina wordt er niet trager van.
 */
const UITVOERINGEN = [
  { soort: "vierkant", video: "/social/wordswap-demo-vierkant.mp4", beeld: "/social/wordswap-demo-vierkant.webp", breedte: 1080, hoogte: 1080 },
  { soort: "staand", video: "/social/wordswap-demo-reels.mp4", beeld: "/social/wordswap-demo-reels.webp", breedte: 1080, hoogte: 1920 },
] as const;

export default function DemoVideo() {
  const gemeld = useRef(false);
  return (
    <div className="demo-video">
      {UITVOERINGEN.map((u) => (
        <video
          key={u.soort}
          className={`demo-video-${u.soort}`}
          src={u.video}
          poster={u.beeld}
          width={u.breedte}
          height={u.hoogte}
          controls
          muted
          playsInline
          preload="none"
          aria-label="Demovideo: zo pas je je website aan met de WordSwap-chat"
          onPlay={() => {
            if (gemeld.current) return;
            gemeld.current = true;
            trackMarketing("demo_video_start", { uitvoering: u.soort });
          }}
        />
      ))}
    </div>
  );
}
