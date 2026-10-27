import { ImageResponse } from "next/og";

/** App icon: dark lock on the ember orange, full-bleed so it works as a maskable icon. */
export function iconArt(size: number) {
  const s = Math.round(size * 0.62);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #ffb066 0%, #ff6a1f 55%, #e2470a 100%)" }}>
        <svg width={s} height={s} viewBox="12 10 40 44">
          <path d="M23 29v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#160800" strokeWidth="5" strokeLinecap="round" />
          <rect x="16" y="28" width="32" height="24" rx="6" fill="#160800" />
          <path d="M33.5 32 26 42.5h5L29.5 49 38 38h-5.2z" fill="#ff6a1f" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
