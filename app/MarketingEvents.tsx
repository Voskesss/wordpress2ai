"use client";
import { useEffect } from "react";
/** Mounted only after analytics consent. Never send form values or full URLs. */
export function trackMarketing(
  name: string,
  fields: Record<string, string> = {},
) {
  try {
    if (localStorage.getItem("ws-cookie-keuze") !== "ja") return;
  } catch {
    return;
  }
  const analytics = window as Window & { gtag?: (...args: unknown[]) => void };
  analytics.gtag?.("event", name, fields);
}
export default function MarketingEvents() {
  useEffect(() => {
    const started = new WeakSet<HTMLFormElement>();
    function click(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!link) return;
      const url = new URL(link.href);
      if (
        url.origin === location.origin &&
        ["/contact", "/demo"].includes(url.pathname)
      ) {
        trackMarketing("offer_cta_click", { destination: url.pathname });
      }
    }
    function focus(event: FocusEvent) {
      if (!(
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ))
        return;
      const form = event.target.form;
      if (form?.dataset.leadForm === "websitecheck" && !started.has(form)) {
        started.add(form);
        trackMarketing("websitecheck_start");
      }
    }
    document.addEventListener("click", click);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("click", click);
      document.removeEventListener("focusin", focus);
    };
  }, []);
  return null;
}
