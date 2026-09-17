import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { akkoorden, messages } from "@/db/schema";
import { inWordSwapHuisstijl, ontsnap } from "@/lib/wordswap-mail";
import { TELEFOON } from "@/lib/persoonlijk";

/**
 * Oplevering van een overgezette website: de klant wordt gekoppeld, krijgt één
 * Nederlandse mail met een link naar zijn nieuwe site, en geeft bij de eerste
 * inlog akkoord ("de website is goed overgezet"). Dat akkoord is het seintje voor
 * Jos om de betaallink te sturen; het contract zelf blijft de betaallink.
 *
 * Opslag in de bestaande tabel akkoorden (soort + versie per site), dus geen
 * nieuwe databasekolommen nodig.
 */
export const OPLEVERING_SOORT = "website-oplevering";
export const opleveringVersie = (siteId: number) => `site-${siteId}`;

/** Alleen sites in opbouw krijgen het akkoordscherm; draaiende klanten nooit. */
export const vraagtOpleveringsAkkoord = (site: { status: string; isDemo: boolean }) =>
  !site.isDemo && site.status === "migratie";

export async function opleveringsAkkoord(siteId: number) {
  const [rij] = await db
    .select()
    .from(akkoorden)
    .where(and(eq(akkoorden.soort, OPLEVERING_SOORT), eq(akkoorden.versie, opleveringVersie(siteId))))
    .limit(1)
    .catch(() => []);
  return rij ?? null;
}

/** Link naar de nieuwe site: de live worker werkt altijd, ook vóór het omzetten van het domein. */
export function standaardBekijkLink(site: { siteSlug: string | null; domein: string | null }): string {
  if (site.siteSlug) return `https://${site.siteSlug}.wordswap.workers.dev`;
  const d = (site.domein ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return d ? `https://${d}` : "";
}

export function isVeiligeLink(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
// De tekstkleur staat óók op een span binnen de link: Outlook/Hotmail overschrijft de kleur
// van links (oranje), maar laat die van een span erbinnen staan.
const knop = (url: string, label: string, primair = true) => {
  const kleur = primair ? "#ffffff" : "#245747";
  return `<p style="margin:6px 0 14px"><a href="${ontsnap(url)}" style="display:inline-block;${
    primair ? "background:#245747;" : "background:#ffffff;border:1px solid #245747;"
  }color:${kleur} !important;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px"><span style="color:${kleur} !important;text-decoration:none;font-weight:600">${label}</span></a></p>`;
};

/** De mail die de klant krijgt bij het koppelen van zijn e-mailadres. */
export function bouwOpleveringsMail(o: {
  siteNaam: string;
  bekijkUrl: string;
  inlogUrl: string;
}): { onderwerp: string; html: string } {
  const site = ontsnap(o.siteNaam);
  const bekijkTekst = ontsnap(o.bekijkUrl.replace(/^https:\/\//, "").replace(/\/$/, ""));
  return {
    onderwerp: `Je nieuwe website staat klaar: ${o.siteNaam}`,
    html: inWordSwapHuisstijl(
      p("Hoi,") +
        p(
          `Goed nieuws: je nieuwe website van <strong>${site}</strong> staat klaar. We hebben je e-mailadres eraan gekoppeld, dus je kunt nu rustig kijken of je tevreden bent.`,
        ) +
        (o.bekijkUrl
          ? p("<strong>1. Bekijk je website</strong><br>Zo ziet hij eruit. Klik gerust overal doorheen, ook op je telefoon.") +
            knop(o.bekijkUrl, "Bekijk je website") +
            `<p style="margin:-6px 0 18px;font-size:13px;color:#657164">${bekijkTekst}</p>`
          : "") +
        p(
          "<strong>2. Log in en geef je akkoord</strong><br>In je eigen omgeving geef je akkoord als alles klopt. Wil je eerst uitproberen hoe makkelijk aanpassen gaat? Dat kan ook: typ gewoon in de chat wat je anders wilt.",
        ) +
        knop(o.inlogUrl, "Inloggen", false) +
        p(
          "Je hebt geen wachtwoord nodig: je krijgt bij het inloggen een code op dit e-mailadres. <strong>Zie je die code niet binnen een minuut? Kijk dan even in je spam of ongewenste mail.</strong>",
        ) +
        p("Twijfel je ergens over of klopt er iets niet? Antwoord gewoon op deze mail of bel me op " + TELEFOON + ".") +
        p("Groet,<br>Jos"),
      "Je krijgt deze mail omdat je website door WordSwap wordt overgezet.",
    ),
  };
}

/** Voor een site die al draait (overdragen aan een ander account): toegang, zonder akkoordverhaal. */
export function bouwToegangsMail(o: { siteNaam: string; bekijkUrl: string; inlogUrl: string }): {
  onderwerp: string;
  html: string;
} {
  const site = ontsnap(o.siteNaam);
  return {
    onderwerp: `Je hebt toegang tot je website: ${o.siteNaam}`,
    html: inWordSwapHuisstijl(
      p("Hoi,") +
        p(
          `Je e-mailadres is gekoppeld aan de website van <strong>${site}</strong>. Vanaf nu kun je hem zelf bijhouden: typ in de chat wat er anders moet, bekijk het voorbeeld en zet het live wanneer jij wilt.`,
        ) +
        (o.bekijkUrl ? knop(o.bekijkUrl, "Bekijk de website", false) : "") +
        knop(o.inlogUrl, "Inloggen") +
        p(
          "Je hebt geen wachtwoord nodig: je krijgt bij het inloggen een code op dit e-mailadres. <strong>Zie je die code niet binnen een minuut? Kijk dan even in je spam of ongewenste mail.</strong>",
        ) +
        p("Vragen? Antwoord gewoon op deze mail of bel me op " + TELEFOON + ".") +
        p("Groet,<br>Jos"),
    ),
  };
}

/** Welke mail hoort bij deze site: in opbouw = oplevering met akkoord, anders = toegang. */
export function bouwKoppelMail(
  site: { naam: string; status: string; isDemo: boolean },
  links: { bekijkUrl: string; inlogUrl: string },
) {
  return vraagtOpleveringsAkkoord(site)
    ? bouwOpleveringsMail({ siteNaam: site.naam, ...links })
    : bouwToegangsMail({ siteNaam: site.naam, ...links });
}

/** Bevestiging aan de klant na het akkoord: Jos neemt contact op voor het koppelen van de domeinnaam
 * en eventuele andere afspraken. */
export function bouwAkkoordBevestiging(o: { siteNaam: string; domein?: string | null }): { onderwerp: string; html: string } {
  const domein = (o.domein ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const eigenDomein = domein && !/\.workers\.dev$/.test(domein) ? domein : "";
  return {
    onderwerp: `Bedankt voor je akkoord: ${o.siteNaam}`,
    html: inWordSwapHuisstijl(
      p("Hoi,") +
        p(
          `Dank je wel! Je hebt akkoord gegeven op je nieuwe website van <strong>${ontsnap(o.siteNaam)}</strong>. Dat hebben we netjes vastgelegd.`,
        ) +
        p("<strong>Wat nu?</strong> Ik neem binnenkort contact met je op om samen de laatste stappen te zetten:") +
        `<ul style="margin:0 0 14px;padding-left:20px">
<li style="margin:0 0 6px"><strong>Je domeinnaam koppelen</strong>, zodat je nieuwe website op ${eigenDomein ? `<strong>${ontsnap(eigenDomein)}</strong>` : "je eigen adres"} te zien is. Dat regel ik voor je; ik vraag alleen even waar je domeinnaam nu geregeld is.</li>
<li style="margin:0"><strong>Eventuele andere afspraken</strong>, bijvoorbeeld over je e-mail of wensen die je nog hebt.</li>
</ul>` +
        p(
          "Tot die tijd blijft je huidige website gewoon online, en kun je in je omgeving alvast aanpassen wat je wilt.",
        ) +
        p(`Liever zelf even bellen? Dat kan op ${TELEFOON}, of antwoord gewoon op deze mail.`) +
        p("Groet,<br>Jos"),
    ),
  };
}

/**
 * Heeft dit account het portaal echt gebruikt? Bij de eerste echte inlog legt het portaal het
 * akkoord op de verwerkersovereenkomst vast; wie chat, laat berichten achter. Clerks eigen
 * "laatst ingelogd" zegt niets: aanmelden via een uitnodiging telt daar al als inloggen.
 */
export async function heeftPortaalGebruikt(clerkUserId: string): Promise<boolean> {
  const [akkoord] = await db.select({ id: akkoorden.id }).from(akkoorden).where(eq(akkoorden.clerkUserId, clerkUserId)).limit(1);
  if (akkoord) return true;
  const [bericht] = await db.select({ id: messages.id }).from(messages).where(eq(messages.clerkUserId, clerkUserId)).limit(1);
  return Boolean(bericht);
}
