import { Cue } from './types.js';

const reTime = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;

export function parseSrt(s: string): Cue[] {
  const blocks = s.replace(/\r/g, '').split(/\n\n+/);
  const cues: Cue[] = [];
  let idCounter = 1;
  for (const b of blocks) {
    const lines = b.split('\n').filter(Boolean);
    if (lines.length < 2) continue;
    const idxLine = /^\d+$/.test(lines[0]) ? lines.shift()! : String(idCounter++);
    const times = lines.shift()!; // 00:00:01,000 --> 00:00:03,000
    const [startRaw, endRaw] = times.split(/\s+--\>\s+/);
    const start = timeToSec(startRaw);
    const end = timeToSec(endRaw);
    const text = lines.join('\n');
    if (isFinite(start) && isFinite(end)) cues.push({ id: +idxLine, start, end, text });
  }
  return cues;
}

export function formatSrt(cues: Cue[]): string {
  return cues
    .map((c, i) => `${i + 1}\n${secToTime(c.start)} --> ${secToTime(c.end)}\n${c.text}\n`)
    .join('\n');
}

export function sliceCues(cues: Cue[], start: number, end: number, retimeToZero = true): Cue[] {
  const out: Cue[] = [];
  for (const c of cues) {
    const s = Math.max(c.start, start);
    const e = Math.min(c.end, end);
    if (e - s <= 0) continue;
    out.push({ id: c.id, start: s, end: e, text: c.text });
  }
  if (retimeToZero) {
    const off = start;
    for (const c of out) {
      c.start = +(c.start - off).toFixed(3);
      c.end = +(c.end - off).toFixed(3);
    }
  }
  return out;
}

export function timeToSec(t: string): number {
  const m = reTime.exec(t.trim());
  if (!m) return NaN;
  const [, hh, mm, ss, ms] = m.map(Number) as unknown as [number, number, number, number, number];
  return hh * 3600 + mm * 60 + ss + ms / 1000;
}

export function secToTime(sec: number): string {
  const s = Math.max(0, sec);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(ms, 3)}`;
}
