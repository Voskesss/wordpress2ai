import { promises as dns } from "node:dns";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/** DNS-e-mailcheck voor een klantdomein (zelfde logica als scripts/mail-check.mts). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }
  const domein = new URL(req.url).searchParams
    .get("domein")
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
  if (!domein || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domein)) {
    return NextResponse.json({ error: "Geen geldig domein" }, { status: 400 });
  }

  const mx = await dns.resolveMx(domein).catch(() => []);
  const txt = (await dns.resolveTxt(domein).catch(() => [])).map((r) => r.join(""));
  const dmarc = (await dns.resolveTxt(`_dmarc.${domein}`).catch(() => [])).map((r) =>
    r.join("")
  );
  const ns = await dns.resolveNs(domein).catch(() => []);

  const mxTekst = mx.map((r) => r.exchange.toLowerCase()).join(" ");
  const diagnose = /outlook|microsoft/.test(mxTekst)
    ? { status: "extern", tekst: "Microsoft 365 — mail draait extern. Geen migratie nodig; alleen DNS-records exact meenemen." }
    : /google|gmail/.test(mxTekst)
    ? { status: "extern", tekst: "Google Workspace — mail draait extern. Geen migratie nodig; alleen DNS-records exact meenemen." }
    : /soverin/.test(mxTekst)
    ? { status: "extern", tekst: "Soverin — mail draait extern. Geen migratie nodig; alleen DNS-records exact meenemen." }
    : /transip/.test(mxTekst)
    ? { status: "check", tekst: "TransIP — check of dit mail-only is of bij de webhosting hoort." }
    : /vimexx|antagonist|siteground|hostnet|mijndomein|byte|savvii|cloud86|neostrada|versio|strato|one\.com|hostinger/.test(mxTekst)
    ? { status: "migratie", tekst: "LET OP: mail draait bij een webhoster — waarschijnlijk gekoppeld aan de WordPress-hosting. E-mailmigratie nodig vóór opzegging! Zie docs/email-migratie.md." }
    : mx.length
    ? { status: "check", tekst: "Onbekende provider — handmatig checken of dit de webhoster is." }
    : { status: "geen", tekst: "Geen MX-records: geen mail op dit domein. Kans om een professioneel e-mailadres aan te bieden." };

  return NextResponse.json({
    domein,
    diagnose,
    mx: mx.sort((a, b) => a.priority - b.priority).map((r) => `${r.priority} ${r.exchange}`),
    spf: txt.find((t) => t.startsWith("v=spf1")) ?? null,
    dmarc: dmarc.find((t) => t.startsWith("v=DMARC1")) ?? null,
    nameservers: ns,
  });
}
