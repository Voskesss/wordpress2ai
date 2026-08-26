import crypto from "node:crypto";

const API = "https://api.github.com";
export const GITHUB_ORG = "wordpress2ai";

function b64url(data: Buffer | string) {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function appJwt(): string {
  const appId = process.env.GITHUB_APP_ID;
  const keyB64 = process.env.GITHUB_APP_PRIVATE_KEY_BASE64;
  if (!appId || !keyB64) throw new Error("GitHub App env vars ontbreken");
  const privateKey = Buffer.from(keyB64, "base64").toString("utf8");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })
  );
  const signingInput = `${header}.${payload}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey);
  return `${signingInput}.${b64url(signature)}`;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Kortlevend installation token (1 uur), gecachet tot 5 min voor expiry. */
export async function installationToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60_000) {
    return cachedToken.token;
  }
  const instId = process.env.GITHUB_APP_INSTALLATION_ID;
  const res = await fetch(
    `${API}/app/installations/${instId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appJwt()}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) throw new Error(`Token ophalen mislukt: ${res.status}`);
  const data = (await res.json()) as { token: string; expires_at: string };
  cachedToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
  };
  return data.token;
}

export async function gh(
  path: string,
  init: RequestInit & { raw?: boolean } = {}
) {
  // GitHub's secondary rate limit (403/429 bij veel schrijfacties) is tijdelijk:
  // wachten en opnieuw proberen in plaats van de hele bouw laten falen.
  for (let poging = 1; ; poging++) {
    const token = await installationToken();
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: init.raw
          ? "application/vnd.github.raw+json"
          : "application/vnd.github+json",
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      const rateLimit =
        (res.status === 403 || res.status === 429) &&
        /rate limit/i.test(body);
      if (rateLimit && poging <= 4) {
        const retryAfter = Number(res.headers.get("retry-after"));
        const wacht = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30 * poging) * 1000;
        await new Promise((r) => setTimeout(r, Math.min(wacht, 120_000)));
        continue;
      }
      throw new Error(`GitHub ${init.method ?? "GET"} ${path}: ${res.status} ${body.slice(0, 300)}`);
    }
    return init.raw ? res.text() : res.json();
  }
}

/** Leest een bestand uit een repo (branch optioneel). */
export async function leesBestand(
  repo: string,
  pad: string,
  branch?: string
): Promise<string> {
  const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  return (await gh(`/repos/${GITHUB_ORG}/${repo}/contents/${pad}${ref}`, {
    raw: true,
  })) as string;
}

/** Schrijft (maakt of overschrijft) een bestand op een branch. */
export async function schrijfBestand(
  repo: string,
  pad: string,
  inhoud: string | Buffer,
  bericht: string,
  branch: string
) {
  let sha: string | undefined;
  try {
    const bestaand = (await gh(
      `/repos/${GITHUB_ORG}/${repo}/contents/${pad}?ref=${encodeURIComponent(branch)}`
    )) as { sha: string };
    sha = bestaand.sha;
  } catch {
    // bestand bestaat nog niet
  }
  return gh(`/repos/${GITHUB_ORG}/${repo}/contents/${pad}`, {
    method: "PUT",
    body: JSON.stringify({
      message: bericht,
      content: Buffer.from(inhoud).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
}

/** Lijst van alle bestandspaden in de repo (default branch of gegeven branch). */
export async function lijstBestanden(
  repo: string,
  branch?: string
): Promise<string[]> {
  const repoInfo = (await gh(`/repos/${GITHUB_ORG}/${repo}`)) as {
    default_branch: string;
  };
  const ref = branch ?? repoInfo.default_branch;
  const tree = (await gh(
    `/repos/${GITHUB_ORG}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
  )) as { tree: { path: string; type: string }[] };
  return tree.tree.filter((t) => t.type === "blob").map((t) => t.path);
}

/** Maakt een branch vanaf de default branch. */
export async function maakBranch(repo: string, naam: string) {
  const repoInfo = (await gh(`/repos/${GITHUB_ORG}/${repo}`)) as {
    default_branch: string;
  };
  const ref = (await gh(
    `/repos/${GITHUB_ORG}/${repo}/git/ref/heads/${repoInfo.default_branch}`
  )) as { object: { sha: string } };
  return gh(`/repos/${GITHUB_ORG}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${naam}`, sha: ref.object.sha }),
  });
}

/** Opent een pull request. */
export async function maakPullRequest(
  repo: string,
  branch: string,
  titel: string,
  omschrijving: string
) {
  const repoInfo = (await gh(`/repos/${GITHUB_ORG}/${repo}`)) as {
    default_branch: string;
  };
  return gh(`/repos/${GITHUB_ORG}/${repo}/pulls`, {
    method: "POST",
    body: JSON.stringify({
      title: titel,
      body: omschrijving,
      head: branch,
      base: repoInfo.default_branch,
    }),
  });
}

/** Merget een pull request (de Publiceer-knop). */
export async function mergePullRequest(repo: string, prNumber: number) {
  return gh(`/repos/${GITHUB_ORG}/${repo}/pulls/${prNumber}/merge`, {
    method: "PUT",
    body: JSON.stringify({ merge_method: "squash" }),
  });
}

/** Maakt een nieuwe (private) klant-repo aan in de organisatie. */
export async function maakKlantRepo(naam: string, omschrijving: string) {
  return gh(`/orgs/${GITHUB_ORG}/repos`, {
    method: "POST",
    body: JSON.stringify({
      name: naam,
      description: omschrijving,
      private: true,
      auto_init: true,
    }),
  });
}

/** Pusht meerdere bestanden als één commit (Git Data API — veel sneller dan per bestand). */
export async function pushBestanden(
  repo: string,
  bestanden: { pad: string; inhoud: Buffer }[],
  bericht: string,
  branch = "main"
) {
  const repoInfo = (await gh(`/repos/${GITHUB_ORG}/${repo}`)) as {
    default_branch: string;
  };
  const ref = (await gh(
    `/repos/${GITHUB_ORG}/${repo}/git/ref/heads/${branch ?? repoInfo.default_branch}`
  )) as { object: { sha: string } };
  const basisCommit = (await gh(
    `/repos/${GITHUB_ORG}/${repo}/git/commits/${ref.object.sha}`
  )) as { tree: { sha: string } };

  // Blobs in kleine groepjes aanmaken — meer parallel triggert GitHub's
  // secondary rate limit bij sites met veel media
  const blobs: { path: string; mode: string; type: string; sha: string }[] = [];
  for (let i = 0; i < bestanden.length; i += 3) {
    const groep = bestanden.slice(i, i + 3);
    const resultaten = await Promise.all(
      groep.map(async (b) => {
        const blob = (await gh(`/repos/${GITHUB_ORG}/${repo}/git/blobs`, {
          method: "POST",
          body: JSON.stringify({
            content: b.inhoud.toString("base64"),
            encoding: "base64",
          }),
        })) as { sha: string };
        return { path: b.pad, mode: "100644", type: "blob", sha: blob.sha };
      })
    );
    blobs.push(...resultaten);
  }

  const tree = (await gh(`/repos/${GITHUB_ORG}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: basisCommit.tree.sha, tree: blobs }),
  })) as { sha: string };

  const commit = (await gh(`/repos/${GITHUB_ORG}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: bericht,
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  })) as { sha: string };

  return gh(`/repos/${GITHUB_ORG}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
}

/** Bestaat de repo al in de organisatie? */
export async function repoBestaat(repo: string): Promise<boolean> {
  try {
    await gh(`/repos/${GITHUB_ORG}/${repo}`);
    return true;
  } catch {
    return false;
  }
}

/** Verwijdert een branch (opruimen na publiceren of verwerpen). */
export async function verwijderBranch(repo: string, branch: string) {
  return gh(`/repos/${GITHUB_ORG}/${repo}/git/refs/heads/${branch}`, {
    method: "DELETE",
  }).catch(() => {});
}
