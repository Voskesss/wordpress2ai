"use client";

import { useFormStatus } from "react-dom";

/** Submit-knop die eerst om bevestiging vraagt (voor acties die je niet zomaar terugdraait). */
export default function BevestigKnop({
  label,
  bezigLabel,
  vraag,
  className,
}: {
  label: string;
  bezigLabel: string;
  vraag: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(vraag)) e.preventDefault();
      }}
      className={`${className} disabled:opacity-70 ${pending ? "animate-pulse" : ""}`}
    >
      {pending ? bezigLabel : label}
    </button>
  );
}
