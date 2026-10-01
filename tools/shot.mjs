// 横画面スマホ(既定 915x412 CSS px @DPR 2.625 Pixel系, touch)でスクショ + console エラー収集
// 使い方: node tools/shot.mjs <url> <out.png> [waitMs=6000] [WxH] [--tap x,y ...]
// 依存: .tmp/npm/node_modules/playwright-core + `npx -y playwright install chromium-headless-shell`
import { createRequire } from 'module';
import path from 'path'; import { fileURLToPath } from 'url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, '.tmp/npm/package.json'));
const { chromium } = require('playwright-core');
const [url, out = '.tmp/shot.png', waitMs = '6000', wh = '915x412', ...rest] = process.argv.slice(2);
const [W, H] = wh.split('x').map(Number);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DPR || 1.5), isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36' });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(Number(waitMs));
for (let i = 0; i < rest.length; i++) if (rest[i] === '--tap') { const [x, y] = rest[++i].split(',').map(Number); await page.touchscreen.tap(x, y); await page.waitForTimeout(2500); }
await page.screenshot({ path: out });
const fps = await page.evaluate(() => window.NANKA?.fps?.toFixed?.(1)).catch(() => null);
console.log(JSON.stringify({ out, fps, errors: logs.slice(0, 30) }, null, 1));
await browser.close();
