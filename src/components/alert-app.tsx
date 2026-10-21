import { useEffect, useMemo, useRef, useState } from "react";
import { Siren, Volume2, VolumeX } from "lucide-react";
import { ADVICE, emptyCounts, LEVELS, LEVEL_BY_ID } from "@/data/levels";
import { OBLASTS } from "@/data/oblasts";
import { ZONES } from "@/data/raions";
import { previewLevel, stopFlight, syncAlerts, syncFlight, unlockAudio } from "@/lib/siren";
import { useSim, oblastLevel } from "@/lib/sim-store";
import { UkraineMap } from "@/components/ukraine-map";
import { SidePanel } from "@/components/side-panel";

const STORAGE_KEY = "syrena-map-ru-v1";

function formatKyiv(date: Date): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function LaunchNotice({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-title"
        className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-alert-red text-bg">
            <Siren className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-wide text-alert-yellow uppercase">Ранній доступ</p>
            <h2 id="launch-title" className="text-xl leading-tight font-extrabold">
              Гра щойно вийшла
            </h2>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-fg">
          Сирена тільки що запустилась. Це навчальна гра, не справжні тривоги.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Можуть бути баги: карта, звук або анімації інколи працюють не так. Якщо щось зламалось — оновіть сторінку.
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-5 min-h-11 w-full rounded-md bg-alert-red px-4 text-sm font-extrabold text-bg"
        >
          Зрозуміло, граю
        </button>
      </div>
    </div>
  );
}

export function AlertApp() {
  const sound = useSim((state) => state.sound);
  const toggleSound = useSim((state) => state.toggleSound);
  const setBrush = useSim((state) => state.setBrush);
  const levels = useSim((state) => state.levels);
  const scenarioName = useSim((state) => state.scenarioName);
  const playing = useSim((state) => state.playing);
  const speed = useSim((state) => state.speed);
  const brush = useSim((state) => state.brush);
  const warning = useSim((state) => state.warning);
  const clearWarning = useSim((state) => state.clearWarning);
  const [clock, setClock] = useState("––:––:––");
  const [welcome, setWelcome] = useState(true);

  const counts = useMemo(() => {
    const tally = emptyCounts();
    for (const zone of ZONES) tally[levels[zone.id] ?? "none"] += 1;
    return tally;
  }, [levels]);
  const sheltered = useMemo(
    () => OBLASTS.reduce((sum, oblast) => sum + (oblastLevel(levels, oblast.id) === "none" ? 0 : 4), 0),
    [levels],
  );

  useEffect(() => {
    const tick = () => setClock(formatKyiv(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) useSim.getState().hydrate(JSON.parse(raw) as { levels?: Record<string, string> });
    } catch {
      /* ignore broken saves */
    }
    return useSim.subscribe((state, prev) => {
      if (state.levels === prev.levels && state.brush === prev.brush) return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ levels: state.levels, brush: state.brush }),
      );
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000) * useSim.getState().speed;
      last = now;
      useSim.getState().tick(dt);
      if (useSim.getState().playing) frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, speed]);

  useEffect(() => {
    syncAlerts(counts, sound);
  }, [sound, counts]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const state = useSim.getState();
      if (state.crafts.length > 0) state.tickCrafts(dt);
      const flying = useSim.getState().crafts.filter((craft) => craft.progress >= 0 && craft.progress < 1);
      syncFlight(
        flying.filter((craft) => craft.kind === "shahed").length,
        flying.filter((craft) => craft.kind === "missile").length,
        useSim.getState().sound,
      );
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (welcome) return;
      const index = "123456789".indexOf(event.key);
      if (index >= 0) setBrush(LEVELS[index].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setBrush, welcome]);

  return (
    <main className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex shrink-0 items-center gap-3 border-b border-line px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-alert-red text-bg">
            <Siren className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-lg leading-none font-extrabold tracking-tight">Сирена</p>
            <p className="mt-1 truncate text-xs text-muted">Навчальна карта Росії</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <p className="hidden text-right sm:block">
            <span className="block font-mono text-sm tabular-nums">{clock}</span>
            <span className="block text-xs text-muted">час Києва</span>
          </p>
          <span className="rounded-md bg-surface px-2.5 py-1.5 text-center font-mono text-xs tabular-nums">
            <span className="block text-base leading-none font-semibold text-fg">{sheltered}</span>
            <span className="text-muted">в укритті</span>
          </span>
          <button
            type="button"
            aria-pressed={sound}
            onClick={() => {
              void (async () => {
                if (!sound) await unlockAudio();
                toggleSound();
              })();
            }}
            className="flex size-11 items-center justify-center rounded-md border border-line bg-surface"
          >
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5 text-muted" />}
            <span className="sr-only">{sound ? "Вимкнути сирену" : "Увімкнути сирену"}</span>
          </button>
        </div>
      </header>

      <p className="shrink-0 border-b border-line bg-surface px-3 py-2 text-xs leading-snug text-alert-yellow sm:px-4">
        Навчальний симулятор. Не показує справжні тривоги і не замінює офіційні сповіщення.
        {scenarioName ? ` Зараз: ${scenarioName}${playing ? " · іде відтворення" : ""}.` : ""}
      </p>

      {warning ? (
        <div
          role="alert"
          className={`shrink-0 border-b px-3 py-3 sm:px-4 ${warning.level === "none" ? "bg-surface text-fg" : `${LEVEL_BY_ID[warning.level].bg} text-bg`}`}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tracking-wide uppercase">Попередження цивільного захисту</p>
              <p className="mt-1 text-base font-extrabold">
                {LEVEL_BY_ID[warning.level].phrase} · {warning.place}
              </p>
              <p className="mt-1 text-sm">{warning.detail}</p>
              <p className="mt-1 text-sm">{ADVICE[warning.level]}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  void unlockAudio().then(() => previewLevel(warning.level));
                }}
                className="min-h-11 rounded-md bg-bg/20 px-3 text-sm font-semibold"
              >
                Голос
              </button>
              <button type="button" onClick={clearWarning} className="min-h-11 rounded-md bg-bg/20 px-3 text-sm font-semibold">
                Закрити
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {welcome ? <LaunchNotice onClose={() => setWelcome(false)} /> : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-[42vh] flex-1">
          <UkraineMap />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 lg:hidden">
            <div className="pointer-events-auto flex gap-2 overflow-x-auto px-3 py-2">
              {LEVELS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={brush === level.id}
                  onClick={() => setBrush(level.id)}
                  className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border bg-bg/90 px-3 text-sm backdrop-blur-sm ${brush === level.id ? "border-fg" : "border-line"}`}
                >
                  <span className={`size-3 rounded-sm ${level.bg}`} />
                  {level.short}
                </button>
              ))}
            </div>
          </div>
        </div>
        <aside className="max-h-[52vh] overflow-y-auto border-t border-line lg:max-h-none lg:w-96 lg:shrink-0 lg:border-t-0 lg:border-l">
          <SidePanel />
        </aside>
      </div>
    </main>
  );
}
