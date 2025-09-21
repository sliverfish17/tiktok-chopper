import { Cue } from './types.js';

export type ChunkPlan = { start: number; end: number }[];

export function planByCues(
  cues: Cue[] | null,
  totalDuration: number,
  chunkTarget = 60,
  chunkMax = 75,
): ChunkPlan {
  if (!cues || cues.length === 0) {
    // by time
    const res: ChunkPlan = [];
    let t = 0;
    while (t < totalDuration - 0.25) {
      const start = t;
      const end = Math.min(totalDuration, t + chunkTarget);
      res.push({ start, end });
      t = end;
    }
    return res;
  }

  const res: ChunkPlan = [];
  let segStart = 0;
  let curEnd = 0;

  for (let i = 0; i < cues.length; i++) {
    const c = cues[i];
    if (c.end > totalDuration) break;
    curEnd = c.end;
    const segDur = curEnd - segStart;

    // if we exceeded the target and this is the end of the phrase — close the segment
    if (segDur >= chunkTarget) {
      // if we greatly exceeded and the next replica is even further — forcibly split at max
      if (segDur > chunkMax) {
        const forcedEnd = Math.min(segStart + chunkMax, curEnd);
        res.push({ start: segStart, end: forcedEnd });
        segStart = forcedEnd;
      } else {
        res.push({ start: segStart, end: curEnd });
        segStart = curEnd;
      }
    }
  }

  if (segStart < totalDuration - 0.25) {
    res.push({ start: segStart, end: totalDuration });
  }

  return res;
}
