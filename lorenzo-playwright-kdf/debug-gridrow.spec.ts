import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

test('inspect patient result grid row', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const clickAny = async (app: any, sel: string): Promise<boolean> => { for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { await el.click({ timeout: 8000 }); return true; } catch {} } } } return false; };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await clickAny(app, "//td[@caption='Patients'][@key='TB_PATNT']"); await app.waitForTimeout(2000);
  await clickAny(app, "//span[normalize-space()='Find record']"); await app.waitForTimeout(2500);
  for (const fr of app.frames()) { const sn = fr.locator("//input[@dikey='itxtSurname']"); if (await sn.count().catch(() => 0) > 0 && await sn.first().isVisible().catch(() => false)) { await sn.first().click(); await sn.first().pressSequentially('Christiansen', { delay: 70 }); break; } }
  await app.waitForTimeout(1000);
  await clickAny(app, "//button[.//td[normalize-space()='Find']]"); await app.waitForTimeout(5000);

  // Find the grid frame and dump the first data row's cells/images/handlers
  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const rowWithPatient = Array.from(document.querySelectorAll('tr')).find((tr: any) => /CHRISTIANSEN|PASID-05/i.test(tr.textContent || ''));
      if (!rowWithPatient) return null;
      const cells = Array.from(rowWithPatient.querySelectorAll('td,img,a,span')).map((c: any) => ({ tag: c.tagName, cls: (c.className || '').slice(0, 20), title: c.getAttribute('title'), onclick: c.getAttribute('onclick') ? c.getAttribute('onclick').slice(0, 40) : null, ondbl: c.getAttribute('ondblclick') ? 'y' : null, text: (c.textContent || '').trim().slice(0, 16) })).filter((c: any) => c.title || c.onclick || c.ondbl || c.text).slice(0, 14);
      return { frame: (location.href || '').slice(-45), rowId: (rowWithPatient as any).id, rowOnclick: (rowWithPatient.getAttribute('onclick') || '').slice(0, 50), rowOndbl: (rowWithPatient.getAttribute('ondblclick') || '').slice(0, 50), cells };
    }).catch(() => null);
    if (res) log('GRIDROW ' + JSON.stringify(res, null, 1));
  }
  fs.writeFileSync('debug-gridrow-dump.txt', out.join('\n'), 'utf-8');
});
