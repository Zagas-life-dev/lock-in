"use client";
import { S } from "./store";
import { DEFAULT_REMINDERS, Reminder } from "./data";
import { getTasks, getTimer, keyOf, pad } from "./core";

// URL of the Cloudflare Worker that stores reminders and sends Web Push.
export const WORKER = (process.env.NEXT_PUBLIC_WORKER_URL || "").replace(/\/$/, "");

export const getReminders = () => S.get<Reminder[]>("reminders", DEFAULT_REMINDERS);
export const setReminders = (r: Reminder[]) => S.set("reminders", r);
export const pushOn = () => S.get<boolean>("pushOn", false);

/** Everything the Worker should fire: recurring reminders, task due times and the running focus timer. */
export function payload() {
  const out: { id: string; title: string; body: string; time?: string; days?: number[]; at?: number }[] = [];
  for (const r of getReminders()) if (r.on) out.push({ id: r.id, title: r.title, body: r.body, time: r.time, days: r.days });
  for (const t of getTasks()) if (!t.done && t.due && t.due > Date.now() - 6e4) out.push({ id: "t-" + t.id, title: "To-do", body: t.text, at: t.due });
  const T = getTimer();
  if (T.mode === "work") out.push({ id: "focus-" + T.end, title: "Focus session done", body: "Take your break. Stand up, drink water.", at: T.end });
  if (T.mode === "break") out.push({ id: "break-" + T.end, title: "Break over", body: "Ready for another round?", at: T.end });
  return out;
}

const b64uToU8 = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export async function registerSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js?w=" + encodeURIComponent(WORKER));
  } catch {
    return null;
  }
}

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function enablePush() {
  if (!WORKER) throw new Error("No Worker URL set. Add NEXT_PUBLIC_WORKER_URL and rebuild.");
  if (!pushSupported()) throw new Error("This browser can't do push. On iPhone, add to Home Screen first.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked for this site.");
  const reg = (await registerSW()) && (await navigator.serviceWorker.ready);
  const { key } = await (await fetch(WORKER + "/vapid")).json();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(key) });
  S.set("pushOn", true);
  await syncNow();
}

export async function disablePush() {
  S.set("pushOn", false);
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(WORKER + "/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe();
    }
  } catch {}
}

let last = "";
export async function syncNow(force = false) {
  if (!WORKER || !pushOn() || !pushSupported()) return;
  const reminders = payload();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sig = JSON.stringify({ reminders, tz });
  if (!force && sig === last) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const r = await fetch(WORKER + "/sync", { method: "POST", body: JSON.stringify({ subscription: sub.toJSON(), tz, reminders }) });
  if (r.ok) last = sig;
}

let syncT: ReturnType<typeof setTimeout>;
export const scheduleSync = () => {
  clearTimeout(syncT);
  syncT = setTimeout(() => syncNow().catch(() => {}), 1200);
};

export async function testPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) throw new Error("Not subscribed yet.");
  const r = await fetch(WORKER + "/test", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
  if (!r.ok) throw new Error("Worker said " + r.status);
}

export async function localNotify(title: string, body: string, tag?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.getRegistration();
  const opts = { body, tag, icon: "/pwa-192.png", badge: "/pwa-192.png" };
  if (reg) reg.showNotification(title, opts);
  else new Notification(title, opts);
}

/**
 * Fallback while the app is open and push is off: fire due reminders locally.
 * Called every ~20s by the app shell.
 */
export function localTick() {
  if (pushOn() || typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const now = new Date(),
    hm = pad(now.getHours()) + ":" + pad(now.getMinutes()),
    stamp = keyOf(now) + " " + hm;
  const fired = S.get<Record<string, string>>("localFired", {});
  let changed = false;
  for (const r of payload()) {
    const due = r.at ? r.at <= now.getTime() && now.getTime() - r.at < 5 * 6e4 : r.time === hm && (!r.days?.length || r.days.includes(now.getDay()));
    const mark = r.at ? "once" : stamp;
    if (due && fired[r.id] !== mark) {
      fired[r.id] = mark;
      changed = true;
      localNotify(r.title, r.body, r.id);
    }
  }
  if (changed) S.set("localFired", fired);
}
