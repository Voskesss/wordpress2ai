"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { trackMarketing } from "../MarketingEvents";
export default function LeadForm({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const data = new FormData(event.currentTarget);
    setState("sending");
    trackMarketing("websitecheck_submit");
    try {
      const response = await fetch("/api/formulier", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Submission failed");
      const result = await response.json();
      if (result.ok !== true) throw new Error("Not confirmed");
      setState("success");
      trackMarketing("generate_lead", { form_name: "websitecheck" });
    } catch {
      setState("error");
    }
  }
  if (state === "success")
    return (
      <section
        className="lg:col-span-3 rounded-xl border border-violet-200 bg-violet-50 p-8"
        role="status"
      >
        <p className="eyebrow">JE AANVRAAG IS ONTVANGEN</p>
        <h2 className="font-display mt-3 text-3xl font-semibold">
          Dank je. Jos kijkt met je mee.
        </h2>
        <p className="mt-5 leading-relaxed text-stone-600">
          Binnen één werkdag ontvang je een beoordeling: kan je site mee, welke
          onderdelen vragen aandacht en wat kost de overstap? Je hebt nog niets
          besteld.
        </p>
        <Link href="/demo" className="button-primary mt-6">
          Bekijk intussen hoe de chat werkt →
        </Link>
      </section>
    );
  return (
    <form
      className="lg:col-span-3 rounded-xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-5"
      action="/api/formulier"
      method="POST"
      data-lead-form="websitecheck"
      onSubmit={submit}
      aria-busy={state === "sending"}
    >
      <fieldset disabled={state === "sending"} className="space-y-5 min-w-0">
        {children}
      </fieldset>
      {state === "sending" && (
        <p role="status" className="text-sm">
          Je aanvraag wordt verstuurd…
        </p>
      )}
      {state === "error" && (
        <p
          role="alert"
          className="rounded-lg bg-orange-50 p-4 text-sm text-orange-900"
        >
          We konden je aanvraag niet bevestigen. Je gegevens staan nog in het
          formulier. Probeer het opnieuw of mail{" "}
          <a className="underline" href="mailto:info@wordswap.nl">
            info@wordswap.nl
          </a>
          .
        </p>
      )}
    </form>
  );
}
