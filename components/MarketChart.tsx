const candles: Array<[number, number, number, boolean]> = [
  [62, 18, 14, true], [58, 26, 18, false], [55, 20, 16, true],
  [51, 29, 21, true], [48, 22, 17, false], [44, 32, 23, true],
  [40, 25, 19, true], [36, 34, 25, true], [32, 28, 20, false],
  [29, 35, 25, true], [25, 30, 22, true], [22, 34, 24, true],
];

export function MarketChart() {
  return (
    <div className="market-chart" role="img" aria-label="رسم تعليمي متحرك يوضح شموعاً يابانية وخط اتجاه صاعد">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-bold text-slate-100">نظرة تعليمية على السوق</p>
        <span className="text-sm text-sky-300">تعلم • طبّق • تقدّم</span>
      </div>
      <svg viewBox="0 0 760 320" className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--theme-accent)" stopOpacity=".34" />
            <stop offset="1" stopColor="var(--theme-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[70, 140, 210, 280].map((y) => <line key={y} x1="28" y1={y} x2="732" y2={y} className="chart-grid" />)}
        <line x1="28" y1="82" x2="732" y2="82" className="chart-resistance" />
        <line x1="28" y1="255" x2="732" y2="255" className="chart-support" />
        <text x="720" y="72" textAnchor="end" className="chart-label chart-label-resistance">مقاومة</text>
        <text x="720" y="248" textAnchor="end" className="chart-label chart-label-support">دعم</text>
        <path d="M30 275 C120 255 150 262 210 228 S320 215 370 170 S505 125 730 72 L730 288 L30 288 Z" fill="url(#area)" className="chart-area" />
        <path pathLength="1" d="M30 275 C120 255 150 262 210 228 S320 215 370 170 S505 125 730 72" className="chart-line" />
        {candles.map(([top, range, body, up], index) => {
          const x = 52 + index * 56;
          const y = top * 3.1;
          return (
            <g key={index} className="chart-candle" style={{ animationDelay: `${index * 85}ms` }}>
              <line x1={x} y1={y - 12} x2={x} y2={y + range * 1.45} className={up ? "candle-up" : "candle-down"} />
              <rect x={x - 8} y={y} width="16" height={body * 1.35} rx="2" className={up ? "candle-up-fill" : "candle-down-fill"} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
