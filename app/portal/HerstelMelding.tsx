"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function HerstelMelding({ changeId }: { changeId: number }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Het terugzetten van je website is nog niet afgerond. Rond dit eerst af voordat je verder wijzigt.",
  );
  const router = useRouter();
  async function retry() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/ongedaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeId }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.melding ?? "Herstel lukt nog niet. Neem contact op met Jos.",
        );
      setMessage("Herstel afgerond.");
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Controleer je verbinding en probeer opnieuw.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="my-4 rounded-xl border border-amber-300 bg-amber-50 p-5"
      aria-label="Herstel afronden"
    >
      <p role="status">{message}</p>
      <button className="button-primary mt-3" onClick={retry} disabled={busy}>
        {busy ? "Herstellen…" : "Herstel opnieuw proberen"}
      </button>
    </section>
  );
}
