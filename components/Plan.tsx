"use client";
import { useRef, useState } from "react";
import { Seg, useUI } from "./ui";
import { CheckinSheet } from "./sheets";
import { DAYS, DayType, DEFAULT_REMINDERS, Reminder, SCHEDS, TYPES } from "@/lib/data";
import { addDays, curIdx, dayNum, fmtDate, fmtMin, getDay, getStart, isLive, keyOf, nfDays, nfState, todayKey, typeOf, uid, userName } from "@/lib/core";
import { S } from "@/lib/store";
import { disablePush, enablePush, getReminders, localNotify, pushOn, pushSupported, setReminders, testPush, WORKER } from "@/lib/push";
import { buzz } from "@/lib/fx";

export default function Plan({ install }: { install: (() => void) | null }) {
  const { open, toast } = useUI();
  const TK = todayKey(),
    start = getStart(),
    first = isLive() ? TK : start;
  const [view, setView] = useState<DayType>(typeOf(TK));
  const sc = SCHEDS[view],
    ci = view === typeOf(TK) ? curIdx(sc) : -1;
  const theme = S.get<string>("theme", "auto");

  return (
    <section className="page">
      <h1>Plan</h1>
      <p className="lead">14 days to lose the bloat, drop some fat and look tight for agency season.</p>

      <h2>Plan ahead</h2>
      <p className="small mute" style={{ margin: "-4px 2px 10px" }}>Tap any day to set it as a home, out or shoot day.</p>
      <div className="card tight">
        {Array.from({ length: 14 }, (_, i) => {
          const k = addDays(first, i),
            d = getDay(k),
            dn = dayNum(k);
          return (
            <div key={k} className={"prow" + (k === TK ? " today" : "")} onClick={() => open(<CheckinSheet k={k} />)}>
              <div className="pd">
                <small>{fmtDate(k, { weekday: "short" })}</small>
                <b>{new Date(k + "T00:00:00").getDate()}</b>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{d.type ? TYPES[d.type].e + " " + TYPES[d.type].l : <span className="mute" style={{ fontWeight: 600 }}>🏠 Home (default)</span>}</b>
                {d.prio && <div className="small ell">{d.prio}</div>}
                {d.note && <div className="small mute ell">{d.note}</div>}
              </div>
              <span className="small mute mono">{dn >= 1 ? "D" + dn : ""}</span>
            </div>
          );
        })}
      </div>

      <h2>Schedules</h2>
      <Seg value={view} options={(Object.keys(TYPES) as DayType[]).map((t) => [t, TYPES[t].e + " " + TYPES[t].l.split(" ")[0]])} onChange={(v) => setView(v as DayType)} />
      <div className="card">
        <div className="tl">
          {sc.map((s, i) => (
            <div key={i} className={"ti" + (i === ci ? " cur" : i < ci ? " done" : "")}>
              <div className="small mute mono">{fmtMin(s[0])}</div>
              <b>{s[1]}</b>
              <div className="small mute">{s[2]}</div>
            </div>
          ))}
        </div>
      </div>

      <Reminders />

      <h2>The rules</h2>
      <div className="card tight">
        <ul className="clean">
          <li><b>Protein at every meal.</b> Chicken, eggs, fish, Greek yogurt. Skip beans for now.</li>
          <li><b>One carb portion per meal.</b> One Lebanese bread, a fist of rice, sweet potato or one ripe plantain.</li>
          <li><b>Low salt.</b> Easy on seasoning cubes and yaji.</li>
          <li><b>No sugar drinks, alcohol or fried food.</b></li>
          <li><b>No oil.</b> Boil, grill, steam or use a non-stick pan. Get fats from eggs, avocado and groundnuts.</li>
          <li><b>Water all day.</b> 8 glasses minimum.</li>
          <li><b>Sleep 7 to 9 hours.</b> Recovery is when the tone shows.</li>
          <li><b>Never crash diet.</b> Starving shows in your face first.</li>
        </ul>
      </div>
      <div className="card">
        <h3>Day before a shoot</h3>
        <p className="mute">Lower salt, skip raw cabbage and onions at night, drink plenty of water, sleep early.</p>
      </div>
      <div className="card warn">
        <h3>Ease off and eat more if you notice</h3>
        <p className="mute">Dizziness, constant headaches, weak workouts, bad sleep, or thinking about food all day. Fever or chills: get tested for malaria and rest. Don't train through it.</p>
      </div>

      <h2>Settings</h2>
      <div className="card">
        <label className="lbl" style={{ marginTop: 0 }}>Theme</label>
        <Seg
          value={theme}
          options={[["auto", "Auto"], ["dark", "Dark"], ["light", "Light"]]}
          onChange={(v) => S.set("theme", v)}
        />
        <label className="lbl">Your name</label>
        <input defaultValue={userName()} onBlur={(e) => S.set("name", e.target.value.trim() || "Kachi")} />
        <label className="lbl">Day 1 of the plan</label>
        <input type="date" value={start} onChange={(e) => e.target.value && S.set("start", e.target.value)} />
        <label className="lbl">No Fap streak started on</label>
        <input
          type="date"
          value={keyOf(new Date(nfState().start))}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            const st = nfState(),
              t = new Date(v + "T00:00:00").getTime();
            if (t > Date.now()) return toast("Pick today or an earlier date");
            S.set("nf", { ...st, start: t, best: Math.max(st.best, nfDays(st)) });
            toast("Streak start updated");
          }}
        />
      </div>

      <DataCard install={install} />
    </section>
  );
}

function Reminders() {
  const { toast } = useUI();
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const list = getReminders();
  const on = pushOn();
  const perm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";
  const upd = (id: string, patch: Partial<Reminder>) => setReminders(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const sorted = list.slice().sort((a, b) => a.time.localeCompare(b.time));

  const turnOn = async () => {
    setBusy(true);
    try {
      await enablePush();
      toast("Reminders on. They'll arrive even with the app closed.");
      buzz([20, 40, 20]);
    } catch (e) {
      toast(e.message || "Couldn't turn on push");
    }
    setBusy(false);
  };
  const localOnly = async () => {
    if (!("Notification" in window)) return toast("This browser has no notifications");
    const p = await Notification.requestPermission();
    if (p === "granted") {
      localNotify("Lock In", "Reminders will show while the app is open.");
      toast("Local reminders on");
    } else toast("Notifications are blocked for this site");
    S.set("permAsked", Date.now());
  };

  return (
    <>
      <h2>Reminders</h2>
      <div className="card hl">
        <div className="row between">
          <div className="status">
            <i className={on || perm === "granted" ? "on" : ""} />
            {on ? "Push on · via Cloudflare" : perm === "granted" ? "Local only · app must be open" : "Off"}
          </div>
          {on ? (
            <button className="mini" onClick={async () => { await disablePush(); toast("Push off"); }}>Turn off</button>
          ) : null}
        </div>
        <p className="small mute" style={{ marginTop: 8 }}>
          {WORKER
            ? "Push reminders come from your Cloudflare Worker, so they land even when the app is closed. To-dos with a time and focus timers ping you too."
            : "No Worker URL set yet, so reminders only fire while the app is open. Deploy the worker and set NEXT_PUBLIC_WORKER_URL to get real push."}
        </p>
        <div className="btns" style={{ marginTop: 12 }}>
          {!on && WORKER && pushSupported() && (
            <button className="btn" disabled={busy} onClick={turnOn}>
              {busy ? "Connecting..." : "Turn on push reminders"}
            </button>
          )}
          {!on && perm !== "granted" && (
            <button className={"btn" + (WORKER && pushSupported() ? " ghost" : "")} onClick={localOnly}>
              Allow notifications
            </button>
          )}
          {on && (
            <button
              className="btn ghost"
              onClick={() => testPush().then(() => toast("Test sent. Check your notifications."), (e) => toast(e.message))}
            >
              Send a test
            </button>
          )}
        </div>
      </div>
      <div className="card tight">
        {sorted.map((r) => (
          <div key={r.id}>
            <div className="rem">
              <input type="time" value={r.time} onChange={(e) => upd(r.id, { time: e.target.value })} />
              <div className="grow" onClick={() => setEdit(edit === r.id ? null : r.id)} style={{ cursor: "pointer" }}>
                <b className="ell" style={{ display: "block", opacity: r.on ? 1 : 0.5 }}>{r.title}</b>
                <div className="small mute ell">{r.days.length ? r.days.map((d) => DAYS[d]).join(" ") : "Every day"}</div>
              </div>
              <div className={"switch" + (r.on ? " on" : "")} onClick={() => { upd(r.id, { on: !r.on }); buzz(); }} role="switch" aria-checked={r.on} />
            </div>
            {edit === r.id && (
              <div style={{ paddingBottom: 14 }}>
                <input value={r.title} onChange={(e) => upd(r.id, { title: e.target.value })} placeholder="Title" />
                <input value={r.body} onChange={(e) => upd(r.id, { body: e.target.value })} placeholder="Message" style={{ marginTop: 8 }} />
                <div className="daypick">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <button
                      key={d}
                      className={r.days.includes(d) ? "on" : ""}
                      onClick={() => upd(r.id, { days: r.days.includes(d) ? r.days.filter((x) => x !== d) : [...r.days, d] })}
                    >
                      {DAYS[d].slice(0, 2)}
                    </button>
                  ))}
                </div>
                <div className="small mute" style={{ marginTop: 6 }}>No days picked = every day.</div>
                <button className="link" style={{ color: "var(--warn)" }} onClick={() => { setReminders(list.filter((x) => x.id !== r.id)); setEdit(null); }}>
                  Delete reminder
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="btns">
        <button
          className="btn ghost"
          onClick={() => {
            const r: Reminder = { id: "r-" + uid(), title: "New reminder", body: "", time: "12:00", days: [], on: true };
            setReminders([...list, r]);
            setEdit(r.id);
          }}
        >
          + Add reminder
        </button>
        <button className="btn ghost" onClick={() => { setReminders(DEFAULT_REMINDERS); toast("Defaults restored"); }}>
          Reset defaults
        </button>
      </div>
    </>
  );
}

function DataCard({ install }: { install: (() => void) | null }) {
  const { toast } = useUI();
  const file = useRef<HTMLInputElement>(null);
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ app: "lock-in", v: 1, at: Date.now(), data: S.dump() }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lock-in-backup-" + todayKey() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Backup saved to your device");
  };
  const importData = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (!j || typeof j.data !== "object") throw 0;
      if (!confirm("Replace everything on this device with this backup?")) return;
      S.clear();
      S.load(j.data);
      toast("Backup restored");
    } catch {
      toast("That file isn't a Lock In backup");
    }
  };
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;
  return (
    <>
      <h2>App + data</h2>
      <div className="card">
        <h3>Install on your home screen</h3>
        <p className="small mute" style={{ marginTop: 4 }}>
          {standalone
            ? "Installed. You're running the app version."
            : ios
              ? "Safari: tap Share, then Add to Home Screen. Push reminders on iPhone only work from the installed app."
              : "Runs full screen, works offline, and gets push reminders."}
        </p>
        {install && !standalone && (
          <button className="btn" style={{ marginTop: 12 }} onClick={install}>
            Install Lock In
          </button>
        )}
      </div>
      <div className="card">
        <h3>Your data stays on this device</h3>
        <p className="small mute" style={{ marginTop: 4 }}>
          Everything saves to this browser's storage. Nothing goes to a server except your reminder times. Back up before you switch phones or clear your browser.
        </p>
        <div className="btns" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={exportData}>Save backup</button>
          <button className="btn ghost" onClick={() => file.current.click()}>Restore</button>
        </div>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && importData(e.target.files[0])} />
        <button
          className="link"
          onClick={() => {
            if (!confirm("Reset all progress, notes, XP and streaks?")) return;
            S.clear();
            toast("Everything reset");
          }}
        >
          Reset everything
        </button>
      </div>
      <p className="tiny mute" style={{ textAlign: "center", marginTop: 18 }}>Lock In · day {Math.max(1, dayNum())} · stored locally</p>
    </>
  );
}
