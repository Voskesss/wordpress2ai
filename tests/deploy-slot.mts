import assert from "node:assert/strict";
import { DeploySlotBezet, deployTotActueel, metSlot, wachtOpSlot } from "../lib/deploy-slot";

/** Nep-slot zoals claimOperation: null als bezet, anders een vrijgeef-functie. */
function nepSlot() {
  let bezet = false;
  return {
    get bezet() {
      return bezet;
    },
    pak: async () => {
      if (bezet) return null;
      bezet = true;
      return async () => {
        bezet = false;
      };
    },
  };
}
const echtSlapen = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Twee deploys tegelijk voor dezelfde worker lopen na elkaar, nooit door elkaar
{
  const slot = nepSlot();
  const log: string[] = [];
  let tegelijk = 0;
  let maxTegelijk = 0;
  const deploy = (id: string) =>
    metSlot(slot.pak, "wv-test", async () => {
      tegelijk++;
      maxTegelijk = Math.max(maxTegelijk, tegelijk);
      log.push(`start ${id}`);
      await echtSlapen(15);
      log.push(`klaar ${id}`);
      tegelijk--;
      return id;
    }, { pauzeMs: 2, slaap: echtSlapen });
  const uit = await Promise.all([deploy("a"), deploy("b"), deploy("c")]);
  assert.deepEqual(uit, ["a", "b", "c"]);
  assert.equal(maxTegelijk, 1);
  for (let i = 0; i < log.length; i += 2) {
    assert.match(log[i], /^start /);
    assert.equal(log[i + 1], log[i].replace("start", "klaar"));
  }
  assert.equal(slot.bezet, false);
}

// Mislukt de deploy, dan komt het slot toch vrij
{
  const slot = nepSlot();
  await assert.rejects(
    metSlot(slot.pak, "x", async () => {
      throw new Error("R2 stuk");
    }),
    /R2 stuk/,
  );
  assert.equal(slot.bezet, false);
}

// Blijft het slot bezet, dan na de maximale wachttijd een duidelijke fout
{
  let pogingen = 0;
  await assert.rejects(
    wachtOpSlot(async () => (pogingen++, null), "roelart", { pauzeMs: 10, maxWachtMs: 30, slaap: async () => {} }),
    (e: unknown) => e instanceof DeploySlotBezet && /roelart/.test((e as Error).message),
  );
  assert.equal(pogingen, 4);
}

// Branch niet veranderd → precies één deploy, van de exacte commit
{
  const gedeployd: (string | null)[] = [];
  await deployTotActueel({
    leesSha: async () => "aaa",
    deploy: async (sha) => void gedeployd.push(sha),
  });
  assert.deepEqual(gedeployd, ["aaa"]);
}

// Push tijdens de deploy → nog een ronde met de nieuwste commit
{
  const shas = ["aaa", "bbb", "bbb"];
  const gedeployd: (string | null)[] = [];
  await deployTotActueel({
    leesSha: async () => shas.shift() ?? "bbb",
    deploy: async (sha) => void gedeployd.push(sha),
  });
  assert.deepEqual(gedeployd, ["aaa", "bbb"]);
}

// Blijft de branch veranderen → stopt na maxRondes (geen eindeloze lus)
{
  let teller = 0;
  const gedeployd: (string | null)[] = [];
  await deployTotActueel({
    leesSha: async () => `sha${teller++}`,
    deploy: async (sha) => void gedeployd.push(sha),
    maxRondes: 3,
  });
  assert.equal(gedeployd.length, 3);
}

// Commit onbekend (GitHub-storing) → gewoon één deploy zonder controle
{
  const gedeployd: (string | null)[] = [];
  await deployTotActueel({
    leesSha: async () => null,
    deploy: async (sha) => void gedeployd.push(sha),
  });
  assert.deepEqual(gedeployd, [null]);
}

console.log("deploy-slot: alle tests geslaagd");
