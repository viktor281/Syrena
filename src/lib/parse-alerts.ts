import { OBLASTS, type OblastId } from "@/data/oblasts";
import { isLevel, type Level } from "@/data/levels";
import { ZONES } from "@/data/raions";

export type ParsedChange =
  | { kind: "oblast"; id: OblastId; level: Level }
  | { kind: "zone"; id: string; level: Level };

type Matcher = { alias: string; change: Omit<ParsedChange, "level"> };

const MATCHERS: Matcher[] = [
  ...ZONES.flatMap((zone) => zone.aliases.map((alias) => ({ alias, change: { kind: "zone" as const, id: zone.id } }))),
  ...OBLASTS.flatMap((oblast) =>
    oblast.aliases.map((alias) => ({ alias, change: { kind: "oblast" as const, id: oblast.id } })),
  ),
].sort((a, b) => b.alias.length - a.alias.length);

function norm(value: string): string {
  return value.toLowerCase().replace(/['’`ʼ]/g, "").replace(/ё/g, "е");
}

function detectLevel(line: string): Level | null {
  if (line.includes("болот")) return "swamp";
  if (line.includes("хім") || line.includes("хим")) return "chemical";
  if (line.includes("радіа") || line.includes("радиц") || line.includes("ядер")) return "radiation";
  if (line.includes("танк")) return "artillery";
  if (line.includes("солдат")) return "street";
  if (line.includes("вулич")) return "street";
  if (line.includes("арт")) return "artillery";
  if (line.includes("висок")) return "high";
  if (line.includes("ракет")) return "red";
  if (line.includes("шахед") || line.includes("дрон") || line.includes("бпла")) return "yellow";
  if (line.includes("жовт")) return "yellow";
  if (line.includes("червон")) return "red";
  if (/немає|немае|відбій|тиша|чисто/.test(line)) return "none";
  if (line.includes("повітря")) return "red";
  return null;
}

function findTargets(line: string): Array<Omit<ParsedChange, "level">> {
  const found: Array<Omit<ParsedChange, "level">> = [];
  const used: Array<[number, number]> = [];
  for (const matcher of MATCHERS) {
    let from = 0;
    while (from < line.length) {
      const index = line.indexOf(matcher.alias, from);
      if (index < 0) break;
      const end = index + matcher.alias.length;
      const overlaps = used.some(([start, stop]) => index < stop && end > start);
      if (!overlaps) {
        const key = `${matcher.change.kind}:${matcher.change.id}`;
        if (!found.some((item) => `${item.kind}:${item.id}` === key)) found.push(matcher.change);
        used.push([index, end]);
      }
      from = end;
    }
  }
  return found;
}

export function parseAlerts(text: string): { changes: ParsedChange[]; unknown: string[] } {
  const latest = new Map<string, ParsedChange>();
  const unknown: string[] = [];
  const lines = text
    .split(/\n+|;+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const raw of lines) {
    const line = norm(raw);
    const targets = findTargets(line);
    if (targets.length === 0) {
      if (unknown.length < 4) unknown.push(raw.slice(0, 80));
      continue;
    }
    const explicit = detectLevel(line);
    const level: Level = explicit && isLevel(explicit) ? explicit : "red";
    for (const target of targets) {
      const change: ParsedChange =
        target.kind === "zone"
          ? { kind: "zone", id: target.id, level }
          : { kind: "oblast", id: target.id as OblastId, level };
      latest.set(`${change.kind}:${change.id}`, change);
    }
  }

  return { changes: [...latest.values()], unknown };
}
