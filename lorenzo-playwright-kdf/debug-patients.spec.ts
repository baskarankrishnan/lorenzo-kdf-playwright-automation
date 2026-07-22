import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Search existing patients (to open an EPR without registering) and dump the results grid.
test('search existing patients', async ({ page, context }) => {
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

  for (const term of ['Smith', 'Test', 'Jones']) {
    await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click'); await app.waitForTimeout(2000);
    await act(app, "//span[normalize-space()='Find record']", 'click'); await app.waitForTimeout(2500);
    const filled = await act(app, "//input[@dikey='itxtSurname']", 'fill', term); await app.waitForTimeout(800);
    const found = await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click'); await app.waitForTimeout(4000);
    // dump result rows
    let rows: any[] = [];
    for (const fr of app.frames()) {
      const r = await fr.evaluate(() => Array.from(document.querySelectorAll("tr[id*='igRow'], tr[id*='Row']")).map((tr: any) => ({ id: tr.id, text: (tr.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70) })).filter((x: any) => x.text && !/no records|^\s*$/i.test(x.text)).slice(0, 6)).catch(() => []);
      if (r.length) rows = rows.concat(r);
    }
    log(`term="${term}" filled=${filled} findClicked=${found} rows=${JSON.stringify(rows.slice(0, 6))}`);
    if (rows.length) break;
  }
  fs.writeFileSync('debug-patients-dump.txt', out.join('\n'), 'utf-8');
});
