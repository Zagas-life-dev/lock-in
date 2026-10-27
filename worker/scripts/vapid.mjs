// Generates a VAPID key pair for Web Push.
// Usage: node scripts/vapid.mjs [--write]   (--write updates wrangler.toml and .dev.vars)
import { webcrypto as c } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const kp = await c.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = Buffer.from(await c.subtle.exportKey("raw", kp.publicKey)).toString("base64url");
const jwk = JSON.stringify(await c.subtle.exportKey("jwk", kp.privateKey));

if (process.argv.includes("--write")) {
  const toml = readFileSync("wrangler.toml", "utf8").replace(/VAPID_PUBLIC_KEY = ".*"/, `VAPID_PUBLIC_KEY = "${pub}"`);
  writeFileSync("wrangler.toml", toml);
  writeFileSync(".dev.vars", `VAPID_PRIVATE_JWK='${jwk}'\n`);
  console.log("Wrote public key to wrangler.toml and private key to .dev.vars");
  console.log("For production run:  npx wrangler secret put VAPID_PRIVATE_JWK   and paste the line from .dev.vars (without the quotes).");
} else {
  console.log("VAPID_PUBLIC_KEY =", pub);
  console.log("VAPID_PRIVATE_JWK =", jwk);
}
