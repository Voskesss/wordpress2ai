"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

/** Submit-knop voor serveracties met zichtbare bezig-status én een korte
 * bevestiging ("✓ Opgeslagen") zodra de actie klaar is — zodat je bij elke
 * opslag ziet dat er iets gebeurd is. */
export default function ActieKnop({
  label,
  bezigLabel,
  klaarLabel = "✓ Opgeslagen",
  className,
  title,
  formAction,
}: {
  label: string;
  bezigLabel: string;
  klaarLabel?: string;
  className?: string;
  title?: string;
  /** Andere serveractie dan die van het formulier — voor een tweede knop
   * in hetzelfde formulier (bv. "alleen opslaan" naast "versturen"). */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  const [klaar, setKlaar] = useState(false);
  useEffect(() => {
    if (wasPending.current && !pending) {
      setKlaar(true);
      const t = setTimeout(() => setKlaar(false), 2500);
      return () => clearTimeout(t);
    }
    wasPending.current = pending;
  }, [pending]);
  useEffect(() => {
    wasPending.current = pending;
  }, [pending]);
  return (
    <button
      type="submit"
      formAction={formAction}
      title={title}
      disabled={pending}
      aria-live="polite"
      className={`${className} disabled:opacity-70 ${pending ? "animate-pulse" : ""} ${klaar ? "ring-2 ring-emerald-400" : ""}`}
    >
      {pending ? bezigLabel : klaar ? klaarLabel : label}
    </button>
  );
}
