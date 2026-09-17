import { createHmac, timingSafeEqual } from "node:crypto";
import { auth } from "@clerk/nextjs/server";

/**
 * Interne verzoeken: onze eigen servercode (het WhatsApp-kanaal) roept de
 * chat- en publiceerroutes aan namens een gebruiker, zonder browsersessie.
 * Zo'n verzoek draagt een ondertekend label met de gebruiker en het tijdstip;
 * alleen de server kent de sleutel en een label is één minuut geldig.
 * Zonder label gaat alles via Clerk, precies zoals voorheen.
 */
export const INTERN_KOP = "x-wordswap-intern";
const GELDIG_S = 60;

function sleutel() {
  const k =
    process.env.INTERN_SIGNING_SECRET ??
    process.env.PREVIEW_SIGNING_SECRET ??
    process.env.CRON_SECRET;
  if (!k) throw new Error("Sleutel voor interne verzoeken ontbreekt");
  return k;
}

function onderteken(payload: string) {
  return createHmac("sha256", sleutel())
    .update(`wordswap-intern-v1:${payload}`)
    .digest("base64url");
}

export function maakInternLabel(userId: string, nu = Date.now()) {
  const payload = `${Math.floor(nu / 1000)}.${Buffer.from(userId).toString("base64url")}`;
  return `${payload}.${onderteken(payload)}`;
}

export function leesInternLabel(label: string, nu = Date.now()) {
  const delen = label.split(".");
  if (delen.length !== 3) return null;
  const [tijd, gebruiker, handtekening] = delen;
  const t = Number(tijd);
  const seconden = nu / 1000;
  if (!Number.isSafeInteger(t) || t < seconden - GELDIG_S || t > seconden + 5)
    return null;
  const verwacht = Buffer.from(onderteken(`${tijd}.${gebruiker}`));
  const ontvangen = Buffer.from(handtekening);
  if (verwacht.length !== ontvangen.length || !timingSafeEqual(verwacht, ontvangen))
    return null;
  return Buffer.from(gebruiker, "base64url").toString() || null;
}

/** Wie doet dit verzoek? Intern label als dat er is, anders de Clerk-sessie.
 * Een label dat niet klopt telt als niet ingelogd (nooit terugvallen). */
export async function gebruikerVanVerzoek(req: Request) {
  const label = req.headers.get(INTERN_KOP);
  if (label !== null) return leesInternLabel(label);
  const { userId } = await auth();
  return userId;
}
