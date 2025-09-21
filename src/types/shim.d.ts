// ffprobe-static / ffmpeg-static
declare module 'ffprobe-static' {
  const ffprobe: { path: string };
  export default ffprobe;
}
declare module 'ffmpeg-static' {
  const ffmpeg: string;
  export default ffmpeg;
}

// yargs/helpers: hideBin
declare module 'yargs/helpers' {
  export function hideBin(argv: string[]): string[];
}
