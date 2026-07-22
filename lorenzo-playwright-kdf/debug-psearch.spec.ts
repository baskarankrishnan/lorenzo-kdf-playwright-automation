import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Inspect the patient search view: surname field, Find button, and result rows for CHRISTIANSEN.
test('inspect patient search view', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const clickAny = async (app: any, sel: string): Promise<boolean> => {
    for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { await el.click({ timeout: 8000 }); return true; } catch {} } } } return false;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);

  await clickAny(app, "//td[@caption='Patients'][@key='TB_PATNT']"); await app.waitForTimeout(2000);
  await clickAny(app, "//span[normalize-space()='Find record']"); await app.waitForTimeout(3000);

  // Dump the search view inputs + Find buttons
  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input[type=text],input:not([type])")).map((i: any) => ({ dikey: i.getAttribute('dikey'), id: i.id, title: i.title, ph: i.placeholder })).filter((i: any) => i.dikey || i.title).slice(0, 12);
      const finds = Array.from(document.querySelectorAll('button')).map((b: any) => ({ id: b.id, title: b.getAttribute('title'), text: (b.textContent || '').trim().slice(0, 15), disabled: b.disabled })).filter((b: any) => /find/i.test(b.text + (b.title || ''))).slice(0, 6);
      return (inputs.length || finds.length) ? { frame: (location.href || '').slice(-40), inputs, finds } : null;
    }).catch(() => null);
    if (res) log('SEARCHVIEW ' + JSON.stringify(res));
  }

  // Type surname into each candidate field and search
  for (const fr of app.frames()) {
    const sn = fr.locator("//input[@dikey='itxtSurname']");
    if (await sn.count().catch(() => 0) > 0 && await sn.first().isVisible().catch(() => false)) {
      await sn.first().click(); await sn.first().pressSequentially('Christiansen', { delay: 70 });
      log('typed surname in frame ' + (fr.url() || '').slice(-40));
      break;
    }
  }
  await app.waitForTimeout(1000);
  await clickAny(app, "//button[.//td[normalize-space()='Find']]"); await app.waitForTimeout(5000);

  // Dump ALL rows with patient-like text (containing PASID or CHRISTIANSEN or digits)
  for (const fr of app.frames()) {
    const rows = await fr.evaluate(() => Array.from(document.querySelectorAll('tr')).map((tr: any) => ({ id: tr.id, cls: (tr.className || '').slice(0, 20), text: (tr.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) })).filter((r: any) => /CHRISTIANSEN|PASID|845-306/i.test(r.text)).slice(0, 6)).catch(() => []);
    if (rows.length) log('RESULTROWS[' + (fr.url() || '').slice(-35) + '] ' + JSON.stringify(rows));
  }
  fs.writeFileSync('debug-psearch-dump.txt', out.join('\n'), 'utf-8');
});
