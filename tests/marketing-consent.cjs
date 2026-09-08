const { transformSync } = require("esbuild");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const assert = require("node:assert/strict");
const code = transformSync(readFileSync("app/MarketingEvents.tsx", "utf8"), {
  loader: "tsx",
  format: "cjs",
}).code;
let consent = null;
const sent = [];
const moduleState = { exports: {} };
const storage = {
  getItem() {
    return consent;
  },
};
runInNewContext(code, {
  module: moduleState,
  exports: moduleState.exports,
  require(name) {
    assert.equal(name, "react");
    return { useEffect() {} };
  },
  localStorage: storage,
  window: {
    gtag(...args) {
      sent.push(args);
    },
  },
});
const { trackMarketing } = moduleState.exports;
trackMarketing("generate_lead");
assert.equal(sent.length, 0);
consent = "nee";
trackMarketing("generate_lead");
assert.equal(sent.length, 0);
consent = "ja";
trackMarketing("generate_lead", { form_name: "websitecheck" });
assert.equal(sent.length, 1);
assert.equal(sent[0][0], "event");
assert.equal(sent[0][1], "generate_lead");
storage.getItem = () => {
  throw Error("storage blocked");
};
assert.doesNotThrow(() => trackMarketing("generate_lead"));
assert.equal(sent.length, 1);
console.log(
  "PASS: no tracking before consent, no tracking after refusal, event after consent, blocked storage handled. No analytics requests sent.",
);
