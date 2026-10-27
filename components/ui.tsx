"use client";
import { createContext, ReactNode, useCallback, useContext, useRef, useState } from "react";

type UI = { toast: (t: string) => void; open: (n: ReactNode, onClose?: () => void) => void; close: () => void; sheetOpen: boolean };
const Ctx = createContext<UI>(null);
export const useUI = () => useContext(Ctx);

export function UIProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null);
  const [sheet, setSheet] = useState<ReactNode>(null);
  const tm = useRef<ReturnType<typeof setTimeout>>(null);
  const onCloseRef = useRef<() => void>(null);
  const toast = useCallback((t: string) => {
    setMsg({ t, k: Date.now() });
    clearTimeout(tm.current);
    tm.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  const open = useCallback((n: ReactNode, onClose?: () => void) => {
    onCloseRef.current = onClose || null;
    setSheet(n);
    document.body.style.overflow = "hidden";
  }, []);
  const close = useCallback(() => {
    setSheet(null);
    document.body.style.overflow = "";
  }, []);
  const dismiss = () => {
    onCloseRef.current?.();
    close();
  };
  return (
    <Ctx.Provider value={{ toast, open, close, sheetOpen: !!sheet }}>
      {children}
      {msg && (
        <div className="toast" key={msg.k}>
          {msg.t}
        </div>
      )}
      {sheet && (
        <div className="sheetbg" onClick={(e) => e.target === e.currentTarget && dismiss()}>
          <div className="sheet">
            <button className="x" onClick={dismiss} aria-label="Close">
              ×
            </button>
            <div className="grab" />
            {sheet}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--acc)" />
      <path d="M23 29v-6a9 9 0 0 1 18 0v6" fill="none" stroke="var(--onacc)" strokeWidth="5" strokeLinecap="round" />
      <rect x="16" y="28" width="32" height="24" rx="6" fill="var(--onacc)" />
      <path d="M33.5 32 26 42.5h5L29.5 49 38 38h-5.2z" fill="var(--acc)" />
    </svg>
  );
}

export const Bolt = () => (
  <svg viewBox="0 0 24 24">
    <path d="M13.5 2 4 14h7l-1.5 8L20 9.5h-7z" fill="var(--onacc)" />
  </svg>
);

/** Circular progress ring. pct is 0..1. */
export function Ring({ size, stroke, pct, children }: { size: number; stroke: number; pct: number; children?: ReactNode }) {
  const r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="trk" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          className="arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, pct)))}
        />
      </svg>
      <div className="lbl">{children}</div>
    </div>
  );
}

/** Shared SVG gradient referenced by every .arc stroke. */
export const Defs = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
    <defs>
      <linearGradient id="accgrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--acc2)" />
        <stop offset="100%" stopColor="var(--acc)" />
      </linearGradient>
    </defs>
  </svg>
);

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => (
        <button key={v} className={v === value ? "on" : ""} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export const NavIcon = ({ p }: { p: string }) => {
  const paths: Record<string, ReactNode> = {
    today: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    train: <path d="M3 10v4M6.5 7v10M17.5 7v10M21 10v4M6.5 12h11" />,
    eat: <path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M16.5 3c-2 2-2.5 6 0 8.5V21" />,
    focus: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M10 2h4" />
      </>
    ),
    journal: (
      <>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M9.5 10h6M9.5 14h6M9.5 18h3.5" />
      </>
    ),
    plan: (
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </>
    ),
  };
  return <svg viewBox="0 0 24 24">{paths[p]}</svg>;
};
