import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Open CHRISTIANSEN Gina (PASID-053283, NHS 845 306 7805, Male, 07-Mar-2001) via identifier
// search, then dump the EPR tab bar (btn_Forms / btn_Referral cluster).
test('open patient EPR by identifier', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const clickAny = async (app: any, sel: string): Promise<boolean> => { for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { await el.click({ timeout: 8000 }); return true; } catch {} } } } return false; };
  const typeAny = async (app: any, sel: string, val: string): Promise<boolean> => { for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { await el.click({ timeout: 5000 }); await el.pressSequentially(val, { delay: 60 }); return true; } catch {} } } } return false; };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);
  await clickAny(app, "//td[@caption='Patients'][@key='TB_PATNT']"); await app.waitForTimeout(2000);

  // Quick-launch EPR from the Patients pane: type identifier then click the EPR button.
  let launched = false;
  for (const fr of app.frames()) {
    const box = fr.locator("//input[contains(@title,'Enter Identifier') or contains(@placeholder,'Enter Identifier')]");
    if (await box.count().catch(() => 0) > 0 && await box.first().isVisible().catch(() => false)) {
      await box.first().click(); await box.first().pressSequentially('PASID-053283', { delay: 60 }); launched = true; log('typed identifier in Patients pane'); break;
    }
  }
  await app.waitForTimeout(500);
  await clickAny(app, "//a[normalize-space()='EPR'] | //span[normalize-space()='EPR'] | //td[normalize-space()='EPR'] | //*[normalize-space()='EPR' and (self::a or self::span or self::td or self::div)]");
  await app.waitForTimeout(2000);
  // Fallback: press Enter in the identifier box, and coordinate-click the EPR button
  for (const fr of app.frames()) { const box = fr.locator("//input[contains(@title,'Enter Identifier') or contains(@placeholder,'Enter Identifier')]"); if (await box.count().catch(() => 0) > 0 && await box.first().isVisible().catch(() => false)) { await box.first().press('Enter').catch(() => {}); break; } }
  await app.waitForTimeout(2500);
  // Tick the row checkbox by coordinates (far-left of the CHRISTIANSEN data row), then View EPR
  await app.mouse.click(231, 301).catch(() => {});
  await app.waitForTimeout(2000);
  let ve = await clickAny(app, "//span[normalize-space()='View EPR']");
  if (!ve) await app.mouse.click(64, 429).catch(() => {}); // View EPR in Find record pane
  await app.waitForTimeout(9000);
  log('quickLaunch=' + launched + ' viewEPR=' + ve);
  await app.screenshot({ path: 'debug-epr-open.png' }).catch(() => {});

  // Dump EPR tabs
  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("td[id*='eprtab'], td[caption], td[id*='Tab_']")).map((t: any) => ({ id: t.id, caption: t.getAttribute('caption'), title: t.getAttribute('title'), text: (t.textContent || '').trim().slice(0, 18) })).filter((t: any) => (t.caption || t.text) && !/^(My work|Patients|In theatre)$/.test(t.caption || '')).slice(0, 30);
      return tabs.length ? { frame: (location.href || '').slice(-45), tabs } : null;
    }).catch(() => null);
    if (res) log('EPRTABS ' + JSON.stringify(res));
  }
  // Verify the caption locators actually MATCH (locator vs context)
  const countAll = async (sel: string): Promise<number> => { let t = 0; for (const fr of app.frames()) { t += await fr.locator(sel).count().catch(() => 0); } return t; };
  for (const sel of ["//td[@caption='Re&ferrals']", "//td[@caption='&Forms']", "//td[@caption='Medication']"]) {
    log(`LOCATOR ${sel} matched=${await countAll(sel)}`);
  }
  // Virtualization test: does scrolling the EPR tab bar remove Medication from the DOM?
  log('--- scroll test (ico_EPRDownArrow = //*[@id=\'ieprtab_setImg2_C5\']) ---');
  const visInfo = async (sel: string): Promise<string> => { let cnt = 0, vis = 0; for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); cnt += n; for (let i = 0; i < n; i++) { if (await loc.nth(i).isVisible().catch(() => false)) vis++; } } return `count=${cnt} visible=${vis}`; };
  log(`Medication BEFORE scroll: ${await visInfo("//td[@caption='Medication']")}`);
  for (let i = 1; i <= 5; i++) {
    const scrolled = await clickAny(app, "//*[@id='ieprtab_setImg2_C5']");
    await app.waitForTimeout(1200);
    log(`after down-scroll #${i} (clicked=${scrolled}): Medication ${await visInfo("//td[@caption='Medication']")}`);
  }
  fs.writeFileSync('debug-eprid-dump.txt', out.join('\n'), 'utf-8');
});
