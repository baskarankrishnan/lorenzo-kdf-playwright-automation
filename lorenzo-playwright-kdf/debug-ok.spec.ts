import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Navigate My Work -> Inpatient and dump OK-like buttons (btn_OK cluster: ePMA/Theatres/WA).
test('dump OK buttons', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => {});

  try {
    await app.click("//td[@title='My work']", { timeout: 15000 }); await app.waitForTimeout(2000);
    await app.locator("//span[@class='T_PL' and normalize-space()='Inpatient']").locator('visible=true').first().click({ timeout: 15000 });
    await app.waitForTimeout(5000);
    log('navigated My Work -> Inpatient');
  } catch (e) { log('nav fail: ' + String(e).slice(0, 100)); }

  const dumpFrame = async (fr: any, label: string) => {
    const res = await fr.evaluate(() => {
      const genXpath = (el: Element): string => { const parts: string[] = []; let n: Element | null = el; while (n && n.nodeType === 1 && parts.length < 6) { let i = 1, s = n.previousElementSibling; while (s) { if (s.nodeName === n.nodeName) i++; s = s.previousElementSibling; } parts.unshift(`${n.nodeName.toLowerCase()}[${i}]`); n = n.parentElement; } return '/' + parts.join('/'); };
      const hits: any[] = [];
      document.querySelectorAll('button, td, span, input, img').forEach((el: any) => {
        const t = (el.textContent || '').trim();
        const title = el.getAttribute('title') || '';
        const cls = el.className || '';
        if (/^ok$/i.test(t) || /^ok$/i.test(title) || (cls.includes('Cmd_AK'))) {
          const r = el.getBoundingClientRect();
          hits.push({ tag: el.tagName, cls, id: el.id, title, text: t.slice(0, 20), vis: r.width > 0 && r.height > 0, xpath: genXpath(el) });
        }
      });
      return hits.slice(0, 25);
    }).catch(() => []);
    if (res.length) log(`[${label}] ` + JSON.stringify(res));
  };
  await dumpFrame(app, 'main');
  for (const fr of app.frames()) { const n = fr.name() || fr.url().slice(-35); await dumpFrame(fr, 'frame:' + n); }

  fs.writeFileSync('debug-ok-dump.txt', out.join('\n'), 'utf-8');
});
