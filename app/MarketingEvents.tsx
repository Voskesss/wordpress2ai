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
  const analytics = window as Window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };
  analytics.dataLayer ??= [];
  analytics.gtag ??= function () {
    analytics.dataLayer!.push(arguments);
  };
  analytics.gtag("event", name, fields);
}
export default function MarketingEvents() {
  useEffect(() => {
    const started = new WeakSet<HTMLFormElement>();
    const signupStarted = new WeakSet<Element>();
    const observed = new WeakSet<Element>();
    const views = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const step = entry.target.getAttribute("data-demo-step");
          if (step === "signup" || step === "portal")
            trackMarketing(`demo_${step}_view`);
          views.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );
    function watch(root: ParentNode) {
      const elements = [...root.querySelectorAll("[data-demo-step]")];
      if (root instanceof Element && root.matches("[data-demo-step]"))
        elements.push(root);
      for (const element of elements) {
        if (observed.has(element)) continue;
        observed.add(element);
        views.observe(element);
      }
    }
    watch(document);
    const mutations = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (node instanceof Element) watch(node);
        }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    function click(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const signup = event.target.closest('[data-demo-step="signup"]');
      if (
        signup &&
        event.target.closest("button, a, input, select, textarea") &&
        !signupStarted.has(signup)
      ) {
        signupStarted.add(signup);
        trackMarketing("demo_signup_start");
      }
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
      const signup = event.target.closest('[data-demo-step="signup"]');
      if (signup && !signupStarted.has(signup)) {
        signupStarted.add(signup);
        trackMarketing("demo_signup_start");
      }
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
      views.disconnect();
      mutations.disconnect();
    };
  }, []);
  return null;
}
