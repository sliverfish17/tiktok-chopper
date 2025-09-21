import fs from 'node:fs/promises';
import path from 'node:path';
import { transcribeWithOpenAI } from './openai.js';

export async function ensureSrtFor(inputVideo: string, workDir: string): Promise<string> {
  // 1) if a same-named .srt file is nearby — use it
  const srtCandidate = inputVideo.replace(/\.[^.]+$/, '.srt');
  try {
    await fs.access(srtCandidate);
    return srtCandidate;
  } catch {}

  // 2) otherwise, try to extract audio and use OpenAI (if key is present)
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'Нет SRT и не задан OPENAI_API_KEY. Положите готовый .srt рядом с видео или укажите ключ.',
    );
  }

  const audioPath = path.join(workDir, 'audio_tmp.mp3');
  const { extractAudio } = await import('../burner.js');
  await extractAudio(inputVideo, audioPath);
  const srt = await transcribeWithOpenAI(audioPath, process.env.ASR_LANGUAGE);
  const outSrt = path.join(workDir, 'input_auto.srt');
  await fs.writeFile(outSrt, srt, 'utf8');
  return outSrt;
}
