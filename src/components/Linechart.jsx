import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * LineChart
 *
 * Koi extra library vagar nu nanu SVG line chart (Polaris Viz jevo look):
 *  - responsive (container ni width pramane draw thay chhe)
 *  - horizontal grid + y-axis ticks (data zero hoy to 0 / 5 / 10)
 *  - x-axis date labels
 *  - hover par vertical line + dot + tooltip
 *  - niche legend
 *
 * props:
 *  data         [{ title: '2026-10-04', label: 'Oct 4, 2026', y: 12 }]
 *  seriesName   legend / tooltip ma dekhatu naam
 *  formatValue  tooltip value format   (default: String)
 *  formatTick   y-axis tick format     (default: formatValue)
 *  integer      true hoy to y-axis ma fakt whole numbers (counts mate)
 */
const PAD = { top: 12, right: 14, bottom: 30, left: 48 };
const LINE = '#27A0E8';

// 1 / 2 / 5 / 10 na steps vali "nice" y-axis ticks
function niceTicks(max, integer) {
  if (!(max > 0)) return [0, 5, 10];
  const raw = max / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  let step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(560);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = (w) => setWidth(Math.max(280, Math.floor(w)));
    update(el.clientWidth || 560);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => update(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

export default function LineChart({
  data,
  seriesName,
  formatValue = String,
  formatTick,
  integer = false,
  height = 230,
  color = LINE,
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const fmtTick = formatTick || formatValue;

  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const n = data.length;

  const ticks = useMemo(() => niceTicks(Math.max(0, ...data.map((d) => d.y)), integer), [data, integer]);
  const yMax = ticks[ticks.length - 1] || 1;

  const x = (i) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => PAD.top + innerH - (v / yMax) * innerH;

  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.y).toFixed(1)}`).join(' ');
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 120))));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const i = n <= 1 ? 0 : Math.round((px / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const point = hover != null ? data[hover] : null;
  const tipLeft = point ? x(hover) : 0;
  const flip = tipLeft > width - 190;

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={width}
        height={height}
        overflow="visible"
        role="img"
        aria-label={`${seriesName} chart`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block' }}
      >
        {/* grid + y labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--p-color-border-secondary)' }} />
            <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" fontSize="12" style={{ fill: 'var(--p-color-text-secondary)' }}>
              {fmtTick(t)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d.title} x={x(i)} y={height - 8} textAnchor="middle" fontSize="12" style={{ fill: 'var(--p-color-text-secondary)' }}>
              {d.label}
            </text>
          ) : null
        )}

        {/* line */}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* hover marker */}
        {point && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} style={{ stroke: 'var(--p-color-border)' }} />
            <circle cx={x(hover)} cy={y(point.y)} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>

      {/* tooltip */}
      {point && (
        <div
          style={{
            position: 'absolute',
            top: 36,
            left: flip ? undefined : tipLeft + 14,
            right: flip ? width - tipLeft + 14 : undefined,
            minWidth: 150,
            padding: '10px 12px',
            background: '#fff',
            border: '1px solid var(--p-color-border-secondary)',
            borderRadius: 10,
            boxShadow: '0 4px 14px rgba(0,0,0,.12)',
            pointerEvents: 'none',
            fontSize: 13,
            zIndex: 2,
          }}
        >
          <div style={{ color: 'var(--p-color-text-secondary)', marginBottom: 6 }}>{point.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 12, height: 2, background: color, display: 'inline-block' }} />
            <span style={{ flex: 1 }}>{seriesName}</span>
            <strong style={{ fontWeight: 600 }}>{formatValue(point.y)}</strong>
          </div>
        </div>
      )}

      {/* legend */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 4, fontSize: 13, color: 'var(--p-color-text-secondary)' }}>
        <span style={{ width: 16, height: 3, background: color, display: 'inline-block', borderRadius: 2 }} />
        {seriesName}
      </div>
    </div>
  );
}