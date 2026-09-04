#!/usr/bin/env node
// CDP screencast recorder. Connects to a page target over the Chrome DevTools
// Protocol, records Page.startScreencast frames to disk, and on stop (timer
// or SIGINT) assembles them into an mp4 via ffmpeg-full's concat demuxer.
//
// Usage:
//   node cdp_record.mjs --port 9318 --target <targetId-or-url-substring> \
//     --out /path/to/beat.mp4 [--seconds N] [--width 1600] [--height 1000]
//
// Frames go to a sibling dir "<out>.frames/" next to the final output file.
// SIGINT (Ctrl-C / `kill -INT <pid>`) triggers the same finalize path as the
// --seconds timer, so a beat can be stopped early after the on-screen action
// finishes instead of waiting out a padded timer.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port || 9318);
const targetSpec = args.target;
const outFile = args.out;
const seconds = args.seconds ? Number(args.seconds) : null;
const width = args.width ? Number(args.width) : 1600;
const height = args.height ? Number(args.height) : 1000;

if (!targetSpec || !outFile) {
  console.error('Usage: cdp_record.mjs --port 9318 --target <targetId|urlsubstr> --out <file.mp4> [--seconds N]');
  process.exit(2);
}

const outDir = path.dirname(path.resolve(outFile));
const outBase = path.basename(outFile).replace(/\.(mp4|mov)$/i, '');
const framesDir = path.join(outDir, `.${outBase}.frames`);
if (!existsSync(framesDir)) mkdirSync(framesDir, { recursive: true });

const tabs = await (await fetch(`http://localhost:${port}/json`)).json();
const target =
  tabs.find((t) => t.id === targetSpec || t.targetId === targetSpec) ||
  tabs.find((t) => t.type === 'page' && t.url && t.url.includes(targetSpec));

if (!target) {
  console.error(`No matching target for "${targetSpec}". Available:`, tabs.map((t) => `${t.id} ${t.url}`).join('\n'));
  process.exit(1);
}

console.error(`[cdp_record] target: ${target.id} ${target.url}`);

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const frames = []; // { file, tMs }
let t0 = null;
let stopped = false;
let sessionActive = false;

ws.onmessage = (ev) => {
  const d = JSON.parse(ev.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d.result ?? d.error);
    pending.delete(d.id);
    return;
  }
  if (d.method === 'Page.screencastFrame') {
    const { data, sessionId } = d.params;
    if (t0 === null) t0 = Date.now();
    const tMs = Date.now() - t0;
    const file = `frame_${String(tMs).padStart(8, '0')}.jpg`;
    writeFileSync(path.join(framesDir, file), Buffer.from(data, 'base64'));
    frames.push({ file, tMs });
    send('Page.screencastFrameAck', { sessionId });
  }
};

let resolveOpen;
const opened = new Promise((r) => (resolveOpen = r));
ws.onopen = () => resolveOpen();
await opened;

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false,
});
// The macOS screen is locked for this recording session. Chromium's
// occlusion-based renderer throttling treats a window behind the lock
// screen as invisible and stops compositing new frames after the first,
// even though CDP automation (Runtime.evaluate, clicks, etc) keeps
// working. These three calls defeat that throttle so the screencast keeps
// delivering frames while genuinely locked.
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.setWebLifecycleState', { state: 'active' });
await send('Target.activateTarget', { targetId: target.id });
await send('Page.startScreencast', {
  format: 'jpeg',
  quality: 85,
  maxWidth: 1920,
  maxHeight: 1200,
  everyNthFrame: 1,
});
sessionActive = true;
console.error(`[cdp_record] recording to ${framesDir}`);

let finalized = false;
async function finalize() {
  if (finalized) return;
  finalized = true;
  const elapsedMs = t0 === null ? 0 : Date.now() - t0;

  if (sessionActive) {
    try {
      await send('Page.stopScreencast');
    } catch {}
  }
  try {
    await send('Emulation.clearDeviceMetricsOverride');
  } catch {}
  // let any in-flight frame writes/acks settle
  await new Promise((r) => setTimeout(r, 250));
  try {
    ws.close();
  } catch {}

  if (frames.length === 0) {
    console.error('[cdp_record] ERROR: no frames captured');
    process.exit(1);
  }

  // Build ffmpeg concat file. Duration per frame = delta to next frame's
  // timestamp; last real frame is held to the end of the recording.
  //
  // ffmpeg's concat demuxer "duration" directive, combined with the fps/-r
  // CFR-conversion machinery, mishandles a small number of entries where one
  // entry holds for many seconds (observed: a 12s recording with ~20 frames,
  // one held ~5s, decoded to 16.8s instead of 12s -- a real ffmpeg fps-filter
  // bug on this input shape, confirmed by comparing against -c copy which
  // reported the correct 12.00s). Sidestepping it: expand every frame into
  // repeated ~1/30s-tick entries up front, so the concat list is already a
  // constant ~30fps sequence and no fps-changing filter/-r conversion is
  // needed at encode time.
  const TICK = 1 / 30;
  const totalSeconds = Math.max(elapsedMs / 1000, frames[frames.length - 1].tMs / 1000 + 0.5);
  const lines = [];
  for (let i = 0; i < frames.length; i++) {
    const cur = frames[i];
    const next = frames[i + 1];
    const dur = next ? Math.max((next.tMs - cur.tMs) / 1000, TICK) : Math.max(totalSeconds - cur.tMs / 1000, TICK);
    const ticks = Math.max(Math.round(dur / TICK), 1);
    for (let k = 0; k < ticks; k++) {
      lines.push(`file '${cur.file}'`);
      lines.push(`duration ${TICK.toFixed(6)}`);
    }
  }
  // sentinel: repeat last file so its preceding duration line is honored
  lines.push(`file '${frames[frames.length - 1].file}'`);
  const framesTxtPath = path.join(framesDir, 'frames.txt');
  writeFileSync(framesTxtPath, lines.join('\n') + '\n');

  const finalOut = path.join(outDir, `${outBase}.mp4`);
  console.error(`[cdp_record] ${frames.length} frames, ~${totalSeconds.toFixed(1)}s, encoding -> ${finalOut}`);

  execFileSync(
    '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
    [
      '-y',
      '-nostdin',
      '-f', 'concat',
      '-safe', '0',
      '-i', 'frames.txt',
      '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#ffffff',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      finalOut,
    ],
    { cwd: framesDir, stdio: 'inherit' },
  );

  console.error(`[cdp_record] done: ${finalOut}`);
  process.exit(0);
}

process.on('SIGINT', finalize);
process.on('SIGTERM', finalize);

if (seconds) {
  setTimeout(finalize, seconds * 1000);
}
