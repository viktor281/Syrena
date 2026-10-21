import { create } from "zustand";
import { OBLASTS, OBLAST_BY_ID, MAP_VIEW, type OblastId } from "@/data/oblasts";
import { isLevel, LEVEL_BY_ID, SEVERITY, worstLevel, type Level } from "@/data/levels";
import { ZONES, ZONES_BY_OBLAST, ZONE_BY_ID } from "@/data/raions";
import { FRONT_LEVELS, SHAHED, SNAPSHOTS, WAVE, type Timeline } from "@/data/scenarios";
import { parseAlerts } from "@/lib/parse-alerts";

export type LogItem = {
  id: string;
  clock: string;
  text: string;
  level: Level;
};

export type MapMode = "oblast" | "raion";
export type CraftKind = "shahed" | "missile" | "soldier" | "tank" | "ship";
export type GroundKind = "soldier" | "tank";
export type LaunchEdge = "east" | "north" | "sea";

export type Craft = {
  id: string;
  kind: CraftKind;
  targetId: OblastId;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  warned: boolean;
  cargo?: GroundKind;
  landed?: boolean;
};

export type CivilWarning = {
  level: Level;
  place: string;
  detail: string;
};

type Levels = Record<string, Level>;

type SimState = {
  levels: Levels;
  brush: Level;
  sound: boolean;
  speed: 1 | 2 | 4;
  playing: boolean;
  scenarioId: string | null;
  scenarioName: string | null;
  timeline: Timeline | null;
  playhead: number;
  pulse: Partial<Record<string, number>>;
  mode: MapMode;
  selectedOblastId: OblastId | null;
  selectedZoneId: string | null;
  log: LogItem[];
  crafts: Craft[];
  arm: CraftKind | null;
  edge: LaunchEdge;
  shipCargo: GroundKind;
  warning: CivilWarning | null;
  setBrush: (level: Level) => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  setMode: (mode: MapMode) => void;
  toggleSound: () => void;
  selectOblast: (id: OblastId) => void;
  paintOblast: (id: OblastId, level?: Level) => void;
  paintZone: (id: string, level?: Level) => void;
  playSnapshot: (id: string) => void;
  playTimeline: (id: "wave" | "shahed") => void;
  startAllClear: () => void;
  togglePlay: () => void;
  tick: (dt: number) => void;
  importText: (text: string) => { applied: number; unknown: string[] };
  hydrate: (saved: { levels?: Record<string, string>; brush?: string }) => void;
  setArm: (arm: CraftKind) => void;
  setEdge: (edge: LaunchEdge) => void;
  setShipCargo: (cargo: GroundKind) => void;
  clearWarning: () => void;
  announceCivil: () => void;
  launchAt: (id: OblastId, kind?: CraftKind) => void;
  launchSalvo: (kind: CraftKind) => void;
  tickCrafts: (dt: number) => void;
};

const TIMELINES: Record<string, Timeline> = { wave: WAVE, shahed: SHAHED };
let logSeq = 0;
let craftSeq = 0;

const SALVO: Record<CraftKind, readonly OblastId[]> = {
  shahed: ["murmansk", "arkhangelsk", "moscow", "rostov", "krasnodar", "novosibirsk", "krasnoyarsk"],
  missile: ["moscow", "spb", "novosibirsk", "primorye"],
  soldier: ["belgorod", "kursk", "rostov", "bryansk", "voronezh"],
  tank: ["belgorod", "rostov", "krasnodar", "kursk"],
  ship: ["kaliningrad", "murmansk", "krasnodar", "primorye", "kamchatka", "sakhalin"],
};

function kyivClock(): string {
  return new Intl.DateTimeFormat("uk-UA", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function fill(partial: Partial<Record<OblastId, Level>>): Levels {
  const levels: Levels = {};
  for (const zone of ZONES) levels[zone.id] = partial[zone.oblastId] ?? "none";
  return levels;
}

export function oblastLevel(levels: Levels, id: OblastId): Level {
  return worstLevel(ZONES_BY_OBLAST[id].map((zone) => levels[zone.id] ?? "none"));
}

function entry(name: string, level: Level, clock = kyivClock()): LogItem {
  logSeq += 1;
  return { id: `log-${logSeq}`, clock, text: `${LEVEL_BY_ID[level].phrase} · ${name}`, level };
}

function note(text: string, level: Level = "none"): LogItem {
  logSeq += 1;
  return { id: `log-${logSeq}`, clock: kyivClock(), text, level };
}

function raiseOblast(levels: Levels, pulse: SimState["pulse"], id: OblastId, level: Level): boolean {
  const current = oblastLevel(levels, id);
  if (SEVERITY.indexOf(level) >= SEVERITY.indexOf(current)) return false;
  return applyOblast(levels, pulse, id, level);
}

function coastFor(toX: number, toY: number): { x: number; y: number; fromX: number; fromY: number } {
  const { w, h } = MAP_VIEW;
  if (toX > w * 0.78) return { x: Math.min(w - 18, toX + 14), y: toY, fromX: w + 80, fromY: toY };
  if (toX < w * 0.16) return { x: Math.max(16, toX - 8), y: toY, fromX: -80, fromY: toY };
  if (toY < h * 0.42) return { x: toX, y: Math.max(20, toY - 14), fromX: toX, fromY: -70 };
  return { x: toX, y: Math.min(h - 18, toY + 12), fromX: toX, fromY: h + 80 };
}

function alertFor(kind: CraftKind): Level | null {
  if (kind === "missile") return "red";
  if (kind === "shahed") return "yellow";
  if (kind === "soldier") return "street";
  if (kind === "tank") return "artillery";
  return null;
}

function launchText(kind: CraftKind, name: string, cargo: GroundKind): string {
  if (kind === "missile") return `Пуск ракети · ${name}`;
  if (kind === "soldier") return `Солдати рушають · ${name}. Далі вуличні бої.`;
  if (kind === "tank") return `Танки рушають · ${name}. Далі загроза артобстрілу.`;
  if (kind === "ship") return `Корабель до ${name}. На борту ${cargo === "tank" ? "танки" : "солдати"}.`;
  return `Пуск шахеда · ${name}`;
}

function salvoText(kind: CraftKind, cargo: GroundKind): string {
  if (kind === "missile") return "Ракетний залп. Червоний рівень на підльоті.";
  if (kind === "soldier") return "Колона солдатів. На підході загроза вуличних боїв.";
  if (kind === "tank") return "Колона танків. На підході загроза артобстрілу.";
  if (kind === "ship") return cargo === "tank" ? "Морський десант із танками." : "Морський десант із солдатами.";
  return "Хвиля шахедів. Жовтий рівень на підльоті.";
}

function makeCraft(
  kind: CraftKind,
  edge: LaunchEdge,
  id: OblastId,
  progress: number,
  cargo: GroundKind = "soldier",
  origin?: { x: number; y: number },
): Craft {
  const [labelX, labelY] = OBLAST_BY_ID[id].label;
  const jitter = ((craftSeq % 5) - 2) * 18;
  let toX = labelX;
  let toY = labelY;
  let fromX = 1060;
  let fromY = toY + jitter * 0.35;
  if (kind === "ship") {
    const coast = coastFor(labelX, labelY);
    toX = coast.x;
    toY = coast.y;
    fromX = coast.fromX;
    fromY = coast.fromY;
  } else if (origin) {
    fromX = origin.x + jitter * 0.15;
    fromY = origin.y;
  } else if (edge === "north") {
    fromX = toX + jitter;
    fromY = -36;
  } else if (edge === "sea") {
    fromX = Math.min(820, Math.max(260, toX + jitter));
    fromY = 740;
  }
  craftSeq += 1;
  return {
    id: `craft-${craftSeq}`,
    kind,
    targetId: id,
    fromX,
    fromY,
    toX,
    toY,
    progress,
    warned: false,
    cargo: kind === "ship" ? cargo : undefined,
    landed: false,
  };
}

function applyOblast(levels: Levels, pulse: SimState["pulse"], id: OblastId, level: Level): boolean {
  let changed = false;
  for (const zone of ZONES_BY_OBLAST[id]) {
    if (levels[zone.id] === level) continue;
    levels[zone.id] = level;
    pulse[zone.id] = (pulse[zone.id] ?? 0) + 1;
    changed = true;
  }
  if (changed) pulse[id] = (pulse[id] ?? 0) + 1;
  return changed;
}

export const useSim = create<SimState>((set, get) => ({
  levels: fill(FRONT_LEVELS),
  brush: "red",
  sound: false,
  speed: 2,
  playing: false,
  scenarioId: "front",
  scenarioName: "Фронт",
  timeline: null,
  playhead: 0,
  pulse: {},
  mode: "raion",
  selectedOblastId: null,
  selectedZoneId: null,
  log: [
    {
      id: "boot",
      clock: "демо",
      text: "Навчальна картина «Фронт». Це не справжні тривоги.",
      level: "red",
    },
  ],
  crafts: [],
  arm: null,
  edge: "east",
  shipCargo: "soldier",
  warning: null,
  setBrush: (brush) => set({ brush }),
  setSpeed: (speed) => set({ speed }),
  setMode: (mode) => set({ mode }),
  toggleSound: () => set({ sound: !get().sound }),
  selectOblast: (selectedOblastId) => set({ selectedOblastId, selectedZoneId: null }),
  paintOblast: (id, level) => {
    const state = get();
    const next = level ?? state.brush;
    const levels = { ...state.levels };
    const pulse = { ...state.pulse };
    if (!applyOblast(levels, pulse, id, next)) {
      set({ selectedOblastId: id, selectedZoneId: null });
      return;
    }
    set({
      levels,
      pulse,
      selectedOblastId: id,
      selectedZoneId: null,
      playing: false,
      scenarioId: null,
      scenarioName: null,
      log: [entry(OBLAST_BY_ID[id].name, next), ...state.log].slice(0, 40),
    });
  },
  paintZone: (id, level) => {
    const zone = ZONE_BY_ID[id];
    if (!zone) return;
    const state = get();
    const next = level ?? state.brush;
    if (state.levels[id] === next) {
      set({ selectedZoneId: id, selectedOblastId: zone.oblastId });
      return;
    }
    set({
      selectedZoneId: id,
      selectedOblastId: zone.oblastId,
      playing: false,
      scenarioId: null,
      scenarioName: null,
      levels: { ...state.levels, [id]: next },
      pulse: { ...state.pulse, [id]: (state.pulse[id] ?? 0) + 1, [zone.oblastId]: (state.pulse[zone.oblastId] ?? 0) + 1 },
      log: [entry(zone.name, next), ...state.log].slice(0, 40),
    });
  },
  playSnapshot: (id) => {
    const snapshot = SNAPSHOTS.find((item) => item.id === id);
    if (!snapshot) return;
    set({
      levels: fill(snapshot.levels),
      playing: false,
      timeline: null,
      playhead: 0,
      scenarioId: snapshot.id,
      scenarioName: snapshot.name,
      pulse: {},
      log: [note(`Сценарій «${snapshot.name}»`, "yellow"), ...get().log].slice(0, 40),
    });
  },
  playTimeline: (id) => {
    const timeline = TIMELINES[id];
    if (!timeline) return;
    set({
      levels: fill({}),
      playing: true,
      timeline,
      playhead: 0,
      scenarioId: timeline.id,
      scenarioName: timeline.name,
      pulse: {},
      log: [note(`Старт «${timeline.name}»`, "red"), ...get().log].slice(0, 40),
    });
  },
  startAllClear: () => {
    const state = get();
    const frames = [...OBLASTS]
      .filter((oblast) => oblastLevel(state.levels, oblast.id) !== "none")
      .sort((a, b) => a.label[0] - b.label[0])
      .map((oblast, index) => ({ t: 0.25 + index * 0.38, id: oblast.id, level: "none" as const }));
    if (frames.length === 0) {
      set({ log: [note("Тривог немає — відбій не потрібен"), ...state.log].slice(0, 40) });
      return;
    }
    const duration = (frames[frames.length - 1]?.t ?? 0) + 0.5;
    set({
      playing: true,
      scenarioId: "all-clear",
      scenarioName: "Відбій",
      timeline: { id: "all-clear", name: "Відбій", duration, frames },
      playhead: 0,
      log: [note("Відбій із заходу на схід", "yellow"), ...state.log].slice(0, 40),
    });
  },
  togglePlay: () => {
    const state = get();
    if (!state.timeline || state.playhead >= state.timeline.duration) return;
    set({ playing: !state.playing });
  },
  tick: (dt) => {
    const state = get();
    if (!state.playing || !state.timeline) return;
    const prev = state.playhead;
    let next = prev + dt;
    const frames = state.timeline.frames
      .filter((frame) => frame.t > prev && frame.t <= next)
      .sort((a, b) => a.t - b.t);
    const levels = { ...state.levels };
    const pulse = { ...state.pulse };
    const logs: LogItem[] = [];
    const clock = kyivClock();
    for (const frame of frames) {
      if (!applyOblast(levels, pulse, frame.id, frame.level)) continue;
      logs.push(entry(OBLAST_BY_ID[frame.id].name, frame.level, clock));
    }
    const done = next >= state.timeline.duration;
    if (done) next = state.timeline.duration;
    set({
      playhead: next,
      playing: !done,
      ...(logs.length ? { levels, pulse, log: [...logs.reverse(), ...state.log].slice(0, 40) } : {}),
    });
  },
  importText: (text) => {
    const { changes, unknown } = parseAlerts(text);
    const state = get();
    const levels = { ...state.levels };
    const pulse = { ...state.pulse };
    const logs: LogItem[] = [];
    let applied = 0;
    for (const change of changes) {
      if (change.kind === "zone") {
        const zone = ZONE_BY_ID[change.id];
        if (!zone || levels[zone.id] === change.level) continue;
        levels[zone.id] = change.level;
        pulse[zone.id] = (pulse[zone.id] ?? 0) + 1;
        logs.push(entry(zone.name, change.level));
        applied += 1;
        continue;
      }
      if (!applyOblast(levels, pulse, change.id, change.level)) continue;
      logs.push(entry(OBLAST_BY_ID[change.id].name, change.level));
      applied += 1;
    }
    set({
      levels,
      pulse,
      playing: false,
      scenarioId: null,
      scenarioName: null,
      log: [note(`Імпорт: оновлено ${applied}`), ...logs.reverse(), ...state.log].slice(0, 40),
    });
    return { applied, unknown };
  },
  hydrate: (saved) => {
    const levels = { ...get().levels };
    if (saved.levels) {
      const zoneIds = new Set(ZONES.map((zone) => zone.id));
      const zonal = Object.keys(saved.levels).some((key) => zoneIds.has(key));
      if (zonal) {
        for (const zone of ZONES) {
          const value = saved.levels[zone.id];
          if (isLevel(value)) levels[zone.id] = value;
        }
      } else {
        for (const oblast of OBLASTS) {
          const value = saved.levels[oblast.id];
          if (!isLevel(value)) continue;
          for (const zone of ZONES_BY_OBLAST[oblast.id]) levels[zone.id] = value;
        }
      }
    }
    set({
      levels,
      brush: isLevel(saved.brush) ? saved.brush : get().brush,
      scenarioId: null,
      scenarioName: "Збережено",
      playing: false,
      timeline: null,
    });
  },
  setArm: (arm) => {
    if (get().arm === arm) set({ arm: null });
    else set({ arm, ...(arm === "ship" ? { edge: "sea" as const } : {}) });
  },
  setEdge: (edge) => set({ edge }),
  setShipCargo: (shipCargo) => set({ shipCargo }),
  clearWarning: () => set({ warning: null }),
  announceCivil: () => {
    const state = get();
    const place = state.selectedOblastId ? OBLAST_BY_ID[state.selectedOblastId].name : "Росія";
    const level = state.selectedOblastId
      ? oblastLevel(state.levels, state.selectedOblastId)
      : worstLevel(OBLASTS.map((oblast) => oblastLevel(state.levels, oblast.id)));
    set({
      warning: {
        level,
        place,
        detail:
          level === "none"
            ? "Відбій. Чинних попереджень цивільного захисту немає."
            : "Попередження цивільного захисту. Навчальне оголошення.",
      },
      log: [note(`Попередження ЦЗ · ${place}`, level), ...state.log].slice(0, 40),
    });
  },
  launchAt: (id, kind) => {
    const state = get();
    const nextKind = kind ?? state.arm;
    if (!nextKind || !OBLAST_BY_ID[id]) return;
    const craft = makeCraft(nextKind, nextKind === "ship" ? "sea" : state.edge, id, 0, state.shipCargo);
    const name = OBLAST_BY_ID[id].name;
    const level = alertFor(nextKind) ?? (state.shipCargo === "tank" ? "artillery" : "street");
    set({
      crafts: [...state.crafts, craft].slice(-32),
      playing: false,
      selectedOblastId: id,
      selectedZoneId: null,
      log: [note(launchText(nextKind, name, state.shipCargo), level), ...state.log].slice(0, 40),
    });
  },
  launchSalvo: (kind) => {
    const state = get();
    const crafts = SALVO[kind].map((id, index) =>
      makeCraft(
        kind,
        kind === "ship" ? "sea" : index % 3 === 2 ? "sea" : index % 2 === 0 ? "east" : "north",
        id,
        -index * 0.18,
        state.shipCargo,
      ),
    );
    const level = alertFor(kind) ?? (state.shipCargo === "tank" ? "artillery" : "street");
    set({
      crafts: [...state.crafts, ...crafts].slice(-32),
      arm: kind,
      ...(kind === "ship" ? { edge: "sea" as const } : {}),
      playing: false,
      log: [note(salvoText(kind, state.shipCargo), level), ...state.log].slice(0, 40),
    });
  },
  tickCrafts: (dt) => {
    const state = get();
    if (state.crafts.length === 0) return;
    const levels = { ...state.levels };
    const pulse = { ...state.pulse };
    const logs: LogItem[] = [];
    const spawned: Craft[] = [];
    let warning = state.warning;
    let changed = false;
    const crafts: Craft[] = [];
    for (const craft of state.crafts) {
      const duration =
        (craft.kind === "missile" ? 5.2 : craft.kind === "ship" ? 9 : craft.kind === "tank" ? 11 : craft.kind === "soldier" ? 14 : 13) /
        state.speed;
      const progress = craft.progress + dt / duration;
      let warned = craft.warned;
      let landed = craft.landed ?? false;
      const level = alertFor(craft.kind);
      if (level && !warned && progress >= 0.84) {
        warned = true;
        const name = OBLAST_BY_ID[craft.targetId].name;
        const current = oblastLevel(levels, craft.targetId);
        const raised = raiseOblast(levels, pulse, craft.targetId, level);
        if (raised) {
          changed = true;
          logs.push(entry(name, level));
        } else {
          logs.push(note(`${LEVEL_BY_ID[level].phrase} біля ${name} не знижує сильнішу тривогу.`, current));
        }
        warning = {
          level: raised ? level : current,
          place: name,
          detail:
            craft.kind === "soldier"
              ? "Солдати на підході. Загроза вуличних боїв."
              : craft.kind === "tank"
                ? "Танки на підході. Загроза артобстрілу."
                : craft.kind === "missile"
                  ? "Ракета на підльоті. Повітряна тривога, червоний рівень."
                  : "Шахед на підльоті. Дронова загроза, жовтий рівень.",
        };
      }
      if (craft.kind === "ship" && !landed && progress >= 0.9) {
        landed = true;
        const cargo = craft.cargo ?? "soldier";
        spawned.push(makeCraft(cargo, "east", craft.targetId, 0, cargo, { x: craft.toX, y: craft.toY }));
        const name = OBLAST_BY_ID[craft.targetId].name;
        logs.push(
          note(
            cargo === "tank" ? `Висадка танків біля ${name}.` : `Висадка солдатів біля ${name}.`,
            cargo === "tank" ? "artillery" : "street",
          ),
        );
      }
      if (progress < 1.12) crafts.push({ ...craft, progress, warned, landed });
    }
    set({
      crafts: [...crafts, ...spawned].slice(-32),
      ...(changed ? { levels, pulse } : {}),
      ...(warning !== state.warning ? { warning } : {}),
      ...(logs.length ? { log: [...logs.reverse(), ...state.log].slice(0, 40) } : {}),
    });
  },
}));
