import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Navigate to Emergency Department and dump the ward-select structure (chk_WardName cluster).
test('dump emergency dept map wards', async ({ page, context }) => {
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

  const clicked = await clickAny(app, "//li[normalize-space()='Emergency Department'] | //span[@class='T_PL' and normalize-space()='Emergency Department']");
  log('clicked Emergency Department=' + clicked);
  await app.waitForTimeout(8000);

  // Dump ward-name spans + nearby checkbox/img structure
  for (const fr of app.frames()) {
    const res = await fr.evaluate(() => {
      const genXpath = (el: Element): string => { const parts: string[] = []; let n: Element | null = el; while (n && n.nodeType === 1 && parts.length < 6) { let i = 1, s = n.previousElementSibling; while (s) { if (s.nodeName === n.nodeName) i++; s = s.previousElementSibling; } parts.unshift(`${n.nodeName.toLowerCase()}[${i}]`); n = n.parentElement; } return '/' + parts.join('/'); };
      // Find spans that look like ward names (Emergency/Majors/Minors/Resus/Ward)
      const wardSpans = Array.from(document.querySelectorAll('span')).filter((s: any) => /emergency|majors|minors|resus|ward|paediatric|cdu|ambulatory/i.test((s.textContent||'').trim()) && (s.textContent||'').trim().length < 40).map((s: any) => {
        const row = s.closest('tr');
        const cb = row ? row.querySelector("td[imgtype='CheckBox'] img, img[title*='Check'], img[title*='select']") : null;
        return { text: (s.textContent||'').trim(), cls: s.className, hasRow: !!row, rowHasCheckbox: !!cb, cbTitle: cb ? cb.getAttribute('title') : null, cbImgtype: cb && cb.closest('td') ? cb.closest('td').getAttribute('imgtype') : null };
      }).slice(0, 12);
      // Also sample any td[imgtype] present
      const imgtypes = Array.from(document.querySelectorAll('td[imgtype]')).map((t:any)=>t.getAttribute('imgtype')).slice(0,5);
      return (wardSpans.length || imgtypes.length) ? { frame: (location.href||'').slice(-45), wardSpans, imgtypesSample: [...new Set(imgtypes)] } : null;
    }).catch(() => null);
    if (res) log('WARDS ' + JSON.stringify(res, null, 1));
  }
  fs.writeFileSync('debug-deptmap-dump.txt', out.join('\n'), 'utf-8');
});
