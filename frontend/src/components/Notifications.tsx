import { useEffect, useRef, useState } from "react";

export type NotifKind = "comment" | "reply" | "mention";

export interface Toast {
  id: string;
  kind: NotifKind;
  from_username: string;
  content: string;
  post_id?: string | null;
  created_at: number;
}

export interface KindSetting {
  opacity: number; // 0.3 ~ 1.0
  sound: boolean;
}
export type NotifSettings = Record<NotifKind, KindSetting>;

const KIND_META: Record<NotifKind, { label: string; emoji: string; freq: number }> = {
  comment: { label: "내 게시물에 댓글", emoji: "💬", freq: 660 },
  reply: { label: "내 댓글에 답글", emoji: "↪️", freq: 520 },
  mention: { label: "회원님을 언급", emoji: "@", freq: 820 },
};

const SETTINGS_KEY = "wg_notif_settings";

const DEFAULT_SETTINGS: NotifSettings = {
  comment: { opacity: 0.92, sound: true },
  reply: { opacity: 0.92, sound: true },
  mention: { opacity: 0.96, sound: true },
};

export function loadNotifSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveNotifSettings(s: NotifSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// WebAudio로 짧은 알림음 합성 (상호작용 종류별 음높이)
let _audioCtx: AudioContext | null = null;
export function playNotifSound(kind: NotifKind, settings: NotifSettings): void {
  if (!settings[kind]?.sound) return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    if (!_audioCtx) _audioCtx = new Ctx();
    const ctx = _audioCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = KIND_META[kind].freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
  } catch {
    /* 무음 */
  }
}

// 우상단 알림 스택: 새 알림이 위에서 드롭, 기존 알림을 아래로 밀어냄(newest 위)
export function NotificationStack({
  toasts,
  settings,
  onClose,
  onOpen,
}: {
  toasts: Toast[];
  settings: NotifSettings;
  onClose: (id: string) => void;
  onOpen?: (t: Toast) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 70,
        right: 16,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: 300,
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const meta = KIND_META[t.kind];
        const opacity = settings[t.kind]?.opacity ?? 0.92;
        return (
          <div
            key={t.id}
            className="wg-toast"
            onClick={() => onOpen?.(t)}
            style={{
              pointerEvents: "auto",
              cursor: onOpen ? "pointer" : "default",
              background: `rgba(28,28,30,${opacity})`,
              color: "#fff",
              borderRadius: 12,
              padding: "10px 12px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 13 }}>{meta.emoji}</span>
              <b style={{ fontSize: 13 }}>{t.from_username}</b>
              <span style={{ fontSize: 11, opacity: 0.8 }}>· {meta.label}</span>
              <span style={{ flex: 1 }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(t.id);
                }}
                style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}
                title="닫기"
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.95, wordBreak: "break-word" }}>
              {t.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 알림 설정 패널 (종류별 투명도/소리)
export function NotifSettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: NotifSettings;
  onChange: (s: NotifSettings) => void;
  onClose: () => void;
}) {
  const update = (kind: NotifKind, patch: Partial<KindSetting>) => {
    const next = { ...settings, [kind]: { ...settings[kind], ...patch } };
    onChange(next);
    saveNotifSettings(next);
  };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ig-card"
        style={{ width: "100%", maxWidth: 380, padding: 18 }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>알림 설정</h3>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ fontSize: 18, color: "var(--ig-text-muted)" }}>
            ✕
          </button>
        </div>
        {(Object.keys(KIND_META) as NotifKind[]).map((kind) => (
          <div
            key={kind}
            style={{ padding: "10px 0", borderTop: "1px solid var(--ig-border-soft)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span>{KIND_META[kind].emoji}</span>
              <b style={{ fontSize: 14 }}>{KIND_META[kind].label}</b>
              <span style={{ flex: 1 }} />
              <label style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <input
                  type="checkbox"
                  checked={settings[kind].sound}
                  onChange={(e) => update(kind, { sound: e.target.checked })}
                />
                소리
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--ig-text-muted)", width: 44 }}>투명도</span>
              <input
                type="range"
                min={0.3}
                max={1}
                step={0.02}
                value={settings[kind].opacity}
                onChange={(e) => update(kind, { opacity: Number(e.target.value) })}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 12, width: 36, textAlign: "right" }}>
                {Math.round(settings[kind].opacity * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// App에서 토스트 큐를 관리하는 훅
export function useToasts(autoDismissMs = 6000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});

  const push = (t: Toast) => {
    setToasts((prev) => [t, ...prev].slice(0, 5)); // newest 위, 최대 5개
    timers.current[t.id] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, autoDismissMs);
  };

  const close = (id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    if (timers.current[id]) {
      window.clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  };

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return { toasts, push, close };
}
