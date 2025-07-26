#!/usr/bin/env bash
set -eo pipefail

echo "Post-processing (2x slow-down → 60 fps)…"
for v in videos/*.webm; do
  ffmpeg -y -i "$v" -filter:v "setpts=2*PTS" -r 60 "${v%.webm}.mp4"
done

echo "✅  Finished. MP4 files are in ./videos"
