import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Navigate Patients -> Find record -> Registration -> postcode -> address finder,
// then dump the address-lookup grid + city field (tbl_SelectRow / txt_City cluster:
// APE/CarePlan/Charts/Contacts/IDM).
test('dump address grid', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };

  const act = async (app: any, sel: string, action: 'click' | 'fill', value?: string): Promise<boolean> => {
    for (const fr of app.frames()) {
      const loc = fr.locator(sel);
      const n = await loc.count().catch(() => 0);
      for (let i = 0; i < n; i++) {
        const el = loc.nth(i);
        if (await el.isVisible().catch(() => false)) {
          try { if (action === 'click') await el.click({ timeout: 8000 }); else await el.fill(value || '', { timeout: 8000 }); return true; } catch { /* try next */ }
        }
      }
    }
    return false;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => {});
  log('logged in: ' + app.url().slice(0, 60));

  const surname = 'Zztest' + Math.floor(Math.random() * 9000 + 1000);
  log('surname=' + surname);
  log('Patients tab: ' + await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click')); await app.waitForTimeout(2500);
  log('Find record: ' + await act(app, "//span[normalize-space()='Find record']", 'click')); await app.waitForTimeout(3000);
  log('fill surname: ' + await act(app, "//input[@dikey='itxtSurname']", 'fill', surname)); await app.waitForTimeout(1000);
  log('click Find: ' + await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click')); await app.waitForTimeout(4000);
  log('click Registration: ' + await act(app, "//li[normalize-space()='Registration']", 'click')); await app.waitForTimeout(5000);

  // Now on Registration form. Fill postcode and click address finder.
  log('fill postcode: ' + await act(app, "//input[@dikey='iPostCode']", 'fill', 'SW1A 1AA')); await app.waitForTimeout(1500);
  log('click address finder: ' + await act(app, "//img[@title='Use this to select via address finder']", 'click')); await app.waitForTimeout(6000);

  // Dump grids/rows + city field across all frames
  const dumpFrame = async (fr: any, label: string) => {
    const res = await fr.evaluate(() => {
      const out: any = { grids: [], selectRowImgs: [], cityInputs: [] };
      document.querySelectorAll("table[id*='grd'], table[id*='Search'], table[id*='igrd'], table[id*='DT']").forEach((t: any) => {
        const rows = t.querySelectorAll('tr');
        out.grids.push({ id: t.id, cls: t.className, rowCount: rows.length, firstRowId: rows[1]?.id || rows[0]?.id, sampleRowHtml: (rows[1] || rows[0])?.outerHTML?.slice(0, 240) });
      });
      document.querySelectorAll("img[title*='select row'], img[title*='Select row'], img[onkeydown*='RCKeyDown'], td[title='Click to select row']").forEach((el: any) => {
        out.selectRowImgs.push({ tag: el.tagName, title: el.getAttribute('title'), cls: el.className, onkeydown: (el.getAttribute('onkeydown') || '').slice(0, 40), parentRowId: el.closest('tr')?.id });
      });
      document.querySelectorAll("input[dikey*='53'], input[title*='Town'], input[title*='City'], input[dikey='C53_tA4']").forEach((el: any) => {
        out.cityInputs.push({ dikey: el.getAttribute('dikey'), id: el.id, title: el.getAttribute('title'), value: el.value });
      });
      return out;
    }).catch(() => null);
    if (res && (res.grids.length || res.selectRowImgs.length || res.cityInputs.length)) log(`[${label}] ` + JSON.stringify(res));
  };
  for (const fr of app.frames()) { const n = fr.name() || fr.url().slice(-45); await dumpFrame(fr, 'frame:' + n); }

  fs.writeFileSync('debug-address-dump.txt', out.join('\n'), 'utf-8');
});
