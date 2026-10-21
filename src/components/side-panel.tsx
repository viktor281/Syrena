import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { ADVICE, emptyCounts, LEVELS, LEVEL_BY_ID, worstLevel } from "@/data/levels";
import { OBLASTS } from "@/data/oblasts";
import { ZONES, ZONES_BY_OBLAST } from "@/data/raions";
import { SNAPSHOTS } from "@/data/scenarios";
import { previewLevel, unlockAudio } from "@/lib/siren";
import { oblastLevel, useSim } from "@/lib/sim-store";
import { LifeDesk } from "@/components/life-desk";
import { DESKS, type Desk } from "@/data/life";

export function SidePanel() {
  const levels = useSim((state) => state.levels);
  const brush = useSim((state) => state.brush);
  const setBrush = useSim((state) => state.setBrush);
  const selectedOblastId = useSim((state) => state.selectedOblastId);
  const selectedZoneId = useSim((state) => state.selectedZoneId);
  const paintOblast = useSim((state) => state.paintOblast);
  const paintZone = useSim((state) => state.paintZone);
  const selectOblast = useSim((state) => state.selectOblast);
  const mode = useSim((state) => state.mode);
  const setMode = useSim((state) => state.setMode);
  const playSnapshot = useSim((state) => state.playSnapshot);
  const playTimeline = useSim((state) => state.playTimeline);
  const startAllClear = useSim((state) => state.startAllClear);
  const scenarioId = useSim((state) => state.scenarioId);
  const speed = useSim((state) => state.speed);
  const setSpeed = useSim((state) => state.setSpeed);
  const playing = useSim((state) => state.playing);
  const togglePlay = useSim((state) => state.togglePlay);
  const timeline = useSim((state) => state.timeline);
  const playhead = useSim((state) => state.playhead);
  const log = useSim((state) => state.log);
  const importText = useSim((state) => state.importText);
  const arm = useSim((state) => state.arm);
  const setArm = useSim((state) => state.setArm);
  const edge = useSim((state) => state.edge);
  const setEdge = useSim((state) => state.setEdge);
  const shipCargo = useSim((state) => state.shipCargo);
  const setShipCargo = useSim((state) => state.setShipCargo);
  const launchAt = useSim((state) => state.launchAt);
  const launchSalvo = useSim((state) => state.launchSalvo);
  const announceCivil = useSim((state) => state.announceCivil);
  const [draft, setDraft] = useState(
    "Москва червона\nМурманськ радіаційна\nБєлгород артобстріл\nРостов вуличні\nКарелія болота",
  );
  const [importNote, setImportNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pane, setPane] = useState<"siren" | "life">("siren");
  const [desk, setDesk] = useState<Desk>("home");

  const counts = useMemo(() => {
    const tally = emptyCounts();
    for (const zone of ZONES) tally[levels[zone.id] ?? "none"] += 1;
    return tally;
  }, [levels]);

  const selected = OBLASTS.find((oblast) => oblast.id === selectedOblastId) ?? null;
  const selectedRaions = selected ? ZONES_BY_OBLAST[selected.id] : [];
  const filtered = OBLASTS.filter((oblast) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      oblast.name.toLowerCase().includes(q) ||
      oblast.short.toLowerCase().includes(q) ||
      ZONES_BY_OBLAST[oblast.id].some((zone) => zone.short.toLowerCase().includes(q))
    );
  });
  const progress = timeline && timeline.duration > 0 ? Math.min(100, (playhead / timeline.duration) * 100) : 0;

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 flex gap-1 border-b border-line bg-bg p-2">
        <button
          type="button"
          aria-pressed={pane === "siren"}
          onClick={() => setPane("siren")}
          className={`min-h-11 flex-1 rounded-md text-sm font-semibold ${pane === "siren" ? "bg-surface" : "text-muted"}`}
        >
          Тривога
        </button>
        <button
          type="button"
          aria-pressed={pane === "life"}
          onClick={() => setPane("life")}
          className={`min-h-11 flex-1 rounded-md text-sm font-semibold ${pane === "life" ? "bg-surface" : "text-muted"}`}
        >
          Крім тривог
        </button>
      </div>
      {pane === "life" ? (
        <div>
          <div className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2">
            {DESKS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={desk === item.id}
                onClick={() => setDesk(item.id)}
                className={`min-h-11 shrink-0 rounded-md px-3 text-sm font-semibold ${desk === item.id ? "bg-surface" : "text-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <LifeDesk
            desk={desk}
            onOpenMap={(id) => {
              selectOblast(id);
              setMode("oblast");
              setPane("siren");
            }}
          />
        </div>
      ) : (
    <div className="flex flex-col gap-5 p-4">
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Легенда</h2>
        <ul className="overflow-hidden rounded-lg border border-line bg-bg-deep">
          {LEVELS.map((level) => {
            const active = brush === level.id;
            return (
              <li key={level.id} className="flex border-b border-line last:border-b-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setBrush(level.id)}
                  className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left ${active ? `bg-surface ring-2 ring-inset ${level.ring}` : "hover:bg-surface"}`}
                >
                  <span className={`size-4 shrink-0 rounded-sm ${level.bg}`} />
                  <span className="truncate text-sm" title={level.label}>
                    {level.short}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted tabular-nums">{counts[level.id]}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Прослухати: ${level.label}`}
                  onClick={() => previewLevel(level.id)}
                  className="flex w-11 shrink-0 items-center justify-center border-l border-line text-muted hover:bg-surface hover:text-fg"
                >
                  <Volume2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Цифри — райони. Динамік грає український голос і сигнал.</p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Запуск</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={arm === "shahed"}
            onClick={() => setArm("shahed")}
            className={`min-h-11 rounded-md border text-sm font-semibold ${arm === "shahed" ? "border-alert-yellow bg-alert-yellow text-bg" : "border-line"}`}
          >
            Шахед
          </button>
          <button
            type="button"
            aria-pressed={arm === "missile"}
            onClick={() => setArm("missile")}
            className={`min-h-11 rounded-md border text-sm font-semibold ${arm === "missile" ? "border-alert-red bg-alert-red text-bg" : "border-line"}`}
          >
            Ракета
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["east", "Схід"],
              ["north", "Північ"],
              ["sea", "Море"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={edge === id}
              onClick={() => setEdge(id)}
              className={`min-h-11 rounded-md border text-sm ${edge === id ? "border-fg bg-surface" : "border-line"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => launchSalvo("shahed")}
            className="min-h-11 rounded-md border border-alert-yellow px-2 text-left text-sm font-semibold"
          >
            Хвиля шахедів
            <span className="mt-0.5 block text-xs font-normal text-muted">Жовта дронова загроза</span>
          </button>
          <button
            type="button"
            onClick={() => launchSalvo("missile")}
            className="min-h-11 rounded-md border border-alert-red px-2 text-left text-sm font-semibold"
          >
            Ракетний залп
            <span className="mt-0.5 block text-xs font-normal text-muted">Червона тривога</span>
          </button>
          <button
            type="button"
            onClick={() => launchSalvo("soldier")}
            className="min-h-11 rounded-md border border-alert-street px-2 text-left text-sm font-semibold"
          >
            Колона солдатів
            <span className="mt-0.5 block text-xs font-normal text-muted">Вуличні бої</span>
          </button>
          <button
            type="button"
            onClick={() => launchSalvo("tank")}
            className="min-h-11 rounded-md border border-alert-orange px-2 text-left text-sm font-semibold"
          >
            Колона танків
            <span className="mt-0.5 block text-xs font-normal text-muted">Загроза артобстрілу</span>
          </button>
          <button
            type="button"
            onClick={() => launchSalvo("ship")}
            className="col-span-2 min-h-11 rounded-md border border-line px-2 text-left text-sm font-semibold"
          >
            Морський десант
            <span className="mt-0.5 block text-xs font-normal text-muted">
              {shipCargo === "tank" ? "Кораблі везуть танки" : "Кораблі везуть солдатів"}
            </span>
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {arm === "shahed"
            ? "Клік по карті пускає шахед. На підльоті область стає жовтою."
            : arm === "missile"
              ? "Клік по карті пускає ракету. На підльоті область стає червоною."
              : arm === "soldier"
                ? "Клік по карті веде солдатів. На підході вмикаються вуличні бої."
                : arm === "tank"
                  ? "Клік по карті веде танки. На підході вмикається загроза артобстрілу."
                  : arm === "ship"
                    ? "Корабель іде морем і висаджує солдатів або танки. Тривогу вмикає вже висадка."
                    : "Увімкніть тип, тоді клікніть ціль. На карті видно маршрут і мітку."}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Мапа</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("oblast")}
            className={`min-h-11 rounded-md border text-sm font-semibold ${mode === "oblast" ? "border-alert-yellow bg-surface" : "border-line"}`}
          >
            Регіони
          </button>
          <button
            type="button"
            onClick={() => setMode("raion")}
            className={`min-h-11 rounded-md border text-sm font-semibold ${mode === "raion" ? "border-alert-yellow bg-surface" : "border-line"}`}
          >
            Контури
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Сценарії</h2>
        <div className="grid grid-cols-2 gap-2">
          {SNAPSHOTS.map((snapshot) => (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => playSnapshot(snapshot.id)}
              className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${scenarioId === snapshot.id ? "border-alert-yellow bg-surface" : "border-line bg-bg-deep hover:bg-surface"}`}
            >
              <span className="block font-semibold">{snapshot.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{snapshot.blurb}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => playTimeline("wave")}
            className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${scenarioId === "wave" ? "border-alert-yellow bg-surface" : "border-line bg-bg-deep hover:bg-surface"}`}
          >
            <span className="block font-semibold">Хвиля</span>
            <span className="mt-0.5 block text-xs text-muted">Зі сходу на захід і відбій</span>
          </button>
          <button
            type="button"
            onClick={() => playTimeline("shahed")}
            className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${scenarioId === "shahed" ? "border-alert-yellow bg-surface" : "border-line bg-bg-deep hover:bg-surface"}`}
          >
            <span className="block font-semibold">Шахеди</span>
            <span className="mt-0.5 block text-xs text-muted">Коридор південь → захід</span>
          </button>
          <button
            type="button"
            onClick={startAllClear}
            className="min-h-11 rounded-md border border-line bg-bg-deep px-3 py-2 text-left text-sm hover:bg-surface"
          >
            <span className="block font-semibold">Відбій</span>
            <span className="mt-0.5 block text-xs text-muted">Зняти поточні тривоги</span>
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted">Темп</span>
          {([1, 2, 4] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              className={`min-h-11 min-w-11 rounded-md border px-2 font-mono text-sm tabular-nums ${speed === value ? "border-alert-yellow bg-surface" : "border-line"}`}
            >
              {value}×
            </button>
          ))}
          <button
            type="button"
            onClick={togglePlay}
            disabled={!timeline || playhead >= (timeline?.duration ?? 0)}
            className="ml-auto min-h-11 rounded-md border border-line px-3 text-sm disabled:opacity-40"
          >
            {playing ? "Пауза" : "Далі"}
          </button>
        </div>
        {timeline ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full bg-alert-red" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Цивільний захист</h2>
        {(() => {
          const top = worstLevel(OBLASTS.map((oblast) => oblastLevel(levels, oblast.id)));
          return (
            <div className="rounded-lg border border-line bg-bg-deep p-3">
              <p className="text-sm font-semibold">{top === "none" ? "Немає чинного попередження" : LEVEL_BY_ID[top].phrase}</p>
              <p className="mt-1 text-sm text-muted">{ADVICE[top]}</p>
              <button
                type="button"
                onClick={() => {
                  announceCivil();
                  void unlockAudio().then(() => previewLevel(top));
                }}
                className="mt-3 min-h-11 w-full rounded-md bg-surface px-3 text-sm font-semibold"
              >
                Оголосити українською
              </button>
            </div>
          );
        })()}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Обрана область</h2>
        {selected ? (
          <div className="rounded-lg border border-line bg-bg-deep p-3">
            <p className="font-semibold">{selected.name}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted">
              <span className={`size-2.5 rounded-sm ${LEVEL_BY_ID[oblastLevel(levels, selected.id)].bg}`} />
              {LEVEL_BY_ID[oblastLevel(levels, selected.id)].label}
            </p>
            <button
              type="button"
              onClick={() => paintOblast(selected.id)}
              className="mt-3 min-h-11 w-full rounded-md bg-surface px-3 text-sm"
            >
              Пензель на всю область
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => launchAt(selected.id, "shahed")}
                className="min-h-11 rounded-md border border-alert-yellow px-2 text-sm font-semibold"
              >
                Шахед сюди
              </button>
              <button
                type="button"
                onClick={() => launchAt(selected.id, "missile")}
                className="min-h-11 rounded-md border border-alert-red px-2 text-sm font-semibold"
              >
                Ракета сюди
              </button>
            </div>
            <ul className="mt-3 max-h-52 overflow-y-auto rounded-md border border-line">
              {selectedRaions.map((zone) => (
                <li key={zone.id}>
                  <button
                    type="button"
                    onClick={() => paintZone(zone.id)}
                    className={`flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm ${selectedZoneId === zone.id ? "bg-surface" : "hover:bg-surface"}`}
                  >
                    <span className={`size-3 shrink-0 rounded-sm ${LEVEL_BY_ID[levels[zone.id] ?? "none"].bg}`} />
                    <span className="truncate">{zone.short}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted">Клацніть область або район на карті.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Вставити список</h2>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          spellCheck={false}
          aria-label="Список тривог по областях"
          className="w-full resize-y rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => {
            const result = importText(draft);
            const missed = result.unknown.length ? ` Не розпізнав: ${result.unknown.join("; ")}.` : "";
            setImportNote(`Оновлено ${result.applied}.${missed}`);
          }}
          className="mt-2 min-h-11 w-full rounded-md bg-alert-red px-3 text-sm font-semibold text-bg"
        >
          Нанести на карту
        </button>
        {importNote ? <p className="mt-2 text-xs text-muted">{importNote}</p> : null}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Стрічка</h2>
        <ol className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
          {log.map((item) => (
            <li key={item.id} className="flex gap-2 text-sm">
              <span className={`mt-1 size-2 shrink-0 rounded-sm ${LEVEL_BY_ID[item.level].bg}`} />
              <span className="min-w-0">
                <span className="mr-2 font-mono text-xs text-muted tabular-nums">{item.clock}</span>
                {item.text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Усі області</h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Пошук області"
          aria-label="Пошук області"
          className="mb-2 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg placeholder:text-muted"
        />
        <ul className="max-h-60 overflow-y-auto rounded-lg border border-line">
          {filtered.map((oblast) => (
            <li key={oblast.id}>
              <button
                type="button"
                onClick={() => selectOblast(oblast.id)}
                className={`flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm ${selectedOblastId === oblast.id ? "bg-surface" : "hover:bg-surface"}`}
              >
                <span className={`size-3 shrink-0 rounded-sm ${LEVEL_BY_ID[oblastLevel(levels, oblast.id)].bg}`} />
                <span className="truncate">{oblast.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
      )}
    </div>
  );
}
