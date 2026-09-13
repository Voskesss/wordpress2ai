import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

/** Live intake-check bij een klantgesprek: waar staat het domein, de DNS
 * en de mail — plus een kort AI-advies volgens de vaste beslisboom. */

type DnsAntwoord = { name: string; type: number; data: string };

async function doh(naam: string, type: string): Promise<DnsAntwoord[]> {
  try {
    const r = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(naam)}&type=${type}`,
      { headers: { accept: "application/dns-json" }, cache: "no-store" }
    );
    const j = (await r.json()) as { Answer?: DnsAntwoord[] };
    return j.Answer ?? [];
  } catch {
    return [];
  }
}

/** Registrar opzoeken via RDAP (SIDN voor .nl, anders rdap.org). */
async function registrar(domein: string): Promise<string | null> {
  const url = domein.endsWith(".nl")
    ? `https://rdap.sidn.nl/domain/${domein}`
    : `https://rdap.org/domain/${domein}`;
  try {
    const r = await fetch(url, { headers: { accept: "application/rdap+json" }, cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      entities?: { roles?: string[]; vcardArray?: [string, [string, unknown, string, string][]] }[];
    };
    const ent = j.entities?.find((e) => e.roles?.includes("registrar"));
    const fn = ent?.vcardArray?.[1]?.find((v) => v[0] === "fn");
    return (fn?.[3] as string) ?? null;
  } catch {
    return null;
  }
}

/** Kijkt op de website zelf: welke mailadressen staan erop, en is er een
 * contactformulier? Belangrijk voor het gesprek: veel prospects gebruiken
 * een gmail/hotmail-adres op de site terwijl er wel domeinmail bestaat. */
async function websiteScan(domein: string) {
  const adressen = new Set<string>();
  let formulieren = 0;
  let bereikbaar = false;
  for (const pad of ["", "/contact", "/contact/"]) {
    try {
      const r = await fetch(`https://${domein}${pad}`, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: { "user-agent": "Mozilla/5.0 (WordSwap intake-check)" },
      });
      if (!r.ok) continue;
      bereikbaar = true;
      const html = (await r.text()).slice(0, 400_000);
      for (const m of html.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
        const adres = m[0].toLowerCase();
        // plaatjes en versienummers eruit
        if (!/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/.test(adres)) adressen.add(adres);
      }
      formulieren += (html.match(/<form[\s>]/gi) ?? []).length;
    } catch {
      // site traag of onbereikbaar: geen ramp, dan weten we dat ook
    }
  }
  const lijst = [...adressen].slice(0, 10);
  const domeinMail = lijst.filter((a) => a.endsWith(`@${domein}`));
  const externeMail = lijst.filter(
    (a) => !a.endsWith(`@${domein}`) && /@(gmail|hotmail|outlook|live|ziggo|kpnmail|icloud|yahoo)\./.test(a)
  );
  return { bereikbaar, adressenOpSite: lijst, domeinMail, externeMail, formulieren };
}

/** Waar wordt de site gehost? Via de servernaam achter het IP (reverse DNS)
 * en de eigenaar van het IP-blok (RIPE). */
async function hostingVanIp(ip: string | undefined) {
  if (!ip) return null;
  const omgekeerd = ip.split(".").reverse().join(".") + ".in-addr.arpa";
  const [ptr, ripe] = await Promise.all([
    doh(omgekeerd, "PTR").then((a) => a[0]?.data?.replace(/\.$/, "") ?? null),
    fetch(`https://rdap.db.ripe.net/ip/${ip}`, {
      headers: { accept: "application/rdap+json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { name?: string } | null) => j?.name ?? null)
      .catch(() => null),
  ]);
  return { ip, server: ptr, netwerk: ripe };
}

function mailSituatie(mx: string[]): { code: string; label: string } {
  const alles = mx.join(" ").toLowerCase();
  if (mx.length === 0) return { code: "geen", label: "Geen mail op dit domein" };
  if (alles.includes("google.com")) return { code: "google", label: "Google Workspace" };
  if (alles.includes("outlook.com")) return { code: "microsoft", label: "Microsoft 365" };
  if (alles.includes("soverin")) return { code: "soverin", label: "Al bij Soverin" };
  if (alles.includes("improvmx") || alles.includes("mx.cloudflare.net") || alles.includes("forwardemail"))
    return { code: "doorsturen", label: "Alleen doorsturen (geen echte mailbox)" };
  return { code: "hoster", label: `Mail bij een hoster (${mx[0]})` };
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const { domein: ruw } = (await req.json()) as { domein: string };
  const domein = (ruw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domein)) {
    return NextResponse.json({ error: "Geen geldige domeinnaam" }, { status: 400 });
  }

  const [ns, mxRuw, txt, dmarc, aRoot, www, reg, site, ...subs] = await Promise.all([
    doh(domein, "NS"),
    doh(domein, "MX"),
    doh(domein, "TXT"),
    doh(`_dmarc.${domein}`, "TXT"),
    doh(domein, "A"),
    doh(`www.${domein}`, "CNAME"),
    registrar(domein),
    websiteScan(domein),
    ...["clerk", "autodiscover", "webmail", "mail", "api", "staging", "shop"].map((s) =>
      doh(`${s}.${domein}`, "A").then(async (a) =>
        a.length ? { sub: s, data: a[0].data } : doh(`${s}.${domein}`, "CNAME").then((c) => (c.length ? { sub: s, data: c[0].data } : null))
      )
    ),
  ]);

  const mx = mxRuw.map((a) => a.data.replace(/^\d+\s+/, "").replace(/\.$/, ""));
  const spf = txt.map((t) => t.data.replace(/^"|"$/g, "")).filter((t) => t.startsWith("v=spf1"));
  const nameservers = ns.map((a) => a.data.replace(/\.$/, ""));
  const nsTekst = nameservers.join(" ").toLowerCase();
  const dnsBij = nsTekst.includes("cloudflare")
    ? "Cloudflare"
    : nsTekst.includes("siteground")
      ? "SiteGround"
      : nsTekst.includes("transip")
        ? "TransIP"
        : nameservers[0]?.split(".").slice(-2).join(".") ?? "onbekend";
  const subdomeinen = subs.filter(Boolean) as { sub: string; data: string }[];
  const mail = mailSituatie(mx);
  const hosting = await hostingVanIp(aRoot[0]?.data);

  const feiten = {
    domein,
    registrar: reg ?? "onbekend (RDAP gaf niets terug)",
    nameservers,
    dnsBij,
    mail: mail.label,
    mx,
    spf,
    dmarc: dmarc.map((d) => d.data.replace(/^"|"$/g, "")),
    siteIp: aRoot.map((a) => a.data),
    www: www.map((w) => w.data.replace(/\.$/, "")),
    subdomeinen,
    hosting,
    website: site,
  };

  // Kort AI-advies volgens de vaste beslisboom
  let advies = "";
  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: `Je adviseert Jos (WordSwap: zet WordPress-sites om naar statische sites op eigen Cloudflare-infra; mail verkoopt hij via Soverin, €10/jr inkoop per mailbox) tijdens een líve klantgesprek. Hij plakt DNS/registrar-feiten van het domein van de prospect.

Vaste werkwijze: (1) domein blijft bij losse registrar, alleen nameservers naar Jos' Cloudflare-account; zit domein gebundeld bij de WordPress-hoster, dan eerst losmaken/verhuizen vóór opzegging. (2) Bij DNS-verhuizing alle records één-op-één meenemen, inclusief subdomeinen. (3) Mail: bij de hoster = moet mee naar Soverin (mailbox aanmaken → imapsync → dan pas MX om); Google/Microsoft actief = laten staan, alleen records meenemen, eventueel besparingsgesprek; alleen doorsturen = gratis via Cloudflare Email Routing of upsell Soverin-mailbox; geen mail = upsell. (4) Nooit iets opzeggen voor domein+mail veilig zijn; één SPF-record per domein.

Let bij "website" op: adressenOpSite = mailadressen die op hun website staan. Gebruikt de klant een gmail/hotmail-adres op de site terwijl er wél een domein is, dan is dat het beste gespreksopeninkje voor het mailaanbod ("info@eigendomein oogt professioneler"). formulieren > 0 = er is een contactformulier dat mee moet in de migratie.

Schrijf het advies in jip-en-janneke-taal, alsof je het aan iemand zonder enige techniekkennis uitlegt: geen afkortingen als MX/SPF/DKIM/RDAP (zeg "de mail", "het domein", "de instellingen"). Houd het totaal onder de 150 woorden. Gebruik exact deze vier kopjes, elk gevolgd door één of twee korte zinnen:

**Wat ik zie:**
**Wat dit betekent:**
**Wat ik kan aanbieden:**
**Waar ik op moet letten:**`,
      messages: [{ role: "user", content: JSON.stringify(feiten, null, 1) }],
    });
    advies = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
  } catch {
    advies = "";
  }

  return NextResponse.json({ ...feiten, mailCode: mail.code, advies });
}
