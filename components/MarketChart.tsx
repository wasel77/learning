"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const baseCloses = [238, 224, 230, 205, 194, 202, 168, 151, 160, 127, 108, 94];
const candleWidth = 16;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function smoothPath(points: Array<[number, number]>) {
  if (!points.length) return "";
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midX = (previous[0] + point[0]) / 2;
    return `${path} C ${midX} ${previous[1]}, ${midX} ${point[1]}, ${point[0]} ${point[1]}`;
  }, `M ${points[0][0]} ${points[0][1]}`);
}

export function MarketChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.18 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    if (!isVisible || reducedMotion) return;
    let frame = 0;
    let last = 0;
    const animate = (time: number) => {
      if (time - last >= 48) {
        setPhase(time / 1150);
        last = time;
      }
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, reducedMotion]);

  const chart = useMemo(() => {
    const closes = baseCloses.map((base, index) => reducedMotion
      ? base
      : clamp(base + Math.sin(phase + index * 0.72) * 4.5 + Math.sin(phase * 0.42 + index) * 2, 88, 242));

    const candles = closes.map((close, index) => {
      const x = 54 + index * 58;
      const open = index === 0 ? close + 11 : closes[index - 1] + Math.sin(phase * 0.7 + index) * 3;
      const high = clamp(Math.min(open, close) - (12 + (index % 3) * 3), 82, 238);
      const low = clamp(Math.max(open, close) + (13 + ((index + 1) % 3) * 3), 92, 250);
      return { x, open, close, high, low, up: close <= open };
    });

    const trendPoints = closes.reduce<Array<[number, number]>>((points, close, index) => {
      const previousEma = points.at(-1)?.[1] ?? close;
      const ema = index === 0 ? close : previousEma * 0.65 + close * 0.35;
      return [...points, [54 + index * 58, ema]];
    }, []);
    const trend = smoothPath(trendPoints);
    const area = `${trend} L ${trendPoints.at(-1)?.[0]} 286 L ${trendPoints[0][0]} 286 Z`;
    return { candles, trend, area };
  }, [phase, reducedMotion]);

  return (
    <div ref={chartRef} className="market-chart" role="img" aria-label="رسم تعليمي متحرك يوضح شموعاً يابانية وخط اتجاه صاعد ومستويي دعم ومقاومة">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-slate-100">نظرة تعليمية على السوق</p>
        <span className="text-sm text-sky-300">تعلم • طبّق • تقدّم</span>
      </div>
      <svg viewBox="0 0 760 320" className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--theme-accent)" stopOpacity=".24" />
            <stop offset="1" stopColor="var(--theme-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[70, 140, 210, 280].map((y) => <line key={y} x1="28" y1={y} x2="732" y2={y} className="chart-grid" />)}
        <line x1="28" y1="72" x2="732" y2="72" className="chart-resistance" />
        <line x1="28" y1="262" x2="732" y2="262" className="chart-support" />
        <text x="720" y="63" textAnchor="end" className="chart-label chart-label-resistance">مقاومة</text>
        <text x="720" y="254" textAnchor="end" className="chart-label chart-label-support">دعم</text>
        <path d={chart.area} fill="url(#area)" className="chart-area" />
        <path d={chart.trend} className="chart-line" />
        {chart.candles.map(({ x, open, close, high, low, up }, index) => {
          const bodyY = Math.min(open, close);
          const bodyHeight = Math.max(6, Math.abs(open - close));
          return <g key={index} className="chart-candle">
            <line x1={x} y1={high} x2={x} y2={low} className={up ? "candle-up" : "candle-down"} />
            <rect x={x - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} rx="2" className={up ? "candle-up-fill" : "candle-down-fill"} />
          </g>;
        })}
      </svg>
    </div>
  );
}
