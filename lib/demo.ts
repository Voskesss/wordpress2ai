import { createHash } from "node:crypto";

/** Korte, stabiele code per gebruiker — voor eigen demo-branch en -voorbeeldsite. */
export function demoCode(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

/** Persoonlijke werk-branch van een demo-gebruiker in de demo-repo. */
export function demoBranch(userId: string): string {
  return `demo-${demoCode(userId)}`;
}

/** Persoonlijke werkversie-worker van een demo-gebruiker (toont concepten). */
export function demoWorker(repo: string, userId: string): string {
  return `wvd-${repo}-${demoCode(userId)}`.slice(0, 54);
}

/** Persoonlijke "live" site van een demo-gebruiker — wordt alleen bij Publiceer bijgewerkt. */
export function demoLiveWorker(repo: string, userId: string): string {
  return `wvl-${repo}-${demoCode(userId)}`.slice(0, 54);
}
