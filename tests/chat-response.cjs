const { buildSync } = require("esbuild");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const dir = mkdtempSync(path.join(os.tmpdir(), "ws-response-"));
(async () => {
  try {
    const out = path.join(dir, "parser.cjs");
    buildSync({
      entryPoints: ["lib/chat-response.ts"],
      outfile: out,
      bundle: true,
      platform: "node",
      format: "cjs",
    });
    const { readChatResponse } = require(out);
    const read = (r) => readChatResponse(r, () => {});
    for (const key of ["error", "reply", "melding"])
      await assert.rejects(
        () =>
          read(
            Response.json(
              { [key]: "Wacht op vorige opdracht" },
              { status: 409 },
            ),
          ),
        /Wacht op vorige opdracht/,
      );
    // Serverfout zonder leesbaar antwoord: zeg dát er iets misging, en dat de
    // opdracht niet is uitgevoerd — niet alleen "kon niet worden verwerkt".
    await assert.rejects(
      () => read(new Response("Service unavailable", { status: 503 })),
      /niet uitgevoerd/,
    );
    // Te grote upload: het platform weigert vóór onze code, met een antwoord
    // dat geen JSON is. De eigenaar moet horen dat het aan de omvang ligt.
    await assert.rejects(
      () => read(new Response("Request Entity Too Large", { status: 413 })),
      /samen te groot/,
    );
    await assert.rejects(
      () => read(new Response('{"type":"status","tekst":"Bezig"}\n')),
      /zonder bevestiging/,
    );
    await assert.rejects(
      () =>
        read(
          new Response(
            '{"type":"klaar","failed":true,"reply":"Opslaan mislukt"}\n',
          ),
        ),
      /Opslaan mislukt/,
    );
    await assert.rejects(
      () => read(new Response('{"type":"klaar"')),
      /onvolledig/,
    );
    const text =
      '{"type":"status","tekst":"Even wachten"}\n{"type":"klaar","reply":"Foto’s staan klaar","changeId":1,"previewUrl":"/voorbeeld"}';
    const bytes = new TextEncoder().encode(text);
    let pos = 0;
    const events = [];
    const stream = new ReadableStream({
      pull(c) {
        if (pos === bytes.length) c.close();
        else c.enqueue(bytes.slice(pos, (pos += 1)));
      },
    });
    const result = await readChatResponse(new Response(stream), (e) =>
      events.push(e),
    );
    assert.equal(result.reply, "Foto’s staan klaar");
    assert.equal(result.changeId, 1);
    assert.equal(events.length, 1);
    // A transport failure after the terminal confirmation must not turn success into retry.
    let sent = false;
    const pending = new ReadableStream({
      pull(c) {
        if (sent) c.error(Error("transport"));
        else {
          sent = true;
          c.enqueue(
            new TextEncoder().encode('{"type":"klaar","reply":"Klaar"}\n'),
          );
        }
      },
    });
    assert.equal((await read(new Response(pending))).reply, "Klaar");
    console.log(
      "PASS: HTTP errors, failed terminal results, truncated streams, split UTF-8 and terminal result without newline.",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
