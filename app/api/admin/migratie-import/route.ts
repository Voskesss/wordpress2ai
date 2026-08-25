import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { maakSeoManifest, parseWxr } from "@/lib/wxr";

export const maxDuration = 60;

async function leesWxr(form: FormData): Promise<string | null> {
  const file = form.get("wxr");
  if (!(file instanceof File) || file.size === 0) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  if (form.get("gz") === "1") {
    const { gunzipSync } = await import("node:zlib");
    return gunzipSync(buf).toString("utf8");
  }
  return buf.toString("utf8");
}


export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const form = await req.formData();
  const xmlInhoud = await leesWxr(form);
  if (!xmlInhoud) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }

  try {
    const xml = xmlInhoud;
    const wxr = parseWxr(xml);
    const manifest = maakSeoManifest(wxr);
    return NextResponse.json({
      siteTitel: wxr.siteTitel,
      siteUrl: wxr.siteUrl,
      paginas: wxr.paginas.map((p) => ({
        titel: p.titel,
        pad: p.pad,
        status: p.status,
        tekens: p.content.length,
      })),
      berichten: wxr.berichten.map((p) => ({
        titel: p.titel,
        pad: p.pad,
        status: p.status,
        tekens: p.content.length,
      })),
      mediaAantal: wxr.media.length,
      overig: wxr.overig,
      manifest,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon het bestand niet lezen" },
      { status: 400 }
    );
  }
}
