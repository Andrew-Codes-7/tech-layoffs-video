import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from 'remotion';
import data from './data.json';

const BG = '#0e1420';
const TEXT = '#eef2f7';
const MUTED = '#8b97a8';
const BAR = '#4a6fa5';
const ACCENT = '#ff8a3d';
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const parts = (iso) => iso.split('-').map(Number);
const monthYear = (iso) => `${MONTHS[parts(iso)[1] - 1]} ${parts(iso)[0]}`;
const fullDate = (iso) => `${MONTHS[parts(iso)[1] - 1]} ${parts(iso)[2]}, ${parts(iso)[0]}`;

const { yearly, firstDate, lastDate } = data;
const top = yearly.reduce((a, b) => (b.employees > a.employees ? b : a));
const total = yearly.reduce((s, y) => s + y.employees, 0);
const totalEvents = yearly.reduce((s, y) => s + y.events, 0);
const lastYear = yearly[yearly.length - 1].year;
const y2020 = yearly.find((y) => y.year === 2020);
const y2022 = yearly.find((y) => y.year === 2022);
const combined = y2020.employees + y2022.employees;

const ease = Easing.out(Easing.cubic);
const prog = (frame, start, dur) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
const rise = (frame, start, dur = 20) => {
  const p = prog(frame, start, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * 24}px)` };
};

const TITLE_END = 135;
const CHART_END = 780;

const Title = () => {
  const f = useCurrentFrame();
  const out = interpolate(f, [TITLE_END - 15, TITLE_END], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: '0 160px', opacity: out }}>
      <div style={{ ...rise(f, 5), color: ACCENT, fontSize: 34, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase' }}>
        Global tech layoffs · {parts(firstDate)[0]}–{parts(lastDate)[0]}
      </div>
      <div style={{ ...rise(f, 15), color: TEXT, fontSize: 112, fontWeight: 700, lineHeight: 1.08, marginTop: 28 }}>
        {top.year} was the worst year
        <br />
        for tech layoffs
      </div>
      <div style={{ ...rise(f, 40), color: TEXT, fontSize: 52, marginTop: 44 }}>
        <span style={{ color: ACCENT, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(top.employees * prog(f, 40, 45))}
        </span>{' '}
        employees laid off — more than 2020 and 2022 combined
      </div>
    </AbsoluteFill>
  );
};

const LEFT = 160;
const WIDTH = 1600;
const BASE = 880;
const MAX_H = 500;
const SLOT = WIDTH / yearly.length;
const BAR_W = 170;
const BAR_START = 30;
const STAGGER = 70;
const GROW = 55;
const HIGHLIGHT = BAR_START + (yearly.length - 1) * STAGGER + GROW + 30;

const Chart = () => {
  const f = useCurrentFrame();
  const hi = prog(f, HIGHLIGHT, 25);
  const out = interpolate(f, [CHART_END - TITLE_END - 15, CHART_END - TITLE_END], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <div style={{ ...rise(f, 0), position: 'absolute', left: LEFT, top: 80, color: TEXT, fontSize: 56, fontWeight: 700 }}>
        Tech employees laid off, by year
      </div>
      <div style={{ ...rise(f, 8), position: 'absolute', left: LEFT, top: 156, color: MUTED, fontSize: 30 }}>
        Publicly reported layoff events · Source: Layoffs.fyi
      </div>

      {yearly.map((y, i) => {
        const p = prog(f, BAR_START + i * STAGGER, GROW);
        const isTop = y.year === top.year;
        const h = (y.employees / top.employees) * MAX_H * p;
        const x = LEFT + i * SLOT + (SLOT - BAR_W) / 2;
        const dim = isTop ? 1 : 1 - 0.6 * hi;
        return (
          <React.Fragment key={y.year}>
            <div
              style={{
                position: 'absolute',
                left: x,
                top: BASE - h,
                width: BAR_W,
                height: h,
                borderRadius: '8px 8px 0 0',
                background: BAR,
                opacity: dim,
              }}
            />
            {isTop ? (
              <div
                style={{
                  position: 'absolute',
                  left: x,
                  top: BASE - h,
                  width: BAR_W,
                  height: h,
                  borderRadius: '8px 8px 0 0',
                  background: ACCENT,
                  opacity: hi,
                }}
              />
            ) : null}
            <div
              style={{
                position: 'absolute',
                left: LEFT + i * SLOT,
                width: SLOT,
                top: BASE - h - (isTop ? 62 + 14 * hi : 62),
                textAlign: 'center',
                color: isTop && hi > 0 ? ACCENT : TEXT,
                fontSize: isTop ? 44 + 14 * hi : 44,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                opacity: Math.min(1, p * 4) * (isTop ? 1 : 1 - 0.35 * hi),
              }}
            >
              {fmt(y.employees * p)}
            </div>
            <div
              style={{
                position: 'absolute',
                left: LEFT + i * SLOT,
                width: SLOT,
                top: BASE + 18,
                textAlign: 'center',
                color: isTop && hi > 0 ? TEXT : MUTED,
                fontSize: 36,
                fontWeight: isTop ? 700 : 500,
                opacity: Math.min(1, p * 4),
              }}
            >
              {y.year}
              {y.year === lastYear ? '*' : ''}
            </div>
          </React.Fragment>
        );
      })}

      <div style={{ position: 'absolute', left: LEFT, top: BASE, width: WIDTH, height: 2, background: '#2a3446' }} />

      <div style={{ position: 'absolute', left: LEFT, top: 290, width: 560 }}>
        <div style={{ ...rise(f, HIGHLIGHT + 5), color: ACCENT, fontSize: 30, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
          The peak: {top.year}
        </div>
        <div style={{ ...rise(f, HIGHLIGHT + 20), color: TEXT, fontSize: 40, lineHeight: 1.25, marginTop: 14 }}>
          More than 2020 and 2022 combined
          <span style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}> ({fmt(combined * prog(f, HIGHLIGHT + 20, 35))})</span>
        </div>
        <div style={{ ...rise(f, HIGHLIGHT + 60), color: MUTED, fontSize: 32, marginTop: 14, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(top.events * prog(f, HIGHLIGHT + 60, 30))} layoff events that year
        </div>
      </div>

      <div style={{ position: 'absolute', left: LEFT, top: BASE + 96, color: MUTED, fontSize: 26, opacity: prog(f, BAR_START + (yearly.length - 1) * STAGGER, 20) }}>
        *{lastYear} covers events reported through {fullDate(lastDate)}
      </div>
    </AbsoluteFill>
  );
};

const End = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ ...rise(f, 0), color: TEXT, fontSize: 200, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {fmt(total * prog(f, 0, 45))}
      </div>
      <div style={{ ...rise(f, 15), color: TEXT, fontSize: 48, marginTop: 8 }}>
        tech employees laid off across{' '}
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(totalEvents * prog(f, 15, 40))}</span> reported events
      </div>
      <div style={{ ...rise(f, 30), color: MUTED, fontSize: 34, marginTop: 20 }}>
        {monthYear(firstDate)} – {monthYear(lastDate)}
      </div>
      <div style={{ ...rise(f, 45), color: MUTED, fontSize: 26, marginTop: 70 }}>
        Data: Layoffs.fyi, via Kaggle “Global Tech Layoffs — Analysis Dataset” (blixture)
      </div>
    </AbsoluteFill>
  );
};

export const Layoffs = () => (
  <AbsoluteFill style={{ background: BG, fontFamily: FONT }}>
    <Sequence durationInFrames={TITLE_END}>
      <Title />
    </Sequence>
    <Sequence from={TITLE_END} durationInFrames={CHART_END - TITLE_END}>
      <Chart />
    </Sequence>
    <Sequence from={CHART_END}>
      <End />
    </Sequence>
  </AbsoluteFill>
);
