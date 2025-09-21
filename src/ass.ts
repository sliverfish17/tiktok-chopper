import { Cue } from './types.js';

export function assHeader(opts?: {
  playResX?: number;
  playResY?: number;
  font?: string;
  fontSize?: number;
}): string {
  const x = opts?.playResX ?? 1080;
  const y = opts?.playResY ?? 1920;
  const font = opts?.font ?? 'Inter';
  const fs = opts?.fontSize ?? 62;
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${x}
PlayResY: ${y}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTok,${font},${fs},&H00FFFFFF,&H0000FFFF,&H00101010,&H60000000,0,0,0,0,100,100,0,0,1,4,0,2,40,40,100,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
}

function toAssTime(sec: number) {
  const s = Math.max(0, sec);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const cs = Math.round((s - Math.floor(s)) * 100);
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${pad(cs)}`;
}

function esc(text: string) {
  return text.replace(/[{}]/g, '\\$&');
}

export function buildKaraokeLine(
  start: number,
  end: number,
  words: { text: string; durCs: number }[],
) {
  const text = words.map((w) => `{\\k${Math.max(1, w.durCs)}}${esc(w.text)}`).join(' ');
  return `Dialogue: 0,${toAssTime(start)},${toAssTime(end)},TikTok,,0,0,0,,${text}`;
}

// MVP: evenly distribute the line time across words
export function generateKaraokeASS(
  cues: Cue[],
  opts?: { playResX?: number; playResY?: number; font?: string; fontSize?: number },
) {
  let out = assHeader(opts);
  for (const c of cues) {
    const dur = Math.max(0.01, c.end - c.start);
    const words = c.text.split(/\s+/).filter(Boolean);
    const perCs = Math.max(1, Math.round((dur * 100) / Math.max(1, words.length)));
    const arr = words.map((w) => ({ text: w, durCs: perCs }));
    out += buildKaraokeLine(c.start, c.end, arr) + '\n';
  }
  return out;
}
