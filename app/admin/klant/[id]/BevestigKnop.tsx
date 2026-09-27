"use client";

import { useFormStatus } from "react-dom";

/** Submit-knop die eerst om bevestiging vraagt (voor acties die je niet zomaar terugdraait). */
export default function BevestigKnop({
  label,
  bezigLabel,
  vraag,
  className,
  formAction,
}: {
  label: string;
  bezigLabel: string;
  vraag: string;
  className?: string;
  /** Andere serveractie dan die van het formulier (tweede knop in één form). */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
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
