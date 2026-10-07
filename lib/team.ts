/**
 * Teamleden: uitnodigen en de mails die erbij horen (Jos, 04-10-2026).
 * Zuivere delen (controle van invoer, mailtekst) apart, zodat ze te testen zijn.
 */
import { inWordSwapHuisstijl, ontsnap } from "@/lib/wordswap-mail";

export type UitnodigInvoer = { naam: string; email: string; magPubliceren: boolean; magBerichten: boolean };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Invoer van het uitnodigformulier controleren. Geeft de nette invoer of een foutzin. */
export function controleerUitnodiging(
  ruw: { naam?: unknown; email?: unknown; magPubliceren?: unknown; magBerichten?: unknown },
  bestaand: { email: string }[],
  eigenaarEmail: string | null,
  maxLeden: number,
): { ok: true; invoer: UitnodigInvoer } | { ok: false; fout: string } {
  const naam = String(ruw.naam ?? "").trim().slice(0, 80);
  const email = String(ruw.email ?? "").trim().toLowerCase();
  if (!naam) return { ok: false, fout: "Vul een naam in." };
  if (!EMAIL.test(email)) return { ok: false, fout: "Dit e-mailadres klopt niet." };
  if (eigenaarEmail && email === eigenaarEmail.toLowerCase()) return { ok: false, fout: "Dit is je eigen adres: jij hebt al toegang." };
  if (bestaand.some((b) => b.email.toLowerCase() === email)) return { ok: false, fout: "Deze persoon staat al in je team." };
  if (bestaand.length >= maxLeden)
    return { ok: false, fout: `Je team is vol: ${maxLeden} teamleden zijn gratis. Wil je er meer? Laat het ons weten.` };
  const aan = (v: unknown) => v === true || v === "on" || v === "1" || v === "ja";
  return { ok: true, invoer: { naam, email, magPubliceren: aan(ruw.magPubliceren), magBerichten: aan(ruw.magBerichten) } };
}

/** Uitnodigingsmail voor een nieuw teamlid. */
export function uitnodigingsMail(o: { naam: string; door: string; siteNaam: string; inlogUrl: string; magPubliceren: boolean; magBerichten: boolean }) {
  const voornaam = o.naam.split(/\s+/)[0] || o.naam;
  const rechten = [
    "de website aanpassen door in de chat te typen",
    o.magPubliceren ? "wijzigingen zelf live zetten" : `wijzigingen klaarzetten als concept; ${ontsnap(o.door)} zet ze live`,
    ...(o.magBerichten ? ["de berichten van de formulieren lezen en afhandelen"] : []),
  ];
  const inhoud = `<p>Hoi ${ontsnap(voornaam)},</p>
<p>${ontsnap(o.door)} heeft je toegevoegd aan het team van de website <strong>${ontsnap(o.siteNaam)}</strong>. Je kunt nu:</p>
<ul>${rechten.map((r) => `<li>${r}</li>`).join("")}</ul>
<p><a href="${o.inlogUrl}" style="display:inline-block;background:#245747;color:#fff;padding:11px 22px;border-radius:999px;text-decoration:none;font-weight:600">Inloggen</a></p>
<p>Inloggen gaat met een code die je per mail krijgt; een wachtwoord heb je niet nodig. Alles wat je doet, staat in het logboek van de site met jouw naam erbij.</p>`;
  return { onderwerp: `Je bent toegevoegd aan de website van ${o.siteNaam}`, html: inWordSwapHuisstijl(inhoud) };
}

/** Mail aan de eigenaar als een teamlid zonder publiceerrecht iets heeft klaargezet. */
export function verzoekMail(o: { eigenaarNaam: string; lidNaam: string; siteNaam: string; wat: string[]; portaalUrl: string }) {
  const inhoud = `<p>Hoi ${ontsnap(o.eigenaarNaam.split(/\s+/)[0] || o.eigenaarNaam)},</p>
<p>${ontsnap(o.lidNaam)} heeft een wijziging klaargezet op <strong>${ontsnap(o.siteNaam)}</strong> en vraagt of jij hem live wilt zetten.</p>
${o.wat.length ? `<ul>${o.wat.slice(0, 8).map((w) => `<li>${ontsnap(w)}</li>`).join("")}</ul>` : ""}
<p><a href="${o.portaalUrl}" style="display:inline-block;background:#245747;color:#fff;padding:11px 22px;border-radius:999px;text-decoration:none;font-weight:600">Bekijken en publiceren</a></p>`;
  return { onderwerp: `${o.lidNaam} vraagt je een wijziging te publiceren`, html: inWordSwapHuisstijl(inhoud) };
}

/** Clerk-account bij een e-mailadres zoeken of (zonder wachtwoord) aanmaken,
 * zodat het teamlid meteen met een code kan inloggen. Zelfde aanpak als het
 * koppelen van een klant in de admin. */
export async function clerkAccountVoor(email: string, naam: string): Promise<string | null> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;
  const clerk = (pad: string, init?: RequestInit) =>
    fetch(`https://api.clerk.com/v1${pad}`, { ...init, headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" } });
  const res = await clerk(`/users?email_address=${encodeURIComponent(email)}`);
  const users = (await res.json().catch(() => [])) as { id: string }[];
  if (Array.isArray(users) && users[0]?.id) return users[0].id;
  const [voornaam, ...rest] = naam.split(/\s+/).filter(Boolean);
  const nieuw = await clerk("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      skip_password_requirement: true,
      ...(voornaam ? { first_name: voornaam } : {}),
      ...(rest.length ? { last_name: rest.join(" ") } : {}),
    }),
  });
  const data = (await nieuw.json().catch(() => ({}))) as { id?: string };
  return nieuw.ok && data.id ? data.id : null;
}
