"use client";
import type { ReactNode } from "react";
import { volschermOpTelefoon } from "../../volscherm";

/** Video op /video/<naam>: op de telefoon met één tik schermvullend. */
export default function TikVideo({ className, poster, label, children }: { className: string; poster?: string; label: string; children: ReactNode }) {
  return (
    <video
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      controls
      preload="auto"
      aria-label={label}
      className={className}
      onClick={(e) => volschermOpTelefoon(e.currentTarget)}
    >
      {children}
    </video>
  );
}
