import React from 'react';
import { AbsoluteFill, Easing, interpolate, interpolateColors, random, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import data from './data.json';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '700', '800'], subsets: ['latin'] });

const TEXT = '#f1f4f9';
const MUTED = '#8c99ad';
const ACCENT = '#ff8a3d';
const BLUES = ['#5b8def', '#6a9cf5', '#4f7fdc'];
const NUM = { fontVariantNumeric: 'tabular-nums' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const parts = (iso) => iso.split('-').map(Number);
const monthYear = (iso) => `${MONTHS[parts(iso)[1] - 1]} ${parts(iso)[0]}`;
const fullDate = (iso) => `${MONTHS[parts(iso)[1] - 1]} ${parts(iso)[2]}, ${parts(iso)[0]}`;

const { yearly, monthly, top5, firstDate, lastDate } = data;
const M = monthly.length;
const topYearIdx = yearly.reduce((b, y, i) => (y.employees > yearly[b].employees ? i : b), 0);
const top = yearly[topYearIdx];
const total = yearly.reduce((s, y) => s + y.employees, 0);
const totalEvents = yearly.reduce((s, y) => s + y.events, 0);
const lastYear = yearly[yearly.length - 1].year;
const y2020 = yearly.find((y) => y.year === 2020);
const y2022 = yearly.find((y) => y.year === 2022);
const combined = y2020.employees + y2022.employees;
const peakIdx = monthly.reduce((b, m, i) => (m.employees > monthly[b].employees ? i : b), 0);
const idxOf = (ym) => monthly.findIndex((m) => m.ym === ym);
const cumulative = monthly.reduce((acc, m) => [...acc, (acc[acc.length - 1] || 0) + m.employees], []);

// ---- Timing (frames at 30fps) ----
const T_TIMELINE = 150;
const T_YEARS = 420;
const T_HILITE = 525;
const T_TOP5 = 660;
const T_END = 810;
const SWEEP = 150;
const FLY = 34;

// ---- Layout ----
const BASE = 900;
const X0 = 140;
const W = 1640;
const MP = W / M;
const MD = 10.5;
const SLOT = W / yearly.length;
const YD = 18;
const YCOLS = 10;
const TOP_X = 600;
const TOP_Y = 380;
const TOP_DX = 34;
const TOP_DY = 112;

// ---- One dot per 1,000 people ----
const PER_DOT = 1000;
const dots = [];
const yearDots = [];
const monthDots = monthly.map(() => 0);
yearly.forEach((y, yi) => {
  const n = Math.round(y.employees / PER_DOT);
  yearDots.push(n);
  const ms = monthly.map((m, mi) => ({ ...m, mi })).filter((m) => m.ym.startsWith(String(y.year)));
  const sum = ms.reduce((s, m) => s + m.employees, 0);
  const quota = ms.map((m) => (m.employees / sum) * n);
  const alloc = quota.map(Math.floor);
  const left = n - alloc.reduce((a, b) => a + b, 0);
  quota
    .map((q, i) => [q - Math.floor(q), i])
    .sort((a, b) => b[0] - a[0])
    .slice(0, left)
    .forEach(([, i]) => alloc[i]++);
  let k = 0;
  ms.forEach((m, j) => {
    monthDots[m.mi] = alloc[j];
    for (let c = 0; c < alloc[j]; c++) dots.push({ yi, mi: m.mi, mRank: c, yRank: k++, top: null });
  });
});
const topRows = top5.map((e, k) => {
  const n = Math.round(e.count / PER_DOT);
  const mi = idxOf(e.date.slice(0, 7));
  const pool = dots.filter((d) => !d.top && d.mi === mi).concat(dots.filter((d) => !d.top && d.mi !== mi && yearly[d.yi].year === parts(e.date)[0]));
  pool.slice(0, n).forEach((d, j) => (d.top = { k, j }));
  return { ...e, n };
});
dots.forEach((d, i) => {
  d.sx = 30 + random(`x${i}`) * 1860;
  d.sy = 30 + random(`y${i}`) * 1020;
  d.mx = X0 + d.mi * MP + (d.mRank % 2) * MD + 7;
  d.my = BASE - 5 - Math.floor(d.mRank / 2) * MD;
  d.yx = X0 + d.yi * SLOT + (SLOT - YCOLS * YD) / 2 + (d.yRank % YCOLS) * YD + 9;
  d.yy = BASE - 9 - Math.floor(d.yRank / YCOLS) * YD;
  d.t1 = T_TIMELINE + (d.mi / (M - 1)) * SWEEP + random(`a${i}`) * 8;
  d.t2 = T_YEARS + d.yi * 6 + random(`b${i}`) * 25;
  d.t3 = d.top ? T_TOP5 + d.top.k * 8 + d.top.j * 1.2 : 0;
  d.t4 = T_END - 5 + random(`c${i}`) * 20;
  d.fadeIn = random(`d${i}`) * 40;
  d.phase = random(`e${i}`) * Math.PI * 2;
  d.base = BLUES[Math.floor(random(`f${i}`) * BLUES.length)];
});

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const out3 = Easing.out(Easing.cubic);
const inOut = Easing.inOut(Easing.cubic);
const prog = (f, start, dur, easing = out3) => interpolate(f, [start, start + dur], [0, 1], { ...clamp, easing });
const lerp = (a, b, t) => a + (b - a) * t;
const vis = (f, from, to, fade = 15) => prog(f, from, fade) * (1 - prog(f, to - fade, fade));
const rise = (f, start, dur = 20) => {
  const p = prog(f, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
};

const Dots = ({ f }) => {
  const hi = prog(f, T_HILITE, 25) * (1 - prog(f, T_TOP5 - 10, 20));
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', filter: 'drop-shadow(0 0 5px rgba(110,160,255,0.35))' }}>
      {dots.map((d, i) => {
        const p1 = prog(f, d.t1, FLY, inOut);
        const p2 = prog(f, d.t2, 45, inOut);
        const p3 = d.top ? prog(f, d.t3, 40, inOut) : 0;
        const p4 = prog(f, d.t4, 50, inOut);
        let x = lerp(d.sx, d.mx, p1);
        let y = lerp(d.sy, d.my, p1);
        let r = lerp(5, 4.5, p1);
        x = lerp(x, d.yx, p2);
        y = lerp(y, d.yy, p2);
        r = lerp(r, 7, p2);
        if (d.top) {
          x = lerp(x, TOP_X + d.top.j * TOP_DX, p3);
          y = lerp(y, TOP_Y + d.top.k * TOP_DY, p3);
          r = lerp(r, 12, p3);
        }
        x = lerp(x, d.sx, p4);
        y = lerp(y, d.sy, p4);
        r = lerp(r, 5, p4);
        const drift = 1 - p1 + p4;
        x += Math.sin(f / 35 + d.phase) * 9 * drift;
        y += Math.cos(f / 41 + d.phase) * 9 * drift;

        let o = prog(f, d.fadeIn, 20) * lerp(0.4, 1, p1);
        if (d.yi !== topYearIdx) o *= 1 - 0.6 * hi;
        if (!d.top) o *= 1 - prog(f, T_TOP5, 25);
        o = lerp(o, 0.3, p4);

        let a = 0;
        if (d.mi === peakIdx) a = p1 * (1 - prog(f, T_YEARS, 30));
        if (d.yi === topYearIdx) a = Math.max(a, hi);
        if (d.top && d.top.k === 0) a = Math.max(a, prog(f, T_TOP5 + 45, 20) * (1 - prog(f, T_END - 5, 20)));

        return <circle key={i} cx={x} cy={y} r={r} opacity={o} fill={a > 0 ? interpolateColors(a, [0, 1], [d.base, ACCENT]) : d.base} />;
      })}
    </svg>
  );
};

const Shade = ({ opacity }) => (
  <AbsoluteFill style={{ opacity, background: 'radial-gradient(ellipse 75% 60% at 50% 50%, rgba(9,13,22,0.94) 0%, rgba(9,13,22,0.75) 55%, rgba(9,13,22,0) 100%)' }} />
);

const Header = ({ f, from, to, title, sub }) => (
  <div style={{ position: 'absolute', left: X0, top: 70, opacity: vis(f, from, to) }}>
    <div style={{ ...rise(f, from), color: TEXT, fontSize: 60, fontWeight: 800, letterSpacing: -1 }}>{title}</div>
    <div style={{ ...rise(f, from + 8), color: MUTED, fontSize: 30, marginTop: 6 }}>{sub}</div>
  </div>
);

const Title = ({ f }) => {
  const o = 1 - prog(f, T_TIMELINE - 20, 20);
  return (
    <>
      <Shade opacity={o} />
      <AbsoluteFill style={{ justifyContent: 'center', padding: '0 160px', opacity: o }}>
        <div style={{ ...rise(f, 8), color: ACCENT, fontSize: 32, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase' }}>
          Global tech layoffs · {parts(firstDate)[0]}–{parts(lastDate)[0]}
        </div>
        <div style={{ ...rise(f, 18), color: TEXT, fontSize: 124, fontWeight: 800, lineHeight: 1.04, letterSpacing: -3, marginTop: 26 }}>
          {top.year} was the worst year
          <br />
          for tech layoffs
        </div>
        <div style={{ ...rise(f, 42), color: TEXT, fontSize: 50, marginTop: 44 }}>
          <span style={{ color: ACCENT, fontWeight: 800, ...NUM }}>{fmt(top.employees * prog(f, 42, 45))}</span> employees laid off — more than
          2020 and 2022 combined
        </div>
      </AbsoluteFill>
    </>
  );
};

const Note = ({ f, mi, title, value, extra, align, accent, dy = 0 }) => {
  const land = T_TIMELINE + (mi / (M - 1)) * SWEEP + FLY;
  const o = vis(f, land - 6, T_YEARS + 5, 12);
  const colTop = BASE - Math.ceil(monthDots[mi] / 2) * MD;
  const colLeft = X0 + mi * MP;
  const pos =
    align === 'side'
      ? { left: colLeft + 2 * MD + 22, top: colTop - 6 + dy }
      : align === 'right'
        ? { right: 1920 - (colLeft + 2 * MD + 4), top: colTop - 104 + dy, textAlign: 'right' }
        : { left: colLeft, top: colTop - 104 + dy };
  return (
    <div style={{ position: 'absolute', ...pos, opacity: o }}>
      <div style={{ color: accent ? ACCENT : MUTED, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>{title}</div>
      <div style={{ color: accent ? ACCENT : TEXT, fontSize: accent ? 64 : 42, fontWeight: 800, lineHeight: 1.1, ...NUM }}>
        {fmt(value * prog(f, land - 6, 24))}
      </div>
      {extra ? <div style={{ color: TEXT, fontSize: 28, marginTop: 4 }}>{extra}</div> : null}
    </div>
  );
};

const Timeline = ({ f }) => {
  const s = interpolate(f, [T_TIMELINE + FLY, T_TIMELINE + FLY + SWEEP], [0, M - 1], clamp);
  const i = Math.floor(s);
  const running = i >= M - 1 ? total : lerp(i === 0 ? 0 : cumulative[i - 1], cumulative[i], s - i) + (s - i) * 0;
  const shown = s >= M - 1 ? total : running;
  const o = vis(f, T_TIMELINE, T_YEARS + 5);
  return (
    <>
      <Header f={f} from={T_TIMELINE} to={T_YEARS + 5} title="Month by month" sub={`Employees laid off, ${monthYear(firstDate)} – ${monthYear(lastDate)}`} />
      <div style={{ position: 'absolute', right: X0, top: 62, textAlign: 'right', opacity: o }}>
        <div style={{ color: TEXT, fontSize: 104, fontWeight: 800, letterSpacing: -2, lineHeight: 1, ...NUM }}>{fmt(shown)}</div>
        <div style={{ color: MUTED, fontSize: 30, marginTop: 8 }}>laid off by {monthYear(monthly[Math.round(s)].ym)}</div>
      </div>
      <div style={{ position: 'absolute', left: X0, top: BASE + 4, height: 2, width: W * prog(f, T_TIMELINE, SWEEP + FLY, Easing.linear), background: '#283349', opacity: o }} />
      {monthly.map((m, mi) =>
        mi === 0 || m.ym.endsWith('-01') ? (
          <div
            key={m.ym}
            style={{ position: 'absolute', left: X0 + mi * MP, top: BASE + 20, color: MUTED, fontSize: 30, fontWeight: 500, opacity: o * prog(f, T_TIMELINE + (mi / (M - 1)) * SWEEP + 10, 15) }}
          >
            {m.ym.slice(0, 4)}
          </div>
        ) : null,
      )}
      <Note f={f} mi={idxOf('2020-04')} title="APR 2020 · PANDEMIC HITS" value={monthly[idxOf('2020-04')].employees} />
      <Note f={f} mi={idxOf('2022-11')} title="NOV 2022" value={monthly[idxOf('2022-11')].employees} align="right" />
      <Note
        f={f}
        mi={peakIdx}
        title={`${monthYear(monthly[peakIdx].ym).toUpperCase()} · WORST MONTH`}
        value={monthly[peakIdx].employees}
        extra={monthly[peakIdx].employees > y2020.employees ? 'More than all of 2020' : null}
        align="side"
        accent
      />
    </>
  );
};

const Years = ({ f }) => {
  const hi = prog(f, T_HILITE, 25);
  const o = vis(f, T_YEARS + 20, T_TOP5 + 5);
  return (
    <>
      <Header f={f} from={T_YEARS + 10} to={T_TOP5 + 5} title="Year by year" sub="The same dots, stacked by year" />
      <div style={{ position: 'absolute', left: X0, top: BASE + 4, height: 2, width: W, background: '#283349', opacity: o }} />
      {yearly.map((y, i) => {
        const isTop = i === topYearIdx;
        const p = prog(f, T_YEARS + 30 + i * 6, 45);
        const stackTop = BASE - Math.ceil(yearDots[i] / YCOLS) * YD;
        const dim = isTop ? 1 : 1 - 0.5 * hi;
        return (
          <React.Fragment key={y.year}>
            <div
              style={{
                position: 'absolute',
                left: X0 + i * SLOT,
                width: SLOT,
                top: stackTop - (isTop ? 70 + 22 * hi : 70),
                textAlign: 'center',
                color: isTop && hi > 0 ? ACCENT : TEXT,
                fontSize: isTop ? 46 + 20 * hi : 46,
                fontWeight: 800,
                opacity: o * p * dim,
                ...NUM,
              }}
            >
              {fmt(y.employees * p)}
            </div>
            <div
              style={{ position: 'absolute', left: X0 + i * SLOT, width: SLOT, top: BASE + 20, textAlign: 'center', color: isTop && hi > 0 ? TEXT : MUTED, fontSize: 36, fontWeight: isTop ? 800 : 500, opacity: o * p }}
            >
              {y.year}
              {y.year === lastYear ? '*' : ''}
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: 'absolute', left: X0, top: 270, width: 540, opacity: o }}>
        <div style={{ ...rise(f, T_HILITE + 5), color: ACCENT, fontSize: 30, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>The peak: {top.year}</div>
        <div style={{ ...rise(f, T_HILITE + 18), color: TEXT, fontSize: 42, fontWeight: 500, lineHeight: 1.22, marginTop: 14 }}>
          More than 2020 and 2022 combined <span style={{ color: MUTED, ...NUM }}>({fmt(combined * prog(f, T_HILITE + 18, 35))})</span>
        </div>
        <div style={{ ...rise(f, T_HILITE + 50), color: MUTED, fontSize: 32, marginTop: 14, ...NUM }}>{fmt(top.events * prog(f, T_HILITE + 50, 30))} layoff events that year</div>
      </div>
      <div style={{ position: 'absolute', left: X0, top: BASE + 84, color: MUTED, fontSize: 24, opacity: o * prog(f, T_YEARS + 70, 20) }}>
        *{lastYear} covers events reported through {fullDate(lastDate)}
      </div>
    </>
  );
};

const Top5 = ({ f }) => {
  const o = vis(f, T_TOP5 + 10, T_END + 5);
  return (
    <>
      <Header f={f} from={T_TOP5 + 10} to={T_END + 5} title="The five biggest single cuts" sub="Largest individual layoff events in the dataset" />
      {topRows.map((e, k) => {
        const start = T_TOP5 + 20 + k * 8;
        const first = k === 0;
        return (
          <div key={k} style={{ opacity: o }}>
            <div style={{ ...rise(f, start), position: 'absolute', left: X0, width: TOP_X - X0 - 44, top: TOP_Y + k * TOP_DY - 30, textAlign: 'right', color: TEXT, fontSize: 48, fontWeight: 800, lineHeight: '60px' }}>
              {e.company}
            </div>
            <div style={{ ...rise(f, start + 20), position: 'absolute', left: TOP_X + e.n * TOP_DX + 6, top: TOP_Y + k * TOP_DY - 30, lineHeight: '60px', whiteSpace: 'nowrap' }}>
              <span style={{ color: first ? ACCENT : TEXT, fontSize: 48, fontWeight: 800, ...NUM }}>{fmt(e.count * prog(f, start + 20, 35))}</span>
              <span style={{ color: MUTED, fontSize: 30, marginLeft: 20 }}>{monthYear(e.date)}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};

const End = ({ f }) => {
  const o = prog(f, T_END + 15, 20);
  return (
    <>
      <Shade opacity={o} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ ...rise(f, T_END + 15), color: TEXT, fontSize: 210, fontWeight: 800, letterSpacing: -6, lineHeight: 1, ...NUM }}>{fmt(total * prog(f, T_END + 15, 35))}</div>
        <div style={{ ...rise(f, T_END + 25), color: TEXT, fontSize: 48, marginTop: 24 }}>
          tech employees laid off across <span style={NUM}>{fmt(totalEvents * prog(f, T_END + 25, 30))}</span> reported events
        </div>
        <div style={{ ...rise(f, T_END + 35), color: MUTED, fontSize: 34, marginTop: 18 }}>
          {monthYear(firstDate)} – {monthYear(lastDate)}
        </div>
        <div style={{ ...rise(f, T_END + 45), color: MUTED, fontSize: 26, marginTop: 64 }}>Data: Layoffs.fyi, via Kaggle “Global Tech Layoffs — Analysis Dataset” (blixture)</div>
      </AbsoluteFill>
    </>
  );
};

export const Layoffs = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 80% at 50% 25%, #18243d 0%, #0b101a 75%)', fontFamily }}>
      <Dots f={f} />
      {f < T_TIMELINE ? <Title f={f} /> : null}
      {f >= T_TIMELINE && f < T_YEARS + 5 ? <Timeline f={f} /> : null}
      {f >= T_YEARS && f < T_TOP5 + 5 ? <Years f={f} /> : null}
      {f >= T_TOP5 && f < T_END + 5 ? <Top5 f={f} /> : null}
      {f >= T_END ? <End f={f} /> : null}
      <div style={{ position: 'absolute', right: X0, bottom: 34, color: MUTED, fontSize: 24, opacity: vis(f, 60, T_END, 20), display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 14, height: 14, borderRadius: 7, background: BLUES[0], display: 'inline-block' }} />
        Each dot ≈ 1,000 people
      </div>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: `${(f / 899) * 100}%`, background: ACCENT, opacity: 0.85 }} />
    </AbsoluteFill>
  );
};
