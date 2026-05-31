import { useMemo } from "react";

interface Props {
  username: string;
  size?: number;
  ring?: boolean;
  src?: string | null;
  onClick?: () => void;
}

const PALETTES: [string, string][] = [
  ["#f09433", "#dc2743"],
  ["#4f5bd5", "#962fbf"],
  ["#0095f6", "#1ea7fd"],
  ["#feda75", "#fa7e1e"],
  ["#2dd4bf", "#0ea5e9"],
  ["#a855f7", "#ec4899"],
  ["#22c55e", "#16a34a"],
  ["#ef4444", "#f97316"],
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function Avatar({ username, size = 36, ring = false, src, onClick }: Props) {
  const { gradient, letter } = useMemo(() => {
    const safe = (username || "?").trim();
    const idx = hashString(safe) % PALETTES.length;
    const [a, b] = PALETTES[idx];
    return {
      gradient: `linear-gradient(135deg, ${a} 0%, ${b} 100%)`,
      letter: safe.charAt(0).toUpperCase(),
    };
  }, [username]);

  const dim = `${size}px`;
  const fontSize = Math.max(10, Math.floor(size * 0.42));

  const inner = (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        background: src ? "#fff" : gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 700,
        fontSize,
        userSelect: "none",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {src ? (
        <img
          src={src}
          alt={username}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        letter
      )}
    </div>
  );

  if (ring) {
    return (
      <div
        onClick={onClick}
        style={{
          padding: 2,
          borderRadius: "50%",
          background: "var(--ig-border)",
          display: "inline-flex",
          cursor: onClick ? "pointer" : "default",
        }}
      >
        <div style={{ padding: 2, borderRadius: "50%", background: "#fff" }}>{inner}</div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{ display: "inline-flex", cursor: onClick ? "pointer" : "default" }}
    >
      {inner}
    </div>
  );
}
