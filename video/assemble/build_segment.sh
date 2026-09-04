#!/usr/bin/env bash
# Render one demo-video segment (1920x1080, 30fps, h264/aac) from a row in
# assemble/timeline.tsv.
#
# Usage: build_segment.sh <beat_id>
#
# Row format (tab-separated): id vtype vpath effect audio audio_sec gap_after caption
#   vtype:  image | video | slide
#   effect: kenburns | zoomhold | none   (image-only)
#
# The wav is first trimmed of leading/trailing silence beyond a small margin
# (silenceremove, -35dB) so the declared gap_after isn't stacked on top of
# whatever pause the TTS engine already baked into the clip -- that stacking
# is what pushes combined pauses over the 2s dead-air ceiling.
# Duration = trimmed_audio_seconds + gap_after (the gap is a silent hold on
# the last frame). Video: image -> ffmpeg -loop; video clip -> trimmed from
# the end if longer than target, or frozen on its last frame (tpad) if
# shorter. Captions: burned via the libass "subtitles" filter from a
# generated .srt, 44pt white text on a 60% opacity black band, bottom-center.
#
# Exit codes: 0 ok, 2 missing source clip (beat skipped), 3 beat not in timeline.

set -euo pipefail

BEAT="${1:?usage: build_segment.sh <beat_id>}"

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIDEO_DIR="$(dirname "$SELF_DIR")"
TIMELINE="$SELF_DIR/timeline.tsv"
SEG_DIR="$SELF_DIR/segments"
SLIDE_DIR="$SELF_DIR/slides"
CAP_DIR="$SELF_DIR/captions"
MAKE_SLIDE="$HOME/.claude/skills/demo-video-pipeline/scripts/make_slide.py"
MAKE_CAPTIONS="$SELF_DIR/make_captions.py"

FFMPEG=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg
FFPROBE=/opt/homebrew/opt/ffmpeg-full/bin/ffprobe
command -v "$FFMPEG" >/dev/null || FFMPEG=ffmpeg
command -v "$FFPROBE" >/dev/null || FFPROBE=ffprobe

mkdir -p "$SEG_DIR" "$SLIDE_DIR" "$CAP_DIR"

row="$(awk -F'\t' -v id="$BEAT" '$1==id{print; f=1} END{exit !f}' "$TIMELINE")" || {
  echo "ERROR: beat '$BEAT' not found in $TIMELINE" >&2
  exit 3
}

IFS=$'\t' read -r id vtype vpath effect awav asec gap caption <<<"$row"

cd "$VIDEO_DIR"

OUT="$SEG_DIR/${id}.mp4"

# --- generate the end-card slide on demand -------------------------------
if [ "$vtype" = "slide" ] && [ "$id" = "end" ] && [ ! -f "$vpath" ]; then
  python3 "$MAKE_SLIDE" "$vpath" \
    "Pill Round|#0A0A0A|76" \
    "pill-round.vercel.app|#0A0A0A|40" \
    "github.com/kamalbuilds/pill-round|#0A0A0A|40" \
    --bg "#ffffff" --width 1920 --height 1080 --line-height 110
fi

# --- missing-source check --------------------------------------------------
# vpath may be a single file, or a multi-segment "a.png|b.png@S|c.png@S2"
# sequence (see parse_vpath.py) -- check every segment's file exists.
if [ "$vtype" = "video" ] || [ "$vtype" = "image" ]; then
  IFS='|' read -r -a __vp_segs <<<"$vpath"
  for __seg in "${__vp_segs[@]}"; do
    __seg_path="${__seg%%@*}"
    if [ ! -f "$__seg_path" ]; then
      echo "SKIP $id: missing $vtype source '$__seg_path'"
      exit 2
    fi
  done
fi

# --- trim baked-in leading/trailing silence out of the narration wav ------
eff_asec="$asec"
if [ "$awav" != "-" ]; then
  TRIMMED="$SEG_DIR/${id}_trim.wav"
  # Trim front silence, then trim back silence via the reverse trick (a
  # single instance with both start_periods and stop_periods set removes
  # every internal pause, not just the two ends -- this is the stable form).
  "$FFMPEG" -y -nostdin -loglevel error -i "$awav" -af \
    "silenceremove=start_periods=1:start_duration=0.05:start_threshold=-35dB:start_silence=0.1:detection=peak,areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-35dB:start_silence=0.15:detection=peak,areverse" \
    "$TRIMMED"
  eff_asec="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$TRIMMED")"
  awav="$TRIMMED"
fi

total="$(python3 -c "print(float('$eff_asec') + float('${gap:-0}'))")"

VTMP="$SEG_DIR/${id}_v.mp4"
ATMP="$SEG_DIR/${id}_a.m4a"

# --- build the silent video track, exactly $total seconds ----------------
case "$vtype" in
  image)
    if [[ "$vpath" == *"|"* ]]; then
      # Multi-segment vpath: build each segment as its own scaled/padded
      # clip (no kenburns/zoomhold across a hard image switch -- a plain
      # fit-and-pad per segment, which is a no-op for already-1920x1080
      # sources like the source screenshots), then concat losslessly.
      PARSE_VPATH="$SELF_DIR/parse_vpath.py"
      VPATH_TSV="$SEG_DIR/${id}_vpath.tsv"
      python3 "$PARSE_VPATH" "$vpath" "$total" "$asec" "$eff_asec" > "$VPATH_TSV"
      CONCAT_LIST="$SEG_DIR/${id}_vconcat.txt"
      : > "$CONCAT_LIST"
      seg_idx=0
      while IFS=$'\t' read -r seg_path seg_start seg_dur; do
        SEGV="$SEG_DIR/${id}_seg${seg_idx}.mp4"
        "$FFMPEG" -y -nostdin -loglevel error -loop 1 -i "$seg_path" -t "$seg_dur" \
          -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" \
          -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 18 -an "$SEGV"
        echo "file '$SEGV'" >> "$CONCAT_LIST"
        seg_idx=$((seg_idx + 1))
      done < "$VPATH_TSV"
      "$FFMPEG" -y -nostdin -loglevel error -f concat -safe 0 -i "$CONCAT_LIST" -c copy "$VTMP"
    else
      case "$effect" in
        kenburns)
          vf="scale=7680:-2,zoompan=z='min(zoom+0.0015,1.03)':d=$(python3 -c "print(int(round($total*30)))"):s=1920x1080:fps=30,setsar=1"
          ;;
        zoomhold)
          vf="scale=1978:1112,crop=1920:1080,setsar=1"
          ;;
        *)
          vf="scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1"
          ;;
      esac
      "$FFMPEG" -y -nostdin -loglevel error -loop 1 -i "$vpath" -t "$total" -vf "$vf" \
        -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 18 -an "$VTMP"
    fi
    ;;
  video)
    src_dur="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$vpath")"
    pad_needed="$(python3 -c "print(max(0.0, $total - $src_dur))")"
    "$FFMPEG" -y -nostdin -loglevel error -i "$vpath" \
      -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,tpad=stop_mode=clone:stop_duration=$pad_needed" \
      -t "$total" -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 18 -an "$VTMP"
    ;;
  slide)
    "$FFMPEG" -y -nostdin -loglevel error -loop 1 -i "$vpath" -t "$total" -vf "scale=1920:1080,setsar=1" \
      -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 18 -an "$VTMP"
    ;;
  *)
    echo "ERROR: unknown vtype '$vtype' for beat $id" >&2
    exit 1
    ;;
esac

# --- pointer + highlight cues (diagram beats only) ------------------------
CUE_FILE="$SELF_DIR/cues/${id}.tsv"
CUE_BASE="$VTMP"
if [ -f "$CUE_FILE" ]; then
  CUE_FILTER="$SELF_DIR/cue_filter.py"
  POINTER_PNG="$SELF_DIR/assets/pointer.png"
  FGRAPH="$SEG_DIR/${id}_cues.filtergraph"
  python3 "$CUE_FILTER" "$CUE_FILE" "$total" "$asec" "$eff_asec" > "$FGRAPH"
  FGRAPH_CONTENT="$(cat "$FGRAPH")"
  VCUE="$SEG_DIR/${id}_vcue.mp4"
  "$FFMPEG" -y -nostdin -loglevel error -i "$VTMP" -loop 1 -i "$POINTER_PNG" \
    -filter_complex "$FGRAPH_CONTENT" -map "[vout]" -t "$total" \
    -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 18 -an "$VCUE"
  CUE_BASE="$VCUE"
fi

# --- burn captions (image/video beats with narration only) ---------------
VFINAL="$CUE_BASE"
if [ -n "$caption" ] && [ "$awav" != "-" ]; then
  SRT="$CAP_DIR/${id}.srt"
  python3 "$MAKE_CAPTIONS" "$SRT" "$eff_asec" "$caption"
  VCAP="$SEG_DIR/${id}_vc.mp4"
  # NOTE on FontSize: libass renders plain-SRT-via-subtitles-filter against a
  # legacy default PlayResY of 288 regardless of the actual 1080p frame (the
  # `original_size` option does not override this for text subs), giving a
  # fixed ~3.75x scale-up. FontSize=12 here is the input that renders as the
  # intended ~44px caption text at 1920x1080 output; verified against a
  # rendered frame, not assumed.
  style="FontName=Helvetica,FontSize=12,PrimaryColour=&H00FFFFFF,BackColour=&H66000000,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=60"
  "$FFMPEG" -y -nostdin -loglevel error -i "$CUE_BASE" -vf "subtitles=${SRT}:force_style='${style}'" \
    -r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 18 -an "$VCAP"
  VFINAL="$VCAP"
fi

# --- build the audio track, exactly $total seconds ------------------------
if [ "$awav" = "-" ]; then
  "$FFMPEG" -y -nostdin -loglevel error -f lavfi -t "$total" -i "anullsrc=r=48000:cl=stereo" \
    -ar 48000 -ac 2 -c:a aac "$ATMP"
else
  "$FFMPEG" -y -nostdin -loglevel error -i "$awav" -f lavfi -t "$gap" -i "anullsrc=r=48000:cl=stereo" \
    -filter_complex "[0:a]aresample=48000,asetpts=PTS-STARTPTS[a0];[1:a]anull[a1];[a0][a1]concat=n=2:v=0:a=1[aout]" \
    -map "[aout]" -ac 2 -c:a aac "$ATMP"
fi

# --- mux -------------------------------------------------------------------
"$FFMPEG" -y -nostdin -loglevel error -i "$VFINAL" -i "$ATMP" -map 0:v -map 1:a \
  -c:v libx264 -preset veryfast -crf 18 -c:a aac -shortest "$OUT"

dur="$("$FFPROBE" -v error -show_entries format=duration -of csv=p=0 "$OUT")"
echo "OK $id -> $OUT (${dur}s)"
