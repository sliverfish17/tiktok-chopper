import fs from 'node:fs';
import path from 'node:path';

// Lightweight wrapper around multipart POST to OpenAI Whisper API.
// We avoid SDK to prevent version dependency. Requires OPENAI_API_KEY variable.

export async function transcribeWithOpenAI(
  audioPath: string,
  languageHint?: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const url = 'https://api.openai.com/v1/audio/transcriptions';

  // Manually assemble multipart
  const form = new FormData();
  const file = new Blob([fs.readFileSync(audioPath)]);
  form.append('file', file, path.basename(audioPath));
  form.append('model', 'whisper-1');
  if (languageHint) form.append('language', languageHint);
  form.append('response_format', 'srt');

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as any,
  });
  if (!res.ok) throw new Error(`OpenAI ASR failed: ${res.status} ${await res.text()}`);
  return await res.text();
}
