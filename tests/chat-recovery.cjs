const { build } = require("esbuild");
const { chromium } = require("playwright");
const { createServer } = require("node:http");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  let server, browser;
  try {
    const bundle = await build({
      stdin: {
        contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Chat from './app/portal/Chat';window.mountChat=(props)=>createRoot(document.getElementById('root')).render(<Chat {...props}/>);`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      jsx: "automatic",
      platform: "browser",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    const css = (
      await require("postcss")([require("@tailwindcss/postcss")()]).process(
        fs.readFileSync("app/globals.css", "utf8"),
        { from: require("node:path").resolve("app/globals.css") },
      )
    ).css;
    server = createServer((req, res) => {
      res.setHeader(
        "Content-Type",
        req.url === "/app.js" ? "text/javascript" : "text/html",
      );
      res.end(
        req.url === "/app.js"
          ? bundle.outputFiles[0].text
          : "<style>" +
              css +
              '</style><div id="root"></div><script src="/app.js"></script>',
      );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 390, height: 950 },
    });
    const handlers = {};
    const calls = [];
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.route("**/api/**", async (r) => {
      const path = new URL(r.request().url()).pathname;
      calls.push({ path, body: r.request().postData() });
      if (handlers[path]) return handlers[path](r);
      return r.fulfill({ contentType: "application/json", body: "{}" });
    });
    await page.route("**/site-weergave/**", (r) =>
      r.fulfill({ contentType: "text/html", body: "<h1>Voorbeeld</h1>" }),
    );
    const input = () =>
      page.getByRole("textbox", {
        name: "Beschrijf wat je op je website wilt aanpassen",
      });
    const alert = () => page.getByRole("alert");
    async function mount(extra = {}) {
      await page.goto("http://127.0.0.1:" + server.address().port);
      await page.evaluate((props) => window.mountChat(props), {
        siteId: 1,
        previewAccess: "fixture",
        historie: [{ rol: "klant", tekst: "Mijn eerdere vraag" }],
        ...extra,
      });
      await page
        .getByRole("button", { name: /Site aanpassen|Concept klaar — bekijk/ })
        .click();
    }
    await mount();
    handlers["/api/gesprek-nieuw"] = (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"Opslaan mislukt"}',
      });
    await page
      .getByRole("button", { name: "🧹 Nieuw gesprek", exact: true })
      .click();
    await alert()
      .getByText(/Opslaan mislukt/)
      .waitFor();
    assert.equal(
      await page.getByText("Mijn eerdere vraag", { exact: true }).count(),
      1,
    );
    handlers["/api/gesprek-nieuw"] = (r) => r.abort("failed");
    await alert().getByRole("button", { name: "Opnieuw proberen" }).click();
    await alert()
      .getByText(/gesprek blijft hier zichtbaar/)
      .waitFor();
    assert.equal(
      await page.getByText("Mijn eerdere vraag", { exact: true }).count(),
      1,
    );
    handlers["/api/gesprek-nieuw"] = (r) =>
      r.fulfill({ contentType: "application/json", body: '{"ok":true}' });
    await alert().getByRole("button", { name: "Opnieuw proberen" }).click();
    await page.getByText(/Je nieuwe gesprek is gestart/).waitFor();
    assert.equal(
      await page.getByText("Mijn eerdere vraag", { exact: true }).count(),
      0,
    );
    // JSON errors are visible and the request is restored without auto-sending.
    handlers["/api/chat"] = (r) =>
      r.fulfill({
        status: 429,
        contentType: "application/json",
        body: '{"reply":"Je daglimiet is bereikt"}',
      });
    await input().fill("Verander de zaterdag naar 9 tot 16 uur");
    await page.getByRole("button", { name: "Verstuur", exact: true }).click();
    await alert()
      .getByText(/Je daglimiet is bereikt/)
      .waitFor();
    const before = calls.filter((c) => c.path === "/api/chat").length;
    await alert().getByRole("button", { name: "Opdracht terugzetten" }).click();
    assert.equal(
      await input().inputValue(),
      "Verander de zaterdag naar 9 tot 16 uur",
    );
    assert.equal(calls.filter((c) => c.path === "/api/chat").length, before);
    // Streaming failure pauses a queued request; uploaded photo is restored too.
    let release;
    handlers["/api/chat"] = (r) =>
      new Promise((resolve) => {
        release = async () => {
          await r.fulfill({
            contentType: "application/x-ndjson",
            body: '{"type":"klaar","failed":true,"reply":"Concept opslaan mislukt"}\n',
          });
          resolve();
        };
      });
    await page
      .locator("input[type=file]")
      .first()
      .setInputFiles({
        name: "voorbeeld.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jp1sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    await page.getByRole("button", { name: "Verstuur", exact: true }).click();
    await page
      .getByRole("button", { name: "Stop de wijziging", exact: true })
      .waitFor();
    await input().fill("Maak daarna de kop korter");
    await input().press("Enter");
    while (!release) await new Promise((r) => setTimeout(r, 10));
    await release();
    await alert()
      .getByText(/vervolgopdracht wacht/)
      .waitFor();
    const afterFailure = calls.filter((c) => c.path === "/api/chat").length;
    await alert().getByRole("button", { name: "Opdracht terugzetten" }).click();
    assert.equal(
      calls.filter((c) => c.path === "/api/chat").length,
      afterFailure,
    );
    const bodies = [];
    handlers["/api/chat"] = (r) => {
      bodies.push(r.request().postData());
      return r.fulfill({
        contentType: "application/x-ndjson",
        body: '{"type":"klaar","reply":"Wijziging ontvangen"}',
      });
    };
    await page.getByRole("button", { name: "Verstuur", exact: true }).click();
    await page
      .getByText("Wijziging ontvangen", { exact: true })
      .first()
      .waitFor();
    await page.waitForFunction(
      () => document.body.textContent.split("Wijziging ontvangen").length === 3,
    );
    assert.match(bodies[0], /filename="voorbeeld.png"/);
    assert.match(bodies[1], /Maak daarna de kop korter/);
    // Publication retry targets the same concept; a network error is not success.
    await mount({
      openConcept: {
        changeId: 42,
        previewUrl: "/site-weergave/fixture/",
        prompt: "Test",
        paginas: ["contact.html"],
      },
    });
    handlers["/api/publiceer"] = (r) => r.abort("failed");
    await page.getByRole("button", { name: "Publiceer", exact: true }).click();
    await alert()
      .getByText(/Geen bevestiging/)
      .waitFor();
    await page
      .getByText("Concept klaar — nog niet live.", { exact: true })
      .waitFor();
    handlers["/api/publiceer"] = (r) =>
      r.fulfill({ contentType: "application/json", body: '{"ok":true}' });
    await alert().getByRole("button", { name: "Opnieuw proberen" }).click();
    await page.getByText(/Gepubliceerd! Je ziet het hier meteen/).waitFor();
    assert.deepEqual(
      calls
        .filter((c) => c.path === "/api/publiceer")
        .map((c) => JSON.parse(c.body).changeId),
      [42, 42],
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: failed new conversation preserves history; reset success; HTTP chat error; photo and draft recovery; queued edits pause after failure; publication retries the same concept. No real APIs called.",
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
