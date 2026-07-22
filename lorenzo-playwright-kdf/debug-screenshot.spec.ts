import { test } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

test('screenshot patient search', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
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
  await app.screenshot({ path: 'debug-search-screenshot.png', fullPage: false });

  // double-click PASID and screenshot again
  for (const fr of app.frames()) { const c = fr.locator("//td[contains(@class,'L_P')]"); if (await c.count().catch(() => 0) > 0 && await c.first().isVisible().catch(() => false)) { await c.first().dblclick({ timeout: 6000 }).catch(() => {}); break; } }
  await app.waitForTimeout(6000);
  await app.screenshot({ path: 'debug-afteropen-screenshot.png', fullPage: false });
});
