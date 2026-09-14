"use client";

import { useFormStatus } from "react-dom";

/** Actieknop voor inzendingen: laat zien dat er iets gebeurt ("Bezig...")
 * en vraagt bij destructieve acties eerst een bevestiging. */
export default function InzendingKnop({
  label,
  bezigLabel,
  bevestig,
  className,
}: {
  label: string;
  bezigLabel: string;
  bevestig?: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (bevestig && !window.confirm(bevestig)) e.preventDefault();
      }}
      className={`${className} disabled:opacity-50`}
    >
      {pending ? bezigLabel : label}
    </button>
  );
}
