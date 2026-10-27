"use client";
import { S } from "./store";
import { DayType, LEVELS, PRESETS, SCHEDS, Slot, WORKOUTS } from "./data";

export const pad = (n: number) => String(n).padStart(2, "0");
export const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (k: string, n: number) => {
  const d = new Date(k + "T00:00:00");
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
export const todayKey = () => keyOf(new Date());
export const fmtDate = (k: string, o?: Intl.DateTimeFormatOptions) =>
  new Date(k + "T00:00:00").toLocaleDateString(undefined, o || { weekday: "short", day: "numeric", month: "short" });
export const fmtMin = (m: number) => {
  const h = Math.floor(m / 60),
    mm = m % 60;
  return (h % 12 || 12) + ":" + pad(mm) + (h < 12 ? "am" : "pm");
};
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const esc = (s: unknown) => String(s ?? "");

export const getStart = () => S.get<string>("start", todayKey());
export const isLive = () => todayKey() >= getStart();
export const dayNum = (k = todayKey()) =>
  Math.round((new Date(k + "T00:00:00").getTime() - new Date(getStart() + "T00:00:00").getTime()) / 864e5) + 1;
export const userName = () => S.get<string>("name", "Kachi");

/* DAY RECORDS */
export type Review = { rate: number; done: string; win: string; fix: string; at: number };
export type Day = {
  h: Record<string, boolean>;
  w: number;
  meals: Record<string, number | undefined>;
  sets: Record<string, number>;
  sessions: { at: number; m: number; task: string }[];
  focus: number;
  type?: DayType;
  note?: string;
  prio?: string;
  asked?: boolean;
  review?: Review;
};
export function getDay(k: string): Day {
  const d = S.get<Partial<Day>>("d:" + k, null) || {};
  return { h: {}, w: 0, meals: {}, sets: {}, sessions: [], focus: 0, ...d } as Day;
}
export const saveDay = (k: string, d: Day) => S.set("d:" + k, d);
export function updateDay(k: string, fn: (d: Day) => void) {
  const d = getDay(k);
  fn(d);
  saveDay(k, d);
  return d;
}
export const typeOf = (k: string): DayType => getDay(k).type || "home";
export const dayKeys = () => S.keys("d:").map((k) => k.slice(2));

/* HABITS + XP */
export type Habit = { id: string; t: string; s: string; xp: number; sheet?: boolean };
export function habitsFor(k: string): Habit[] {
  const t = typeOf(k),
    w = WORKOUTS[new Date(k + "T00:00:00").getDay()];
  const tail: Habit[] = [
    { id: "clean", t: "No sugar, fried food or alcohol", s: "All day, no exceptions", xp: 15 },
    { id: "nf", t: "No Fap: clean today", s: "Energy stays in the mission", xp: 15 },
    { id: "wind", t: "Skincare + 10 min stretch", s: "Wind down properly", xp: 5 },
    { id: "sleep", t: "In bed by 11", s: "7 to 9 hours", xp: 10 },
    { id: "review", t: "End-of-day review", s: "Tap to put your day in order", xp: 15, sheet: true },
  ];
  if (t === "out")
    return [
      { id: "train", t: "Quick 20-min workout", s: "Short version of " + w.name.toLowerCase(), xp: 20 },
      { id: "bf", t: "Breakfast before leaving", s: "Protein in it", xp: 5 },
      { id: "pack", t: "Packed snacks + water", s: "Banana, eggs, bottle", xp: 5 },
      { id: "deep", t: "One startup task done", s: "Even on the move", xp: 15 },
      { id: "main", t: "Lunch by 5:30", s: "Grilled or pepper soup, no soft drink", xp: 5 },
      { id: "dinner", t: "Light dinner", s: "Small, protein + veg", xp: 5 },
      ...tail,
    ];
  if (t === "shoot")
    return [
      { id: "walk", t: "Light morning walk", s: "15 min, no hard training", xp: 10 },
      { id: "bf", t: "Light breakfast, low salt", s: "Eggs + fruit", xp: 5 },
      { id: "pre", t: "Light meal 2 to 3 hrs before", s: "Then small sips of water", xp: 5 },
      { id: "pump", t: "Push-up pump before photos", s: "2 to 3 sets, 20 min before", xp: 10 },
      { id: "main", t: "Proper meal after", s: "Protein + carbs", xp: 5 },
      ...tail,
    ];
  return [
    { id: "walk", t: "Morning walk", s: "30 to 40 min, easy pace", xp: 10 },
    { id: "deep", t: "Startup deep work", s: "Auto-ticks at 90 focus minutes", xp: 15 },
    { id: "bf", t: "Breakfast with protein", s: "Pick it in the Eat tab", xp: 5 },
    { id: "train", t: w.rest ? "Long walk + stretch" : "Workout: " + w.name, s: w.rest ? "Rest day, still move" : "Tick your sets in Train", xp: 20 },
    { id: "main", t: "Lunch by 1pm", s: "Biggest meal of the day", xp: 5 },
    { id: "dinner", t: "Dinner after training", s: "Protein + veg, done by 8pm", xp: 5 },
    ...tail,
  ];
}
export function pctOf(k: string) {
  const d = getDay(k),
    hs = habitsFor(k);
  return Math.round(((hs.filter((h) => d.h[h.id]).length + Math.min(d.w, 8) / 8) / (hs.length + 1)) * 100);
}
export function xpOf(k: string) {
  const d = getDay(k);
  let x = 0;
  habitsFor(k).forEach((h) => {
    if (d.h[h.id]) x += h.xp;
  });
  x += Math.min(d.w, 8) * 2 + Math.min(40, Math.floor(d.focus / 5));
  x += Math.min(30, tasksDoneOn(k) * 5);
  if (pctOf(k) === 100) x += 25;
  return x;
}
export function totalXP() {
  const st = getStart(),
    tk = todayKey();
  return dayKeys()
    .filter((k) => k >= st && k <= tk)
    .reduce((a, k) => a + xpOf(k), 0);
}
export function streak() {
  const st = getStart();
  let n = 0,
    k = todayKey();
  if (pctOf(k) < 70) k = addDays(k, -1);
  while (k >= st && pctOf(k) >= 70) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}
export function level() {
  const tx = totalXP(),
    lv = Math.min(LEVELS.length, Math.floor(tx / 150) + 1);
  return { tx, lv, name: LEVELS[lv - 1], into: tx % 150, maxed: lv >= LEVELS.length };
}
export function curIdx(sc: Slot[], now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  let ci = -1;
  sc.forEach((s, i) => {
    if (m >= s[0]) ci = i;
  });
  return ci;
}
export const schedFor = (k: string) => SCHEDS[typeOf(k)];

/* TASKS */
export type Task = { id: string; text: string; done: boolean; due?: number; created: number; doneAt?: number };
export const getTasks = () => S.get<Task[]>("tasks", []);
export const setTasks = (t: Task[]) => S.set("tasks", t);
export const tasksDoneOn = (k: string) => getTasks().filter((t) => t.doneAt && keyOf(new Date(t.doneAt)) === k).length;

/* FOCUS TIMER */
export type Timer = { preset: number; mode: "idle" | "work" | "break"; end: number; len: number; task: string };
export const getTimer = () => S.get<Timer>("timer", { preset: 0, mode: "idle", end: 0, len: 25, task: "" });
export const setTimer = (t: Timer) => S.set("timer", t);
export function logFocus(m: number, task: string): string {
  const k = todayKey();
  let msg = m + " min logged. +" + Math.floor(m / 5) + " XP";
  updateDay(k, (d) => {
    d.focus += m;
    d.sessions.push({ at: Date.now(), m, task });
    if (d.focus >= 90 && habitsFor(k).some((h) => h.id === "deep") && !d.h.deep) {
      d.h.deep = true;
      msg = "90 minutes in. Deep work ticked. +15 XP";
    }
  });
  return msg;
}
/** Advances the focus timer; returns a toast message when a phase ends. */
export function tickFocus(): string | null {
  const T = getTimer();
  if (T.mode === "idle" || Date.now() < T.end) return null;
  if (T.mode === "work") {
    const msg = logFocus(T.len, T.task);
    const br = PRESETS[T.preset][1];
    setTimer({ ...T, mode: "break", len: br, end: Date.now() + br * 6e4 });
    return msg;
  }
  setTimer({ ...T, mode: "idle" });
  return "Break over. Ready for another round?";
}

/* NO FAP */
export type NF = { start: number; best: number; resets: number; seen: number };
export function nfState(): NF {
  let st = S.get<NF>("nf", null);
  if (!st) {
    st = { start: new Date(getStart() + "T00:00:00").getTime(), best: 0, resets: 0, seen: 0 };
    S.set("nf", st);
  }
  return st;
}
export const nfDays = (st: NF) => Math.max(0, Math.floor((Date.now() - st.start) / 864e5));
