#!/usr/bin/env bash
# Extract image sequences for /reel from promotional MP4s.
set -euo pipefail

SRC="${REEL_SRC:-/Users/corphd/Desktop/סירטון תדמית}"
OUT_ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/reel"
SEQ_DIR="$OUT_ROOT/seq"
MANIFEST="$OUT_ROOT/manifest.json"

mkdir -p "$SEQ_DIR"
rm -rf "$SEQ_DIR"/*

# ~12fps from 24fps source (select every 2nd frame), max width 720, JPEG
extract_clip() {
  local n="$1"
  local file="$SRC/סירטון${n}.mp4"
  local dir="$SEQ_DIR/$n"
  mkdir -p "$dir"
  echo "Extracting clip $n ..." >&2
  ffmpeg -y -hide_banner -loglevel error -i "$file" \
    -vf "select=not(mod(n\,2)),scale=720:-2:flags=lanczos" \
    -fps_mode vfr \
    -q:v 5 \
    "$dir/frame-%04d.jpg"
  local count
  count=$(find "$dir" -name 'frame-*.jpg' | wc -l | tr -d ' ')
  echo "  → $count frames" >&2
  printf '%s' "$count"
}

c1=$(extract_clip 1)
c2=$(extract_clip 2)
c3=$(extract_clip 3)
c4=$(extract_clip 4)
c5=$(extract_clip 5)
c6=$(extract_clip 6)
c7=$(extract_clip 7)

cat > "$MANIFEST" <<EOF
{
  "fps": 12,
  "opening": "/reel/opening.png",
  "audio": "/reel/audio/bg.mp3",
  "sections": [
    { "id": 0, "mode": "still", "src": "/reel/opening.png", "scrollVh": 100 },
    { "id": 1, "mode": "scrub", "dir": "/reel/seq/1", "frameCount": $c1, "pattern": "frame-%04d.jpg", "scrollVh": 140 },
    { "id": 2, "mode": "scrub", "dir": "/reel/seq/2", "frameCount": $c2, "pattern": "frame-%04d.jpg", "scrollVh": 140 },
    { "id": 3, "mode": "scrub", "dir": "/reel/seq/3", "frameCount": $c3, "pattern": "frame-%04d.jpg", "scrollVh": 140 },
    { "id": 4, "mode": "loop", "dir": "/reel/seq/4", "frameCount": $c4, "pattern": "frame-%04d.jpg", "scrollVh": 120 },
    { "id": 5, "mode": "scrub", "dir": "/reel/seq/5", "frameCount": $c5, "pattern": "frame-%04d.jpg", "scrollVh": 140 },
    { "id": 6, "mode": "loop", "dir": "/reel/seq/6", "frameCount": $c6, "pattern": "frame-%04d.jpg", "scrollVh": 120 },
    { "id": 7, "mode": "scrub", "dir": "/reel/seq/7", "frameCount": $c7, "pattern": "frame-%04d.jpg", "scrollVh": 160 }
  ],
  "exitUrl": "https://ordelwebsite.vercel.app/en"
}
EOF

echo "Wrote $MANIFEST"
echo "Note: clip 8 is added separately (see public/reel/seq/8); re-merge into manifest after re-extract."
du -sh "$SEQ_DIR"
