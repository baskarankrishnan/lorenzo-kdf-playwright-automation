import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Reach the Registration form and dump ALL address-related inputs (dikey/id/title/value)
// + comboboxes so we can fill the address manually with exact values (per pasted image).
test('dump registration address fields', async ({ page, context }) => {
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
          try { if (action === 'click') await el.click({ timeout: 8000 }); else await el.fill(value || '', { timeout: 8000 }); return true; } catch { /* next */ }
        }
      }
    }
    return false;
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
  log('Patients tab: ' + await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click')); await app.waitForTimeout(2500);
  log('Find record: ' + await act(app, "//span[normalize-space()='Find record']", 'click')); await app.waitForTimeout(3000);
  log('fill surname: ' + await act(app, "//input[@dikey='itxtSurname']", 'fill', surname)); await app.waitForTimeout(1000);
  log('fill forename: ' + await act(app, "//input[@dikey='itxtForename']", 'fill', 'John')); await app.waitForTimeout(500);
  log('click Find: ' + await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click')); await app.waitForTimeout(4000);
  log('click Registration: ' + await act(app, "//li[normalize-space()='Registration']", 'click')); await app.waitForTimeout(6000);

  // Dump ALL visible text inputs + selects across every frame on the Registration form.
  const dumpFrame = async (fr: any, label: string) => {
    const res = await fr.evaluate(() => {
      const inputs: any[] = [];
      document.querySelectorAll('input[type="text"], input:not([type])').forEach((el: any) => {
        const vis = !!(el.offsetParent || el.getClientRects().length);
        if (!vis) return;
        inputs.push({ dikey: el.getAttribute('dikey'), id: el.id, title: el.getAttribute('title'), name: el.getAttribute('name'), val: el.value });
      });
      const selects: any[] = [];
      document.querySelectorAll("input[title*='Country'], input[title*='Address'], img[title*='address']").forEach((el: any) => {
        const vis = !!(el.offsetParent || el.getClientRects().length);
        if (!vis) return;
        selects.push({ tag: el.tagName, dikey: el.getAttribute('dikey'), id: el.id, title: el.getAttribute('title') });
      });
      return { inputs, selects };
    }).catch(() => null);
    if (res && (res.inputs.length || res.selects.length)) log(`[${label}] ` + JSON.stringify(res));
  };
  for (const fr of app.frames()) { const n = fr.name() || fr.url().slice(-45); await dumpFrame(fr, 'frame:' + n); }

  fs.writeFileSync('debug-address-fields-dump.txt', out.join('\n'), 'utf-8');
  log('DONE');
});
