"use client";

import { type CSSProperties, useEffect, useState } from "react";

type Candle = { o: number; c: number; h: number; l: number };
type FormingCandle = Candle & {
  goal: number;
  upperWick: number;
  lowerWick: number;
  wobble: number;
  phase: number;
};
type DrawnCandle = {
  x: number;
  bodyTop: number;
  bodyBottom: number;
  wickTop: number;
  wickBottom: number;
  up: boolean;
  opacity: number;
};
type ChartFrame = {
  candles: DrawnCandle[];
  trend: string;
  area: string;
  resistanceY: number;
  supportY: number;
};

const WIDTH = 760;
const HEIGHT = 320;
const TOP = 34;
const BOTTOM = 286;
const FIRST_X = 44;
const STEP = 19.75;
const BODY_WIDTH = 11;
const VISIBLE_CANDLES = 35;
const CANDLE_LIFETIME = 1500;
const INTRO_DURATION = 2400;

const initialCloses = [
  57, 62, 60, 66, 64, 69, 73, 70, 75, 78, 76, 81,
  84, 82, 87, 91, 89, 94, 98, 96, 101, 106, 104, 110,
  114, 112, 119, 123, 121, 127, 131, 128, 134, 138, 136,
];

function createInitialData(): Candle[] {
  return initialCloses.map((close, index) => {
    const open = index === 0 ? close - 4 : initialCloses[index - 1];
    return {
      o: open,
      c: close,
      h: Math.max(open, close) + 3 + (index % 4),
      l: Math.min(open, close) - 3 - ((index + 2) % 4),
    };
  });
}

function ema(values: Candle[]) {
  const k = 2 / 11;
  let current = values[0]?.c ?? 0;
  return values.map((value) => {
    current = value.c * k + current * (1 - k);
    return current;
  });
}

function quantile(values: number[], point: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.round((sorted.length - 1) * point)] ?? 0;
}

function randomCurve() {
  return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
}

function priceToY(price: number, view: { lo: number; hi: number }) {
  return BOTTOM - ((price - view.lo) / (view.hi - view.lo)) * (BOTTOM - TOP);
}

function targetView(data: Candle[]) {
  const visible = data.slice(-VISIBLE_CANDLES);
  const low = Math.min(...visible.map((candle) => candle.l));
  const high = Math.max(...visible.map((candle) => candle.h));
  const padding = (high - low) * 0.08 + 2;
  return { lo: low - padding, hi: high + padding };
}

function buildFrame(
  data: Candle[],
  progress: number,
  view: { lo: number; hi: number },
  levels: { resistance: number; support: number },
): ChartFrame {
  const visible = data.slice(-(VISIBLE_CANDLES + 1));
  const offset = (1 - progress) * STEP;
  const averages = ema(data).slice(-visible.length);
  const candles = visible.map((candle, index) => ({
    x: FIRST_X + (index - 1) * STEP + offset,
    bodyTop: priceToY(Math.max(candle.o, candle.c), view),
    bodyBottom: priceToY(Math.min(candle.o, candle.c), view),
    wickTop: priceToY(candle.h, view),
    wickBottom: priceToY(candle.l, view),
    up: candle.c >= candle.o,
    opacity: index === 0 ? Math.max(0, Math.min(1, offset / STEP)) : 1,
  }));
  const points = candles
    .map((candle, index) => ({ x: candle.x, y: priceToY(averages[index], view), opacity: candle.opacity }))
    .filter((point, index) => index > 0 || point.opacity > 0.02);
  const trend = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points.at(-1);
  const area = first && last ? `${trend} L${last.x.toFixed(1)},${BOTTOM} L${first.x.toFixed(1)},${BOTTOM} Z` : "";
  return {
    candles,
    trend,
    area,
    resistanceY: priceToY(levels.resistance, view),
    supportY: priceToY(levels.support, view),
  };
}

export function MarketChart() {
  const initialData = createInitialData();
  const initialView = targetView(initialData);
  const initialLevels = {
    resistance: quantile(initialData.map((item) => item.c), 0.82),
    support: quantile(initialData.map((item) => item.c), 0.12),
  };
  const [intro, setIntro] = useState(true);
  const [frame, setFrame] = useState(() => buildFrame(initialData, 1, initialView, initialLevels));

  useEffect(() => {
    const element = document.querySelector<HTMLElement>(".market-chart");
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      const reducedMotionTimer = window.setTimeout(() => setIntro(false), 0);
      return () => window.clearTimeout(reducedMotionTimer);
    }

    const data = createInitialData();
    let view = targetView(data);
    const levels = {
      resistance: quantile(data.map((item) => item.c), 0.82),
      support: quantile(data.map((item) => item.c), 0.12),
    };
    let regime = 1;
    let regimeLeft = 6;
    let forming: FormingCandle | null = null;
    let running = false;
    let visible = true;
    let ready = false;
    let animationFrame = 0;
    let startedAt = 0;

    const openCandle = () => {
      regimeLeft -= 1;
      if (regimeLeft <= 0) {
        const choice = Math.random();
        regime = choice < 0.5 ? 1 : choice < 0.78 ? 0 : -1;
        regimeLeft = 4 + Math.floor(Math.random() * 7);
      }
      const last = data.at(-1)!;
      const span = Math.max(30, Math.max(...data.map((item) => item.h)) - Math.min(...data.map((item) => item.l)));
      const proposed = last.c + regime * span * 0.024 + randomCurve() * span * 0.065;
      const minimumBody = span * 0.015;
      const goal = Math.abs(proposed - last.c) < minimumBody
        ? last.c + (proposed >= last.c ? minimumBody : -minimumBody)
        : proposed;
      forming = {
        o: last.c,
        c: last.c,
        h: last.c,
        l: last.c,
        goal,
        upperWick: span * (0.01 + Math.random() * 0.04),
        lowerWick: span * (0.01 + Math.random() * 0.04),
        wobble: span * (0.01 + Math.random() * 0.015),
        phase: Math.random() * Math.PI * 2,
      };
      data.push({ o: last.c, c: last.c, h: last.c, l: last.c });
    };

    const stop = () => {
      running = false;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const tick = (now: number) => {
      if (!running || !forming) return;
      if (!startedAt) startedAt = now;
      let progress = (now - startedAt) / CANDLE_LIFETIME;
      if (progress >= 1) {
        const current = data.at(-1)!;
        current.c = forming.goal;
        current.h = Math.max(current.h, Math.max(current.o, current.c) + forming.upperWick);
        current.l = Math.min(current.l, Math.min(current.o, current.c) - forming.lowerWick);
        if (data.length > VISIBLE_CANDLES + 14) data.shift();
        openCandle();
        startedAt = now;
        progress = 0;
      }

      const current = data.at(-1)!;
      const eased = 1 - Math.pow(1 - progress, 2);
      const close = forming.o + (forming.goal - forming.o) * eased
        + Math.sin(progress * 9 + forming.phase) * forming.wobble * (1 - progress * 0.6);
      current.c = close;
      const bodyHigh = Math.max(forming.o, close);
      const bodyLow = Math.min(forming.o, close);
      current.h = Math.max(current.h, bodyHigh + forming.upperWick * Math.min(1, progress * 1.6));
      current.l = Math.min(current.l, bodyLow - forming.lowerWick * Math.min(1, progress * 1.6));

      const target = targetView(data);
      view = {
        lo: view.lo + (target.lo - view.lo) * 0.035,
        hi: view.hi + (target.hi - view.hi) * 0.035,
      };
      const closes = data.slice(-(VISIBLE_CANDLES + 1)).map((item) => item.c);
      levels.resistance += (quantile(closes, 0.82) - levels.resistance) * 0.04;
      levels.support += (quantile(closes, 0.12) - levels.support) * 0.04;
      setFrame(buildFrame(data, progress, view, levels));
      animationFrame = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (!ready || running || !visible || document.hidden) return;
      running = true;
      startedAt = 0;
      animationFrame = window.requestAnimationFrame(tick);
    };

    const introTimer = window.setTimeout(() => {
      setIntro(false);
      openCandle();
      ready = true;
      start();
    }, INTRO_DURATION);
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start(); else stop();
    });
    observer.observe(element);
    const visibilityChange = () => document.hidden ? stop() : start();
    document.addEventListener("visibilitychange", visibilityChange);

    return () => {
      window.clearTimeout(introTimer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChange);
      stop();
    };
  }, []);

  return (
    <div className={`market-chart${intro ? " chart-intro" : ""}`} role="img" aria-label="رسم تعليمي متحرك يوضح شموعاً يابانية وخط اتجاه صاعد ومستويي دعم ومقاومة">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-slate-100">نظرة تعليمية على السوق</p>
        <span className="text-sm text-sky-300">تعلم • طبّق • تقدّم</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--theme-accent)" stopOpacity=".24" />
            <stop offset="1" stopColor="var(--theme-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[34, 97, 160, 223, 286].map((y) => <line key={y} x1="28" y1={y} x2="732" y2={y} className="chart-grid" />)}
        <path d={frame.area} fill="url(#area)" className="chart-area" />
        <line x1="28" y1={frame.resistanceY} x2="732" y2={frame.resistanceY} className="chart-resistance" />
        <line x1="28" y1={frame.supportY} x2="732" y2={frame.supportY} className="chart-support" />
        <text x="720" y={frame.resistanceY - 7} textAnchor="end" className="chart-label chart-label-resistance">مقاومة</text>
        <text x="720" y={frame.supportY + 15} textAnchor="end" className="chart-label chart-label-support">دعم</text>
        {frame.candles.map((candle, index) => {
          const style = { "--i": index, opacity: candle.opacity } as CSSProperties;
          return <g key={index} className="chart-candle" style={style}>
            <line x1={candle.x} y1={candle.wickTop} x2={candle.x} y2={candle.wickBottom} className={candle.up ? "candle-up" : "candle-down"} />
            <rect x={candle.x - BODY_WIDTH / 2} y={candle.bodyTop} width={BODY_WIDTH} height={Math.max(1.2, candle.bodyBottom - candle.bodyTop)} rx="1" className={candle.up ? "candle-up-fill" : "candle-down-fill"} />
          </g>;
        })}
        <path d={frame.trend} className="chart-line" pathLength="100" />
      </svg>
    </div>
  );
}
