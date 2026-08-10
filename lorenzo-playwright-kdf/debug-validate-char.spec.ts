import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Comprehensive probe: reach reg form, fill City, click Next, then fully characterise the
// "Please validate the address before saving" dialog and how to get PAST it to the
// "Add social information" section. Logs out at the end to avoid stale-session collisions.
test('characterise validate-address dialog', async ({ page, context }) => {
  test.setTimeout(220000);
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
  const finderOpen = async (app: any): Promise<boolean> => {
    for (const fr of app.frames()) { if (/frDialog/i.test(fr.name() || '') || /frDialog/i.test(fr.url())) { const c = await fr.locator("input[dikey='itxtFld6']").count().catch(() => 0); if (c) return true; } } return false;
  };
  const dumpDialogButtons = async (app: any, label: string) => {
    for (const fr of app.frames()) {
      const res = await fr.evaluate(() => {
        const els = Array.from(document.querySelectorAll('td,button,img,a')).filter((b: any) => /^(ok|cancel|yes|no)$/i.test((b.getAttribute('title') || '').trim()) || /^(ok|cancel|yes|no)$/i.test((b.textContent || '').trim()));
        const vis = els.filter((b: any) => !!(b.offsetParent || b.getClientRects().length));
        return vis.map((b: any) => ({ tag: b.tagName, title: b.getAttribute('title'), cls: b.className, text: (b.textContent || '').trim().slice(0, 8) })).slice(0, 12);
      }).catch(() => null);
      if (res && res.length) log(`[${label}] frame=${(fr.name() || fr.url()).slice(-40)} ` + JSON.stringify(res));
    }
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch { /* */ }
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u = ''; try { u = p.url(); } catch { continue; } if (/APPMAINPAGE/i.test(u)) app = p; } if (/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => { });
  log('logged in: ' + /APPMAINPAGE/i.test(app.url()));

  try {
    const surname = 'Zztest' + Math.floor(Math.random() * 9000 + 1000);
    await act(app, "//td[@caption='Patients'][@key='TB_PATNT']", 'click'); await app.waitForTimeout(2500);
    await act(app, "//span[normalize-space()='Find record']", 'click'); await app.waitForTimeout(3000);
    await act(app, "//input[@dikey='itxtSurname']", 'fill', surname); await app.waitForTimeout(1000);
    await act(app, "//td[@class='Cmd_TTE' and normalize-space()='Find']", 'click'); await app.waitForTimeout(4000);
    await act(app, "//li[normalize-space()='Registration']", 'click'); await app.waitForTimeout(6000);
    log('on reg form (city visible): ' + (await app.locator("//input[@title='Enter City']").count().catch(() => 0)));
    log('city filled: ' + await act(app, "//input[@title='Enter City']", 'fill', 'Solihull')); await app.waitForTimeout(800);

    const social = async () => await hasText(app, /Country of Birth|Nationality|Ethnic/i);

    // Next #1
    log('--- Next#1 ---');
    log('Next#1 clicked: ' + await act(app, "//td[@title='Next']", 'click')); await app.waitForTimeout(3500);
    log('validate dialog: ' + await hasText(app, /Please validate the address/i));
    log('social reached: ' + await social());
    await dumpDialogButtons(app, 'after Next#1');

    // Click validate dialog Ok
    log('--- click Ok ---');
    log('Ok clicked: ' + await act(app, "//td[@title='Ok'] | //td[normalize-space(.)='Ok']", 'click')); await app.waitForTimeout(3500);
    log('validate dialog after Ok: ' + await hasText(app, /Please validate the address/i));
    log('finder open after Ok: ' + await finderOpen(app));
    log('social after Ok: ' + await social());
    await dumpDialogButtons(app, 'after Ok');

    // If finder open, cancel it
    if (await finderOpen(app)) {
      log('--- cancel finder ---');
      log('AddrCancel clicked: ' + await act(app, "//td[normalize-space(.)='Cancel']", 'click')); await app.waitForTimeout(3000);
      log('finder after cancel: ' + await finderOpen(app));
    }

    // Next again
    log('--- Next#2 ---');
    log('Next#2 clicked: ' + await act(app, "//td[@title='Next']", 'click')); await app.waitForTimeout(3500);
    log('validate dialog after Next#2: ' + await hasText(app, /Please validate the address/i));
    log('social after Next#2: ' + await social());
    await dumpDialogButtons(app, 'after Next#2');

    // Try clicking validate dialog CANCEL as alternative bypass
    log('--- try dialog Cancel ---');
    log('dialog Cancel clicked: ' + await act(app, "//td[@title='Cancel'] | //td[normalize-space(.)='Cancel']", 'click')); await app.waitForTimeout(3000);
    log('social after dialog Cancel: ' + await social());
    log('Next#3 clicked: ' + await act(app, "//td[@title='Next']", 'click')); await app.waitForTimeout(3500);
    log('social after Next#3: ' + await social());
  } catch (e: any) { log('ERROR: ' + (e && e.message ? e.message : String(e))); }

  // Logout to release the single-session lock
  try {
    await act(app, "//img[@title='Exit'] | //img[@alt='Exit'] | //td[@title='Exit']", 'click'); await app.waitForTimeout(2000);
    await act(app, "//td[@title='Yes'] | //td[normalize-space(.)='Yes'] | //button[@title='Yes']", 'click'); await app.waitForTimeout(2000);
    log('logout attempted');
  } catch { /* */ }

  fs.writeFileSync('debug-validate-char-dump.txt', out.join('\n'), 'utf-8');
  log('DONE');
});
