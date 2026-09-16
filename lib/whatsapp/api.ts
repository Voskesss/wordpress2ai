import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Dunne laag over de WhatsApp Cloud API van Meta (rechtstreeks, geen BSP).
 * Antwoorden binnen 24 uur na een bericht van de klant zijn gratis; daarom
 * sturen we alleen reacties, nooit zelf gestarte berichten.
 *
 * Omgevingsvariabelen:
 *   WHATSAPP_TOKEN            permanente token van de systeemgebruiker
 *   WHATSAPP_PHONE_NUMBER_ID  id van het WordSwap-nummer (niet het nummer zelf)
 *   WHATSAPP_APP_SECRET       app-geheim, om webhooks van Meta te controleren
 *   WHATSAPP_VERIFY_TOKEN     zelfgekozen woord voor de webhook-verificatie
 */
const VERSIE = process.env.WHATSAPP_API_VERSION ?? "v25.0";
const GRAPH = `https://graph.facebook.com/${VERSIE}`;

function token() {
  const t = process.env.WHATSAPP_TOKEN;
  if (!t) throw new Error("WHATSAPP_TOKEN ontbreekt");
  return t;
}

async function graph(pad: string, body: object) {
  const nummerId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!nummerId) throw new Error("WHATSAPP_PHONE_NUMBER_ID ontbreekt");
  const res = await fetch(`${GRAPH}/${nummerId}/${pad}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  if (!res.ok) {
    throw new Error(
      `WhatsApp ${pad} ${res.status}: ${(await res.text()).slice(0, 300)}`,
    );
  }
  return res.json();
}

/** Klopt de handtekening die Meta meestuurt (X-Hub-Signature-256)? */
export function handtekeningKlopt(
  ruweBody: string,
  kop: string | null,
  geheim = process.env.WHATSAPP_APP_SECRET,
) {
  if (!geheim || !kop?.startsWith("sha256=")) return false;
  const verwacht = Buffer.from(
    createHmac("sha256", geheim).update(ruweBody).digest("hex"),
  );
  const ontvangen = Buffer.from(kop.slice(7));
  return (
    verwacht.length === ontvangen.length && timingSafeEqual(verwacht, ontvangen)
  );
}

/** WhatsApp-tekst mag 4096 tekens; langer knippen we netjes af. */
function kort(tekst: string, max: number) {
  return tekst.length <= max ? tekst : `${tekst.slice(0, max - 1).trimEnd()}…`;
}

export function stuurTekst(naar: string, tekst: string) {
  return graph("messages", {
    to: naar,
    type: "text",
    text: { body: kort(tekst, 4096), preview_url: true },
  });
}

/** Bericht met maximaal drie antwoordknoppen (titel max 20 tekens). */
export function stuurKnoppen(
  naar: string,
  tekst: string,
  knoppen: { id: string; titel: string }[],
) {
  return graph("messages", {
    to: naar,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: kort(tekst, 1024) },
      action: {
        buttons: knoppen.slice(0, 3).map((k) => ({
          type: "reply",
          reply: { id: k.id.slice(0, 256), title: kort(k.titel, 20) },
        })),
      },
    },
  });
}

/** Keuzelijst (max 10 regels): voor de KEUZES die de AI voorstelt. */
export function stuurKeuzelijst(
  naar: string,
  tekst: string,
  knopTekst: string,
  regels: { id: string; titel: string; omschrijving?: string }[],
) {
  return graph("messages", {
    to: naar,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: kort(tekst, 1024) },
      action: {
        button: kort(knopTekst, 20),
        sections: [
          {
            rows: regels.slice(0, 10).map((r) => ({
              id: r.id.slice(0, 200),
              title: kort(r.titel, 24),
              ...(r.omschrijving ? { description: kort(r.omschrijving, 72) } : {}),
            })),
          },
        ],
      },
    },
  });
}

/** Blauwe vinkjes plus "aan het typen…" terwijl we werken. */
export function markeerGelezen(berichtId: string) {
  return graph("messages", {
    status: "read",
    message_id: berichtId,
    typing_indicator: { type: "text" },
  });
}

/** Foto, pdf of spraakbericht ophalen. De downloadlink van Meta is maar een
 * paar minuten geldig en vraagt dezelfde token. */
export async function haalMediaOp(mediaId: string) {
  const info = await fetch(`${GRAPH}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!info.ok) throw new Error(`Media ${mediaId}: ${info.status}`);
  const { url, mime_type } = (await info.json()) as {
    url: string;
    mime_type?: string;
  };
  const bestand = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!bestand.ok) throw new Error(`Media ${mediaId} downloaden: ${bestand.status}`);
  return {
    data: Buffer.from(await bestand.arrayBuffer()),
    mimeType: mime_type ?? bestand.headers.get("content-type") ?? "",
  };
}
