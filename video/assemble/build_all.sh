#!/usr/bin/env bash
# Build every segment whose visual source currently exists, concatenate them
# in timeline order into out/out-of-service-demo.mp4, and verify the result.
#
# Safe to re-run at any time: as clips/4a.mov .. clips/5b.mov land, re-running
# this picks them up automatically and the final video grows toward the full
# 17-beat cut. Beats whose clip is still missing are skipped and reported.

set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO_DIR="$(dirname "$SELF_DIR")"
TIMELINE="$SELF_DIR/timeline.tsv"
SEG_DIR="$SELF_DIR/segments"
OUT_DIR="$VIDEO_DIR/out"
OUT="$OUT_DIR/pillbox-demo.mp4"

FFMPEG=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg
FFPROBE=/opt/homebrew/opt/ffmpeg-full/bin/ffprobe
command -v "$FFMPEG" >/dev/null || FFMPEG=ffmpeg
command -v "$FFPROBE" >/dev/null || FFPROBE=ffprobe

mkdir -p "$OUT_DIR" "$SEG_DIR"

built=()
skipped=()

while IFS=$'\t' read -r id vtype vpath effect awav asec gap caption; do
  [ -z "$id" ] && continue
  case "$id" in \#*) continue ;; esac
  cd "$VIDEO_DIR"
  if "$SELF_DIR/build_segment.sh" "$id"; then
    built+=("$id")
  else
    rc=$?
    if [ "$rc" -eq 2 ]; then
      skipped+=("$id ($vpath)")
    else
      echo "ERROR building beat $id (exit $rc)" >&2
      exit "$rc"
    fi
  fi
done < "$TIMELINE"

echo ""
echo "=== Built (${#built[@]}): ${built[*]:-none} ==="
echo "=== Skipped, source missing (${#skipped[@]}) ==="
for s in "${skipped[@]:-}"; do
  [ -n "$s" ] && echo "  - $s"
done

if [ "${#built[@]}" -eq 0 ]; then
  echo "Nothing built, aborting." >&2
  exit 1
fi

# --- concatenate in timeline order ----------------------------------------
LIST="$SEG_DIR/concat_list.txt"
: > "$LIST"
for id in "${built[@]}"; do
  echo "file '$SEG_DIR/${id}.mp4'" >> "$LIST"
done

"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$LIST" -c copy "$OUT"

echo ""
echo "=== Wrote $OUT ==="
"$FFPROBE" -v error -show_entries format=duration -of default=noprint_wrappers=1 "$OUT"

# --- verify ----------------------------------------------------------------
VERIFY="$HOME/.claude/skills/demo-video-pipeline/scripts/verify_video.sh"
if [ -x "$VERIFY" ] || [ -f "$VERIFY" ]; then
  bash "$VERIFY" "$OUT" "$OUT_DIR/verify_frames"
fi

dur="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$OUT")"
echo ""
echo "=== Extra checks ==="
awk -v d="$dur" 'BEGIN{ if (d+0 > 180) { print "FAIL: duration " d "s exceeds 180s cap" } else { print "PASS: duration " d "s <= 180s" } }'

res="$("$FFPROBE" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$OUT")"
if [ "$res" = "1920,1080" ]; then
  echo "PASS: resolution 1920x1080"
else
  echo "FAIL: resolution is $res, expected 1920,1080"
fi

# Gap check against the narrated body only (excludes the trailing silent
# title card, which is 3s of intentional silence, not dead air).
if [ -f "$SEG_DIR/end.mp4" ]; then
  end_dur="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$SEG_DIR/end.mp4")"
else
  end_dur=0
fi
body_cutoff="$(python3 -c "print(max(0.0, $dur - $end_dur))")"
gap_out="$("$FFMPEG" -nostdin -loglevel error -t "$body_cutoff" -i "$OUT" -af silencedetect=noise=-35dB:d=2.0 -f null - 2>&1 | grep -i silence_duration || true)"
if [ -z "$gap_out" ]; then
  echo "PASS: no silence gap over 2s in the narrated body (0..${body_cutoff}s)"
else
  echo "FAIL: silence gap(s) over 2s in the narrated body:"
  echo "$gap_out"
fi
if [ "$end_dur" != "0" ]; then
  echo "NOTE: trailing ${end_dur}s title card is intentionally silent (final beat), excluded from the gap check above."
fi

echo ""
if [ "${#skipped[@]}" -gt 0 ]; then
  echo "Partial build. Missing clips: ${skipped[*]}"
  echo "Re-run this script once they land: bash $SELF_DIR/build_all.sh"
fi
