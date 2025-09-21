import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';

function logCmd(args: string[]) {
  if (process.env.DEBUG_FFMPEG === '1') {
    console.log('\n[ffmpeg]', [ffmpegPath, ...args].join(' '), '\n');
  }
}

export function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  logCmd(args);
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}

export async function ffprobeDuration(input: string): Promise<number> {
  const bin = (ffprobePath as any)?.path ?? (ffprobePath as unknown as string);
  return new Promise((resolve, reject) => {
    const child = spawn(bin, [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      input,
    ]);
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited ${code}`));
      const dur = parseFloat(out.trim());
      resolve(Number.isFinite(dur) ? dur : 0);
    });
  });
}

export function escapeFilter(p: string) {
  return p
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

export type CutOpts = {
  vertical?: boolean;
  bg?: 'black' | 'blur';
  fps?: number;
};

/**
 * Надёжный рез:
 *  - ss ставим ПОСЛЕ -i (output-seek), чтобы не терять аудио на некоторых mp4
 *  - мапим видео + любую аудиодорожку (-map 0:a?)
 *  - кодируем AAC 48 kHz, stereo
 *  - вертикаль 1080×1920: pad (black) или blur фон
 */
export async function cutSegment(
  input: string,
  start: number,
  end: number,
  outPath: string,
  srtPath?: string,
  assPath?: string,
  opts: CutOpts = {},
) {
  const duration = Math.max(0, end - start);
  const filters: string[] = [];

  // 9:16 layout
  if (opts.vertical) {
    if (opts.bg === 'blur') {
      filters.push(
        [
          'split=2[fg][bg]',
          '[bg]scale=1080:1920,boxblur=20:1[bg]',
          '[fg]scale=1080:-2:force_original_aspect_ratio=decrease[fg]',
          '[bg][fg]overlay=(W-w)/2:(H-h)/2',
        ].join(';'),
      );
    } else {
      filters.push(
        'scale=1080:-2:force_original_aspect_ratio=decrease,' +
          'pad=1080:1920:(1080-iw)/2:(1920-ih)/2:color=black',
      );
    }
  }

  // subtitles — at the end of the graph
  if (assPath) filters.push(`ass=${escapeFilter(assPath)}`);
  else if (srtPath) filters.push(`subtitles=${escapeFilter(srtPath)}`);

  const vfArgs = filters.length ? ['-vf', filters.join(',')] : [];

  const args = [
    '-y',
    // IMPORTANT: first connect input, then -ss/-t (output seeking)
    '-i',
    input,
    '-ss',
    start.toFixed(3),
    '-t',
    duration.toFixed(3),

    ...vfArgs,

    // Explicitly map video and ANY audio track (if present)
    '-map',
    '0:v:0',
    '-map',
    '0:a?',

    // Video
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-r',
    String(opts.fps ?? 30),

    // Audio
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ac',
    '2',
    '-ar',
    '48000',

    '-movflags',
    '+faststart',
    '-shortest',
    outPath,
  ];

  await run(ffmpegPath!, args);
}
