export const LEVELS = [
  {
    id: "red",
    label: "Повітряна тривога (червоний рівень)",
    short: "Червона",
    phrase: "Повітряна тривога",
    voice: "Увага! Повітряна тривога. Негайно прямуйте в укриття.",
    fill: "fill-alert-red",
    bg: "bg-alert-red",
    ring: "ring-alert-red",
  },
  {
    id: "high",
    label: "Високий рівень небезпеки",
    short: "Високий",
    phrase: "Високий рівень небезпеки",
    voice: "Увага! Високий рівень небезпеки.",
    fill: "fill-alert-high",
    bg: "bg-alert-high",
    ring: "ring-alert-high",
  },
  {
    id: "yellow",
    label: "Дронова загроза (жовтий рівень)",
    short: "Дрони",
    phrase: "Дронова загроза",
    voice: "Увага! Дронова загроза. Жовтий рівень. Можливий підліт ударних безпілотників. Пройдіть в укриття.",
    fill: "fill-alert-yellow",
    bg: "bg-alert-yellow",
    ring: "ring-alert-yellow",
  },
  {
    id: "artillery",
    label: "Загроза артобстрілу",
    short: "Артобстріл",
    phrase: "Загроза артобстрілу",
    voice: "Увага! Загроза артилерійського обстрілу.",
    fill: "fill-alert-orange",
    bg: "bg-alert-orange",
    ring: "ring-alert-orange",
  },
  {
    id: "street",
    label: "Загроза вуличних боїв",
    short: "Вуличні бої",
    phrase: "Загроза вуличних боїв",
    voice: "Увага! Загроза вуличних боїв.",
    fill: "fill-alert-street",
    bg: "bg-alert-street",
    ring: "ring-alert-street",
  },
  {
    id: "chemical",
    label: "Хімічна небезпека",
    short: "Хімічна",
    phrase: "Хімічна небезпека",
    voice: "Увага! Хімічна небезпека. Залишайтесь в укритті.",
    fill: "fill-alert-chem",
    bg: "bg-alert-chem",
    ring: "ring-alert-chem",
  },
  {
    id: "radiation",
    label: "Радіаційна небезпека",
    short: "Радіаційна",
    phrase: "Радіаційна небезпека",
    voice: "Увага! Радіаційна небезпека.",
    fill: "fill-alert-rad",
    bg: "bg-alert-rad",
    ring: "ring-alert-rad",
  },
  {
    id: "none",
    label: "Немає тривоги",
    short: "Тиша",
    phrase: "Відбій",
    voice: "Відбій тривоги. Небезпека минула.",
    fill: "fill-alert-none",
    bg: "bg-alert-none",
    ring: "ring-alert-none",
  },
  {
    id: "swamp",
    label: "Тривога на болотах",
    short: "Болота",
    phrase: "Тривога на болотах",
    voice: "Увага! Тривога на болотах.",
    fill: "fill-alert-swamp",
    bg: "bg-alert-swamp",
    ring: "ring-alert-swamp",
  },
] as const;

export type Level = (typeof LEVELS)[number]["id"];

export const LEVEL_BY_ID: Record<Level, (typeof LEVELS)[number]> = Object.fromEntries(
  LEVELS.map((level) => [level.id, level]),
) as Record<Level, (typeof LEVELS)[number]>;

/** Highest threat first. Oblast color is the worst district inside it. */
export const SEVERITY: readonly Level[] = [
  "radiation",
  "chemical",
  "red",
  "high",
  "street",
  "artillery",
  "yellow",
  "swamp",
  "none",
];

export function isLevel(value: string | undefined): value is Level {
  return !!value && LEVELS.some((level) => level.id === value);
}

export function worstLevel(values: readonly Level[]): Level {
  let best: Level = "none";
  let rank = SEVERITY.length;
  for (const value of values) {
    const index = SEVERITY.indexOf(value);
    if (index >= 0 && index < rank) {
      rank = index;
      best = value;
    }
  }
  return best;
}

export function emptyCounts(): Record<Level, number> {
  return { red: 0, high: 0, yellow: 0, artillery: 0, street: 0, chemical: 0, radiation: 0, none: 0, swamp: 0 };
}

/** On-screen civil-defense advice. The spoken line is the matching file in /sounds. */
export const ADVICE: Record<Level, string> = {
  red: "Ракетна небезпека. Негайно йдіть в укриття. Не користуйтеся ліфтом і відійдіть від вікон.",
  high: "Високий рівень небезпеки. Підготуйте укриття і слухайте наступні повідомлення.",
  yellow: "Можливі ударні безпілотники. Пройдіть в укриття або вглиб приміщення. Не знімайте дрони.",
  artillery: "Загроза обстрілу. Негайно в укриття. Не залишайтеся на відкритій місцевості.",
  street: "Загроза боїв на вулицях. Не виходьте надвір і тримайтеся далі від вікон.",
  chemical: "Можлива хімічна небезпека. Залишайтесь в укритті, закрийте вікна і вентиляцію.",
  radiation: "Радіаційна небезпека. Залишайтесь в укритті, не відкривайте вікна.",
  none: "Відбій. Можна виходити з укриття, якщо немає інших попереджень.",
  swamp: "Навчальна тривога на болотах. На справжню небезпеку не зважайте.",
};
