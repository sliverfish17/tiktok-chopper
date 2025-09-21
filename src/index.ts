#!/usr/bin/env node
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs/promises';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';

import { ffprobeDuration, cutSegment } from './ffmpeg.js';
import { parseSrt, formatSrt, sliceCues } from './srt.js';
import { planByCues } from './chunker.js';
import { ensureSrtFor } from './asr/index.js';
import { Manifest } from './types.js';
import { generateKaraokeASS } from './ass.js';

const argv = await yargs(hideBin(process.argv))
  .option('in', { type: 'string', demandOption: true, desc: 'Путь к входному видео' })
  .option('out', { type: 'string', default: './out', desc: 'Выходная папка' })
  .option('chunk', { type: 'number', default: 60, desc: 'Целевая длительность сегмента (сек)' })
  .option('maxChunk', { type: 'number', default: 75, desc: 'Макс. длительность сегмента (сек)' })
  .option('caption', { type: 'string', desc: 'Описание/хэштеги для манифеста' })
  .option('style', {
    type: 'string',
    choices: ['srt', 'tiktok'],
    default: 'srt',
    desc: 'Формат субтитров для вшивания (srt — обычные, tiktok — ASS-караоке)',
  })
  .option('vertical', {
    type: 'boolean',
    default: true,
    desc: 'Конвертировать в вертикаль 1080×1920 (9:16)',
  })
  .option('bg', {
    type: 'string',
    choices: ['black', 'blur'],
    default: 'black',
    desc: 'Фон при вертикальной укладке: чёрный паддинг или блёр-фон',
  })
  .option('fps', {
    type: 'number',
    default: 30,
    desc: 'FPS выходного видео',
  })
  .strict()
  .parse();

await fs.mkdir(argv.out, { recursive: true });
const segDir = path.join(argv.out, 'segments');
const subDir = path.join(argv.out, 'subtitles');
await fs.mkdir(segDir, { recursive: true });
await fs.mkdir(subDir, { recursive: true });

const input = path.resolve(argv.in);
const duration = await ffprobeDuration(input);

// Get the overall SRT (ready or auto-ASR)
const workDir = await fs.mkdtemp(path.join(process.cwd(), 'work_'));
try {
  const srtPath = await ensureSrtFor(input, workDir);
  const allSrt = await fs.readFile(srtPath, 'utf8');
  const cues = parseSrt(allSrt);

  const plan = planByCues(cues, duration, argv.chunk, argv.maxChunk);

  const manifest: Manifest = {
    source: input,
    duration,
    chunkTarget: argv.chunk,
    chunkMax: argv.maxChunk,
    caption: argv.caption,
    segments: [],
  };

  for (let i = 0; i < plan.length; i++) {
    const { start, end } = plan[i];
    const fn = `seg_${String(i).padStart(3, '0')}.mp4`;
    const srtFn = `seg_${String(i).padStart(3, '0')}.srt`;
    const outPath = path.join(segDir, fn);
    const segSrtPath = path.join(subDir, srtFn);

    // 1) Sub-chunks for the segment
    const segCues = sliceCues(cues, start, end, true);

    // Always save SRT for debugging/export
    const segSrt = formatSrt(segCues);
    await fs.writeFile(segSrtPath, segSrt, 'utf8');

    // 2) If tiktok style is selected — generate ASS with "karaoke"
    let assPath: string | undefined;
    if (argv.style === 'tiktok') {
      const segAssPath = path.join(subDir, srtFn.replace(/\.srt$/, '.ass'));
      const ass = generateKaraokeASS(segCues, {
        playResX: 1080,
        playResY: 1920,
        font: 'Inter',
        fontSize: 64,
      });
      await fs.writeFile(segAssPath, ass, 'utf8');
      assPath = segAssPath;
    }

    // 3) Cut video and "embed" subs (ASS has higher priority)
    await cutSegment(input, start, end, outPath, assPath ? undefined : segSrtPath, assPath, {
      vertical: argv.vertical,
      bg: argv.bg as 'black' | 'blur',
      fps: argv.fps,
    });

    manifest.segments.push({
      index: i,
      start,
      end,
      file: path.relative(argv.out, outPath),
      srt: path.relative(argv.out, segSrtPath),
    });
    console.log(`Segment ${i} -> ${outPath}`);
  }

  await fs.writeFile(
    path.join(argv.out, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );
  console.log(`\nDone. Segments: ${manifest.segments.length}. Output: ${argv.out}`);
} finally {
  try {
    await fs.rm(workDir, { recursive: true, force: true });
  } catch {}
}
