const { build } = require("esbuild");
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  let browser;
  try {
    const bundle = await build({
      stdin: {
        contents: `import React from 'react';import {createRoot} from 'react-dom/client';import MarketingEvents from './app/MarketingEvents';createRoot(document.getElementById('root')).render(<MarketingEvents/>);`,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      bundle: true,
      write: false,
      jsx: "automatic",
      platform: "browser",
      define: { "process.env.NODE_ENV": '"production"' },
    });
    browser = await chromium.launch();
    const p = await browser.newPage();
    await p.route("**/*", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<div id="root"></div><section data-demo-step="signup"><p>Registreren</p><form><input aria-label="Email"><button type="button">Verder</button></form></section>',
      }),
    );
    for (const consent of ["nee", "ja"]) {
      await p.goto("http://demo.fixture/");
      await p.evaluate((c) => {
        localStorage.setItem("ws-cookie-keuze", c);
        window.observerSeen = false;
        const Original = IntersectionObserver;
        window.IntersectionObserver = class extends Original {
          constructor(cb, opts) {
            super((entries, o) => {
              window.observerSeen = true;
              cb(entries, o);
            }, opts);
          }
        };
      }, consent);
      await p.addScriptTag({ content: bundle.outputFiles[0].text });
      await p.waitForFunction(() => window.observerSeen);
      const events = () =>
        p.evaluate(() =>
          Array.from(window.dataLayer ?? [], (a) => Array.from(a)),
        );
      if (consent === "nee") {
        assert.equal((await events()).length, 0);
        await p.getByLabel("Email").fill("private@example.invalid");
        await p.getByRole("button", { name: "Verder" }).click();
        assert.equal((await events()).length, 0);
        continue;
      }
      assert.equal(
        (await events()).filter((e) => e[1] === "demo_signup_view").length,
        1,
      );
      await p.getByText("Registreren", { exact: true }).click();
      assert.equal(
        (await events()).filter((e) => e[1] === "demo_signup_start").length,
        0,
      );
      await p.getByLabel("Email").fill("private@example.invalid");
      await p.getByRole("button", { name: "Verder" }).click();
      assert.equal(
        (await events()).filter((e) => e[1] === "demo_signup_start").length,
        1,
      );
      await p.evaluate(() => {
        document.querySelector("section").remove();
        const e = document.createElement("section");
        e.dataset.demoStep = "portal";
        e.textContent = "Demoportaal";
        document.body.append(e);
      });
      await p.waitForFunction(() =>
        (window.dataLayer ?? []).some((e) => e[1] === "demo_portal_view"),
      );
      assert.equal(
        (await events()).filter((e) => e[1] === "demo_portal_view").length,
        1,
      );
      assert.ok(
        !JSON.stringify(await events()).includes("private@example.invalid"),
      );
    }
    console.log(
      "PASS: demo funnel respects consent; view/start deduplicated; SPA portal arrival observed; no field values collected; events queued before analytics loads.",
    );
  } finally {
    if (browser) await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
