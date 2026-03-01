/**
 * record-shader.mjs
 *
 * Captures the silk-flow shader animation as individual PNG frames using Puppeteer,
 * then stitches them into a seamless looping MP4 via ffmpeg-static.
 *
 * Usage:  node scripts/record-shader.mjs
 * Output: src/assets/shader-bg.mp4
 */

import puppeteer from 'puppeteer';
import ffmpegPath from 'ffmpeg-static';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ────────────────────────────────────────
const FPS = 60;
const DURATION_SECONDS = 12;
const CROSSFADE_SECONDS = 1.5;
const TOTAL_FRAMES = FPS * DURATION_SECONDS;
const WIDTH = 1920;
const HEIGHT = 1080;

const FRAMES_DIR = path.join(__dirname, '..', 'tmp-shader-frames');
const ASSETS_DIR = path.join(__dirname, '..', 'src', 'assets');
const OUTPUT_FILE = path.join(ASSETS_DIR, 'shader-bg.mp4');
const HTML_FILE = path.join(__dirname, 'shader-recorder.html');

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('🎬 MathPulse Shader Recorder');
  console.log(`   Resolution: ${WIDTH}x${HEIGHT}`);
  console.log(`   FPS: ${FPS} | Duration: ${DURATION_SECONDS}s | Frames: ${TOTAL_FRAMES}`);
  console.log(`   Crossfade: ${CROSSFADE_SECONDS}s for seamless loop`);
  console.log(`   ffmpeg: ${ffmpegPath}`);
  console.log('');

  // Clean up / create directories
  if (fs.existsSync(FRAMES_DIR)) {
    fs.rmSync(FRAMES_DIR, { recursive: true });
  }
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });

  // Launch headless browser
  console.log('🚀 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--use-gl=angle',
      '--use-angle=swiftshader-webgl',
      '--enable-webgl',
      '--enable-unsafe-webgpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu-sandbox',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`   [BROWSER ERROR] ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`   [PAGE ERROR] ${err.message}`));

  // Load the shader HTML
  const htmlPath = `file://${HTML_FILE.replace(/\\/g, '/')}`;
  console.log(`📄 Loading shader: ${htmlPath}`);
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait for WebGL init
  try {
    await page.waitForFunction('window.__ready === true', { timeout: 20000 });
  } catch (e) {
    const debugInfo = await page.evaluate(() => {
      const canvas = document.getElementById('shader-canvas');
      const gl = canvas ? canvas.getContext('webgl') : null;
      return {
        canvasExists: !!canvas,
        glExists: !!gl,
        ready: window.__ready,
        renderFn: typeof window.__renderFrame,
      };
    });
    console.log('   Debug info:', JSON.stringify(debugInfo));
    throw e;
  }
  console.log('✅ Shader initialized\n');

  // ─── Capture frames ─────────────────────────────────────
  const timeStep = 1 / FPS;
  const startTime = performance.now();

  for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
    const time = frame * timeStep;

    await page.evaluate((t) => window.__renderFrame(t), time);

    const paddedFrame = String(frame).padStart(5, '0');
    const framePath = path.join(FRAMES_DIR, `frame_${paddedFrame}.png`);

    const dataUrl = await page.evaluate(() => {
      const canvas = document.getElementById('shader-canvas');
      return canvas.toDataURL('image/png');
    });

    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(framePath, Buffer.from(base64Data, 'base64'));

    if (frame % FPS === 0 || frame === TOTAL_FRAMES - 1) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
      const pct = ((frame / TOTAL_FRAMES) * 100).toFixed(0);
      console.log(`   Frame ${frame + 1}/${TOTAL_FRAMES} (${pct}%) — ${elapsed}s elapsed`);
    }
  }

  await browser.close();
  console.log('\n📸 Frame capture complete!\n');

  // ─── FFmpeg: Stitch into seamless looping video ────────
  console.log('🎞️  Encoding video with ffmpeg-static...');
  const ffmpeg = `"${ffmpegPath}"`;

  // Step 1: Encode raw frames to a base video
  const rawVideo = path.join(FRAMES_DIR, 'raw.mp4');
  execSync(
    `${ffmpeg} -y -framerate ${FPS} -i "${path.join(FRAMES_DIR, 'frame_%05d.png')}" ` +
    `-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p ` +
    `-vf "scale=${WIDTH}:${HEIGHT}" "${rawVideo}"`,
    { stdio: 'inherit' }
  );

  // Step 2: Create seamless loop using crossfade
  const loopDuration = DURATION_SECONDS - CROSSFADE_SECONDS;
  execSync(
    `${ffmpeg} -y -i "${rawVideo}" -i "${rawVideo}" ` +
    `-filter_complex "` +
    `[0:v]trim=0:${loopDuration},setpts=PTS-STARTPTS[main];` +
    `[1:v]trim=0:${CROSSFADE_SECONDS},setpts=PTS-STARTPTS[fade_in];` +
    `[0:v]trim=${loopDuration}:${DURATION_SECONDS},setpts=PTS-STARTPTS[fade_out];` +
    `[fade_out][fade_in]xfade=transition=fade:duration=${CROSSFADE_SECONDS}:offset=0[crossfaded];` +
    `[main][crossfaded]concat=n=2:v=1:a=0[out]` +
    `" -map "[out]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p ` +
    `-movflags +faststart "${OUTPUT_FILE}"`,
    { stdio: 'inherit' }
  );

  console.log(`\n✅ Seamless looping video saved to: ${OUTPUT_FILE}`);

  // Cleanup temp frames
  console.log('🧹 Cleaning up temporary frames...');
  fs.rmSync(FRAMES_DIR, { recursive: true });

  console.log('🎉 Done! Video ready for LoginPage background.');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
