import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Validate: in the address finder dialog, click its Find button to execute the postcode
// search, then check if address rows appear (confirms the missing-search-step hypothesis).
test('validate address finder search', async ({ page, context }) => {
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
  await act(app, "//input[@dikey='iPostCode']", 'fill', 'SW1A 1AA'); await app.waitForTimeout(1500);
  await act(app, "//img[@title='Use this to select via address finder']", 'click'); await app.waitForTimeout(6000);

  // Click the Find button INSIDE the address finder frame (the one holding itxtFld6)
  let clicked = false;
  for (const fr of app.frames()) {
    const hasPc = await fr.locator("#it_C_itxtFld6").count().catch(() => 0);
    if (hasPc > 0) {
      const btn = fr.locator("//button[@title='Find']");
      if (await btn.count().catch(() => 0) > 0) { try { await btn.first().click({ timeout: 8000 }); clicked = true; log('clicked dialog Find in finder frame'); } catch (e) { log('dialog Find click err: ' + String(e).slice(0, 60)); } }
      break;
    }
  }
  log('dialogFindClicked=' + clicked);
  await app.waitForTimeout(6000);

  // Re-check the grid for address rows
  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const grid = document.querySelector("table[id='g_DT1igrdSearch']");
      const dataRows = Array.from(document.querySelectorAll("tr[id*='igRowigrdSearch'], tr[id*='igRow']")).map((r: any) => ({ id: r.id, text: (r.textContent || '').trim().slice(0, 60) })).filter((r: any) => r.text && !/no records/i.test(r.text)).slice(0, 8);
      const noRecords = /no records to show/i.test(document.body.innerText);
      if (dataRows.length || (grid && !noRecords)) return { frame: location.href.slice(-45), dataRows, noRecords };
      return null;
    }).catch(() => null);
    if (res) log('GRID: ' + JSON.stringify(res));
  }
  fs.writeFileSync('debug-finder2-dump.txt', out.join('\n'), 'utf-8');
});
