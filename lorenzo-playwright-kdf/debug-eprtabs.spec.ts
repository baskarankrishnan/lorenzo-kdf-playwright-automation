import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Open an existing patient's EPR and dump the EPR tab bar (btn_Forms, btn_Referral cluster).
test('inspect EPR tabs', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };
  const clickAny = async (app: any, sel: string): Promise<boolean> => {
    for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { await el.click({ timeout: 8000 }); return true; } catch {} } } } return false;
  };
  const typeAny = async (app: any, sel: string, val: string): Promise<boolean> => {
    for (const fr of app.frames()) { const loc = fr.locator(sel); const n = await loc.count().catch(() => 0); for (let i = 0; i < n; i++) { const el = loc.nth(i); if (await el.isVisible().catch(() => false)) { try { await el.click({ timeout: 5000 }); await el.pressSequentially(val, { delay: 60 }); return true; } catch {} } } } return false;
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  try { await page.fill('#UserName', USER, { timeout: 15000 }); await page.fill('#Password', PASS); await page.click('#btnSubmit'); } catch {}
  let app = page;
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(4000); for (const p of context.pages()) { let u=''; try{u=p.url();}catch{continue;} if(/APPMAINPAGE/i.test(u)) app=p; } if(/APPMAINPAGE/i.test(app.url())) break; }
  await app.waitForTimeout(3000);

  let opened = false;
  for (const term of ['Christiansen']) {
    await clickAny(app, "//td[@caption='Patients'][@key='TB_PATNT']"); await app.waitForTimeout(2000);
    await clickAny(app, "//span[normalize-space()='Find record']"); await app.waitForTimeout(2500);
    await typeAny(app, "//input[@dikey='itxtSurname']", term); await app.waitForTimeout(800);
    await clickAny(app, "//button[.//td[normalize-space()='Find']]"); await app.waitForTimeout(5000);
    // Open the patient: double-click the PASID link cell (td.L_P), then confirm any prompt
    let ve = false;
    for (const fr of app.frames()) { const c = fr.locator("//td[@class='L_P']"); if (await c.count().catch(() => 0) > 0 && await c.first().isVisible().catch(() => false)) { await c.first().dblclick({ timeout: 6000 }).catch(() => {}); ve = true; log('dblclicked td.L_P in ' + (fr.url() || '').slice(-35)); break; } }
    await app.waitForTimeout(6000);
    // Some flows need a task-pane 'View EPR' after selecting
    if (!ve) { await clickAny(app, "//li[normalize-space()='View EPR']"); await app.waitForTimeout(5000); }
    log('viewEPR=' + ve);
    opened = true; break;
  }
  log('opened=' + opened);

  // Dump the EPR tab bar
  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll("td[id*='ieprtab'], td[caption], td[id*='eprtab']")).map((t: any) => ({ id: t.id, caption: t.getAttribute('caption'), title: t.getAttribute('title'), text: (t.textContent || '').trim().slice(0, 20) })).filter((t: any) => t.caption || t.text).slice(0, 30);
      return tabs.length ? { frame: (location.href || '').slice(-45), tabs } : null;
    }).catch(() => null);
    if (res) log('EPRTABS ' + JSON.stringify(res));
  }
  fs.writeFileSync('debug-eprtabs-dump.txt', out.join('\n'), 'utf-8');
});
