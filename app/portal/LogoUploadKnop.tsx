"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Eén knop: bestand kiezen = meteen uploaden. Geen aparte upload-stap. */
export default function LogoUploadKnop({ heeftLogo }: { heeftLogo: boolean }) {
  const { pending } = useFormStatus();
  const invoer = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);
  const [klaar, setKlaar] = useState(false);
  useEffect(() => {
    if (wasPending.current && !pending) {
      setKlaar(true);
      const t = setTimeout(() => setKlaar(false), 3000);
      wasPending.current = pending;
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending]);
  return (
    <>
      <input
        ref={invoer}
        type="file"
        name="logo"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) e.target.form?.requestSubmit();
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => invoer.current?.click()}
        className={`rounded-full bg-violet-700 px-4 py-2 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-70 cursor-pointer ${pending ? "animate-pulse" : ""} ${klaar ? "ring-2 ring-emerald-400" : ""}`}
      >
        {pending ? "Uploaden en op de site zetten..." : klaar ? "✓ Logo staat erin" : heeftLogo ? "Ander logo kiezen" : "Logo kiezen"}
      </button>
    </>
  );
}
