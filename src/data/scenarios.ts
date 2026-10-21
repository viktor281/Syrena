import type { OblastId } from "@/data/oblasts";
import type { Level } from "@/data/levels";

export type Frame = { t: number; id: OblastId; level: Level };

export type Timeline = {
  id: string;
  name: string;
  duration: number;
  frames: Frame[];
};

export type Snapshot = {
  kind: "snapshot";
  id: string;
  name: string;
  blurb: string;
  levels: Partial<Record<OblastId, Level>>;
};

const FRONT: Partial<Record<OblastId, Level>> = {
  belgorod: "street",
  kursk: "artillery",
  bryansk: "yellow",
  voronezh: "red",
  rostov: "red",
  krasnodar: "yellow",
  "moscow-obl": "yellow",
  moscow: "red",
};

function wave(t: number, pairs: [OblastId, Level][]): Frame[] {
  return pairs.map(([id, level]) => ({ t, id, level }));
}

const WAVE_FRAMES: Frame[] = [
  ...wave(1, [
    ["belgorod", "street"],
    ["kursk", "artillery"],
    ["rostov", "yellow"],
  ]),
  ...wave(6, [
    ["voronezh", "red"],
    ["krasnodar", "yellow"],
    ["bryansk", "yellow"],
    ["smolensk", "yellow"],
  ]),
  ...wave(12, [
    ["moscow-obl", "yellow"],
    ["moscow", "red"],
    ["spb", "yellow"],
    ["kaliningrad", "yellow"],
  ]),
  ...wave(18, [
    ["tatarstan", "red"],
    ["nnov", "yellow"],
    ["samara", "yellow"],
    ["volgograd", "red"],
  ]),
  ...wave(24, [
    ["sverdlovsk", "yellow"],
    ["bashkortostan", "yellow"],
    ["chelyabinsk", "red"],
  ]),
  ...wave(30, [
    ["novosibirsk", "red"],
    ["omsk", "yellow"],
    ["krasnoyarsk", "yellow"],
  ]),
  ...wave(36, [
    ["irkutsk", "yellow"],
    ["buryatia", "yellow"],
    ["sakha", "yellow"],
    ["khabarovsk", "red"],
    ["primorye", "yellow"],
    ["kamchatka", "yellow"],
  ]),
  ...wave(44, [
    ["kaliningrad", "none"],
    ["smolensk", "none"],
    ["bryansk", "none"],
    ["spb", "none"],
  ]),
  ...wave(52, [
    ["moscow", "none"],
    ["moscow-obl", "none"],
    ["krasnodar", "none"],
    ["rostov", "none"],
    ["voronezh", "none"],
  ]),
  ...wave(60, [
    ["tatarstan", "none"],
    ["nnov", "none"],
    ["samara", "none"],
    ["volgograd", "none"],
    ["sverdlovsk", "none"],
    ["bashkortostan", "none"],
    ["chelyabinsk", "none"],
  ]),
  ...wave(68, [
    ["novosibirsk", "none"],
    ["omsk", "none"],
    ["krasnoyarsk", "none"],
    ["irkutsk", "none"],
    ["buryatia", "none"],
    ["sakha", "none"],
    ["khabarovsk", "none"],
    ["primorye", "none"],
    ["kamchatka", "none"],
    ["belgorod", "none"],
    ["kursk", "none"],
  ]),
];

const SHAHED_PATH: OblastId[] = [
  "kaliningrad",
  "pskov",
  "leningrad",
  "novgorod",
  "tver",
  "moscow",
  "nnov",
  "tatarstan",
  "sverdlovsk",
  "tyumen",
  "omsk",
  "novosibirsk",
  "krasnoyarsk",
  "irkutsk",
  "khabarovsk",
  "primorye",
];

const SHAHED_FRAMES: Frame[] = SHAHED_PATH.flatMap((id, index) => {
  const t = 1 + index * 3.2;
  return [
    { t, id, level: "yellow" as const },
    { t: t + 1.6, id, level: "red" as const },
    { t: t + 5.4, id, level: "none" as const },
  ];
});

export const WAVE: Timeline = {
  id: "wave",
  name: "Хвиля",
  duration: 74,
  frames: WAVE_FRAMES,
};

export const SHAHED: Timeline = {
  id: "shahed",
  name: "Шахеди",
  duration: 1 + SHAHED_PATH.length * 3.2 + 6,
  frames: SHAHED_FRAMES,
};

export const SNAPSHOTS: Snapshot[] = [
  {
    kind: "snapshot",
    id: "quiet",
    name: "Тиша",
    blurb: "Уся карта без тривог",
    levels: {},
  },
  {
    kind: "snapshot",
    id: "front",
    name: "Фронт",
    blurb: "Навчальна картина західного краю",
    levels: FRONT,
  },
  {
    kind: "snapshot",
    id: "hazard",
    name: "Нові звуки",
    blurb: "Хімічна, радіація, арт і сирена",
    levels: {
      moscow: "red",
      spb: "chemical",
      murmansk: "radiation",
      belgorod: "artillery",
      rostov: "street",
      novosibirsk: "high",
      kamchatka: "yellow",
    },
  },
  {
    kind: "snapshot",
    id: "swamp",
    name: "Болота",
    blurb: "Жарт зі легенди: північні краї",
    levels: {
      karelia: "swamp",
      komi: "swamp",
      arkhangelsk: "swamp",
      vologda: "swamp",
    },
  },
];

export const FRONT_LEVELS = FRONT;
