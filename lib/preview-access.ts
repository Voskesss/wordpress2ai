import { createHmac, timingSafeEqual } from "node:crypto";
function signature(payload: string) {
  const key = process.env.PREVIEW_SIGNING_SECRET ?? process.env.CRON_SECRET;
  if (!key) throw new Error("Preview-signingsleutel ontbreekt");
  return createHmac("sha256", key)
    .update(`wordswap-preview-v1:${payload}`)
    .digest("base64url");
}
/** Short-lived, read-only capability for cookie-less sandbox navigation. */
export function createPreviewAccess(
  siteId: number,
  userId: string,
  now = Date.now(),
) {
  const payload = `${siteId}~${Math.floor(now / 1000) + 3600}~${Buffer.from(userId).toString("base64url")}`;
  return `${payload}~${signature(payload)}`;
}
export function verifyPreviewAccess(value: string, now = Date.now()) {
  const parts = value.split("~");
  if (parts.length !== 4) return null;
  const [site, expires, encoded, digest] = parts;
  const id = Number(site),
    expiry = Number(expires);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !Number.isSafeInteger(expiry) ||
    expiry <= now / 1000 ||
    expiry > now / 1000 + 3600
  )
    return null;
  const expected = Buffer.from(signature(parts.slice(0, 3).join("~")));
  const received = Buffer.from(digest);
  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  )
    return null;
  const userId = Buffer.from(encoded, "base64url").toString();
  return userId ? { siteId: id, userId } : null;
}
