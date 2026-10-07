// Renders pitch/anim/*.html to GIF (and MP4) frame by frame with headless Chrome over CDP + ffmpeg.
//   node pitch/render.mjs            # all jobs
//   node pitch/render.mjs loop-light rsi-dark   # a subset
// Needs: Google Chrome in /Applications, ffmpeg on PATH, Node 22+ (global fetch + WebSocket).
// Serves the repo root itself on a local port, so the pages can load the kit tokens and fonts.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, statSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'pitch', 'gifs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 1600, H = 900;

export const JOBS = [
  { id: 'loop-light',        page: 'loop.html?theme=light',        fps: 25, title: 'Dual loop — light',               note: 'Hero mark: outer loop draws in, then the two signals orbit (one outer orbit = two inner).' },
  { id: 'loop-dark',         page: 'loop.html?theme=dark',         fps: 25, title: 'Dual loop — dark',                note: 'Same mark on the navy band.' },
  { id: 'loop-legend-light', page: 'loop.html?theme=light&legend=1', fps: 25, title: 'Dual loop with legend — light', note: 'Mark plus the outer/inner loop legend in large type.' },
  { id: 'loop-legend-dark',  page: 'loop.html?theme=dark&legend=1', fps: 25, title: 'Dual loop with legend — dark',  note: 'Legend variant on navy.' },
  { id: 'rsi-light',         page: 'rsi.html?theme=light',         fps: 20, title: 'On-prem recursive self-improvement — light', note: 'The local model stays the same size while its capability, the process data, and the experts all grow — inside the on-prem boundary.' },
  { id: 'rsi-dark',          page: 'rsi.html?theme=dark',          fps: 20, title: 'On-prem recursive self-improvement — dark',  note: 'Same scene on navy.' },
  { id: 'scaling-ip',        page: 'scaling.html?domain=ip',       fps: 20, title: 'On-prem scaling law — Patent & IP',        note: 'Capability compounds as channels, people and process data connect; Discover → Optimize → Coach cards for IP consulting.' },
  { id: 'scaling-ma',        page: 'scaling.html?domain=ma',       fps: 20, title: 'On-prem scaling law — Sell-side M&A',      note: 'Same chart with the M&A advisory cards.' },
  { id: 'scaling-med',       page: 'scaling.html?domain=med',      fps: 20, title: 'On-prem scaling law — MedTech regulatory', note: 'Same chart with the medical-device regulatory cards.' },
];

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.gif': 'image/gif', '.woff2': 'font/woff2' };
function serve() {
  return new Promise(res => {
    const srv = createServer(async (req, rsp) => {
      try { const p = join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)); const b = await readFile(p); rsp.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' }); rsp.end(b); }
      catch { rsp.writeHead(404); rsp.end(); }
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function run(cmd, args) { return new Promise((res, rej) => { const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', d => err += d); p.on('exit', c => c === 0 ? res() : rej(new Error(cmd + ' exited ' + c + '\n' + err.slice(-800)))); }); }

const only = process.argv.slice(2);
const jobs = only.length ? JOBS.filter(j => only.includes(j.id)) : JOBS;
const srv = await serve(); const PORT = srv.address().port;
const DBG = 9400 + Math.floor(Math.random() * 100);
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--remote-debugging-port=${DBG}`, `--user-data-dir=/tmp/cdp-pitch-${process.pid}`, 'about:blank'], { stdio: 'ignore' });
let targets; for (let i = 0; i < 60 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${DBG}/json`)).json(); } catch { await sleep(250); } }
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map(); const events = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)?.(m); pending.delete(m.id); } else events.push(m.method); };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
mkdirSync(OUT, { recursive: true });
const manifest = [];
for (const j of jobs) {
  const t0 = Date.now();
  const sep = j.page.includes('?') ? '&' : '?';
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/pitch/anim/${j.page}${sep}seek=1` });
  for (let i = 0; i < 100 && !events.includes('Page.loadEventFired'); i++) await sleep(50); events.length = 0;
  for (let i = 0; i < 100 && !(await ev('!!window.__ready')); i++) await sleep(100);
  await ev('document.fonts.ready.then(() => true)'); await sleep(300);
  const duration = await ev('window.__duration'); const frames = Math.round(duration / 1000 * j.fps);
  const dir = `/tmp/pitch-frames-${j.id}`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir);
  for (let i = 0; i < frames; i++) {
    await ev(`window.__seek(${(i * 1000 / j.fps).toFixed(2)}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    writeFileSync(`${dir}/${String(i).padStart(4, '0')}.png`, Buffer.from(shot.result.data, 'base64'));
  }
  const gif = join(OUT, `${j.id}.gif`), mp4 = join(OUT, `${j.id}.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(j.fps), '-i', `${dir}/%04d.png`, '-filter_complex', '[0:v]split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle', '-loop', '0', gif]);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(j.fps), '-i', `${dir}/%04d.png`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', mp4]);
  rmSync(dir, { recursive: true, force: true });
  const mb = n => (statSync(n).size / 1048576).toFixed(1);
  manifest.push({ ...j, duration, frames, gifMB: mb(gif), mp4MB: mb(mp4) });
  console.log(`${j.id}: ${frames} frames @${j.fps}fps, ${(duration / 1000).toFixed(1)}s → gif ${mb(gif)} MB, mp4 ${mb(mp4)} MB (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
ws.close(); chrome.kill(); srv.close();
await sleep(500); try { rmSync(`/tmp/cdp-pitch-${process.pid}`, { recursive: true, force: true }); } catch { /* Chrome may still be flushing its profile; /tmp is cleaned by the OS */ }
