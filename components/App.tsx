"use client";
import { useEffect, useRef, useState } from "react";
import { Defs, Logo, NavIcon, UIProvider, useUI } from "./ui";
import { BadgeSheet, CheckinSheet, ReviewSheet } from "./sheets";
import Today from "./Today";
import { Eat, Train } from "./TrainEat";
import Focus from "./Focus";
import Journal from "./Journal";
import Plan from "./Plan";
import { S, useStore } from "@/lib/store";
import { getDay, getStart, isLive, nfDays, nfState, tickFocus, todayKey } from "@/lib/core";
import { NF_B } from "@/lib/data";
import { localTick, registerSW, scheduleSync } from "@/lib/push";
import { beep, buzz } from "@/lib/fx";

const TABS: [string, string][] = [
  ["today", "Today"],
  ["train", "Train"],
  ["eat", "Eat"],
  ["focus", "Focus"],
  ["journal", "Journal"],
  ["plan", "Plan"],
];

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // First run: start the plan today and stamp the No Fap clock.
    if (S.get("start", null) === null) S.set("start", todayKey());
    nfState();
    setReady(true);
  }, []);
  if (!ready)
    return (
      <div className="splash">
        <Logo size={64} />
      </div>
    );
  return (
    <UIProvider>
      <Shell />
    </UIProvider>
  );
}

function Shell() {
  useStore();
  const { open, toast, sheetOpen } = useUI();
  const [tab, setTab] = useState("today");
  const [focusSub, setFocusSub] = useState("work");
  const [now, setNow] = useState(() => new Date());
  const [install, setInstall] = useState<(() => void) | null>(null);
  const prompted = useRef({ checkin: false, review: false });

  // Theme
  const theme = S.get<string>("theme", "auto");
  useEffect(() => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    const m = document.querySelector("meta[name=theme-color]");
    if (m) m.setAttribute("content", getComputedStyle(document.body).backgroundColor);
  }, [theme]);

  // Service worker + install prompt
  useEffect(() => {
    registerSW();
    const h = (e: any) => {
      e.preventDefault();
      setInstall(() => () => {
        e.prompt();
        setInstall(null);
      });
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  // Clocks: focus timer, local reminders, minute refresh
  useEffect(() => {
    const f = setInterval(() => {
      const msg = tickFocus();
      if (msg) {
        toast(msg);
        beep(3);
        buzz([300, 100, 300]);
      }
    }, 500);
    const m = setInterval(() => {
      setNow(new Date());
      localTick();
    }, 20000);
    localTick();
    return () => {
      clearInterval(f);
      clearInterval(m);
    };
  }, []);

  // Keep the Worker's copy of reminders in sync with local edits
  useEffect(() => {
    scheduleSync();
  });

  // Morning check-in, evening review, and No Fap badge popups
  useEffect(() => {
    if (sheetOpen || !isLive()) return;
    const TK = todayKey(),
      d = getDay(TK);
    const st = nfState(),
      days = nfDays(st),
      top = NF_B.filter((b) => days >= b[0]).pop();
    if (Date.now() >= st.start && top && top[0] > (st.seen || 0)) {
      S.set("nf", { ...st, seen: top[0] });
      open(<BadgeSheet days={top[0]} name={top[1]} />);
      buzz([40, 60, 40, 60, 80]);
      return;
    }
    if (!d.asked && !prompted.current.checkin) {
      const t = setTimeout(() => {
        prompted.current.checkin = true;
        open(<CheckinSheet k={TK} auto />);
      }, 600);
      return () => clearTimeout(t);
    }
    if (now.getHours() >= 21 && !d.review && !prompted.current.review) {
      prompted.current.review = true;
      open(<ReviewSheet k={TK} />);
    }
  }, [now, sheetOpen]);

  const go = (p: string, sub?: string) => {
    setTab(p);
    if (sub) setFocusSub(sub);
    window.scrollTo(0, 0);
    buzz();
  };

  return (
    <>
      <Defs />
      <main className="wrap" key={getStart()}>
        <div hidden={tab !== "today"}>{tab === "today" && <Today go={go} now={now} />}</div>
        <div hidden={tab !== "train"}>
          <Train />
        </div>
        <div hidden={tab !== "eat"}>{tab === "eat" && <Eat />}</div>
        <div hidden={tab !== "focus"}>{tab === "focus" && <Focus sub={focusSub} setSub={setFocusSub} />}</div>
        <div hidden={tab !== "journal"}>
          <Journal />
        </div>
        <div hidden={tab !== "plan"}>{tab === "plan" && <Plan install={install} />}</div>
      </main>
      <nav className="dock">
        <div className="in">
          {TABS.map(([p, l]) => (
            <button key={p} className={tab === p ? "on" : ""} onClick={() => go(p)} aria-label={l}>
              <span className="ic">
                <NavIcon p={p} />
              </span>
              {l}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
