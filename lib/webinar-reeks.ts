import { createHmac } from "node:crypto";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { formulierInzendingen, webinarMailInstellingen, webinarMails, webinars } from "@/db/schema";
import { formatWanneer, hoortBij } from "@/lib/webinar";
import { inWordSwapHuisstijl, mailVanJos, ontsnap } from "@/lib/wordswap-mail";
import { type Hoek, vindHoekOpNaam } from "@/lib/hoeken";

const UUR = 3_600_000;
const DAG = 24 * UUR;

export type ReeksSoort = "waar-sta-je" | "waar-ga-je-heen" | "ja-maar" | "morgen" | "herinnering" | "na-afloop";

/**
 * De mailreeks, teruggerekend vanaf het webinar. Elke mail staat los aan of uit
 * (standaard uit). "dagmail" = een voorbereidingsmail: late aanmelders krijgen de
 * dagmails van vóór hun aanmelding niet alsnog, en nooit twee tegelijk.
 */
export const REEKS: {
  soort: ReeksSoort;
  naam: string;
  moment: string;
  offset: number;
  venster: number;
  dagmail: boolean;
}[] = [
  { soort: "waar-sta-je", naam: "1. Waar sta je nu? (reflectielijstje)", moment: "7 dagen vóór het webinar", offset: -7 * DAG, venster: 36 * UUR, dagmail: true },
  { soort: "waar-ga-je-heen", naam: "2. Waar wil je naartoe? (wat kan er, geen lock-in)", moment: "5 dagen vóór het webinar", offset: -5 * DAG, venster: 36 * UUR, dagmail: true },
  { soort: "ja-maar", naam: "3. “Ja, maar…” (bezwaren)", moment: "3 dagen vóór het webinar", offset: -3 * DAG, venster: 36 * UUR, dagmail: true },
  { soort: "morgen", naam: "4. Morgen (bewijs en de link)", moment: "1 dag vóór het webinar", offset: -1 * DAG, venster: 20 * UUR, dagmail: true },
  { soort: "herinnering", naam: "Herinnering", moment: "2 uur vóór het webinar", offset: -2 * UUR, venster: 2 * UUR, dagmail: false },
  { soort: "na-afloop", naam: "Na afloop (opname en gratis check)", moment: "1 dag na het webinar", offset: 1 * DAG, venster: 48 * UUR, dagmail: false },
];

export const DAGMAILS: ReeksSoort[] = REEKS.filter((r) => r.dagmail).map((r) => r.soort);

export function afmeldToken(inschrijvingId: number): string | null {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) return null;
  return createHmac("sha256", geheim).update(`webinar-afmelden:${inschrijvingId}`).digest("hex").slice(0, 32);
}

type Webinar = { titel: string; wanneer: Date; meetLink: string | null; opnameLink: string | null; demoVideoLink: string | null };

const p = (t: string) => `<p>${t}</p>`;
const lijst = (items: string[]) => `<ul style="padding-left:20px">${items.map((i) => `<li style="margin:6px 0">${i}</li>`).join("")}</ul>`;
const knop = (url: string, label: string) =>
  // Kleur ook op de span: Outlook/Hotmail overschrijft de kleur van links
  `<p style="margin:22px 0"><a href="${ontsnap(url)}" style="display:inline-block;background:#31956B;color:#ffffff !important;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600"><span style="color:#ffffff !important;text-decoration:none;font-weight:600">${label}</span></a></p>`;

function tijd(d: Date): string {
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
}

/** Onderwerp en HTML van één mail uit de reeks. */
export function bouwReeksMail(
  soort: ReeksSoort,
  ctx: { voornaam: string; webinar: Webinar; afmeldUrl: string | null; hoek?: Hoek | null },
): { onderwerp: string; html: string } {
  const w = ctx.webinar;
  // Via welke advertentie-hoek iemand kwam: die reden lees je terug in de eerste mail
  const hoekZin = ctx.hoek ? p(ontsnap(ctx.hoek.mail)) : "";
  const hallo = p(`Hallo${ctx.voornaam ? ` ${ontsnap(ctx.voornaam)}` : ""},`);
  const voet = `Je krijgt deze mail omdat je je hebt aangemeld voor het webinar van ${ontsnap(formatWanneer(w.wanneer))}.${
    ctx.afmeldUrl
      ? ` Liever geen voorbereidingsmails? <a href="${ontsnap(ctx.afmeldUrl)}" style="color:#8a9185">Afmelden</a>; je plek in het webinar blijft gewoon staan.`
      : ""
  }`;
  const linkBlok = w.meetLink ? knop(w.meetLink, "Deelnemen aan het webinar") : p("De deelnamelink krijg je op tijd van me.");
  const kader = (inhoud: string) => inWordSwapHuisstijl(`${hallo}${inhoud}<p>Groet,<br>Jos</p>`, voet);

  switch (soort) {
    case "waar-sta-je":
      return {
        onderwerp: "Een vraag vóór het webinar: waar sta je nu?",
        html: kader(
          p(
            `Over een week zien we elkaar online in het webinar. Het duurt maximaal een half uur, en daarna wil ik dat je precies weet of jij van het gedoe rond je website af kunt.`,
          ) +
            hoekZin +
            p("Daarom alvast een klein lijstje. Neem er een minuutje voor, en wees eerlijk tegen jezelf:") +
            lijst([
              "Wanneer heb je voor het laatst zelf iets op je website veranderd?",
              "Staat er nu iets op dat niet meer klopt? Openingstijden, prijzen, een dienst die je niet meer doet?",
              "Durf je de updates in je beheerscherm gewoon aan te klikken?",
              "Hoeveel heb je het afgelopen jaar betaald aan onderhoud en losse wijzigingen, en weet je waarvoor?",
              "Van wie is je website eigenlijk: van jou, of van je bouwer?",
            ]) +
            p(
              `Eén verzoek: <strong>antwoord op deze mail met het ding op je website dat al het langst niet klopt.</strong> Ik lees alles zelf. Misschien kom ik er in het webinar op terug, uiteraard zonder namen.`,
            ),
        ),
      };
    case "waar-ga-je-heen":
      return {
        onderwerp: "Waar wil je naartoe met je website?",
        html: kader(
          p("Vorige keer vroeg ik waar je nu staat. Vandaag de andere kant: waar wil je naartoe?") +
            p(
              "De meeste ondernemers zien hun website als iets dat ze ooit hebben laten maken en waar ze zo min mogelijk aan willen denken. Ik wil dat je daar anders naar gaat kijken: <strong>je website hoort iets te zijn dat jij zelf aanstuurt door gewoon te zeggen wat er moet, en al het gedoe eromheen hoort geregeld te zijn.</strong>",
            ) +
            p("Dan krijg ik vaak de vraag: kan ik dan nog wel alles veranderen? Kort antwoord:") +
            lijst([
              "Een nieuwe pagina maken? <strong>Ja.</strong>",
              "Een andere foto of kleur? <strong>Ja.</strong>",
              "Teksten, prijzen, openingstijden? <strong>Ja.</strong>",
              "Een extra dienst, een actie of een blogbericht? <strong>Ja.</strong>",
            ]) +
            p(
              "En misschien nog belangrijker: je zit nergens aan vast. Je website blijft van jou, je kunt hem altijd meenemen en opzeggen kan per maand. Dat is bewust zo. Blijven moet zijn omdat het bevalt, niet omdat vertrekken lastig is.",
            ) +
            p("Een vraag om over na te denken: als het aanpassen van je website zo makkelijk was als een appje sturen, wat zou je dan deze week al veranderen?"),
        ),
      };
    case "ja-maar":
      return {
        onderwerp: "“Mooi verhaal, maar bij mij kan dat niet”",
        html: kader(
          p("Bijna iedereen die zich aanmeldt heeft wel een ‘ja, maar’. Dat is gezond. Dit zijn de zeven die ik het vaakst hoor:") +
            p("<strong>“Mijn website is nog vrij nieuw.”</strong><br>Dan is het juist een goed moment: je teksten, foto’s en uitstraling gaan gewoon mee. Er hoeft niets opnieuw ontworpen te worden.") +
            p("<strong>“Dat wordt vast te duur.”</strong><br>Kijk eens wat het huidige gedoe je al kost: onderhoud, losse wijzigingen, en de uren die je er zelf in steekt. En je betaalt pas als je de overgezette site hebt gezien en goed vindt.") +
            p("<strong>“Straks gaat de AI iets doen wat ik niet wil.”</strong><br>Niets gaat vanzelf live. Je ziet elke wijziging eerst als voorbeeld en jij beslist of hij erop komt. Toch iets niet goed? Dan zet je de vorige versie gewoon terug.") +
            p("<strong>“Straks verlies ik mijn plek in Google.”</strong><br>Je pagina-adressen en instellingen nemen we zorgvuldig mee. Een garantie geeft niemand je eerlijk, maar we doen er alles aan dat je vindbaar blijft.") +
            p("<strong>“Ik heb geen tijd voor een overstap.”</strong><br>Die hoef je ook niet te hebben: wij doen het werk. Jij kijkt alleen of het klopt, en tot die tijd blijft je huidige site gewoon online.") +
            p("<strong>“Straks zit ik ergens aan vast. En als jullie ermee stoppen?”</strong><br>Dan heb je nog steeds alles. Je websitebestanden zijn van jou, je kunt ze altijd zelf downloaden en ergens anders neerzetten, en opzeggen kan per maand.") +
            p("<strong>“Mijn website is te ingewikkeld.”</strong><br>Dat kan. Heb je een webshop of een ledenportaal, of blog je bijna elke dag? Dan is dit waarschijnlijk niet voor jou, en dat zeg ik je liever nu eerlijk.") +
            p("Welke ‘ja, maar’ heb jij? Antwoord gerust op deze mail. Staat hij er niet bij, dan wil ik hem juist horen."),
        ),
      };
    case "morgen":
      return {
        onderwerp: "Morgen: het webinar (en één ding om alvast te zien)",
        html: kader(
          p(`Morgen om <strong>${tijd(w.wanneer)}</strong> is het zover. Maximaal een half uur, en je mag gewoon luisteren.`) +
            p(
              "Omdat ‘eerst zien, dan geloven’ heel normaal is, alvast één voorbeeld uit de praktijk. We hebben onlangs een WordPress-website overgezet en beide versies gemeten met de meetlat van Google. Dezelfde site, dezelfde inhoud: de oude versie deed er <strong>6,2 seconden</strong> over, de nieuwe <strong>3,2 seconden</strong>.",
            ) +
            (w.demoVideoLink
              ? p(`En in deze korte video zie je wat het aanpassen van je website voor een ondernemer betekent:`) + knop(w.demoVideoLink, "Bekijk de video")
              : "") +
            p("Morgen laat ik je met eigen ogen zien wat er kan, en daarna weet je of het bij jou past.") +
            linkBlok +
            p("Tot morgen!"),
        ),
      };
    case "herinnering":
      return {
        onderwerp: `Vandaag om ${tijd(w.wanneer)}: het webinar`,
        html: kader(
          p(`Over een paar uur, om <strong>${tijd(w.wanneer)}</strong>, begint het webinar. Maximaal een half uur, en je hoeft niets voor te bereiden.`) +
            linkBlok +
            p("Tot straks!"),
        ),
      };
    case "na-afloop":
      return {
        onderwerp: "Bedankt voor het webinar",
        html: kader(
          p("Bedankt dat je je had aangemeld voor het webinar.") +
            (w.opnameLink ? p("Kon je er niet bij zijn, of wil je iets terugkijken?") + knop(w.opnameLink, "Bekijk de opname") : "") +
            p(
              "Wil je weten of jij van het gedoe af kunt, voor jouw eigen website? Vraag dan de gratis websitecheck aan. Je krijgt binnen één werkdag een eerlijk antwoord, ook als dat ‘blijf waar je zit’ is.",
            ) +
            knop("https://wordswap.nl/contact", "Gratis websitecheck aanvragen"),
        ),
      };
  }
}

/**
 * Verstuurt de reeksmails die nu aan de beurt zijn. Elke mail wordt per inschrijving
 * eerst geclaimd (unieke rij), zodat niemand een mail dubbel krijgt.
 */
export async function verstuurWebinarReeks(nu = new Date()): Promise<{ verstuurd: number; details: string[] }> {
  const instellingen = await db.select().from(webinarMailInstellingen);
  const aan = new Set(instellingen.filter((i) => i.aan).map((i) => i.soort));
  const actief = REEKS.filter((r) => aan.has(r.soort));
  if (actief.length === 0) return { verstuurd: 0, details: [] };

  const sessies = await db
    .select()
    .from(webinars)
    .where(and(gte(webinars.wanneer, new Date(nu.getTime() - 3 * DAG)), lte(webinars.wanneer, new Date(nu.getTime() + 8 * DAG))));
  if (sessies.length === 0) return { verstuurd: 0, details: [] };

  const inschrijvingen = await db.select().from(formulierInzendingen).where(eq(formulierInzendingen.formulier, "webinar"));
  const gehad = new Map<number, Set<string>>();
  if (inschrijvingen.length > 0) {
    const rijen = await db
      .select()
      .from(webinarMails)
      .where(inArray(webinarMails.inschrijvingId, inschrijvingen.map((i) => i.id)));
    for (const r of rijen) {
      if (!gehad.has(r.inschrijvingId)) gehad.set(r.inschrijvingId, new Set());
      gehad.get(r.inschrijvingId)!.add(r.soort);
    }
  }

  let verstuurd = 0;
  const details: string[] = [];
  for (const w of sessies) {
    for (const i of inschrijvingen.filter((x) => hoortBij(x.velden as Record<string, unknown>, w))) {
      const v = i.velden as Record<string, string>;
      if (!v.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) continue;
      const alGehad = gehad.get(i.id) ?? new Set<string>();
      if (alGehad.has("afgemeld")) continue;

      let dagmailDezeRonde = false;
      for (const r of actief) {
        if (alGehad.has(r.soort)) continue;
        const moment = w.wanneer.getTime() + r.offset;
        if (nu.getTime() < moment || nu.getTime() > moment + r.venster) continue;
        if (r.dagmail && (i.aangemaakt.getTime() > moment || dagmailDezeRonde)) continue;

        const claim = await db
          .insert(webinarMails)
          .values({ inschrijvingId: i.id, webinarId: w.id, soort: r.soort })
          .onConflictDoNothing()
          .returning({ id: webinarMails.id });
        if (!claim[0]) continue;

        const token = afmeldToken(i.id);
        const mail = bouwReeksMail(r.soort, {
          voornaam: (v.naam ?? "").trim().split(/\s+/)[0] ?? "",
          webinar: w,
          afmeldUrl: token ? `https://wordswap.nl/webinar/afmelden?i=${i.id}&t=${token}` : null,
          hoek: vindHoekOpNaam(v.invalshoek),
        });
        const gelukt = await mailVanJos({ naar: v.email, van: "Jos van WordSwap", onderwerp: mail.onderwerp, html: mail.html, bcc: false });
        if (!gelukt) {
          await db.delete(webinarMails).where(eq(webinarMails.id, claim[0].id));
          details.push(`MISLUKT ${r.soort} → ${v.email}`);
          continue;
        }
        if (r.dagmail) dagmailDezeRonde = true;
        verstuurd++;
        details.push(`${r.soort} → ${v.email}`);
      }
    }
  }
  return { verstuurd, details };
}
