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
  const pc = await act(app, "//input[@dikey='iPostCode']", 'fill', 'SW1A 1AA'); await app.waitForTimeout(1500);
  const fnd = await act(app, "//img[@title='Use this to select via address finder']", 'click'); await app.waitForTimeout(6000);
  log('postcode=' + pc + ' finderClicked=' + fnd);

  // Dump the frDialog contents: inputs, buttons, and current grid rows
  for (const fr of app.frames()) {
    if (!/frDialog|Dialog|Address|address/i.test(fr.name() + fr.url())) continue;
    const res = await fr.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type=text],input:not([type])')).map((i: any) => ({ dikey: i.getAttribute('dikey'), id: i.id, title: i.title, val: i.value })).slice(0, 15);
      const buttons = Array.from(document.querySelectorAll('button,td[title],img[title]')).map((b: any) => ({ tag: b.tagName, title: b.getAttribute('title'), text: (b.textContent || '').trim().slice(0, 15) })).filter((b: any) => /find|search|ok|go/i.test((b.title || '') + b.text)).slice(0, 12);
      const dataRows = Array.from(document.querySelectorAll("tr[id*='igRow'], tr[id*='Row']")).map((r: any) => ({ id: r.id, text: (r.textContent || '').trim().slice(0, 50) })).slice(0, 10);
      return { frame: location.href.slice(-50), inputs, buttons, dataRows };
    }).catch(() => null);
    if (res) log(JSON.stringify(res, null, 1));
  }
  fs.writeFileSync('debug-finder-dump.txt', out.join('\n'), 'utf-8');
});
