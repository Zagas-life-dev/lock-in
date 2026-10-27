"use client";
import { KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { Check, Seg, useUI } from "./ui";
import { ReviewSheet, useActions } from "./sheets";
import { RATE, TYPES } from "@/lib/data";
import { dayKeys, dayNum, fmtDate, getDay, pctOf, todayKey, uid } from "@/lib/core";
import { S } from "@/lib/store";
import { buzz } from "@/lib/fx";

/* PAGE MODEL (Notion-style blocks) */
type BType = "p" | "h1" | "h2" | "h3" | "todo" | "bullet" | "num" | "quote" | "callout" | "divider";
type Block = { id: string; type: BType; text: string; checked?: boolean };
type Page = { id: string; icon: string; title: string; blocks: Block[]; created: number; updated: number; pin: boolean };

const BT: Record<BType, string> = { p: "Text", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", todo: "To-do list", bullet: "Bulleted list", num: "Numbered list", quote: "Quote", callout: "Callout", divider: "Divider" };
const BI: Record<BType, string> = { p: "Aa", h1: "H1", h2: "H2", h3: "H3", todo: "☐", bullet: "•", num: "1.", quote: "❝", callout: "💡", divider: "―" };
const PH: Partial<Record<BType, string>> = { p: "Type '/' for commands", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", todo: "To-do", bullet: "List", num: "List", quote: "Quote", callout: "Write something" };
const ALL = Object.keys(BT) as BType[];
const ICONS = ["📄", "📓", "💡", "📸", "🎯", "🔥", "💼", "🚀", "🧠", "✍️", "🏋️", "🍽️", "📈", "🎬", "🎵", "🗓️", "❤️", "⭐", "🧾", "🌍", "📚", "💰", "🛠️", "✅"];
const TPL: Record<string, { name: string; icon: string; title: () => string; b: [BType, string][] }> = {
  journal: { name: "Daily journal", icon: "📓", title: () => "Journal, " + fmtDate(todayKey()), b: [["h2", "How I feel"], ["p", ""], ["h2", "Wins"], ["bullet", ""], ["h2", "Grateful for"], ["bullet", ""], ["h2", "Tomorrow"], ["todo", ""]] },
  idea: { name: "Idea", icon: "💡", title: () => "", b: [["callout", "One-line pitch: "], ["h2", "Problem"], ["p", ""], ["h2", "Solution"], ["p", ""], ["h2", "Next steps"], ["todo", ""]] },
  agency: { name: "Agency tracker", icon: "📸", title: () => "Agencies", b: [["h2", "To apply"], ["todo", ""], ["h2", "Applied, waiting"], ["todo", ""], ["h2", "Follow up"], ["todo", ""], ["h2", "Interested or signed"], ["bullet", ""]] },
  content: { name: "Content plan", icon: "🎬", title: () => "Content ideas", b: [["h2", "Ideas"], ["bullet", ""], ["h2", "To film"], ["todo", ""], ["h2", "Posted"], ["todo", ""]] },
  meeting: { name: "Meeting", icon: "🗓️", title: () => "Meeting, " + fmtDate(todayKey()), b: [["p", "With: "], ["h2", "Notes"], ["bullet", ""], ["h2", "Action items"], ["todo", ""]] },
};
const SC: [string, BType][] = [["### ", "h3"], ["## ", "h2"], ["# ", "h1"], ["- ", "bullet"], ["* ", "bullet"], ["1. ", "num"], ["[] ", "todo"], ["[ ] ", "todo"], ["> ", "quote"], ["! ", "callout"]];

const loadPages = () => S.get<Page[]>("pages", []);
const savePage = (p: Page) => {
  const all = loadPages(),
    i = all.findIndex((x) => x.id === p.id);
  p.updated = Date.now();
  if (i >= 0) all[i] = p;
  else all.push(p);
  S.set("pages", all);
};
function ago(t: number) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
const clean = (s: string) => s.replace(/ /g, " ");

export default function Journal() {
  const [tab, setTab] = useState<"notes" | "reviews">("notes");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const { open } = useUI();
  const { guard } = useActions();

  if (openId)
    return (
      <section className="page">
        <Editor key={openId} id={openId} fresh={fresh} onClose={() => setOpenId(null)} onOpen={(id) => { setFresh(false); setOpenId(id); }} />
      </section>
    );

  const newPage = (t?: string) => {
    const tp = TPL[t];
    const p: Page = {
      id: uid(),
      icon: tp ? tp.icon : "📄",
      title: tp ? tp.title() : "",
      blocks: (tp ? tp.b : [["p", ""] as [BType, string]]).map((x) => ({ id: uid(), type: x[0], text: x[1] })),
      created: Date.now(),
      updated: Date.now(),
      pin: false,
    };
    savePage(p);
    buzz();
    setFresh(true);
    setOpenId(p.id);
  };

  let all = loadPages().slice().sort((a, b) => b.updated - a.updated);
  const ql = q.toLowerCase().trim();
  if (ql) all = all.filter((p) => (p.title + " " + p.blocks.map((b) => b.text).join(" ")).toLowerCase().includes(ql));
  const pin = all.filter((p) => p.pin),
    rest = all.filter((p) => !p.pin);
  const row = (p: Page) => {
    const snip = p.blocks.filter((b) => b.type !== "divider").map((b) => b.text).filter(Boolean).join(" · ").slice(0, 90);
    const todos = p.blocks.filter((b) => b.type === "todo" && b.text);
    return (
      <div className="pgrow" key={p.id} onClick={() => { setFresh(false); setOpenId(p.id); }}>
        <span className="pgi">{p.icon || "📄"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b className="ell" style={{ display: "block" }}>{p.title || <span className="mute">Untitled</span>}</b>
          <div className="small mute ell">{snip || "Empty page"}</div>
        </div>
        <div className="small mute" style={{ textAlign: "right", flex: "none" }}>
          {ago(p.updated)}
          {todos.length > 0 && <div>{todos.filter((t) => t.checked).length}/{todos.length} done</div>}
        </div>
      </div>
    );
  };
  const reviews = dayKeys().filter((k) => getDay(k).review).sort().reverse();

  return (
    <section className="page">
      <h1>Journal</h1>
      <div style={{ marginTop: 16 }}>
        <Seg value={tab} options={[["notes", "Pages"], ["reviews", "Day reviews"]]} onChange={(v) => { setTab(v); buzz(); }} />
      </div>
      {tab === "notes" ? (
        <>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages" />
          <button className="btn" style={{ marginTop: 10 }} onClick={() => newPage()}>
            + New page
          </button>
          <div className="sect">Start from a template</div>
          <div className="chips">
            {Object.keys(TPL).map((k) => (
              <div key={k} className="chip" onClick={() => newPage(k)}>
                {TPL[k].icon} {TPL[k].name}
              </div>
            ))}
          </div>
          {pin.length > 0 && (
            <>
              <div className="sect">Pinned</div>
              <div className="card tight">{pin.map(row)}</div>
            </>
          )}
          {rest.length > 0 && (
            <>
              <div className="sect">{ql ? "Results" : "Recent"}</div>
              <div className="card tight">{rest.map(row)}</div>
            </>
          )}
          {!all.length && <div className="card empty" style={{ marginTop: 14 }}>{ql ? "No pages match." : "No pages yet. Start blank or pick a template."}</div>}
        </>
      ) : (
        <>
          <button className="btn" onClick={() => guard() && open(<ReviewSheet k={todayKey()} />)}>
            Review today
          </button>
          <div style={{ marginTop: 12 }}>
            {reviews.length ? (
              reviews.map((k) => {
                const d = getDay(k),
                  r = d.review,
                  ty = TYPES[d.type || "home"];
                return (
                  <div className="card rv" key={k}>
                    <div className="row between">
                      <h3>Day {dayNum(k)} · {fmtDate(k)}</h3>
                      <span style={{ fontSize: 20 }}>{RATE[r.rate || 0]}</span>
                    </div>
                    <div className="sum">
                      <span className="pill">{pctOf(k)}%</span>
                      <span className="pill">{ty.e} {ty.l}</span>
                      <span className="pill">{d.focus} min focus</span>
                      {d.h.train && <span className="pill">Workout ✓</span>}
                      {d.h.nf && <span className="pill">No Fap ✓</span>}
                    </div>
                    {r.done && <p><b>Done:</b> {r.done}</p>}
                    {r.win && <p><b>Win:</b> {r.win}</p>}
                    {r.fix && <p><b>Tomorrow:</b> {r.fix}</p>}
                  </div>
                );
              })
            ) : (
              <div className="card empty">Your end-of-day reviews will show up here.</div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* EDITOR */
function getSel(t: HTMLElement): [number, number] {
  const s = getSelection();
  if (!s.rangeCount) return [0, 0];
  const r = s.getRangeAt(0),
    a = r.cloneRange();
  a.selectNodeContents(t);
  a.setEnd(r.startContainer, r.startOffset);
  const st = a.toString().length;
  return [st, st + r.toString().length];
}
function setCaret(t: HTMLElement, pos: number) {
  t.normalize();
  const r = document.createRange(),
    node = t.firstChild as Text;
  if (!node) r.setStart(t, 0);
  else r.setStart(node, Math.max(0, Math.min(pos < 0 ? node.length : pos, node.length)));
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}
function makeEditable(el: HTMLElement) {
  el.contentEditable = "plaintext-only";
  if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
  el.spellcheck = true;
}

function Editor({ id, fresh, onClose, onOpen }: { id: string; fresh: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const { open, close, toast } = useUI();
  const pg = useRef<Page>(null);
  if (!pg.current) {
    const f = loadPages().find((p) => p.id === id);
    pg.current = f ? JSON.parse(JSON.stringify(f)) : { id, icon: "📄", title: "", blocks: [], created: Date.now(), updated: Date.now(), pin: false };
    if (!pg.current.blocks.length) pg.current.blocks.push({ id: uid(), type: "p", text: "" });
  }
  const P = pg.current;
  const [rev, setRev] = useState(0); // bump to re-render block structure
  const [cur, setCur] = useState<string | null>(null);
  const [saved, setSaved] = useState("");
  const [slash, setSlash] = useState<{ bid: string; items: BType[]; sel: number; x: number; y: number } | null>(null);
  const focusReq = useRef<{ id: string; pos: number } | "title" | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const saveT = useRef<ReturnType<typeof setTimeout>>(null);

  const doSave = () => {
    savePage(P);
    setSaved("Saved");
  };
  const queueSave = () => {
    clearTimeout(saveT.current);
    setSaved("Saving...");
    saveT.current = setTimeout(doSave, 350);
  };
  const rerender = (focus?: { id: string; pos: number }) => {
    if (focus) focusReq.current = focus;
    setRev((r) => r + 1);
  };
  const txOf = (bid: string) => document.querySelector<HTMLElement>(`[data-bid="${bid}"] .tx`);
  const focusBlock = (bid: string, pos: number) => {
    const t = txOf(bid);
    if (!t) return;
    setCur(bid);
    t.focus();
    try {
      setCaret(t, pos);
    } catch {}
  };

  useLayoutEffect(() => {
    const t = titleRef.current;
    t.textContent = P.title;
    makeEditable(t);
    if (fresh) {
      if (!P.title) t.focus();
      else {
        const b = P.blocks.find((x) => !["divider", "h1", "h2"].includes(x.type)) || P.blocks[0];
        focusReq.current = { id: b.id, pos: -1 };
        setRev((r) => r + 1);
      }
    }
    window.scrollTo?.(0, 0);
  }, []);
  useLayoutEffect(() => {
    const f = focusReq.current;
    focusReq.current = null;
    if (f && f !== "title") focusBlock(f.id, f.pos);
  }, [rev]);

  const finish = () => {
    clearTimeout(saveT.current);
    const empty = !P.title.trim() && P.blocks.every((b) => !b.text.trim());
    if (empty) S.set("pages", loadPages().filter((p) => p.id !== P.id));
    else savePage(P);
    onClose();
  };
  const idx = (bid: string) => P.blocks.findIndex((b) => b.id === bid);

  const setType = (b: Block, ty: BType, pos = -1) => {
    b.type = ty;
    if (ty !== "todo") b.checked = false;
    let f = b.id,
      fp = pos;
    if (ty === "divider") {
      b.text = "";
      const i = idx(b.id);
      let nx = P.blocks[i + 1];
      if (!nx || nx.type === "divider") {
        nx = { id: uid(), type: "p", text: "" };
        P.blocks.splice(i + 1, 0, nx);
      }
      f = nx.id;
      fp = 0;
    }
    queueSave();
    rerender({ id: f, pos: fp });
  };

  const openSlash = (b: Block, t: HTMLElement, q: string) => {
    q = q.toLowerCase();
    const items = ALL.filter((k) => BT[k].toLowerCase().includes(q) || k.startsWith(q));
    if (!items.length) return setSlash(null);
    const r = t.getBoundingClientRect(),
      below = r.bottom + 300 < window.innerHeight - 140;
    setSlash((s) => ({
      bid: b.id,
      items,
      sel: s && s.bid === b.id ? Math.min(s.sel, items.length - 1) : 0,
      x: Math.max(8, Math.min(r.left, window.innerWidth - 244)),
      y: below ? r.bottom + 4 : r.top - Math.min(300, items.length * 46 + 34) - 4,
    }));
  };
  const pickSlash = (ty: BType) => {
    const b = P.blocks.find((x) => x.id === slash?.bid);
    setSlash(null);
    if (!b) return;
    b.text = "";
    const t = txOf(b.id);
    if (t) t.textContent = "";
    setType(b, ty, 0);
  };

  const onInput = (b: Block, t: HTMLElement) => {
    if (t.innerHTML === "<br>") t.innerHTML = "";
    const v = clean(t.textContent);
    if (b.type === "p") {
      for (const [k, ty] of SC)
        if (v.startsWith(k)) {
          b.text = v.slice(k.length);
          t.textContent = b.text;
          return setType(b, ty, -1);
        }
      if (v === "---") return setType(b, "divider");
    }
    b.text = v;
    queueSave();
    if (v.startsWith("/")) openSlash(b, t, v.slice(1));
    else setSlash(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>, b: Block) => {
    const t = e.currentTarget;
    if (slash && slash.bid === b.id) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const d = e.key === "ArrowDown" ? 1 : -1;
        return setSlash({ ...slash, sel: (slash.sel + d + slash.items.length) % slash.items.length });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        return pickSlash(slash.items[slash.sel]);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return setSlash(null);
      }
    }
    const i = idx(b.id);
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const [s0, s1] = getSel(t),
        v = clean(t.textContent);
      if (v === "" && ["bullet", "num", "todo", "quote", "callout", "h1", "h2", "h3"].includes(b.type)) return setType(b, "p", 0);
      b.text = v.slice(0, s0);
      t.textContent = b.text;
      const nb: Block = { id: uid(), type: ["bullet", "num", "todo"].includes(b.type) ? b.type : "p", text: v.slice(s1) };
      P.blocks.splice(i + 1, 0, nb);
      queueSave();
      return rerender({ id: nb.id, pos: 0 });
    }
    if (e.key === "Backspace") {
      const [s0, s1] = getSel(t);
      if (s0 === 0 && s1 === 0) {
        if (b.type !== "p") {
          e.preventDefault();
          b.text = clean(t.textContent);
          return setType(b, "p", 0);
        }
        if (i > 0) {
          e.preventDefault();
          const pv = P.blocks[i - 1];
          if (pv.type === "divider") {
            P.blocks.splice(i - 1, 1);
            queueSave();
            return rerender({ id: b.id, pos: 0 });
          }
          const pos = pv.text.length;
          pv.text += clean(t.textContent);
          P.blocks.splice(i, 1);
          queueSave();
          return rerender({ id: pv.id, pos });
        }
        if (i === 0 && !t.textContent && P.blocks.length > 1) {
          e.preventDefault();
          P.blocks.splice(0, 1);
          queueSave();
          rerender();
          titleRef.current.focus();
          setCaret(titleRef.current, -1);
          return;
        }
      }
    }
    if (e.key === "ArrowUp") {
      const [s0] = getSel(t);
      if (s0 === 0) {
        let j = i - 1;
        while (j >= 0 && P.blocks[j].type === "divider") j--;
        e.preventDefault();
        if (j >= 0) focusBlock(P.blocks[j].id, -1);
        else {
          titleRef.current.focus();
          setCaret(titleRef.current, -1);
        }
      }
    }
    if (e.key === "ArrowDown") {
      const [, s1] = getSel(t);
      if (s1 >= t.textContent.length) {
        let j = i + 1;
        while (j < P.blocks.length && P.blocks[j].type === "divider") j++;
        if (j < P.blocks.length) {
          e.preventDefault();
          focusBlock(P.blocks[j].id, 0);
        }
      }
    }
    if (e.key === "Tab") e.preventDefault();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>, b: Block) => {
    const tx = e.clipboardData.getData("text");
    if (!tx) return;
    e.preventDefault();
    const t = e.currentTarget;
    const L = tx.replace(/\r/g, "").split("\n"),
      [s0, s1] = getSel(t),
      v = t.textContent,
      before = v.slice(0, s0),
      after = v.slice(s1);
    if (L.length === 1) {
      b.text = before + L[0] + after;
      t.textContent = b.text;
      queueSave();
      return focusBlock(b.id, before.length + L[0].length);
    }
    b.text = before + L[0];
    t.textContent = b.text;
    const i = idx(b.id),
      nbs: Block[] = L.slice(1).map((l, j) => ({ id: uid(), type: "p", text: l + (j === L.length - 2 ? after : "") }));
    P.blocks.splice(i + 1, 0, ...nbs);
    queueSave();
    const last = nbs[nbs.length - 1];
    rerender({ id: last.id, pos: last.text.length - after.length });
  };

  const toggleTodo = (b: Block) => {
    b.checked = !b.checked;
    buzz();
    queueSave();
    rerender();
  };
  const addEnd = () => {
    const last = P.blocks[P.blocks.length - 1];
    if (last && last.type === "p" && !last.text) return focusBlock(last.id, 0);
    const nb: Block = { id: uid(), type: "p", text: "" };
    P.blocks.push(nb);
    queueSave();
    rerender({ id: nb.id, pos: 0 });
  };
  const applyFmt = (k: BType) => {
    let b = P.blocks.find((x) => x.id === cur);
    if (!b) {
      b = { id: uid(), type: "p", text: "" };
      P.blocks.push(b);
    }
    const t = txOf(b.id);
    if (t) b.text = clean(t.textContent);
    buzz();
    setType(b, b.type === k && k !== "divider" ? "p" : k);
  };
  const delBlock = () => {
    const i = idx(cur);
    if (i < 0) return;
    P.blocks.splice(i, 1);
    if (!P.blocks.length) P.blocks.push({ id: uid(), type: "p", text: "" });
    queueSave();
    const pv = P.blocks[Math.max(0, i - 1)];
    setCur(null);
    rerender(pv && pv.type !== "divider" ? { id: pv.id, pos: -1 } : undefined);
    buzz();
    toast("Block deleted");
  };

  const pageMenu = () =>
    open(
      <>
        <div className="tag">Page</div>
        <h2 className="disp">{P.title || "Untitled"}</h2>
        <div className="menuitem" onClick={() => { P.pin = !P.pin; doSave(); close(); toast(P.pin ? "Pinned" : "Unpinned"); }}>
          {P.pin ? "☆ Unpin from top" : "★ Pin to top"}
        </div>
        <div
          className="menuitem"
          onClick={() => {
            doSave();
            const c: Page = JSON.parse(JSON.stringify(P));
            c.id = uid();
            c.title = (c.title || "Untitled") + " (copy)";
            c.pin = false;
            c.created = Date.now();
            c.blocks.forEach((b) => (b.id = uid()));
            savePage(c);
            close();
            onOpen(c.id);
            toast("Duplicated");
          }}
        >
          ⧉ Duplicate
        </div>
        <div
          className="menuitem"
          onClick={() => {
            let n = 0;
            const tx = [
              (P.icon ? P.icon + " " : "") + (P.title || "Untitled"),
              "",
              ...P.blocks.map((b) => {
                n = b.type === "num" ? n + 1 : 0;
                const pre = { h1: "# ", h2: "## ", h3: "### ", bullet: "- ", num: n + ". ", todo: b.checked ? "[x] " : "[ ] ", quote: "> ", callout: "💡 ", divider: "---", p: "" }[b.type] || "";
                return pre + b.text;
              }),
            ].join("\n");
            close();
            navigator.clipboard?.writeText(tx).then(() => toast("Copied to clipboard"), () => toast("Copy failed"));
          }}
        >
          ⎘ Copy as text
        </div>
        <div
          className="menuitem red"
          onClick={() => {
            if (!confirm("Delete this page? This cannot be undone.")) return;
            clearTimeout(saveT.current);
            S.set("pages", loadPages().filter((p) => p.id !== P.id));
            close();
            onClose();
            toast("Page deleted");
          }}
        >
          🗑 Delete page
        </div>
      </>
    );
  const iconPicker = () =>
    open(
      <>
        <div className="tag">Page icon</div>
        <h2 className="disp">Pick an icon</h2>
        <div className="emojis">
          {ICONS.map((e) => (
            <button key={e} onClick={() => { P.icon = e; doSave(); close(); rerender(); buzz(); }}>
              {e}
            </button>
          ))}
        </div>
      </>
    );

  const words = (P.title + " " + P.blocks.map((b) => b.text).join(" ")).trim().split(/\s+/).filter(Boolean).length;
  const td = P.blocks.filter((b) => b.type === "todo" && b.text);
  let num = 0;

  return (
    <>
      <div className="edtop">
        <button className="mini" onClick={finish}>‹ Pages</button>
        <span className="small mute">{saved}</span>
        <span style={{ flex: 1 }} />
        <button className="mini" onClick={pageMenu}>•••</button>
      </div>
      <div className="pgicon" onClick={iconPicker}>{P.icon || "📄"}</div>
      <div
        className="pgtitle"
        ref={titleRef}
        data-ph="Untitled"
        onInput={(e) => {
          const t = e.currentTarget;
          if (t.innerHTML === "<br>") t.innerHTML = "";
          P.title = clean(t.textContent);
          queueSave();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const b = P.blocks.find((x) => x.type !== "divider");
            if (b) focusBlock(b.id, 0);
          }
        }}
        onFocus={() => setCur(null)}
      />
      <div className="small mute" style={{ margin: "8px 0 18px" }}>
        Edited {ago(P.updated)} · {words} word{words === 1 ? "" : "s"}
        {td.length > 0 && ` · ${td.filter((b) => b.checked).length}/${td.length} to-dos done`}
      </div>
      <div>
        {P.blocks.map((b) => {
          num = b.type === "num" ? num + 1 : 0;
          if (b.type === "divider")
            return (
              <div key={b.id} data-bid={b.id} className={"blk b-divider" + (cur === b.id ? " sel" : "")} onClick={() => setCur(b.id)}>
                <hr />
              </div>
            );
          return (
            <BlockRow
              key={b.id}
              b={b}
              n={num}
              rev={rev}
              onInput={onInput}
              onKey={onKey}
              onPaste={onPaste}
              onFocus={() => setCur(b.id)}
              onBlur={() => setTimeout(() => !document.activeElement?.closest?.(".blk") && setSlash(null), 150)}
              onToggle={() => toggleTodo(b)}
            />
          );
        })}
      </div>
      <div className="addblock" onClick={addEnd}>+ Add a block</div>
      <div style={{ height: 160 }} />

      {slash && (
        <div className="slash" style={{ left: slash.x, top: slash.y }}>
          <div className="small mute" style={{ padding: "6px 10px", fontWeight: 700 }}>Turn into</div>
          {slash.items.map((k, i) => (
            <div key={k} className={"si" + (i === slash.sel ? " on" : "")} onMouseDown={(e) => { e.preventDefault(); pickSlash(k); }}>
              <span className="sic">{BI[k]}</span>
              {BT[k]}
            </div>
          ))}
        </div>
      )}
      <div className="fmtbar">
        <div className="in">
          {ALL.map((k) => (
            <button
              key={k}
              title={BT[k]}
              className={P.blocks.find((x) => x.id === cur)?.type === k ? "on" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyFmt(k)}
            >
              {BI[k]}
            </button>
          ))}
          <button title="Delete block" onMouseDown={(e) => e.preventDefault()} onClick={delBlock}>🗑</button>
        </div>
      </div>
    </>
  );
}

type RowProps = {
  b: Block;
  n: number;
  rev: number;
  onInput: (b: Block, t: HTMLElement) => void;
  onKey: (e: KeyboardEvent<HTMLDivElement>, b: Block) => void;
  onPaste: (e: React.ClipboardEvent<HTMLDivElement>, b: Block) => void;
  onFocus: () => void;
  onBlur: () => void;
  onToggle: () => void;
};
/** One editable block. React never renders its text; we sync the DOM ourselves so the caret survives typing. */
function BlockRow({ b, n, rev, onInput, onKey, onPaste, onFocus, onBlur, onToggle }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    makeEditable(ref.current);
  }, []);
  useLayoutEffect(() => {
    if (ref.current.textContent !== b.text) ref.current.textContent = b.text;
  }, [rev, b.type]);
  let mk = null;
  if (b.type === "todo")
    mk = (
      <span className={"cb" + (b.checked ? " on" : "")} onMouseDown={(e) => e.preventDefault()} onClick={onToggle}>
        {b.checked && <Check />}
      </span>
    );
  else if (b.type === "bullet") mk = <span className="mk">•</span>;
  else if (b.type === "num") mk = <span className="mk">{n}.</span>;
  else if (b.type === "callout") mk = <span className="mk">💡</span>;
  return (
    <div data-bid={b.id} className={"blk b-" + b.type + (b.checked ? " done" : "")}>
      {mk}
      <div
        className="tx"
        ref={ref}
        data-ph={PH[b.type] || ""}
        suppressContentEditableWarning
        onInput={(e) => onInput(b, e.currentTarget)}
        onKeyDown={(e) => onKey(e, b)}
        onPaste={(e) => onPaste(e, b)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
}
