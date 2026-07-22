import { test } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

// Debug: log in via the framework's proven flow (channel msedge), open the
// "My work" task pane, and dump the DOM around the "Inpatient" item so we can
// fix pageHome.lnkTaskPaneMyWork consciously (6-test regression cluster).
test('dump My Work Inpatient pane', async ({ page, context }) => {
  test.setTimeout(180000);
  const URL = process.env.URL || process.env.APP_URL || '';
  const USER = process.env._USERNAME || '996289289229';
  const PASS = process.env._PASSWORD || 'Solut!0n';
  const out: string[] = [];
  const log = (s: string) => { out.push(s); console.log(s); };

  log(`goto ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Login (classic Lorenzo login page: #UserName / #Password / #btnSubmit)
  try {
    await page.fill('#UserName', USER, { timeout: 15000 });
    await page.fill('#Password', PASS);
    await page.click('#btnSubmit');
    log('submitted classic login');
  } catch (e) {
    log('classic login not found, trying OIDC form: ' + String(e).slice(0, 80));
    try {
      await page.getByRole('textbox', { name: 'Username' }).fill(USER);
      await page.getByRole('textbox', { name: 'Password' }).fill(PASS);
      await page.getByRole('button', { name: 'Login' }).click();
      log('submitted OIDC login');
    } catch (e2) { log('OIDC login failed: ' + String(e2).slice(0, 80)); }
  }

  // Wait for LORENZO main app to appear (may be this page or a new window)
  log('waiting for LORENZO app window...');
  let app = page;
  for (let attempt = 0; attempt < 30; attempt++) {
    await page.waitForTimeout(4000);
    const pages = context.pages();
    for (const p of pages) {
      let t = '', u = '';
      try { t = await p.title(); u = p.url(); } catch { continue; }
      if (/APPMAINPAGE/i.test(u) || (/LORENZO/i.test(t) && !/ID Portal/i.test(t))) { app = p; }
    }
    const at = await app.title().catch(() => '');
    const au = app.url();
    log(`  attempt ${attempt}: pages=${pages.length} app.title="${at}" app.url=${au.slice(0, 70)}`);
    if (/APPMAINPAGE/i.test(au)) { log('LORENZO main found'); break; }
  }

  await app.waitForTimeout(3000);
  await app.bringToFront().catch(() => {});

  // Click the My Work tab
  try {
    await app.click("//td[@title='My work']", { timeout: 20000 });
    log('clicked My work tab');
  } catch (e) { log('My work tab click failed: ' + String(e).slice(0, 100)); }
  await app.waitForTimeout(4000);

  // Dump every element whose text mentions Inpatient, plus My work pane containers
  const dump = await app.evaluate(() => {
    const genXpath = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node.nodeType === 1 && parts.length < 8) {
        let idx = 1; let sib = node.previousElementSibling;
        while (sib) { if (sib.nodeName === node.nodeName) idx++; sib = sib.previousElementSibling; }
        parts.unshift(`${node.nodeName.toLowerCase()}[${idx}]`);
        node = node.parentElement;
      }
      return '/' + parts.join('/');
    };
    const results: any = { inpatient: [], panes: [], myworkContainers: [] };
    document.querySelectorAll('*').forEach((el) => {
      const txt = (el.textContent || '').trim();
      const own = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      if (own === 'Inpatient') {
        results.inpatient.push({
          tag: el.tagName, id: (el as HTMLElement).id, cls: (el as HTMLElement).className,
          title: el.getAttribute('title'), atei: el.getAttribute('atei'),
          parentTag: el.parentElement?.tagName, parentTitle: el.parentElement?.getAttribute('title'),
          xpath: genXpath(el), outer: el.outerHTML.slice(0, 200),
        });
      }
    });
    document.querySelectorAll('[atei]').forEach((el) => {
      results.panes.push({ tag: el.tagName, atei: el.getAttribute('atei'), id: (el as HTMLElement).id, visible: (el as HTMLElement).offsetParent !== null });
    });
    document.querySelectorAll("[title*='My work'],[title*='My Work'],[atei*='My work']").forEach((el) => {
      results.myworkContainers.push({ tag: el.tagName, title: el.getAttribute('title'), atei: el.getAttribute('atei'), id: (el as HTMLElement).id, html: el.outerHTML.slice(0, 300) });
    });
    return results;
  }).catch((e) => ({ error: String(e) }));

  log('\n=== DUMP ===\n' + JSON.stringify(dump, null, 2));
  fs.writeFileSync('debug-inpatient-dump.txt', out.join('\n'), 'utf-8');
});
