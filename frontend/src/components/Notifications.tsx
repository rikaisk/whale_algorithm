import { useEffect, useRef, useState } from "react";

export type NotifKind = "comment" | "reply" | "mention";

export interface Toast {
  id: string;
  kind: NotifKind;
  from_username: string;
  content: string;
  post_id?: string | null;
  comment_id?: string | null;
  created_at: number;
}

// 종류별 설정
export interface KindSetting {
  show: boolean; // 알림 표시 여부 (투명도 왼쪽 체크박스 → 끄면 '알림 미표시')
  transparency: number; // 0~100, 클수록 투명. 100이면 안 보임
  sound: boolean; // 소리 여부 (음량 왼쪽 체크박스 → 끄면 '음소거')
  volume: number; // 0~1
}

export interface NotifSettings {
  masterOff: boolean; // 모두 끄기
  durationSec: number; // 알림 유지 시간 1~15초
  comment: KindSetting;
  reply: KindSetting;
  mention: KindSetting;
}

// 우선순위: 내 게시물에 댓글 < 내 댓글에 답글 < 회원님을 언급
export const KIND_PRIORITY: Record<NotifKind, number> = {
  comment: 1,
  reply: 2,
  mention: 3,
};

const KIND_META: Record<NotifKind, { label: string; emoji: string; freq: number }> = {
  comment: { label: "내 게시물에 댓글", emoji: "💬", freq: 660 },
  reply: { label: "내 댓글에 답글", emoji: "↪️", freq: 520 },
  mention: { label: "회원님을 언급", emoji: "@", freq: 820 },
};

const SETTINGS_KEY = "wg_notif_settings";

const DEFAULT_KIND: KindSetting = { show: true, transparency: 8, sound: true, volume: 0.6 };

const DEFAULT_SETTINGS: NotifSettings = {
  masterOff: false,
  durationSec: 6,
  comment: { ...DEFAULT_KIND },
  reply: { ...DEFAULT_KIND },
  mention: { ...DEFAULT_KIND, transparency: 4 },
};

function clone(s: NotifSettings): NotifSettings {
  return JSON.parse(JSON.stringify(s));
}

function clampDuration(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.durationSec;
  return Math.min(15, Math.max(1, Math.round(n)));
}

export function loadNotifSettings(): NotifSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return clone(DEFAULT_SETTINGS);
    const p = JSON.parse(raw);
    const mergeKind = (k: NotifKind): KindSetting => ({
      ...DEFAULT_SETTINGS[k],
      ...(p && typeof p[k] === "object" ? p[k] : {}),
    });
    return {
      masterOff: typeof p?.masterOff === "boolean" ? p.masterOff : false,
      durationSec: clampDuration(p?.durationSec),
      comment: mergeKind("comment"),
      reply: mergeKind("reply"),
      mention: mergeKind("mention"),
    };
  } catch {
    return clone(DEFAULT_SETTINGS);
  }
}

export function saveNotifSettings(s: NotifSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// WebAudio로 짧은 알림음 합성 (상호작용 종류별 음높이 / 음량 반영)
let _audioCtx: AudioContext | null = null;
export function playNotifSound(kind: NotifKind, settings: NotifSettings): void {
  if (settings.masterOff) return;
  const ks = settings[kind];
  if (!ks?.sound) return;
  const volume = Math.min(1, Math.max(0, ks.volume ?? 0.6));
  if (volume <= 0) return;
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
    const peak = 0.28 * volume;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
  } catch {
    /* 무음 */
  }
}

// 우하단 알림 스택: 새 알림이 아래에서 올라오고(newest 아래), 기존 알림을 위로 밀어냄
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
  if (settings.masterOff) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column-reverse", // newest(배열 첫 요소)를 맨 아래로
        gap: 8,
        width: 300,
        maxWidth: "calc(100vw - 32px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const meta = KIND_META[t.kind];
        const ks = settings[t.kind];
        if (!ks?.show) return null; // 알림 미표시
        const transparency = Math.min(100, Math.max(0, ks.transparency ?? 0));
        if (transparency >= 100) return null; // 완전 투명 → 보이지 않음
        const opacity = 1 - transparency / 100;
        return (
          <div
            key={t.id}
            className="wg-toast"
            onClick={() => onOpen?.(t)}
            style={{
              pointerEvents: "auto",
              cursor: onOpen ? "pointer" : "default",
              background: `rgba(28,28,30,${opacity})`,
              color: `rgba(255,255,255,${opacity})`,
              borderRadius: 12,
              padding: "10px 12px",
              boxShadow: `0 6px 20px rgba(0,0,0,${0.25 * opacity})`,
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

// 알림 설정 패널
export function NotifSettingsPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: NotifSettings;
  onChange: (s: NotifSettings) => void;
  onClose: () => void;
}) {
  const commit = (next: NotifSettings) => {
    onChange(next);
    saveNotifSettings(next);
  };
  const updateKind = (kind: NotifKind, patch: Partial<KindSetting>) => {
    commit({ ...settings, [kind]: { ...settings[kind], ...patch } });
  };
  const updateGlobal = (patch: Partial<NotifSettings>) => {
    commit({ ...settings, ...patch });
  };

  const muted = settings.masterOff;
  const labelMutedStyle: React.CSSProperties = muted ? { opacity: 0.4 } : {};

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
        style={{ width: "100%", maxWidth: 400, padding: 18, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>알림 설정</h3>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: muted ? "var(--ig-danger)" : "var(--ig-text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
            title="모든 알림 끄기"
          >
            <input
              type="checkbox"
              checked={settings.masterOff}
              onChange={(e) => updateGlobal({ masterOff: e.target.checked })}
            />
            모두 끄기
          </label>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ fontSize: 18, color: "var(--ig-text-muted)" }}>
            ✕
          </button>
        </div>

        {/* 알림 유지 시간 (1~15초) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0 12px" }}>
          <span style={{ fontSize: 13, color: "var(--ig-text-muted)", width: 64, ...labelMutedStyle }}>
            유지 시간
          </span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            disabled={muted}
            value={settings.durationSec}
            onChange={(e) => updateGlobal({ durationSec: clampDuration(Number(e.target.value)) })}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 12, width: 36, textAlign: "right", ...labelMutedStyle }}>
            {settings.durationSec}초
          </span>
        </div>

        {(Object.keys(KIND_META) as NotifKind[]).map((kind) => {
          const ks = settings[kind];
          return (
            <div key={kind} style={{ padding: "10px 0", borderTop: "1px solid var(--ig-border-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, ...labelMutedStyle }}>
                <span>{KIND_META[kind].emoji}</span>
                <b style={{ fontSize: 14 }}>{KIND_META[kind].label}</b>
              </div>

              {/* 투명도: 왼쪽 체크박스(표시 여부) + 0~100% 슬라이더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input
                  type="checkbox"
                  disabled={muted}
                  checked={ks.show}
                  onChange={(e) => updateKind(kind, { show: e.target.checked })}
                  title="알림 표시 / 미표시"
                />
                <span
                  style={{ fontSize: 12, color: "var(--ig-text-muted)", width: 40, ...(muted || !ks.show ? { opacity: 0.4 } : {}) }}
                >
                  투명도
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={muted || !ks.show}
                  value={ks.transparency}
                  onChange={(e) => updateKind(kind, { transparency: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, width: 40, textAlign: "right", ...(muted || !ks.show ? { opacity: 0.4 } : {}) }}>
                  {Math.round(ks.transparency)}%
                </span>
              </div>

              {/* 음량: 왼쪽 체크박스(소리 여부) + 0~100% 슬라이더 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  disabled={muted}
                  checked={ks.sound}
                  onChange={(e) => updateKind(kind, { sound: e.target.checked })}
                  title="소리 켜기 / 음소거"
                />
                <span
                  style={{ fontSize: 12, color: "var(--ig-text-muted)", width: 40, ...(muted || !ks.sound ? { opacity: 0.4 } : {}) }}
                >
                  음량
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={muted || !ks.sound}
                  value={Math.round(ks.volume * 100)}
                  onChange={(e) => updateKind(kind, { volume: Number(e.target.value) / 100 })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, width: 40, textAlign: "right", ...(muted || !ks.sound ? { opacity: 0.4 } : {}) }}>
                  {Math.round(ks.volume * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// App에서 토스트 큐를 관리하는 훅
function groupKey(t: Toast): string {
  // 같은 근원(게시물·댓글·작성자)에서 온 알림은 하나로 묶어 우선순위가 가장 높은 것만 표시
  return `${t.post_id ?? ""}|${t.comment_id ?? ""}|${t.from_username}`;
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});
  const toastsRef = useRef<Toast[]>([]);

  useEffect(() => {
    toastsRef.current = toasts;
  }, [toasts]);

  const scheduleTimer = (id: string, durationMs: number) => {
    timers.current[id] = window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      delete timers.current[id];
    }, durationMs);
  };

  const push = (t: Toast, durationMs = 6000) => {
    const key = groupKey(t);
    const existing = toastsRef.current.find((x) => groupKey(x) === key);
    if (existing && KIND_PRIORITY[t.kind] <= KIND_PRIORITY[existing.kind]) {
      // 이미 더 높거나 같은 우선순위의 알림이 떠 있음 → 무시
      return;
    }
    if (existing) {
      // 같은 근원의 더 높은 우선순위 알림 → 기존 것 교체
      if (timers.current[existing.id]) {
        window.clearTimeout(timers.current[existing.id]);
        delete timers.current[existing.id];
      }
      setToasts((prev) => [t, ...prev.filter((x) => groupKey(x) !== key)].slice(0, 5));
    } else {
      setToasts((prev) => [t, ...prev].slice(0, 5));
    }
    scheduleTimer(t.id, durationMs);
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
