import { after } from "next/server";
import { db } from "@/db";
import { whatsappBerichten } from "@/db/schema";
import { handtekeningKlopt } from "@/lib/whatsapp/api";
import { leesWebhook } from "@/lib/whatsapp/berichten";

// Een chatbeurt draait ná het antwoord aan Meta (after), binnen deze functie.
// Gelijk houden aan WEBHOOK_MAX_DUUR_S in lib/whatsapp/verwerk.ts.
export const maxDuration = 800;

/** Meta controleert de webhook één keer bij het instellen. */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const verwacht = process.env.WHATSAPP_VERIFY_TOKEN;
  if (
    verwacht &&
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === verwacht
  ) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Geweigerd", { status: 403 });
}

export async function POST(req: Request) {
  const gestart = Date.now();
  const ruw = await req.text();
  if (!handtekeningKlopt(ruw, req.headers.get("x-hub-signature-256")))
    return new Response("Ongeldige handtekening", { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(ruw);
  } catch {
    return new Response("Ongeldige JSON", { status: 400 });
  }
  const binnen = leesWebhook(body);
  if (!binnen.length) return new Response("ok");

  // Meta bezorgt soms dubbel: alleen echt nieuwe berichten gaan door
  const nieuw = await db
    .insert(whatsappBerichten)
    .values(binnen)
    .onConflictDoNothing({ target: whatsappBerichten.waMessageId })
    .returning();

  if (nieuw.length) {
    after(async () => {
      const { verwerkWebhook } = await import("@/lib/whatsapp/verwerk");
      await verwerkWebhook(nieuw, gestart);
    });
  }
  // Snel antwoorden: anders stuurt Meta hetzelfde bericht opnieuw
  return new Response("ok");
}
