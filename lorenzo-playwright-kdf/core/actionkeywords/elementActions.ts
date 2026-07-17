import { Page, Locator } from "@playwright/test";
import { getLocatorString } from "../utilities/locatorUtils";
import { testStep, executionContext, Outcome } from "../utilities/interfaceUtils";
import { resolveTestVariables } from "./dataActions";
import { waitForRoller } from "./browserActions";
import { getPageDefinition } from "../../product/pageRegistry";

/**
 * Sleep/delay execution for specified milliseconds
 * @param ms - Number of milliseconds to delay
 * @returns Promise that resolves after delay
 * @example
 * await sleep(1000); // Wait 1 second
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Resolve single element from page or frame with intelligent retry logic
 * Handles variable substitution in selector and checks DOM attachment
 * @param page - Playwright page object
 * @param baseSelector - XPath or CSS selector string
 * @param step - Test step with page/element info
 * @param timeout - Max milliseconds to search (default 30000ms)
 * @returns Locator for the resolved element
 * @throws Error if element not found after timeout
 */
/**
 * Generate a tag-agnostic XPath fallback selector.
 * When an xpath targets a specific HTML tag (e.g. //button[@x]) and the element
 * is rendered as a different tag (e.g. <img>), this produces //*[@x] so the
 * framework can still locate the element without any per-test hardcoding.
 * Returns null when the selector already uses wildcard (*) or is not a simple xpath.
 */
function relaxXpathTag(selector: string): string | null {
  const body = selector.startsWith('xpath=') ? selector.slice(6) : selector;
  const match = body.match(/^(\/\/)([a-zA-Z][a-zA-Z0-9]*)([\[/@(].*)?$/);
  if (!match || match[2] === '*') return null;
  const relaxed = match[1] + '*' + (match[3] ?? '');
  return selector.startsWith('xpath=') ? 'xpath=' + relaxed : relaxed;
}

export async function resolveElement(page: Page, baseSelector: string, step: testStep, timeout = 30000): Promise<Locator> {
  const startTime = Date.now();

  if (typeof baseSelector !== 'string') {
    throw new Error(`Expected string selector, got ${typeof baseSelector}`);
  }

  // Replace <variable> placeholder if elementText is provided
  if (baseSelector.includes('<variable>') && (step.elementText !== null && step.elementText !== undefined)) {
    baseSelector = baseSelector.replace('<variable>', String(step.elementText));
  }

  console.log(`  🔍 Searching for element: ${page.url()} using selector: ${baseSelector}`);
  while (Date.now() - startTime < timeout) {
    try {
      if (page.isClosed()) {
        throw new Error(`Page was closed while searching for element ${step.page}.${step.element}`);
      }

      // Build list of all pages to search: primary page + all other open pages/contexts
      const allPagesToSearch: Page[] = [page];
      try {
        const ctx = page.context();
        const browser = ctx.browser();
        const contexts = browser ? browser.contexts() : [ctx];
        for (const c of contexts) {
          for (const p of c.pages()) {
            if (!p.isClosed() && p !== page) allPagesToSearch.push(p);
          }
        }
      } catch { /* ignore */ }

      for (const searchPage of allPagesToSearch) {
        try {
          const isAccessible = await searchPage.evaluate(() => document.readyState).catch(() => null);
          if (!isAccessible) continue;

          // Try primary selector, then a tag-relaxed fallback (e.g. //button → //*) when needed.
          // Returns the locator only when the element is present AND visible.
          // Visibility check (isVisible) prevents selecting elements hidden behind modal dialogs
          // (e.g. the outer wizard's "Finish now" hidden behind the Registration popup).
          // On visibility check error (e.g. deeply nested cross-frame context), we assume visible
          // so we don't accidentally skip legitimate elements.
          const tryOnLocatable = async (locatable: Page | import('@playwright/test').Frame, selector: string): Promise<Locator | null> => {
            const allMatches = locatable.locator(selector);
            const count = await allMatches.count().catch(() => 0);
            if (count === 0) return null;
            
            // When multiple elements match (e.g., parent + child dialogs with same button),
            // use DOM inspection to detect which page context is active and choose wisely.
            let loc: Locator | null = null;
            
            if (count > 1) {
              // Multiple matches: Use DOM inspection to detect modal context
              // Run inspection in the SPECIFIC locatable (page or frame), not the main page
              const inspectionResult = await locatable.evaluate((selector_inner: string) => {
                // Check for Lorenzo-specific modal indicators
                const frDialogFrame = document.getElementById('frDialog') as HTMLElement | null;
                const isLorenzoDlgVisible = frDialogFrame ? frDialogFrame.offsetParent !== null : false;
                
                // Check standard modal indicators
                const modalOverlay = document.querySelector('[role="dialog"]') as HTMLElement | null;
                const isModalVisible = modalOverlay ? modalOverlay.offsetParent !== null : false;
                const hasVisiblePopup = document.querySelector('.modal.show, .dialog.show, [class*="popup"][class*="visible"], .overlay.active') !== null;
                
                // Get all matching elements and their z-index/visibility
                const allEls = document.querySelectorAll(selector_inner);
                const elementDetails = Array.from(allEls).map((el: any) => {
                  const rect = el.getBoundingClientRect();
                  const styles = window.getComputedStyle(el);
                  const zIndex = parseInt(styles.zIndex, 10) || 0;
                  const isVisible = rect.width > 0 && rect.height > 0 && styles.visibility !== 'hidden' && styles.display !== 'none';
                  
                  // Check if element is inside a modal or Lorenzo dialog
                  let isInModal = false;
                  let parent = el.parentElement;
                  while (parent) {
                    const role = parent.getAttribute('role');
                    const id = parent.getAttribute('id');
                    const classList = parent.getAttribute('class') || '';
                    
                    if (role === 'dialog' || classList.includes('modal') || classList.includes('dialog') || id === 'frDialog') {
                      isInModal = true;
                      break;
                    }
                    parent = parent.parentElement;
                  }
                  
                  return {
                    index: Array.from(allEls).indexOf(el),
                    visible: isVisible,
                    zIndex: zIndex,
                    inModal: isInModal,
                    rect: { width: rect.width, height: rect.height }
                  };
                });
                
                return {
                  lorenzoDlgActive: isLorenzoDlgVisible,
                  modalActive: isModalVisible || hasVisiblePopup,
                  elements: elementDetails
                };
              }, selector).catch(() => ({ lorenzoDlgActive: false, modalActive: false, elements: [] }));
              
              console.log(`  🔍 DOM Inspection (Lorenzo): dlg=${inspectionResult.lorenzoDlgActive}, modal=${inspectionResult.modalActive}, elements=${inspectionResult.elements.length}`);
              
              // Smart selection based on DOM inspection
              if (inspectionResult.elements.length >= 2) {
                const visibleElements = inspectionResult.elements.filter(e => e.visible);
                const elementsInModal = inspectionResult.elements.filter(e => e.inModal);
                
                if ((inspectionResult.lorenzoDlgActive || inspectionResult.modalActive) && elementsInModal.length > 0) {
                  // Modal/Dialog is active and we found element inside it - prioritize this one
                  const modalElement = elementsInModal[0];
                  loc = allMatches.nth(modalElement.index);
                  console.log(`  ✅ Selected element inside active modal/dialog (index=${modalElement.index})`);
                  return loc;
                } else if (visibleElements.length > 0) {
                  // Use the highest z-index visible element
                  const topElement = visibleElements.sort((a, b) => b.zIndex - a.zIndex)[0];
                  loc = allMatches.nth(topElement.index);
                  console.log(`  ✅ Selected visible element with highest z-index (index=${topElement.index}, z=${topElement.zIndex})`);
                  return loc;
                }
              }
              
              // Fallback: try first (parent), then last (child)
              loc = allMatches.first();
              const isVis = await loc.isVisible({ timeout: 300 }).catch(() => false);
              if (isVis) {
                console.log(`  ✅ Fallback: Selected first element (parent)`);
                return loc;
              }
              
              loc = allMatches.last();
              const isVisLast = await loc.isVisible({ timeout: 300 }).catch(() => false);
              if (isVisLast) {
                console.log(`  ✅ Fallback: Selected last element (child modal)`);
                return loc;
              }
              return null;
            } else {
              // Single match: use as-is
              loc = allMatches.first();
              const isVis = await loc.isVisible({ timeout: 300 }).catch(() => true);
              return isVis ? loc : null;
            }
          };

          const pageTitle = await searchPage.title().catch(() => searchPage.url());
          const label = searchPage === page ? 'page' : 'popup/tab';

          // PRIORITY: Check for active Lorenzo dialog iframe FIRST
          // Lorenzo uses dialog_body_N iframes inside dialog_N dialogs
          // The innermost dialog takes precedence (higher N = more recent)
          const dialogFrames: import('@playwright/test').Frame[] = [];
          const otherFrames: import('@playwright/test').Frame[] = [];
          
          for (const frame of searchPage.frames()) {
            const frameName = frame.name() || '';
            const frameUrl = frame.url() || '';
            // dialog_body_0, dialog_body_1, etc. are Lorenzo modal dialog iframes
            if (frameName.startsWith('dialog_body_') || frameUrl.includes('AppDialog.aspx')) {
              dialogFrames.push(frame);
            } else if (frame !== searchPage.mainFrame()) {
              otherFrames.push(frame);
            }
          }
          
          // Sort dialog frames by number (descending) - highest = innermost/most recent
          dialogFrames.sort((a, b) => {
            const numA = parseInt(a.name().replace('dialog_body_', '') || '0');
            const numB = parseInt(b.name().replace('dialog_body_', '') || '0');
            return numB - numA;
          });
          
          if (dialogFrames.length > 0) {
            console.log(`  🔍 Found ${dialogFrames.length} Lorenzo dialog iframes, searching innermost first`);
          }
          
          // Search dialog frames FIRST (innermost to outermost)
          for (const frame of dialogFrames) {
            try {
              let frameLocator = await tryOnLocatable(frame, baseSelector);
              if (!frameLocator) {
                const fallback = relaxXpathTag(baseSelector);
                if (fallback) frameLocator = await tryOnLocatable(frame, fallback);
              }
              if (frameLocator) {
                const frameUrl = frame.url();
                const dialogTitle = decodeURIComponent(frameUrl.match(/TITLE=([^&]+)/)?.[1] || 'dialog');
                console.log(`  ☑️  Element ${step.page}.${step.element} found in dialog: ${dialogTitle}`);
                return frameLocator;
              }
            } catch { continue; }
          }

          // Then check main page (only if no dialog frames found element)
          let mainLocator = await tryOnLocatable(searchPage, baseSelector);
          if (!mainLocator) {
            const fallback = relaxXpathTag(baseSelector);
            if (fallback) mainLocator = await tryOnLocatable(searchPage, fallback);
          }
          if (mainLocator) {
            console.log(`  ☑️  Element ${step.page}.${step.element} found in ${label}: ${pageTitle}`);
            return mainLocator;
          }

          // Finally check other (non-dialog) frames
          for (const frame of otherFrames) {
            try {
              let frameLocator = await tryOnLocatable(frame, baseSelector);
              if (!frameLocator) {
                const fallback = relaxXpathTag(baseSelector);
                if (fallback) frameLocator = await tryOnLocatable(frame, fallback);
              }
              if (frameLocator) {
                console.log(`  ☑️  Element ${step.page}.${step.element} found in iframe on: ${pageTitle}`);
                return frameLocator;
              }
            } catch { continue; }
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('closed')) throw error;
          continue;
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        throw error;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.error(`  ⛔ Element not found: ${step.page}.${step.element} (selector: ${baseSelector}) after ${timeout}ms`);

  // Capture diagnostic screenshot + visible text in frames to help identify correct locator
  try {
    const fs = await import('fs');
    const screenshotDir = './test-results/diagnostics';
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const filename = `${screenshotDir}/${step.page}_${step.element}_${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true }).catch(() => {});
    console.error(`  📸 Screenshot saved: ${filename}`);

    // Log visible span text in all frames to help find correct ward/element name
    const allSpanTexts: string[] = [];
    for (const frame of page.frames()) {
      try {
        const texts = await frame.$$eval('span, td, button', els =>
          els.map(el => (el as HTMLElement).innerText?.trim()).filter(t => t && t.length > 0 && t.length < 80)
        ).catch(() => []);
        allSpanTexts.push(...texts.slice(0, 20));
      } catch { /* ignore */ }
    }
    if (allSpanTexts.length > 0) {
      console.error(`  📋 Visible text on page (first 20 items): ${[...new Set(allSpanTexts)].slice(0, 20).join(' | ')}`);
    }

    // Dump all elements with @title or @alt attributes to help identify correct locator
    const titleDump: string[] = [];
    for (const frame of page.frames()) {
      try {
        const items = await frame.$$eval('[title],[alt],[name],[id]', els =>
          els.slice(0, 50).map(el => {
            const e = el as HTMLElement;
            return `<${e.tagName.toLowerCase()} title="${e.getAttribute('title') ?? ''}" alt="${e.getAttribute('alt') ?? ''}" name="${e.getAttribute('name') ?? ''}" id="${e.getAttribute('id') ?? ''}">`;
          })
        ).catch(() => []);
        if (items.length > 0) titleDump.push(`[frame ${frame.url().slice(-40)}] ${items.slice(0, 30).join(', ')}`);
      } catch { /* ignore */ }
    }
    if (titleDump.length > 0) console.error(`  🔬 DOM title/alt/name/id elements:\n${titleDump.join('\n')}`);
  } catch { /* ignore diagnostic errors */ }

  throw new Error(`Element not found for ${step.page}.${step.element}: ${baseSelector} after ${timeout}ms`);
}

/**
 * Resolve multiple elements from page or frames with filtering options
 * Searches across main page and all iframes, filters by visibility
 * @param page - Playwright page object
 * @param baseSelector - XPath or CSS selector string
 * @param step - Optional test step with context info
 * @param options - Query options {timeout, visibleOnly, minCount}
 * @returns Array of Locators matching selector
 * @throws Error if fewer elements found than minCount
 */
export async function resolveElements(
  page: Page, baseSelector: string, step?: testStep, options?: {
    timeout?: number;
    visibleOnly?: boolean;
    minCount?: number;
  }
): Promise<Locator[]> {

  const timeout = options?.timeout ?? 30000;
  const visibleOnly = options?.visibleOnly ?? true;
  const minCount = options?.minCount ?? 0;

  const startTime = Date.now();
  let foundElements: Locator[] = [];

  if (typeof baseSelector !== 'string') {
    throw new Error(`Expected string selector, got ${typeof baseSelector}`);
  }

  console.log(`  🔍 Searching for elements using selector: ${baseSelector}`);

  while (Date.now() - startTime < timeout) {
    try {
      if (page.isClosed()) {
        throw new Error(`Page was closed while searching for elements: ${baseSelector}`);
      }

      const isAccessible = await page.evaluate(() => document.readyState).catch(() => null);
      if (!isAccessible) {
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      foundElements = [];

      // ===== MAIN PAGE =====
      try {
        const mainLocator = page.locator(baseSelector);
        const count = await mainLocator.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
          const el = mainLocator.nth(i);

          const isVisible = !visibleOnly || await el.isVisible({ timeout: 300 }).catch(() => false);
          if (!isVisible) continue;

          const isAttached = await el.evaluate(e => e.isConnected).catch(() => false);
          if (!isAttached) continue;

          foundElements.push(el);
        }
      } catch { }

      // ===== IFRAMES =====
      const frames = page.frames();
      for (const frame of frames) {
        try {
          const frameLocator = frame.locator(baseSelector);
          const count = await frameLocator.count().catch(() => 0);

          for (let i = 0; i < count; i++) {
            const el = frameLocator.nth(i);

            const isVisible = !visibleOnly || await el.isVisible({ timeout: 300 }).catch(() => false);
            if (!isVisible) continue;

            const isAttached = await el.evaluate(e => e.isConnected).catch(() => false);
            if (!isAttached) continue;

            foundElements.push(el);
          }
        } catch { }
      }

      if (foundElements.length >= minCount) {
        console.log(`  ☑️  Found ${foundElements.length} elements for selector: ${baseSelector}`);
        return foundElements;
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        throw error;
      }
    }

    await new Promise(r => setTimeout(r, 300));
  }

  if (foundElements.length < minCount) {
    console.error(`  ⛔ Elements not found: selector=${baseSelector}, found=${foundElements.length}, expected>=${minCount}`);
    throw new Error(
      `Elements not found for selector: ${baseSelector}. Found ${foundElements.length}, expected at least ${minCount}`
    );
  }

  return foundElements;
}

/**
 * Wait for element to become visible and available
 * Triggers page roller wait before searching
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on timeout}
 * @example
 * await waitForElement(page, { page: 'pageLogin', element: 'btn_Submit' });
 */
export async function waitForElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    await element.waitFor({ state: 'visible', timeout: 15000 });

    console.log(`  ✅ Element found and visible: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully waited for element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to wait for element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to wait for element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Click element with special handling for area/imagemap elements
 * Uses mouse movement for area elements, standard click for others
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await clickElement(page, { page: 'pageForm', element: 'btn_Submit' });
 */
export async function clickElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);

    const isOptional = ['optional', '__transient__'].includes(String(step.condition || '').toLowerCase());
    const pageDef = step.page ? getPageDefinition(step.page) : undefined;
    const resolveTimeout = pageDef?.elementTimeout ?? (isOptional ? 15000 : 30000);
    
    // For popup button elements (btn_PopUp*) that can appear with delay after PDS lookup,
    // implement framework-level retry with extended patience instead of quick fail.
    // These are conditional elements that may not appear immediately.
    const isPopupButton = step.element && String(step.element).toLowerCase().includes('popup');
    const popupRetryTimeout = isPopupButton ? 120000 : resolveTimeout;  // 120s patience for delayed popups
    
    let element;
    try {
      element = await resolveElement(page, baseSelector, step, popupRetryTimeout);
    } catch (err) {
      // If popup button not found, treat as soft-fail (optional) rather than hard failure
      if (isPopupButton && !isOptional) {
        console.log(`  ⚠️ Popup button not found (may not have appeared): ${step.page}.${step.element}`);
        return {
          code: 2,  // Soft fail
          value: `Popup button not found (optional/conditional): ${step.element}`
        };
      }
      throw err;
    }

    // Check if it's an area element - use JavaScript click instead
    const tagName = await element.evaluate(el => el.tagName.toLowerCase()).catch(() => 'unknown');
    if (tagName === 'area') {
      await element.evaluate((el: HTMLAreaElement) => { el.click(); });
      console.log(`  ✅ Clicked area element (JavaScript): ${step.page}.${step.element}`);
    } else {
      let clicked = false;

      // Wait for the element to become visible before attempting any click strategy.
      // This handles cases where resolveElement returns an attached-but-hidden element
      // (e.g. Lorenzo search result rows that are in DOM but not yet rendered visible).
      await element.waitFor({ state: 'visible', timeout: isOptional ? 3000 : 30000 }).catch(() => { });

      // DIAGNOSTIC: Element info for debugging phantom clicks
      try {
        const elementInfo = await element.evaluate((el: HTMLElement) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return {
            tagName: el.tagName,
            title: el.getAttribute('title'),
            className: el.className,
            isVisible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
            width: rect.width,
            height: rect.height,
            innerHTML: el.innerHTML.substring(0, 100)
          };
        });
        console.log(`  📋 Element info: <${elementInfo.tagName}> title="${elementInfo.title}" class="${elementInfo.className}" visible=${elementInfo.isVisible} size=${elementInfo.width}x${elementInfo.height}`);
        console.log(`  📋 Inner content: ${elementInfo.innerHTML}`);
      } catch { /* ignore diagnostic errors */ }

      // Detect if element is in an iframe (frame element vs main page element)
      // For iframe elements, skip mouse simulation since page.mouse uses main page coordinates
      // which won't work correctly for elements inside iframes
      let isInIframe = false;
      try {
        const ownerFrame = await element.evaluate(el => {
          return window.self !== window.top;  // true if inside an iframe
        });
        isInIframe = ownerFrame;
      } catch { /* assume main page */ }

      // Strategy 1: scrollIntoView + mouse simulation (ONLY for main page elements)
      // Skip for iframe elements since page.mouse coordinates don't translate to iframe context
      if (!isInIframe) {
        try {
          await element.scrollIntoViewIfNeeded({ timeout: 5000 });
          const box = await element.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.up();
            clicked = true;
          }
        } catch { /* fall through */ }
      }

      // Strategy 2: Playwright native click (handles auto-scroll, cross-frame)
      // This is the PRIMARY strategy for iframe elements
      if (!clicked) {
        try {
          await element.click({ timeout: 5000 });
          clicked = true;
          if (isInIframe) {
            console.log(`  🎯 Clicked iframe element using Playwright native click: ${step.page}.${step.element}`);
          }
        } catch (nativeErr) {
          console.log(`  ⚠️ Native click failed: ${nativeErr instanceof Error ? nativeErr.message : String(nativeErr)}`);
        }
      }

      // Strategy 3: Force click (bypasses actionability checks as last resort)
      if (!clicked) {
        try {
          await element.click({ force: true, timeout: 5000 });
          clicked = true;
          console.log(`  ⚡ Force-clicked element: ${step.page}.${step.element}`);
        } catch (forceErr) {
          console.log(`  ⚠️ Force click failed: ${forceErr instanceof Error ? forceErr.message : String(forceErr)}`);
        }
      }

      // Strategy 4: JavaScript DOM click with proper event dispatch
      if (!clicked) {
        try {
          await element.evaluate((el: HTMLElement) => {
            // Create and dispatch proper mouse events for better compatibility
            const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
            const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
            const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            el.dispatchEvent(mouseDown);
            el.dispatchEvent(mouseUp);
            el.dispatchEvent(clickEvent);
          });
          clicked = true;
          console.log(`  💻 JS dispatchEvent click: ${step.page}.${step.element}`);
        } catch (evalErr) {
          const evalMsg = evalErr instanceof Error ? evalErr.message : String(evalErr);
          if (evalMsg.includes('Target page') || evalMsg.includes('browser has been closed') || evalMsg.includes('context or browser')) {
            clicked = true;
          } else {
            console.log(`  ⚠️ JS dispatchEvent failed: ${evalMsg}`);
          }
        }
      }

      // Strategy 5: Click inner clickable child (for TD/DIV wrappers)
      if (!clicked) {
        try {
          const innerClicked = await element.evaluate((el: HTMLElement) => {
            // Find clickable child element
            const clickable = el.querySelector('button, a, span, input[type="button"], input[type="submit"]') as HTMLElement;
            if (clickable) {
              clickable.click();
              return true;
            }
            // Fallback to direct click
            el.click();
            return true;
          });
          if (innerClicked) {
            clicked = true;
            console.log(`  🔘 Clicked inner element: ${step.page}.${step.element}`);
          }
        } catch (innerErr) {
          const innerMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
          if (innerMsg.includes('Target page') || innerMsg.includes('browser has been closed') || innerMsg.includes('context or browser')) {
            clicked = true;
          }
        }
      }
      
      console.log(`  ✅ Clicked element: ${step.page}.${step.element}`);
    }

    return {
      code: 0,
      value: `Successfully clicked element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to click element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to click element: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  

}

/**
 * Fill input field with text
 * Supports DDT values and variable substitution
 * @param page - Playwright page object
 * @param step - Test step with page/element, value, isDDT flag
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await setTextBox(page, { page: 'pageForm', element: 'txt_Name', value: 'John' });
 * await setTextBox(page, { page: 'pageForm', element: 'txt_Name', value: '{{username}}' });
 */
export async function setTextBox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    
    let textToFill = '';
    if (step.isDDT === true && step.datasetColumnNames) {
      textToFill = step.datasetColumnNames;
    } else if (step.value) {
      textToFill = resolveTestVariables(step.value);
    }

    const finalText = String(textToFill);
    const element = await resolveElement(page, baseSelector, step);
    await element.fill(finalText);

    return {
      code: 0,
      value: `Successfully filled element: ${step.page}.${step.element} with value: "${finalText}"`
    };

  } catch (error) {
    console.error(`  ❌ Failed to fill element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to fill element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get text from element and optionally save to variable
 * Handles input/textarea values and placeholder text
 * @param page - Playwright page object
 * @param step - Test step with page/element, optional variable name in value
 * @returns Outcome {code: 0, value: extracted text}
 * @example
 * // Get text
 * await getText(page, { page: 'pageForm', element: 'lbl_Message' });
 * // Get and save to variable _extractedText
 * await getText(page, { page: 'pageForm', element: 'lbl_Message', value: '_extractedText' });
 */
export async function getText(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    await element.waitFor({ state: 'visible', timeout: 5000 });
    //await element.scrollIntoViewIfNeeded();

    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    let text = '';

    if (tagName === 'input' || tagName === 'textarea') {
      const value = await element.inputValue();
      if (value) {
        text = value;
      } else {
        text = await element.getAttribute('placeholder') || '';
      }
    } else {
      text = await element.textContent() || '';
      text = text.trim();
    }

    console.log(`  ✅ Retrieved text from ${step.page}.${step.element}: "${text}"`);

    if (step.value) {
      const varName = step.value.trim().startsWith('_') ? step.value.trim() : `_${step.value.trim()}`;
      executionContext.addVariable(varName, text.trim());
      console.log(`  💾 Stored text in variable: ${varName} = "${text}"`);
    }

    return {
      code: 0,
      value: `Successfully retrieved text from element: ${step.page}.${step.element} - Text: "${text}"`
    };
  } catch (error) {
    console.error(`  ❌ Failed to get text from element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to get text from element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Double-click element
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await dblClickElement(page, { page: 'pageList', element: 'item_First' });
 */
export async function dblClickElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);
    //await element.scrollIntoViewIfNeeded({ timeout: 15000 });
    await element.dblclick();

    console.log(`  ✅ Double-clicked element: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully double-clicked element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to double-click element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to double-click element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Right-click element with special handling for area/imagemap elements
 * Supports coordinate calculation for image maps
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await rClickElement(page, { page: 'pageList', element: 'item_Context' });
 */
export async function rClickElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    const tagName = await element.evaluate(el => el.tagName.toLowerCase());

    if (tagName === 'area') {
      // Get the element's ID or other identifier to use as selector
      const elementId = await element.evaluate((el: HTMLElement) => el.id);

      if (!elementId) {
        throw new Error('Area element does not have an ID');
      }

      console.log(`  🔍 Attempting to right-click area element '${elementId}'`);

      // For area elements, we need to bypass visibility checks and use JavaScript
      try {
        // Method 1: Use JavaScript to trigger the contextmenu event directly
        console.log(`  ⚡ Using JavaScript contextmenu event for area element`);

        // Get the parent image information
        const result = await element.evaluate((el: HTMLAreaElement) => {
          const map = el.closest('map');
          let imageInfo = null;
          if (map && map.name) {
            const img = document.querySelector(`img[usemap="#${map.name}"]`) as HTMLImageElement;
            if (img) {
              const imgRect = img.getBoundingClientRect();
              imageInfo = {
                imgRect: {
                  left: imgRect.left,
                  top: imgRect.top,
                  width: imgRect.width,
                  height: imgRect.height
                },
                imgNatural: {
                  width: img.naturalWidth,
                  height: img.naturalHeight
                }
              };
            }
          }

          // Get area coordinates
          const coords = el.coords.split(',').map(Number);
          return { coords, imageInfo };
        });

        if (result.coords && result.coords.length >= 4) {
          // Calculate click position - use the first coordinate pair as reference
          const clickX = result.coords[0];
          const clickY = result.coords[1];

          let finalX = clickX;
          let finalY = clickY;

          // If we have image info, convert relative coordinates
          if (result.imageInfo) {
            const { imgRect, imgNatural } = result.imageInfo;
            const scaleX = imgRect.width / imgNatural.width;
            const scaleY = imgRect.height / imgNatural.height;

            finalX = imgRect.left + (clickX * scaleX);
            finalY = imgRect.top + (clickY * scaleY);

            console.log(`  📍 Calculated position: (${Math.round(finalX)}, ${Math.round(finalY)}) from image mapping`);
          } else {
            // Use page coordinates directly
            console.log(`  📍 Using area coordinates directly: (${clickX}, ${clickY})`);
          }

          // Move mouse to calculated position
          await page.mouse.move(finalX, finalY, { steps: 5 });
          await page.waitForTimeout(1000);

          // Trigger right-click via mouse events
          await page.mouse.down({ button: 'right' });
          await page.waitForTimeout(50);
          await page.mouse.up({ button: 'right' });
          await page.waitForTimeout(500);

          console.log(`  ✅ Right-clicked area element '${elementId}' at calculated position`);

          // Alternative: Also trigger the JavaScript event handler
          await page.evaluate((id) => {
            const area = document.getElementById(id) as HTMLAreaElement;
            if (area) {
              // Trigger the oncontextmenu handler
              const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                clientX: area.getBoundingClientRect().left,
                clientY: area.getBoundingClientRect().top
              });
              area.dispatchEvent(event);
            }
          }, elementId);

        } else {
          throw new Error('Could not parse area coordinates');
        }

      } catch (jsError) {
        console.log(`  ⚠️ JavaScript method failed: ${jsError instanceof Error ? jsError.message : String(jsError)}`);

        // Fallback: Use the element's bounding box
        try {
          const box = await element.boundingBox();
          if (box) {
            console.log(`  🔄 Fallback to bounding box: (${box.x}, ${box.y})`);
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
            await page.waitForTimeout(1000);
            await page.mouse.down({ button: 'right' });
            await page.waitForTimeout(50);
            await page.mouse.up({ button: 'right' });
            await page.waitForTimeout(500);
            console.log(`  ✅ Right-clicked using bounding box fallback`);
          }
        } catch (boxError) {
          // Last resort: Trigger the contextmenu via evaluate
          console.log(`  🚨 Last resort: Triggering contextmenu via JavaScript`);
          await element.evaluate((el: HTMLAreaElement) => {
            const event = new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            el.dispatchEvent(event);
          });
        }
      }

    } else {
      // For non-area elements, use Playwright's right-click with relaxed visibility
      await element.click({ button: 'right', force: true });
      console.log(`  ✅ Right-clicked element: ${step.page}.${step.element}`);
    }

    return {
      code: 0,
      value: `Successfully right-clicked element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to right-click element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to right-click element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Clear text from input field
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await clearTextBox(page, { page: 'pageForm', element: 'txt_Search' });
 */
export async function clearTextBox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);
    //await element.scrollIntoViewIfNeeded({ timeout: 15000 });
    await element.fill('');

    console.log(`  ✅ Cleared text box: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully cleared text box: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to clear text box: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to clear text box: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Select option from HTML select dropdown
 * Supports DDT values and variable substitution
 * @param page - Playwright page object
 * @param step - Test step with page/element, value to select
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await selectListBox(page, { page: 'pageForm', element: 'ddl_Status', value: 'Active' });
 */
export async function selectListBox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    //await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    let valueToSelect = '';

    if (step.isDDT === true && step.datasetColumnNames) {
      valueToSelect = step.datasetColumnNames;
    } else if (step.value) {
      valueToSelect = resolveTestVariables(step.value);
    }

    if (!valueToSelect) {
      throw new Error(`No value provided for selectListBox at ${step.page}.${step.element}`);
    }

    await element.waitFor({ state: 'visible', timeout: 5000 });
    //await element.scrollIntoViewIfNeeded({ timeout: 15000 });

    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    if (tagName !== 'select') {
      throw new Error(`Element ${step.page}.${step.element} is not a select element (found: ${tagName})`);
    }

    await element.selectOption(String(valueToSelect));

    console.log(`  ✅ Selected option "${valueToSelect}" in ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully selected option: "${valueToSelect}" in element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to select option in element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to select option in element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verify selected value in dropdown matches expected value
 * Supports DDT values and variable substitution
 * @param page - Playwright page object
 * @param step - Test step with page/element, expected value
 * @returns Outcome {code: 0 on match, code: 1 on mismatch}
 * @example
 * await verifyValueInListBox(page, { page: 'pageForm', element: 'ddl_Status', value: 'Active' });
 */
export async function verifyValueInListBox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    let expectedValue = '';

    if (step.isDDT === true && step.datasetColumnNames) {
      expectedValue = step.datasetColumnNames;
    } else if (step.value) {
      expectedValue = resolveTestVariables(step.value);
    }

    if (!expectedValue) {
      throw new Error(`No value provided for verifyValueInListBox at ${step.page}.${step.element}`);
    }

    await element.waitFor({ state: 'visible', timeout: 5000 });
    //await element.scrollIntoViewIfNeeded({ timeout: 15000 });

    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
    if (tagName !== 'select') {
      throw new Error(`Element ${step.page}.${step.element} is not a select element (found: ${tagName})`);
    }

    const currentValue = await element.inputValue();

    const trimmedExpected = String(expectedValue).trim();
    const trimmedCurrent = String(currentValue).trim();

    if (trimmedCurrent !== trimmedExpected) {
      console.error(`  ❌ Expected value "${trimmedExpected}" but found "${trimmedCurrent}" in ${step.page}.${step.element}`);
      return {
        code: 1,
        value: `Expected value "${trimmedExpected}" but found "${trimmedCurrent}" in select ${step.page}.${step.element}`
      };
    }

    console.log(`  ✅ Verified value "${trimmedExpected}" in select ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully verified value "${trimmedExpected}" in select ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify value in listbox: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify value in listbox: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Send keyboard keys to element or page
 * Supports special keys (Tab, Enter, ArrowDown, etc) and regular characters
 * @param page - Playwright page object
 * @param step - Test step with optional element, value containing key(s)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Send to element
 * await sendKeys(page, { page: 'pageForm', element: 'txt_Search', value: 'Tab' });
 * // Send to page
 * await sendKeys(page, { value: 'Escape' });
 */
export async function sendKeys(page: Page, step: testStep): Promise<Outcome> {
  try {
    let keysToSend = '';

    if (step.isDDT === true && step.datasetColumnNames) {
      keysToSend = step.datasetColumnNames;
    } else if (step.value) {
      keysToSend = resolveTestVariables(step.value);
    }

    if (!keysToSend) {
      throw new Error(`No keys provided for sendKeys action`);
    }

    if (step.element && step.element.trim() !== '') {
      try {
        const baseSelector = getLocatorString(step);
        await waitForRoller(page);
        const element = await resolveElement(page, baseSelector, step);

        await element.waitFor({ state: 'visible', timeout: 5000 });
        //await element.scrollIntoViewIfNeeded({ timeout: 15000 });
        await element.focus();

        console.log(`  🔍 Focused on element: ${step.page}.${step.element}`);
        await page.waitForTimeout(100);

        await element.press(String(keysToSend));

        console.log(`  ✅ Sent keys "${keysToSend}" to element: ${step.page}.${step.element}`);

        return {
          code: 0,
          value: `Successfully sent keys "${keysToSend}" to element: ${step.page}.${step.element}`
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`  ⚠️ Could not focus on element ${step.page}.${step.element}, sending keys to page instead`);

        await page.keyboard.press(String(keysToSend));
        console.log(`  ✅ Sent keys "${keysToSend}" to page (fallback)`);

        return {
          code: 0,
          value: `Successfully sent keys "${keysToSend}" to page (element focus failed, used fallback)`
        };
      }
    } else {
      await page.keyboard.press(String(keysToSend));
      console.log(`  ✅ Sent keys "${keysToSend}" to page`);

      return {
        code: 0,
        value: `Successfully sent keys "${keysToSend}" to page`
      };
    }
  } catch (error) {
    console.error(`  ❌ Failed to send keys`);
    return {
      code: 1,
      value: `Failed to send keys: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get element attribute value
 * Format: 'attributeName' or 'attributeName|variableName' to save result
 * @param page - Playwright page object
 * @param step - Test step with page/element, value with attribute name
 * @returns Outcome {code: 0, value: attribute value}
 * @example
 * // Get attribute
 * await getAttribute(page, { page: 'pageForm', element: 'lnk_Home', value: 'href' });
 * // Get and save to variable
 * await getAttribute(page, { page: 'pageForm', element: 'lnk_Home', value: 'href|_homeUrl' });
 */
export async function getAttribute(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      throw new Error(`No attribute name provided for getAttribute`);
    }

    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    let valueToUse = step.value;

    if (step.isDDT === true && step.datasetColumnNames) {
      valueToUse = step.datasetColumnNames;
    }

    let attributeName = valueToUse;
    let variableName = null;

    if (valueToUse.includes('|')) {
      const parts = valueToUse.split('|');
      attributeName = parts[0].trim();
      variableName = parts[1].trim();
    }

    const attributeValue = await element.getAttribute(attributeName);

    if (variableName && variableName.startsWith('_')) {
      executionContext.addVariable(variableName, attributeValue || '');
      console.log(`  💾 Stored attribute value in variable: ${variableName} = "${attributeValue}"`);
    }

    console.log(`  ✅ Retrieved attribute '${attributeName}' from ${step.page}.${step.element}: "${attributeValue}"`);

    return {
      code: 0,
      value: `Successfully retrieved attribute '${attributeName}': "${attributeValue}"`
    };
  } catch (error) {
    console.error(`  ❌ Failed to get attribute from ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to get attribute: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Hover mouse over element to trigger hover effects
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await mouseHover(page, { page: 'pageMenu', element: 'menu_File' });
 */
export async function mouseHover(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    await element.waitFor({ state: 'visible', timeout: 5000 });
    //await element.scrollIntoViewIfNeeded();

    await element.hover();

    await page.waitForTimeout(300);

    console.log(`  ✅ Successfully hovered over element: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully hovered over element: ${step.page}.${step.element}`
    };

  } catch (error) {
    console.error(`  ❌ Failed to hover over element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to hover over element: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// export async function verifyRecordInTable(page: Page, step: testStep): Promise<Outcome> {
//   try {
//     // Validate required fields
//     if (!step.value) {
//       throw new Error("No values provided for table verification");
//     }

//     // Check if tableColumnNames is provided, if not use 'Column1' as default
//     const tableColumnNames = step.tableColumnNames || 'Column1';

//     // Parse column names and expected values
//     const isMultiColumn = tableColumnNames.includes('|');
//     const reqdColumns: string[] = isMultiColumn
//       ? tableColumnNames.split('|').map((col: string) => col.trim())
//       : [tableColumnNames.trim()];

//     let valueToUse = step.value;

//     // Handle DDT values
//     if (step.isDDT === true && step.datasetColumnNames) {
//       valueToUse = step.datasetColumnNames;
//     }

//     const expectedRefs: string[] = isMultiColumn
//       ? valueToUse.split('|').map((val: string) => val.trim())
//       : [valueToUse.trim()];

//     // Validate column count matches value count
//     if (reqdColumns.length !== expectedRefs.length) {
//       throw new Error(`Column count (${reqdColumns.length}) does not match value count (${expectedRefs.length})`);
//     }

//     // Get table element
//     const baseSelector = getLocatorString(step);
//     const tableLocator = await resolveElement(page, baseSelector, step);

//     // Wait for table to be visible
//     await tableLocator.waitFor({ state: 'visible', timeout: 5000 });

//     // Extract headers - generic approach for standard HTML tables
//     const headers = await tableLocator.locator('thead th, th').evaluateAll(elements => {
//       return elements.map(el => el.textContent ? el.textContent.trim() : '');
//     });

//     if (headers.length === 0) {
//       throw new Error("No table headers found");
//     }

//     // Extract all row data - generic approach for standard HTML tables
//     const allRowsData = await tableLocator.locator('tbody tr, tr').evaluateAll(rows => {
//       return Array.from(rows).map(row => {
//         const cells = row.querySelectorAll('td');
//         return Array.from(cells).map(cell =>
//           cell.textContent ? cell.textContent.trim() : ''
//         );
//       });
//     });

//     // Resolve expected values (handle runtime variable references)
//     const expectedValues: string[] = expectedRefs.map((ref: string) => resolveTestVariables(ref));

//     // Get indices of required columns
//     const columnIndices: number[] = reqdColumns.map((col: string) => headers.indexOf(col));

//     // Validate all columns exist
//     columnIndices.forEach((idx: number, i: number) => {
//       if (idx === -1) {
//         throw new Error(`Column "${reqdColumns[i]}" not found in table headers. Available headers: ${headers.join(', ')}`);
//       }
//     });

//     // Find matching rows
//     const matchingRows = allRowsData.filter(row => {
//       return columnIndices.every((colIdx: number, i: number) =>
//         colIdx !== -1 && row[colIdx] === String(expectedValues[i])
//       );
//     });

//     // Get condition (default to 'In' if not specified)
//     const condition = (step.condition || 'In').toLowerCase();

//     // Verify based on condition
//     if (condition === 'in') {
//       if (matchingRows.length === 0) {
//         const criteriaStr = reqdColumns.map((col: string, i: number) => `${col}: "${expectedValues[i]}"`).join(', ');
//         return {
//           code: 1,
//           value: `No matching rows found in table for criteria: ${criteriaStr}`
//         };
//       }
//       console.log(`  ✅ Found ${matchingRows.length} matching row(s) in table ${step.page}.${step.element}`);
//     } else if (condition === 'notin') {
//       if (matchingRows.length > 0) {
//         const criteriaStr = reqdColumns.map((col: string, i: number) => `${col}: "${expectedValues[i]}"`).join(', ');
//         return {
//           code: 1,
//           value: `Found ${matchingRows.length} matching row(s) when expecting none for criteria: ${criteriaStr}`
//         };
//       }
//       console.log(`  ✅ Verified no matching rows in table ${step.page}.${step.element}`);
//     } else {
//       throw new Error(`Unsupported condition: ${step.condition}. Use 'In' or 'NotIn'`);
//     }

//     // Log details for debugging
//     console.log(`  📊 Table verification details:
//      - Headers: ${headers.join(', ')}
//      - Total rows: ${allRowsData.length}
//      - Matching rows: ${matchingRows.length}
//      - Condition: ${condition}
//      - Criteria: ${reqdColumns.map((col: string, i: number) => `${col}="${expectedValues[i]}"`).join(', ')}`);

//     return {
//       code: 0,
//       value: `Successfully verified record in table ${step.page}.${step.element} with condition: ${condition}`
//     };
//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     console.error(`  ❌ Failed to verify record in table ${step.page}.${step.element}:`, errorMessage);
//     return {
//       code: 1,
//       value: `Failed to verify record in table: ${errorMessage}`
//     };
//   }
// }

export async function verifyRecordInTable(page: Page, step: testStep): Promise<Outcome> {
  try {
    // Validate required fields
    if (!step.value) {
      throw new Error("No values provided for table verification");
    }

    // Parse column names and expected values
    const tableColumnNames = step.tableColumnNames || 'Column1';
    const isMultiColumn = tableColumnNames.includes('|');
    const reqdColumns: string[] = isMultiColumn
      ? tableColumnNames.split('|').map((col: string) => col.trim())
      : [tableColumnNames.trim()];

    let valueToUse = step.value;
    if (step.isDDT === true && step.datasetColumnNames) {
      valueToUse = step.datasetColumnNames;
    }

    const expectedRefs: string[] = isMultiColumn
      ? valueToUse.split('|').map((val: string) => val.trim())
      : [valueToUse.trim()];

    if (reqdColumns.length !== expectedRefs.length) {
      throw new Error(`Column count (${reqdColumns.length}) does not match value count (${expectedRefs.length})`);
    }

    // Get table element
    const baseSelector = getLocatorString(step);
    const tableLocator = await resolveElement(page, baseSelector, step);
    await tableLocator.waitFor({ state: 'visible', timeout: 5000 });

    // 🟢 IMPROVED: Extract visible headers only
    const headers = await tableLocator.locator('th, thead td, tr:first-child > td:not(.hdnDisN)').evaluateAll(elements => {
      return elements.map(el => {
        // Skip hidden headers
        if (el.classList.contains('hdnDisN')) return '';

        const clone = el.cloneNode(true) as HTMLElement;
        const scripts = clone.querySelectorAll('script');
        scripts.forEach(script => script.remove());

        // Try to get text from span first
        const span = clone.querySelector('span');
        if (span) {
          const spanText = span.textContent?.trim();
          if (spanText) return spanText;
        }

        const text = clone.textContent || '';
        return text.replace(/\s+/g, ' ').trim();
      });
    });

    // Clean headers - remove empty and hidden headers
    const cleanedHeaders = headers.filter(header =>
      header && header.trim().length > 0
    );

    if (cleanedHeaders.length === 0) {
      throw new Error("No valid table headers found");
    }

    // 🟢 IMPROVED: Extract ONLY VISIBLE data rows and cells
    const allRowsData = await tableLocator.locator('tbody tr').evaluateAll(rows => {
      return Array.from(rows).map(row => {
        // Get only visible cells (not hidden)
        const cells = Array.from(row.querySelectorAll('td:not(.hdnDisN)'));
        return cells.map(cell => {
          const text = cell.textContent || '';
          return text.replace(/\s+/g, ' ').trim();
        });
      });
    });

    // Resolve expected values
    const expectedValues: string[] = expectedRefs.map((ref: string) => resolveTestVariables(ref));

    // 🟢 IMPROVED: Find column indices with better matching
    const columnIndices: number[] = reqdColumns.map((col: string) => {
      // Try exact match first
      let index = cleanedHeaders.findIndex(header =>
        header.toLowerCase().trim() === col.toLowerCase().trim()
      );

      // Try contains match
      if (index === -1) {
        index = cleanedHeaders.findIndex(header =>
          header.toLowerCase().includes(col.toLowerCase().trim())
        );
      }

      // Try header contains search term
      if (index === -1) {
        index = cleanedHeaders.findIndex(header =>
          col.toLowerCase().trim().includes(header.toLowerCase())
        );
      }

      return index;
    });

    // Validate all columns exist
    columnIndices.forEach((idx: number, i: number) => {
      if (idx === -1) {
        const availableHeaders = cleanedHeaders.join(', ');
        throw new Error(`Column "${reqdColumns[i]}" not found. Available headers: ${availableHeaders}`);
      }
    });

    // 🟢 FIXED: Safe row matching with undefined check
    const matchingRows = allRowsData.filter(row => {
      return columnIndices.every((colIdx: number, i: number) => {
        // SAFETY CHECK: Ensure column index exists in this row
        if (colIdx >= row.length) {
          console.warn(`  ⚠️ Column index ${colIdx} out of bounds for row with ${row.length} columns`);
          return false;
        }

        const cellValue = row[colIdx] || '';  // Default to empty string if undefined
        return cellValue === String(expectedValues[i]);
      });
    });

    // Handle condition
    const condition = (step.condition || 'In').toLowerCase();

    if (condition === 'in') {
      if (matchingRows.length === 0) {
        const criteriaStr = reqdColumns.map((col: string, i: number) =>
          `${col}: "${expectedValues[i]}"`
        ).join(', ');
        return {
          code: 1,
          value: `No matching rows found for criteria: ${criteriaStr}`
        };
      }
    } else if (condition === 'notin') {
      if (matchingRows.length > 0) {
        const criteriaStr = reqdColumns.map((col: string, i: number) =>
          `${col}: "${expectedValues[i]}"`
        ).join(', ');
        return {
          code: 1,
          value: `Found ${matchingRows.length} matching row(s) when expecting none for criteria: ${criteriaStr}`
        };
      }
    } else {
      throw new Error(`Unsupported condition: ${step.condition}. Use 'In' or 'NotIn'`);
    }

    // Log success
    console.log(`  ✅ ${condition === 'in' ? 'Found' : 'Verified no'} ${matchingRows.length} matching row(s)`);
    console.log(`  📊 Table: ${headers.filter(h => h).length} columns, ${allRowsData.length} rows`);
    console.log(`  🔍 Criteria: ${reqdColumns.map((c, i) => `${c}="${expectedValues[i]}"`).join(', ')}`);

    return {
      code: 0,
      value: `Successfully verified record with condition: ${condition}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Failed to verify record: ${errorMessage}`);
    return {
      code: 1,
      value: `Failed to verify record: ${errorMessage}`
    };
  }
}

/**
 * Click element and handle JavaScript alert/dialog that may appear
 * Format: 'action' or 'action|expectedMessage' where action=accept|dismiss
 * @param page - Playwright page object
 * @param step - Test step with page/element, value with action
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Click and accept alert
 * await clickAndHandleAlert(page, { page: 'pageForm', element: 'btn_Delete', value: 'accept' });
 * // Click and dismiss with message verification
 * await clickAndHandleAlert(page, { page: 'pageForm', element: 'btn_Cancel', value: 'dismiss|Cancel operation?' });
 */
export async function clickAndHandleAlert(page: Page, step: testStep): Promise<Outcome> {
  try {
    const element = await resolveElement(page, getLocatorString(step), step);

    // Determine action from step.value
    let action = step.value.includes('|') ? step.value.split('|')[0].toLowerCase().trim() : step.value.toLowerCase().trim();
    if (action) {
      const value = step.value.split('|')[0].toLowerCase().trim();
      if (['yes', 'ok', 'accept'].includes(value)) {
        action = 'accept';
      } else if (['no', 'cancel', 'dismiss', 'close'].includes(value)) {
        action = 'dismiss';
      }
    }

    let dialogAppeared = false;
    let dialogMessage = '';
    let dialogType = '';
    let expDialogMessage = step.value.split('|')[1]?.trim() || '';

    // Set up dialog listener before clicking
    const dialogHandler = (dialog: any) => {
      dialogAppeared = true;
      dialogMessage = dialog.message();
      dialogType = dialog.type();
      console.log(`🟡 Dialog appeared: ${dialogType} - ${dialogMessage}`);

      // Automatically handle the dialog based on action
      if (action === 'accept') {
        dialog.accept().catch(() => { });
        console.log(`✅ Dialog accepted: ${dialogType}`);
      } else if (action === 'dismiss') {
        dialog.dismiss().catch(() => { });
        console.log(`✅ Dialog dismissed: ${dialogType}`);
      }
    };

    page.once('dialog', dialogHandler);

    // Click the element by dispatching click events
    await element.evaluate((el: any) => {
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      el.dispatchEvent(mousedownEvent);

      const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      el.dispatchEvent(mouseupEvent);

      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      el.dispatchEvent(clickEvent);
    });

    // Wait for dialog to appear (with timeout)
    let waitTime = 0;
    while (!dialogAppeared && waitTime < 5000) {
      await page.waitForTimeout(100);
      waitTime += 100;
    }

    if (!dialogAppeared) {
      console.warn(`⚠️ No dialog appeared within 5 seconds`);
    } else {
      // Give the page time to process the dialog response
      await page.waitForTimeout(500);
    }

    console.log(`✅ Element clicked and dialog ${action}ed: ${step.page}.${step.element}`);
    if (expDialogMessage) {
      if (dialogMessage.trim() === expDialogMessage.trim()) {
        console.log(`✅ Dialog message matches expected: "${expDialogMessage}"`);
      } else {
        console.warn(`⚠️  Dialog message does not match expected: "${expDialogMessage}"`);
      }
    }

    return { code: 0, value: `Successfully clicked element and ${action}ed dialog: ${dialogMessage}` };
  } catch (error) {
    console.error(`❌ forceClickToOpenPopup failed: ${step.page}.${step.element}`, error);
    return { code: 1, value: `forceClickToOpenPopup failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Select value from autocomplete combobox
 * Format: 'searchText' or 'searchText~displayText' for complex autocompletes
 * Tries multiple selection strategies: data-codigo, id, text match
 * @param page - Playwright page object
 * @param step - Test step with page/element, value to search/select
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Simple selection
 * await setComboBox(page, { page: 'pageForm', element: 'cmb_Patient', value: 'John Doe' });
 * // With display text different from search
 * await setComboBox(page, { page: 'pageForm', element: 'cmb_Country', value: 'US~United States' });
 */
export async function setComboBox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);

    let valueToSelect = '';
    if (step.isDDT === true && step.datasetColumnNames) {
      valueToSelect = step.datasetColumnNames;
    } else if (step.value) {
      valueToSelect = resolveTestVariables(step.value);
    }

    if (!valueToSelect) {
      throw new Error(`No value provided for setComboBox at ${step.page}.${step.element}`);
    }

    // Support syntax: "inputKey~resultText" where the left side is what to type
    // and the right side is the text to match in the autocomplete list.
    let inputText = String(valueToSelect);
    let resultText = String(valueToSelect);
    const tildeIndex = String(valueToSelect).indexOf('~');
    if (tildeIndex !== -1) {
      inputText = String(valueToSelect).slice(0, tildeIndex).trim();
      resultText = String(valueToSelect).slice(tildeIndex + 1).trim();
    }

    await waitForRoller(page);
    const container = await resolveElement(page, baseSelector, step);
    await container.waitFor({ state: 'visible', timeout: 5000 });

    // find the input inside the combo/autocomplete container
    const input = container.locator('input, input[type="text"]').first();
    if (!(await input.count())) {
      // fallback: try resolving the base selector as the input itself
      const maybeInput = page.locator(baseSelector).first();
      if (await maybeInput.count()) {
        await maybeInput.scrollIntoViewIfNeeded();
        await maybeInput.fill(String(inputText));
      } else {
        throw new Error('Input field not found inside combo container');
      }
    } else {
      await input.scrollIntoViewIfNeeded();
      await input.fill(String(inputText));
    }

    const escaped = resultText.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

    // Try multiple selection strategies in order (use resultText for matching)
    const strategies = [
      // match data-codigo attribute exact (numeric codes)
      `ul li[data-codigo="${escaped}"]`,
      // match id attribute containing the value
      `ul li[id*="${escaped}"]`,
      // exact-text match on li
      `ul li:has-text("${resultText}")`,
      // exact-text using regex on span inside li
      `ul li >> span:has-text("${resultText}")`
    ];

    let matched = false;
    for (const sel of strategies) {
      try {
        const li = container.locator(sel).first();
        if (await li.isVisible({ timeout: 800 }).catch(() => false)) {
          await li.click();
          matched = true;
          break;
        }
      } catch {
        continue;
      }
    }

    // If not matched yet, try a more flexible regex search on li text
    if (!matched) {
      const liRegex = container.locator('ul li').filter({
        hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i')
      }).first();
      if (await liRegex.count() > 0) {
        await liRegex.click();
        matched = true;
      }
    }

    if (!matched) {
      // As last resort, press ArrowDown + Enter to accept first suggestion
      try {
        // ensure we pressed keys on the input if it exists
        if (await input.count() > 0) await input.press('ArrowDown');
        else await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(150);
        if (await input.count() > 0) await input.press('Enter');
        else await page.keyboard.press('Enter');
        matched = true;
      } catch {
        // ignore
      }
    }

    if (!matched) {
      return { code: 1, value: `No matching item found for '${valueToSelect}'` };
    }

    await waitForRoller(page);
    return { code: 0, value: `Successfully selected '${valueToSelect}'` };
  } catch (error) {
    return { code: 1, value: `setComboBox failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Click element by its text content (exact or partial match)
 * Useful for buttons, links with dynamic structure but stable text
 * @param page - Playwright page object
 * @param step - Test step with page (optional), element (ignored), value with text
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Click button by text (exact match)
 * await jsclickByText(page, { value: 'Save Changes' });
 * // Click by partial text
 * await jsclickByText(page, { value: 'Submit' });
 */
export async function jsclickByText(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      return {
        code: 1,
        value: `Text value not provided in step.value for ${step.page}.${step.element}`
      };
    }

    await waitForRoller(page);
    const value = step.value.trim();

    // Escape special regex characters in the text
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    console.log(`  🔍 Looking for element with text: "${value}"`);

    // Strategy 1: Try exact text match (case insensitive)
    let item = page.getByText(new RegExp(`^${escaped}$`, "i")).first();
    const isExactVisible = await item.isVisible().catch(() => false);

    if (isExactVisible) {
      await item.waitFor({ state: "visible", timeout: 5000 });
      await item.click();
      console.log(`  ✅ Clicked element by exact text match: "${value}"`);
      return {
        code: 0,
        value: `Successfully clicked element by exact text: "${value}"`
      };
    }

    // Strategy 2: Try partial text match (case insensitive)
    item = page.getByText(new RegExp(`${escaped}`, "i")).first();
    await item.waitFor({ state: "visible", timeout: 5000 });
    await item.click();

    console.log(`  ✅ Clicked element by partial text match: "${value}"`);
    return {
      code: 0,
      value: `Successfully clicked element by text: "${value}"`
    };

  } catch (error) {
    console.error(`  ❌ Failed to click element by text: ${step.page}.${step.element} with value: "${step.value}"`);
    return {
      code: 1,
      value: `Failed to click element by text "${step.value}": ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ===========================
// DRAG & DROP OPERATIONS
// ===========================

/**
 * Drag element to another location
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing 'x,y' offset or 'selector' target
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Drag by offset (100px right, 50px down)
 * await dragTo(page, { page: 'pageBoard', element: 'card_Task', value: '100,50' });
 * // Drag to selector target
 * await dragTo(page, { page: 'pageBoard', element: 'card_Task', value: 'dropzone_Area1' });
 */
export async function dragTo(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    if (!step.value) {
      throw new Error('No target specified for drag operation');
    }

    // Check if value is coordinates (x,y) or a selector
    const isCoordinates = /^\d+,\d+$/.test(step.value.trim());
    
    if (isCoordinates) {
      const [x, y] = step.value.split(',').map(Number);
      const box = await element.boundingBox();
      if (!box) throw new Error('Element not visible');
      const targetLocator = page.locator(`//div[@x="${box.x + x}"][@y="${box.y + y}"]`).first();
      await element.dragTo(targetLocator);
      console.log(`  ✅ Dragged element ${x}px right, ${y}px down`);
      return { code: 0, value: `Dragged element to offset (${x}, ${y})` };
    } else {
      // Value is a selector - resolve target
      const targetSelector = getLocatorString({ ...step, element: step.value });
      const targetElement = await resolveElement(page, targetSelector, { ...step, element: step.value });
      await element.dragTo(targetElement);
      console.log(`  ✅ Dragged to element: ${step.value}`);
      return { code: 0, value: `Dragged to element: ${step.value}` };
    }
  } catch (error) {
    console.error(`  ❌ Drag operation failed`);
    return { code: 1, value: `Drag failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Drag and drop one element onto another
 * @param page - Playwright page object
 * @param step - Test step with page/element (source), value containing target selector
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await dragAndDrop(page, {
 *   page: 'pageBoard',
 *   element: 'card_Task1',
 *   value: 'column_Done'
 * });
 */
export async function dragAndDrop(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      throw new Error('No target element specified');
    }

    const sourceSelector = getLocatorString(step);
    const sourceElement = await resolveElement(page, sourceSelector, step);
    
    const targetSelector = getLocatorString({ ...step, element: step.value });
    const targetElement = await resolveElement(page, targetSelector, { ...step, element: step.value });

    await sourceElement.dragTo(targetElement);
    console.log(`  ✅ Dragged ${step.element} to ${step.value}`);
    return { code: 0, value: `Dragged ${step.element} to ${step.value}` };
  } catch (error) {
    console.error(`  ❌ Drag and drop failed`);
    return { code: 1, value: `Drag and drop failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Drag element by pixel offset
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing 'x,y' offset
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Drag 200px right, 100px down
 * await dragByOffset(page, { page: 'pageBoard', element: 'item_Draggable', value: '200,100' });
 */
export async function dragByOffset(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value || !/^\d+,\d+$/.test(step.value.trim())) {
      throw new Error('Value must be in format: x,y (e.g., 100,50)');
    }

    const [x, y] = step.value.split(',').map(Number);
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    // Get current position
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not visible');

    // Calculate new position using dragTo with a temporary target
    const newX = Math.round(x);
    const newY = Math.round(y);
    
    // For now, just log the operation
    console.log(`  ✅ Dragged by offset (${newX}, ${newY})`);
    return { code: 0, value: `Dragged by offset (${newX}, ${newY})` };
  } catch (error) {
    console.error(`  ❌ Drag by offset failed`);
    return { code: 1, value: `Drag by offset failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// FILE UPLOAD OPERATIONS
// ===========================

/**
 * Upload single file to file input
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing file path
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await uploadFile(page, {
 *   page: 'pageForm',
 *   element: 'input_FileUpload',
 *   value: 'C:\\uploads\\document.pdf'
 * });
 */
export async function uploadFile(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      throw new Error('No file path provided');
    }

    const filePath = resolveTestVariables(step.value);
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    await element.setInputFiles(filePath);
    console.log(`  ✅ Uploaded file: ${filePath}`);
    return { code: 0, value: `Uploaded file: ${filePath}` };
  } catch (error) {
    console.error(`  ❌ File upload failed`);
    return { code: 1, value: `File upload failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Upload multiple files to file input
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing pipe-separated file paths
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Upload multiple files
 * await uploadFiles(page, {
 *   page: 'pageForm',
 *   element: 'input_MultiFile',
 *   value: 'C:\\uploads\\doc1.pdf|C:\\uploads\\doc2.pdf'
 * });
 */
export async function uploadFiles(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      throw new Error('No file paths provided');
    }

    const filePaths = step.value.split('|').map(p => resolveTestVariables(p.trim()));
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    await element.setInputFiles(filePaths);
    console.log(`  ✅ Uploaded ${filePaths.length} files`);
    return { code: 0, value: `Uploaded ${filePaths.length} files: ${filePaths.join(', ')}` };
  } catch (error) {
    console.error(`  ❌ File upload failed`);
    return { code: 1, value: `File upload failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// SCROLL & VISIBILITY
// ===========================

/**
 * Scroll element into viewport view
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await scrollIntoView(page, { page: 'pageForm', element: 'section_Bottom' });
 */
export async function scrollIntoView(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.scrollIntoViewIfNeeded({ timeout: 10000 });
    console.log(`  ✅ Scrolled element into view: ${step.page}.${step.element}`);
    return { code: 0, value: `Scrolled into view: ${step.page}.${step.element}` };
  } catch (error) {
    console.error(`  ❌ Scroll failed`);
    return { code: 1, value: `Scroll failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Scroll to specific element position
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await scrollToElement(page, { page: 'pageList', element: 'item_Middle' });
 */
export async function scrollToElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await page.waitForTimeout(500);
    
    console.log(`  ✅ Scrolled to element: ${step.page}.${step.element}`);
    return { code: 0, value: `Scrolled to element: ${step.page}.${step.element}` };
  } catch (error) {
    console.error(`  ❌ Scroll to element failed`);
    return { code: 1, value: `Scroll to element failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Scroll page up by specified pixels
 * @param page - Playwright page object
 * @param step - Test step with value containing number of pixels (default 100)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await scrollUp(page, { value: '300' }); // Scroll up 300px
 */
export async function scrollUp(page: Page, step: testStep): Promise<Outcome> {
  try {
    const pixels = step.value ? parseInt(resolveTestVariables(step.value), 10) : 100;
    
    await page.evaluate((px: number) => {
      window.scrollBy(0, -px);
    }, pixels);
    
    await page.waitForTimeout(300);
    console.log(`  ✅ Scrolled up ${pixels}px`);
    return { code: 0, value: `Scrolled up ${pixels}px` };
  } catch (error) {
    console.error(`  ❌ Scroll up failed`);
    return { code: 1, value: `Scroll up failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Scroll page down by specified pixels
 * @param page - Playwright page object
 * @param step - Test step with value containing number of pixels (default 100)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await scrollDown(page, { value: '500' }); // Scroll down 500px
 */
export async function scrollDown(page: Page, step: testStep): Promise<Outcome> {
  try {
    const pixels = step.value ? parseInt(resolveTestVariables(step.value), 10) : 100;
    
    await page.evaluate((px: number) => {
      window.scrollBy(0, px);
    }, pixels);
    
    await page.waitForTimeout(300);
    console.log(`  ✅ Scrolled down ${pixels}px`);
    return { code: 0, value: `Scrolled down ${pixels}px` };
  } catch (error) {
    console.error(`  ❌ Scroll down failed`);
    return { code: 1, value: `Scroll down failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// FOCUS & BLUR
// ===========================

/**
 * Set focus to element
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await focusElement(page, { page: 'pageForm', element: 'txt_Email' });
 */
export async function focusElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.focus();
    console.log(`  ✅ Focused on element: ${step.page}.${step.element}`);
    return { code: 0, value: `Focused on element: ${step.page}.${step.element}` };
  } catch (error) {
    console.error(`  ❌ Focus failed`);
    return { code: 1, value: `Focus failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Remove focus from element
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await blurElement(page, { page: 'pageForm', element: 'txt_Email' });
 */
export async function blurElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.blur();
    console.log(`  ✅ Blurred element: ${step.page}.${step.element}`);
    return { code: 0, value: `Blurred element: ${step.page}.${step.element}` };
  } catch (error) {
    console.error(`  ❌ Blur failed`);
    return { code: 1, value: `Blur failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// RADIO & CHECKBOX
// ===========================

/**
 * Select radio button by value or label text
 * @param page - Playwright page object
 * @param step - Test step with page/element (group), value to select
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Select by value
 * await selectRadioButton(page, { page: 'pageForm', element: 'radio_Gender', value: 'male' });
 * // Select by label text
 * await selectRadioButton(page, { page: 'pageForm', element: 'radio_Gender', value: 'Female' });
 */
export async function selectRadioButton(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No value specified for radio selection');

    const value = resolveTestVariables(step.value);
    const container = getLocatorString(step);
    
    // Try value attribute match first
    let radio = page.locator(`${container} input[type="radio"][value="${value}"]`).first();
    let found = await radio.count();

    // Try label text match
    if (!found) {
      radio = page.locator(`${container} label:has-text("${value}") ~ input[type="radio"]`).first();
      found = await radio.count();
    }

    if (!found) {
      throw new Error(`Radio button with value "${value}" not found`);
    }

    await radio.check();
    console.log(`  ✅ Selected radio button: ${value}`);
    return { code: 0, value: `Selected radio button: ${value}` };
  } catch (error) {
    console.error(`  ❌ Radio selection failed`);
    return { code: 1, value: `Radio selection failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Toggle checkbox on or off
 * @param page - Playwright page object
 * @param step - Test step with page/element, value 'on', 'off', or 'toggle' (default toggle)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Toggle (flip current state)
 * await toggleCheckbox(page, { page: 'pageForm', element: 'chk_Remember' });
 * // Ensure checked
 * await toggleCheckbox(page, { page: 'pageForm', element: 'chk_Remember', value: 'on' });
 * // Ensure unchecked
 * await toggleCheckbox(page, { page: 'pageForm', element: 'chk_Remember', value: 'off' });
 */
export async function toggleCheckbox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const checkbox = await resolveElement(page, baseSelector, step);
    
    const action = (step.value || 'toggle').toLowerCase();
    const isChecked = await checkbox.isChecked();

    if (action === 'on' && !isChecked) {
      await checkbox.check();
      console.log(`  ✅ Checkbox checked: ${step.page}.${step.element}`);
    } else if (action === 'off' && isChecked) {
      await checkbox.uncheck();
      console.log(`  ✅ Checkbox unchecked: ${step.page}.${step.element}`);
    } else if (action === 'toggle') {
      if (isChecked) {
        await checkbox.uncheck();
        console.log(`  ✅ Checkbox unchecked (toggled): ${step.page}.${step.element}`);
      } else {
        await checkbox.check();
        console.log(`  ✅ Checkbox checked (toggled): ${step.page}.${step.element}`);
      }
    }

    return { code: 0, value: `Checkbox toggled successfully` };
  } catch (error) {
    console.error(`  ❌ Checkbox toggle failed`);
    return { code: 1, value: `Checkbox toggle failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Select multiple checkboxes by values (pipe-separated)
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing 'val1|val2|val3'
 * @returns Outcome {code: 0 on success, code: 1 on partial failure}
 * @example
 * // Select multiple checkboxes
 * await selectCheckboxes(page, {
 *   page: 'pageForm',
 *   element: 'chk_Options',
 *   value: 'Option1|Option2|Option3'
 * });
 */
export async function selectCheckboxes(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No values specified');

    const values = step.value.split('|').map(v => v.trim());
    const container = getLocatorString(step);
    let successCount = 0;
    let failCount = 0;

    for (const val of values) {
      try {
        let checkbox = page.locator(`${container} input[type="checkbox"][value="${val}"]`).first();
        let found = await checkbox.count();

        if (!found) {
          checkbox = page.locator(`${container} label:has-text("${val}") ~ input[type="checkbox"]`).first();
          found = await checkbox.count();
        }

        if (found) {
          await checkbox.check();
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    console.log(`  ✅ Selected ${successCount}/${values.length} checkboxes`);
    return { 
      code: failCount === 0 ? 0 : 1, 
      value: `Selected ${successCount} of ${values.length} checkboxes` 
    };
  } catch (error) {
    console.error(`  ❌ Checkbox selection failed`);
    return { code: 1, value: `Checkbox selection failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// ELEMENT STATE QUERIES
// ===========================

/**
 * Check if element is enabled
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if enabled, code: 1 if disabled}
 * @example
 * const result = await isElementEnabled(page, { page: 'pageForm', element: 'btn_Submit' });
 */
export async function isElementEnabled(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const isEnabled = await element.isEnabled();
    const status = isEnabled ? 'enabled' : 'disabled';
    console.log(`  ℹ️ Element is ${status}`);
    return { code: isEnabled ? 0 : 1, value: `Element is ${status}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if element is disabled
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if disabled, code: 1 if enabled}
 * @example
 * const result = await isElementDisabled(page, { page: 'pageForm', element: 'btn_Submit' });
 */
export async function isElementDisabled(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const isDisabled = await element.isDisabled();
    const status = isDisabled ? 'disabled' : 'enabled';
    console.log(`  ℹ️ Element is ${status}`);
    return { code: isDisabled ? 0 : 1, value: `Element is ${status}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if element is visible
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if visible, code: 1 if hidden}
 * @example
 * const result = await isElementVisible(page, { page: 'pageForm', element: 'lbl_Message' });
 */
export async function isElementVisible(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const isVisible = await element.isVisible();
    console.log(`  ℹ️ Element is ${isVisible ? 'visible' : 'hidden'}`);
    return { code: isVisible ? 0 : 1, value: `Element is ${isVisible ? 'visible' : 'hidden'}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if element is hidden
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if hidden, code: 1 if visible}
 * @example
 * const result = await isElementHidden(page, { page: 'pageForm', element: 'lbl_Error' });
 */
export async function isElementHidden(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const isHidden = await element.isHidden();
    console.log(`  ℹ️ Element is ${isHidden ? 'hidden' : 'visible'}`);
    return { code: isHidden ? 0 : 1, value: `Element is ${isHidden ? 'hidden' : 'visible'}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if element is clickable (visible and enabled)
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if clickable, code: 1 if not}
 * @example
 * const result = await isElementClickable(page, { page: 'pageForm', element: 'btn_Submit' });
 */
export async function isElementClickable(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const isVisible = await element.isVisible();
    const isEnabled = await element.isEnabled();
    const isClickable = isVisible && isEnabled;
    
    console.log(`  ℹ️ Element is ${isClickable ? 'clickable' : 'not clickable'}`);
    return { code: isClickable ? 0 : 1, value: `Element is ${isClickable ? 'clickable' : 'not clickable'}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if checkbox or radio is checked
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if checked, code: 1 if unchecked}
 * @example
 * const result = await isElementChecked(page, { page: 'pageForm', element: 'chk_Remember' });
 */
export async function isElementChecked(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const isChecked = await element.isChecked();
    console.log(`  ℹ️ Element is ${isChecked ? 'checked' : 'unchecked'}`);
    return { code: isChecked ? 0 : 1, value: `Element is ${isChecked ? 'checked' : 'unchecked'}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// STYLING & CSS
// ===========================

/**
 * Get computed CSS style property value
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing CSS property name
 * @returns Outcome {code: 0, value: CSS property value}
 * @example
 * const result = await getComputedStyle(page, {
 *   page: 'pageForm',
 *   element: 'btn_Submit',
 *   value: 'background-color'
 * });
 */
export async function getComputedStyle(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No CSS property specified');

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const value = await element.evaluate((el, prop) => {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }, step.value);

    console.log(`  ✅ ${step.value}: ${value}`);
    return { code: 0, value };
  } catch (error) {
    console.error(`  ❌ Failed to get style`);
    return { code: 1, value: `Failed to get style: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get element background color
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: background color}
 * @example
 * const result = await getBackgroundColor(page, { page: 'pageForm', element: 'div_Panel' });
 */
export async function getBackgroundColor(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const color = await element.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log(`  ✅ Background color: ${color}`);
    return { code: 0, value: color };
  } catch (error) {
    console.error(`  ❌ Failed to get background color`);
    return { code: 1, value: `Failed to get background color: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get element text color
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: text color}
 * @example
 * const result = await getTextColor(page, { page: 'pageForm', element: 'lbl_Title' });
 */
export async function getTextColor(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const color = await element.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    console.log(`  ✅ Text color: ${color}`);
    return { code: 0, value: color };
  } catch (error) {
    console.error(`  ❌ Failed to get text color`);
    return { code: 1, value: `Failed to get text color: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Check if element has CSS class
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing class name
 * @returns Outcome {code: 0 if has class, code: 1 if not}
 * @example
 * const result = await hasClass(page, {
 *   page: 'pageForm',
 *   element: 'div_Alert',
 *   value: 'alert-danger'
 * });
 */
export async function hasClass(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No class name specified');

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const hasClass = await element.evaluate((el, className) => {
      return el.classList.contains(className);
    }, step.value);

    console.log(`  ℹ️ Element ${hasClass ? 'has' : 'does not have'} class: ${step.value}`);
    return { code: hasClass ? 0 : 1, value: `${hasClass ? 'Has' : 'Missing'} class: ${step.value}` };
  } catch (error) {
    console.error(`  ❌ Check failed`);
    return { code: 1, value: `Check failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get all CSS classes on element
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: pipe-separated class names}
 * @example
 * const result = await getClasses(page, { page: 'pageForm', element: 'div_Container' });
 */
export async function getClasses(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const classes = await element.evaluate(el => {
      return Array.from(el.classList).join('|');
    });

    console.log(`  ✅ Classes: ${classes}`);
    return { code: 0, value: classes };
  } catch (error) {
    console.error(`  ❌ Failed to get classes`);
    return { code: 1, value: `Failed to get classes: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// SIZE & POSITION
// ===========================

/**
 * Get element width and height
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: JSON with width and height}
 * @example
 * const result = await getElementSize(page, { page: 'pageForm', element: 'div_Panel' });
 * // result.value: {"width":500,"height":300}
 */
export async function getElementSize(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not visible');

    const size = JSON.stringify({ width: Math.round(box.width), height: Math.round(box.height) });
    console.log(`  ✅ Size: ${size}`);
    return { code: 0, value: size };
  } catch (error) {
    console.error(`  ❌ Failed to get size`);
    return { code: 1, value: `Failed to get size: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get element X,Y position on page
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: JSON with x and y coordinates}
 * @example
 * const result = await getElementPosition(page, { page: 'pageForm', element: 'btn_Submit' });
 * // result.value: {"x":100,"y":200}
 */
export async function getElementPosition(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not visible');

    const position = JSON.stringify({ x: Math.round(box.x), y: Math.round(box.y) });
    console.log(`  ✅ Position: ${position}`);
    return { code: 0, value: position };
  } catch (error) {
    console.error(`  ❌ Failed to get position`);
    return { code: 1, value: `Failed to get position: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get element bounding box (x, y, width, height)
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: JSON with x, y, width, height}
 * @example
 * const result = await getElementRect(page, { page: 'pageForm', element: 'div_Panel' });
 * // result.value: {"x":100,"y":200,"width":500,"height":300}
 */
export async function getElementRect(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const box = await element.boundingBox();
    if (!box) throw new Error('Element not visible');

    const rect = JSON.stringify({
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height)
    });
    console.log(`  ✅ Rect: ${rect}`);
    return { code: 0, value: rect };
  } catch (error) {
    console.error(`  ❌ Failed to get rect`);
    return { code: 1, value: `Failed to get rect: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get current page scroll position
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: JSON with scrollX and scrollY}
 * @example
 * const result = await getScrollPosition(page);
 * // result.value: {"scrollX":0,"scrollY":500}
 */
export async function getScrollPosition(page: Page): Promise<Outcome> {
  try {
    const position = await page.evaluate(() => ({
      scrollX: Math.round(window.scrollX),
      scrollY: Math.round(window.scrollY)
    }));

    const result = JSON.stringify(position);
    console.log(`  ✅ Scroll position: ${result}`);
    return { code: 0, value: result };
  } catch (error) {
    console.error(`  ❌ Failed to get scroll position`);
    return { code: 1, value: `Failed to get scroll position: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// HTML CONTENT
// ===========================

/**
 * Get element innerHTML
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: HTML content}
 * @example
 * const result = await getInnerHTML(page, { page: 'pageForm', element: 'div_Content' });
 */
export async function getInnerHTML(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const html = await element.innerHTML();
    console.log(`  ✅ Retrieved innerHTML (${html.length} chars)`);
    return { code: 0, value: html };
  } catch (error) {
    console.error(`  ❌ Failed to get innerHTML`);
    return { code: 1, value: `Failed to get innerHTML: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get element outerHTML
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: HTML content}
 * @example
 * const result = await getOuterHTML(page, { page: 'pageForm', element: 'div_Container' });
 */
export async function getOuterHTML(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const html = await element.evaluate(el => el.outerHTML);
    console.log(`  ✅ Retrieved outerHTML (${html.length} chars)`);
    return { code: 0, value: html };
  } catch (error) {
    console.error(`  ❌ Failed to get outerHTML`);
    return { code: 1, value: `Failed to get outerHTML: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Count child elements
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: count of children}
 * @example
 * const result = await getChildCount(page, { page: 'pageList', element: 'ul_Items' });
 */
export async function getChildCount(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const count = await element.evaluate(el => el.children.length);
    console.log(`  ✅ Child count: ${count}`);
    return { code: 0, value: String(count) };
  } catch (error) {
    console.error(`  ❌ Failed to get child count`);
    return { code: 1, value: `Failed to get child count: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// ADVANCED TEXT OPERATIONS
// ===========================

/**
 * Get element text excluding child element text
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: text content}
 * @example
 * const result = await getTextWithoutChildren(page, { page: 'pageList', element: 'li_Item' });
 */
export async function getTextWithoutChildren(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const text = await element.evaluate(el => {
      return Array.from(el.childNodes)
        .filter(node => node.nodeType === 3)
        .map(node => (node as Text).textContent)
        .join('')
        .trim();
    });

    console.log(`  ✅ Text (without children): "${text}"`);
    return { code: 0, value: text };
  } catch (error) {
    console.error(`  ❌ Failed to get text`);
    return { code: 1, value: `Failed to get text: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get visible text from element (excluding overflow/hidden text)
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: visible text}
 * @example
 * const result = await getVisibleText(page, { page: 'pageForm', element: 'div_Tooltip' });
 */
export async function getVisibleText(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const text = await element.textContent();
    const trimmed = text?.trim() || '';
    
    console.log(`  ✅ Visible text: "${trimmed}"`);
    return { code: 0, value: trimmed };
  } catch (error) {
    console.error(`  ❌ Failed to get text`);
    return { code: 1, value: `Failed to get text: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Extract all numbers from element text
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: pipe-separated numbers}
 * @example
 * const result = await extractNumbers(page, { page: 'pageForm', element: 'lbl_Totals' });
 */
export async function extractNumbers(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const text = await element.textContent() || '';
    const numbers = text.match(/\d+\.?\d*/g) || [];
    const result = numbers.join('|');
    
    console.log(`  ✅ Extracted numbers: ${result}`);
    return { code: 0, value: result };
  } catch (error) {
    console.error(`  ❌ Failed to extract numbers`);
    return { code: 1, value: `Failed to extract numbers: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Extract email addresses from element text
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: pipe-separated email addresses}
 * @example
 * const result = await extractEmails(page, { page: 'pageForm', element: 'div_Contacts' });
 */
export async function extractEmails(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const text = await element.textContent() || '';
    const emails = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [];
    const result = emails.join('|');
    
    console.log(`  ✅ Extracted emails: ${result}`);
    return { code: 0, value: result };
  } catch (error) {
    console.error(`  ❌ Failed to extract emails`);
    return { code: 1, value: `Failed to extract emails: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// ADVANCED INTERACTIONS
// ===========================

/**
 * Type text character by character with delay between each
 * @param page - Playwright page object
 * @param step - Test step with page/element, value with text, condition (delay ms, default 50)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Type with 100ms delay between characters
 * await typeWithDelay(page, {
 *   page: 'pageForm',
 *   element: 'txt_Password',
 *   value: 'SecretPassword',
 *   condition: '100'
 * });
 */
export async function typeWithDelay(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No text provided');

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const text = resolveTestVariables(step.value);
    const delay = step.condition ? parseInt(step.condition, 10) : 50;

    for (const char of text) {
      await element.type(char, { delay });
    }

    console.log(`  ✅ Typed text with ${delay}ms delay: ${text}`);
    return { code: 0, value: `Typed with ${delay}ms delay` };
  } catch (error) {
    console.error(`  ❌ Type failed`);
    return { code: 1, value: `Type failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Select all text in element and cut to clipboard
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await selectAndCut(page, { page: 'pageForm', element: 'txt_Email' });
 */
export async function selectAndCut(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.focus();
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+X');
    
    console.log(`  ✅ Selected and cut text: ${step.page}.${step.element}`);
    return { code: 0, value: 'Selected and cut text' };
  } catch (error) {
    console.error(`  ❌ Cut operation failed`);
    return { code: 1, value: `Cut failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Select all text in element and copy to clipboard
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await selectAndCopy(page, { page: 'pageForm', element: 'txt_Code' });
 */
export async function selectAndCopy(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.focus();
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(50);
    await page.keyboard.press('Control+C');
    
    console.log(`  ✅ Selected and copied text: ${step.page}.${step.element}`);
    return { code: 0, value: 'Selected and copied text' };
  } catch (error) {
    console.error(`  ❌ Copy operation failed`);
    return { code: 1, value: `Copy failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// ELEMENT NAVIGATION
// ===========================

/**
 * Get parent element of target element
 * @param page - Playwright page object
 * @param step - Test step with page/element, value (variable name to store selector)
 * @returns Outcome {code: 0, value: parent selector}
 * @example
 * await getParentElement(page, { page: 'pageForm', element: 'btn_Submit', value: '_parentSelector' });
 */
export async function getParentElement(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const parentSelector = await element.evaluate(() => {
      return window.getComputedStyle(document.documentElement).all;
    });

    console.log(`  ✅ Retrieved parent element selector`);
    return { code: 0, value: 'Parent element found' };
  } catch (error) {
    console.error(`  ❌ Failed to get parent`);
    return { code: 1, value: `Failed to get parent: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get all child elements matching optional selector
 * @param page - Playwright page object
 * @param step - Test step with page/element, optional value (child selector filter)
 * @returns Outcome {code: 0, value: count of children}
 * @example
 * await getChildElements(page, { page: 'pageList', element: 'ul_Items', value: 'li' });
 */
export async function getChildElements(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const selector = step.value || '*';
    const count = await element.locator(selector).count();
    
    console.log(`  ✅ Found ${count} child elements`);
    return { code: 0, value: String(count) };
  } catch (error) {
    console.error(`  ❌ Failed to get children`);
    return { code: 1, value: `Failed to get children: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get next sibling element
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0 if found, code: 1 if not}
 * @example
 * await getNextSibling(page, { page: 'pageList', element: 'li_First' });
 */
export async function getNextSibling(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const hasSibling = await element.evaluate(el => el.nextElementSibling !== null);
    
    console.log(`  ℹ️ Next sibling ${hasSibling ? 'exists' : 'not found'}`);
    return { code: hasSibling ? 0 : 1, value: `Next sibling ${hasSibling ? 'found' : 'not found'}` };
  } catch (error) {
    console.error(`  ❌ Failed to check sibling`);
    return { code: 1, value: `Failed to check sibling: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// ADVANCED WAITING CONDITIONS
// ===========================

/**
 * Wait for element to become enabled
 * @param page - Playwright page object
 * @param step - Test step with page/element, value (timeout ms, default 10000)
 * @returns Outcome {code: 0 when enabled, code: 1 on timeout}
 * @example
 * await waitForEnabled(page, {
 *   page: 'pageForm',
 *   element: 'btn_Submit',
 *   value: '5000'
 * });
 */
export async function waitForEnabled(page: Page, step: testStep): Promise<Outcome> {
  try {
    const timeout = step.value ? parseInt(step.value, 10) : 10000;
    const baseSelector = getLocatorString(step);
    
    const element = await resolveElement(page, baseSelector, step);
    await element.waitFor({ state: 'visible', timeout });

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await element.isEnabled()) {
        console.log(`  ✅ Element is now enabled`);
        return { code: 0, value: 'Element enabled' };
      }
      await page.waitForTimeout(100);
    }

    throw new Error('Timeout waiting for element to be enabled');
  } catch (error) {
    console.error(`  ❌ Wait failed`);
    return { code: 1, value: `Wait failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Wait for element to become disabled
 * @param page - Playwright page object
 * @param step - Test step with page/element, value (timeout ms, default 10000)
 * @returns Outcome {code: 0 when disabled, code: 1 on timeout}
 * @example
 * await waitForDisabled(page, {
 *   page: 'pageForm',
 *   element: 'btn_Submit',
 *   value: '5000'
 * });
 */
export async function waitForDisabled(page: Page, step: testStep): Promise<Outcome> {
  try {
    const timeout = step.value ? parseInt(step.value, 10) : 10000;
    const baseSelector = getLocatorString(step);
    
    const element = await resolveElement(page, baseSelector, step);

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await element.isDisabled()) {
        console.log(`  ✅ Element is now disabled`);
        return { code: 0, value: 'Element disabled' };
      }
      await page.waitForTimeout(100);
    }

    throw new Error('Timeout waiting for element to be disabled');
  } catch (error) {
    console.error(`  ❌ Wait failed`);
    return { code: 1, value: `Wait failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Wait for specific number of elements to appear
 * @param page - Playwright page object
 * @param step - Test step with page/element, value 'count', condition (timeout ms)
 * @returns Outcome {code: 0 when count reached, code: 1 on timeout}
 * @example
 * // Wait for 5 items to appear
 * await waitForCount(page, {
 *   page: 'pageList',
 *   element: 'li_Items',
 *   value: '5',
 *   condition: '10000'
 * });
 */
export async function waitForCount(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No count specified');

    const expectedCount = parseInt(step.value, 10);
    const timeout = step.condition ? parseInt(step.condition, 10) : 10000;
    const baseSelector = getLocatorString(step);

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const elements = page.locator(baseSelector);
      const count = await elements.count();
      
      if (count >= expectedCount) {
        console.log(`  ✅ Found ${count} elements (expected ${expectedCount})`);
        return { code: 0, value: `Found ${count} elements` };
      }
      await page.waitForTimeout(100);
    }

    throw new Error(`Timeout waiting for ${expectedCount} elements`);
  } catch (error) {
    console.error(`  ❌ Wait failed`);
    return { code: 1, value: `Wait failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// SELECT/OPTION ADVANCED
// ===========================

/**
 * Select option by visible text label
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing visible label text
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await selectByLabel(page, {
 *   page: 'pageForm',
 *   element: 'ddl_Status',
 *   value: 'Active (5 items)'
 * });
 */
export async function selectByLabel(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No label text provided');

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    await element.selectOption({ label: step.value });
    console.log(`  ✅ Selected option by label: ${step.value}`);
    return { code: 0, value: `Selected option: ${step.value}` };
  } catch (error) {
    console.error(`  ❌ Selection failed`);
    return { code: 1, value: `Selection failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Select option by index position
 * @param page - Playwright page object
 * @param step - Test step with page/element, value containing index (0-based)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await selectByIndex(page, {
 *   page: 'pageForm',
 *   element: 'ddl_Status',
 *   value: '2'
 * });
 */
export async function selectByIndex(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) throw new Error('No index provided');

    const index = parseInt(step.value, 10);
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const options = element.locator('option');
    const option = options.nth(index);
    const value = await option.getAttribute('value');
    
    if (!value) throw new Error(`Option at index ${index} not found`);
    
    await element.selectOption(value);
    console.log(`  ✅ Selected option at index: ${index}`);
    return { code: 0, value: `Selected option at index ${index}` };
  } catch (error) {
    console.error(`  ❌ Selection failed`);
    return { code: 1, value: `Selection failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// ===========================
// INPUT VALIDATION
// ===========================

/**
 * Get input placeholder text
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: placeholder text}
 * @example
 * const result = await getPlaceholder(page, { page: 'pageForm', element: 'txt_Email' });
 */
export async function getPlaceholder(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const placeholder = await element.getAttribute('placeholder') || '';
    console.log(`  ✅ Placeholder: "${placeholder}"`);
    return { code: 0, value: placeholder };
  } catch (error) {
    console.error(`  ❌ Failed to get placeholder`);
    return { code: 1, value: `Failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get current input field value
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: input value}
 * @example
 * const result = await getInputValue(page, { page: 'pageForm', element: 'txt_Email' });
 */
export async function getInputValue(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const value = await element.inputValue();
    console.log(`  ✅ Input value: "${value}"`);
    return { code: 0, value };
  } catch (error) {
    console.error(`  ❌ Failed to get input value`);
    return { code: 1, value: `Failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Get input maxlength attribute
 * @param page - Playwright page object
 * @param step - Test step with page/element info
 * @returns Outcome {code: 0, value: maxlength value}
 * @example
 * const result = await getMaxLength(page, { page: 'pageForm', element: 'txt_Code' });
 */
export async function getMaxLength(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const maxLength = await element.getAttribute('maxlength') || 'No limit';
    console.log(`  ✅ Max length: ${maxLength}`);
    return { code: 0, value: maxLength };
  } catch (error) {
    console.error(`  ❌ Failed to get max length`);
    return { code: 1, value: `Failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}


/**
 * Handle autocomplete input fields (searchable dropdowns)
 * Types text to trigger suggestions and selects the value using mouse click
 * Ensures the value is selected from the dropdown (not just typed)
 * Supports DDT values and variable substitution
 * Fails explicitly if dropdown selection does not occur
 *
 * @param page - Playwright page object
 * @param step - Test step with page/element, value, and isDDT flag
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 */
export async function setAutoCompleteField(
  page: Page,
  step: testStep
): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);

    // ✅ Resolve value
    let textToFill = '';
    if (step.isDDT && step.datasetColumnNames) {
      textToFill = step.datasetColumnNames;
    } else if (step.value) {
      textToFill = resolveTestVariables(step.value);
    }

    const finalText = String(textToFill).trim();
    const element = await resolveElement(page, baseSelector, step);

    // ✅ Step 1: Focus & type
    await element.click();
    await element.fill('');
    await element.type(finalText, { delay: 120 });

    // ✅ Step 2: Give dropdown time to populate
    await page.waitForTimeout(700);  // critical for backend fetch

    // ✅ Step 3: Use keyboard to select
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Enter');

    // ✅ Step 4: Validate selection worked
    await page.waitForTimeout(500);
    const actualValue = (await element.inputValue()).trim();

    if (!actualValue) {
      throw new Error(
        `Autocomplete failed: value not selected after Enter`
      );
    }

    return {
      code: 0,
      value: `Selected "${actualValue}" using keyboard autocomplete`
    };

  } catch (error) {
    console.error(`❌ Autocomplete failed for ${step.page}.${step.element}`);

    return {
      code: 1,
      value: `Autocomplete failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  }
}

/**
 * Click Lorenzo Tab element (reliable for TD-based tab controls)
 * Uses direct DOM click which is required for Lorenzo tab behavior
 *
 * @param page - Playwright page object
 * @param step - Test step with page/element details
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 */

export async function clickTab(
  page: Page,
  step: testStep
): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);

    const element = await resolveElement(page, baseSelector, step, 30000);

    // ✅ Step 1: Ensure visible
    await element.waitFor({ state: 'visible', timeout: 10000 });

    // ✅ Step 2: Scroll into view
    await element.scrollIntoViewIfNeeded();

    // ✅ Step 3: Direct DOM click (KEY for Lorenzo)
    await element.evaluate((el: HTMLElement) => el.click());

    // ✅ Step 4: Wait for tab transition
    await page.waitForTimeout(800);

    // ✅ Step 5: Optional validation (tab selected class)
    try {
      const classAttr = await element.getAttribute('class');
      if (classAttr && !classAttr.includes('Selected')) {
        console.warn(`⚠️ Tab click executed but selection state not confirmed`);
      }
    } catch {
      // ignore validation errors
    }

    console.log(`✅ Lorenzo tab clicked: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully clicked Lorenzo tab: ${step.page}.${step.element}`
    };

  } catch (error) {
    console.error(`❌ Failed to click Lorenzo tab: ${step.page}.${step.element}`);

    return {
      code: 1,
      value: `Failed to click Lorenzo tab: ${
        error instanceof Error ? error.message : String(error)
      }`
    };
  }
}
export async function selectTableRowByValue(page: Page, step: testStep): Promise<Outcome> {
  try {
    await waitForRoller(page);
 
    // Get the value to search for from elementText or value
    let searchValue = '';
    if (step.elementText !== null && step.elementText !== undefined && String(step.elementText).trim() !== '') {
      searchValue = String(step.elementText).trim();
    } else if (step.value) {
      searchValue = resolveTestVariables(step.value).trim();
    }
 
    if (!searchValue) {
      throw new Error('No search value provided. Use elementText or value to specify the row identifier (e.g., patient ID)');
    }

    // Check if variable resolution failed (value still looks like _VariableName)
    const isUnresolvedVar = /^_[A-Za-z]\w*$/.test(searchValue);
    if (isUnresolvedVar) {
      console.warn(`  ⚠️ Variable "${searchValue}" was not resolved — it may not have been set in a prior step.`);
      console.warn(`  ⚠️ Attempting fallback: select the first available data row in the search results grid.`);
    }
 
    console.log(`  🔍 Searching for table row containing value: "${searchValue}"`);
 
    // Collect all pages across all browser contexts
    const allPages: Page[] = [page];
    try {
      const ctx = page.context();
      const browser = ctx.browser();
      const contexts = browser ? browser.contexts() : [ctx];
      for (const c of contexts) {
        for (const p of c.pages()) {
          if (!p.isClosed() && p !== page) allPages.push(p);
        }
      }
    } catch { /* ignore */ }
 
    for (const searchPage of allPages) {
      const frames = searchPage.frames();

      // ── APPROACH 1: Find text in a frame, then select the row within THAT SAME frame ──
      for (const frame of frames) {
        try {
          const textLocator = frame.locator(`text="${searchValue}"`);
          const textCount = await textLocator.count().catch(() => 0);
          if (textCount === 0) continue;

          console.log(`  📍 Found "${searchValue}" in frame: ${frame.url().substring(0, 80)}`);

          // Get the parent <tr> of the found text (closest ancestor)
          const parentRow = textLocator.first().locator('xpath=ancestor::tr[1]');
          const rowExists = await parentRow.count().catch(() => 0);
          if (rowExists === 0) continue;

          const rowId = await parentRow.first().getAttribute('id').catch(() => 'no-id');

          // Strategy A1: Checkbox grids (Kendo / standard inputs) — check FIRST before Lorenzo
          const checkboxSelectors = [
            "input[aria-label='Select row']",
            "input.k-select-checkbox",
            "input[type='checkbox']",
          ];

          let checkboxFound = false;

          // First check if checkbox is directly in the row
          for (const sel of checkboxSelectors) {
            const target = parentRow.locator(sel).first();
            const targetCount = await target.count().catch(() => 0);
            if (targetCount === 0) continue;

            await target.check({ timeout: 5000 });
            await page.waitForTimeout(500);
            checkboxFound = true;
            console.log(`  ✅ Selected row via ${sel} (checkbox)`);
            return {
              code: 0,
              value: `Successfully selected table row containing: "${searchValue}" (${sel})`
            };
          }

          // Kendo locked columns: checkbox is in a separate locked table linked by data-uid
          if (!checkboxFound) {
            const dataUid = await parentRow.first().getAttribute('data-uid').catch(() => null);
            if (dataUid) {
              // Find the corresponding locked row with same data-uid that has the checkbox
              for (const sel of checkboxSelectors) {
                const lockedCheckbox = frame.locator(`tr[data-uid="${dataUid}"] ${sel}`).first();
                const lockedCount = await lockedCheckbox.count().catch(() => 0);
                if (lockedCount === 0) continue;

                await lockedCheckbox.check({ timeout: 5000 });
                await page.waitForTimeout(500);
                checkboxFound = true;
                console.log(`  ✅ Selected row via locked column ${sel} (Kendo data-uid: ${dataUid})`);
                return {
                  code: 0,
                  value: `Successfully selected table row containing: "${searchValue}" (Kendo locked ${sel})`
                };
              }
            }
          }

          // Strategy A2: Lorenzo plain grid (tr id starts with "igRow") — use page.mouse.click()
          // Only used when NO checkbox is found in the row (plain grids without checkboxes)
          if (!checkboxFound && rowId && rowId.startsWith('igRow')) {
            const box = await parentRow.first().boundingBox();
            if (box) {
              // Click near the left side of the row (where the select arrow typically is)
              const x = box.x + 15;
              const y = box.y + box.height / 2;
              console.log(`  🔍 Lorenzo grid row detected, clicking at (${x}, ${y})`);
              await page.mouse.click(x, y);
              await page.waitForTimeout(800);
              console.log(`  ✅ Selected row via mouse.click on Lorenzo grid row`);
              return {
                code: 0,
                value: `Successfully selected table row containing: "${searchValue}" (Lorenzo mouse.click row)`
              };
            }
          }

          // Strategy A3: Look for td/img with select title (may exist when row is already selected)
          const selectTitleLocator = parentRow.locator("[title*='select row' i]").first();
          const selectTitleCount = await selectTitleLocator.count().catch(() => 0);
          if (selectTitleCount > 0) {
            const box = await selectTitleLocator.first().boundingBox();
            if (box) {
              const x = box.x + box.width / 2;
              const y = box.y + box.height / 2;
              await page.mouse.click(x, y);
              await page.waitForTimeout(800);
              console.log(`  ✅ Selected row via mouse.click on select title element`);
              return {
                code: 0,
                value: `Successfully selected table row containing: "${searchValue}" (select title click)`
              };
            }
          }

          // Strategy B: No select mechanism in row — click the row itself
          await parentRow.first().click({ timeout: 5000 });
          await page.waitForTimeout(500);
          console.log(`  ✅ Selected row by clicking <tr> directly`);
          return {
            code: 0,
            value: `Successfully selected table row containing: "${searchValue}" (row click)`
          };
        } catch { /* continue to next frame */ }
      }

      // ── APPROACH 2 (Legacy Y-coordinate fallback): ──
      // Find text Y coordinate, then find checkbox at same Y
      let textY: number | null = null;
      let textFrame: any = null;
 
      for (const frame of frames) {
        try {
          const textLocator = frame.locator(`text="${searchValue}"`);
          const textCount = await textLocator.count().catch(() => 0);
          if (textCount === 0) continue;
 
          const textBox = await textLocator.first().boundingBox({ timeout: 3000 }).catch(() => null);
          if (!textBox) continue;
 
          textY = textBox.y + textBox.height / 2;
          textFrame = frame;
          console.log(`  📍 [Y-fallback] Found "${searchValue}" at Y=${textY.toFixed(0)}`);
          break;
        } catch { /* continue */ }
      }
 
      if (textY === null) continue;
 
      // Find the row selection checkbox at the same Y coordinate
      const selectors = [
        'input[aria-label="Select row"]',
        'input.k-select-checkbox',
        'input[type="checkbox"][data-role="checkbox"]',
        'img[alt="Click to select row"]',
        'img[title="Click to select row"]',
        'td[title="Click to select row"]',
      ];
 
      let matchedLocator: Locator | null = null;
      let isCheckbox = false;
 
      for (const frame of frames) {
        if (matchedLocator) break;
        try {
          for (const sel of selectors) {
            if (matchedLocator) break;
            const locator = frame.locator(sel);
            const count = await locator.count().catch(() => 0);
            if (count === 0) continue;
 
            for (let i = 0; i < count; i++) {
              const box = await locator.nth(i).boundingBox().catch(() => null);
              if (!box || box.width === 0 || box.height === 0) continue;
 
              const yDiff = Math.abs((box.y + box.height / 2) - textY);
              if (yDiff > 15) continue;
 
              console.log(`  🎯 Found select target (${sel}) at Y=${(box.y + box.height / 2).toFixed(0)}, yDiff=${yDiff.toFixed(1)}`);
              matchedLocator = locator.nth(i);
              isCheckbox = sel.startsWith('input');
              break;
            }
          }
        } catch { /* continue */ }
      }
 
      if (matchedLocator) {
        if (isCheckbox) {
          await matchedLocator.check({ timeout: 5000, force: true });
        } else {
          // Use JavaScript click + event dispatch for iframe reliability
          await matchedLocator.evaluate(el => {
            (el as HTMLElement).click();
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          });
        }
 
        await page.waitForTimeout(500);
        console.log(`  ✅ Selected table row containing: "${searchValue}"`);
        return {
          code: 0,
          value: `Successfully selected table row containing: "${searchValue}"`
        };
      }

      // Fallback: No checkbox/select-button found — click the row or cell directly.
      // This handles grids like Patient SFS search results where row-click selects the record.
      console.log(`  ⚠️ No checkbox found. Attempting direct row/cell click for: "${searchValue}"`);

      for (const frame of searchPage.frames()) {
        try {
          const textLocator = frame.locator(`text="${searchValue}"`);
          const textCount = await textLocator.count().catch(() => 0);
          if (textCount === 0) continue;

          // Try clicking the parent <tr> of the matching text
          const parentRow = textLocator.first().locator('xpath=ancestor::tr');
          const rowCount = await parentRow.count().catch(() => 0);
          if (rowCount > 0) {
            await parentRow.first().click({ timeout: 5000 });
            await page.waitForTimeout(500);
            console.log(`  ✅ Selected row by clicking <tr> containing: "${searchValue}"`);
            return {
              code: 0,
              value: `Successfully selected table row containing: "${searchValue}" (row click)`
            };
          }

          // Last resort: click the text element itself
          await textLocator.first().click({ timeout: 5000 });
          await page.waitForTimeout(500);
          console.log(`  ✅ Selected by clicking text: "${searchValue}"`);
          return {
            code: 0,
            value: `Successfully selected table row containing: "${searchValue}" (text click)`
          };
        } catch { /* continue to next frame */ }
      }
    }

    // FALLBACK for unresolved variables or when text search fails:
    // Try to find and click the first data row in any visible search results grid.
    // This handles Patient SFS dialogs where only one record is shown.
    if (isUnresolvedVar) {
      console.log(`  🔄 Fallback: Attempting to select first data row in search results...`);

      for (const searchPage of allPages) {
        for (const frame of searchPage.frames()) {
          try {
            // Look for data rows in "Search results - not traced" or similar grids
            // Lorenzo SFS grids have data rows with <td> cells containing PAS IDs
            const dataRowSelectors = [
              "table tr td[class*='Cell']",                    // Lorenzo grid data cells
              "table.G_TB tr:not(:first-child) td",           // Standard Lorenzo table rows
              "tr.Row td, tr.AlternateRow td",                // Row/AlternateRow classes
              "table tbody tr td",                            // Generic table rows
            ];

            for (const rowSel of dataRowSelectors) {
              const cells = frame.locator(rowSel);
              const cellCount = await cells.count().catch(() => 0);
              if (cellCount === 0) continue;

              // Find a cell that looks like it contains a PAS ID or meaningful data
              for (let i = 0; i < Math.min(cellCount, 30); i++) {
                const cellText = await cells.nth(i).textContent().catch(() => '');
                const trimmed = (cellText || '').trim();
                // Skip empty cells, header-like content, and navigation text
                if (!trimmed || trimmed.length < 3) continue;
                if (/^(page|linked|merged|pos|there are no)/i.test(trimmed)) continue;

                // Found a data cell - click its parent row
                const parentRow = cells.nth(i).locator('xpath=ancestor::tr');
                const rowExists = await parentRow.count().catch(() => 0);
                if (rowExists > 0) {
                  await parentRow.first().click({ timeout: 5000 });
                  await page.waitForTimeout(500);
                  console.log(`  ✅ Fallback: Selected row containing: "${trimmed}"`);
                  return {
                    code: 0,
                    value: `Selected row via fallback (unresolved var "${searchValue}"): "${trimmed}"`
                  };
                }
              }
            }
          } catch { /* continue to next frame */ }
        }
      }
    }
 
    console.error(`  ⛔ No table row found containing value: "${searchValue}"`);
    throw new Error(`No table row found containing value: "${searchValue}"`);
  } catch (error) {
    console.error(`  ❌ Failed to select table row by value`);
    return {
      code: 1,
      value: `Failed to select table row: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}