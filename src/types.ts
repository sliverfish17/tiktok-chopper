export type Cue = {
  id: number;
  start: number; // seconds
  end: number; // seconds
  text: string;
};

export type Segment = {
  index: number;
  start: number; // seconds
  end: number; // seconds
  outPath: string;
  srtPath: string;
};

export type Manifest = {
  source: string;
  duration: number;
  chunkTarget: number;
  chunkMax: number;
  caption?: string;
  segments: Array<{
    index: number;
    start: number;
    end: number;
    file: string;
    srt: string;
  }>;
};
