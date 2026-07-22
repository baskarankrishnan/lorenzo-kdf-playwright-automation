import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Validate tab_Clinic (Clinics) + lnk_EmergencyDepartment locators from the home task pane.
test('validate Clinics + EmergencyDepartment', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}

  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => {});
  log('app: ' + app.url().slice(0, 60));

  const check = async (name: string, sel: string) => {
    const locator = app.locator(sel);
    const count = await locator.count().catch(() => -1);
    let visCount = 0;
    for (let i = 0; i < count; i++) { if (await locator.nth(i).isVisible().catch(() => false)) visCount++; }
    log(`${name}: sel=${sel} | count=${count} visible=${visCount}`);
  };

  await check('Clinics(span.T_PL)', "//span[@class='T_PL' and normalize-space()='Clinics']");
  await check('EmergencyDept(li)', "//li[normalize-space()='Emergency Department']");
  await check('EmergencyDept(span.T_PL)', "//span[@class='T_PL' and normalize-space()='Emergency Department']");
  await check('Referrals(span.T_PL)', "//span[@class='T_PL' and normalize-space()='Referrals']");

  // Click Clinics to confirm navigation works with the fixed locator
  const before = app.url();
  try {
    await app.locator("//span[@class='T_PL' and normalize-space()='Clinics']").locator('visible=true').first().click({ timeout: 15000 });
    await app.waitForTimeout(4000);
    log('CLICKED Clinics OK; url changed=' + (app.url() !== before));
  } catch (e) { log('Clinics click FAIL: ' + String(e).slice(0, 120)); }

  fs.writeFileSync('debug-clinics-dump.txt', out.join('\n'), 'utf-8');
});
