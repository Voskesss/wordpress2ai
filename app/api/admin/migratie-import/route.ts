import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { maakSeoManifest, parseWxr } from "@/lib/wxr";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await currentUser();
  if (user?.publicMetadata?.role !== "admin") {
    return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("wxr");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Bestand te groot (max 50 MB)" }, { status: 400 });
  }

  try {
    const xml = await file.text();
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
