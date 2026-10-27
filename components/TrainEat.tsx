"use client";
import { useEffect, useRef, useState } from "react";
import { Check, useUI } from "./ui";
import { useActions } from "./sheets";
import { DAYS, MEALS, SHOP, TYPES, WORKOUTS } from "@/lib/data";
import { addDays, dayNum, getDay, habitsFor, isLive, pad, pctOf, todayKey, typeOf, updateDay } from "@/lib/core";
import { S } from "@/lib/store";
import { beep, buzz } from "@/lib/fx";

export function Train() {
  const { toast } = useUI();
  const { guard, celebrate } = useActions();
  const today = new Date().getDay();
  const [sel, setSel] = useState(today);
  const [end, setEnd] = useState(0);
  const [now, setNow] = useState(Date.now());
  const tRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => () => clearInterval(tRef.current), []);
  const startTimer = (s: number) => {
    clearInterval(tRef.current);
    const e = Date.now() + s * 1000;
    setEnd(e);
    setNow(Date.now());
    tRef.current = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= e) {
        clearInterval(tRef.current);
        setEnd(0);
        buzz([200, 100, 200]);
        beep(2);
        toast("Next set. Go.");
      }
    }, 250);
  };
  const stopTimer = () => {
    clearInterval(tRef.current);
    setEnd(0);
  };
  const rem = end ? Math.max(0, Math.ceil((end - now) / 1000)) : 0;

  const TK = todayKey(),
    w = WORKOUTS[sel],
    isToday = sel === today,
    d = getDay(TK),
    t = typeOf(TK);

  const setSet = (i: number, n: number) => {
    if (!guard()) return;
    const before = pctOf(TK),
      k = sel + "-" + i;
    let completed = false,
      rest = false;
    updateDay(TK, (d) => {
      d.sets[k] = d.sets[k] === n ? n - 1 : n;
      const need = typeOf(TK) === "out" ? 2 : 99;
      const all = w.ex.every((e, j) => (d.sets[sel + "-" + j] || 0) >= Math.min(need, e[2]));
      const hasTrain = habitsFor(TK).some((h) => h.id === "train");
      if (all && hasTrain && !d.h.train) {
        d.h.train = true;
        completed = true;
      } else if (d.sets[k] === n && n < w.ex[i][2]) rest = true;
    });
    if (completed) {
      toast("Workout complete. +20 XP");
      buzz([30, 40, 30]);
    } else if (rest) startTimer(90);
    buzz();
    celebrate(before);
  };

  return (
    <section className="page">
      <h1>Train</h1>
      <p className="lead">End each set 1 to 2 reps before failure. Rest 60 to 90 seconds. Ticking a set starts the rest timer.</p>
      <div className="chips">
        {[1, 2, 3, 4, 5, 6, 0].map((i) => (
          <div key={i} className={"chip" + (i === sel ? " on" : "")} onClick={() => setSel(i)}>
            {DAYS[i]}
            {i === today ? " •" : ""}
          </div>
        ))}
      </div>
      {isToday && t !== "home" && isLive() && (
        <div className="card hl" style={{ marginTop: 12 }}>
          <div className="tag">
            {TYPES[t].e} {TYPES[t].l}
          </div>
          <div className="mute small" style={{ marginTop: 4 }}>
            {t === "out"
              ? "Do the 20-minute version: 2 sets of each move. Walking out there counts as cardio."
              : "No hard training today. Just the push-up pump before photos."}
          </div>
        </div>
      )}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row between">
          <h3 className="disp" style={{ fontSize: 30 }}>{w.name}</h3>
          {isToday && <span className="pill acc">TODAY</span>}
        </div>
        {w.note && <p className="mute small" style={{ marginTop: 4 }}>{w.note}</p>}
        {w.ex.map((e, i) => {
          const done = isToday ? d.sets[sel + "-" + i] || 0 : 0;
          return (
            <div className="ex" key={i}>
              <div>
                <b>{e[0]}</b>
                <div className="small mute">{e[1]}</div>
              </div>
              <div className="dots">
                {Array.from({ length: e[2] }, (_, s) => (
                  <div key={s} className={"dot" + (s < done ? " on" : "")} onClick={isToday ? () => setSet(i, s + 1) : undefined}>
                    {s + 1}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!isToday && <p className="small mute" style={{ marginTop: 8 }}>Preview only. Sets can be ticked on the day.</p>}
      </div>
      {dayNum() > 7 && (
        <div className="card">
          <h3>Week 2 upgrade</h3>
          <p className="mute">Add one set to the main exercise, or slow every rep to 3 seconds on the way down.</p>
        </div>
      )}
      <h2>Rest timer</h2>
      <div className="card">
        <div className={"timer mono" + (end ? "" : " mute")}>
          {Math.floor(rem / 60)}:{pad(rem % 60)}
        </div>
        <div className="btns">
          <button className="btn ghost" onClick={() => startTimer(60)}>60s</button>
          <button className="btn ghost" onClick={() => startTimer(90)}>90s</button>
          <button className="btn ghost" onClick={stopTimer}>Stop</button>
        </div>
      </div>
      <div className="card">
        <h3>Shoot day pump</h3>
        <p className="mute">About 20 minutes before photos, do 2 to 3 quick sets of push-ups.</p>
      </div>
    </section>
  );
}

export function Eat() {
  const { toast } = useUI();
  const TK = todayKey(),
    y = getDay(addDays(TK, -1)),
    d = getDay(TK);
  const shop = S.get<Record<number, boolean>>("shop", {});
  const pick = (k: string, i: number) => {
    updateDay(TK, (d) => {
      d.meals[k] = d.meals[k] === i ? undefined : i;
    });
    buzz();
  };
  const shuffle = () => {
    updateDay(TK, (d) => {
      Object.keys(MEALS).forEach((k) => {
        const opts = MEALS[k].o.map((_, i) => i).filter((i) => i !== y.meals[k]);
        d.meals[k] = opts[Math.floor(Math.random() * opts.length)];
      });
    });
    buzz();
    toast("Menu set for today");
  };
  return (
    <section className="page">
      <h1>Eat</h1>
      <p className="lead">Pick today's meals. Don't repeat yesterday's. No oil, low salt, protein every meal.</p>
      <button className="btn" onClick={shuffle}>
        Pick my meals for me
      </button>
      <div style={{ marginTop: 12 }}>
        {Object.keys(MEALS).map((k) => (
          <div className="card" key={k}>
            <div className="tag">{MEALS[k].t}</div>
            {MEALS[k].o.map((o, i) => (
              <div key={i} className={"opt" + (d.meals[k] === i ? " on" : "")} onClick={() => pick(k, i)}>
                <div className={"chk" + (d.meals[k] === i ? " on" : "")}>{d.meals[k] === i && <Check />}</div>
                <div>
                  {o}
                  {y.meals[k] === i && (
                    <span className="pill" style={{ marginLeft: 6 }}>
                      had yesterday
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <h2>Recipes</h2>
      <div className="card">
        <h3>Yogurt sauce</h3>
        <p className="mute">Greek yogurt, garlic, lemon juice and black pepper. Use it instead of mayo or ketchup.</p>
      </div>
      <div className="card">
        <h3>No-oil omelette</h3>
        <p className="mute">Whisk 3 eggs with chopped spinach, tomato, pepper and onion. Pour into a non-stick pan on medium-low, cover with a lid for 3 to 4 minutes until set, then fold.</p>
      </div>
      <div className="card">
        <h3>Make yogurt taste good</h3>
        <p className="mute">Mash in a ripe banana, or add pineapple or papaya, plus a spoon of oats. Or blend it all into a smoothie.</p>
      </div>
      <div className="card">
        <h3>Batch prep</h3>
        <p className="mute">Roast or grill chicken for 2 to 3 days at once. Boil 6 to 8 eggs at a time. Build wraps fresh so they don't go soggy.</p>
      </div>
      <h2>
        Shopping list{" "}
        <span className="mute" style={{ fontSize: 14 }}>
          {SHOP.filter((_, i) => shop[i]).length}/{SHOP.length}
        </span>
      </h2>
      <div className="card tight">
        {SHOP.map((x, i) => (
          <div
            key={i}
            className={"shop" + (shop[i] ? " on" : "")}
            onClick={() => {
              S.set("shop", { ...shop, [i]: !shop[i] });
              buzz();
            }}
          >
            <div className={"chk" + (shop[i] ? " on" : "")}>{shop[i] && <Check />}</div>
            <span>{x}</span>
          </div>
        ))}
      </div>
      <button
        className="btn ghost"
        onClick={() => {
          S.set("shop", {});
          toast("List cleared");
        }}
      >
        Clear the list for a new week
      </button>
    </section>
  );
}
