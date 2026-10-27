// Renders template.html frame by frame to an MP4.
// Usage: node render.js [out.mp4] [fps]
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

const out = process.argv[2] || "preview.mp4";
const fps = Number(process.argv[3] || 30);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto("file://" + path.join(__dirname, "template.html"));
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.DURATION);

  const ff = spawn("ffmpeg", [
    "-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.seek(t), i / fps);
    ff.stdin.write(await page.screenshot({ type: "jpeg", quality: 95 }));
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
  console.log(`wrote ${out} (${frames} frames)`);
})();
