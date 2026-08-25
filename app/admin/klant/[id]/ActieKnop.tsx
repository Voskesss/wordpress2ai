"use client";

import { useFormStatus } from "react-dom";

/** Submit-knop voor serveracties met zichtbare bezig-status. */
export default function ActieKnop({
  label,
  bezigLabel,
  className,
}: {
  label: string;
  bezigLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-70 ${pending ? "animate-pulse" : ""}`}
    >
      {pending ? bezigLabel : label}
    </button>
  );
}
