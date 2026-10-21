import { useRef, useState } from "react";
import { CITIES, NEIGHBORS, RADAR_AT, RANGES, RIVERS, RUSSIA_TITLE, SEAS } from "@/data/atlas";
import { MAP_VIEW, OBLASTS } from "@/data/oblasts";
import { LEVEL_BY_ID } from "@/data/levels";
import { ZONES } from "@/data/raions";
import { oblastLevel, useSim, type Craft } from "@/lib/sim-store";

function heading(craft: Craft, t: number): number {
  const a = spot(craft, Math.max(0, t - 0.03));
  const b = spot(craft, Math.min(1, t + 0.03));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function spot(craft: Craft, t: number): { x: number; y: number } {
  const clamped = Math.min(1, Math.max(0, t));
  let x = craft.fromX + (craft.toX - craft.fromX) * clamped;
  let y = craft.fromY + (craft.toY - craft.fromY) * clamped;
  if (craft.kind === "shahed") {
    const dx = craft.toX - craft.fromX;
    const dy = craft.toY - craft.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const wobble = Math.sin(clamped * 26) * 14;
    x += (-dy / len) * wobble;
    y += (dx / len) * wobble;
  } else if (craft.kind === "missile") {
    y -= Math.sin(clamped * Math.PI) * 34;
  } else if (craft.kind === "soldier") {
    y += Math.sin(clamped * 36) * 2.4;
  }
  return { x, y };
}

function craftLook(craft: Craft): { color: string; label: string } {
  if (craft.kind === "missile") return { color: "#ff5a4f", label: "РАКЕТА" };
  if (craft.kind === "soldier") return { color: "#1fa86a", label: "СОЛДАТИ" };
  if (craft.kind === "tank") return { color: "#ff8f1e", label: "ТАНК" };
  if (craft.kind === "ship") {
    return { color: "#9fd0e0", label: craft.cargo === "tank" ? "КОРАБЕЛЬ · ТАНКИ" : "КОРАБЕЛЬ · СОЛДАТИ" };
  }
  return { color: "#ffd15a", label: "ШАХЕД" };
}

function CraftGlyph({ craft }: { craft: Craft }) {
  const t = Math.min(1, Math.max(0, craft.progress));
  const { x, y } = spot(craft, t);
  const angle = heading(craft, t);
  const { color, label } = craftLook(craft);
  if (craft.progress < 0) {
    return (
      <line
        x1={craft.fromX}
        y1={craft.fromY}
        x2={craft.toX}
        y2={craft.toY}
        stroke={color}
        strokeWidth={1.2}
        strokeDasharray="7 6"
        opacity={0.35}
      />
    );
  }
  if (craft.progress >= 1) {
    const boom = (craft.progress - 1) / 0.12;
    return (
      <g pointerEvents="none">
        <circle cx={craft.toX} cy={craft.toY} r={8 + boom * 28} fill="none" stroke={color} strokeWidth={2} opacity={1 - boom} />
        <circle cx={craft.toX} cy={craft.toY} r={3 + boom * 18} fill="none" stroke={color} strokeWidth={1.2} opacity={0.7 * (1 - boom)} />
        <circle cx={craft.toX} cy={craft.toY} r={4 + boom * 10} fill={color} opacity={0.35 * (1 - boom)} />
      </g>
    );
  }
  const trail = [0.04, 0.09, 0.15].map((back) => spot(craft, Math.max(0, t - back)));
  return (
    <g pointerEvents="none">
      <line
        x1={craft.fromX}
        y1={craft.fromY}
        x2={craft.toX}
        y2={craft.toY}
        stroke={color}
        strokeWidth={1.4}
        className="route-dash"
        opacity={0.55}
      />
      {trail.map((point, index) => (
        <line
          key={index}
          x1={point.x}
          y1={point.y}
          x2={index === 0 ? x : trail[index - 1].x}
          y2={index === 0 ? y : trail[index - 1].y}
          stroke={color}
          strokeWidth={craft.kind === "missile" ? 7 - index * 2 : 4 - index}
          strokeLinecap="round"
          opacity={0.9 - index * 0.28}
        />
      ))}
      <circle cx={x} cy={y} r={craft.kind === "missile" ? 16 : 20} fill={color} opacity={0.18}>
        <animate attributeName="r" values={craft.kind === "missile" ? "12;20;12" : "16;26;16"} dur="0.8s" repeatCount="indefinite" />
      </circle>
      <g transform={`translate(${x} ${y}) rotate(${angle})`}>
        {craft.kind === "soldier" ? (
          <g>
            {[-12, 0, 12].map((dx) => (
              <g key={dx} transform={`translate(${dx} 0)`}>
                <circle cy={-7} r={2.4} fill={color} />
                <path d="M0 -4.2 V3.5 M-3.2 -0.5 H3.2 M-2 3.5 L0 1 L2 3.5" stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" />
              </g>
            ))}
          </g>
        ) : craft.kind === "tank" ? (
          <g>
            <rect x={-18} y={-8} width={34} height={16} rx={2} fill="#4d5a38" stroke="#d5e0c4" strokeWidth={1.2} />
            <rect x={-6} y={-6} width={12} height={12} fill="#2c3422" />
            <rect x={4} y={-1.6} width={20} height={3.2} fill={color} />
            <path d="M-16 9 H16 M-16 -9 H16" stroke="#141414" strokeWidth={2} />
          </g>
        ) : craft.kind === "ship" ? (
          <g>
            <polygon points="-34,2 26,2 18,14 -26,14" fill="#d5e4ec" stroke="#0c0e10" strokeWidth={1.2} />
            <rect x={-6} y={-10} width={16} height={12} fill="#7f97a3" />
            <polygon points="8,-10 8,-20 -2,-10" fill="#f4f7f8" />
            {craft.cargo === "tank" ? (
              <rect x={-24} y={-4} width={12} height={7} fill="#4d5a38" stroke={color} strokeWidth={0.8} />
            ) : (
              <g>
                {[-22, -16, -10].map((dx) => (
                  <circle key={dx} cx={dx} cy={-2} r={1.8} fill="#1fa86a" />
                ))}
              </g>
            )}
          </g>
        ) : craft.kind === "shahed" ? (
          <g>
            <polygon points="40,0 -6,5 -18,22 -8,4 -22,0 -8,-4 -18,-22 -6,-5" fill={color} stroke="#0c0e10" strokeWidth={1.6} />
            <polygon points="8,0 40,0 28,3" fill="#fff4c4" />
            <g transform="translate(40 0)">
              <g className="prop">
                <line x1={-8} y1={0} x2={8} y2={0} stroke="#0c0e10" strokeWidth={1.6} />
                <line x1={0} y1={-8} x2={0} y2={8} stroke="#0c0e10" strokeWidth={1.6} opacity={0.35} />
              </g>
            </g>
          </g>
        ) : (
          <g>
            <g className="flame">
              <polygon points="-28,0 -48,7 -56,0 -48,-7" fill="#ffb199" />
              <polygon points="-28,0 -40,3 -46,0 -40,-3" fill="#fff4c4" />
            </g>
            <polygon points="42,0 -16,5 -22,0 -16,-5" fill="#fff7f2" stroke="#ff5a4f" strokeWidth={1.6} />
            <polygon points="-8,0 -18,11 -4,4" fill="#ffd0c6" />
            <polygon points="-8,0 -18,-11 -4,-4" fill="#ffd0c6" />
          </g>
        )}
      </g>
      <text x={x + 22} y={y - 18} className="craft-label" fill={color}>
        {label}
      </text>
    </g>
  );
}

function PeopleLayer() {
  const levels = useSim((state) => state.levels);
  return (
    <g aria-hidden="true">
      {CITIES.filter((city) => city.star || city.name === "Петербург" || city.name === "Новосибірськ" || city.name === "Владивосток").map((city) => {
        const near = OBLASTS.find((oblast) => Math.hypot(oblast.label[0] - city.x, oblast.label[1] - city.y) < 28);
        const hot = near ? oblastLevel(levels, near.id) !== "none" : false;
        const x = city.x;
        const y = city.y;
        return (
          <g key={`${city.name}-people`}>
            {[0, 1].map((index) => {
              const px = x + (index === 0 ? -7 : 7);
              const py = y + 11;
              const ink = hot ? "#7a1f16" : "#1a1208";
              return (
                <g key={index} transform={`translate(${px} ${py})`}>
                  <g className={hot ? "folk folk-hot" : "folk"} style={{ animationDelay: `${index * 0.18}s` }}>
                    <circle cx={0} cy={-4.2} r={1.7} fill={ink} />
                    <path d="M0 -2.4 V2.4 M-2.2 0 H2.2 M-1.4 2.4 L0 0.5 L1.4 2.4" stroke={ink} strokeWidth={1.05} fill="none" strokeLinecap="round" />
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function LaunchDock() {
  const arm = useSim((state) => state.arm);
  const setArm = useSim((state) => state.setArm);
  const edge = useSim((state) => state.edge);
  const setEdge = useSim((state) => state.setEdge);
  const shipCargo = useSim((state) => state.shipCargo);
  const setShipCargo = useSim((state) => state.setShipCargo);
  const launchSalvo = useSim((state) => state.launchSalvo);
  const crafts = useSim((state) => state.crafts);
  const moving = crafts.filter((craft) => craft.progress >= 0 && craft.progress < 1);
  return (
    <div className="absolute top-16 left-3 z-10 flex w-64 flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          aria-pressed={arm === "shahed"}
          onClick={() => setArm("shahed")}
          className={`min-h-11 rounded-md border px-2 text-sm font-semibold ${arm === "shahed" ? "border-alert-yellow bg-alert-yellow text-bg" : "border-line bg-bg/90"}`}
        >
          Шахед
        </button>
        <button
          type="button"
          aria-pressed={arm === "missile"}
          onClick={() => setArm("missile")}
          className={`min-h-11 rounded-md border px-2 text-sm font-semibold ${arm === "missile" ? "border-alert-red bg-alert-red text-bg" : "border-line bg-bg/90"}`}
        >
          Ракета
        </button>
        <button
          type="button"
          aria-pressed={arm === "soldier"}
          onClick={() => setArm("soldier")}
          className={`min-h-11 rounded-md border px-2 text-sm font-semibold ${arm === "soldier" ? "border-alert-street bg-alert-street text-bg" : "border-line bg-bg/90"}`}
        >
          Солдати
        </button>
        <button
          type="button"
          aria-pressed={arm === "tank"}
          onClick={() => setArm("tank")}
          className={`min-h-11 rounded-md border px-2 text-sm font-semibold ${arm === "tank" ? "border-alert-orange bg-alert-orange text-bg" : "border-line bg-bg/90"}`}
        >
          Танки
        </button>
      </div>
      <button
        type="button"
        aria-pressed={arm === "ship"}
        onClick={() => setArm("ship")}
        className={`min-h-11 rounded-md border px-2 text-sm font-semibold ${arm === "ship" ? "border-fg bg-surface" : "border-line bg-bg/90"}`}
      >
        Корабель
      </button>
      {arm === "ship" ? (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-pressed={shipCargo === "soldier"}
            onClick={() => setShipCargo("soldier")}
            className={`min-h-11 rounded-md border px-2 text-xs font-semibold ${shipCargo === "soldier" ? "border-alert-street bg-alert-street text-bg" : "border-line bg-bg/90"}`}
          >
            На борту солдати
          </button>
          <button
            type="button"
            aria-pressed={shipCargo === "tank"}
            onClick={() => setShipCargo("tank")}
            className={`min-h-11 rounded-md border px-2 text-xs font-semibold ${shipCargo === "tank" ? "border-alert-orange bg-alert-orange text-bg" : "border-line bg-bg/90"}`}
          >
            На борту танки
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
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
              className={`min-h-11 rounded-md border text-xs font-semibold ${edge === id ? "border-fg bg-surface" : "border-line bg-bg/90 text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => launchSalvo("soldier")} className="min-h-11 rounded-md border border-alert-street bg-bg/90 px-2 text-xs font-semibold">
          Колона солдатів
        </button>
        <button type="button" onClick={() => launchSalvo("tank")} className="min-h-11 rounded-md border border-alert-orange bg-bg/90 px-2 text-xs font-semibold">
          Колона танків
        </button>
        <button type="button" onClick={() => launchSalvo("shahed")} className="min-h-11 rounded-md border border-alert-yellow bg-bg/90 px-2 text-xs font-semibold">
          Хвиля шахедів
        </button>
        <button type="button" onClick={() => launchSalvo("missile")} className="min-h-11 rounded-md border border-alert-red bg-bg/90 px-2 text-xs font-semibold">
          Ракетний залп
        </button>
      </div>
      <p className="rounded-md bg-bg/80 px-2 py-1 text-xs text-muted">
        {moving.length > 0
          ? `У русі ${moving.length}`
          : arm === "soldier"
            ? "Солдати вмикають вуличні бої."
            : arm === "tank"
              ? "Танки вмикають загрозу артобстрілу."
              : arm === "ship"
                ? "Корабель висаджує обраний вантаж біля цілі."
                : "Шахед — жовта, ракета — червона."}
      </p>
    </div>
  );
}

function MapAtmosphere() {
  const waves = Array.from({ length: 16 }, (_, index) => 24 + index * 42);
  return (
    <g aria-hidden="true">
      <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="#7ec8ea" />
      {waves.map((y, index) => (
        <path
          key={y}
          className={index % 2 ? "wave wave-slow" : "wave"}
          d={`M-30 ${y} Q 70 ${y - 8} 170 ${y} T 370 ${y} T 570 ${y} T 770 ${y} T 970 ${y} T 1170 ${y} T 1280 ${y}`}
        />
      ))}
    </g>
  );
}

const BEACON: Record<string, string> = {
  red: "#ed4f45",
  high: "#ff4d8d",
  yellow: "#d69027",
  orange: "#ff8f1e",
  street: "#00b274",
  chem: "#c6d43a",
  rad: "#9b6dff",
  swamp: "#c48962",
};

function BeaconLayer() {
  const levels = useSim((state) => state.levels);
  const mode = useSim((state) => state.mode);
  if (mode !== "oblast") return null;
  return (
    <g aria-hidden="true">
      {OBLASTS.map((oblast) => {
        const level = oblastLevel(levels, oblast.id);
        if (level === "none") return null;
        const [x, y] = oblast.label;
        const color = BEACON[level] ?? "#f4f1e6";
        return (
          <g key={`${oblast.id}-beacon`}>
            <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={1.4}>
              <animate attributeName="r" values="5;26" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={1.2}>
              <animate attributeName="r" values="5;26" dur="2.2s" begin="1.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="2.2s" begin="1.1s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })}
    </g>
  );
}

function SparkLayer() {
  return (
    <g aria-hidden="true">
      {CITIES.map((city, index) => (
        <g key={city.name}>
          {city.star ? (
            <polygon points={`${city.x},${city.y - 7} ${city.x + 2.2},${city.y - 2.2} ${city.x + 7},${city.y - 1.4} ${city.x + 3.2},${city.y + 2} ${city.x + 4.2},${city.y + 7} ${city.x},${city.y + 4} ${city.x - 4.2},${city.y + 7} ${city.x - 3.2},${city.y + 2} ${city.x - 7},${city.y - 1.4} ${city.x - 2.2},${city.y - 2.2}`} fill="#c5161d" stroke="#fff6e8" strokeWidth={0.6} />
          ) : (
            <circle cx={city.x} cy={city.y} r={2.2} fill="#1a1208" stroke="#fff6e8" strokeWidth={0.6}>
              <animate attributeName="opacity" values="0.45;1;0.45" dur={`${2.2 + (index % 3) * 0.35}s`} repeatCount="indefinite" />
            </circle>
          )}
          <text x={city.x + 6} y={city.y - 4} className="city-label">
            {city.name}
          </text>
        </g>
      ))}
    </g>
  );
}

function RadarOverlay() {
  return (
    <g aria-hidden="true" transform={`translate(${RADAR_AT.x} ${RADAR_AT.y})`}>
      <circle r="90" fill="none" stroke="rgba(18,48,82,0.18)" strokeWidth="1" />
      <circle r="170" fill="none" stroke="rgba(18,48,82,0.12)" strokeWidth="1" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="12s" repeatCount="indefinite" />
        <path d="M0 0 L170 0 A170 170 0 0 1 120 120 Z" fill="rgba(18,48,82,0.1)" />
        <line x1="0" y1="0" x2="170" y2="0" stroke="#12324a" strokeWidth="1.2" />
      </g>
    </g>
  );
}

function CraftLayer() {
  const crafts = useSim((state) => state.crafts);
  return (
    <g aria-hidden="true">
      {crafts.map((craft) => (
        <CraftGlyph key={craft.id} craft={craft} />
      ))}
    </g>
  );
}

export function UkraineMap() {
  const levels = useSim((state) => state.levels);
  const mode = useSim((state) => state.mode);
  const setMode = useSim((state) => state.setMode);
  const selectedOblastId = useSim((state) => state.selectedOblastId);
  const selectedZoneId = useSim((state) => state.selectedZoneId);
  const pulse = useSim((state) => state.pulse);
  const brush = useSim((state) => state.brush);
  const paintOblast = useSim((state) => state.paintOblast);
  const paintZone = useSim((state) => state.paintZone);
  const arm = useSim((state) => state.arm);
  const shipCargo = useSim((state) => state.shipCargo);
  const setArm = useSim((state) => state.setArm);
  const launchAt = useSim((state) => state.launchAt);
  const [hover, setHover] = useState<{ id: string; name: string; detail: string } | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const move = (event: React.PointerEvent, id: string, name: string, detail: string) => {
    if (event.pointerType !== "mouse") return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ id, name, detail });
    setTip({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      onPointerLeave={() => {
        setHover(null);
        setTip(null);
      }}
    >
      <svg
        viewBox={`0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`}
        className="h-full w-full"
        role="group"
        aria-label={mode === "raion" ? "Контури регіонів Росії" : "Карта регіонів Росії"}
      >
        <MapAtmosphere />
        {NEIGHBORS.map((land) => (
          <path key={land.id} d={land.path} className="neighbor" />
        ))}
        {NEIGHBORS.map((land) =>
          land.label ? (
            <text key={`${land.id}-label`} x={land.label[0]} y={land.label[1]} textAnchor="middle" className="neighbor-label">
              {land.name}
            </text>
          ) : null,
        )}
        {mode === "oblast"
          ? OBLASTS.map((oblast) => {
              const level = oblastLevel(levels, oblast.id);
              const meta = LEVEL_BY_ID[level];
              const active = selectedOblastId === oblast.id || hover?.id === oblast.id;
              return (
                <path
                  key={`${oblast.id}-${pulse[oblast.id] ?? 0}`}
                  d={oblast.path}
                  fillRule="evenodd"
                  tabIndex={0}
                  role="button"
                  aria-label={`${oblast.name}. ${meta.label}`}
                  aria-pressed={selectedOblastId === oblast.id}
                  className={`oblast cursor-pointer ${meta.fill} ${pulse[oblast.id] ? "oblast-pulse" : ""} ${level !== "none" ? "is-live" : ""} ${active ? "is-active" : ""}`}
                  onPointerEnter={(event) => move(event, oblast.id, oblast.name, meta.label)}
                  onPointerMove={(event) => move(event, oblast.id, oblast.name, meta.label)}
                  onClick={() => (arm ? launchAt(oblast.id) : paintOblast(oblast.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      paintOblast(oblast.id);
                    }
                  }}
                />
              );
            })
          : ZONES.map((zone) => {
              const level = levels[zone.id] ?? "none";
              const meta = LEVEL_BY_ID[level];
              const active = selectedZoneId === zone.id || hover?.id === zone.id;
              return (
                <path
                  key={`${zone.id}-${pulse[zone.id] ?? 0}`}
                  d={zone.path}
                  fillRule="evenodd"
                  tabIndex={0}
                  role="button"
                  aria-label={`${zone.name}. ${meta.label}`}
                  aria-pressed={selectedZoneId === zone.id}
                  className={`oblast cursor-pointer ${meta.fill} ${pulse[zone.id] ? "oblast-pulse" : ""} ${level !== "none" ? "is-live" : ""} ${active ? "is-active" : ""}`}
                  onPointerEnter={(event) => move(event, zone.id, zone.short, meta.label)}
                  onPointerMove={(event) => move(event, zone.id, zone.short, meta.label)}
                  onClick={() => (arm ? launchAt(zone.oblastId) : paintZone(zone.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      paintZone(zone.id);
                    }
                  }}
                />
              );
            })}
        {mode === "raion"
          ? OBLASTS.map((oblast) => (
              <path key={`${oblast.id}-frame`} d={oblast.path} className="frame-line" />
            ))
          : null}
        {RIVERS.map((river) => (
          <path
            key={`${river.name}-bed`}
            d={river.path}
            fill="none"
            stroke="#1a3a66"
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {RIVERS.map((river) => (
          <path key={river.name} className="river" d={river.path} />
        ))}
        {RANGES.map((range) => (
          <text
            key={range.name}
            x={range.x}
            y={range.y}
            textAnchor="middle"
            className="range-label"
            transform={`rotate(${range.rotate} ${range.x} ${range.y})`}
          >
            {range.name}
          </text>
        ))}
        <text x={RUSSIA_TITLE.x} y={RUSSIA_TITLE.y} textAnchor="middle" className="country-title">
          РОСІЯ
        </text>
        {mode === "oblast"
          ? OBLASTS.filter((oblast) => oblast.showLabel).map((oblast) => (
              <text
                key={`${oblast.id}-label`}
                x={oblast.label[0]}
                y={oblast.label[1]}
                textAnchor="middle"
                className="map-label"
              >
                {oblast.short}
              </text>
            ))
          : null}
        {SEAS.map((sea) => (
          <text key={sea.name} x={sea.x} y={sea.y} textAnchor="middle" className="sea-label">
            {sea.name}
          </text>
        ))}
        <BeaconLayer />
        <SparkLayer />
        <PeopleLayer />
        <RadarOverlay />
        <CraftLayer />
      </svg>
      <LaunchDock />

      {hover && tip ? (
        <div
          className="pointer-events-none absolute z-20 max-w-56 rounded-md border border-line bg-surface px-3 py-2 shadow-lg"
          style={{
            left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 320) - 230),
            top: Math.max(8, tip.y - 56),
          }}
        >
          <p className="text-sm font-semibold">{hover.name}</p>
          <p className="mt-0.5 text-xs text-muted">{hover.detail}</p>
        </div>
      ) : null}

      <div className="absolute top-3 right-3 left-3 flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (arm) setArm(arm);
          }}
          className={`max-w-52 rounded-md bg-bg/80 px-2.5 py-1.5 text-left text-xs backdrop-blur-sm ${arm ? "text-fg" : "pointer-events-none text-muted"}`}
        >
          {arm === "shahed"
            ? "Шахед: клік — жовта тривога"
            : arm === "missile"
              ? "Ракета: клік — червона тривога"
              : arm === "soldier"
                ? "Солдати: клік — вуличні бої"
                : arm === "tank"
                  ? "Танки: клік — артобстріл"
                  : arm === "ship"
                    ? shipCargo === "tank"
                      ? "Корабель із танками"
                      : "Корабель із солдатами"
                    : `Пензель: ${LEVEL_BY_ID[brush].short}`}
        </button>
        <div className="flex rounded-md border border-line bg-bg/90 text-xs backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setMode("oblast")}
            className={`min-h-11 px-3 ${mode === "oblast" ? "bg-surface text-fg" : "text-muted"}`}
          >
            Регіони
          </button>
          <button
            type="button"
            onClick={() => setMode("raion")}
            className={`min-h-11 border-l border-line px-3 ${mode === "raion" ? "bg-surface text-fg" : "text-muted"}`}
          >
            Контури
          </button>
        </div>
      </div>
    </div>
  );
}
