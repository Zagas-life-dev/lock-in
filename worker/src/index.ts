/**
 * Lock In reminders Worker.
 *
 * The app syncs its reminder list here. A cron trigger runs every minute,
 * finds reminders due in each user's own timezone, queues the message, and
 * sends a payload-less Web Push. The service worker then calls /pending to
 * fetch the text. No payload means no message encryption is needed, only a
 * VAPID-signed request.
 */

export interface Env {
  KV: KVNamespace;
  VAPID_PUBLIC_KEY: string; // base64url, uncompressed P-256 point
  VAPID_PRIVATE_JWK: string; // secret: JSON JWK of the private key
  VAPID_SUBJECT: string; // mailto: or https: contact
  ALLOWED_ORIGIN?: string;
}

type Rem = { id: string; title: string; body?: string; time?: string; days?: number[]; at?: number; url?: string };
type Msg = { id: string; title: string; body: string; url?: string };
type Sub = { endpoint: string; keys?: { p256dh: string; auth: string } };
type User = { sub: Sub; tz: string; reminders: Rem[]; fired: Record<string, string>; pending: Msg[]; updated: number };

const INDEX = "index";
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const cors = (env: Env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
});
const json = (env: Env, d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json", ...cors(env) } });

const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const enc = new TextEncoder();

async function idFor(endpoint: string) {
  const h = await crypto.subtle.digest("SHA-256", enc.encode(endpoint));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function getIndex(env: Env): Promise<string[]> {
  return (await env.KV.get<string[]>(INDEX, "json")) || [];
}
async function setIndex(env: Env, ids: string[]) {
  await env.KV.put(INDEX, JSON.stringify([...new Set(ids)]));
}
const getUser = (env: Env, id: string) => env.KV.get<User>("u:" + id, "json");
const putUser = (env: Env, id: string, u: User) => env.KV.put("u:" + id, JSON.stringify(u));
async function dropUser(env: Env, id: string) {
  await env.KV.delete("u:" + id);
  await setIndex(env, (await getIndex(env)).filter((x) => x !== id));
}

/* VAPID: ES256-signed JWT for the push service's origin. */
let keyCache: CryptoKey | null = null;
async function vapidHeader(env: Env, endpoint: string) {
  keyCache ||= await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT }))
  );
  // WebCrypto returns the raw r||s signature, which is what JWT ES256 expects.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyCache, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC_KEY}`;
}

/** Sends an empty push. Returns false when the subscription is gone. */
async function push(env: Env, sub: Sub): Promise<boolean> {
  try {
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: { Authorization: await vapidHeader(env, sub.endpoint), TTL: "86400", Urgency: "high", "Content-Length": "0" },
    });
    if (r.status === 404 || r.status === 410) return false;
    if (!r.ok) console.log("push failed", r.status, await r.text());
  } catch (e) {
    console.log("push error", String(e));
  }
  return true;
}

/** Local date, HH:MM and weekday for a timezone. */
function localParts(now: Date, tz: string) {
  let p: Intl.DateTimeFormatPart[];
  try {
    p = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short",
    }).formatToParts(now);
  } catch {
    return localParts(now, "UTC");
  }
  const g = (t: string) => p.find((x) => x.type === t)?.value || "";
  const hour = g("hour") === "24" ? "00" : g("hour");
  return { date: `${g("year")}-${g("month")}-${g("day")}`, min: +hour * 60 + +g("minute"), wd: WD.indexOf(g("weekday")) };
}

/** Marks due reminders as fired and queues their messages. Returns how many fired. */
export function collectDue(u: User, now: Date): number {
  const { date, min, wd } = localParts(now, u.tz);
  let n = 0;
  for (const r of u.reminders) {
    let mark = "";
    if (r.at) {
      // One-off (to-do due time, focus timer). Skip if more than 6h stale.
      if (r.at <= now.getTime() && now.getTime() - r.at < 6 * 36e5) mark = "once";
    } else if (r.time && (!r.days?.length || r.days.includes(wd))) {
      const [h, m] = r.time.split(":").map(Number);
      // Up to 3 minutes late, in case a cron tick is skipped.
      const late = min - (h * 60 + m);
      if (late >= 0 && late < 3) mark = date + " " + r.time;
    }
    if (mark && u.fired[r.id] !== mark) {
      u.fired[r.id] = mark;
      u.pending.push({ id: r.id, title: r.title, body: r.body || "", url: r.url });
      n++;
    }
  }
  u.pending = u.pending.slice(-10);
  return n;
}

async function runDue(env: Env, now: Date) {
  const ids = await getIndex(env);
  for (const id of ids) {
    const u = await getUser(env, id);
    if (!u) {
      await dropUser(env, id);
      continue;
    }
    if (!collectDue(u, now)) continue;
    await putUser(env, id, u);
    if (!(await push(env, u.sub))) await dropUser(env, id);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (req.method === "GET" && url.pathname === "/") return json(env, { ok: true, app: "lock-in-reminders" });
    if (req.method === "GET" && url.pathname === "/vapid") return json(env, { key: env.VAPID_PUBLIC_KEY });
    if (req.method !== "POST") return json(env, { error: "not found" }, 404);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(env, { error: "bad json" }, 400);
    }

    if (url.pathname === "/sync") {
      const sub: Sub = body.subscription;
      if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint)) return json(env, { error: "subscription required" }, 400);
      const id = await idFor(sub.endpoint);
      const prev = await getUser(env, id);
      const reminders: Rem[] = (Array.isArray(body.reminders) ? body.reminders : []).slice(0, 200).map((r: any) => ({
        id: String(r.id).slice(0, 80),
        title: String(r.title || "Lock In").slice(0, 120),
        body: String(r.body || "").slice(0, 300),
        time: typeof r.time === "string" && /^\d\d:\d\d$/.test(r.time) ? r.time : undefined,
        days: Array.isArray(r.days) ? r.days.filter((d: any) => Number.isInteger(d) && d >= 0 && d < 7) : [],
        at: typeof r.at === "number" ? r.at : undefined,
      }));
      const keep = new Set(reminders.map((r) => r.id));
      const fired = Object.fromEntries(Object.entries(prev?.fired || {}).filter(([k]) => keep.has(k)));
      const u: User = { sub, tz: String(body.tz || "UTC"), reminders, fired, pending: prev?.pending || [], updated: Date.now() };
      await putUser(env, id, u);
      if (!prev) await setIndex(env, [...(await getIndex(env)), id]);
      return json(env, { ok: true, id, count: reminders.length });
    }

    if (url.pathname === "/pending") {
      if (!body.endpoint) return json(env, [], 400);
      const id = await idFor(body.endpoint);
      const u = await getUser(env, id);
      if (!u || !u.pending.length) return json(env, []);
      const out = u.pending;
      u.pending = [];
      await putUser(env, id, u);
      return json(env, out);
    }

    if (url.pathname === "/test") {
      if (!body.endpoint) return json(env, { error: "endpoint required" }, 400);
      const id = await idFor(body.endpoint);
      const u = await getUser(env, id);
      if (!u) return json(env, { error: "not subscribed" }, 404);
      u.pending.push({ id: "test", title: "Lock In", body: "Push works. You're locked in." });
      await putUser(env, id, u);
      const ok = await push(env, u.sub);
      return json(env, { ok });
    }

    if (url.pathname === "/unsubscribe") {
      if (body.endpoint) await dropUser(env, await idFor(body.endpoint));
      return json(env, { ok: true });
    }

    return json(env, { error: "not found" }, 404);
  },

  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runDue(env, new Date(event.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
