import { run } from './ffmpeg.js';
import ffmpegPath from 'ffmpeg-static';

export async function extractAudio(input: string, outAudio: string) {
  await run(ffmpegPath!, [
    '-y',
    '-i',
    input,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    outAudio,
  ]);
}

export async function writeSrt(path: string, content: string) {
  const fs = await import('node:fs/promises');
  await fs.writeFile(path, content, 'utf8');
}
