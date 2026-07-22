import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Validate the lnkTaskPaneMyWork fix (click Inpatient) and dump the other cluster
// elements (all task-pane span.T_PL items + app tabs) for Clinics/Referrals.
test('validate Inpatient + dump clusters', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try {
    await page.fill('#UserName', USER, { timeout: 15000 });
    await page.fill('#Password', PASS);
    await page.click('#btnSubmit');
  } catch { /* ignore */ }

  let app = page;
  for (let attempt = 0; attempt < 30; attempt++) {
    await page.waitForTimeout(4000);
    for (const p of context.pages()) {
      let u = ''; try { u = p.url(); } catch { continue; }
      if (/APPMAINPAGE/i.test(u)) app = p;
    }
    if (/APPMAINPAGE/i.test(app.url())) break;
  }
  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => {});
  log('app: ' + app.url().slice(0, 70));

  const menus = await app.evaluate(() => {
    const tpl = Array.from(document.querySelectorAll('span.T_PL')).map(s => (s.textContent || '').trim()).filter(Boolean);
    const tabs = Array.from(document.querySelectorAll('td[caption]')).map(t => ({ caption: t.getAttribute('caption'), key: t.getAttribute('key'), title: t.getAttribute('title') }));
    return { tpl, tabs };
  });
  log('span.T_PL items: ' + JSON.stringify(menus.tpl));
  log('app tabs: ' + JSON.stringify(menus.tabs));

  try {
    await app.click("//td[@title='My work']", { timeout: 15000 });
    await app.waitForTimeout(2500);
    log('clicked My work tab');
  } catch (e) { log('My work tab fail: ' + String(e).slice(0, 80)); }

  try {
    await app.click("//span[@class='T_PL' and normalize-space()='Inpatient']", { timeout: 15000 });
    await app.waitForTimeout(4000);
    log('CLICKED Inpatient (new locator) OK');
  } catch (e) { log('Inpatient click FAIL: ' + String(e).slice(0, 120)); }

  const after = await app.evaluate(() => {
    const hasWardsLabel = Array.from(document.querySelectorAll('*')).some(e => Array.from(e.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim() === 'Wards'));
    const headings = Array.from(document.querySelectorAll('h1,h2,[class*=Title]')).map(h => (h.textContent || '').trim()).filter(Boolean).slice(0, 10);
    return { hasWardsLabel, headings };
  });
  log('after Inpatient click -> hasWardsLabel=' + after.hasWardsLabel + ' headings=' + JSON.stringify(after.headings));

  fs.writeFileSync('debug-clusters-dump.txt', out.join('\n'), 'utf-8');
});
