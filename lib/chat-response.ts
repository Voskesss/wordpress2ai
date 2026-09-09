type ChatResult = {
  reply: string;
  previewUrl?: string | null;
  changeId?: number | null;
  bestanden?: string[];
  prompt?: string;
};

/** A closed stream is not proof that the edit completed. Require a terminal result. */
export async function readChatResponse(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void,
): Promise<ChatResult> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.reply ?? data.error ?? data.melding;
    throw new Error(
      typeof message === "string"
        ? message
        : "De opdracht kon niet worden verwerkt.",
    );
  }
  if (!response.body) throw new Error("Er kwam geen antwoord terug.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ChatResult | undefined;
  function line(text: string) {
    if (!text.trim()) return;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(text);
      if (!event || typeof event !== "object") throw new Error();
    } catch {
      throw new Error(
        "Het antwoord was onvolledig. Controleer de opgeslagen status van je website.",
      );
    }
    if (
      event.type === "fout" ||
      event.failed === true ||
      typeof event.error === "string"
    ) {
      throw new Error(
        String(event.reply ?? event.error ?? "De wijziging is niet bevestigd."),
      );
    }
    if (event.type === "klaar") {
      if (typeof event.reply !== "string")
        throw new Error("Het antwoord was onvolledig.");
      result = event as ChatResult;
    } else {
      onEvent(event);
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const text of lines) {
        if (!result) line(text);
      }
      if (done) {
        if (!result) line(buffer);
        break;
      }
    }
    if (!result)
      throw new Error(
        "De verbinding eindigde zonder bevestiging van je wijziging.",
      );
    return result;
  } catch (error) {
    // A confirmed edit remains successful if transport fails during server cleanup.
    if (result) return result;
    throw error;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
