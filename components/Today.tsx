"use client";
import { useState } from "react";
import { Check, Logo, Ring, useUI } from "./ui";
import { CheckinSheet, ReviewSheet, useActions } from "./sheets";
import { QUOTES, TYPES } from "@/lib/data";
import {
  addDays, curIdx, dayNum, fmtDate, fmtMin, getDay, getStart, getTasks, getTimer, habitsFor, isLive, keyOf, level, nfDays, nfState,
  pad, pctOf, schedFor, setTasks, streak, Task, todayKey, typeOf, uid, userName, xpOf,
} from "@/lib/core";
import { buzz } from "@/lib/fx";

export default function Today({ go, now }: { go: (p: string, sub?: string) => void; now: Date }) {
  const { open } = useUI();
  const { toggle, setWater } = useActions();
  const [qi, setQi] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const TK = todayKey(),
    start = getStart(),
    dn = dayNum(),
    live = isLive(),
    d = getDay(TK),
    t = typeOf(TK);
  const p = live ? pctOf(TK) : 0;
  const h = now.getHours();
  const lv = level();
  const nd = nfDays(nfState());
  const T = getTimer();

  const strip = Array.from({ length: 14 }, (_, i) => {
    const k = addDays(start, i),
      pp = k <= TK ? pctOf(k) : 0;
    return (
      <i key={k} className={(pp >= 70 ? "full" : pp > 0 ? "half" : "") + (k === TK ? " today" : "")}>
        {i + 1}
      </i>
    );
  });

  const sc = schedFor(TK),
    ci = curIdx(sc, now),
    c = ci < 0 ? null : sc[ci],
    n = sc[ci + 1];

  return (
    <section className="page">
      <div className="top">
        <div className="brand">
          <Logo size={28} />
          LOCK IN
        </div>
        <span className="pill">{now.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}</span>
      </div>

      <div className="hero">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="tag">{dn < 1 ? "Starts soon" : dn > 14 ? "Overtime" : "The 14-day lock in"}</div>
            <div className="disp daybig" style={{ marginTop: 6 }}>
              {dn < 1 ? "—" : <>DAY {pad(Math.max(1, dn))}</>}
            </div>
            <div className="of">{dn < 1 ? "Day 1 is " + fmtDate(start) : dn > 14 ? "Keep going" : "of 14 · " + (14 - dn) + " left"}</div>
          </div>
          <Ring size={104} stroke={10} pct={p / 100}>
            <b className="disp" style={{ fontSize: 30 }}>
              {p}%
            </b>
            <span className="tiny mute">today</span>
          </Ring>
        </div>
        <div className="hello">
          {h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening"}, {userName()}.
        </div>
        <div className="strip">{strip}</div>
      </div>

      <div
        className="card click"
        onClick={() => {
          setQi((qi + 1) % QUOTES.length);
          buzz();
        }}
      >
        <div className="tag" style={{ color: "var(--mute)" }}>
          Tap for another
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.35, marginTop: 6, letterSpacing: "-.01em" }}>“{QUOTES[qi]}”</div>
      </div>

      {!live ? (
        <PreCard start={start} />
      ) : (
        <>
          <div className="card">
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div className="tag">
                  {TYPES[t].e} {TYPES[t].l}
                </div>
                {d.prio && (
                  <div style={{ marginTop: 6 }}>
                    <b>Priority:</b> {d.prio}
                  </div>
                )}
                {d.note && <div className="mute small" style={{ marginTop: 4 }}>{d.note}</div>}
                {!d.prio && !d.note && <div className="mute small" style={{ marginTop: 4 }}>No changes to the plan today.</div>}
              </div>
              <button className="mini" onClick={() => open(<CheckinSheet k={TK} />)}>
                Change
              </button>
            </div>
          </div>

          <div className="card hl">
            {c ? (
              <>
                <div className="tag">Right now</div>
                <h3 className="disp" style={{ fontSize: 30, margin: "6px 0 4px" }}>{c[1]}</h3>
                <div className="mute">{c[2]}</div>
                {n && (
                  <div className="small mute" style={{ marginTop: 10 }}>
                    Next at <span className="mono">{fmtMin(n[0])}</span>: <b style={{ color: "var(--text)" }}>{n[1]}</b>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="tag">Up first</div>
                <h3 className="disp" style={{ fontSize: 30, margin: "6px 0 4px" }}>
                  {sc[0][1]} · {fmtMin(sc[0][0])}
                </h3>
                <div className="mute">{sc[0][2]}</div>
              </>
            )}
          </div>

          {h >= 18 && !d.review && (
            <div className="card hl click" onClick={() => open(<ReviewSheet k={TK} />)}>
              <div className="tag">Before you wind down</div>
              <h3 style={{ fontSize: 18, margin: "4px 0 2px" }}>Put your day in order</h3>
              <div className="mute small">2 minutes. What got done, what changes tomorrow. +15 XP</div>
            </div>
          )}
          {d.review && (
            <div className="card click" onClick={() => open(<ReviewSheet k={TK} />)}>
              <div className="tag">Day reviewed {["", "😞", "😕", "😐", "🙂", "🔥"][d.review.rate || 0]}</div>
              <div className="mute small" style={{ marginTop: 4 }}>Tap to edit your review.</div>
            </div>
          )}

          <div className="grid2">
            <div className="tile">
              <div className="tag" onClick={() => go("focus", "nf")} style={{ cursor: "pointer" }}>No Fap</div>
              <div className="big" onClick={() => go("focus", "nf")} style={{ cursor: "pointer" }}>
                {nd}
                <small>day{nd === 1 ? "" : "s"}</small>
              </div>
              <button className={"mini" + (d.h.nf ? "" : " acc")} onClick={() => toggle("nf")}>
                {d.h.nf ? "✓ Checked in" : "Check in"}
              </button>
            </div>
            <div className="tile">
              <div className="tag" onClick={() => go("focus", "work")} style={{ cursor: "pointer" }}>Deep work</div>
              <div className="big" onClick={() => go("focus", "work")} style={{ cursor: "pointer" }}>
                {d.focus}
                <small>min</small>
              </div>
              <button className="mini" onClick={() => go("focus", "work")}>
                {T.mode === "idle" ? "Start session" : T.mode === "work" ? "● Focusing" : "On break"}
              </button>
            </div>
          </div>
        </>
      )}

      <Tasks />

      <div className="card">
        <div className="row between">
          <h3>
            Level {lv.lv} · <span style={{ color: "var(--acc)" }}>{lv.name}</span>
          </h3>
          <span className="mute small mono">{lv.into} / 150 XP</span>
        </div>
        <div className="bar">
          <i style={{ width: (lv.maxed ? 100 : lv.into / 1.5) + "%" }} />
        </div>
        <div className="stats">
          <div className="stat">
            <b>{live ? streak() : 0}</b>
            <span>Streak</span>
          </div>
          <div className="stat">
            <b>{Math.max(0, Math.min(14, 15 - Math.max(dn, 1)))}</b>
            <span>Days left</span>
          </div>
          <div className="stat">
            <b>{live ? xpOf(TK) : 0}</b>
            <span>XP today</span>
          </div>
        </div>
      </div>

      {live && (
        <>
          <h2>Water</h2>
          <div className="card">
            <div className="row between">
              <span>
                <b className="disp" style={{ fontSize: 28, color: "var(--water)" }}>{d.w}</b>
                <span className="mute"> / 8 glasses</span>
              </span>
              <span className="mute small">tap a glass</span>
            </div>
            <div className="water">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={"glass" + (i < d.w ? " on" : "")} onClick={() => setWater(i + 1)} />
              ))}
            </div>
          </div>

          <h2>Checklist</h2>
          {habitsFor(TK).map((x) => (
            <div key={x.id} className={"habit" + (d.h[x.id] ? " on" : "")} onClick={() => (x.sheet ? open(<ReviewSheet k={TK} />) : toggle(x.id))}>
              <div className="chk">{d.h[x.id] && <Check />}</div>
              <div>
                <div className="t">
                  <b>{x.t}</b>
                </div>
                <div className="small mute">{x.s}</div>
              </div>
              <div className="xp">+{x.xp}</div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function PreCard({ start }: { start: string }) {
  const { open } = useUI();
  const ms = new Date(start + "T00:00:00").getTime() - Date.now(),
    hh = Math.floor(ms / 36e5),
    mi = Math.floor(ms / 6e4) % 60,
    pd = getDay(start);
  return (
    <div className="card hl">
      <div className="tag">
        Day 1 starts in {hh}h {mi}m
      </div>
      <h3 style={{ fontSize: 20, margin: "4px 0 6px" }}>Nothing to track today.</h3>
      <div className="mute">Tonight: shop, prep your chicken and eggs, check tomorrow's workout, and sleep early. Everything goes live at midnight.</div>
      <div className="divider" />
      <div className="row between">
        <div className="small">
          <b>Day 1:</b> {pd.type ? TYPES[pd.type].e + " " + TYPES[pd.type].l : <span className="mute">not planned yet</span>}
        </div>
        <button className="mini" onClick={() => open(<CheckinSheet k={start} />)}>
          Plan it
        </button>
      </div>
    </div>
  );
}

const toLocalInput = (ms: number) => {
  const d = new Date(ms);
  return keyOf(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
};

function Tasks() {
  const { toast } = useUI();
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [showDone, setShowDone] = useState(false);
  const all = getTasks();
  const open = all.filter((t) => !t.done).sort((a, b) => (a.due || 9e15) - (b.due || 9e15) || a.created - b.created);
  const done = all.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const add = () => {
    const v = text.trim();
    if (!v) return;
    const t: Task = { id: uid(), text: v, done: false, created: Date.now() };
    if (due) t.due = new Date(due).getTime();
    setTasks([...all, t]);
    setText("");
    setDue("");
    buzz();
    toast(t.due ? "Reminder set for " + new Date(t.due).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Added");
  };
  const flip = (id: string) => {
    setTasks(all.map((t) => (t.id === id ? { ...t, done: !t.done, doneAt: !t.done ? Date.now() : undefined } : t)));
    buzz();
    const t = all.find((x) => x.id === id);
    if (t && !t.done) toast("Done. +5 XP");
  };
  const del = (id: string) => setTasks(all.filter((t) => t.id !== id));
  const when = (ms: number) => {
    const d = new Date(ms),
      k = keyOf(d),
      tk = todayKey();
    const tm = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return k === tk ? tm : k === addDays(tk, 1) ? "Tmrw " + tm : fmtDate(k) + " " + tm;
  };
  const row = (t: Task) => (
    <div key={t.id} className={"task" + (t.done ? " done" : "")}>
      <div className={"chk" + (t.done ? " on" : "")} onClick={() => flip(t.id)}>
        {t.done && <Check />}
      </div>
      <div className="tx">
        {t.text}
        {t.due && !t.done && <div className={"when" + (t.due < Date.now() ? " late" : "")}>⏰ {when(t.due)}</div>}
      </div>
      <button className="x" onClick={() => del(t.id)} aria-label="Delete">
        ×
      </button>
    </div>
  );
  return (
    <>
      <h2>
        To-do <span className="mute" style={{ fontSize: 14 }}>{open.length || ""}</span>
      </h2>
      <div className="card">
        <div className="addrow">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task..." />
          <button className="mini acc" onClick={add} style={{ padding: "0 16px" }}>
            Add
          </button>
        </div>
        <div className="row" style={{ marginTop: 8, gap: 8 }}>
          <span className="small mute" style={{ flex: "none" }}>Remind me</span>
          <input type="datetime-local" value={due} min={toLocalInput(Date.now())} onChange={(e) => setDue(e.target.value)} style={{ padding: "8px 10px", fontSize: 14 }} />
        </div>
        <div style={{ marginTop: 6 }}>
          {open.map(row)}
          {!open.length && <div className="empty small">Clear. Add the next thing that matters.</div>}
        </div>
        {done.length > 0 && (
          <>
            <button className="link" style={{ marginTop: 4 }} onClick={() => setShowDone(!showDone)}>
              {showDone ? "Hide" : "Show"} {done.length} done
            </button>
            {showDone && (
              <>
                {done.slice(0, 20).map(row)}
                <button className="link" onClick={() => setTasks(open)}>
                  Clear done tasks
                </button>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
