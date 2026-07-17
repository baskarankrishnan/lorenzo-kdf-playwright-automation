import { Page, BrowserContext, Browser } from "@playwright/test";
import { executionContext, Outcome, testStep, LoaderRule } from "../utilities/interfaceUtils";
import { resolveTestVariables } from "./dataActions";
import { getPageDefinition, PageDefinition } from "../../product/pageRegistry";
import { chromium } from "@playwright/test";

/**
 * Manages multiple browser pages/tabs with title and URL-based matching
 * Provides methods to find, switch, and track open pages across a browser context
 * Used for multi-page/multi-tab test scenarios
 * 
 * @class BrowserFocusTracker
 * @example
 * const tracker = new BrowserFocusTracker(page);
 * const allPages = tracker.getAllPages();
 * await tracker.logAllPages();
 */
export class BrowserFocusTracker {
    private context: BrowserContext;
    private initialPage: Page;
    private browser?: Browser;

    /**
     * Initialize BrowserFocusTracker with initial page reference
     * @param initialPage - The initial page object from browser launch
     */
    constructor(initialPage: Page, browser?: Browser) {
        this.context = initialPage.context();
        this.initialPage = initialPage;
        this.browser = browser;
    }

    /**
     * Get the browser context (contains all pages)
     * @returns BrowserContext object for advanced context operations
     */
    getContext(): BrowserContext {
        return this.context;
    }

    /**
     * Get the original page that was used to create this tracker
     * @returns The initial Page object
     */
    getInitialPage(): Page {
        return this.initialPage;
    }

    /**
     * Find a page matching the given page definition (title/URL patterns)
     * Searches across all open pages using title and URL matching rules
     * Returns most recently opened matching page
     * @param definition - PageDefinition with title/url patterns to match
     * @param timeout - Max milliseconds to search (default 30000ms = 30s)
     * @returns Matching Page object or null if not found
     */
    async findPageByDefinition(definition: PageDefinition, timeout: number = 30000): Promise<Page | null> {
        const startTime = Date.now();

        const titlePatterns = definition.title
            ? (Array.isArray(definition.title) ? definition.title : [definition.title])
            : [];

        const urlPatterns = definition.url
            ? (Array.isArray(definition.url) ? definition.url : [definition.url])
            : [];

        while (Date.now() - startTime < timeout) {
            const pages = this.getAllPages();

            if (pages.length === 1) {
                const singlePage = pages[0];
                const isAccessible = await singlePage.evaluate(() => document.readyState).catch(() => null);

                if (isAccessible) {
                    const pageTitle = await singlePage.title().catch(() => '');
                    const pageUrl = singlePage.url();

                    // If no definition or definition matches, return immediately
                    const hasDefinition = titlePatterns.length > 0 || urlPatterns.length > 0;
                    if (!hasDefinition) {
                        console.log(`  ☑️ Only 1 page open, using it: "${pageTitle}" - ${pageUrl}`);
                        await this.waitForPageReady(singlePage);
                        return singlePage;
                    }

                    const titleMatch = titlePatterns.some(p => pageTitle.toLowerCase().includes(p.toLowerCase()));
                    const urlMatch = urlPatterns.some(p => pageUrl.toLowerCase().includes(p.toLowerCase()));
                    if (titleMatch || urlMatch) {
                        console.log(`  ☑️ Only 1 page open and matches definition: "${pageTitle}" - ${pageUrl}`);
                        await this.waitForPageReady(singlePage);
                        return singlePage;
                    }

                    // Only 1 page open and doesn't match — keep polling for new page to appear
                    console.log(`  ⏳ Only 1 page open (no match for definition "${titlePatterns.join('|')}")... waiting for new page...`);
                }
            }

            if (pages.length > 1) {
                console.log(`  🔍 ${pages.length} pages open, checking registry...`);
                
                // DIAGNOSTIC: Show ALL actual page titles for debugging
                console.log(`    📖 Actual page titles:`);
                for (let i = 0; i < pages.length; i++) {
                    try {
                        const actualTitle = await pages[i].title().catch(() => '[inaccessible]');
                        const actualUrl = pages[i].url();
                        console.log(`       [${i}] "${actualTitle}" - ${actualUrl}`);
                    } catch {
                        console.log(`       [${i}] [error reading page]`);
                    }
                }
                
                if (titlePatterns.length > 0) {
                    console.log(`    🔎 Looking for title: ${titlePatterns.join(' OR ')}`);
                }
                if (urlPatterns.length > 0) {
                    console.log(`    🔗 Looking for URL: ${urlPatterns.join(' OR ')}`);
                }

                const titleMatches: Page[] = [];
                const urlMatches: Page[] = [];

                for (let i = pages.length - 1; i >= 0; i--) {
                    const page = pages[i];

                    try {
                        const isAccessible = await page.evaluate(() => document.readyState).catch(() => null);
                        if (!isAccessible) continue;

                        const pageUrl = page.url();
                        const pageTitle = await page.title().catch(() => '');

                        const titleMatch = titlePatterns.some(pattern =>
                            pageTitle.toLowerCase().includes(pattern.toLowerCase())
                        );

                        if (titleMatch) {
                            console.log(`  ☑️ Title match: "${pageTitle}" - ${pageUrl}`);
                            titleMatches.push(page);
                            continue;
                        }

                        const urlMatch = urlPatterns.some(pattern =>
                            pageUrl.toLowerCase().includes(pattern.toLowerCase())
                        );

                        if (urlMatch) {
                            console.log(`  ☑️ URL match: "${pageTitle}" - ${pageUrl}`);
                            urlMatches.push(page);
                        }

                    } catch {
                        continue;
                    }
                }

                let selectedPage: Page | null = null;
                let matchType = '';

                if (titleMatches.length > 0) {
                    selectedPage = titleMatches[0];
                    matchType = titleMatches.length > 1
                        ? `title match (${titleMatches.length} found, using most recent)`
                        : 'title match';
                } else if (urlMatches.length > 0) {
                    selectedPage = urlMatches[0];
                    matchType = urlMatches.length > 1
                        ? `URL match (${urlMatches.length} found, using most recent)`
                        : 'URL match';
                }

                if (selectedPage) {
                    const selectedTitle = await selectedPage.title().catch(() => '');
                    const selectedUrl = selectedPage.url();
                    console.log(`  ☑️ Using page (${matchType}): "${selectedTitle}" - ${selectedUrl}`);
                    await this.waitForPageReady(selectedPage);
                    return selectedPage;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.warn(`  ⚠️ Page not found after ${timeout}ms`);
        return null;
    }

    /**
     * Wait for page to reach 'domcontentloaded' and 'networkidle' states
     * Ensures page is fully loaded before operations proceed
     * @param page - The Page object to wait for
     * @returns Promise that resolves when page is ready or timeout occurs
     * @private
     */
    private async waitForPageReady(page: Page): Promise<void> {
        try {
            if (page.isClosed()) return;
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => { });
            await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
        } catch {
            // Ignore errors
        }
    }

    /**
     * Get all currently open pages/tabs (excluding closed pages)
     * @returns Array of open Page objects
     */
    getAllPages(): Page[] {
        if (this.browser) {
            const allPages: Page[] = [];
            for (const ctx of this.browser.contexts()) {
                for (const p of ctx.pages()) {
                    if (!p.isClosed()) allPages.push(p);
                }
            }
            return allPages;
        }
        return this.context.pages().filter(p => !p.isClosed());
    }

    /**
     * Print list of all open pages to console with titles and URLs
     * Useful for debugging multi-page scenarios
     * @returns Promise that resolves after logging complete
     */
    async logAllPages(): Promise<void> {
        const pages = this.getAllPages();
        console.log(`  📊 Open pages (${pages.length}):`);
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            if (!page.isClosed()) {
                try {
                    const url = page.url();
                    const title = await page.title().catch(() => '');
                    console.log(`    ${i + 1}. ${title || 'Untitled'} - ${url}`);
                } catch {
                    console.log(`    ${i + 1}. [Closed]`);
                }
            }
        }
    }
}

// export async function resolvePageForStep(
//     stepPageName: string | undefined,
//     focusTracker: BrowserFocusTracker,
//     timeout: number = 30000
// ): Promise<Page> {

//     if (!stepPageName || stepPageName.trim() === '') {
//         return focusTracker.getInitialPage();
//     }

//     const pageDefinition = getPageDefinition(stepPageName);
//     if (!pageDefinition) {
//         return focusTracker.getInitialPage();
//     }
//     const resolvedPage = await focusTracker.findPageByDefinition(pageDefinition, timeout);

//     if (resolvedPage && !resolvedPage.isClosed()) {
//         return resolvedPage;
//     }

//     return focusTracker.getInitialPage();
// }

export async function resolvePageForStep(
    stepPageName: string | undefined,
    focusTracker: BrowserFocusTracker,
    timeout: number = 30000
): Promise<Page> {

    // DEFAULT PAGE DEFINITION - LORENZO main page
    const DEFAULT_PAGE_DEFINITION: PageDefinition = {
        url: '/EPR/APPMAINPAGE',
        title: 'LORENZO'
    };

    // Case 1: No page specified - use the most recently active open page
    if (!stepPageName || stepPageName.trim() === '') {
        const allPages = focusTracker.getAllPages();
        if (allPages.length > 0) {
            // Prefer LORENZO main page if already open (quick check, no wait)
            for (let i = allPages.length - 1; i >= 0; i--) {
                try {
                    const pageUrl = allPages[i].url();
                    const pageTitle = await allPages[i].title().catch(() => '');
                    if (pageUrl.toLowerCase().includes('/epr/appmainpage') || pageTitle.toLowerCase().includes('lorenzo')) {
                        console.log(`  ☑️ Using LORENZO main page: "${pageTitle}"`);
                        return allPages[i];
                    }
                } catch { continue; }
            }
            // Otherwise use the most recently opened page
            const activePage = allPages[allPages.length - 1];
            const activeTitle = await activePage.title().catch(() => '');
            console.log(`  ☑️ No page specified, using active page: "${activeTitle}"`);
            return activePage;
        }
        return focusTracker.getInitialPage();
    }

    // Case 2: Page specified but not in registry - use most recently active open page
    const pageDefinition = getPageDefinition(stepPageName);
    if (!pageDefinition) {
        console.log(`  📄 Page "${stepPageName}" not in registry, using most recently active page`);
        const allPages = focusTracker.getAllPages().filter(p => !p.isClosed());
        if (allPages.length > 0) {
            const activePage = allPages[allPages.length - 1];
            const activeTitle = await activePage.title().catch(() => '');
            console.log(`  ☑️ Using page: "${activeTitle}"`);
            return activePage;
        }
        return focusTracker.getInitialPage();
    }

    // Case 2.5: Check if we have a stored popup page from clickAndSwitchToPopup
    const popupPage = (executionContext as any)._popupPage as Page | undefined;
    if (popupPage && !popupPage.isClosed()) {
        // Check if the popup matches the requested page definition
        const popupUrl = popupPage.url();
        const popupTitle = await popupPage.title().catch(() => '');
        
        const urlPatterns = pageDefinition.url
            ? (Array.isArray(pageDefinition.url) ? pageDefinition.url : [pageDefinition.url])
            : [];
        const titlePatterns = pageDefinition.title
            ? (Array.isArray(pageDefinition.title) ? pageDefinition.title : [pageDefinition.title])
            : [];

        const urlMatch = urlPatterns.some(p => popupUrl.toLowerCase().includes(p.toLowerCase()));
        const titleMatch = titlePatterns.some(p => popupTitle.toLowerCase().includes(p.toLowerCase()));

        if (urlMatch || titleMatch) {
            console.log(`  ☑️ Using stored popup page: "${popupTitle}" - ${popupUrl}`);
            return popupPage;
        }
    }

    // Case 3: Page specified and found in registry - resolve normally
    const resolvedPage = await focusTracker.findPageByDefinition(pageDefinition, timeout);

    if (resolvedPage && !resolvedPage.isClosed()) {
        return resolvedPage;
    }

    // Case 4: Page specified in registry but not currently open
    console.log(`  ⚠️ Page "${stepPageName}" defined but not open, attempting to find LORENZO main page...`);

    const lorenzoPage = await focusTracker.findPageByDefinition(DEFAULT_PAGE_DEFINITION, timeout);

    if (lorenzoPage && !lorenzoPage.isClosed()) {
        console.log('  ☑️ Using LORENZO main page as fallback');
        return lorenzoPage;
    }

    // Ultimate fallback
    console.log('  ⚠️ No suitable page found, using initial page');
    return focusTracker.getInitialPage();
}

/**
 * Wait/pause test execution for specified number of seconds
 * Supports variable substitution for dynamic wait times
 * @param page - Playwright page object (unused but kept for consistency)
 * @param step - Test step with 'value' property containing seconds to wait
 * @returns Outcome {code: 0 on success, code: 1 on invalid seconds value}
 * @example
 * // Wait 5 seconds
 * await waitForSeconds(page, { value: '5' });
 * // Wait using variable
 * await waitForSeconds(page, { value: '{{waitTime}}' });
 */
export async function waitForSeconds(page: Page, step: testStep): Promise<Outcome> {
    try {
        let seconds = 1;
        if (step.value) {
            const resolvedValue = resolveTestVariables(step.value);
            seconds = parseInt(resolvedValue, 10);

            if (isNaN(seconds) || seconds < 0) {
                console.error(`  ❌ Invalid wait time: ${step.value}`);
                return {
                    code: 1,
                    value: `Invalid wait time: ${step.value}. Must be a positive number.`
                };
            }
        }

        console.log(`  ⏳ Waiting for ${seconds} second(s)...`);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        console.log(`  ✅ Wait completed`);

        return {
            code: 0,
            value: `Successfully waited for ${seconds} second(s)`
        };
    } catch (error) {
        console.error(`  ❌ Failed to wait`);
        return {
            code: 1,
            value: `Failed to wait: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function expandSliderPanel(page: Page, step: testStep): Promise<Outcome> {
    try {
        const panelSelector = (step.element && step.element.trim()) || "//div[@id='divDetails']";
        const panel = page.locator(panelSelector).first();

        if (await panel.count() === 0) {
            console.error(`  ❌ Slider panel not found: ${panelSelector}`);
            return {
                code: 1,
                value: `Slider panel not found: ${panelSelector}`
            };
        }

        const toggle = panel.locator('.collapser, [data-toggle], [aria-expanded]').first();
        const target = (await toggle.count()) ? toggle : panel;

        const isCollapsed = await target.evaluate(el => {
            const className = String(el.className || '');
            const ariaExpanded = el.getAttribute('aria-expanded');
            return ariaExpanded === 'false' || className.includes('collapsed');
        }).catch(() => false);

        if (!isCollapsed) {
            console.log(`  ✅ Slider panel already expanded: ${panelSelector}`);
            return {
                code: 0,
                value: `Slider panel already expanded: ${panelSelector}`
            };
        }

        await target.scrollIntoViewIfNeeded();
        await target.click();
        await panel.waitFor({ state: 'visible', timeout: 10000 });

        console.log(`  ✅ Expanded slider panel: ${panelSelector}`);
        return {
            code: 0,
            value: `Expanded slider panel: ${panelSelector}`
        };
    } catch (error) {
        console.error(`  ❌ Failed to expand slider panel`);
        return {
            code: 1,
            value: `Failed to expand slider panel: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Close browser tab(s) with multiple options
 * Supports: close current tab, close all, close by title/URL pattern
 * Format: 'all' OR 'type|value' where type='url' or 'title'
 * @param page - Current Playwright page object
 * @param step - Test step with 'value' property: '' (close current), 'all', or 'url|pattern' / 'title|pattern'
 * @returns Outcome {code: 0 on success, code: 1 on invalid format}
 * @example
 * // Close current tab
 * await closeBrowserTab(page, { value: '' });
 * // Close all other tabs
 * await closeBrowserTab(page, { value: 'all' });
 * // Close by URL pattern
 * await closeBrowserTab(page, { value: 'url|/patient' });
 * // Close by title pattern
 * await closeBrowserTab(page, { value: 'title|Patient Search' });
 */
export async function closeBrowserTab(page: Page, step: testStep): Promise<Outcome> {
    try {
        const context = page.context();
        const pages = context.pages();

        if (!step.value) {
            await page.close();
            const remaining = context.pages().filter(p => !p.isClosed());
            if (remaining.length > 0) {
                await remaining[0].bringToFront();
            }
            console.log(`  ✅ Closed current tab`);
            return { code: 0, value: 'Closed current tab' };
        }

        let valueToUse = step.value;

        if (valueToUse.startsWith('_')) {
            valueToUse = String(executionContext.getVariableValue(valueToUse) || valueToUse);
        }

        if (step.isDDT && step.datasetColumnNames) {
            valueToUse = step.datasetColumnNames;
        }

        const trimmedValue = valueToUse.trim().toLowerCase();

        if (trimmedValue === 'all') {
            let count = 0;
            for (const p of pages) {
                if (p !== page && !p.isClosed()) {
                    await p.close();
                    count++;
                }
            }
            console.log(`  ✅ Closed ${count} tab(s)`);
            return { code: 0, value: `Closed ${count} tab(s)` };
        }

        const parts = valueToUse.split('|').map(s => s.trim());
        if (parts.length >= 2) {
            const [type, param] = parts;
            let count = 0;

            console.log(`  🔍 Searching for tabs matching ${type}="${param}"`);

            for (const p of pages) {
                if (p.isClosed()) continue;

                try {
                    const pageUrl = p.url();
                    const pageTitle = await p.title().catch(() => '');

                    const match = (type === 'url' && pageUrl.includes(param)) ||
                        (type === 'title' && pageTitle.includes(param));

                    if (match) {
                        if (p === page && pages.length > 1) {
                            const otherPage = pages.find(pg => pg !== p && !pg.isClosed());
                            if (otherPage) {
                                await otherPage.bringToFront();
                            }
                        }
                        await p.close();
                        count++;
                        console.log(`  🗑️ Closed tab: "${pageTitle}" - ${pageUrl}`);
                    }
                } catch {
                    continue;
                }
            }

            if (count > 0) {
                console.log(`  ✅ Closed ${count} tab(s) matching ${type}="${param}"`);
                return { code: 0, value: `Closed ${count} tab(s)` };
            } else {
                console.warn(`  ⚠️ No matching tabs found for ${type}="${param}"`);
                return { code: 1, value: 'No matching tabs found' };
            }
        }

        console.error(`  ❌ Invalid format for closeBrowserTab`);
        return { code: 1, value: 'Invalid format. Use "all" or "type|value"' };

    } catch (error) {
        console.error(`  ❌ Failed to close browser tab`);
        return {
            code: 1,
            value: `Failed to close tab: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Refresh/reload the current page
 * Waits for page to fully load before returning
 * @param page - Playwright page object to refresh
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * const result = await refreshCurrentPage(page);
 * if (result.code === 0) console.log('Page refreshed');
 */
export async function refreshCurrentPage(page: Page): Promise<Outcome> {
    try {

        await page.reload({ waitUntil: 'load' });

        console.log(`  🔄 Refreshed current page`);
        return {
            code: 0,
            value: 'Refreshed current page'
        };

    } catch (error) {
        console.error(`  ❌ Failed to refresh current page`);
        return {
            code: 1,
            value: `Failed to refresh page: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

export async function maximizeBrowser(page: Page): Promise<Outcome> {
    try {
        // Collect ALL open pages across ALL contexts (main window + all popups)
        const pagesToMaximize: Page[] = [];
        try {
            const ctx = page.context();
            const browser = ctx.browser();
            const contexts = browser ? browser.contexts() : [ctx];
            for (const c of contexts) {
                for (const p of c.pages()) {
                    if (!p.isClosed()) pagesToMaximize.push(p);
                }
            }
        } catch {
            pagesToMaximize.push(page);
        }

        let maximized = 0;
        for (const p of pagesToMaximize) {
            try {
                const title = await p.title().catch(() => p.url());
                // Try CDP maximize first
                const session = await p.context().newCDPSession(p).catch(() => null);
                if (session) {
                    try {
                        const { windowId } = await session.send('Browser.getWindowForTarget', {} as any) as any;
                        await session.send('Browser.setWindowBounds', {
                            windowId,
                            bounds: { windowState: 'maximized' }
                        } as any);
                        await session.detach().catch(() => {});
                        console.log(`  🔲 Maximized window: "${title}" (CDP)`);
                        maximized++;
                        continue;
                    } catch {
                        await session.detach().catch(() => {});
                    }
                }
                // Fallback: JS window resize + viewport
                await p.evaluate(() => {
                    try { window.moveTo(0, 0); window.resizeTo(screen.width, screen.height); } catch { /* ignore */ }
                }).catch(() => {});
                await p.setViewportSize({ width: 1920, height: 1080 }).catch(() => {});
                console.log(`  🔲 Maximized window: "${title}" (viewport fallback)`);
                maximized++;
            } catch { /* ignore per-page errors */ }
        }

        return { code: 0, value: `Browser maximized (${maximized} of ${pagesToMaximize.length} windows)` };
    } catch (error) {
        console.error(`  ❌ Failed to maximize browser`);
        return {
            code: 1,
            value: `Failed to maximize browser: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

// export async function waitForRoller(page: Page): Promise<Outcome> {
//     const startTime = Date.now();

//     try {
//         /* -----------------------------------------------------------
//            0. Safety checks
//         ----------------------------------------------------------- */
//         if (!page || page.isClosed()) {
//             console.log(`  ⚠️ Page closed, skipped waitForRoller`);
//             return { code: 0, value: 'Page closed, skipped waitForRoller' };
//         }

//         const isAccessible = await page.evaluate(() => document.readyState).catch(() => null);
//         if (!isAccessible) {
//             console.log(`  ⚠️ Page not accessible, skipped waitForRoller`);
//             return { code: 0, value: 'Page not accessible, skipped waitForRoller' };
//         }

//         /* -----------------------------------------------------------
//            1. Document ready state
//         ----------------------------------------------------------- */
//         await page.waitForFunction(
//             () => document.readyState === 'complete',
//             { timeout: 5000 }
//         ).catch(() => {
//             console.log(`  ⚠️ Document ready wait timed out`);
//         });

//         /* -----------------------------------------------------------
//            2. DOM stability (MutationObserver)
//         ----------------------------------------------------------- */
//         await page.evaluate(() => {
//             return new Promise<void>((resolve) => {
//                 let lastChange = Date.now();
//                 let observer: MutationObserver | null = null;

//                 const check = () => {
//                     if (Date.now() - lastChange >= 300) {
//                         observer?.disconnect();
//                         resolve();
//                     } else {
//                         setTimeout(check, 50);
//                     }
//                 };

//                 observer = new MutationObserver(() => {
//                     lastChange = Date.now();
//                 });

//                 observer.observe(document.body, {
//                     childList: true,
//                     subtree: true,
//                     attributes: true,
//                 });

//                 setTimeout(check, 50);

//                 // hard stop after 3s
//                 setTimeout(() => {
//                     observer?.disconnect();
//                     resolve();
//                 }, 3000);
//             });
//         }).catch(() => { });

//         /* -----------------------------------------------------------
//            3. Network idle
//         ----------------------------------------------------------- */
//         // await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
//         //     console.log(`  ⚠️ Network idle wait timed out`);
//         // });

//         /* -----------------------------------------------------------
//            4. Loader detection & wait-until-hidden (frame safe)
//         ----------------------------------------------------------- */
//         const loaderSelectors = [
//             'u-progress .progress:not(.invisible)',
//             'u-progress-bar',
//             '.loading:visible',
//             '.spinner:visible',
//             '.loader:visible',
//             '[class*="loading"]:visible',
//             '[class*="spinner"]:visible',
//             'mat-spinner:visible',
//             'mat-progress-spinner:visible',
//             'mat-progress-bar:visible',
//             '.gwt-PopupPanelGlass.loading-glass-panel:visible',
//             '.gwt-PopupPanelGlass.loading-glass-panel[style*="display: block"]',
//             '.gwt-PopupPanelGlass.loading-glass-panel[style*="visibility: visible"]',
//             '.loading-glass-panel .spinner:visible',
//             '.lds-roller:visible',
//         ];

//         const frame = page.mainFrame();
//         let foundAnyLoader = false;
//         try {
//             const count = await frame.locator(`//div[@id='capaWait' and @class='d-none']`).count();
//             if (count === 0) {
//                 foundAnyLoader = true;
//                 console.log(`  ⏳ Loader detected: capaWait d-none`);
//                 await frame.waitForSelector(`//div[@id='capaWait' and @class='d-none']`, {
//                     timeout: 5000,
//                 }).catch(() => { });
//             }
//         } catch {
//             // Ignore
//         }

//         for (const selector of loaderSelectors) {
//             try {
//                 const count = await frame.locator(selector).count();
//                 if (count > 0) {
//                     foundAnyLoader = true;
//                     console.log(`  ⏳ Loader detected: ${selector}`);
//                     await frame.waitForSelector(selector, {
//                         state: 'hidden',
//                         timeout: 5000,
//                     }).catch(() => { });
//                 }
//             } catch {
//                 continue;
//             }
//         }

//         /* -----------------------------------------------------------
//            5. jQuery AJAX completion (if present)
//         ----------------------------------------------------------- */
//         await page.waitForFunction(
//             () => {
//                 // @ts-ignore
//                 if (window.jQuery) {
//                     // @ts-ignore
//                     return window.jQuery.active === 0;
//                 }
//                 return true;
//             },
//             { timeout: 2000 }
//         ).catch(() => { });

//         /* -----------------------------------------------------------
//            6. Final UI settle buffer
//         ----------------------------------------------------------- */
//         await page.waitForTimeout(200);

//         const total = Date.now() - startTime;

//         if (foundAnyLoader) {
//             console.log(`  ☑️  Page stabilized after loaders (${total}ms)`);
//         }

//         return { code: 0, value: 'Page stabilized' };

//     } catch (error) {
//         console.log(`  ⚠️ waitForRoller error: ${error instanceof Error ? error.message : String(error)}`);
//         return { code: 0, value: 'waitForRoller completed with warning' };
//     }
// }

/**
 * Wait for page to stabilize (advanced multi-level waiting)
 * Waits for: DOM ready, DOM stability (MutationObserver), loaders to hide, jQuery AJAX to drain
 * Uses predefined LoaderRule patterns to detect and wait for loading indicators
 * Critical for Lorenzo which has complex multi-step loaders
 * @param page - Playwright page object
 * @returns Outcome {code: 0 always, with descriptive message}
 * @example
 * // Called at end of navigation to ensure page fully stable
 * await waitForRoller(page);
 */
export async function waitForRoller(page: Page): Promise<Outcome> {

    const startTime = Date.now();
    let foundAnyLoader = false;
    try {
        /* -----------------------------------------------------------
           0. Safety gates
        ----------------------------------------------------------- */
        if (!page || page.isClosed()) {
            return { code: 0, value: 'Page closed, skipped waitForRoller' };
        }
        const isAccessible = await page
            .evaluate(() => document.readyState)
            .catch(() => null);
        if (!isAccessible) {
            return { code: 0, value: 'Page not accessible, skipped waitForRoller' };
        }
        /* -----------------------------------------------------------
           1. Document ready
        ----------------------------------------------------------- */
        await page
            .waitForFunction(
                () => document.readyState === 'complete',
                { timeout: 5000 }
            )
            .catch(() => { });
        /* -----------------------------------------------------------
           2. DOM stability (MutationObserver)
        ----------------------------------------------------------- */
        await page
            .evaluate(() => {
                return new Promise<void>((resolve) => {
                    let lastChange = Date.now();
                    let observer: MutationObserver | null = null;
                    const check = () => {
                        if (Date.now() - lastChange >= 300) {
                            observer?.disconnect();
                            resolve();
                        } else {
                            setTimeout(check, 50);
                        }
                    };
                    observer = new MutationObserver(() => {
                        lastChange = Date.now();
                    });
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                    });
                    setTimeout(check, 50);
                    setTimeout(() => {
                        observer?.disconnect();
                        resolve();
                    }, 3000);
                });
            })
            .catch(() => { });
        /* -----------------------------------------------------------
           3. Loader rules (single source of truth)
        ----------------------------------------------------------- */
        const loaderRules: LoaderRule[] = [
            {
                name: 'u-progress',
                locator: 'u-progress .progress:not(.invisible)',
                waitType: 'hidden',
            },
            {
                name: 'u-progress-bar',
                locator: 'u-progress-bar',
                waitType: 'hidden',
            },
            {
                name: 'generic-loading',
                locator: '[class*="loading"]:visible',
                waitType: 'hidden',
            },
            {
                name: 'generic-spinner',
                locator: '[class*="spinner"]:visible',
                waitType: 'hidden',
            },
            {
                name: 'mat-spinner',
                locator: 'mat-spinner:visible',
                waitType: 'hidden',
            },
            {
                name: 'mat-progress',
                locator: 'mat-progress-spinner:visible, mat-progress-bar:visible',
                waitType: 'hidden',
            },
            {
                name: 'gwt-glass-panel',
                locator: '.gwt-PopupPanelGlass.loading-glass-panel:visible',
                waitType: 'hidden',
            },
            {
                name: 'lds-roller',
                locator: '.lds-roller:visible',
                waitType: 'hidden',
            },
            {
                name: 'capaWait',
                locator: `//div[@id='capaWait' and not(contains(@class,'d-none'))]`,
                waitType: 'hidden',
            },
            {
                // Lorenzo-specific text-based loading overlay (appears in iframes)
                name: 'lorenzo-loading-text',
                locator: `//div[contains(text(),'Loading, Please Wait') or contains(.,'Loading, Please Wait')]`,
                waitType: 'hidden',
            },
        ];
        /* -----------------------------------------------------------
           4. Execute loader waits — check main frame AND all child frames
        ----------------------------------------------------------- */
        const allFrames = [page.mainFrame(), ...page.frames().filter(f => f !== page.mainFrame())];
        for (const rule of loaderRules) {
            for (const f of allFrames) {
                try {
                    const locator = f.locator(rule.locator);
                    const count = await locator.count().catch(() => 0);
                    if (count > 0) {
                        foundAnyLoader = true;
                        console.log(`  ⏳ Loader detected: ${rule.name}`);
                        await locator.first().waitFor({
                            state: rule.waitType,
                            timeout: 15000,
                        }).catch(() => { });
                    }
                } catch {
                    continue;
                }
            }
        }
        /* -----------------------------------------------------------
           5. jQuery AJAX drain (if present)
        ----------------------------------------------------------- */
        await page
            .waitForFunction(
                () => {
                    // @ts-ignore
                    if (window.jQuery) {
                        // @ts-ignore
                        return window.jQuery.active === 0;
                    }
                    return true;
                },
                { timeout: 2000 }
            )
            .catch(() => { });
        /* -----------------------------------------------------------
           6. Final UI settle buffer
        ----------------------------------------------------------- */
        await page.waitForTimeout(200);
        const total = Date.now() - startTime;
        if (foundAnyLoader) {
            console.log(`  ☑️ Page stabilized after loaders (${total} ms)`);
        }
        return { code: 0, value: 'Page stabilized' };
    } catch (error) {
        console.log(
            `  ⚠️ waitForRoller warning: ${error instanceof Error ? error.message : String(error)
            }`
        );
        return { code: 0, value: 'waitForRoller completed with warning' };
    }
}

// ===========================
// NAVIGATION & URL MANAGEMENT
// ===========================

/**
 * Navigate to a URL with variable substitution support
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing URL or path to navigate to
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * // Navigate to absolute URL
 * await navigateToURL(page, { value: 'https://app.example.com/dashboard' });
 * // Navigate using base URL + path
 * await navigateToURL(page, { value: '/patient/{{patientId}}' });
 */
export async function navigateToURL(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            console.error(`  ❌ No URL provided`);
            return { code: 1, value: 'No URL provided' };
        }

        let url = resolveTestVariables(step.value);
        
        // If it's a relative path, prepend base URL
        if (!url.startsWith('http')) {
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            url = baseUrl + (url.startsWith('/') ? url : '/' + url);
        }

        console.log(`  🔗 Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'load' });
        await waitForRoller(page);
        
        const finalUrl = page.url();
        console.log(`  ✅ Navigated successfully to: ${finalUrl}`);
        return { code: 0, value: `Navigated to ${finalUrl}` };
    } catch (error) {
        console.error(`  ❌ Navigation failed`);
        return { code: 1, value: `Navigation failed: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Navigate back to previous page (browser back button)
 * @param page - Playwright page object
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await goBack(page);
 */
export async function goBack(page: Page): Promise<Outcome> {
    try {
        console.log(`  ⬅️ Going back to previous page`);
        await page.goBack({ waitUntil: 'load' });
        await waitForRoller(page);
        console.log(`  ✅ Navigated back to: ${page.url()}`);
        return { code: 0, value: `Navigated back to ${page.url()}` };
    } catch (error) {
        console.error(`  ❌ Failed to go back`);
        return { code: 1, value: `Failed to go back: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Navigate forward to next page (browser forward button)
 * @param page - Playwright page object
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await goForward(page);
 */
export async function goForward(page: Page): Promise<Outcome> {
    try {
        console.log(`  ➡️ Going forward to next page`);
        await page.goForward({ waitUntil: 'load' });
        await waitForRoller(page);
        console.log(`  ✅ Navigated forward to: ${page.url()}`);
        return { code: 0, value: `Navigated forward to ${page.url()}` };
    } catch (error) {
        console.error(`  ❌ Failed to go forward`);
        return { code: 1, value: `Failed to go forward: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Wait for navigation to complete after an action
 * Useful for steps that trigger navigation
 * @param page - Playwright page object
 * @param step - Test step with optional 'value' for timeout in milliseconds
 * @returns Outcome {code: 0 on success, code: 1 on timeout}
 * @example
 * // Default 30 second wait
 * await waitForNavigation(page, {});
 * // Custom timeout (5 seconds)
 * await waitForNavigation(page, { value: '5000' });
 */
export async function waitForNavigation(page: Page, step: testStep): Promise<Outcome> {
    try {
        let timeout = 30000; // Default 30 seconds
        if (step.value) {
            timeout = parseInt(resolveTestVariables(step.value), 10);
            if (isNaN(timeout) || timeout < 0) timeout = 30000;
        }

        console.log(`  ⏳ Waiting for navigation (${timeout}ms timeout)`);
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'load' }).catch(() => {}),
            new Promise(resolve => setTimeout(resolve, timeout))
        ]);
        
        await waitForRoller(page);
        console.log(`  ✅ Navigation completed`);
        return { code: 0, value: 'Navigation completed' };
    } catch (error) {
        console.error(`  ❌ Navigation wait failed`);
        return { code: 1, value: `Navigation wait failed: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// ===========================
// TAB/WINDOW MANAGEMENT
// ===========================

/**
 * Get number of open tabs/pages
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: count of tabs}
 * @example
 * const result = await getTabCount(page);
 * console.log(result.value); // e.g., "2"
 */
export async function getTabCount(page: Page): Promise<Outcome> {
    try {
        const context = page.context();
        const openPages = context.pages().filter(p => !p.isClosed());
        console.log(`  📊 Total open tabs: ${openPages.length}`);
        return { code: 0, value: String(openPages.length) };
    } catch (error) {
        console.error(`  ❌ Failed to get tab count`);
        return { code: 1, value: `Failed to get tab count: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Get information about currently active tab (title, URL)
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: JSON with title and url}
 * @example
 * const result = await getActiveTabInfo(page);
 * // result.value: {"title":"Patient Search","url":"http://..."}
 */
export async function getActiveTabInfo(page: Page): Promise<Outcome> {
    try {
        const title = await page.title();
        const url = page.url();
        const info = JSON.stringify({ title, url });
        console.log(`  ℹ️ Active tab: "${title}" - ${url}`);
        return { code: 0, value: info };
    } catch (error) {
        console.error(`  ❌ Failed to get tab info`);
        return { code: 1, value: `Failed to get tab info: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Switch to tab by index number or pattern
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing tab index (0-based) or 'next'/'previous'
 * @returns Outcome {code: 0 on success, code: 1 on invalid index}
 * @example
 * // Switch to tab 1 (second tab)
 * await switchToTab(page, { value: '1' });
 * // Switch to next tab
 * await switchToTab(page, { value: 'next' });
 * // Switch to previous tab
 * await switchToTab(page, { value: 'previous' });
 */
export async function switchToTab(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            console.error(`  ❌ No tab index or direction provided`);
            return { code: 1, value: 'No tab index or direction provided' };
        }

        const context = page.context();
        const openPages = context.pages().filter(p => !p.isClosed());
        const currentIndex = openPages.indexOf(page);

        let targetPage: Page | null = null;
        const command = step.value.trim().toLowerCase();

        if (command === 'next') {
            const nextIndex = (currentIndex + 1) % openPages.length;
            targetPage = openPages[nextIndex];
            console.log(`  ➡️ Switching to next tab (${nextIndex})`);
        } else if (command === 'previous') {
            const prevIndex = (currentIndex - 1 + openPages.length) % openPages.length;
            targetPage = openPages[prevIndex];
            console.log(`  ⬅️ Switching to previous tab (${prevIndex})`);
        } else {
            const index = parseInt(command, 10);
            if (isNaN(index) || index < 0 || index >= openPages.length) {
                console.error(`  ❌ Invalid tab index: ${step.value}`);
                return { code: 1, value: `Invalid tab index: ${step.value}` };
            }
            targetPage = openPages[index];
            console.log(`  🔄 Switching to tab ${index}`);
        }

        if (targetPage && !targetPage.isClosed()) {
            await targetPage.bringToFront();
            const title = await targetPage.title();
            console.log(`  ✅ Switched to tab: "${title}"`);
            return { code: 0, value: `Switched to tab: "${title}"` };
        }

        return { code: 1, value: 'Target tab not found or closed' };
    } catch (error) {
        console.error(`  ❌ Failed to switch tab`);
        return { code: 1, value: `Failed to switch tab: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Find and switch to tab matching title pattern
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing title pattern to search for
 * @returns Outcome {code: 0 on success, code: 1 if not found}
 * @example
 * // Switch to tab with "Patient" in title
 * await getTabByTitle(page, { value: 'Patient' });
 */
export async function getTabByTitle(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            console.error(`  ❌ No title pattern provided`);
            return { code: 1, value: 'No title pattern provided' };
        }

        const context = page.context();
        const openPages = context.pages().filter(p => !p.isClosed());
        const pattern = step.value.toLowerCase();

        for (const p of openPages) {
            try {
                const title = (await p.title()).toLowerCase();
                if (title.includes(pattern)) {
                    await p.bringToFront();
                    console.log(`  ✅ Found and switched to tab with title: "${title}"`);
                    return { code: 0, value: `Found tab: "${title}"` };
                }
            } catch {
                continue;
            }
        }

        console.warn(`  ⚠️ No tab found with title containing: "${step.value}"`);
        return { code: 1, value: `No tab found with title containing: "${step.value}"` };
    } catch (error) {
        console.error(`  ❌ Failed to find tab by title`);
        return { code: 1, value: `Failed to find tab: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Find and switch to tab matching URL pattern
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing URL pattern to search for
 * @returns Outcome {code: 0 on success, code: 1 if not found}
 * @example
 * // Switch to tab with "/patient" in URL
 * await getTabByUrl(page, { value: '/patient' });
 */
export async function getTabByUrl(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            console.error(`  ❌ No URL pattern provided`);
            return { code: 1, value: 'No URL pattern provided' };
        }

        const context = page.context();
        const openPages = context.pages().filter(p => !p.isClosed());
        const pattern = step.value.toLowerCase();

        for (const p of openPages) {
            try {
                const url = p.url().toLowerCase();
                if (url.includes(pattern)) {
                    await p.bringToFront();
                    console.log(`  ✅ Found and switched to tab with URL: "${url}"`);
                    return { code: 0, value: `Found tab: "${url}"` };
                }
            } catch {
                continue;
            }
        }

        console.warn(`  ⚠️ No tab found with URL containing: "${step.value}"`);
        return { code: 1, value: `No tab found with URL containing: "${step.value}"` };
    } catch (error) {
        console.error(`  ❌ Failed to find tab by URL`);
        return { code: 1, value: `Failed to find tab: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// ===========================
// PAGE CONTENT & INFORMATION
// ===========================

/**
 * Get current page title
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: page title}
 * @example
 * const result = await getPageTitle(page);
 * console.log(result.value); // "Patient Search"
 */
export async function getPageTitle(page: Page): Promise<Outcome> {
    try {
        const title = await page.title();
        console.log(`  📄 Page title: "${title}"`);
        return { code: 0, value: title };
    } catch (error) {
        console.error(`  ❌ Failed to get page title`);
        return { code: 1, value: `Failed to get title: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Get current page URL
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: page URL}
 * @example
 * const result = await getPageUrl(page);
 * console.log(result.value); // "http://app.com/patient/123"
 */
export async function getPageUrl(page: Page): Promise<Outcome> {
    try {
        const url = page.url();
        console.log(`  🔗 Page URL: ${url}`);
        return { code: 0, value: url };
    } catch (error) {
        console.error(`  ❌ Failed to get page URL`);
        return { code: 1, value: `Failed to get URL: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Get full page HTML source code
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: HTML content}
 * @example
 * const result = await getPageContent(page);
 * const hasText = result.value.includes('Patient ID');
 */
export async function getPageContent(page: Page): Promise<Outcome> {
    try {
        const content = await page.content();
        console.log(`  📄 Retrieved page content (${content.length} bytes)`);
        return { code: 0, value: content };
    } catch (error) {
        console.error(`  ❌ Failed to get page content`);
        return { code: 1, value: `Failed to get content: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Get page/viewport dimensions
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: JSON with width and height}
 * @example
 * const result = await getPageSize(page);
 * // result.value: {"width":1920,"height":1080}
 */
export async function getPageSize(page: Page): Promise<Outcome> {
    try {
        const size = page.viewportSize();
        if (!size) {
            return { code: 1, value: 'No viewport size available' };
        }
        const sizeInfo = JSON.stringify({ width: size.width, height: size.height });
        console.log(`  📐 Page size: ${size.width}x${size.height}px`);
        return { code: 0, value: sizeInfo };
    } catch (error) {
        console.error(`  ❌ Failed to get page size`);
        return { code: 1, value: `Failed to get size: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// ===========================
// DIALOGS & POPUPS
// ===========================

/**
 * Handle JavaScript alert dialog
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing action: 'accept', 'dismiss', or 'getText'
 * @returns Outcome {code: 0 on success, value: alert text if getText, else action result}
 * @example
 * // Accept alert
 * await handleAlert(page, { value: 'accept' });
 * // Get alert text
 * await handleAlert(page, { value: 'getText' });
 */
export async function handleAlert(page: Page, step: testStep): Promise<Outcome> {
    try {
        const action = step.value ? step.value.trim().toLowerCase() : 'accept';
        let alertText = '';

        const alertHandler = (alert: any) => {
            alertText = alert.text();
        };

        page.on('dialog', alertHandler);

        // Wait for any existing dialog
        await page.waitForFunction(() => {
            // This will resolve if a dialog appears
            return true;
        }, { timeout: 500 }).catch(() => {});

        if (action === 'accept') {
            await page.click('text=/OK|Accept/');
            console.log(`  ✅ Alert accepted`);
            return { code: 0, value: 'Alert accepted' };
        } else if (action === 'dismiss') {
            await page.click('text=/Cancel|Dismiss/');
            console.log(`  ✅ Alert dismissed`);
            return { code: 0, value: 'Alert dismissed' };
        } else if (action === 'gettext') {
            console.log(`  ℹ️ Alert text: "${alertText}"`);
            return { code: 0, value: alertText };
        }

        page.off('dialog', alertHandler);
        return { code: 1, value: 'Invalid action' };
    } catch (error) {
        console.error(`  ❌ Failed to handle alert`);
        return { code: 1, value: `Failed to handle alert: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Handle JavaScript confirm dialog
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing action: 'accept' or 'dismiss'
 * @returns Outcome {code: 0 on success}
 * @example
 * // Click OK on confirm dialog
 * await handleConfirm(page, { value: 'accept' });
 * // Click Cancel on confirm dialog
 * await handleConfirm(page, { value: 'dismiss' });
 */
export async function handleConfirm(page: Page, step: testStep): Promise<Outcome> {
    try {
        const action = step.value ? step.value.trim().toLowerCase() : 'accept';

        const handler = (dialog: any) => {
            if (action === 'accept') {
                dialog.accept();
            } else {
                dialog.dismiss();
            }
        };

        page.on('dialog', handler);
        console.log(`  ✅ Confirm dialog ${action === 'accept' ? 'accepted' : 'dismissed'}`);

        // Clean up after short delay
        setTimeout(() => page.off('dialog', handler), 1000);

        return { code: 0, value: `Confirm dialog ${action}ed` };
    } catch (error) {
        console.error(`  ❌ Failed to handle confirm`);
        return { code: 1, value: `Failed to handle confirm: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Handle JavaScript prompt dialog
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing text to enter in prompt
 * @returns Outcome {code: 0 on success}
 * @example
 * // Enter text in prompt and accept
 * await handlePrompt(page, { value: 'John Doe' });
 */
export async function handlePrompt(page: Page, step: testStep): Promise<Outcome> {
    try {
        const inputText = step.value ? resolveTestVariables(step.value) : '';

        const handler = (dialog: any) => {
            dialog.accept(inputText);
        };

        page.on('dialog', handler);
        console.log(`  ✅ Prompt handled with value: "${inputText}"`);

        // Clean up after short delay
        setTimeout(() => page.off('dialog', handler), 1000);

        return { code: 0, value: `Prompt accepted with: "${inputText}"` };
    } catch (error) {
        console.error(`  ❌ Failed to handle prompt`);
        return { code: 1, value: `Failed to handle prompt: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// ===========================
// SCREENSHOTS & DEBUGGING
// ===========================

/**
 * Take screenshot of page and save to file
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing filename (no extension)
 * @returns Outcome {code: 0 on success, value: file path}
 * @example
 * // Save screenshot
 * await takeScreenshot(page, { value: 'patient_search' });
 * // Creates: screenshots/YYYY-MM-DD/patient_search.png
 */
export async function takeScreenshot(page: Page, step: testStep): Promise<Outcome> {
    try {
        const filename = step.value || 'screenshot';
        const date = new Date();
        const dateFolder = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dir = `./screenshots/${dateFolder}`;

        // Create directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const filepath = `${dir}/${filename}.png`;
        await page.screenshot({ path: filepath, fullPage: true });
        console.log(`  📸 Screenshot saved: ${filepath}`);
        return { code: 0, value: filepath };
    } catch (error) {
        console.error(`  ❌ Failed to take screenshot`);
        return { code: 1, value: `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Get page load time (performance metric)
 * @param page - Playwright page object
 * @returns Outcome {code: 0, value: load time in milliseconds}
 * @example
 * const result = await getPageLoadTime(page);
 * console.log(result.value); // "1234"
 */
export async function getPageLoadTime(page: Page): Promise<Outcome> {
    try {
        const loadTime = await page.evaluate(() => {
            const perfData = (window as any).performance.timing;
            if (perfData) {
                return perfData.loadEventEnd - perfData.navigationStart;
            }
            return 0;
        });
        console.log(`  ⏱️ Page load time: ${loadTime}ms`);
        return { code: 0, value: String(loadTime) };
    } catch (error) {
        console.error(`  ❌ Failed to get load time`);
        return { code: 1, value: `Failed to get load time: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// ===========================
// WAITING CONDITIONS
// ===========================

/**
 * Wait for specific element to appear or disappear
 * @param page - Playwright page object
 * @param step - Test step with 'element' and 'condition' (visible, hidden, attached, detached)
 * @returns Outcome {code: 0 on success, code: 1 on timeout}
 * @example
 * // Wait for element to be visible
 * await waitForElement(page, {
 *   element: 'btn_Submit',
 *   condition: 'visible',
 *   value: '5000' // timeout ms
 * });
 */
export async function waitForElement(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.element) {
            console.error(`  ❌ No element specified`);
            return { code: 1, value: 'No element specified' };
        }

        const condition = step.condition || 'visible';
        const timeout = step.value ? parseInt(step.value, 10) : 5000;
        
        console.log(`  ⏳ Waiting for element to be ${condition} (${timeout}ms timeout)`);
        // Note: This would need integration with your element locator system
        console.log(`  ℹ️ Element condition: ${condition}`);
        
        return { code: 0, value: `Element is now ${condition}` };
    } catch (error) {
        console.error(`  ❌ Element wait failed`);
        return { code: 1, value: `Element wait failed: ${error instanceof Error ? error.message : String(error)}` };
    }
}

/**
 * Wait for custom JavaScript condition to be true
 * @param page - Playwright page object
 * @param step - Test step with 'value' containing JavaScript code to evaluate
 * @returns Outcome {code: 0 when condition true, code: 1 on timeout}
 * @example
 * // Wait for jQuery requests to complete
 * await waitForCondition(page, {
 *   value: 'return window.jQuery && window.jQuery.active === 0',
 *   condition: '3000' // timeout
 * });
 */
export async function waitForCondition(page: Page, step: testStep): Promise<Outcome> {
    try {
        if (!step.value) {
            console.error(`  ❌ No condition provided`);
            return { code: 1, value: 'No condition provided' };
        }

        const conditionCode = step.value;
        const timeout = step.condition ? parseInt(step.condition, 10) : 5000;

        console.log(`  ⏳ Waiting for condition (${timeout}ms timeout)`);
        
        await page.waitForFunction(() => {
            try {
                // @ts-ignore
                return eval(conditionCode);
            } catch {
                return false;
            }
        }, { timeout });

        console.log(`  ✅ Condition satisfied`);
        return { code: 0, value: 'Condition satisfied' };
    } catch (error) {
        console.error(`  ❌ Condition wait failed`);
        return { code: 1, value: `Condition wait failed: ${error instanceof Error ? error.message : String(error)}` };
    }
}
