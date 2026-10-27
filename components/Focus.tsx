"use client";
import { useEffect, useState } from "react";
import { Bolt, Ring, Seg, useUI } from "./ui";
import { UrgeSheet, useActions } from "./sheets";
import { MUSIC, NF_B, PRESETS, WHY0 } from "@/lib/data";
import { addDays, getDay, getStart, getTimer, logFocus, nfDays, nfState, pad, setTimer, todayKey, updateDay } from "@/lib/core";
import { S } from "@/lib/store";
import { beep, buzz } from "@/lib/fx";

export default function Focus({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  return (
    <section className="page">
      <h1>Focus</h1>
      <div style={{ marginTop: 16 }}>
        <Seg value={sub} options={[["work", "Deep work"], ["nf", "No Fap"]]} onChange={(v) => { setSub(v); buzz(); }} />
      </div>
      {sub === "work" ? <DeepWork /> : <NoFap />}
    </section>
  );
}

function DeepWork() {
  const { toast } = useUI();
  const { guard } = useActions();
  const [, setTick] = useState(0);
  const T = getTimer();
  const TK = todayKey(),
    d = getDay(TK);
  const [task, setTask] = useState(() => d.prio || "");
  const [mName, setMName] = useState("");
  const [mUrl, setMUrl] = useState("");

  useEffect(() => {
    if (T.mode === "idle") return;
    const i = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(i);
  }, [T.mode]);

  const rem = Math.max(0, T.end - Date.now()),
    tot = T.len * 6e4;
  const start = () => {
    if (!guard()) return;
    const len = PRESETS[T.preset][0];
    setTimer({ ...T, task: task.trim() || d.prio || "", mode: "work", len, end: Date.now() + len * 6e4 });
    buzz();
    beep(1);
    toast("Locked in. Phone down.");
  };
  const stop = () => {
    if (T.mode === "work") {
      const mins = Math.floor((T.len * 6e4 - (T.end - Date.now())) / 6e4);
      if (mins >= 5) toast(logFocus(mins, T.task));
      else toast("Under 5 min, not logged");
    }
    setTimer({ ...T, mode: "idle" });
  };
  const mine = S.get<{ l: string; u: string }[]>("music", []);
  const addMusic = () => {
    const u = mUrl.trim();
    if (!/^https?:\/\//i.test(u)) return toast("Paste a full link starting with https");
    S.set("music", [...mine, { l: mName.trim() || "My playlist", u }]);
    setMName("");
    setMUrl("");
    toast("Playlist saved");
  };

  return (
    <>
      <div className="card">
        <div className="chips" style={{ justifyContent: "center" }}>
          {PRESETS.map((p, i) => (
            <div key={i} className={"chip" + (T.preset === i ? " on" : "")} onClick={() => T.mode === "idle" && setTimer({ ...T, preset: i })}>
              {p[2]}
            </div>
          ))}
        </div>
        <div className="fring">
          <Ring size={250} stroke={14} pct={T.mode === "idle" ? 0 : rem / tot}>
            <div className="tag">{T.mode === "idle" ? "Ready" : T.mode === "work" ? "Focus" : "Break"}</div>
            <div className="tm mono">
              {T.mode === "idle" ? PRESETS[T.preset][0] + ":00" : Math.floor(rem / 6e4) + ":" + pad(Math.floor(rem / 1000) % 60)}
            </div>
            <div className="small mute" style={{ padding: "0 34px" }}>
              {T.mode === "work" ? T.task : T.mode === "break" ? "Stand up, stretch, drink water" : ""}
            </div>
          </Ring>
        </div>
        {T.mode === "idle" && <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="What are you working on?" />}
        <div className="btns" style={{ marginTop: 10 }}>
          {T.mode === "idle" ? (
            <button className="btn" onClick={start}>Start focus</button>
          ) : T.mode === "work" ? (
            <button className="btn ghost" onClick={stop}>End session early</button>
          ) : (
            <button className="btn ghost" onClick={() => setTimer({ ...T, mode: "idle" })}>Skip break</button>
          )}
        </div>
      </div>
      <div className="card">
        <div className="row between">
          <h3>Today</h3>
          <span className="mute small mono">
            {d.focus} min · {d.sessions.length} session{d.sessions.length === 1 ? "" : "s"}
          </span>
        </div>
        {d.sessions.length ? (
          d.sessions
            .slice()
            .reverse()
            .map((s, i) => (
              <div className="ex" key={i}>
                <div>
                  <b>{s.task || "Focus session"}</b>
                  <div className="small mute">{new Date(s.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
                </div>
                <span className="pill">{s.m} min</span>
              </div>
            ))
        ) : (
          <div className="empty small">No sessions yet. 90 minutes ticks off deep work.</div>
        )}
      </div>
      <h2>Focus music</h2>
      <div className="card">
        <p className="mute small">Opens in the app if it's installed. Start the music, then come back and start the timer.</p>
        {[...MUSIC.map((m) => [m[0], m[1], m[2], -1] as const), ...mine.map((m, i) => [m.l, m.u, "★", i] as const)].map((m, i) => (
          <div className="row" style={{ gap: 6 }} key={i}>
            <a className="mus" href={m[1]} target="_blank" rel="noopener noreferrer">
              <span className="mi">{m[2]}</span>
              <span className="ell">{m[0]}</span>
              <span className="go">↗</span>
            </a>
            {m[3] >= 0 && (
              <button className="mini" style={{ marginTop: 8 }} onClick={() => S.set("music", mine.filter((_, j) => j !== m[3]))}>
                ×
              </button>
            )}
          </div>
        ))}
        <label className="lbl">Add your own playlist</label>
        <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Name, e.g. My study mix" />
        <input value={mUrl} onChange={(e) => setMUrl(e.target.value)} placeholder="Paste a YouTube, YouTube Music or Spotify link" style={{ marginTop: 8 }} />
        <button className="btn ghost" style={{ marginTop: 8 }} onClick={addMusic}>
          Save playlist
        </button>
      </div>
    </>
  );
}

function NoFap() {
  const { open, toast } = useUI();
  const { toggle, guard } = useActions();
  const [whyIn, setWhyIn] = useState("");
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(i);
  }, []);
  const st = nfState(),
    live = Date.now() >= st.start,
    ms = Math.max(0, Date.now() - st.start),
    days = nfDays(st),
    best = Math.max(st.best, days);
  const TK = todayKey(),
    start = getStart(),
    d = getDay(TK);
  let ri = -1;
  NF_B.forEach((b, i) => {
    if (days >= b[0]) ri = i;
  });
  const nx = NF_B[ri + 1],
    prevM = ri >= 0 ? NF_B[ri][0] : 0,
    prog = nx ? Math.round(((days - prevM) / (nx[0] - prevM)) * 100) : 100;
  const size = Math.round(110 + Math.min(1, days / 30) * 80);
  const why = S.get<string[]>("nfWhy", WHY0);

  const slip = () => {
    if (!guard()) return;
    if (!confirm("Restart your No Fap counter? Your best streak is kept.")) return;
    S.set("nf", { ...st, best: Math.max(st.best, nfDays(st)), resets: (st.resets || 0) + 1, start: Date.now(), seen: 0 });
    updateDay(TK, (d) => {
      d.h.nf = false;
    });
    toast("Restarted. Day one starts now. Go again.");
  };

  return (
    <>
      <div className="card hl">
        <div className="orbwrap">
          <div className="orb" style={{ width: size, height: size }}>
            <Bolt />
          </div>
          <div className="nfnum disp">
            {days} day{days === 1 ? "" : "s"}
            <small>{live ? (Math.floor(ms / 36e5) % 24) + "h " + (Math.floor(ms / 6e4) % 60) + "m on the clock" : ""}</small>
          </div>
          <div className="tag" style={{ marginTop: 10 }}>
            {live ? (ri >= 0 ? NF_B[ri][1] : "Starting strong") : "Starts " + new Date(start + "T00:00:00").toLocaleDateString()}
          </div>
        </div>
        <div className="small mute" style={{ marginTop: 14 }}>
          {nx ? (
            <>
              {nx[0] - days} day{nx[0] - days === 1 ? "" : "s"} to <b style={{ color: "var(--text)" }}>{nx[1]}</b>
            </>
          ) : (
            "Every badge unlocked"
          )}
        </div>
        <div className="bar">
          <i style={{ width: prog + "%" }} />
        </div>
        <div className="btns" style={{ marginTop: 14 }}>
          <button className={"btn" + (d.h.nf ? " ghost" : "")} onClick={() => toggle("nf")}>
            {d.h.nf ? "✓ Clean today" : "Check in: clean today"}
          </button>
          <button className="btn ghost" onClick={() => { buzz(); open(<UrgeSheet />); }}>
            Urge hit
          </button>
        </div>
      </div>
      <div className="stats" style={{ margin: "0 0 10px" }}>
        <div className="stat"><b>{best}</b><span>Best</span></div>
        <div className="stat"><b>{S.get("nfWins", 0)}</b><span>Urges beaten</span></div>
        <div className="stat"><b>{st.resets || 0}</b><span>Restarts</span></div>
      </div>
      <div className="card">
        <h3>Badges</h3>
        <div className="badges">
          {NF_B.map((b) => (
            <div key={b[0]} className={"badge" + (days >= b[0] && live ? " on" : "")}>
              <b>{b[0]}d</b>
              <span>{b[1]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="row between">
          <h3>Check-in calendar</h3>
          <span className="small mute">Days 1 to 28</span>
        </div>
        <div className="cal">
          {Array.from({ length: 28 }, (_, i) => {
            const k = addDays(start, i);
            return (
              <i key={k} className={(getDay(k).h.nf ? "ok" : "") + (k > TK ? " fut" : "") + (k === TK ? " today" : "")}>
                {i + 1}
              </i>
            );
          })}
        </div>
      </div>
      <div className="card">
        <h3>My reasons</h3>
        <p className="small mute">These show up when an urge hits.</p>
        <div style={{ marginTop: 6 }}>
          {why.map((w, i) => (
            <div className="why" key={i}>
              <span>{w}</span>
              <button onClick={() => S.set("nfWhy", why.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <input value={whyIn} onChange={(e) => setWhyIn(e.target.value)} placeholder="Add a reason" />
          <button
            className="mini"
            onClick={() => {
              if (!whyIn.trim()) return;
              S.set("nfWhy", [...why, whyIn.trim()]);
              setWhyIn("");
            }}
          >
            Add
          </button>
        </div>
      </div>
      <button className="link" onClick={slip}>
        I slipped. Restart the counter.
      </button>
    </>
  );
}

