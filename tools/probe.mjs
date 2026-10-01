// ローダ/状態を4秒毎に出力するデバッグプローブ: node tools/probe.mjs <url>
import { createRequire } from 'module'; const require = createRequire('/home/user/webapp/.tmp/npm/package.json');
const { chromium } = require('playwright-core');
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await (await b.newContext({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true })).newPage();
p.on('console', m => console.log('[c]', m.type(), m.text().slice(0, 200)));
await p.goto(process.argv[2]);
for (let i = 0; i < 8; i++) { await p.waitForTimeout(4000);
  console.log(i, await p.evaluate(() => [document.getElementById('loader').className, document.getElementById('loader-label').textContent, window.NANKA?.fps, !!window.NANKA?.world].join(' | '))); }
await b.close();
