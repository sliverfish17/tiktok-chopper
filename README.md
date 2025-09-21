# tiktok-chopper — Quick Start

Minimal Node.js (TypeScript) CLI that cuts a long video into ~1-minute **vertical** clips (1080×1920) and burns subtitles (classic SRT or TikTok-style karaoke via ASS).

## Install

```bash
npm i
```

# English

```bash
whisper ./samples/video.mp4 \
 --model small --language en --task transcribe \
 --output_format srt --output_dir ./samples \
 --device cpu --fp16 False
```

# Russian (more accurate)

```bash
whisper ./samples/video.mp4 \
 --model medium --language ru \
 --temperature 0 --beam_size 5 --condition_on_previous_text False \
 --output_format srt --output_dir ./samples \
 --device cpu --fp16 False
```

# Run

```bash
npm run process -- \
 --in ./samples/video.mp4 \
 --out ./out \
 --chunk 60 \
 --maxChunk 75 \
 --style tiktok \
 --vertical \
 --bg blur \
 --fps 60 \
 --caption "My clip #tiktok #subtitles"
```

# Outcome

```bash
out/
segments/ # seg_000.mp4, seg_001.mp4, ...
subtitles/ # seg_000.srt (+ seg_000.ass if --style tiktok)
manifest.json
```
