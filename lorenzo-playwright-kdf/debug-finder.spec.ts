import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Reach the Registration address finder dialog (frDialog) and dump its inputs/buttons/grid
// to understand how the postcode search should work (tbl_SelectRow shows "no records").
test('inspect address finder dialog', async ({ page, context }) => {
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

  const surname = 'Zztest' + Math.floor(Math.random() * 9000 + 1000);
  await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click'); await app.waitForTimeout(2500);
  await act(app, "//span[normalize-space()='Find record']", 'click'); await app.waitForTimeout(3000);
  await act(app, "//input[@dikey='itxtSurname']", 'fill', surname); await app.waitForTimeout(1000);
  await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click'); await app.waitForTimeout(4000);
  await act(app, "//li[normalize-space()='Registration']", 'click'); await app.waitForTimeout(5000);
  // Fill City + Postcode on the reg form, then open finder
  await act(app, "//input[@title='Enter City']", 'fill', 'Solihull'); await app.waitForTimeout(800);
  const pc = await act(app, "//input[@dikey='iPostCode']", 'fill', 'B91 3DL'); await app.waitForTimeout(1500);
  await act(app, "//li[normalize-space()='Registration']", 'click'); await app.waitForTimeout(5000);
  // Fill City + Postcode on the reg form, then open finder
  await act(app, "//input[@title='Enter City']", 'fill', 'Solihull'); await app.waitForTimeout(800);
  const pc = await act(app, "//input[@dikey='iPostCode']", 'fill', 'B91 3DL'); await app.waitForTimeout(1500);
  await act(app, "//td[@title='Next']", 'click'); await app.waitForTimeout(3000);
  await act(app, "//td[@title='Ok']", 'click'); await app.waitForTimeout(7000);
  log('postcode=' + pc + ' pages=' + context.pages().length);

  // Dump EVERY page + EVERY frame's Ok/Cancel/Close candidates so we can pinpoint the
  // Address SFS finder Cancel vs the app-bar Cancel.
  let pi = 0;
  for (const pg of context.pages()) {
    let pu = ''; try { pu = pg.url(); } catch { }
    for (const fr of pg.frames()) {
      const res = await fr.evaluate(() => {
        const cands = Array.from(document.querySelectorAll('button,td,img,a,div,span')).filter((b: any) => {
          return /^(ok|cancel|close)$/i.test((b.getAttribute('title') || '').trim()) || /^(ok|cancel|close)$/i.test((b.textContent || '').trim());
        }).map((b: any) => ({ tag: b.tagName, title: b.getAttribute('title'), cls: b.className, id: b.id, text: (b.textContent || '').trim().slice(0, 10), html: (b.outerHTML || '').slice(0, 150) })).slice(0, 20);
        const hasSfs = /Address SFS/i.test(document.body ? document.body.innerText : '');
        return { count: cands.length, hasSfs, cands };
      }).catch(() => null);
      if (res && (res.count > 0 || res.hasSfs)) log(`PAGE[${pi}] ${pu.slice(-45)} FRAME ${fr.url().slice(-55)} sfs=${res.hasSfs} ` + JSON.stringify(res.cands, null, 1));
    }
    pi++;
  }
  fs.writeFileSync('debug-finder-dump.txt', out.join('\n'), 'utf-8');
});
