import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// After Find record + surname, dump all Find-like controls to get the real patient-search Find selector.
test('inspect patient search Find', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const act = async (app: any, sel: string, action: 'click' | 'fill', value?: string): Promise<boolean> => {
    for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { if (action === 'click') await el.click({ timeout: 8000 }); else await el.fill(value || '', { timeout: 8000 }); return true; } catch {} } } } return false;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);

  await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click'); await app.waitForTimeout(2000);
  await act(app, "//span[normalize-space()='Find record']", 'click'); await app.waitForTimeout(3000);
  await act(app, "//input[@dikey='itxtSurname']", 'fill', 'Smith'); await app.waitForTimeout(1000);

  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const genXpath = (el: Element): string => { const parts: string[] = []; let n: Element | null = el; while (n && n.nodeType === 1 && parts.length < 6) { let i = 1, s = n.previousElementSibling; while (s) { if (s.nodeName === n.nodeName) i++; s = s.previousElementSibling; } parts.unshift(`${n.nodeName.toLowerCase()}[${i}]`); n = n.parentElement; } return '/' + parts.join('/'); };
      const hits: any[] = [];
      document.querySelectorAll('button, td, span, input, img').forEach((el: any) => {
        const t = (el.textContent || '').trim(); const title = el.getAttribute('title') || '';
        if (/^find/i.test(t) || /^find/i.test(title)) { const r = el.getBoundingClientRect(); hits.push({ tag: el.tagName, cls: (el.className||'').slice(0,25), id: el.id, title, text: t.slice(0, 20), vis: r.width > 0 && r.height > 0, disabled: el.disabled || el.getAttribute('disabled'), xpath: genXpath(el) }); }
      });
      return hits.slice(0, 15);
    }).catch(() => []);
    if (res.length) log(`[${fr.name() || fr.url().slice(-40)}] ` + JSON.stringify(res, null, 1));
  }
  fs.writeFileSync('debug-psfind-dump.txt', out.join('\n'), 'utf-8');
});
