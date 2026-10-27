"use client";
import { useEffect, useState } from "react";
import { Bolt, useUI } from "./ui";
import { DayType, NF_MSG, RATE, TYPES, URGE, WHY0 } from "@/lib/data";
import { dayNum, fmtDate, getDay, getStart, habitsFor, isLive, pad, pctOf, todayKey, updateDay } from "@/lib/core";
import { S } from "@/lib/store";
import { buzz } from "@/lib/fx";

/** Shared actions that toast, buzz and celebrate. */
export function useActions() {
  const { toast } = useUI();
  const celebrate = (before: number) => {
    const p = pctOf(todayKey());
    if (before < 100 && p === 100) {
      toast("Day locked in. +25 bonus XP");
      buzz([30, 40, 30]);
    } else if (before < 70 && p >= 70) toast("Streak secured for today");
  };
  const guard = () => {
    if (isLive()) return true;
    toast("Tracking starts " + fmtDate(getStart()) + ". Rest up.");
    return false;
  };
  const toggle = (id: string) => {
    if (!guard()) return;
    const k = todayKey(),
      before = pctOf(k);
    const d = updateDay(k, (d) => {
      d.h[id] = !d.h[id];
    });
    buzz();
    const hb = habitsFor(k).find((h) => h.id === id);
    if (d.h[id] && hb) toast("+" + hb.xp + " XP");
    celebrate(before);
  };
  const setWater = (n: number) => {
    if (!guard()) return;
    const k = todayKey(),
      before = pctOf(k);
    const d = updateDay(k, (d) => {
      d.w = d.w === n ? n - 1 : n;
    });
    buzz();
    if (d.w === 8) toast("Hydration done");
    celebrate(before);
  };
  return { celebrate, guard, toggle, setWater, toast };
}

export function CheckinSheet({ k, auto }: { k: string; auto?: boolean }) {
  const { close, toast } = useUI();
  const d = getDay(k),
    isT = k === todayKey();
  const [type, setType] = useState<DayType>(d.type || "home");
  const [note, setNote] = useState(d.note || "");
  const [prio, setPrio] = useState(d.prio || "");
  const head = isT
    ? auto
      ? d.type
        ? "You planned this. Still on?"
        : "What's today looking like?"
      : "Change today's plan"
    : "Plan " + fmtDate(k, { weekday: "long", day: "numeric", month: "long" });
  const save = () => {
    updateDay(k, (d) => {
      d.type = type;
      d.note = note.trim();
      d.prio = prio.trim();
      if (isT) d.asked = true;
    });
    close();
    buzz();
    toast(isT ? "Day locked in. Go." : "Planned: " + TYPES[type].l);
  };
  return (
    <>
      <div className="tag">{isT ? (auto ? "Morning check-in" : "Today") : "Plan ahead" + (dayNum(k) >= 1 ? ": Day " + dayNum(k) : "")}</div>
      <h2 className="disp">{head}</h2>
      <div className="mute small">Going out? Anything that changes the usual plan?</div>
      {(Object.keys(TYPES) as DayType[]).map((t) => (
        <div
          key={t}
          className={"tyopt" + (type === t ? " on" : "")}
          onClick={() => {
            setType(t);
            buzz();
          }}
        >
          <span className="te">{TYPES[t].e}</span>
          <div>
            <b>{TYPES[t].l}</b>
            <div className="small mute">{TYPES[t].d}</div>
          </div>
        </div>
      ))}
      <label className="lbl">Anything changing the plan?</label>
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Casting at 2pm, meeting at the office, out in the evening..." />
      <label className="lbl">Top priority {isT ? "today" : "that day"}</label>
      <input value={prio} onChange={(e) => setPrio(e.target.value)} placeholder="The one thing that has to get done" />
      <button className="btn" style={{ marginTop: 18 }} onClick={save}>
        {isT ? "Lock in the day" : "Save plan"}
      </button>
    </>
  );
}

export function ReviewSheet({ k }: { k: string }) {
  const { close, toast } = useUI();
  const { celebrate } = useActions();
  const d = getDay(k),
    r = d.review || ({} as any);
  const [rate, setRate] = useState<number>(r.rate || 0);
  const [done, setDone] = useState(r.done || "");
  const [win, setWin] = useState(r.win || "");
  const [fix, setFix] = useState(r.fix || "");
  const hs = habitsFor(k),
    n = hs.filter((h) => d.h[h.id] && h.id !== "review").length;
  const chips = [
    pctOf(k) + "% done",
    n + "/" + (hs.length - 1) + " habits",
    d.w + "/8 water",
    d.h.train ? "Workout ✓" : "No workout",
    d.focus + " min focus",
    d.h.nf ? "No Fap ✓" : "No Fap not checked",
  ];
  const save = () => {
    const before = pctOf(todayKey());
    updateDay(k, (d) => {
      d.review = { rate, done: done.trim(), win: win.trim(), fix: fix.trim(), at: Date.now() };
      d.h.review = true;
    });
    close();
    buzz([20, 40, 20]);
    toast("Day in order. Rest well.");
    if (k === todayKey()) celebrate(before);
  };
  return (
    <>
      <div className="tag">Day {dayNum(k)} in order</div>
      <h2 className="disp">How did today go?</h2>
      <div className="sum">
        {chips.map((c) => (
          <span className="pill" key={c}>
            {c}
          </span>
        ))}
      </div>
      <label className="lbl">Rate the day</label>
      <div className="rate">
        {RATE.slice(1).map((e, i) => (
          <button
            key={i}
            className={rate === i + 1 ? "on" : ""}
            onClick={() => {
              setRate(i + 1);
              buzz();
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <label className="lbl">What did you get done?</label>
      <textarea rows={3} value={done} onChange={(e) => setDone(e.target.value)} placeholder="Startup work, castings, workouts, anything you finished" />
      <label className="lbl">Biggest win</label>
      <input value={win} onChange={(e) => setWin(e.target.value)} placeholder="One thing you're proud of" />
      <label className="lbl">What changes tomorrow?</label>
      <input value={fix} onChange={(e) => setFix(e.target.value)} placeholder="One thing to do better" />
      <button className="btn" style={{ marginTop: 18 }} onClick={save}>
        Save and wind down
      </button>
    </>
  );
}

export function UrgeSheet() {
  const { close, toast } = useUI();
  const { guard } = useActions();
  const [a, setA] = useState(() => URGE[Math.floor(Math.random() * URGE.length)]);
  const [end] = useState(() => Date.now() + 5 * 6e4);
  const [now, setNow] = useState(Date.now());
  const [ph, setPh] = useState(0);
  const why = S.get<string[]>("nfWhy", WHY0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500),
      b = setInterval(() => setPh((p) => (p + 1) % 4), 4000);
    return () => {
      clearInterval(t);
      clearInterval(b);
    };
  }, []);
  const r = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (r === 0) toast("You outlasted it.");
  }, [r === 0]);
  const win = () => {
    if (!guard()) return;
    const n = S.get("nfWins", 0) + 1;
    S.set("nfWins", n);
    close();
    toast("Urge beaten. That's " + n + " total.");
    buzz([30, 40, 30]);
  };
  return (
    <div style={{ textAlign: "center" }}>
      <div className="tag">Urge mode</div>
      <h2 className="disp">Breathe with the circle</h2>
      <div className="breath">
        <i />
        <b>{["Breathe in", "Hold", "Breathe out", "Hold"][ph]}</b>
      </div>
      <div className="card hl" style={{ textAlign: "left" }}>
        <div className="tag">Then do this</div>
        <div style={{ fontSize: 17, fontWeight: 750, marginTop: 4 }}>{a}</div>
      </div>
      {why.length > 0 && (
        <div className="card" style={{ textAlign: "left" }}>
          <div className="tag">Remember why</div>
          {why.map((w, i) => (
            <div key={i} style={{ marginTop: 6 }}>
              {w}
            </div>
          ))}
        </div>
      )}
      <p className="mute small">
        Urges peak and pass within minutes. Ride it out:{" "}
        <b className="mono" style={{ color: "var(--text)" }}>
          {Math.floor(r / 60)}:{pad(r % 60)}
        </b>
      </p>
      <div className="btns" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={() => setA(URGE[Math.floor(Math.random() * URGE.length)])}>
          Another action
        </button>
        <button className="btn" onClick={win}>
          I beat it
        </button>
      </div>
    </div>
  );
}

export function BadgeSheet({ days, name }: { days: number; name: string }) {
  const { close } = useUI();
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div className="orb" style={{ width: 120, height: 120, margin: "10px auto 18px" }}>
        <Bolt />
      </div>
      <div className="tag">Badge unlocked</div>
      <h2 className="disp" style={{ fontSize: 34 }}>
        {name}: {days} day{days === 1 ? "" : "s"}
      </h2>
      <p className="mute">{NF_MSG[days]}</p>
      <button className="btn" style={{ marginTop: 18 }} onClick={close}>
        Keep going
      </button>
    </div>
  );
}
