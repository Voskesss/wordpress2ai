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

/**
 * Oude tweede omgeving per demo-bezoeker ("wvl-..."), niet meer in gebruik.
 *
 * Publiceren rolde hem uit zodat "Open live site" ergens heen kon wijzen,
 * maar de bezoeker zag zijn wijziging al in het voorbeeld. Die uitrol
 * veranderde dus niets aan wat hij zag en kostte alleen wachttijd en een
 * kans om te mislukken. Deze naam blijft bestaan zodat het opruimen van
 * achtergebleven workers ze nog herkent (zie verwijderDemoWorkers).
 */
export function demoLiveWorker(repo: string, userId: string): string {
  return `wvl-${repo}-${demoCode(userId)}`.slice(0, 54);
}
