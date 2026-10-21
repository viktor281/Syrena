import { useEffect, useMemo, useState } from "react";
import { OBLASTS, type OblastId } from "@/data/oblasts";
import {
  AID,
  FACTS,
  KIT,
  POINT_SERVICES,
  SHELTER_KINDS,
  SHELTER_RULES,
  SOS,
  SOS_SCRIPT,
  inCurfew,
  kyivHour,
  powerOff,
  seasonTip,
  type Desk,
  type PowerGroup,
} from "@/data/life";

const KIT_KEY = "syrena-kit-v1";
const GROUP_KEY = "syrena-power-group";
const HOME_KEY = "syrena-home-v1";

type HomeState = {
  people: string;
  meet: string;
  contact: string;
  word: string;
  radio: string;
  adults: number;
  days: number;
  curfewStart: number;
  curfewEnd: number;
  point: Record<string, boolean>;
};

const EMPTY_HOME: HomeState = {
  people: "",
  meet: "",
  contact: "",
  word: "",
  radio: "",
  adults: 2,
  days: 3,
  curfewStart: 0,
  curfewEnd: 5,
  point: {},
};

export function LifeDesk({ desk, onOpenMap }: { desk: Desk; onOpenMap: (id: OblastId) => void }) {
  if (desk === "country") return <Country onOpenMap={onOpenMap} />;
  if (desk === "shelter") return <Shelter />;
  if (desk === "power") return <Power />;
  if (desk === "kit") return <Kit />;
  if (desk === "sos") return <Sos />;
  return <HomeLife />;
}

function HomeLife() {
  const [home, setHome] = useState<HomeState>(EMPTY_HOME);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOME_KEY);
      if (raw) setHome({ ...EMPTY_HOME, ...(JSON.parse(raw) as Partial<HomeState>) });
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
  }, [home]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const hour = kyivHour(now);
  const dark = inCurfew(hour, home.curfewStart, home.curfewEnd);
  const liters = home.adults * home.days * 3;
  const patch = (part: Partial<HomeState>) => setHome((prev) => ({ ...prev, ...part }));
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h2 className="text-xl font-extrabold tracking-tight">Побут без тривоги</h2>
        <p className="mt-1 text-sm text-muted">Родина, вода, комендантська і пункт незламності. Усе лишається лише в цьому браузері.</p>
      </header>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h3 className="font-bold">План родини</h3>
        <label className="mt-3 block text-xs text-muted">
          Хто вдома
          <input value={home.people} onChange={(event) => patch({ people: event.target.value })} className="mt-1 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" placeholder="Імена" />
        </label>
        <label className="mt-3 block text-xs text-muted">
          Де зустрітись, якщо немає звʼязку
          <input value={home.meet} onChange={(event) => patch({ meet: event.target.value })} className="mt-1 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" placeholder="Наприклад, підʼїзд школи" />
        </label>
        <label className="mt-3 block text-xs text-muted">
          Контакт в іншому місті
          <input value={home.contact} onChange={(event) => patch({ contact: event.target.value })} className="mt-1 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" placeholder="Імʼя і телефон" />
        </label>
        <label className="mt-3 block text-xs text-muted">
          Кодове слово, що ви в безпеці
          <input value={home.word} onChange={(event) => patch({ word: event.target.value })} className="mt-1 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" />
        </label>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h3 className="font-bold">Вода</h3>
        <p className="mt-1 text-sm text-muted">Орієнтир: 3 літри на людину на добу, разом із приготуванням.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Людей
            <input type="number" min={1} max={20} value={home.adults} onChange={(event) => patch({ adults: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" />
          </label>
          <label className="text-xs text-muted">
            Днів
            <input type="number" min={1} max={14} value={home.days} onChange={(event) => patch({ days: Math.max(1, Number(event.target.value) || 1) })} className="mt-1 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" />
          </label>
        </div>
        <p className="mt-3 text-2xl font-extrabold">{liters} л</p>
      </section>

      <section className={`rounded-lg border p-4 ${dark ? "border-alert-red bg-bg-deep" : "border-line bg-surface"}`}>
        <h3 className="font-bold">Ваша комендантська</h3>
        <p className="mt-1 text-sm text-muted">Поставте години свого міста. Це не офіційний розклад.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            З години
            <input type="number" min={0} max={23} value={home.curfewStart} onChange={(event) => patch({ curfewStart: Math.min(23, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg" />
          </label>
          <label className="text-xs text-muted">
            До години
            <input type="number" min={0} max={23} value={home.curfewEnd} onChange={(event) => patch({ curfewEnd: Math.min(23, Math.max(0, Number(event.target.value) || 0)) })} className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-fg" />
          </label>
        </div>
        <p className="mt-3 text-lg font-extrabold">{dark ? "Зараз у вашому вікні комендантської" : "Зараз поза вікном, яке ви задали"}</p>
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h3 className="font-bold">Своє радіо</h3>
        <p className="mt-1 text-sm text-muted">Запишіть частоту місцевого FM. Застосунок її не вигадує.</p>
        <input value={home.radio} onChange={(event) => patch({ radio: event.target.value })} className="mt-3 w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm text-fg" placeholder="Наприклад, 105.0" />
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <h3 className="font-bold">Пункт незламності</h3>
        <p className="mt-1 text-sm text-muted">Адресу шукайте в громаді. Тут лише позначки, що там є.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {POINT_SERVICES.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={!!home.point[item.id]}
                  onChange={() => patch({ point: { ...home.point, [item.id]: !home.point[item.id] } })}
                />
                {item.text}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-bg-deep p-4">
        <h3 className="font-bold">Перша допомога, коротко</h3>
        <p className="mt-1 text-sm text-muted">Не замінює курс і лікаря. Якщо можете — кличте 103.</p>
        <ul className="mt-3 flex flex-col gap-3">
          {AID.map((item) => (
            <li key={item.title}>
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-muted">{item.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Country({ onOpenMap }: { onOpenMap: (id: OblastId) => void }) {
  const [query, setQuery] = useState("");
  const list = OBLASTS.filter((oblast) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const fact = FACTS[oblast.id];
    return oblast.name.toLowerCase().includes(q) || fact.center.toLowerCase().includes(q) || fact.note.toLowerCase().includes(q);
  });
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight">Довідник регіонів</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Короткі навчальні нотатки, не офіційна статистика і не дані про бойові дії.
        </p>
      </header>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Місто або область"
        aria-label="Пошук у довіднику"
        className="w-full rounded-md border border-line bg-bg-deep px-3 py-2 text-sm"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((oblast) => {
          const fact = FACTS[oblast.id];
          return (
            <li key={oblast.id} className="rounded-lg border border-line bg-surface p-4">
              <p className="text-lg font-bold">{oblast.name}</p>
              <p className="mt-1 text-sm text-muted">Центр · {fact.center}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-muted">Люди</dt>
                  <dd className="font-semibold">{fact.people}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Площа</dt>
                  <dd className="font-semibold">{fact.area}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-snug">{fact.note}</p>
              <button
                type="button"
                onClick={() => onOpenMap(oblast.id)}
                className="mt-3 min-h-11 rounded-md border border-line px-3 text-sm font-semibold"
              >
                Показати на карті
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Shelter() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight">Укриття</h2>
        <p className="mt-1 text-sm text-muted">Як обрати місце. Точні адреси дає ваша громада, не цей тренажер.</p>
      </header>
      <ul className="grid gap-3">
        {SHELTER_KINDS.map((item) => (
          <li key={item.title} className="rounded-lg border border-line bg-surface p-4">
            <p className="font-bold">{item.title}</p>
            <p className="mt-1 text-sm leading-snug text-muted">{item.text}</p>
          </li>
        ))}
      </ul>
      <ol className="flex flex-col gap-2 rounded-lg border border-line bg-bg-deep p-4 text-sm">
        {SHELTER_RULES.map((rule, index) => (
          <li key={rule} className="flex gap-3">
            <span className="font-mono text-alert-yellow">{index + 1}</span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Power() {
  const [group, setGroup] = useState<PowerGroup>(1);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const saved = Number(localStorage.getItem(GROUP_KEY));
    if (saved >= 1 && saved <= 6) setGroup(saved as PowerGroup);
  }, []);
  useEffect(() => {
    localStorage.setItem(GROUP_KEY, String(group));
  }, [group]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const hour = kyivHour(now);
  const off = powerOff(group, hour);
  const slots = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 2), []);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight">Навчальний графік світла</h2>
        <p className="mt-1 text-sm text-muted">
          Вигадані черги для тренування, не графік вашого обленерго. Двічі по 4 години на добу, зсув між чергами.
        </p>
      </header>
      <div className={`rounded-xl p-5 ${off ? "bg-bg-deep" : "bg-alert-yellow text-bg"}`}>
        <p className="text-xs font-bold tracking-wide uppercase">{off ? "Зараз темно" : "Зараз є світло"}</p>
        <p className="mt-1 text-3xl font-extrabold">Черга {group}</p>
        <p className={`mt-1 text-sm ${off ? "text-muted" : "text-bg/80"}`}>Година Києва {String(hour).padStart(2, "0")}:00</p>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {([1, 2, 3, 4, 5, 6] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={group === value}
            onClick={() => setGroup(value)}
            className={`min-h-11 rounded-md border font-semibold ${group === value ? "border-alert-yellow bg-surface" : "border-line"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((start) => {
          const dark = powerOff(group, start);
          const current = hour >= start && hour < start + 2;
          return (
            <li
              key={start}
              className={`rounded-md border px-3 py-2 text-sm ${current ? "border-fg" : "border-line"} ${dark ? "bg-bg-deep text-muted" : "bg-surface"}`}
            >
              <span className="font-mono">
                {String(start).padStart(2, "0")}–{String(start + 2).padStart(2, "0")}
              </span>
              <span className="mt-0.5 block font-semibold">{dark ? "Немає" : "Є світло"}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Kit() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KIT_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(KIT_KEY, JSON.stringify(done));
  }, [done]);
  const ready = KIT.filter((item) => done[item.id]).length;
  const tip = seasonTip(new Date());
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight">Тривожна валіза</h2>
        <p className="mt-1 text-sm text-muted">
          Зібрано {ready} з {KIT.length}. Список лишається в цьому браузері.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-alert-street" style={{ width: `${(ready / KIT.length) * 100}%` }} />
        </div>
        <p className="mt-3 text-sm">{tip}</p>
      </header>
      <ul className="flex flex-col gap-2">
        {KIT.map((item) => (
          <li key={item.id}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-line bg-surface px-3 py-2">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--color-alert-street)]"
                checked={!!done[item.id]}
                onChange={() => setDone((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
              />
              <span>
                <span className="block text-xs text-muted">{item.group}</span>
                <span className={`text-sm ${done[item.id] ? "text-muted line-through" : ""}`}>{item.text}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sos() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <header>
        <h2 className="text-2xl font-extrabold tracking-tight">Куди дзвонити</h2>
        <p className="mt-1 text-sm text-muted">Навчальні номери для тренажера. Додаток нікого не викликає.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {SOS.map((item) => (
          <li key={item.num} className="rounded-lg border border-line bg-surface p-4">
            <p className="font-mono text-3xl font-extrabold text-alert-yellow">{item.num}</p>
            <p className="mt-1 font-bold">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.text}</p>
            <a href={`tel:${item.num}`} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-alert-red px-3 text-sm font-semibold text-bg">
              Набрати {item.num}
            </a>
          </li>
        ))}
      </ul>
      <section className="rounded-lg border border-line bg-bg-deep p-4">
        <h3 className="font-bold">Що сказати диспетчеру</h3>
        <ol className="mt-2 flex flex-col gap-1 text-sm">
          {SOS_SCRIPT.map((line, index) => (
            <li key={line}>
              {index + 1}. {line}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
