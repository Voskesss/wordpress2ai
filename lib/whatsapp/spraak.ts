/** Spraakbericht → tekst met OpenAI Whisper (± $0,006 per minuut). */
export async function spraakNaarTekst(
  audio: Buffer,
  mimeType: string,
): Promise<{ tekst: string; seconden: number }> {
  const sleutel = process.env.OPENAI_API_KEY;
  if (!sleutel) throw new Error("OPENAI_API_KEY ontbreekt");
  // WhatsApp-spraak is ogg/opus; Whisper herkent het type aan de extensie
  const extensie = /mpeg|mp3/.test(mimeType)
    ? "mp3"
    : /mp4|m4a|aac/.test(mimeType)
      ? "m4a"
      : "ogg";
  const form = new FormData();
  form.set(
    "file",
    new File([new Uint8Array(audio)], `spraak.${extensie}`, {
      type: mimeType.split(";")[0] || "audio/ogg",
    }),
  );
  form.set("model", "whisper-1");
  form.set("language", "nl");
  form.set("response_format", "verbose_json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${sleutel}` },
    body: form,
  });
  if (!res.ok)
    throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { text?: string; duration?: number };
  return { tekst: (data.text ?? "").trim(), seconden: data.duration ?? 0 };
}
