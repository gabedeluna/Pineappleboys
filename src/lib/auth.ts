import crypto from "crypto";

const ALG = "sha256";

type SessionPayload = {
  u: string;
  exp: number; // unix seconds
};

export function createSessionToken(
  username: string,
  secret: string,
  ttlSeconds: number,
) {
  const payload: SessionPayload = {
    u: username,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string, secret: string) {
  if (!token || !secret) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = sign(encoded, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string) {
  return crypto.createHmac(ALG, secret).update(value).digest("base64url");
}

function timingSafeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
