import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Determine how to get PAST the "Please validate the address before saving" dialog on the
// Registration form (PAF is empty in this env, so no address can be selected).
// Strategy tested: City -> Next -> (dialog) Ok = save anyway -> Next -> reach "Add social information".
test('probe validate-address dialog bypass', async ({ page, context }) => {
  test.setTimeout(200000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const act = async (app: any, sel: string, action: 'click' | 'fill', value?: string): Promise<boolean> => {
    for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { if (action === 'click') await el.click({ timeout: 8000 }); else await el.fill(value || '', { timeout: 8000 }); return true; } catch { /* next */ } } } } return false;
  };
  const hasText = async (app: any, re: RegExp): Promise<boolean> => {
    for (const fr of app.frames()) { const t = await fr.evaluate(() => document.body ? document.body.innerText : '').catch(() => ''); if (re.test(t)) return true; } return false;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch { /* */ }
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u = ''; try { u = p.url(); } catch { continue; } if (/APPMAINPAGE/i.test(u)) app = p; } if (/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => { });
  log('logged in');

  const surname = 'Zztest' + Math.floor(Math.random() * 9000 + 1000);
  await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click'); await app.waitForTimeout(2500);
  await act(app, "//span[normalize-space()='Find record']", 'click'); await app.waitForTimeout(3000);
  await act(app, "//input[@dikey='itxtSurname']", 'fill', surname); await app.waitForTimeout(1000);
  await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click'); await app.waitForTimeout(4000);
  await act(app, "//li[normalize-space()='Registration']", 'click'); await app.waitForTimeout(6000);
  log('city: ' + await act(app, "//input[@title='Enter City']", 'fill', 'Solihull')); await app.waitForTimeout(800);

  const reachedSocial = async () => await hasText(app, /Country of Birth|Nationality|Ethnic/i);

  // Next #1
  log('Next#1: ' + await act(app, "//td[@title='Next']", 'click')); await app.waitForTimeout(3000);
  log('validate dialog present after Next#1: ' + await hasText(app, /Please validate the address/i));
  // Ok = save anyway
  log('Ok(save anyway): ' + await act(app, "//td[@title='Ok'] | //td[normalize-space(.)='Ok']", 'click')); await app.waitForTimeout(2500);
  log('validate dialog still present after Ok: ' + await hasText(app, /Please validate the address/i));
  log('reached social section after Ok: ' + await reachedSocial());
  // Next #2
  log('Next#2: ' + await act(app, "//td[@title='Next']", 'click')); await app.waitForTimeout(3000);
  log('validate dialog present after Next#2: ' + await hasText(app, /Please validate the address/i));
  log('reached social section after Next#2: ' + await reachedSocial());
  // Ok again (in case dialog reappeared)
  log('Ok#2: ' + await act(app, "//td[@title='Ok'] | //td[normalize-space(.)='Ok']", 'click')); await app.waitForTimeout(2500);
  log('reached social section after Ok#2: ' + await reachedSocial());
  // Next #3
  log('Next#3: ' + await act(app, "//td[@title='Next']", 'click')); await app.waitForTimeout(3000);
  log('reached social section after Next#3: ' + await reachedSocial());

  fs.writeFileSync('debug-validate-bypass-dump.txt', out.join('\n'), 'utf-8');
  log('DONE');
});
