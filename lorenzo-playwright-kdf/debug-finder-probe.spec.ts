import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Open the Registration address SFS finder (frDialog), fill its OWN postcode field,
// click the finder Find, and dump the result rows + all finder inputs/buttons so we can
// build the exact KDF sequence (open -> fill finder postcode -> finder Find -> select row -> Ok).
test('probe address finder search', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const act = async (app: any, sel: string, action: 'click' | 'fill', value?: string): Promise<boolean> => {
    for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { if (action === 'click') await el.click({ timeout: 8000 }); else await el.fill(value || '', { timeout: 8000 }); return true; } catch { /* next */ } } } } return false;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch { /* */ }
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u = ''; try { u = p.url(); } catch { continue; } if (/APPMAINPAGE/i.test(u)) app = p; } if (/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => { });
  log('logged in: ' + app.url().slice(0, 60));

  const surname = 'Zztest' + Math.floor(Math.random() * 9000 + 1000);
  log('surname=' + surname);
  await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click'); await app.waitForTimeout(2500);
  await act(app, "//span[normalize-space()='Find record']", 'click'); await app.waitForTimeout(3000);
  await act(app, "//input[@dikey='itxtSurname']", 'fill', surname); await app.waitForTimeout(1000);
  await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click'); await app.waitForTimeout(4000);
  await act(app, "//li[normalize-space()='Registration']", 'click'); await app.waitForTimeout(6000);
  log('city: ' + await act(app, "//input[@title='Enter City']", 'fill', 'Solihull')); await app.waitForTimeout(800);
  log('open finder: ' + await act(app, "//img[@title='Use this to select via address finder']", 'click')); await app.waitForTimeout(6000);

  // Locate the frDialog finder frame
  let dlg: any = null;
  for (const fr of app.frames()) { if (/frDialog/i.test(fr.name() || '') || /frDialog/i.test(fr.url())) { dlg = fr; break; } }
  log('frDialog found: ' + !!dlg);

  // Phase 1: dump all visible inputs + Cmd_TTE buttons inside the finder
  if (dlg) {
    const p1 = await dlg.evaluate(() => {
      const inputs: any[] = [];
      document.querySelectorAll('input[type="text"], input:not([type])').forEach((el: any) => {
        const vis = !!(el.offsetParent || el.getClientRects().length);
        if (!vis) return;
        inputs.push({ dikey: el.getAttribute('dikey'), id: el.id, title: el.getAttribute('title'), name: el.getAttribute('name') });
      });
      const btns: any[] = [];
      document.querySelectorAll('td.Cmd_TTE, td.Cmd_TT').forEach((el: any) => { btns.push({ cls: el.className, title: el.getAttribute('title'), text: (el.textContent || '').trim().slice(0, 12) }); });
      return { inputs, btns };
    }).catch(() => null);
    log('PHASE1 ' + JSON.stringify(p1));

    // Phase 2: fill the postcode field (try by title, then by dikey candidates) and click finder Find
    const pcSelectors = ["input[title*='Postcode']", "input[title*='postcode']", "input[dikey='itxtFld6']", "input[dikey='iPostCode']"];
    let filled = '';
    for (const s of pcSelectors) { const loc = dlg.locator(s); if (await loc.count().catch(() => 0)) { try { await loc.first().fill('B91 3DL', { timeout: 5000 }); filled = s; break; } catch { /* next */ } } }
    log('postcode filled via: ' + filled);
    await app.waitForTimeout(800);
    // click finder Find (Cmd_TTE text Find)
    const findClicked = await dlg.locator("//td[contains(@class,'Cmd_TTE') and normalize-space(.)='Find']").first().click({ timeout: 5000 }).then(() => true).catch(() => false);
    log('finder Find clicked: ' + findClicked);
    await app.waitForTimeout(6000);

    // Phase 3: dump result rows
    const p3 = await dlg.evaluate(() => {
      const rows: any[] = [];
      document.querySelectorAll("tr[id*='igRow'], table[id*='igrdSearch'] tr").forEach((tr: any) => {
        const txt = (tr.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt && !/no records/i.test(txt)) rows.push({ id: tr.id, text: txt.slice(0, 80) });
      });
      return { rowCount: rows.length, rows: rows.slice(0, 8) };
    }).catch(() => null);
    log('PHASE3 ' + JSON.stringify(p3));
  }

  fs.writeFileSync('debug-finder-probe-dump.txt', out.join('\n'), 'utf-8');
  log('DONE');
});
