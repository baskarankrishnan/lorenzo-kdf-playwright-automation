import { expect, Page, Frame, Locator } from "@playwright/test";
import { Outcome, testStep, executionContext } from "../core/utilities/interfaceUtils";
import { setTextBox, clickElement, resolveElement, resolveElements, sleep, clickAndHandleAlert } from "../core/actionkeywords/elementActions";
import { waitForRoller, waitForSeconds } from "../core/actionkeywords/browserActions";
import { resolveTestVariables } from "../core/actionkeywords/dataActions";
import { getLocatorString } from "../core/utilities/locatorUtils";
import { error } from "jquery";
import { chromium } from "@playwright/test";

// Helper function to check action results
function checkResult(result: { code: number; value: string }) {
  if (result.code !== 0) throw new Error(result.value);
}

export async function launchUrl(page: Page, step: testStep): Promise<Outcome> {
  try {
    let url = step?.value?.trim();
    if (!step.value) {
      url = process.env.URL || '';
    }
    await page.goto(url as string, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log(`Navigated to ${url}`);
    return {
      code: 0,
      value: `Successfully navigated to ${url}`
    };

  } catch (error) {
    console.error('Error launching app:', error);
    return {
      code: 1,
      value: `Failed to launch URL: ${error}`
    };
  }
}

export async function login(page: Page, step: testStep): Promise<{ code: number; value: string }> {
  try {
    // Fall back to the standard runtime credentials when a test's login step omits
    // the value. resolveTestVariables substitutes _USERNAME/_PASSWORD from .env config,
    // which is how every other test sources its login (username|password format).
    const loginValue = step.value && String(step.value).trim() ? step.value : '_USERNAME|_PASSWORD';

    // Resolve runtime variables in the value
    const resolvedValue = resolveTestVariables(loginValue);
    const [username, password] = resolvedValue.split('|').map(v => v.trim());

    if (!username || !password) {
      throw new Error(`Invalid login format. Expected: username|password, Got: ${loginValue}`);
    }

    checkResult(await setTextBox(page, { ...step, page: 'pageLogin', element: 'txt_Username', value: username }));
    await waitForRoller(page);

    checkResult(await setTextBox(page, { ...step, page: 'pageLogin', element: 'txt_Password', value: password }));
    await waitForRoller(page);

    if (username.toLowerCase() === 'doctor' && password.toLowerCase() === 'doctor') {
      checkResult(await clickAndHandleAlert(page, { ...step, page: 'pageLogin', element: 'btn_Login', value: 'accept' }));
      await waitForRoller(page);
    }
    else {
      checkResult(await clickElement(page, { ...step, page: 'pageLogin', element: 'btn_Login' }));
      await waitForRoller(page);
    }


    // Wait for either error message or successful login indicator
    try {
      await Promise.race([
        page.getByText('Identificación de usuario no reconocida.').waitFor({ state: 'visible', timeout: 3000 }),
        page.getByText('Invalid username or password.').waitFor({ state: 'visible', timeout: 3000 })
      ]);
      throw new Error('Login failed: Invalid username or password.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid username or password')) {
        throw error;
      }
    }

    console.log('✅ Login completed successfully');
    await waitForRoller(page);
    return { code: 0, value: `Successfully logged in with username: ${username}` };

  } catch (error) {
    console.error('❌ Login failed:', error);
    return { code: 1, value: `Login failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function setTextBoxKendo(page: Page, step: testStep): Promise<void> {
  try {
    let textToFill = '';
    if (step.isDDT === true && step.datasetColumnNames) {
      textToFill = step.datasetColumnNames;
    } else if (step.value) {
      textToFill = resolveTestVariables(step.value);
    }

    if (!textToFill) {
      throw new Error(`No value provided for setTextBoxKendo at ${step.page}.${step.element}`);
    }

    const stepWithText = { ...step, elementText: textToFill };

    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const locator = await resolveElement(page, baseSelector, stepWithText);

    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.scrollIntoViewIfNeeded();

    // Primary selector for Kendo textbox input
    let kendoInput = locator.locator('kendo-textbox input.k-input-inner, itextbox input.k-input-inner, input.k-input-inner, input.k-textbox, input[type="text"]').first();

    if ((await kendoInput.count()) === 0) {
      // Fallback: search descendant inputs via XPath
      kendoInput = locator.locator(`xpath=.//input[contains(@class,'k-input') or contains(@class,'k-textbox') or not(@type) or @type='text']`).first();
    }

    if (await kendoInput.count() > 0) {
      await kendoInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { /* ignore */ });
      try {
        await kendoInput.fill(String(textToFill));
      } catch {
        // fallback: focus, select all and type
        await kendoInput.click({ clickCount: 3 }).catch(() => { /* ignore */ });
        await kendoInput.type(String(textToFill), { delay: 20 });
      }
      console.log(`Successfully set Kendo text in ${step.page}.${step.element}: "${textToFill}"`);
      return;
    }

    // Final fallback: focus host element then type
    try {
      await locator.click();
      await page.keyboard.type(String(textToFill), { delay: 20 });
      console.log(`Successfully set Kendo text (fallback) in ${step.page}.${step.element}: "${textToFill}"`);
      return;
    } catch (err) {
      throw new Error(`Could not locate Kendo input for ${step.page}.${step.element}`);
    }
  } catch (error) {
    console.error(`Failed to set Kendo text in ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export async function setScheduleTimeKendo(page: Page, step: testStep): Promise<void> {
  try {
    let timeValue = '';
    if (step.isDDT === true && step.datasetColumnNames) {
      timeValue = step.datasetColumnNames;
    } else if (step.value) {
      timeValue = resolveTestVariables(step.value);
    }

    if (!timeValue) {
      throw new Error(`No time value provided for setScheduleTimeKendo at ${step.page}.${step.element}`);
    }

    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const locator = await resolveElement(page, baseSelector, step);

    await locator.waitFor({ state: 'visible', timeout: 5000 });
    await locator.scrollIntoViewIfNeeded();

    let timeInput: Page['locator'] extends never ? never : ReturnType<Page['locator']>;
    const elementTag = await locator.evaluate((el) => el.tagName.toLowerCase()).catch(() => '');

    if (elementTag === 'input') {
      timeInput = locator;
    } else {
      timeInput = locator.locator('input.k-input-inner, input[role="combobox"], input').first();
      if ((await timeInput.count()) === 0) {
        timeInput = locator.locator('xpath=.//input').first();
      }
    }

    if ((await timeInput.count()) === 0) {
      throw new Error(`Could not locate Kendo time input for ${step.page}.${step.element}`);
    }

    await timeInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);

    await timeInput.click({ clickCount: 3 }).catch(() => timeInput.click());
    await timeInput.fill('');
    await timeInput.type(String(timeValue), { delay: 50 });
    await page.keyboard.press('Tab').catch(() => undefined);

    console.log(`Successfully set schedule time in ${step.page}.${step.element}: "${timeValue}"`);
  } catch (error) {
    console.error(`Failed to set schedule time in ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export async function setTextboxDose(page: Page, step: testStep): Promise<void> {
  try {
    let rawValue = '';
    if (step.isDDT === true && step.datasetColumnNames) {
      rawValue = step.datasetColumnNames;
    } else if (step.value) {
      rawValue = resolveTestVariables(step.value);
    }

    if (!rawValue) throw new Error(`No value provided for setTextboxDose at ${step.page}.${step.element}`);

    const finalValue = String(rawValue).trim();

    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const locator = await resolveElement(page, baseSelector, step);

    await locator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);

    let doseInput = locator.locator('input.k-input-inner, input[role="combobox"], input').first();
    if ((await doseInput.count().catch(() => 0)) === 0) {
      doseInput = locator.locator('xpath=.//input').first();
    }

    if ((await doseInput.count().catch(() => 0)) === 0) {
      throw new Error(`Could not locate combobox input for setTextboxDose at ${step.page}.${step.element}`);
    }

    await doseInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);

    // Clear existing displayed value reliably
    try {
      await doseInput.click({ clickCount: 3 });
    } catch {
      await doseInput.click().catch(() => undefined);
    }
    await doseInput.fill('').catch(() => undefined);

    // Type the intended value and commit
    await doseInput.type(finalValue, { delay: 40 }).catch(async () => {
      // fallback: set value via DOM and dispatch events
      await doseInput.evaluate((el, v) => {
        (el as HTMLInputElement).value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, finalValue as any).catch(() => undefined);
    });

    // Commit the value: Enter then Tab to move focus to next field
    await doseInput.press('Enter').catch(() => undefined);
    await page.waitForTimeout(150);
    await page.keyboard.press('Tab').catch(() => undefined);

    // Ensure events have propagated
    await doseInput.evaluate((el) => {
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }).catch(() => undefined);

    await waitForRoller(page).catch(() => undefined);

    console.log(`setTextboxDose: Set value "${finalValue}" for ${step.page}.${step.element}`);
    return;
  } catch (error) {
    console.error(`Failed to set textbox dose for ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export async function selectDrugInMultiList(page: Page, step: testStep): Promise<void> {
  try {
    if (!step.element) throw new Error('No container element provided in step.element');

    let rawValues = '';
    if (step.isDDT === true && step.datasetColumnNames) {
      rawValues = step.datasetColumnNames;
    } else if (step.value) {
      rawValues = resolveTestVariables(step.value);
    }

    if (!rawValues) throw new Error('No value(s) provided in step.value or step.datasetColumnNames');

    const items = rawValues.split('|').map(s => s.trim()).filter(s => s.length > 0);
    if (items.length === 0) throw new Error(`No selectable items parsed from input: "${rawValues}"`);

    const containerSelector = getLocatorString(step);
    await waitForRoller(page);
    const container = await resolveElement(page, containerSelector, step);
    await container.waitFor({ state: 'visible', timeout: 5000 });

    // helper to safely build regex for matching visible text (case-insensitive, substring)
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const rawItem of items) {
      const item = rawItem.trim();
      if (!item) continue;

      // Prefer clickable span with pointer-cursor (per DOM). Use hasText with case-insensitive regex.
      const candidateLocators = [
        container.locator('span.pointer-cursor', { hasText: new RegExp(escapeRegExp(item), 'i') }),
        container.locator('div.pointer-cursor', { hasText: new RegExp(escapeRegExp(item), 'i') }),
        container.locator('kendo-gridlayout-item', { hasText: new RegExp(escapeRegExp(item), 'i') }),
        container.locator('xpath=.//*[normalize-space() and contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "' + item.toLowerCase() + '")]')
      ];

      let found = false;
      for (const loc of candidateLocators) {
        if (await loc.count() > 0) {
          const el = loc.first();
          await el.scrollIntoViewIfNeeded();
          await el.click();
          console.log(`Selected multi-list item: "${item}"`);
          await page.waitForTimeout(120);
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`Item "${item}" not found in multi-list under ${step.page}.${step.element}`);
      }
    }
  } catch (error) {
    console.error(`Failed to select drug(s) in multi-list:`, error);
    throw error;
  }
}

export function getKendoComboBoxSelectionValue(step: testStep): string {
  const datasetValue = step.datasetColumnNames && String(step.datasetColumnNames).trim();
  const valueField = step.value && String(step.value).trim();
  const rawValueInput = datasetValue || valueField || '';

  if (!rawValueInput) {
    throw new Error('No value provided for KendoUI combo box selection');
  }

  return String(resolveTestVariables(rawValueInput)).trim();
}

export async function selectKendoComboBox(page: Page, step: testStep): Promise<void> {

    try {

    const finalValue = getKendoComboBoxSelectionValue(step);

        // Check if value is index-based selection (format: "index | n")

        const isIndexSelection = finalValue.toLowerCase().startsWith('index |') || finalValue.toLowerCase().startsWith('index|');

        let targetIndex = -1;

        if (isIndexSelection) {

            const parts = finalValue.split('|').map(p => p.trim());

            if (parts.length >= 2) {

                targetIndex = parseInt(parts[1]);

                if (isNaN(targetIndex) || targetIndex < 1) {

                    throw new Error(`Invalid index value: ${parts[1]}. Index must be a positive number starting from 1`);

                }

            } else {

                throw new Error(`Invalid index format. Expected: "index | n" where n is a positive number`);

            }

        }

        const baseSelector = getLocatorString(step);

        const element = await resolveElement(page, baseSelector, step);

        await waitForRoller(page);

        // KendoUI specific: Open dropdown by clicking the toggle button or input inside the combobox wrapper
        let controlRoot = element;
        const controlRootCandidate = element.locator('xpath=ancestor::*[contains(@class,"k-searchbar") or contains(@class,"k-combobox") or contains(@class,"k-dropdown") or contains(@class,"k-input")][1]');
        if (await controlRootCandidate.count().catch(() => 0) > 0) {
            controlRoot = controlRootCandidate;
        }

        const dropdownButton = controlRoot.locator('button[aria-label="Select"], button.k-icon, button.k-dropdown-wrap, span.k-icon, span.k-input-icon').first();
        const inputLocator = controlRoot.locator('input[role="combobox"], input.k-input-inner').first();
        const fallbackInput = element.locator('xpath=ancestor::*[contains(@class,"k-searchbar") or contains(@class,"k-combobox") or contains(@class,"k-dropdown") or contains(@class,"k-input")][1]//input[@role="combobox" or contains(@class,"k-input-inner")]').first();
        const actualInput = (await inputLocator.count()) > 0
            ? inputLocator
            : ((await fallbackInput.count()) > 0 ? fallbackInput : element.locator('input[role="combobox"], input.k-input-inner').first());

        let clickedOpen = false;
        if (await dropdownButton.isVisible().catch(() => false)) {
            await dropdownButton.click();
            clickedOpen = true;
        }

        if (!clickedOpen && actualInput && (await actualInput.count()) > 0) {
            await actualInput.click();
            clickedOpen = true;
        }

        if (!clickedOpen) {
            // Fallback: click on the combobox container
            await controlRoot.click();
            clickedOpen = true;
        }

        // Give the UI a brief moment to render the popup, but do not block waiting for it.
        await page.waitForTimeout(250);

        if (actualInput && (await actualInput.count()) > 0) {
            const ariaExpanded = await actualInput.getAttribute('aria-expanded').catch(() => '');
            if (ariaExpanded === 'false') {
                await actualInput.press('ArrowDown').catch(() => undefined);
                await page.waitForTimeout(250);
            }
        }

        const ownedId = actualInput ? await actualInput.getAttribute('aria-owns').catch(() => '') : '';

        // Short-circuit if aria-owns is present: query the owned popup directly and select from it.
        if (ownedId) {
          const ownedLocator = page.locator(`#${ownedId} [role="option"], #${ownedId} li, #${ownedId} div[role="option"], #${ownedId} kendo-label`);
          const ownedCount = await ownedLocator.count().catch(() => 0);
          if (ownedCount === 0) {
            console.warn(`Owned popup ${ownedId} contains no options; falling back to input-typing flow`);

            const searchInput = actualInput && (await actualInput.count()) > 0
              ? actualInput
              : element.locator('input.k-input-inner, input[role="combobox"], input').first();

            if (searchInput && (await searchInput.count()) > 0 && await searchInput.isVisible().catch(() => false)) {
              await searchInput.click();
              await searchInput.fill('');
              await searchInput.type(finalValue, { delay: 100 });
              await page.waitForTimeout(200);
              await searchInput.press('Enter').catch(() => undefined);
              await page.waitForTimeout(100);
              await searchInput.press('Tab').catch(() => undefined);
              await verifyKendoSelection(page, element, finalValue, isIndexSelection).catch(() => undefined);
              return;
            } else {
              throw new Error(`Owned popup ${ownedId} has no options and combobox input not found to type value`);
            }
          }

          // Try index selection first
          if (isIndexSelection) {
            if (ownedCount >= targetIndex) {
              const option = ownedLocator.nth(targetIndex - 1);
              if (await option.isVisible({ timeout: 200 }).catch(() => false)) {
                await option.click();
                console.log(`Selected Kendo option at index ${targetIndex} from owned popup ${ownedId}`);
              } else {
                throw new Error(`Owned popup option at index ${targetIndex} not visible in ${ownedId}`);
              }
            } else {
              throw new Error(`Owned popup ${ownedId} contains ${ownedCount} options, index ${targetIndex} is out of range`);
            }
          } else {
            let matched = false;
            for (let i = 0; i < ownedCount; i++) {
              const opt = ownedLocator.nth(i);
              const txt = await opt.textContent().catch(() => '');
              if (txt && txt.toLowerCase().includes(finalValue.toLowerCase())) {
                await opt.click();
                console.log(`Selected popup option matching: ${finalValue} from owned popup ${ownedId}`);
                matched = true;
                break;
              }
            }
            if (!matched) {
              throw new Error(`Option "${finalValue}" not found in owned popup ${ownedId}`);
            }
          }

          // Wait briefly and verify selection without blocking progress.
          await page.waitForTimeout(100);
          await verifyKendoSelection(page, element, finalValue, isIndexSelection).catch(() => undefined);
          return;
        }

        const optionSelectors = [
          'kendo-popup li[role="option"]',
          '[role="listbox"] [role="option"]',
          '[role="listbox"] option',
          'div[role="listbox"] [role="option"]',
          'ul[role="listbox"] li',
          'li[role="option"]',
          'div[role="option"]',
          'kendo-label'
        ];

        const searchRoots = [actualInput, controlRoot, element].filter(Boolean) as import('@playwright/test').Locator[];

        async function findPopupOptions(): Promise<import('@playwright/test').Locator> {
          for (const selector of optionSelectors) {
            for (const root of searchRoots) {
              const locator = root.locator(selector);
              const count = await locator.count().catch(() => 0);
              if (count > 0) {
                console.log(`Found popup options using root selector: ${selector}`);
                return locator;
              }
            }
            const locator = page.locator(selector);
            const count = await locator.count().catch(() => 0);
            if (count > 0) {
              console.log(`Found popup options using page selector: ${selector}`);
              return locator;
            }
          }
          console.log(`No popup options found using standard selectors; falling back to kendo-popup li[role="option"]`);
          return page.locator('kendo-popup li[role="option"]');
        }

        let selectionHandled = false;
        const popupOptions = await findPopupOptions();
        const optionCount = await popupOptions.count().catch(() => 0);

        if (isIndexSelection) {
            if (optionCount >= targetIndex) {
                const option = popupOptions.nth(targetIndex - 1);
                if (await option.isVisible({ timeout: 200 }).catch(() => false)) {
                    await option.click();
                    console.log(`Selected Kendo option at index ${targetIndex}`);
                    selectionHandled = true;
                }
            }

            if (!selectionHandled) {
                console.log(`No visible popup options found for index ${targetIndex}; continuing with the input value`);
            }
        } else {
            for (let i = 0; i < optionCount; i++) {
                const option = popupOptions.nth(i);
                const optionText = await option.textContent().catch(() => '');

                if (optionText && optionText.toLowerCase().includes(finalValue.toLowerCase())) {
                    await option.click();
                    console.log(`Selected popup option matching: ${finalValue}`);
                    selectionHandled = true;
                    break;
                }
            }

            if (!selectionHandled) {
                const searchInput = actualInput && (await actualInput.count()) > 0 ? actualInput : element.locator('input.k-input-inner, input[role="combobox"], input').first();

                if (searchInput && (await searchInput.count()) > 0 && await searchInput.isVisible().catch(() => false)) {
                    await searchInput.click();
                    await searchInput.fill('');
                    await searchInput.type(finalValue, { delay: 100 });
                    await page.waitForTimeout(300);
                    await searchInput.press('Enter').catch(() => undefined);
                    selectionHandled = true;
                }
            }
        }

        if (!selectionHandled) {
            throw new Error(`Option "${finalValue}" not found in Kendo combo box`);
        }

        // Wait briefly for selection to be applied; do not block on loader checks.
        await page.waitForTimeout(100);
        await verifyKendoSelection(page, element, finalValue, isIndexSelection).catch(() => undefined);

    } catch (error) {

        console.error(`Failed to select from KendoUI combo box:`, error);

        throw error;

    }

}

async function verifyKendoSelection(page: Page, combobox: ReturnType<Page['locator']>, expectedValue: string, isIndexSelection: boolean): Promise<void> {
  try {
    const input = combobox.locator('input.k-input-inner, input[role="combobox"], input').first();
    const inputCount = await input.count().catch(() => 0);
    if (inputCount === 0) {
      console.warn('Kendo combo box input not available for verification; continuing');
      return;
    }

    const selectedValue = await input
      .elementHandle({ timeout: 500 })
      .then((handle) => handle
        ? handle.evaluate((el) => {
          const element = el as HTMLInputElement | HTMLTextAreaElement | HTMLElement;
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            return element.value;
          }
          return element.getAttribute('value') ?? element.textContent ?? '';
        })
        : '')
      .catch(() => '');

    const normalizedValue = String(selectedValue ?? '').trim();

    if (isIndexSelection) {
      if (!normalizedValue) {
        console.warn('Kendo combo box appears to be empty after index selection');
      }
      return;
    }

    if (!normalizedValue) {
      console.warn(`Kendo combo box value could not be verified for expected value: "${expectedValue}"`);
      return;
    }

    if (!normalizedValue.toLowerCase().includes(expectedValue.toLowerCase())) {
      console.warn(`Kendo combo box selected value "${normalizedValue}" does not match expected "${expectedValue}"`);
    }
  } catch (error) {
    console.warn(`Unable to verify Kendo combo box selection: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export async function selectContextMenu(page: Page, step: testStep): Promise<Outcome> {
  try {
    // Get menu values from datasetColumnNames or value
    let menuValues = step.datasetColumnNames || step.value;

    if (menuValues && typeof menuValues === 'string') {
      menuValues = resolveTestVariables(menuValues);
    }

    if (!menuValues || menuValues.trim() === '') {
      return {
        code: 1,
        value: 'No context menu values provided in value or datasetColumnNames field'
      };
    }

    const valueArray = menuValues.split("|").map(v => v.trim());

    // ✅ Validate page before proceeding
    if (page.isClosed()) {
      return {
        code: 1,
        value: 'Page was closed before context menu action could be performed'
      };
    }

    // Get the element to right-click on using getLocatorString
    const baseSelector = getLocatorString(step);

    // ✅ Wrap resolveElement in try-catch to handle page closure
    let element;
    try {
      element = await resolveElement(page, baseSelector, step);
    } catch (error) {
      if (error instanceof Error && error.message.includes('closed')) {
        return {
          code: 1,
          value: `Page was closed while searching for element ${step.page}.${step.element}`
        };
      }
      throw error;
    }

    // ✅ Check page again before interacting
    if (page.isClosed()) {
      return {
        code: 1,
        value: 'Page was closed before right-click could be performed'
      };
    }

    // Ensure element is visible and perform right-click
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await element.scrollIntoViewIfNeeded({ timeout: 5000 });
    await element.click({ button: 'right', timeout: 30000, delay: 1000 });

    console.log(`Right-clicked on ${step.page}.${step.element}`);

    // Click through context menu items
    for (let i = 0; i < valueArray.length; i++) {
      // ✅ Check page before each menu item click
      if (page.isClosed()) {
        return {
          code: 1,
          value: `Page was closed while selecting context menu item: ${valueArray[i]}`
        };
      }

      const menuItem = valueArray[i];
      const elementTextLower = menuItem.toLowerCase();
      const elementTextUpper = menuItem.toUpperCase();

      // Create a new step for the context menu link
      const contextMenuStep = {
        ...step,
        element: "lnkVarContextMenu"
      };

      let lnkVarContextMenu_baseSelector = getLocatorString(contextMenuStep);
      lnkVarContextMenu_baseSelector = lnkVarContextMenu_baseSelector
        .replace("%elementText%", elementTextLower)
        .replaceAll("%elementText2%", elementTextUpper);

      // ✅ Wrap in try-catch
      let linkLocator;
      try {
        linkLocator = await resolveElement(page, lnkVarContextMenu_baseSelector, contextMenuStep);
      } catch (error) {
        if (error instanceof Error && error.message.includes('closed')) {
          return {
            code: 1,
            value: `Page was closed while searching for context menu item: ${menuItem}`
          };
        }
        throw error;
      }

      const lnkClassName = await linkLocator.getAttribute("class");

      if (lnkClassName?.includes("collapser collapsed") || !lnkClassName?.includes("collapser")) {
        await linkLocator.click();
        console.log(`Clicked context menu item: ${menuItem}`);
      }
    }

    return {
      code: 0,
      value: `Successfully selected context menu items: ${valueArray.join(' > ')}`
    };
  } catch (error) {
    // ✅ Handle TargetClosedError gracefully
    if (error instanceof Error &&
      (error.message.includes('Target page, context or browser has been closed') ||
        error.message.includes('Page was closed'))) {
      console.log('Page closed during context menu selection');
      return {
        code: 1,
        value: 'Page was closed during context menu selection'
      };
    }

    console.error(`Failed to select context menu:`, error);
    return {
      code: 1,
      value: `Failed to select context menu: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function getCellData(page: Page, step: testStep): Promise<{ code: number; value: string }> {
  try {
    if (!step.tableColumnNames) {
      throw new Error("No table column names provided");
    }

    const tableColumnNames = step.tableColumnNames;

    const isMultiColumn = tableColumnNames.includes('|');
    const reqdColumns: string[] = isMultiColumn
      ? tableColumnNames.split('|').map((col: string) => col.trim())
      : [tableColumnNames.trim()];

    const baseSelector = getLocatorString(step);
    let tableLocator = await resolveElement(page, baseSelector, step);
    const headers = await tableLocator.locator('thead th, th').evaluateAll(elements =>
      elements.map(el => el.textContent?.trim() || '')
    );

    if (headers.length === 0) {
      throw new Error("No table headers found");
    }

    const allRows = await tableLocator.locator('tbody tr').elementHandles();

    if (allRows.length === 0) {
      throw new Error("No data rows found in table");
    }

    // Get the first row
    const firstRow = allRows[0];

    const columnIndices: number[] = reqdColumns.map((col: string) => {
      const index = headers.indexOf(col);
      if (index === -1) {
        throw new Error(`Column "${col}" not found in table headers. Available headers: ${headers.join(', ')}`);
      }
      return index;
    });

    let retrievedValue: string | string[] = '';

    // Get all cells from the first row
    const cells = await firstRow.$$('td');
    const cellTexts = await Promise.all(cells.map(cell => cell.evaluate(el => {
      // Get text content from the entire cell
      const textContent = el.textContent?.trim() || '';

      // If no text content, try to get from nested anchor tags
      if (!textContent) {
        const anchor = el.querySelector('a');
        if (anchor) {
          return anchor.textContent?.trim() || '';
        }
      }

      // If still no text, try to get from nested div with class hut-cell-wrapper
      if (!textContent) {
        const wrapper = el.querySelector('.hut-cell-wrapper');
        if (wrapper) {
          return wrapper.textContent?.trim() || '';
        }
      }

      return textContent;
    })));

    // Extract values for the required columns
    if (isMultiColumn) {
      retrievedValue = columnIndices.map((colIndex: number) => cellTexts[colIndex]);
    } else {
      retrievedValue = cellTexts[columnIndices[0]];
    }

    console.log(`✅ Retrieved data from first row in table ${step.page}.${step.element}:`, retrievedValue);

    // If value is provided and starts with _, store in runtime variable
    if (step.value && step.value.startsWith('_')) {
      const varName = step.value; // Keep the underscore
      executionContext.addVariable(varName, retrievedValue);
      console.log(`Stored text in runtime variable: ${varName} = "${retrievedValue}"`);
    }

    return {
      code: 0,
      value: `Successfully retrieved cell data: ${JSON.stringify(retrievedValue)}`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to retrieve data from table ${step.page}.${step.element}:`, errorMessage);
    return {
      code: 1,
      value: `Failed to get cell data: ${errorMessage}`
    };
  }
}

export async function clickCellData(page: Page, step: testStep): Promise<{ code: number; value: string }> {
  try {
    if (!step.value) {
      throw new Error("No value provided for cell click");
    }

    if (!step.tableColumnNames) {
      throw new Error("No table column name provided");
    }

    const tableColumnNames = step.tableColumnNames.trim();

    let valueToUse = step.value;

    // Handle DDT values
    if (step.isDDT === true && step.datasetColumnNames) {
      valueToUse = step.datasetColumnNames;
    }

    const expectedValue = typeof valueToUse === 'string'
      ? valueToUse.trim()
      : String(valueToUse).trim();

    const baseSelector = getLocatorString(step);
    const tableLocator = await resolveElement(page, baseSelector, step);

    await tableLocator.waitFor({ state: 'visible', timeout: 5000 });

    // Extract headers with the same improved logic as verifyRecordInTable
    const headers = await tableLocator.locator('thead th, th, thead tr:first-child > td').evaluateAll(elements => {
      return elements.map(el => {
        // Get only the visible text, ignoring script elements
        const clone = el.cloneNode(true) as HTMLElement;
        // Remove script elements
        const scripts = clone.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        // Get text content and clean it
        const text = clone.textContent || '';
        return text.replace(/\s+/g, ' ').trim();
      });
    });

    // Fallback: if no valid headers found
    if (headers.length === 0 || headers.every(h => h === '')) {
      // Try alternative approaches
      const alternativeHeaders = await tableLocator.locator('thead th, th').evaluateAll(elements => {
        return elements.map(el => {
          // Try to get data attribute for header text
          const dataHeader = el.getAttribute('data-header') ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title');
          if (dataHeader) return dataHeader.trim();

          // Get first child text content only
          const firstChild = el.firstChild;
          if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
            return firstChild.textContent?.trim() || '';
          }

          return (el.textContent || '').replace(/\s+/g, ' ').trim();
        });
      });

      if (alternativeHeaders.length > 0) {
        alternativeHeaders.forEach((header, index) => {
          if (header) headers[index] = header;
        });
      }
    }

    // Clean headers - remove empty or whitespace-only headers
    const cleanedHeaders = headers.filter(header => header.trim().length > 0);

    if (cleanedHeaders.length === 0) {
      // Try one more approach: look for table headers in any row that might be acting as headers
      const allPossibleHeaders = await tableLocator.locator('tr:first-child > *').evaluateAll(elements => {
        return elements.map(el => {
          const text = el.textContent || '';
          return text.replace(/\s+/g, ' ').trim();
        });
      }).catch(() => []);

      if (allPossibleHeaders.length > 0) {
        allPossibleHeaders.forEach((header, index) => {
          if (header && !headers[index]) headers[index] = header;
        });
      }

      // Filter again after adding from allPossibleHeaders
      const finalHeaders = headers.filter(header => header.trim().length > 0);
      if (finalHeaders.length === 0) {
        throw new Error("No valid table headers found");
      }
    }

    // Get all rows excluding potential header rows
    const allRows = await tableLocator.locator('tbody tr, tr:not(:first-child)').elementHandles();

    const expectedValueResolved = resolveTestVariables(expectedValue);

    // Find column index with case-insensitive matching
    const columnIndex = headers.findIndex(header =>
      header.toLowerCase().trim() === tableColumnNames.toLowerCase().trim()
    );

    // If not found with exact match, try partial match
    const finalColumnIndex = columnIndex === -1
      ? headers.findIndex(header =>
        header.toLowerCase().includes(tableColumnNames.toLowerCase().trim()) ||
        tableColumnNames.toLowerCase().trim().includes(header.toLowerCase())
      )
      : columnIndex;

    if (finalColumnIndex === -1) {
      const availableHeaders = headers.filter(h => h).join(', ');
      throw new Error(`Column "${tableColumnNames}" not found in table headers. Available headers: ${availableHeaders}`);
    }

    let cellClicked = false;

    for (const rowHandle of allRows) {
      const cells = await rowHandle.$$('td');

      if (cells.length <= finalColumnIndex) {
        continue; // Skip rows that don't have enough columns
      }

      const targetCell = cells[finalColumnIndex];
      const cellText = await targetCell.evaluate(el => {
        const text = el.textContent || '';
        return text.replace(/\s+/g, ' ').trim();
      });

      if (cellText === String(expectedValueResolved)) {
        // Look for clickable elements in the cell (hyperlinks, buttons, etc.)
        const clickableElements = await targetCell.$$('a, button, [role="button"], [onclick]');

        if (clickableElements.length > 0) {
          // Set up page close listener before clicking (for links that open new windows/pages)
          const pageClosePromise = new Promise<void>((resolve) => {
            const handler = () => {
              console.log(`✅ Page closed after clicking element in column "${tableColumnNames}" for value "${expectedValueResolved}"`);
              page.off('close', handler);
              resolve();
            };
            page.on('close', handler);
          });

          try {
            // Try to click the first clickable element
            await Promise.race([
              clickableElements[0].click(),
              pageClosePromise
            ]);

            console.log(`✅ Clicked element in column "${tableColumnNames}" for value "${expectedValueResolved}" in table ${step.page}.${step.element}`);
          } catch (clickError) {
            // If race fails, just log and continue
            console.log(`  ⚠️  Click may have triggered page navigation`);
          }
        } else {
          // If no clickable element, click the cell itself
          await targetCell.click();
          console.log(`✅ Clicked cell in column "${tableColumnNames}" for value "${expectedValueResolved}" in table ${step.page}.${step.element}`);
        }

        cellClicked = true;
        break;
      }
    }

    if (!cellClicked) {
      return {
        code: 1,
        value: `No matching cell found to click for column "${tableColumnNames}" and value "${expectedValueResolved}"`
      };
    }

    return {
      code: 0,
      value: `Successfully clicked cell in column "${tableColumnNames}" for value "${expectedValueResolved}"`
    };
  } catch (error) {
    // Check if it's a TargetClosedError (which is expected behavior when page closes)
    if (error instanceof Error && error.message.includes('Target page, context or browser has been closed')) {
      console.log(`✅ Click successful - page closed as expected for column "${step.tableColumnNames}" and value "${step.value}"`);
      return {
        code: 0,
        value: `Successfully clicked cell - page closed as expected`
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to click cell data in table ${step.page}.${step.element}:`, errorMessage);
    return {
      code: 1,
      value: `Failed to click cell data: ${errorMessage}`
    };
  }
}

export async function swapFormItemPosition(page: Page, step: testStep): Promise<{ code: number; value: string }> {
  try {
    if (!step.value) {
      throw new Error('value is required (target position index)');
    }

    const resolvedValue = resolveTestVariables(step.value);
    const targetIndex = parseInt(resolvedValue, 10);

    if (isNaN(targetIndex) || targetIndex < 1) {
      throw new Error(`Invalid target index: "${step.value}"`);
    }

    const sourceSelector = getLocatorString(step);
    console.log(`  🔄 Dragging element to position ${targetIndex}`);

    // Get the source <li> element
    const sourceElement = await resolveElement(page, sourceSelector, step);
    await sourceElement.waitFor({ state: 'visible', timeout: 5000 });

    // Find the drag handle within the source element
    const dragHandle = sourceElement.locator('img[title="Drag to move"]').first();
    const hasDragHandle = await dragHandle.count() > 0;

    // Get parent and target
    const parentLocator = sourceElement.locator('xpath=..');
    const targetElement = parentLocator.locator(`> li:nth-child(${targetIndex})`);
    await targetElement.waitFor({ state: 'visible', timeout: 5000 });

    const sourceId = await sourceElement.getAttribute('id');
    const targetId = await targetElement.getAttribute('id');
    console.log(`  🎯 Moving "${sourceId}" to position of "${targetId}"`);

    // Drag using handle if available, otherwise use the element itself
    if (hasDragHandle) {
      console.log(`  🖐️ Using drag handle icon`);
      await dragHandle.dragTo(targetElement);
    } else {
      console.log(`  🖐️ Using element directly (no drag handle found)`);
      await sourceElement.dragTo(targetElement);
    }

    await waitForRoller(page);
    await sleep(500);

    console.log(`  ✅ Successfully dragged to position ${targetIndex}`);
    return { code: 0, value: `Element dragged to position ${targetIndex}` };

  } catch (error) {
    console.error('❌ Drag to position failed:', error);
    return { code: 1, value: `Drag failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function dragAndDropElement(page: Page, step: testStep): Promise<{ code: number; value: string }> {
  try {
    if (!step.value) {
      throw new Error('value is required (destination element reference)');
    }

    const sourceSelector = getLocatorString(step);
    console.log(`  🔄 Dragging from ${step.page}.${step.element}`);

    // Get the source element
    const sourceElement = await resolveElement(page, sourceSelector, step);
    await sourceElement.waitFor({ state: 'visible', timeout: 5000 });

    // Create destination step and get selector from locatorRepository
    const destinationStep = { ...step, element: step.value };
    const destinationSelector = getLocatorString(destinationStep);

    const destinationElement = await resolveElement(page, destinationSelector, destinationStep);
    await destinationElement.waitFor({ state: 'visible', timeout: 5000 });

    const sourceId = await sourceElement.getAttribute('id');
    const destId = await destinationElement.getAttribute('id');
    console.log(`  🎯 Moving "${sourceId}" to "${destId}"`);

    // Perform drag and drop using Playwright's dragTo method
    await sourceElement.dragTo(destinationElement);

    await waitForRoller(page);
    await sleep(500);

    console.log(`  ✅ Successfully dragged to ${destId}`);
    return { code: 0, value: `Element dragged from ${step.page}.${step.element} to ${destId}` };

  } catch (error) {
    console.error('❌ Drag and drop failed:', error);
    return { code: 1, value: `Drag and drop failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function selectCompositeListbox(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);
    const element = await resolveElement(page, baseSelector, step);

    let valueToSelect = '';

    if (step.isDDT === true && step.datasetColumnNames) {
      valueToSelect = step.datasetColumnNames;
    } else if (step.value) {
      valueToSelect = resolveTestVariables(step.value);
    }

    if (!valueToSelect) {
      throw new Error(`No value provided for selectCompositeListbox at ${step.page}.${step.element}`);
    }

    // Wait for element to be visible and clickable
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await element.scrollIntoViewIfNeeded({ timeout: 5000 });

    // Click the dropdown to open it
    await element.click({ force: true });

    // Wait for dropdown to open and find the search input field
    const dropdownSearchInput = page.locator('.select2-container--open .select2-search__field').first();

    // Wait for the search input to be visible
    await dropdownSearchInput.waitFor({ state: 'visible', timeout: 5000 });

    // Type the search value
    await dropdownSearchInput.fill(valueToSelect);

    // Wait briefly for filtering/results to appear
    await page.waitForTimeout(500);

    // Press Enter to select the filtered result
    await dropdownSearchInput.press('Enter');

    // Wait for dropdown to close and selection to be applied
    await page.waitForTimeout(1000);

    // // Optional: Verify selection was made
    // // This checks if the selected value is displayed in the dropdown
    // const selectedValueLocator = element.locator('.select2-selection__rendered');
    // const selectedText = await selectedValueLocator.textContent();

    console.log(`  ✅ Selected option "${valueToSelect}" in composite listbox ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully selected option: "${valueToSelect}" in element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to select option in composite listbox: ${step.page}.${step.element}`);
    console.error(`  Error details: ${error instanceof Error ? error.message : String(error)}`);

    return {
      code: 1,
      value: `Failed to select option in composite listbox: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// export async function selectFromSFS(page: Page, step: testStep): Promise<Outcome> {
//   try {
//     let sfsValues = step.datasetColumnNames || step.value;

//     if (sfsValues && typeof sfsValues === 'string') {
//       sfsValues = resolveTestVariables(sfsValues);
//     }

//     if (!sfsValues || sfsValues.trim() === '') {
//       return { code: 1, value: 'No SFS values provided' };
//     }

//     const valueArray = sfsValues.split("|").map(v => v.trim());
//     if (valueArray.length < 3) {
//       return { code: 1, value: 'Invalid SFS format. Expected: Type|SearchText|Description' };
//     }

//     const [type, searchText, description] = valueArray;
//     const radioStep = { ...step, page: '', element: '' };
//     let searchInput;
//     try {
//       if (await resolveElement(page, 'radCode', step)) {
//         console.log('SFS already open on the page.');
//         // Select search type
//         let radioSelector = "";
//         switch (type.toLowerCase()) {
//           case "code": radioSelector = '#busCod'; break;
//           case "description": radioSelector = '#busDesc'; break;
//           case "all": radioSelector = '#busAll'; break;
//           default: return { code: 1, value: `Invalid search type: ${type}` };
//         }

//         const radioButton = await resolveElement(page, radioSelector, radioStep);
//         await radioButton.click();
//         console.log(`Selected search type: ${type}`);
//       }

//       if (await resolveElement(page, '#inputBusqueda', step)) {
//         console.log('SFS already open on the page.');
//         try {
//           let searchInput = await resolveElement(page, '#inputBusqueda', step);
//           await searchInput.fill(searchText);
//         } catch {
//           let searchInput = await resolveElement(page, '#criterio', step);
//           await searchInput.fill(searchText);
//         }
//       }
//     } catch {
//       try {
//         if (await resolveElement(page, '#inputBusqueda', step)) {
//           console.log('SFS already open on the page.');
//           try {
//             let searchInput = await resolveElement(page, '#inputBusqueda', step);
//             await searchInput.fill(searchText);
//           } catch {
//             let searchInput = await resolveElement(page, '#criterio', step);
//             await searchInput.fill(searchText);
//           }
//         }
//       } catch {

//       }

//     }


//     // } catch {

//     // }

//     // console.log(`Entered search text: ${searchText}`);
//     // let pgcnt = context.pages().length;
//     // await searchInput.press('Enter')
//     // await sleep(2000); // Wait for potential page open/close
//     // let pgcnt2 = context.pages().length;
//     // context.pages().forEach(p => {
//     //   console.log(`Page: ${p.url()}`);
//     //   if (p.url().includes('codigoDesc') || p.url().includes('selecciona')) {
//     //     sfsPage = p;
//     //     sfsPageOpen = true;
//     //   }
//     // });

//     // if (!sfsPageOpen || !sfsPage) {
//     //   return { code: 0, value: 'SFS page not found after search' };
//     // }

//     // // if (pgcnt2 < pgcnt) {
//     // //   console.log(`SFS page closed after search Enter press`);
//     // //   return { code: 0, value: 'SFS completed (page closed)' };
//     // // }

//     // // // Race the Enter press against the page 'close' event because
//     // // // pressing Enter may trigger the SFS page to auto-close.
//     // // const closedPromise = sfsPage.waitForEvent('close').then(() => 'closed');

//     // // try {
//     // //   const pressPromise = searchInput.press('Enter').then(() => 'pressed');
//     // //   const result = await Promise.race([closedPromise, pressPromise]);

//     // //   if (result === 'closed' || sfsPage.isClosed()) {
//     // //     return { code: 0, value: 'SFS completed (page closed)' };
//     // //   }
//     // // } catch (err) {
//     // //   // If the page was closed while performing the press, treat as success
//     // //   const msg = err instanceof Error ? err.message : String(err);
//     // //   if (msg.includes('Target page, context or browser has been closed') || msg.includes('closed')) {
//     // //     return { code: 0, value: 'SFS completed (page closed)' };
//     // //   }
//     // //   throw err;
//     // // }

//     // await waitForRoller(sfsPage);

//     // // Find table
//     // const tableSelectors = ['#tablaInterior', '#divpanel table.tablapanel', 'table.tablapanel'];
//     // let tableLocator = null;
//     // const tempStep = { ...step, page: '', element: '' };

//     // for (const selector of tableSelectors) {
//     //   try {
//     //     const table = await resolveElement(page, selector, tempStep);
//     //     if (await table.isVisible({ timeout: 2000 })) {
//     //       tableLocator = table;
//     //       break;
//     //     }
//     //   } catch {
//     //     continue;
//     //   }
//     // }

//     // if (!tableLocator) {
//     //   return { code: 1, value: 'Table not found' };
//     // }

//     // // Find and click row
//     // const rowLocator = tableLocator.locator('tbody tr').filter({
//     //   has: sfsPage.locator('td', { hasText: description })
//     // });

//     // const rowCount = await rowLocator.count();
//     // if (rowCount === 0) {
//     //   return { code: 1, value: `No row found with: ${description}` };
//     // }

//     // await rowLocator.first().scrollIntoViewIfNeeded();
//     // await rowLocator.first().click();
//     // console.log(`Selected row: ${description}`);

//     // await waitForRoller(sfsPage);

//     // // Click accept button
//     // const acceptSelectors = ['#btn-ok', 'button:has-text("Aceptar")', 'button:has-text("OK")'];
//     // for (const selector of acceptSelectors) {
//     //   try {
//     //     const btn = sfsPage.locator(selector);
//     //     if (await btn.isVisible({ timeout: 1000 })) {
//     //       await btn.click();
//     //       break;
//     //     }
//     //   } catch {
//     //     continue;
//     //   }
//     // }

//     return { code: 0, value: `SFS selected: ${description}` };

//   } catch (error) {
//     if (error instanceof Error && error.message.includes('closed')) {
//       return { code: 0, value: 'SFS completed (page closed)' };
//     }
//     return { code: 1, value: `Failed: ${error instanceof Error ? error.message : String(error)}` };
//   }
// }

// export async function clickBodyPart(page: Page, step: testStep): Promise<Outcome> {
//   try {
//     const baseSelector = getLocatorString(step);
//     await waitForRoller(page);

//     // -------------------------------
//     // 1) Resolve menu values
//     // -------------------------------
//     const VALUE_KEYS = ["value", "values", "datasetcolumnname", "datasetcolumnnames"];
//     const rawValue = VALUE_KEYS.map(k => (step as any)[k]).find(v => v != null && String(v).trim());
//     if (!rawValue) return { code: 1, value: "No option text provided in step." };

//     const menuValues = String(rawValue).split("|").map(v => v.trim()).filter(Boolean);
//     if (!menuValues.length) return { code: 1, value: "Option text is empty after parsing." };

//     // -------------------------------
//     // 2) Locate <area> and compute click point
//     // -------------------------------
//     const area = page.locator(baseSelector).first();
//     await area.waitFor({ state: "attached", timeout: 15000 });

//     const { shape, coords, mapName } = await area.evaluate((el: HTMLAreaElement) => {
//       const map = el.parentElement as HTMLMapElement | null;
//       const shape = (el.getAttribute("shape") || "poly").toUpperCase();
//       const coords = (el.getAttribute("coords") || "")
//         .split(",")
//         .map(n => +n.trim())
//         .filter(n => !isNaN(n));
//       return { shape, coords, mapName: map?.getAttribute("name") || "" };
//     });

//     if (!coords.length || !mapName) return { code: 2, value: "Invalid <area>: missing coords or map name." };

//     const computeClickPoint = (shape: string, coords: number[]) => {
//       if (shape === "RECT") return { x: (coords[0] + coords[2]) / 2, y: (coords[1] + coords[3]) / 2 };
//       if (shape === "CIRCLE") return { x: coords[0], y: coords[1] };
//       // POLY centroid
//       const n = coords.length / 2;
//       let sx = 0, sy = 0;
//       for (let i = 0; i < coords.length; i += 2) {
//         sx += coords[i];
//         sy += coords[i + 1];
//       }
//       return { x: sx / n, y: sy / n };
//     };

//     const point = computeClickPoint(shape, coords);

//     // -------------------------------
//     // 3) Locate image, scale, and click
//     // -------------------------------
//     const img = page.locator(`img[usemap="#${mapName}"]`).first();
//     await img.waitFor({ state: "visible", timeout: 15000 });
//     await img.scrollIntoViewIfNeeded().catch(() => { });

//     const { scaleX, scaleY } = await img.evaluate((imgEl: HTMLImageElement) => {
//       const rect = imgEl.getBoundingClientRect();
//       const w = imgEl.naturalWidth || rect.width;
//       const h = imgEl.naturalHeight || rect.height;
//       return { scaleX: rect.width / (w || 1), scaleY: rect.height / (h || 1) };
//     });

//     const clickPos = { x: point.x * scaleX, y: point.y * scaleY };
//     await img.click({ position: clickPos, timeout: 30000 }).catch(() =>
//       img.dblclick({ position: clickPos, timeout: 30000 })
//     );

//     // -------------------------------
//     // 4) Click menu options
//     // -------------------------------
//     for (const label of menuValues) {
//       const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
//       const item = page.getByText(new RegExp(`${escaped}`, "i")).first();
//       await item.waitFor({ state: "visible", timeout: 5000 });
//       await item.click();
//     }

//     return { code: 0, value: `Selected: ${menuValues.join(" > ")}` };
//   } catch (error) {
//     return { code: 1, value: `Failed: ${error instanceof Error ? error.message : String(error)}` };
//   }
// }

export async function verifyBodyImagePart(page: Page, step: testStep): Promise<Outcome> {
  try {
    let valueToUse = step.value || '';
    if (step.isDDT === true && step.datasetColumnNames) {
      valueToUse = step.datasetColumnNames;
    } else if (step.value) {
      valueToUse = resolveTestVariables(step.value || '');
    }

    if (!valueToUse || !valueToUse.includes('|')) {
      throw new Error('Invalid input. Expected format: PartNo|Type (e.g. 4|Ulcer)');
    }

    const parts = valueToUse.split('|').map(s => s.trim());
    const partNo = parts[0];
    const markerType = (parts[1] || '').toLowerCase();

    if (!partNo) {
      throw new Error('Part number is required');
    }

    // id -> alt attribute mapping for idZona areas (used for green marker detection)
    const idToAltMap: { [key: string]: string } = {
      '1': 'Parte delantera de la cabeza',
      '2': 'Oreja derecha',
      '3': 'Oreja izquierda',
      '4': 'Parte delantera del cuello',
      '5': 'Tórax derecho',
      '6': 'Tórax izquierdo',
      '7': 'Esternón',
      '8': 'Cuadrante superior derecho',
      '9': 'Cuadrante superior izquierdo',
      '10': 'Cuadrante inferior derecho',
      '11': 'Cuadrante inferior izquierdo',
      '12': 'Línea media abdominal',
      '13': 'Ombligo',
      '14': 'Área púbica y perianal',
      '15': 'Trócanter derecho (cadera)',
      '16': 'Trocanter izquierdo (cadera)',
      '17': 'Muslo anterior derecho',
      '18': 'Rodilla derecha',
      '19': 'Pierna inferior anterior derecha',
      '20': 'Tobillo derecho (interior/exterior)',
      '21': 'Pie derecho',
      '22': 'Dedos del pie derecho',
      '23': 'Muslo anterior izquierdo',
      '24': 'Rodilla izquierda',
      '25': 'Pierna inferior anterior izquierda',
      '26': 'Tobillo izquierdo (interior/exterior)',
      '27': 'Pie izquierdo',
      '28': 'Dedos del pie izquierdo',
      '29': 'Brazo derecho superior interior',
      '30': 'Antebrazo derecho interior',
      '31': 'Muñeca derecha',
      '32': 'Palma de la mano derecha',
      '33': 'Dedos de la mano derecha',
      '34': 'Brazo izquierdo superior interior',
      '35': 'Antebrazo izquierdo interior',
      '36': 'Muñeca izquierda',
      '37': 'Palma de la mano izquierda',
      '38': 'Dedos de la mano izquierda'
    };

    // Try several selectors that the app may use for the human-body markup
    const possibleSelectors = [
      `#area_${partNo}`,
      `#${partNo}_localizacion`,
      `[codlocalizacion="${partNo}"]`,
      `area[id*="${partNo}"]`
    ];

    await waitForRoller(page);

    // Evaluate in page: find the area element by id, then find overlay block(s) whose title contains the area's description
    const result = await page.evaluate(({ p, mType, raw, altMap }: { p: string; mType: string; raw: string; altMap: { [key: string]: string } }) => {
      // ===== Helper Functions =====
      function parseRGB(val: string) {
        if (!val) return null;
        const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
        const h = val.match(/#([0-9a-f]{6})/i);
        if (h) {
          const hex = h[1];
          return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        }
        return null;
      }

      function isRedColor(val: string) {
        if (!val) return false;
        const v = val.toString().trim().toLowerCase();
        if (!v) return false;
        if (v === 'red') return true;
        if (v.includes('rgb(255, 0, 0)') || v.includes('rgba(255, 0, 0')) return true;
        if (v.includes('#ff0000')) return true;
        const rgb = parseRGB(v);
        if (rgb) {
          const [r, g, b] = rgb;
          if (r >= 150 && r > g + 20 && r > b + 20) return true;
        }
        return false;
      }

      function isGreenColor(val: string) {
        if (!val) return false;
        const v = val.toString().trim().toLowerCase();
        if (!v) return false;
        if (v === 'green') return true;
        if (v.includes('rgb(0, 255, 0)') || v.includes('rgba(0, 255, 0')) return true;
        if (v.includes('#00ff00')) return true;
        const rgb = parseRGB(v);
        if (rgb) {
          const [r, g, b] = rgb;
          if (g >= 150 && g > r + 20 && g > b + 20) return true;
        }
        return false;
      }

      function normalizeText(s: string) {
        if (!s) return '';
        try {
          return s.toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
        } catch (e) {
          return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        }
      }

      // ===== Main Logic =====
      const greenTypes = ['track', 'drain', 'stoma', 'probe', 'immobilization'];
      const isGreenMarker = greenTypes.some(g => mType.includes(g));

      if (isGreenMarker) {
        // GREEN marker path
        const areaIdGreen = 'idZona_' + p;
        const areaG = document.getElementById(areaIdGreen);
        if (!areaG) return { ok: false, reason: 'green-area-not-found', tried: [areaIdGreen] };

        let alt = '';
        if (altMap && altMap[p]) {
          alt = altMap[p];
        } else {
          alt = (areaG.getAttribute('alt') || '').toString().trim();
        }

        if (!alt) return { ok: false, reason: 'green-area-no-alt', area: { id: areaG.id || '', partNo: p } };

        const altNorm = normalizeText(alt);
        const overlaysAll = Array.from(document.querySelectorAll('div[title]')) as Element[];
        const matching = overlaysAll.filter(o => {
          const t = normalizeText((o.getAttribute('title') || '').toString());
          return t && t.includes(altNorm);
        });

        if (matching.length === 0) {
          const allTitles = overlaysAll.map(o => ({ id: o.id || null, title: (o.getAttribute('title') || '').toString() }));
          return { ok: false, reason: 'no-green-overlay', area: { id: areaG.id || '', alt }, overlays: allTitles };
        }

        const checkedGreen: any[] = [];
        for (const r of matching) {
          try {
            const rstyle = window.getComputedStyle(r as Element);
            const rprops = [rstyle.getPropertyValue('background-color') || '', rstyle.getPropertyValue('background') || '', rstyle.getPropertyValue('fill') || ''];
            for (const rp of rprops) {
              if (isGreenColor(rp)) return { ok: true, selector: (r.id || '').toString(), matchedOn: 'overlay', matchedProp: rp, area: { id: areaG.id || '', alt } };
            }

            const descendants = Array.from((r as Element).querySelectorAll('*')) as Element[];
            let matchCount = 0;
            for (const d of descendants) {
              try {
                const inlineRaw = d.getAttribute('style') || '';
                if (inlineRaw) {
                  const m = inlineRaw.match(/(?:background(?:-color)?|background)\s*:\s*([^;]+)/i);
                  if (m && m[1] && isGreenColor(m[1].toString().trim())) {
                    matchCount++;
                    break;
                  }
                }
                const dstyle = window.getComputedStyle(d as Element);
                const dprops = [dstyle.getPropertyValue('background-color') || '', dstyle.getPropertyValue('background') || ''];
                for (const dp of dprops) {
                  if (isGreenColor(dp)) {
                    matchCount++;
                    break;
                  }
                }
                if (matchCount) break;
              } catch { }
            }

            checkedGreen.push({ id: r.id || null, title: (r.getAttribute('title') || '').toString(), matchCount });
            if (matchCount > 0) return { ok: true, selector: (r.id || '').toString(), matchedOn: 'descendant', matches: matchCount, area: { id: areaG.id || '', alt } };
          } catch { }
        }

        return { ok: false, reason: 'matching-overlay-no-green', checked: checkedGreen, area: { id: areaG.id || '', alt } };
      }

      // RED marker path (Ulcer, Wound, Burn)
      const areaId = 'area_' + p;
      let area = document.getElementById(areaId);
      if (!area) {
        area = document.querySelector(`[codlocalizacion="${p}"]`) || document.querySelector(`#${p}_localizacion`) || null;
      }
      if (!area) return { ok: false, reason: 'area-not-found', tried: [areaId] };

      const descrRaw = (area.getAttribute('descripcion') || (area as HTMLElement).title || '').toString().trim();
      const descr = normalizeText(descrRaw);
      const areaInfo = { id: area.id || '', descr };

      const keywords: string[] = [];
      const mt = mType.toLowerCase();
      if (mt.includes('ulc')) keywords.push('registered ulcers', 'registered ulcer');
      if (mt.includes('wound') || mt.includes('inj')) keywords.push('registered injuries', 'registered injury', 'registered injuries:');
      if (mt.includes('burn')) keywords.push('registered burns', 'registered burn');
      keywords.push('registered');

      const keywordsNorm = keywords.map((k: string) => normalizeText(k));
      const rawNorm = normalizeText(raw || '');
      const rawParts = rawNorm && rawNorm.includes('|') ? rawNorm.split('|').map((s: string) => s.trim()).filter(Boolean) : (rawNorm ? [rawNorm] : []);

      const overlays = Array.from(document.querySelectorAll('div[title]')) as Element[];
      const checked: any[] = [];
      const matchingOverlays: Element[] = [];
      for (const r of overlays) {
        try {
          const rawTitle = (r.getAttribute('title') || '').toString();
          if (!rawTitle) continue;
          const titleNorm = normalizeText(rawTitle);

          const titleMatchesDescr = descr ? titleNorm.includes(descr) : false;
          const titleHasKeyword = keywordsNorm.some((k: string) => titleNorm.includes(k));
          const titleMatchesRaw = rawParts.length ? rawParts.some((rp: string) => titleNorm.includes(rp)) : true;
          if (!(titleMatchesDescr && titleHasKeyword && titleMatchesRaw)) continue;

          matchingOverlays.push(r);
        } catch { }
      }

      if (matchingOverlays.length === 0) {
        const allTitles = overlays.map(o => ({ id: o.id || null, title: (o.getAttribute('title') || '').toString() }));
        return { ok: false, reason: 'no-matching-overlay', overlays: allTitles, area: areaInfo };
      }

      for (const r of matchingOverlays) {
        try {
          const rstyle = window.getComputedStyle(r as Element);
          const rprops = [rstyle.getPropertyValue('background-color') || '', rstyle.getPropertyValue('background') || '', rstyle.getPropertyValue('fill') || ''];
          for (const rp of rprops) {
            if (isRedColor(rp)) return { ok: true, selector: (r.id || '').toString(), matchedOn: 'overlay', matchedProp: rp, area: areaInfo };
          }

          const descendants = Array.from((r as Element).querySelectorAll('*')) as Element[];
          let matchCount = 0;
          for (const d of descendants) {
            try {
              const inlineRaw = d.getAttribute('style') || '';
              if (inlineRaw) {
                const m = inlineRaw.match(/(?:background(?:-color)?|background)\s*:\s*([^;]+)/i);
                if (m && m[1] && isRedColor(m[1].toString().trim())) {
                  matchCount++;
                  break;
                }
              }
              const dstyle = window.getComputedStyle(d as Element);
              const dprops = [dstyle.getPropertyValue('background-color') || '', dstyle.getPropertyValue('background') || ''];
              for (const dp of dprops) {
                if (isRedColor(dp)) {
                  matchCount++;
                  break;
                }
              }
              if (matchCount) break;
            } catch { }
          }

          checked.push({ id: r.id || null, title: (r.getAttribute('title') || '').toString(), matchCount });
          if (matchCount > 0) return { ok: true, selector: (r.id || '').toString(), matchedOn: 'descendant', matches: matchCount, area: areaInfo };
        } catch { }
      }

      return { ok: false, reason: 'matching-overlay-no-red', checked, area: areaInfo };
    }, { p: partNo, mType: markerType, raw: valueToUse, altMap: idToAltMap });

    if (result && result.ok) {
      const colorType = markerType.toLowerCase().includes('track') || markerType.toLowerCase().includes('drain') || markerType.toLowerCase().includes('stoma') || markerType.toLowerCase().includes('probe') ? 'green' : 'red';
      console.log(`  ✅ Body part ${partNo} marked with ${colorType} background (selector: ${result.selector}) for marker: ${markerType}`);
      return { code: 0, value: `Body part ${partNo} is marked with ${colorType} background as expected (${markerType}). Details: ${JSON.stringify(result)}` };
    }

    const colorType = markerType.toLowerCase().includes('track') || markerType.toLowerCase().includes('drain') || markerType.toLowerCase().includes('stoma') || markerType.toLowerCase().includes('probe') ? 'green' : 'red';
    console.error(`  ❌ Body part ${partNo} was not marked in ${colorType} background for marker: ${markerType}. Diagnostics: ${JSON.stringify(result)}`);
    return { code: 1, value: `Body part ${partNo} not marked in ${colorType} background for ${markerType}. Diagnostics: ${JSON.stringify(result)}` };

  } catch (error) {
    console.error(`  ❌ Failed to verify body image part: ${error instanceof Error ? error.message : String(error)}`);
    return { code: 1, value: `Failed to verify body image part: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function selectMenu(page: Page, step: testStep): Promise<Outcome> {
  try {

    const menuFrame = await page.locator('iframe#menu').contentFrame();

    if (!menuFrame) {
      return { code: 1, value: 'Menu frame not found' };
    }

    let menuValues = step.datasetColumnNames ? step.datasetColumnNames : step.value;

    if (typeof menuValues === 'string') {
      menuValues = resolveTestVariables(menuValues);
    }

    if (!menuValues || menuValues.trim() === '') {
      return { code: 1, value: 'No menu values provided' };
    }

    const menuPath = menuValues.split('|').map(v => v.trim()).filter(Boolean);

    for (const itemText of menuPath) {

      const escapedText = itemText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameRegex = new RegExp(`^${escapedText}$`, 'i');

      const menuItem = menuFrame
        .getByRole('button', { name: nameRegex })
        .or(menuFrame.getByRole('link', { name: nameRegex }))
        .or(menuFrame.getByText(nameRegex));

      if (!(await menuItem.count())) {
        return { code: 3, value: itemText };
      }

      const element = menuItem.first();

      await element.scrollIntoViewIfNeeded();
      await element.waitFor({ state: 'visible', timeout: 20000 });

      // ===== Detect collapse parent =====
      const collapseInfo = await element.evaluate(el => {

        const isCollapseTrigger =
          el.hasAttribute('data-toggle') ||
          el.className.includes('collapser');

        const ariaExpanded = el.getAttribute('aria-expanded');

        const isCollapsedClass = el.className.includes('collapsed');

        const targetId = el.getAttribute('href')?.replace('#', '');

        return { isCollapseTrigger, ariaExpanded, isCollapsedClass, targetId };
      });

      // ===== Parent Menu Handling =====
      if (collapseInfo.isCollapseTrigger) {

        const shouldExpand =
          collapseInfo.ariaExpanded === 'false' ||
          collapseInfo.ariaExpanded === null && collapseInfo.isCollapsedClass;

        if (shouldExpand) {

          await element.click();

          // ⭐ WAIT for submenu container to expand
          if (collapseInfo.targetId) {

            const subMenu = menuFrame.locator(`#${collapseInfo.targetId}`);

            await subMenu.waitFor({ state: 'visible', timeout: 10000 });

            // wait for bootstrap animation finish
            await subMenu.waitFor({ state: 'attached' });

            await subMenu.evaluate(el => {
              return new Promise(resolve => {
                if (el.classList.contains('show')) {
                  resolve(true);
                } else {
                  const obs = new MutationObserver(() => {
                    if (el.classList.contains('show')) {
                      obs.disconnect();
                      resolve(true);
                    }
                  });
                  obs.observe(el, { attributes: true });
                }
              });
            });
          }
        }

      } else {
        await element.click();
      }
      await page.waitForTimeout(2000);
    }

    return {
      code: 0,
      value: `Successfully navigated menu: ${menuPath.join(' > ')}`
    };

  } catch (error) {
    return {
      code: 4,
      value: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function selectSFS_workingversion(page: Page, step: testStep): Promise<Outcome> {
  try {

    let sfsValues = step.datasetColumnNames || step.value;

    if (typeof sfsValues === 'string') {
      sfsValues = resolveTestVariables(sfsValues);
    }

    if (!sfsValues?.trim()) {
      return { code: 1, value: 'No SFS values provided' };
    }

    /* -------------------------
       Parse Input
    ------------------------- */

    const valueArray = sfsValues.split('|').map(v => v.trim());

    let type: string;
    let searchText: string;
    let description: string;

    if (valueArray.length === 1) {
      type = 'all';
      searchText = valueArray[0];
      description = valueArray[0];
    }
    else if (valueArray.length === 2) {
      type = 'all';
      searchText = valueArray[0];
      description = valueArray[1];
    }
    else {
      type = valueArray[0].toLowerCase();
      searchText = valueArray[1];
      description = valueArray[2];
    }

    /* -------------------------
       Resolve SFS Page
    ------------------------- */

    const context = page.context();
    let sfsPage: Page | null = null;

    const urlPatterns = [
      'codigoDesc',
      'selecciona',
      'mostrarUnidadControl',
      'RecursosLibres'
    ];

    if (urlPatterns.some(p => page.url().includes(p))) {
      sfsPage = page;
    }
    else {
      try {
        sfsPage = await context.waitForEvent('page', {
          predicate: p => urlPatterns.some(pt => p.url().includes(pt)),
          timeout: 30000
        });

        await sfsPage.waitForLoadState('domcontentloaded');
        await sfsPage.waitForLoadState('networkidle').catch(() => { });

      } catch {
        return { code: 1, value: 'SFS popup did not open' };
      }
    }

    if (!sfsPage) {
      return { code: 1, value: 'Unable to resolve SFS page' };
    }

    await waitForRoller(sfsPage);

    /* -------------------------
       Select Search Type
    ------------------------- */

    const tempStep = { ...step, page: '', element: '' };

    let radioSelector = '';

    switch (type) {
      case 'code':
        radioSelector = '#busCod, #radCode';
        break;
      case 'description':
        radioSelector = '#busDesc, #radDesc';
        break;
      default:
        radioSelector = '#busAll, #radAll';
    }

    try {
      const radio = await resolveElement(sfsPage, radioSelector, tempStep);
      await radio.click();
    } catch {
      // ignore if radio not present
    }

    /* -------------------------
       Enter Search Text
    ------------------------- */

    let searchInput;

    try {
      searchInput = await resolveElement(sfsPage, '#inputBusqueda', tempStep);
    }
    catch {
      searchInput = await resolveElement(sfsPage, '#criterio', tempStep);
    }

    await searchInput.fill(searchText);
    await searchInput.press('Enter');

    await waitForRoller(sfsPage);

    /* -------------------------
       Resolve Table
    ------------------------- */

    const tableSelectors = [
      '#tablaInterior',
      '#divpanel table.tablapanel',
      'table.tablapanel'
    ];

    let tableElement = null;

    for (const selector of tableSelectors) {
      try {
        const table = await resolveElement(sfsPage, selector, tempStep);

        if (await table.isVisible({ timeout: 2000 })) {
          tableElement = table;
          break;
        }
      } catch { }
    }

    if (!tableElement) {
      return { code: 1, value: 'SFS table not found' };
    }

    /* -------------------------
       Select Row
    ------------------------- */

    const rowLocator = tableElement.locator('tbody tr').filter({
      has: sfsPage.locator('td', { hasText: description })
    });

    if (!(await rowLocator.count())) {
      return { code: 1, value: `No row found with ${description}` };
    }

    await rowLocator.first().scrollIntoViewIfNeeded();
    await rowLocator.first().click();

    await waitForRoller(sfsPage);

    /* -------------------------
       Click Accept
    ------------------------- */

    const acceptSelectors = [
      '#btn-ok',
      'button:has-text("Aceptar")',
      'button:has-text("OK")'
    ];

    for (const selector of acceptSelectors) {
      try {
        const btn = sfsPage.locator(selector);

        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          break;
        }
      } catch { }
    }

    return {
      code: 0,
      value: `SFS selected: ${description}`
    };

  }
  catch (error) {

    if (error instanceof Error && error.message.includes('closed')) {
      return { code: 0, value: 'SFS completed (popup closed)' };
    }

    return {
      code: 1,
      value: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function selectSFS(page: Page, step: testStep): Promise<Outcome> {
  try {

    let sfsValues = step.datasetColumnNames || step.value;

    if (typeof sfsValues === 'string') {
      sfsValues = resolveTestVariables(sfsValues);
    }

    if (!sfsValues?.trim()) {
      return { code: 1, value: 'No SFS values provided' };
    }

    /* ---------------- Parse Input ---------------- */

    const valueArray = sfsValues.split('|').map(v => v.trim());

    let type = 'all';
    let searchText = '';
    let description = '';

    if (valueArray.length === 1) {
      searchText = description = valueArray[0];
    }
    else if (valueArray.length === 2) {
      searchText = valueArray[0];
      description = valueArray[1];
    }
    else {
      type = valueArray[0].toLowerCase();
      searchText = valueArray[1];
      description = valueArray[2];
    }

    /* ---------------- Resolve SFS Page ---------------- */

    const context = page.context();

    const urlPatterns = [
      'codigoDesc',
      'selecciona',
      'mostrarUnidadControl',
      'RecursosLibres'
    ];

    let sfsPage =
      urlPatterns.some(p => page.url().includes(p))
        ? page
        : await context.waitForEvent('page', {
          predicate: p => urlPatterns.some(pt => p.url().includes(pt)),
          timeout: 30000
        }).catch(() => null);

    if (!sfsPage) {
      return { code: 1, value: 'SFS popup did not open' };
    }

    await sfsPage.waitForLoadState('domcontentloaded');
    await sfsPage.waitForLoadState('networkidle').catch(() => { });
    await waitForRoller(sfsPage);

    /* ---------------- Select Search Type ---------------- */

    const tempStep = { ...step, page: '', element: '' };

    const radioSelectorMap: Record<string, string> = {
      code: '#busCod, #radCode',
      description: '#busDesc, #radDesc',
      all: '#busAll, #radAll'
    };

    const radioSelector = radioSelectorMap[type] || radioSelectorMap.all;

    const radio = await resolveElement(sfsPage, radioSelector, tempStep).catch(() => null);
    if (radio) await radio.click();

    /* ---------------- Enter Search Text ---------------- */

    const searchInput =
      await resolveElement(sfsPage, '#inputBusqueda', tempStep).catch(() => null) ||
      await resolveElement(sfsPage, '#criterio', tempStep).catch(() => null);

    if (!searchInput) {
      return { code: 1, value: 'Search input not found' };
    }

    await searchInput.fill(searchText);
    await searchInput.press('Enter');

    await waitForRoller(sfsPage);

    /* ---------------- Resolve Table ---------------- */

    const tableSelectors = [
      '#tablaInterior',
      '#divpanel table.tablapanel',
      'table.tablapanel'
    ];

    let tableElement = null;

    for (const selector of tableSelectors) {
      const table = await resolveElement(sfsPage, selector, tempStep).catch(() => null);
      if (table && await table.isVisible({ timeout: 2000 }).catch(() => false)) {
        tableElement = table;
        break;
      }
    }

    if (!tableElement) {
      return { code: 1, value: 'SFS table not found' };
    }

    /* ---------------- Select Row ---------------- */

    const rowLocator = tableElement.locator('tbody tr').filter({
      has: sfsPage.locator('td', { hasText: description })
    });

    if (!(await rowLocator.count())) {
      return { code: 1, value: `No row found with ${description}` };
    }

    await rowLocator.first().scrollIntoViewIfNeeded();
    await rowLocator.first().click();

    await waitForRoller(sfsPage);

    /* ---------------- Click Accept ---------------- */

    const acceptSelectors = [
      '#btn-ok',
      'button:has-text("Aceptar")',
      'button:has-text("OK")'
    ];

    for (const selector of acceptSelectors) {
      const btn = sfsPage.locator(selector);
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await btn.click();
        break;
      }
    }

    return {
      code: 0,
      value: `SFS selected: ${description}`
    };

  }
  catch (error) {

    if (error instanceof Error && error.message.includes('closed')) {
      return { code: 0, value: 'SFS completed (popup closed)' };
    }

    return {
      code: 1,
      value: error instanceof Error ? error.message : String(error)
    };
  }
}


//LORENZO functions starts here

/**
 * Switch to a specific tab/dialog by title
 * @param page - Current page
 * @param step - Test step with property format: "title|TabTitle"
 * @returns Outcome indicating success/failure
 * @example
 * Property: "title|Create referral"
 * Switches to the tab/dialog with title containing "Create referral"
 */
export async function selectTab(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.property) {
      throw new Error('Property is required for selectTab. Format: "title|TabTitle"');
    }

    const [matchType, searchValue] = step.property.split('|').map(v => v.trim());
    if (!matchType || !searchValue) {
      throw new Error(`Invalid property format. Expected: "title|TabTitle", Got: "${step.property}"`);
    }

    const ctx = page.context();
    const browser = ctx.browser();
    const contexts = browser ? browser.contexts() : [ctx];
    
    console.log(`  🔍 Searching for tab/dialog with ${matchType}="${searchValue}"`);

    // Search all pages and dialogs across all contexts
    for (const c of contexts) {
      for (const p of c.pages()) {
        try {
          if (p.isClosed()) continue;
          
          const pageTitle = await p.title().catch(() => '');
          const pageUrl = p.url();
          
          // Check page title
          if (matchType.toLowerCase() === 'title' && pageTitle.toLowerCase().includes(searchValue.toLowerCase())) {
            console.log(`  ✅ Found tab: "${pageTitle}" - Switching to it`);
            await p.bringToFront();
            return {
              code: 0,
              value: `Successfully switched to tab: ${pageTitle}`
            };
          }
          
          // Check URL
          if (matchType.toLowerCase() === 'url' && pageUrl.toLowerCase().includes(searchValue.toLowerCase())) {
            console.log(`  ✅ Found tab by URL: "${pageTitle}" - Switching to it`);
            await p.bringToFront();
            return {
              code: 0,
              value: `Successfully switched to tab by URL: ${pageTitle}`
            };
          }
        } catch { continue; }
      }
    }

    throw new Error(`Tab/dialog with ${matchType}="${searchValue}" not found`);
  } catch (error) {
    return {
      code: 1,
      value: `Failed to select tab: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function handleDialog(page: Page, step: testStep): Promise<void> {
  try {
 
    if (!step.value) {
      throw new Error('No values provided for dialog handling.');
    }
 
    /* ---------- Parse Input ---------- */
 
    const values = step.value.split('|').map(v => v.trim());
 
    const dialogIndex = values[0] ? parseInt(values[0]) : 0;
    const action = values[1]?.toLowerCase() || 'ok';
    const variableName = values[2]?.startsWith('_') ? values[2] : null;
 
    /* ---------- Extract Dialog Text (optional) ---------- */
 
    if (variableName) {
      try {
        const messageElement =
          await resolveElement(page, '#tdMessage', step).catch(() => null)
          || await resolveElement(page, 'body', step).catch(() => null);
 
        if (messageElement) {
          const text = (await messageElement.textContent())?.trim().replace(/\s+/g, ' ') || '';
          console.log(`${variableName} = "${text}"`);
        }
      } catch {
        // safe ignore
      }
    }
 
    /* ---------- Title Mapping ---------- */
 
    const actionTitleMap: Record<string, string[]> = {
      ok: ['Ok', 'OK'],
      cancel: ['Cancel'],
      yes: ['Yes'],
      no: ['No'],
      save: ['Save'],
      close: ['Close'],
      dismiss: ['Cancel', 'Close'],
      accept: ['OK', 'Accept'],
      'finish now': ['Finish now', 'Finish Now']
    };
 
    const titles = actionTitleMap[action] || [action];
 
    console.log(`🔍 Attempting to handle dialog action: "${action}" (looking for: ${titles.join(', ')})`);

    /* ---------- Discover dialog frames (available for all strategies) ---------- */
    const frames = page.frames();
    const dialogFrames = frames.filter(f => {
      const url = f.url();
      return url.includes('AppDialog.aspx') || url.includes('AppWizardPage.aspx');
    }).sort((a, b) => frames.indexOf(b) - frames.indexOf(a)); // Innermost first

    console.log(`   📋 Found ${dialogFrames.length} dialog frames to search`);
 
    /* ---------- Strategy 0: Use JavaScript evaluation within dialog frames (most reliable) ---------- */
    console.log(`   🔎 Searching in dialog frames - using JavaScript evaluation...`);

    for (const title of titles) {
      // Try each dialog frame with direct JavaScript execution
      for (const frame of dialogFrames) {
        try {
          console.log(`   📍 Trying frame: ${frame.url()}`);
          const result = await frame.evaluate((buttonTitle: string) => {
            // Find button by title attribute
            let button = Array.from(document.querySelectorAll('button')).find(b => b.title === buttonTitle);
            
            // If not found by title, try by text content
            if (!button) {
              button = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === buttonTitle);
            }
            
            // If button found and visible, click it
            if (button) {
              const isVisible = button.offsetParent !== null;
              const isEnabled = !button.disabled;
              
              return {
                found: true,
                visible: isVisible,
                enabled: isEnabled,
                text: button.textContent?.trim().substring(0, 50) || 'N/A'
              };
            }
            
            return { found: false };
          }, title);
          
          console.log(`   📊 Button search result:`, JSON.stringify(result));
          
          if (result.found && result.visible && result.enabled) {
            // Found clickable button - now click it
            await frame.evaluate((buttonTitle: string) => {
              let button = Array.from(document.querySelectorAll('button')).find(b => b.title === buttonTitle);
              if (!button) {
                button = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === buttonTitle);
              }
              if (button) {
                button.click();
              }
            }, title);
            
            console.log(`✅ Clicked button "${title}" in frame`);
            
            // Wait for any dialog/modal to close
            await page.waitForLoadState('networkidle').catch(() => null);
            
            // Wait a bit more to ensure dialog actually closes
            await page.waitForTimeout(500).catch(() => null);
            
            console.log(`✅ Successfully clicked button "${title}" via frame.evaluate()`);
            return;
          } else if (result.found) {
            console.log(`   ⚠️ Button found but not clickable: visible=${result.visible}, enabled=${result.enabled}, text="${result.text}"`);
          }
        } catch (frameErr) {
          console.log(`   ⚠️ Frame evaluation error: ${frameErr instanceof Error ? frameErr.message : String(frameErr)}`);
        }
      }
    }
 
    /* ---------- Strategy 1: Find button by ancestor traversal (main page) ---------- */
 
    for (const title of titles) {
      try {
        // Strategy 1A: Direct title on button
        const directButtons = await page.locator(`button[title="${title}"]`).all();
        for (const btn of directButtons) {
          if (await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
            console.log(`✅ Found button with direct title="${title}"`);
            await btn.scrollIntoViewIfNeeded();
            await btn.click({ force: false });
            await page.waitForLoadState('networkidle').catch(() => null);
            return;
          }
        }
 
        // Strategy 1B: Title on child element, traverse to button
        const childElements = await page.locator(`[title="${title}"]`).all();
        for (const elem of childElements) {
          try {
            const button = elem.locator('xpath=ancestor::button[1]');
            const exists = await button.count().catch(() => 0);
            
            if (exists > 0 && await button.isVisible().catch(() => false) && await button.isEnabled().catch(() => false)) {
              console.log(`✅ Found button ancestor for title="${title}"`);
              await button.scrollIntoViewIfNeeded();
              await button.click({ force: false });
              await page.waitForLoadState('networkidle').catch(() => null);
              return;
            }
          } catch {
            continue;
          }
        }
        
        // Strategy 1C: Button containing child with matching title
        const buttonWithChild = await page.locator(`button:has([title="${title}"])`).first();
        if (buttonWithChild && await buttonWithChild.isVisible().catch(() => false) && await buttonWithChild.isEnabled().catch(() => false)) {
          console.log(`✅ Found button with child title="${title}"`);
          await buttonWithChild.scrollIntoViewIfNeeded();
          await buttonWithChild.click({ force: false });
          await page.waitForLoadState('networkidle').catch(() => null);
          return;
        }
      } catch (err) {
        console.log(`   Strategy 1 error for "${title}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
 
    /* ---------- Strategy 2: Find button by text content ---------- */
 
    for (const title of titles) {
      try {
        // Try in dialog frames first
        for (const frame of dialogFrames) {
          try {
            const frameTextButtons = await frame.locator(`button:has-text("${title}")`).all();
            console.log(`   Found ${frameTextButtons.length} buttons in dialog frame with text "${title}"`);
            
            // Use frame.evaluate() to actually click the button found in frame
            const clicked = await frame.evaluate((buttonText: string) => {
              const buttons = Array.from(document.querySelectorAll('button'));
              let button = buttons.find(b => b.textContent?.trim() === buttonText);
              
              if (!button) {
                button = buttons.find(b => b.textContent?.includes(buttonText));
              }
              
              if (button) {
                const isVisible = button.offsetParent !== null;
                const isEnabled = !button.disabled;
                
                if (isVisible && isEnabled) {
                  button.click();
                  return true;
                }
              }
              return false;
            }, title);
            
            if (clicked) {
              console.log(`✅ Clicked button in dialog frame by text content "${title}"`);
              await new Promise(resolve => setTimeout(resolve, 100)).catch(() => null);
              return;
            }
          } catch (frameErr) {
            // Continue to next frame
          }
        }

        // Then try main page
        const textButtons = await page.locator(`button:has-text("${title}")`).all();
        console.log(`   Found ${textButtons.length} buttons with text "${title}"`);
        for (const btn of textButtons) {
          if (await btn.isVisible().catch(() => false) && await btn.isEnabled().catch(() => false)) {
            console.log(`✅ Found button by text content "${title}", clicking...`);
            await btn.click({ force: false });
            await new Promise(resolve => setTimeout(resolve, 100)).catch(() => null);
            return;
          }
        }
      } catch (err) {
        console.log(`   Strategy 2 error for "${title}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
 
    /* ---------- Strategy 3: Find input with aria-label ---------- */
 
    for (const title of titles) {
      try {
        const ariaButton = await page.locator(`[aria-label*="${title}"]`).first();
        if (ariaButton && await ariaButton.isVisible().catch(() => false)) {
          console.log(`✅ Found element by aria-label containing "${title}", clicking...`);
          await ariaButton.click();
          return;
        }
      } catch {
        // Continue to next strategy
      }
    }
 
    /* ---------- Strategy 4: Find any visible button/input in modal/dialog ---------- */
 
    try {
      const allButtons = await page.locator('button, input[type="button"], input[type="submit"]').all();
      for (const btn of allButtons) {
        const text = await btn.textContent().catch(() => '');
        const title = await btn.getAttribute('title').catch(() => '');
        const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
        const content = `${text} ${title} ${ariaLabel}`.toLowerCase();
 
        for (const titleWord of titles) {
          if (content.includes(titleWord.toLowerCase()) && await btn.isVisible().catch(() => false)) {
            console.log(`✅ Found button matching "${titleWord}" in content, clicking...`);
            await btn.click();
            return;
          }
        }
      }
    } catch {
      // Continue to next strategy
    }
 
    /* ---------- Strategy 5: Keyboard Fallback ---------- */
 
    console.log(`⚠️ No button found by visual search, trying keyboard approach...`);
 
    if (action === 'ok' || action === 'accept' || action === 'yes') {
      await page.keyboard.press('Enter');
      console.log(`✅ Pressed Enter`);
      return;
    }
 
    if (['cancel', 'dismiss', 'close', 'no'].includes(action)) {
      await page.keyboard.press('Escape');
      console.log(`✅ Pressed Escape`);
      return;
    }
 
    throw new Error(`Button not found for action "${action}" (tried: ${titles.join(', ')})`);
 
  } catch (error) {
    console.error('Dialog handling failed:', error);
    throw error;
  }
}
 

export async function selectComboBox(page: Page, step: testStep): Promise<Outcome> {
  try {
 
    /* -------------------------------------------------------
       Element resolution (UNCHANGED from framework pattern)
       ------------------------------------------------------- */
 
    const baseSelector = getLocatorString(step);
    await waitForRoller(page);

    const element = await resolveElement(page, baseSelector, step);
 
    /* -------------------------------------------------------
       Data handling (UNCHANGED)
       ------------------------------------------------------- */
    let optionText = step.datasetColumnNames || step.value;
    if (optionText && typeof optionText === 'string') {
      optionText = resolveTestVariables(optionText);
    }
    // Fallback: if datasetColumnNames wasn't resolved (still looks like a column name)
    // and step.value has a usable value, prefer step.value
    if (optionText && step.value && optionText === step.datasetColumnNames && step.value.trim() !== '') {
      optionText = resolveTestVariables(step.value);
    }
    if (!optionText || optionText.trim() === '') {
      return {
        code: 1,
        value: 'No values provided in value or datasetColumnNames field'
      };
    }
    // Detect Index_ pattern. Accept both Index_0 (zero-based) and Index_1 (one-based)
    let isIndexSelection = false;
    let indexToSelect = -1;
    if (typeof optionText === 'string') {
      const m = optionText.trim().match(/^Index_(\d+)$/i);
      if (m) {
        isIndexSelection = true;
        const parsed = parseInt(m[1], 10);
        // Treat Index_0 as explicit zero-based; Index_1 and above as 1-based user-friendly input
        indexToSelect = parsed === 0 ? 0 : parsed - 1;
      }
    }
    /* -------------------------------------------------------
       Get element ID → used to determine control type
       ------------------------------------------------------- */
 
    const elementId = await element.getAttribute('id');
 
    if (!elementId) {
      throw new Error('Unable to retrieve element id');
    }
 
    /* -------------------------------------------------------
       Decide control type
       ------------------------------------------------------- */
 
    let isCommonControl = elementId.startsWith('icombobox_Text_');
    const isCustomControl = elementId.startsWith('C2T_');
    // The @dikey XPath can resolve to the combo's container table (icombobox_Control_<sfx>)
    // OR its arrow image (icombobox_Image_<sfx>); both redirect to the text input.
    const isContainerControl = elementId.startsWith('icombobox_Control_') || elementId.startsWith('icombobox_Image_');
 
    /* =======================================================
       CONTAINER CONTROL (@dikey wrapper → redirect to text input)
       ======================================================= */
 
    if (isContainerControl) {
      // The @dikey XPath resolves to the container table (icombobox_Control_<suffix>).
      // Redirect to the actual text input inside: icombobox_Text_<suffix>
      const suffix = elementId.replace('icombobox_Control_', '').replace('icombobox_Image_', '');
      const textInputId = `#icombobox_Text_${suffix}`;
      const textInput = await resolveElement(page, textInputId, step);
      // Click to expand then select via DOM in same document context
      await textInput.click();
      await page.waitForTimeout(500);

      const result = await textInput.evaluate((el, data) => {
        const sfx = (el as HTMLInputElement).id.replace('icombobox_Text_', '');
        const sel = el.ownerDocument.getElementById(`icombobox_List_${sfx}`) as HTMLSelectElement | null;
        if (!sel) return { success: false, error: `Select element icombobox_List_${sfx} not found in DOM` };
        // Avoid Array.from(sel.options) — Lorenzo's ibootstrap.js Proxy intercepts it
        const optCount = sel.options.length;
        let targetIndex = -1;
        if (data.isIndex) {
          targetIndex = data.idx;
        } else {
          for (let i = 0; i < optCount; i++) {
            if (sel.options[i].text.trim() === data.value) { targetIndex = i; break; }
          }
          if (targetIndex < 0) {
            const lc = data.value.toLowerCase();
            for (let i = 0; i < optCount; i++) {
              if (sel.options[i].text.trim().toLowerCase() === lc) { targetIndex = i; break; }
            }
          }
        }
        if (targetIndex < 0 || targetIndex >= optCount) {
          const avail: string[] = [];
          for (let i = 0; i < optCount; i++) { const t = sel.options[i].text.trim(); if (t) avail.push(t); }
          return { success: false, error: `Option "${data.value}" not found. Available: ${avail.join(', ')}` };
        }
        sel.selectedIndex = targetIndex;
        sel.options[targetIndex].selected = true;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.options[targetIndex].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return { success: true, value: sel.options[targetIndex].text.trim() };
      }, { isIndex: isIndexSelection, idx: indexToSelect, value: optionText });

      if (!result.success) {
        throw new Error(result.error);
      }

      return {
        code: 0,
        value: `Successfully selected "${result.value}" in common combo (via container)`
      };
    }

    /* =======================================================
       COMMON CONTROL (select -> option model)
       ======================================================= */
 
    if (isCommonControl) {
 
      /*
         Example:
         Input ID  : icombobox_Text_C4
         Select ID : icombobox_List_C4
      */
 
      const suffix = elementId.replace('icombobox_Text_', '');
      await element.click();
      await page.waitForTimeout(500); // Allow Lorenzo to render the dropdown list

      // Use DOM evaluation directly in the element's document context.
      // This avoids resolveElement visibility issues and frame-mismatch problems
      // since we operate in the exact same document as the text input.
      const result = await element.evaluate((el, data) => {
        const sfx = (el as HTMLInputElement).id.replace('icombobox_Text_', '');
        const sel = el.ownerDocument.getElementById(`icombobox_List_${sfx}`) as HTMLSelectElement | null;
        if (!sel) return { success: false, error: `Select element icombobox_List_${sfx} not found in DOM` };
        // Avoid Array.from(sel.options) — Lorenzo's ibootstrap.js Proxy intercepts it
        const optCount = sel.options.length;
        let targetIndex = -1;
        if (data.isIndex) {
          targetIndex = data.idx;
        } else {
          for (let i = 0; i < optCount; i++) {
            if (sel.options[i].text.trim() === data.value) { targetIndex = i; break; }
          }
          if (targetIndex < 0) {
            const lc = data.value.toLowerCase();
            for (let i = 0; i < optCount; i++) {
              if (sel.options[i].text.trim().toLowerCase() === lc) { targetIndex = i; break; }
            }
          }
        }
        if (targetIndex < 0 || targetIndex >= optCount) {
          const avail: string[] = [];
          for (let i = 0; i < optCount; i++) { const t = sel.options[i].text.trim(); if (t) avail.push(t); }
          return { success: false, error: `Option "${data.value}" not found. Available: ${avail.join(', ')}` };
        }
        sel.selectedIndex = targetIndex;
        sel.options[targetIndex].selected = true;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.options[targetIndex].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return { success: true, value: sel.options[targetIndex].text.trim() };
      }, { isIndex: isIndexSelection, idx: indexToSelect, value: optionText });

      if (!result.success) {
        throw new Error(result.error);
      }
 
      return {
        code: 0,
        value: `Successfully selected "${result.value}" in common combo`
      };
    }
 
    /* =======================================================
       CUSTOM CONTROL (ul -> li -> div -> label model)
       ======================================================= */
 
    if (isCustomControl) {
 
      /*
         Example:
         Input ID : C2T_C14
         List ID  : C2L_C14
      */
 
      /* ---- Expand dropdown first ---- */
 
      await element.click();
 
      /* ---- Find + click the matching option entirely in-browser (one round-trip).
             Avoids resolveElements(), which visits every <li> with per-element
             isVisible()/isConnected() round-trips — very slow for large lists
             (e.g. Country ~271 options). ---- */

      const selectInCustomCombo = () => element.evaluate((el, data) => {
        const doc = (el as HTMLElement).ownerDocument;
        const listSfx = (el as HTMLInputElement).id.replace('C2T_', 'C2L_');
        const list = doc.getElementById(listSfx);
        if (!list) return { state: 'nolist' as const };
        const items = list.querySelectorAll('li');
        if (!items.length) return { state: 'norender' as const };

        const getLabel = (li: Element): string => {
          const lbl = li.querySelector('div label') || li.querySelector('label');
          return (lbl?.textContent || '').trim();
        };

        let target: HTMLElement | null = null;
        if (data.isIndex) {
          if (data.idx < 0 || data.idx >= items.length) {
            return { state: 'range' as const, count: items.length };
          }
          target = items[data.idx] as HTMLElement;
        } else {
          for (let i = 0; i < items.length; i++) {
            if (getLabel(items[i]) === data.value) { target = items[i] as HTMLElement; break; }
          }
          if (!target) {
            const lc = String(data.value).toLowerCase();
            for (let i = 0; i < items.length; i++) {
              if (getLabel(items[i]).toLowerCase() === lc) { target = items[i] as HTMLElement; break; }
            }
          }
        }

        if (!target) {
          const avail: string[] = [];
          for (let i = 0; i < Math.min(items.length, 50); i++) {
            const t = getLabel(items[i]); if (t) avail.push(t);
          }
          return { state: 'notfound' as const, avail };
        }

        target.scrollIntoView({ block: 'nearest' });
        const clickTarget = (target.querySelector('div label') || target.querySelector('label') || target) as HTMLElement;
        clickTarget.click();
        return { state: 'ok' as const, value: getLabel(target) };
      }, { isIndex: isIndexSelection, idx: indexToSelect, value: optionText });

      // Options may render slightly after the expand click; retry briefly (in-browser is fast).
      let result = await selectInCustomCombo();
      for (let attempt = 0; attempt < 8 && (result.state === 'norender' || result.state === 'nolist'); attempt++) {
        await page.waitForTimeout(250);
        result = await selectInCustomCombo();
      }

      if (result.state === 'ok') {
        return {
          code: 0,
          value: isIndexSelection
            ? `Successfully selected index ${indexToSelect} in custom combo`
            : `Successfully selected "${result.value}" in custom combo`
        };
      }
      if (result.state === 'range') {
        throw new Error(`Index_${indexToSelect + 1} out of range for custom combo (options: ${result.count})`);
      }
      if (result.state === 'notfound') {
        throw new Error(`Option "${optionText}" not found in custom combo. Available (first 50): ${result.avail.join(', ')}`);
      }
      throw new Error('Custom combo options not rendered');
    }
 
    /* =======================================================
       IL (INCREMENTAL LIST) CONTROL
       label id: il_C_<suffix>  e.g. il_C_C11
       The label acts as a display for an adjacent <input> or
       <select> that Lorenzo renders nearby in the same container.
       We use DOM traversal (no hardcoded IDs) to find the target.
       ======================================================= */

    const isILControl = elementId.startsWith('il_C_');

    if (isILControl) {

      /* --- Step 1: click the label to activate/focus the combo --- */
      await element.click();
      await page.waitForTimeout(300);

      /* --- Step 2: DOM traversal to find sibling input or select --- */
      type ILResult = { tag: string; value?: string; options?: string[] } | null;

      const domResult: ILResult = await element.evaluate(
        (labelEl: Element, data: { value: string; isIndex: boolean; idx: number }) => {
          /* walk up to find a container that has an input/select sibling */
          const candidates = ['td', 'span', 'div', 'tr'];
          let container: Element | null = labelEl.parentElement;

          for (let i = 0; i < 5 && container; i++) {
            const tag = container.tagName?.toLowerCase() ?? '';
            const inputs = Array.from(container.querySelectorAll('input')) as HTMLInputElement[];
            const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];

            if (selects.length > 0) {
              const sel = selects[0];
              /* directly set via JS for native select */
              const opts = Array.from(sel.options).map(o => o.text.trim());
              if (data.isIndex) {
                if (data.idx >= 0 && data.idx < sel.options.length) {
                  sel.selectedIndex = data.idx;
                  sel.dispatchEvent(new Event('change', { bubbles: true }));
                  return { tag: 'select', value: sel.options[data.idx].text };
                }
              } else {
                for (let oi = 0; oi < sel.options.length; oi++) {
                  if (sel.options[oi].text.trim() === data.value) {
                    sel.selectedIndex = oi;
                    sel.dispatchEvent(new Event('change', { bubbles: true }));
                    return { tag: 'select', value: data.value };
                  }
                }
                return { tag: 'select-miss', options: opts };
              }
            }

            if (inputs.length > 0) {
              const inp = inputs[0];
              inp.focus();
              inp.value = data.value;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new KeyboardEvent('keyup', { key: data.value.slice(-1), bubbles: true }));
              return { tag: 'input' };
            }

            container = container.parentElement;
          }
          return null;
        },
        { value: optionText, isIndex: isIndexSelection, idx: indexToSelect }
      ).catch(() => null);

      if (domResult?.tag === 'select') {
        return { code: 0, value: `Selected "${domResult.value}" in IL combo (select via JS)` };
      }

      if (domResult?.tag === 'select-miss') {
        throw new Error(`Option "${optionText}" not found in IL combo select. Available: ${(domResult.options ?? []).join(', ')}`);
      }

      if (domResult?.tag === 'input') {
        /* input was filled — wait for autocomplete popup then click matching item */
        await page.waitForTimeout(600);

        for (const frame of page.frames()) {
          /* Lorenzo autocomplete popups often use li or div[role=option] */
          const popup = frame.locator(
            `li, div[role="option"], div[class*="combolist"] li, div[class*="dropdown"] li`
          ).filter({ hasText: new RegExp(`^${escapeRegex(optionText)}$`, 'i') });
          const popupCount = await popup.count().catch(() => 0);
          if (popupCount > 0) {
            await popup.first().click();
            return { code: 0, value: `Selected "${optionText}" in IL combo (autocomplete click)` };
          }
        }

        /* no popup found — press Tab to confirm typed value */
        await element.press('Tab');
        return { code: 0, value: `Typed "${optionText}" into IL combo input (Tab-confirmed)` };
      }

      throw new Error(`IL combo "${elementId}" — DOM traversal found no input/select for "${optionText}"`);
    }

    /* -------------------------------------------------------
       Unknown Control
       ------------------------------------------------------- */

    return {
      code: 1,
      value: `Unsupported combo control id: ${elementId}`
    };
 
  }
  catch (error) {
 
    return {
      code: 1,
      value: error instanceof Error ? error.message : String(error)
    };
  }
}



// export async function getTextAndStorePASID(page: Page, step: testStep): Promise<{ text: string, pasid?: string, surname?: string, forename?: string, gender?: string, dob?: string }> {
//   try {
//     const baseSelector = getLocatorString(step);
//     const locator = await resolveElement(page, baseSelector, step);

//     // Ensure element is visible
//     await locator.waitFor({ state: 'visible', timeout: 5000 });

//     // Get the tag name
//     const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
//     let text = '';

//     if (tagName === 'input' || tagName === 'textarea') {
//       // For input elements, try to get value first, then placeholder
//       const value = await locator.inputValue();
//       if (value) {
//         text = value;
//       } else {
//         // Get placeholder if value is empty
//         text = await locator.getAttribute('placeholder') || '';
//       }
//     } else {
//       // For other elements, get text content
//       text = await locator.textContent() || '';
//       text = text.trim();
//     }

//     console.log(`Retrieved text from ${step.page}.${step.element}: "${text}"`);

//     // Extract Surname, Forename, Gender, DOB, PASID using regex
//     // Example: "Successfully registered the patient GILL Brain , Gender: Male, Date of birth: 18/04/1994, PatientID: PASID-039472"
//     let surname: string | undefined = undefined;
//     let forename: string | undefined = undefined;
//     let gender: string | undefined = undefined;
//     let dob: string | undefined = undefined;
//     let pasid: string | undefined = undefined;

//     // Extract patient name (Surname and Forename)
//     const nameMatch = text.match(/Successfully registered the patient\s+([A-Za-z\-']+)\s+([A-Za-z\-']+)\s*,/);
//     if (nameMatch) {
//       surname = nameMatch[1];
//       forename = nameMatch[2];
//     }

//     // Extract Gender
//     const genderMatch = text.match(/Gender:\s*([A-Za-z]+)/);
//     if (genderMatch) {
//       gender = genderMatch[1];
//     }

//     // Extract Date of Birth
//     const dobMatch = text.match(/Date of birth:\s*([\d\/]+)/);
//     if (dobMatch) {
//       dob = dobMatch[1];
//     }

//     // Extract PASID
//     const pasidMatch = text.match(/PatientID:\s*(PASID-\d+)/);
//     if (pasidMatch && pasidMatch[1]) {
//       pasid = pasidMatch[1];
//       // Store PASID in global variable if Values is provided and starts with _PASID
//       if (step.value && step.value.startsWith('_')) {
//         console.log(`Stored PASID in global variable: ${step.value}PASID = "${pasid}"`);
//         executionContext.addSuiteVariable(step.value + 'PASID', pasid);
//       }
//       console.log(`Extracted PASID: ${pasid}`);
//     } else {
//       console.warn('PASID not found in the retrieved text.');
//     }

//     // Store Surname, Forename, Gender, DOB in global variables if Values is provided and starts with _
//     if (step.value && step.value.startsWith('_')) {
//       if (surname) {
//         console.log(`Stored Surname in global variable: ${step.value}SURNAME = "${surname}"`);
//         executionContext.addSuiteVariable(step.value + 'SURNAME', surname);
//       }
//       if (forename) {
//         console.log(`Stored Forename in global variable: ${step.value}FORENAME = "${forename}"`);
//         executionContext.addSuiteVariable(step.value + 'FORENAME', forename);
//       }
//       if (gender) {
//         console.log(`Stored Gender in global variable: ${step.value}GENDER = "${gender}"`);
//         executionContext.addSuiteVariable(step.value + 'GENDER', gender);
//       }
//       if (dob) {
//         console.log(`Stored DOB in global variable: ${step.value}DOB = "${dob}"`);
//         executionContext.addSuiteVariable(step.value + 'DOB', dob);
//       }
//       console.log(`Stored full text in global variable: ${step.value}FULLTEXT = "${text}"`);
//     }

//     return { text, pasid, surname, forename, gender, dob };

//   } catch (error) {
//     console.error(`Failed to get text and PASID from ${step.page}.${step.element}:`, error);
//     throw error;
//   }
// }


// export async function setTextPASID(page: Page, step: testStep): Promise<void> {
//   try {

//     // The step.Values should be the variable name (e.g., "_PASID") where PASID was stored
//     if (!step.value) {
//       throw new Error(`No PASID variable name provided for setTextPASID at ${step.page}.${step.element}`);
//     }

//     const pasid = step.value.trim();

//     const stepWithText = { ...step, ElementText: pasid };

//     const baseSelector = getLocator(step);
//     const locator = await resolveElement(page, baseSelector, step);

//     // Ensure element is ready for input
//     await locator.waitFor({ state: 'visible', timeout: 5000 });
//     await locator.scrollIntoViewIfNeeded();

//     // Clear existing text and fill with PASID
//     await locator.clear();
//     await locator.fill(String(pasid));
//     console.log(`Successfully set PASID in ${step.Page}.${step.Element}: "${pasid}"`);
//   } catch (error) {
//     console.error(`Failed to set PASID in ${step.Page}.${step.Element}:`, error);
//     throw error;
//   }
// }

export async function getTextAndStorePASID(page: Page, step: testStep): Promise<{ text: string, pasid?: string, surname?: string, forename?: string, gender?: string, dob?: string }> {
  try {
    const baseSelector = getLocatorString(step);
    const locator = await resolveElement(page, baseSelector, step);
 
    // Ensure element is visible
    await locator.waitFor({ state: 'visible', timeout: 5000 });
 
    // Get the tag name
    const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
    let text = '';
 
    if (tagName === 'input' || tagName === 'textarea') {
      // For input elements, try to get value first, then placeholder
      const value = await locator.inputValue();
      if (value) {
        text = value;
      } else {
        // Get placeholder if value is empty
        text = await locator.getAttribute('placeholder') || '';
      }
    } else {
      // For other elements, prefer semantic attributes used in the app (ictext, texttooltip, title)
      // or rich nested markup such as <nobr> before falling back to textContent.
      text = await locator.evaluate((el: HTMLElement) => {
        function pickFirstNonEmpty(...vals: (string | null | undefined)[]) {
          for (const v of vals) {
            if (v != null) {
              const s = String(v).trim();
              if (s) return s;
            }
          }
          return '';
        }
 
        // 1) Prefer explicit attributes commonly used in this app
        const attrCandidates = ['ictext', 'texttooltip', 'ictag', 'title', 'alt'];
        for (const a of attrCandidates) {
          const v = el.getAttribute && el.getAttribute(a);
          if (v && String(v).trim()) return String(v).trim();
        }
 
        // 2) Look for nested elements that often contain the visible text
        const descIctext = el.querySelector('[ictext]');
        if (descIctext) {
          const v = (descIctext.getAttribute && descIctext.getAttribute('ictext')) || descIctext.textContent;
          if (v && String(v).trim()) return String(v).trim();
        }
 
        // 3) Prefer first <nobr> text (used in Demographic markup)
        const nobr = el.querySelector('nobr');
        if (nobr && nobr.textContent && String(nobr.textContent).trim()) return String(nobr.textContent).trim();
 
        // 4) Try innerText (renders visible text)
        if ((el as any).innerText && String((el as any).innerText).trim()) return String((el as any).innerText).trim();
 
        // 5) Fallback to textContent
        return (el.textContent || '').toString().trim();
      });
    }
 
    console.log(`Retrieved text from ${step.page}.${step.element}: "${text}"`);
 
    // Extract Surname, Forename, Gender, DOB, PASID using regex
    // Example: "Successfully registered the patient GILL Brain , Gender: Male, Date of birth: 18/04/1994, PatientID: PASID-039472"
    let surname: string | undefined = undefined;
    let forename: string | undefined = undefined;
    let gender: string | undefined = undefined;
    let dob: string | undefined = undefined;
    let pasid: string | undefined = undefined;
 
    // Extract patient name (Surname and Forename)
    const nameMatch = text.match(/Successfully registered the patient\s+([A-Za-z\-']+)\s+([A-Za-z\-']+)\s*,/);
    if (nameMatch) {
      surname = nameMatch[1];
      forename = nameMatch[2];
    }
 
    // Extract Gender
    const genderMatch = text.match(/Gender:\s*([A-Za-z]+)/);
    if (genderMatch) {
      gender = genderMatch[1];
    }
 
    // Extract Date of Birth
    const dobMatch = text.match(/Date of birth:\s*([\d\/]+)/);
    if (dobMatch) {
      dob = dobMatch[1];
    }
 
    // Extract PASID
    const pasidMatch = text.match(/PatientID:\s*(PASID-\d+)/i);
    if (pasidMatch && pasidMatch[1]) {
      pasid = pasidMatch[1];
      // Store PASID in global variable if Values is provided and starts with _PASID
      if (step.value && step.value.startsWith('_')) {
        console.log(`Stored PASID in global variable: ${step.value}PASID = "${pasid}"`);
        executionContext.addSuiteVariable(step.value + 'PASID', pasid);
      }
      console.log(`Extracted PASID: ${pasid}`);
    } else {
      // Fallback: try to find patterns like 'Pasid-048541' anywhere in the text (case-insensitive)
      const fallback = text.match(/\bpasid-?(\d{3,})\b/i);
      if (fallback && fallback[1]) {
        pasid = `PASID-${fallback[1]}`;
        if (step.value && step.value.startsWith('_')) {
          console.log(`Stored PASID in global variable (fallback): ${step.value}PASID = "${pasid}"`);
          executionContext.addSuiteVariable(step.value + 'PASID', pasid);
        }
        console.log(`Extracted PASID (fallback): ${pasid}`);
      } else {
        console.warn('PASID not found in the retrieved text.');
      }
    }
 
    // Store Surname, Forename, Gender, DOB in global variables if Values is provided and starts with _
    if (step.value && step.value.startsWith('_')) {
      if (surname) {
        console.log(`Stored Surname in global variable: ${step.value}SURNAME = "${surname}"`);
        executionContext.addSuiteVariable(step.value + 'SURNAME', surname);
      }
      if (forename) {
        console.log(`Stored Forename in global variable: ${step.value}FORENAME = "${forename}"`);
        executionContext.addSuiteVariable(step.value + 'FORENAME', forename);
      }
      if (gender) {
        console.log(`Stored Gender in global variable: ${step.value}GENDER = "${gender}"`);
        executionContext.addSuiteVariable(step.value + 'GENDER', gender);
      }
      if (dob) {
        console.log(`Stored DOB in global variable: ${step.value}DOB = "${dob}"`);
        executionContext.addSuiteVariable(step.value + 'DOB', dob);
      }
      console.log(`Stored full text in global variable: ${step.value}FULLTEXT = "${text}"`);
    }
 
    return { text, pasid, surname, forename, gender, dob };
 
  } catch (error) {
    console.error(`Failed to get text and PASID from ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export function isMedicationChartValueMatch(expectedValue: string, actualValue: string): boolean {
  const normalize = (value: string) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const expected = normalize(expectedValue);
  const actual = normalize(actualValue);

  return expected === actual || expected.includes(actual) || actual.includes(expected);
}

export function parseMedicationChartInputs(step: testStep): {
  currentDate: string;
  medicationName: string;
  rowFilter: string;
  condition: string;
} {
  const normalizeHeaderName = (value: string) => String(value || '').trim().toLowerCase();

  const resolvedTableColumns = String(step.tableColumnNames || '')
    .split('|')
    .map(value => String(resolveTestVariables(value)).trim())
    .filter(Boolean);

  const resolvedValues = String(step.value || '')
    .split('|')
    .map(value => String(resolveTestVariables(value)).trim())
    .filter(Boolean);

  const columnValueMap = new Map<string, string>();
  for (let index = 0; index < Math.max(resolvedTableColumns.length, resolvedValues.length); index++) {
    const columnName = resolvedTableColumns[index] || '';
    const columnValue = resolvedValues[index] || '';
    if (columnName) {
      columnValueMap.set(normalizeHeaderName(columnName), columnValue);
    }
  }

  const fallbackMedicationName = String(step.elementText || step.property || step.value || '').trim();
  const fallbackCurrentDate = resolvedValues[0] || '';

  const currentDate = columnValueMap.get('currentdate')
    || columnValueMap.get('date')
    || columnValueMap.get('current date')
    || fallbackCurrentDate;

  const medicationName = columnValueMap.get('medicationname')
    || columnValueMap.get('medication')
    || columnValueMap.get('drug')
    || columnValueMap.get('item')
    || fallbackMedicationName;

  return {
    currentDate,
    medicationName,
    rowFilter: String(step.elementText || step.property || '').trim(),
    condition: (step.condition || 'In').toLowerCase()
  };
}

export async function verifyMedicationChart(page: Page, step: testStep): Promise<void> {
  try {
    if (!step.tableColumnNames) {
      throw new Error("No header column provided for medication chart verification");
    }

    if (!step.value) {
      throw new Error("No expected value provided for medication chart verification");
    }

    const headerNames = String(step.tableColumnNames)
      .split('|')
      .map(value => String(resolveTestVariables(value)).trim())
      .filter(Boolean);

    const expectedValues = String(step.value)
      .split('|')
      .map(value => String(resolveTestVariables(value)).trim())
      .filter(Boolean);

    if (headerNames.length !== expectedValues.length) {
      throw new Error(`Column count (${headerNames.length}) does not match value count (${expectedValues.length})`);
    }

    const criteria = headerNames.map((headerName, index) => ({
      headerName,
      expectedValue: expectedValues[index]
    }));

    const rowFilter = String(step.elementText || step.property || '').trim();
    const condition = (step.condition || 'In').toLowerCase();

    const frameLocator = page.locator('iframe#frameActivity, iframe[title*="Medication administration chart"], iframe[src*="MedicationMgmt/LBMCommon/LBMePMACommonWizard.aspx"]').first();
    let searchRoot: Page | Frame = page;

    const frameCount = await frameLocator.count().catch(() => 0);
    if (frameCount > 0) {
      await frameLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      const frameContent = await frameLocator.elementHandle().then(handle => handle?.contentFrame()).catch(() => null);
      if (frameContent) {
        searchRoot = frameContent;
        console.log(`Using medication chart iframe for ${step.page}.${step.element}`);
      }
    }

    const candidateContainers = searchRoot.locator('table, [role="grid"], .k-grid, .k-widget');
    const containerCount = await candidateContainers.count().catch(() => 0);

    const normalizeText = (value: string) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const textMatches = (cellText: string, expectedValue: string) => {
      const normalizedCellText = normalizeText(cellText);
      const normalizedExpectedText = normalizeText(expectedValue);
      // Use "contains" logic: cell contains expected value OR expected value is in cell
      return normalizedCellText.includes(normalizedExpectedText)
        || normalizedExpectedText.includes(normalizedCellText);
    };

    let matchedRowText = '';
    let matched = false;
    let clickedCellText = '';

    console.log(`[verifyMedicationChart] Searching for criteria:`);
    criteria.forEach(c => console.log(`  - ${c.headerName} = "${c.expectedValue}"`));

    const headerCandidates = searchRoot.locator('th, td, [role="columnheader"], [role="gridcell"], [aria-colindex], [ng-reflect-col-index]');
    const headerCandidateCount = await headerCandidates.count().catch(() => 0);
    console.log(`[verifyMedicationChart] Found ${headerCandidateCount} header candidates`);

    for (let headerIndex = 0; headerIndex < headerCandidateCount; headerIndex++) {
      const headerLocator = headerCandidates.nth(headerIndex);
      const headerText = (await headerLocator.textContent().catch(() => '') || '').replace(/\s+/g, ' ').trim();
      const headerTitle = (await headerLocator.getAttribute('title').catch(() => '') || '').trim();
      const combinedHeaderText = [headerText, headerTitle].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

      const matchedHeaderName = criteria.find(criteriaItem => {
        const normalizedHeaderName = normalizeText(criteriaItem.headerName);
        const normalizedCombinedHeaderText = normalizeText(combinedHeaderText);
        return normalizedCombinedHeaderText.includes(normalizedHeaderName)
          || normalizedHeaderName.includes(normalizedCombinedHeaderText);
      });

      if (!matchedHeaderName) {
        continue;
      }

      console.log(`[verifyMedicationChart] Checking container ${headerIndex} (matched header: "${matchedHeaderName.headerName}")`);

      const container = headerLocator.locator('xpath=ancestor::table[1] | xpath=ancestor::*[self::table or self::div or self::section][contains(@class,"k-grid") or @role="grid" or contains(@class,"k-widget")][1]').first();
      const containerText = (await container.textContent().catch(() => '') || '').replace(/\s+/g, ' ').trim();
      if (!containerText) {
        continue;
      }

      const rows = await container.locator('tr').evaluateAll(rows => {
        return Array.from(rows).map(row => {
          const cells = Array.from(row.querySelectorAll('th, td'));
          return cells.map(cell => {
            // Try multiple extraction methods for robust text capture
            const methods = [
              // Method 1: Direct textContent
              () => (cell as HTMLElement).textContent || '',
              // Method 2: innerText (renders visible text)
              () => (cell as any).innerText || '',
              // Method 3: Check for span with text
              () => {
                const span = (cell as HTMLElement).querySelector('span');
                return span ? span.textContent || '' : '';
              },
              // Method 4: Check for nobr element
              () => {
                const nobr = (cell as HTMLElement).querySelector('nobr');
                return nobr ? nobr.textContent || '' : '';
              },
              // Method 5: Get all text nodes
              () => {
                let text = '';
                const walker = document.createTreeWalker(
                  cell,
                  NodeFilter.SHOW_TEXT,
                  null
                );
                let node;
                while ((node = walker.nextNode())) {
                  text += node.textContent;
                }
                return text;
              }
            ];

            // Try each method until we get text
            for (const method of methods) {
              try {
                const text = method();
                if (text && text.trim()) {
                  return text.replace(/\s+/g, ' ').trim();
                }
              } catch (e) {
                // Continue to next method
              }
            }
            return '';
          });
        });
      }).catch(() => []);

      if (rows.length === 0) {
        continue;
      }

      console.log(`[verifyMedicationChart] Extracted ${rows.length} rows with headers: ${rows[0].slice(0, 6).join(' | ')}`);
      if (rows[0].length > 6) {
        console.log(`  ...and ${rows[0].length - 6} more columns`);
      }

      const headerTextFromDom = await container.locator('th, td').evaluateAll(elements => {
        return elements.map(el => {
          const title = (el as HTMLElement).getAttribute('title') || '';
          const spanText = (el as HTMLElement).querySelector('span')?.textContent || '';
          const innerText = (el as any).innerText || '';
          const directText = (el as HTMLElement).textContent || '';

          // Combine all possible sources and pick the longest/most complete one
          const candidates = [title, spanText, innerText, directText].filter(Boolean);
          const combined = candidates.join(' ').replace(/\s+/g, ' ').trim();
          return combined;
        });
      }).catch(() => []);

      console.log(`[verifyMedicationChart] Found ${headerTextFromDom.length} header cells with titles/spans`);
      if (headerTextFromDom.length > 0) {
        console.log(`  Sample header data: ${headerTextFromDom.slice(0, 4).join(' | ')}`);
      }

      const findHeaderIndex = (headerName: string) => {
        const normalizedHeaderName = normalizeText(headerName);
        const headerCandidates = new Set<string>([normalizedHeaderName]);
        if (headerName.includes('_')) {
          headerCandidates.add(normalizeText(headerName.replace(/_/g, '')));
        }

        const headerRow = rows.find(row => row.some(cell => normalizeText(cell).includes(normalizedHeaderName))) || rows[0];
        const headers = headerRow.map(cell => (cell || '').trim());

        const exactIndex = headers.findIndex(header => {
          const normalizedHeader = normalizeText(header);
          return normalizedHeader === normalizedHeaderName
            || headerCandidates.has(normalizedHeader)
            || normalizedHeader.includes(normalizedHeaderName)
            || normalizedHeaderName.includes(normalizedHeader);
        });

        if (exactIndex !== -1) {
          console.log(`  [findHeaderIndex] Found "${headerName}" at index ${exactIndex} (exact match)`);
          return exactIndex;
        }

        const partialIndex = headers.findIndex(header => {
          const normalizedHeader = normalizeText(header);
          return normalizedHeader.includes(normalizedHeaderName)
            || normalizedHeaderName.includes(normalizedHeader)
            || Array.from(headerCandidates).some(candidate => normalizedHeader.includes(candidate));
        });

        if (partialIndex !== -1) {
          console.log(`  [findHeaderIndex] Found "${headerName}" at index ${partialIndex} (partial match with "${headers[partialIndex]}")`);
          return partialIndex;
        }

        const domIndex = headerTextFromDom.findIndex(text => {
          const combined = normalizeText(text);
          return combined.includes(normalizedHeaderName) || Array.from(headerCandidates).some(candidate => combined.includes(candidate));
        });

        if (domIndex !== -1) {
          console.log(`  [findHeaderIndex] Found "${headerName}" at index ${domIndex} (DOM match)`);
          return domIndex;
        }

        console.log(`  [findHeaderIndex] NOT FOUND: "${headerName}". Available headers: ${headers.slice(0, 5).join(', ')}`);
        return -1;
      };

      const headerIndexes = criteria.map(criteriaItem => findHeaderIndex(criteriaItem.headerName));
      if (headerIndexes.some(index => index === -1)) {
        console.log(`[verifyMedicationChart] Failed to find all header columns, skipping this container`);
        continue;
      }

      const candidateRows = rows.slice(1, Math.min(rows.length, 12));
      console.log(`[verifyMedicationChart] Found ${candidateRows.length} data rows to check`);

      for (let rowIndex = 0; rowIndex < candidateRows.length; rowIndex++) {
        const row = candidateRows[rowIndex];
        const rowText = row.join(' | ').trim();

        if (rowIndex === 0) {
          console.log(`[verifyMedicationChart] First row sample: ${rowText.substring(0, 150)}...`);
        }

        if (rowFilter && !normalizeText(rowText).includes(normalizeText(rowFilter))) {
          continue;
        }

        const rowMatchDetails = headerIndexes.map((columnIndex, criteriaIndex) => {
          const cellText = (row[columnIndex] || '').trim();
          const expectedValue = criteria[criteriaIndex].expectedValue;
          const matches = textMatches(cellText, expectedValue);
          return {
            headerName: criteria[criteriaIndex].headerName,
            columnIndex,
            cellText,
            expectedValue,
            matches
          };
        });

        const allMatches = rowMatchDetails.every(detail => detail.matches);

        if (!allMatches) {
          // Log first few mismatches for debugging
          if (rowIndex === 0) {
            rowMatchDetails.forEach(detail => {
              if (!detail.matches) {
                console.log(`  [Row ${rowIndex}] Mismatch in "${detail.headerName}": got "${detail.cellText}" expected "${detail.expectedValue}"`);
              }
            });
          }
          continue;
        }

        matched = true;
        matchedRowText = rowText;
        console.log(`[verifyMedicationChart] ✓ Found matching row at index ${rowIndex}`);
        console.log(`  Row content: ${rowText}`);

        const actualRowIndex = rowIndex + 1;
        const rowLocator = container.locator('tr').nth(actualRowIndex);

        // Look for "Due now" column header
        let dueNowColumnIndex = -1;
        const headerRow = rows[0];
        for (let i = 0; i < headerRow.length; i++) {
          const cellText = normalizeText(headerRow[i]);
          if (cellText.includes('due') && cellText.includes('now')) {
            dueNowColumnIndex = i;
            console.log(`[verifyMedicationChart] Found "Due now" column at index ${i}`);
            break;
          }
        }

        // If "Due now" column not found in first row, search through all visible headers
        if (dueNowColumnIndex === -1) {
          const allHeaderCells = await container.locator('tr').first().locator('th, td').evaluateAll(cells => {
            return cells.map((cell, idx) => ({
              index: idx,
              text: (cell.textContent || '').replace(/\s+/g, ' ').trim()
            }));
          }).catch(() => []);

          const dueNowHeader = allHeaderCells.find(header => {
            const normalized = normalizeText(header.text);
            return normalized.includes('due') && normalized.includes('now');
          });

          if (dueNowHeader) {
            dueNowColumnIndex = dueNowHeader.index;
            console.log(`[verifyMedicationChart] Found "Due now" column at index ${dueNowColumnIndex}`);
          }
        }

        // Click the appropriate cell - either "Due now" if found, or the last criterion column
        const targetColumnIndex = dueNowColumnIndex !== -1 ? dueNowColumnIndex : headerIndexes[headerIndexes.length - 1];
        const targetCell = rowLocator.locator('th, td').nth(targetColumnIndex);
        clickedCellText = (row[targetColumnIndex] || '').trim();

        const targetCellText = (await targetCell.textContent().catch(() => '') || '').replace(/\s+/g, ' ').trim();
        const targetCellBox = await targetCell.boundingBox().catch(() => null);
        const targetCellLocation = targetCellBox
          ? `x=${targetCellBox.x.toFixed(1)}, y=${targetCellBox.y.toFixed(1)}, width=${targetCellBox.width.toFixed(1)}, height=${targetCellBox.height.toFixed(1)}`
          : 'bounding-box-unavailable';

        const columnType = dueNowColumnIndex !== -1 ? '"Due now"' : 'criterion';
        console.log(`[verifyMedicationChart] Clicking ${columnType} cell at row=${actualRowIndex}, column=${targetColumnIndex}, text="${targetCellText}", location=${targetCellLocation}`);

        await targetCell.scrollIntoViewIfNeeded().catch(() => undefined);
        await targetCell.click({ timeout: 5000 }).catch(async () => {
          await targetCell.evaluate((element: HTMLElement) => element.click()).catch(() => undefined);
          const fallbackChild = targetCell.locator('button, a, input, span, div').first();
          if (await fallbackChild.count()) {
            await fallbackChild.click({ timeout: 5000 }).catch(() => undefined);
          }
        });

        break;
      }

      if (matched) {
        break;
      }
    }

    if (condition === 'notin') {
      if (matched) {
        throw new Error(`Found medication chart entry for header "${criteria.map(item => item.headerName).join('|')}" and value "${criteria.map(item => item.expectedValue).join('|')}" when expecting none`);
      }
      console.log(`✓ Verified medication chart does not contain the requested criteria`);
      return;
    }

    if (!matched) {
      const errorMsg = `No medication chart entry found for criteria: ${criteria.map(item => `${item.headerName}="${item.expectedValue}"`).join(', ')}${rowFilter ? ` in row containing "${rowFilter}"` : ''}`;
      console.log(`[verifyMedicationChart] ✗ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    console.log(`✓ Verified medication chart entry for criteria: ${criteria.map(item => `${item.headerName}="${item.expectedValue}"`).join(', ')}${rowFilter ? ` in row containing "${rowFilter}"` : ''}`);
    console.log(`  Row details: ${matchedRowText}`);
    console.log(`  Clicked cell: ${clickedCellText}`);
  } catch (error) {
    console.error(`Failed to verify medication chart ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export async function selectMedicationChart(page: Page, step: testStep): Promise<void> {
  try {
    const rawValue = step.isDDT === true && step.datasetColumnNames
      ? String(resolveTestVariables(step.datasetColumnNames)).trim()
      : String(resolveTestVariables(step.value || '')).trim();

    const rowFilter = String(step.elementText || step.property || '').trim();

    if (!rawValue) {
      throw new Error(`No value provided for selectMedicationChart at ${step.page}.${step.element}`);
    }

    const parts = rawValue.split('|').map(part => part.trim()).filter(Boolean);
    if (parts.length < 2) {
      throw new Error(`selectMedicationChart requires values in the format "Date|Time". Example: "13-Jul-2026|07:00"`);
    }

    const currentDate = parts[0];
    const timeText = parts[1];
    const normalizeText = (value: string) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const normalizedDate = normalizeText(currentDate);

    const frameLocator = page.locator('iframe#frameActivity, iframe[title*="Medication administration chart"], iframe[src*="MedicationMgmt/LBMCommon/LBMePMACommonWizard.aspx"]').first();
    let searchRoot: Page | Frame = page;
    const medicationChartSelector = 'xpath=//kendo-grid[@id="medication"] | //kendo-gridlayout-item[descendant::kendo-grid[@id="medication"]] | //span[contains(@class,"colAlignMedicationChart")]/ancestor::table[1]';

    if (await frameLocator.count().catch(() => 0) > 0) {
      await frameLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      const frameContent = await frameLocator.elementHandle().then(handle => handle?.contentFrame()).catch(() => null);
      if (frameContent) {
        searchRoot = frameContent;
      }
    }

    if ((await searchRoot.locator(medicationChartSelector).count().catch(() => 0)) === 0) {
      for (const frame of page.frames()) {
        const frameCount = await frame.locator(medicationChartSelector).count().catch(() => 0);
        if (frameCount > 0) {
          searchRoot = frame;
          break;
        }
      }
    }

    const container = searchRoot.locator(medicationChartSelector).first();
    await container.waitFor({ state: 'visible', timeout: 10000 });

    const headerCells = container.locator('xpath=.//thead//th');
    const headerCount = await headerCells.count().catch(() => 0);
    if (headerCount === 0) {
      throw new Error('No medication chart header cells were found. Verify the medication chart locator and the DOM structure.');
    }

    const headerTexts = await headerCells.evaluateAll(ths =>
      ths.map(th => {
        const span = th.querySelector('span');
        const text = span?.textContent || th.textContent || '';
        return String(text || '').replace(/\s+/g, ' ').trim();
      })
    );

    const dateHeaderIndex = headerTexts.findIndex(text => {
      const normalizedHeader = normalizeText(text);
      return normalizedHeader === normalizedDate
        || normalizedHeader.includes(normalizedDate)
        || normalizedDate.includes(normalizedHeader);
    });

    if (dateHeaderIndex === -1) {
      throw new Error(`Could not find medication date column matching "${currentDate}". Available headers: ${headerTexts.join(' | ')}`);
    }

    const bodyRows = container.locator('xpath=.//tbody//tr[.//td or .//th]');
    const rowCount = await bodyRows.count().catch(() => 0);
    if (rowCount === 0) {
      throw new Error('No medication chart body rows were found. The grid may not have loaded yet.');
    }

    let selectedRow: Locator | null = null;
    if (rowFilter) {
      for (let index = 0; index < rowCount; index++) {
        const row = bodyRows.nth(index);
        const rowText = String(await row.textContent().catch(() => '')).replace(/\s+/g, ' ').trim();
        if (isMedicationChartValueMatch(rowFilter, rowText) || normalizeText(rowText).includes(normalizeText(rowFilter))) {
          selectedRow = row;
          break;
        }
      }

      if (!selectedRow) {
        throw new Error(`Could not find a medication chart row matching "${rowFilter}"`);
      }
    } else {
      selectedRow = bodyRows.first();
    }

    const targetCellByColumn = selectedRow.locator(`xpath=.//*[(@data-kendo-grid-column-index='${dateHeaderIndex}' or @aria-colindex='${dateHeaderIndex + 1}') and (self::td or self::th)]`).first();
    const targetCellByPosition = selectedRow.locator(`xpath=./*[self::td or self::th][position()=${dateHeaderIndex + 1}]`).first();
    const targetCell = (await targetCellByColumn.count().catch(() => 0)) > 0 ? targetCellByColumn : targetCellByPosition;

    if ((await targetCell.count().catch(() => 0)) === 0) {
      throw new Error(`Could not resolve the target date cell in row for date column index ${dateHeaderIndex}`);
    }

    await targetCell.scrollIntoViewIfNeeded().catch(() => undefined);

    // Validate that the row is present and, for a Due now action, that the Due now marker exists.
    const adminIconXpath = `xpath=.//img[contains(@src, 'idrugadministerednor16.png')]`;
    const dueNowXpath = `xpath=.//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'due now')]`;
    const normalizedTimeText = normalizeText(timeText);

    let adminIconFound = false;
    let dueNowFound = false;
    try {
      if ((await selectedRow.locator(adminIconXpath).count().catch(() => 0)) > 0) adminIconFound = true;
      else if ((await targetCell.locator(adminIconXpath).count().catch(() => 0)) > 0) adminIconFound = true;
      else if ((await container.locator(adminIconXpath).count().catch(() => 0)) > 0) adminIconFound = true;

      if ((await selectedRow.locator(dueNowXpath).count().catch(() => 0)) > 0) dueNowFound = true;
      else if ((await targetCell.locator(dueNowXpath).count().catch(() => 0)) > 0) dueNowFound = true;
      else if ((await container.locator(dueNowXpath).count().catch(() => 0)) > 0) dueNowFound = true;
    } catch {
      adminIconFound = false;
      dueNowFound = false;
    }

    if (!adminIconFound && !dueNowFound) {
      throw new Error(`Administered icon or Due now marker not found in medication chart for ${currentDate}|${timeText}${rowFilter ? ` (rowFilter=${rowFilter})` : ''}`);
    }

    const timeLocatorCandidates = [
      targetCell.getByText(timeText, { exact: true }).first(),
      targetCell.getByText(timeText).first(),
      targetCell.locator(`xpath=.//*[contains(normalize-space(.), "${timeText}")]`).first(),
      selectedRow.getByText(timeText, { exact: true }).first(),
      selectedRow.getByText(timeText).first(),
      container.getByText(timeText, { exact: true }).first(),
      selectedRow.locator(dueNowXpath).first(),
      targetCell.locator(dueNowXpath).first(),
      container.locator(dueNowXpath).first()
    ];

    let clickTarget: Locator | null = null;
    for (const candidate of timeLocatorCandidates) {
      if ((await candidate.count().catch(() => 0)) > 0) {
        clickTarget = candidate;
        break;
      }
    }

    const dueNowContainer = targetCell.locator(`xpath=.//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'due now')]`).first();
    if ((!clickTarget || (await clickTarget.count().catch(() => 0)) === 0) && (await dueNowContainer.count().catch(() => 0)) > 0) {
      const nestedTime = dueNowContainer.getByText(timeText, { exact: true }).first();
      if ((await nestedTime.count().catch(() => 0)) > 0) {
        clickTarget = nestedTime;
      }
    }

    if (clickTarget && (await clickTarget.count().catch(() => 0)) > 0) {
      await clickTarget.scrollIntoViewIfNeeded().catch(() => undefined);
      await clickTarget.click({ timeout: 8000 }).catch(async () => {
        await clickTarget!.evaluate((el: HTMLElement) => (el as HTMLElement).click()).catch(() => undefined);
      });
    } else if ((await dueNowContainer.count().catch(() => 0)) > 0) {
      await dueNowContainer.scrollIntoViewIfNeeded().catch(() => undefined);
      await dueNowContainer.click({ timeout: 8000 }).catch(async () => {
        await dueNowContainer.evaluate((el: HTMLElement) => (el as HTMLElement).click()).catch(() => undefined);
      });
    } else {
      await targetCell.scrollIntoViewIfNeeded().catch(() => undefined);
      await targetCell.click({ timeout: 8000 }).catch(async () => {
        const fallback = targetCell.locator('xpath=.//button | .//a | .//span | .//div').first();
        if ((await fallback.count().catch(() => 0)) > 0) {
          await fallback.scrollIntoViewIfNeeded().catch(() => undefined);
          await fallback.click({ timeout: 8000 }).catch(() => undefined);
        }
      });
    }

    await waitForRoller(page).catch(() => undefined);

    const wizardOpened = await waitForMedicationWizard(page, 10000).catch(() => false);
    if (!wizardOpened) {
      throw new Error(`Medication chart click did not open Record Administration wizard for ${currentDate}|${timeText}`);
    }

    console.log(`✅ selectMedicationChart clicked time "${timeText}" for date "${currentDate}"${rowFilter ? ` in row matching "${rowFilter}"` : ''}`);
    return;

    async function waitForMedicationWizard(page: Page, timeout: number): Promise<boolean> {
      const start = Date.now();
      const wizardText = page.locator('text=Record Administration').first();
      while (Date.now() - start < timeout) {
        if (await wizardText.count().catch(() => 0) > 0) {
          try {
            await wizardText.waitFor({ state: 'visible', timeout: 500 }).then(() => true);
            return true;
          } catch {
            // continue waiting
          }
        }

        for (const frame of page.frames()) {
          const frameUrl = frame.url();
          if (/AppDialog\.aspx|AppWizardPage\.aspx|AppWizardPage|MedicationMgmt\/LBMCommon\/LBMePMACommonWizard\.aspx/.test(frameUrl)) {
            if (await frame.locator('text=Record Administration').count().catch(() => 0) > 0) {
              return true;
            }
            return true;
          }
        }

        await page.waitForTimeout(250);
      }
      return false;
    }
  } catch (error) {
    console.error(`Failed to select medication chart entry ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export async function selectPrescriptionChart(page: Page, step: testStep): Promise<void> {
  try {
    // Resolve drug name from datasetColumnNames when used as DDT, otherwise from step.value
    const rawValue = step.isDDT === true && step.datasetColumnNames
      ? String(resolveTestVariables(step.datasetColumnNames)).trim()
      : String(resolveTestVariables(step.value || '')).trim();

    if (!rawValue) {
      throw new Error(`No value provided for selectPrescriptionChart at ${step.page}.${step.element}`);
    }

    const parts = rawValue.split('|').map(p => p.trim()).filter(Boolean);
    const prescriptionName = resolveTestVariables(parts[0] || '');
    let dateHeader = parts[1] ? resolveTestVariables(parts[1]) : undefined;

    // Default: derive date from getCurrentDateTime substitute (_currentDate -> dd-MMM-yyyy)
    if (!dateHeader) {
      const resolvedCurrent = resolveTestVariables('_currentDate');
      if (resolvedCurrent && typeof resolvedCurrent === 'string' && resolvedCurrent.includes('-')) {
        const p = resolvedCurrent.split('-');
        if (p.length >= 2) dateHeader = `${p[0]} ${p[1]}`;
        else dateHeader = resolvedCurrent.replace(/-/g, ' ');
      } else {
        const now = new Date();
        const day = String(now.getDate());
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mon = monthNames[now.getMonth()];
        dateHeader = `${day} ${mon}`;
      }
    }

    const normalizeText = (value: string) => String(value || '').replace(/[-\s]+/g, ' ').trim().toLowerCase();
    const normalizedDate = normalizeText(dateHeader || '');

    const frameLocator = page.locator('iframe#frameActivity, iframe[title*="Prescription"], iframe[src*="Prescription"]').first();
    let searchRoot: Page | Frame = page;
    const prescriptionChartSelector = 'xpath=//kendo-grid[contains(@id,"prescription")] | //kendo-gridlayout-item[descendant::kendo-grid[contains(@id,"prescription")]] | //span[contains(@class,"colAlignPrescriptionChart")]/ancestor::table[last()]';

    if (await frameLocator.count().catch(() => 0) > 0) {
      await frameLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
      const frameContent = await frameLocator.elementHandle().then(handle => handle?.contentFrame()).catch(() => null);
      if (frameContent) searchRoot = frameContent;
    }

    if ((await searchRoot.locator(prescriptionChartSelector).count().catch(() => 0)) === 0) {
      for (const frame of page.frames()) {
        const frameCount = await frame.locator(prescriptionChartSelector).count().catch(() => 0);
        if (frameCount > 0) { searchRoot = frame; break; }
      }
    }

    const container = searchRoot.locator(prescriptionChartSelector).first();
    await container.waitFor({ state: 'visible', timeout: 10000 });

    const headerCells = container.locator(
      'xpath=.//thead//th | .//thead//td | .//tr[1]//th | .//tr[1]//td | .//div[contains(@class,"k-grid-header")]//th | .//div[contains(@class,"k-grid-header")]//td'
    );
    const headers = await headerCells.evaluateAll(ths => ths.map(th => {
      const span = th.querySelector('span');
      const text = span?.textContent || th.getAttribute('title') || th.textContent || '';
      const ariaColIndex = th.getAttribute('aria-colindex') || th.getAttribute('data-kendo-grid-column-index') || '';
      return {
        text: String(text || '').replace(/\s+/g, ' ').trim(),
        ariaColIndex: ariaColIndex.trim(),
      };
    }));

    let matchedHeader = headers.find(header => {
      const normalizedHeader = normalizeText(header.text);
      return normalizedHeader === normalizedDate
        || normalizedHeader.includes(normalizedDate)
        || normalizedDate.includes(normalizedHeader);
    });

    if (!matchedHeader) {
      matchedHeader = headers.find(header => {
        const normalizedHeader = normalizeText(header.text);
        return normalizedHeader.includes(normalizedDate) || normalizedDate.includes(normalizedHeader);
      });
    }

    if (!matchedHeader) {
      const fallbackHeader = await container.locator('xpath=.//*[self::th or self::td or self::div or self::span]').evaluateAll(elements =>
        elements.map(el => ({
          text: String(el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim(),
          ariaColIndex: el.getAttribute('aria-colindex') || el.getAttribute('data-kendo-grid-column-index') || ''
        }))
      ).catch(() => [] as Array<{ text: string; ariaColIndex: string }>);

      matchedHeader = fallbackHeader.find(header => normalizeText(header.text).includes(normalizedDate));
      if (matchedHeader) {
        headers.push(matchedHeader);
      }
    }

    if (!matchedHeader) {
      throw new Error(`Could not find prescription date column matching "${dateHeader}". Available headers: ${headers.map(h => h.text).join(' | ')}`);
    }

    const dateHeaderIndex = matchedHeader.ariaColIndex ? Number(matchedHeader.ariaColIndex) - 1 : headers.findIndex(h => h === matchedHeader);

    const normalizedPrescriptionName = normalizeText(prescriptionName);

    // Search rows in the prescription chart by medication name
    const rowCandidates = [
      'xpath=.//tbody//tr[.//td or .//th]',
      'xpath=.//div[contains(@class,"k-grid-content")]//tr',
      'xpath=.//div[contains(@class,"k-grid-row")]',
      'xpath=.//*[@role="row"]',
      'xpath=.//table//tr[.//td or .//th]',
      'xpath=.//tr[normalize-space(.)]',
    ];

    let selectedRow: Locator | null = null;
    let lastRowSample: string[] = [];

    for (const selector of rowCandidates) {
      const rows = container.locator(selector);
      const count = await rows.count().catch(() => 0);
      if (count === 0) continue;

      const matchIndex = await rows.evaluateAll(
        (elements, expectedText) => {
          const normalizedExpected = expectedText.toLowerCase().replace(/\s+/g, ' ').trim();
          const rowIndex = elements.findIndex(el => {
            const text = el.textContent || '';
            const normalizedText = text.toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedText.includes(normalizedExpected);
          });
          return rowIndex;
        },
        normalizedPrescriptionName
      ).catch(() => -1);

      if (matchIndex >= 0 && matchIndex < count) {
        selectedRow = rows.nth(matchIndex);
        break;
      }

      if (lastRowSample.length === 0) {
        lastRowSample = (await Promise.all(
          Array.from({ length: Math.min(count, 5) }, (_, idx) => rows.nth(idx).textContent().catch(() => ''))
        )).map(value => String(value || ''));
      }
    }

    if (!selectedRow) {
      const cleanedText = prescriptionName.replace(/"/g, '\\"');
      const fallbackRow = searchRoot.locator(
        `xpath=.//*[contains(normalize-space(string(.)), "${cleanedText}")]/ancestor::tr[1] | .//*[contains(normalize-space(string(.)), "${cleanedText}") and contains(@role, "row")][1]`
      );
      if ((await fallbackRow.count().catch(() => 0)) > 0) {
        selectedRow = fallbackRow.first();
      }
    }

    if (!selectedRow) {
      throw new Error(`Could not find a prescription chart row matching "${prescriptionName}". Sample rows: ${lastRowSample.map(r => String(r || '').trim()).join(' | ')}`);
    }

    const targetCellByColumn = selectedRow.locator(`xpath=.//*[@data-kendo-grid-column-index='${dateHeaderIndex}' or @aria-colindex='${dateHeaderIndex + 1}' or @role='gridcell'][1]`).first();
    const targetCellByPosition = selectedRow.locator(`xpath=(./*[self::td or self::th or self::div or self::span])[position()=${dateHeaderIndex + 1}]`).first();
    const targetCell = (await targetCellByColumn.count().catch(() => 0)) > 0 ? targetCellByColumn : targetCellByPosition;

    if ((await targetCell.count().catch(() => 0)) === 0) throw new Error(`Could not resolve the target date cell in row for date column index ${dateHeaderIndex}`);

    await targetCell.scrollIntoViewIfNeeded().catch(() => undefined);

    // Locate the planned slot icon and click it
    const slotPlannedXpath = `xpath=.//*[self::img or self::image][contains(@src, 'slot status-planned') or contains(@src, 'slot status-plan') or contains(@ng-reflect--source, 'slot status-planned') or contains(@ng-reflect--source, 'slot status-plan')]`;
    let slotIcon = targetCell.locator(slotPlannedXpath).first();
    if ((await slotIcon.count().catch(() => 0)) === 0) {
      slotIcon = selectedRow.locator(slotPlannedXpath).first();
    }
    if ((await slotIcon.count().catch(() => 0)) === 0) {
      throw new Error(`Planned slot icon not found in prescription cell for ${prescriptionName}|${dateHeader}`);
    }

    await slotIcon.scrollIntoViewIfNeeded().catch(() => undefined);
    await slotIcon.click({ timeout: 8000 }).catch(async () => {
      await slotIcon.evaluate((el: HTMLElement) => (el as HTMLElement).click()).catch(() => undefined);
    });

    await waitForRoller(page).catch(() => undefined);

    console.log(`✅ selectPrescriptionChart clicked planned-slot for "${prescriptionName}" on date "${dateHeader}"`);
    return;
  } catch (error) {
    console.error(`Failed to select prescription chart entry ${step.page}.${step.element}:`, error);
    throw error;
  }
}

export function getTableVerificationInputs(step: testStep): { requiredColumns: string[]; expectedValues: string[] } {
  const tableColumnNames = (step.tableColumnNames || 'Column1').toString().trim();
  const isMultiColumn = tableColumnNames.includes('|');
  const requiredColumns = isMultiColumn
    ? tableColumnNames.split('|').map((col: string) => col.trim())
    : [tableColumnNames.trim()];

  const rawValueInput = (step.isDDT === true && step.datasetColumnNames && String(step.datasetColumnNames).trim())
    || (step.value && String(step.value).trim())
    || '';

  if (!rawValueInput) {
    throw new Error('No values provided for table verification');
  }

  const expectedRefs = isMultiColumn
    ? rawValueInput.split('|').map(val => val.trim())
    : [rawValueInput.trim()];

  if (requiredColumns.length !== expectedRefs.length) {
    throw new Error(`Column count (${requiredColumns.length}) does not match value count (${expectedRefs.length})`);
  }

  return {
    requiredColumns,
    expectedValues: expectedRefs.map(ref => resolveTestVariables(ref.trim()))
  };
}

export async function verifyRecordInTable(page: Page, step: testStep): Promise<void> {
  try {
    const { requiredColumns, expectedValues } = getTableVerificationInputs(step);
    const reqdColumns = requiredColumns;
    const expectedRefs = expectedValues;

    // Validate column count matches value count
    if (reqdColumns.length !== expectedRefs.length) {
      throw new Error(`Column count (${reqdColumns.length}) does not match value count (${expectedRefs.length})`);
    }

    // Get table element
    const baseSelector = getLocatorString(step);
    const tableLocator = await resolveElement(page, baseSelector, step);
    await tableLocator.waitFor({ state: 'visible', timeout: 5000 });

    // Extract headers from iGrid header row first, then fall back to standard table headers.
    let headers = await tableLocator.locator(`xpath=.//tr[contains(@id,'g_TRColHdr')]//td[contains(@id,'igHTD')]`).evaluateAll(elements => {
      return elements.map(el => {
        const text = el.textContent || '';
        return text.replace(/\s+/g, ' ').trim();
      });
    });

    if (headers.length === 0) {
      headers = await tableLocator.locator('xpath=.//th | xpath=.//thead//td | xpath=.//tr[1]//td').evaluateAll(elements => {
        return elements.map(el => {
          const text = el.textContent || '';
          return text.replace(/\s+/g, ' ').trim();
        });
      });
    }

    if (headers.length === 0) {
      throw new Error("No table headers found");
    }

    const normalizedHeaders = headers.map(header => (header || '').trim());

    // Extract all row data from iGrid row elements and fall back to tbody rows if needed.
    let allRowsData = await tableLocator.locator('xpath=.//tr[contains(@id,"igRow")]').evaluateAll(rows => {
      return Array.from(rows).map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        return cells.map(cell => {
          const text = cell.textContent || '';
          return text.replace(/\s+/g, ' ').trim();
        });
      });
    });

    if (allRowsData.length === 0) {
      allRowsData = await tableLocator.locator('xpath=.//tbody//tr').evaluateAll(rows => {
        return Array.from(rows).map(row => {
          const cells = Array.from(row.querySelectorAll('td'));
          return cells.map(cell => {
            const text = cell.textContent || '';
            return text.replace(/\s+/g, ' ').trim();
          });
        });
      });
    }

    const columnIndices = reqdColumns.map((col: string) => {
      const normalizedColumn = col.toLowerCase().trim();

      let index = normalizedHeaders.findIndex(header =>
        header.toLowerCase().trim() === normalizedColumn
      );

      if (index === -1) {
        index = normalizedHeaders.findIndex(header =>
          header.toLowerCase().includes(normalizedColumn)
        );
      }

      if (index === -1) {
        index = normalizedHeaders.findIndex(header =>
          normalizedColumn.includes(header.toLowerCase().trim())
        );
      }

      return index;
    });

    columnIndices.forEach((idx: number, i: number) => {
      if (idx === -1) {
        throw new Error(`Column "${reqdColumns[i]}" not found in table headers. Available headers: ${normalizedHeaders.join(', ')}`);
      }
    });

    const matchingRows = allRowsData.filter(row => {
      return columnIndices.every((colIdx: number, i: number) => {
        if (colIdx < 0 || colIdx >= row.length) {
          return false;
        }

        const cellText = (row[colIdx] || '').trim();
        const expectedText = String(expectedValues[i]).trim();
        const normalizedCellText = cellText.toLowerCase();
        const normalizedExpectedText = expectedText.toLowerCase();

        return normalizedCellText === normalizedExpectedText || normalizedCellText.includes(normalizedExpectedText);
      });
    });

    const condition = (step.condition || 'In').toLowerCase();

    if (condition === 'in') {
      if (matchingRows.length === 0) {
        const criteriaStr = reqdColumns.map((col: string, i: number) => `${col}: "${expectedValues[i]}"`).join(', ');
        throw new Error(`No matching rows found in table for criteria: ${criteriaStr}`);
      }
      console.log(`✓ Found ${matchingRows.length} matching row(s) in table ${step.page}.${step.element}`);
    } else if (condition === 'notin') {
      if (matchingRows.length > 0) {
        const criteriaStr = reqdColumns.map((col: string, i: number) => `${col}: "${expectedValues[i]}"`).join(', ');
        throw new Error(`Found ${matchingRows.length} matching row(s) when expecting none for criteria: ${criteriaStr}`);
      }
      console.log(`✓ Verified no matching rows in table ${step.page}.${step.element}`);
    } else {
      throw new Error(`Unsupported condition: ${step.condition}. Use 'In' or 'NotIn'`);
    }

    console.log(`Table verification details:
    - Headers: ${normalizedHeaders.join(', ')}
    - Total rows: ${allRowsData.length}
    - Matching rows: ${matchingRows.length}
    - Condition: ${condition}
    - Criteria: ${reqdColumns.map((col: string, i: number) => `${col}="${expectedValues[i]}"`).join(', ')}`);
  } catch (error) {
    console.error(`Failed to verify record in table ${step.page}.${step.element}:`, error);
    throw error;
  }
}

/*export async function verifyKendoProperty(page: Page, step: testStep): Promise<void> {
  try {
    if (!step.element && !step.property) {
      throw new Error('No locator provided in step.element or step.property');
    }

    const rawSelector = getLocatorString(step);
    const timeout = Number(step.timeout || 5000);
    const prop = (step.property || step.verifyProperty || '').toString().trim().toLowerCase() || 'exists';
    const expectedRaw = String(step.value || step.expected || 'true').trim();
    const expected = ['true', '1', 'yes'].includes(expectedRaw.toLowerCase());

    const resolveVisibleElement = async () => {
      return await resolveElement(page, rawSelector, step, timeout);
    };

    if (prop === 'exists') {
      try {
        await resolveVisibleElement();
        if (!expected) {
          throw new Error(`Failed to verify property: exists property expected false but element is present and visible`);
        }
        return;
      } catch (error) {
        if (expected) {
          throw new Error(`Failed to verify property: exists property expected true but element is absent`);
        }
        return;
      }
    }

    if (prop === 'visible') {
      if (expected) {
        try {
          const element = await resolveVisibleElement();
          await expect(element).toBeVisible({ timeout });
          return;
        } catch {
          throw new Error(`Failed to verify property: visible property expected true but element is not visible`);
        }
      }

      try {
        const element = await resolveVisibleElement();
        const isVisible = await element.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          throw new Error(`Failed to verify property: visible property expected false but element is present and visible`);
        }
      } catch {
        // Element not found/visible is acceptable when expected false
      }
      return;
    }

    // Generic attribute check: step.property contains attribute name, step.value contains expected string
    // e.g., property='src' value contains 'late administration.png'
    const attrName = step.property;
    if (attrName) {
      const element = await resolveVisibleElement();
      const attr = await element.getAttribute(attrName).catch(() => null);
      const matches = attr != null && String(attr).includes(String(step.value || ''));
      if (matches !== expected) {
        throw new Error(`Failed to verify attribute ${attrName}: expected ${expected} but got ${attr}`);
      }
      return;
    }

    throw new Error(`Unsupported verify property: ${prop}`);
  } catch (error) {
    console.error(`verifyKendoProperty failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}*/

/*export async function selectRecordInTable(page: Page, step: testStep): Promise<void> {
  try {
    // Validate required fields
    if (!step.value) {
      throw new Error("No values provided for table selection");
    }

    // Check if TableColumnNames is provided, if not use 'Column1' as default
    const tableColumnNames = step.tableColumnNames || 'Column1';

    // Parse column names and expected values
    const isMultiColumn = tableColumnNames.includes('|');
    const reqdColumns = isMultiColumn
      ? tableColumnNames.split('|').map((col: string) => col.trim())
      : [tableColumnNames.trim()];

    const expectedRefs = isMultiColumn
      ? step.value.split('|').map(val => val.trim())
      : [step.value.trim()];

    // Validate column count matches value count
    if (reqdColumns.length !== expectedRefs.length) {
      throw new Error(`Column count (${reqdColumns.length}) does not match value count (${expectedRefs.length})`);
    }

    // Get table element
    const baseSelector = getLocatorString(step);
    const tableLocator = await resolveElement(page, baseSelector, step);

    // Wait for table to be visible
    await tableLocator.waitFor({ state: 'visible', timeout: 5000 });

    // Extract headers - generic approach for iGrid/complex HTML tables
    const headers = await tableLocator.locator(`xpath =//tr[contains(@id,'g_TRColHdr')]//tbody//td[contains(@id,'igHTD')]`).evaluateAll(elements => {
      return elements.map(el => {
        const span = el.querySelector('span');
        return span && span.textContent ? span.textContent.trim() : (el.textContent ? el.textContent.trim() : '');
      });
    });

    if (headers.length === 0) {
      throw new Error("No table headers found");
    }

    // Extract all row data - generic approach for standard HTML tables
    const allRowsData = await tableLocator.locator(`xpath =(//tr[contains(@id,'igDTR')]//tbody//tr)[2]`).evaluateAll(rows => {
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return Array.from(cells).map(cell =>
          cell.textContent ? cell.textContent.trim() : ''
        );
      });
    });

    // Resolve expected values (handle global variable references)
    const expectedValues = expectedRefs.map(ref => resolveTestVariables(ref.trim()));

    // Get indices of required columns
    const columnIndices = reqdColumns.map((col: string) => headers.indexOf(col));

    // Validate all columns exist
    columnIndices.forEach((idx: number, i: number) => {
      if (idx === -1) {
        throw new Error(`Column "${reqdColumns[i]}" not found in table headers. Available headers: ${headers.join(', ')}`);
      }
    });

    // Find matching rows
    const matchingRows = allRowsData
      .map((row, rowIndex) => ({
        row,
        rowIndex
      }))
      .filter(({ row }) =>
        columnIndices.every((colIdx: number, i: number) =>
          colIdx !== -1 && row[colIdx] === String(expectedValues[i])
        )
      );

    if (matchingRows.length === 0) {
      const criteriaStr = reqdColumns.map((col: string, i: number) => `${col}: "${expectedValues[i]}"`).join(', ');
      throw new Error(`No matching rows found in table for criteria: ${criteriaStr}`);
    }

    // Now select the matching row(s)
    for (const { rowIndex } of matchingRows) {
      // Find the row locator (skip header row, so +1)
      const fullrowLocator = await tableLocator.locator(`xpath =(//tr[contains(@id,'igDTR')]//tbody//tr)[${rowIndex + 1}]`);
      //const rowLocator = fullrowLocator.locator(`xpath =//img[contains(@title,'Click to select row')] `).first();
      const rowLocator = fullrowLocator.locator(`xpath=//img[contains(@title,'Click to select row') or contains(@longdesc,'Click to select row') or contains(@title,'Click to unselect row')]`).first();

      // Check if already selected (e.g., has a selected class or aria-selected)
      //const isSelected = await rowLocator.getAttribute('aria-selected') === 'true' ||
      //(await rowLocator.getAttribute('class') || '').toLowerCase().includes('selected');

      // ...existing code...

      const trSelectedAttr = await rowLocator.locator('xpath=ancestor::tr[1]').getAttribute('selected');
      const isSelected = await rowLocator.getAttribute('aria-selected') === 'true' ||
        (await rowLocator.getAttribute('class') || '').toLowerCase().includes('selected') ||
        trSelectedAttr === 'true';

      if (isSelected) {
        // Deselect and reselect (simulate click twice)
        // await rowLocator.click();
        await page.waitForTimeout(100);
        //await rowLocator.click();
        console.log(`Row ${rowIndex + 1} was already selected. Deselected and reselected.`);
      } else {
        await rowLocator.click();
        console.log(`Row ${rowIndex + 1} selected.`);
      }
    }

    console.log(`✓ Successfully selected matching row(s) in table ${step.page}.${step.element}`);

  } catch (error) {
    console.error(`Failed to select record in table ${step.page}.${step.element}:`, error);
    throw error;
  }
}*/


export async function selectIPPegBoardByHeader(page: Page, step: testStep): Promise<void> {
  try {
    if (!step.element) {
      throw new Error('No container element provided in step.Element');
    }
    if (!step.tableColumnNames) {
      throw new Error('No TableColumnNames provided in step.TableColumnNames');
    }
    if (typeof step.value === 'undefined' || step.value === null) {
      throw new Error('No value provided in step.Values to match against the header column');
    }

    const headerName = step.tableColumnNames;
    const expectedValue = String(resolveTestVariables(step.value)).trim();
    const containerSelector = getLocatorString(step);

    const container = await resolveElement(page, containerSelector, step);
    await container.waitFor({ state: 'visible', timeout: 5000 });

    const tables = container.locator('table');
    const tableCount = await tables.count();
    if (tableCount < 2) {
      throw new Error(`Expected at least 2 tables in container ${containerSelector}, found ${tableCount}`);
    }

    // Extract headers from the header table (same as selectBlankSlot: header table at index 1)
    const headerTable = tables.nth(1);
    await headerTable.waitFor({ state: 'visible', timeout: 5000 });
    const headerCells = headerTable.locator('tr').first().locator('th,td');
    const headers = await headerCells.evaluateAll(elements =>
      elements.map(el => (el.textContent || '').trim())
    );

    if (headers.length === 0) {
      throw new Error('No headers found in header table');
    }

    const colIdx = headers.findIndex(h => h.toLowerCase().includes(headerName.toLowerCase()));
    if (colIdx === -1) {
      throw new Error(`"${headerName}" header not found. Available headers: ${headers.join(', ')}`);
    }

    // Data rows are in the data table (selectBlankSlot used tables.nth(3)); follow same layout,
    // but fallback to tables.nth(1) if the expected data table index doesn't exist.
    const dataTableIndex = tableCount > 3 ? 3 : 1;
    const dataTable = tables.nth(dataTableIndex);
    await dataTable.waitFor({ state: 'visible', timeout: 5000 });

    // get data rows under tbody if present, otherwise all rows except first
    let dataRows = dataTable.locator('tbody tr');
    let dataCount = await dataRows.count();
    if (dataCount === 0) {
      const allRows = dataTable.locator('tr');
      const total = await allRows.count();
      if (total <= 1) {
        throw new Error('No data rows found in data table');
      }
      dataRows = dataTable.locator(`xpath=./tr[position()>1]`);
      dataCount = await dataRows.count();
    }

    // Find the first row where the specified column matches expectedValue
    let targetRowIndex = -1;
    for (let i = 0; i < dataCount; i++) {
      const row = dataRows.nth(i);
      const cells = row.locator('td');
      const cellCount = await cells.count();
      if (colIdx >= cellCount) continue;
      const cellText = (await cells.nth(colIdx).textContent())?.trim() || '';
      if (cellText === expectedValue) {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error(`No row with "${headerName}" = "${expectedValue}" found in data table`);
    }

    // Click corresponding checkbox in the first table (reuse helper)
    await selectEmptyIPSlotCheckBox(page, containerSelector, targetRowIndex, step);

    console.log(`✓ Selected row ${targetRowIndex + 1} based on "${headerName}" = "${expectedValue}"`);
  } catch (error) {
    console.error(`Failed to select IP PegBoard row by header "${step.tableColumnNames}":`, error);
    throw error;
  }
}

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findHeaderIndex(headers: string[], names: string[]): number {
  const normalizedHeaders = headers.map(h => normalizeText(h));
  for (const name of names) {
    const target = normalizeText(name);
    const idx = normalizedHeaders.findIndex(h => h.includes(target) || target.includes(h));
    if (idx !== -1) return idx;

    for (let i = 0; i < normalizedHeaders.length - 1; i++) {
      const combined = `${normalizedHeaders[i]} ${normalizedHeaders[i + 1]}`.trim();
      if (combined.includes(target) || target.includes(combined)) {
        return i;
      }
    }
  }
  return -1;
}

export function findMatchingHistoryRowIndex(
  headers: string[],
  rows: string[][],
  eventDescription: string,
  eventHeaderNames: string[] = ['event description', 'event', 'eventdescription']
): { rowIndex: number; eventColumnIndex: number } {
  const targetText = normalizeText(eventDescription);
  if (!targetText) return { rowIndex: -1, eventColumnIndex: -1 };

  const eventCol = findHeaderIndex(headers, eventHeaderNames);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    const normalizedRow = row.map(cell => normalizeText(cell));

    if (eventCol !== -1) {
      const cellText = normalizedRow[eventCol] || '';
      if (cellText && (cellText === targetText || cellText.includes(targetText))) {
        return { rowIndex: i, eventColumnIndex: eventCol };
      }
    } else {
      const matchedCol = normalizedRow.findIndex(cell => cell && (cell === targetText || cell.includes(targetText)));
      if (matchedCol !== -1) {
        return { rowIndex: i, eventColumnIndex: matchedCol };
      }
    }
  }

  return { rowIndex: -1, eventColumnIndex: -1 };
}

async function getRowTextValues(row: Locator): Promise<string[]> {
  return row.locator('xpath=./th | ./td').evaluateAll((cells: Element[]) =>
    cells.map((cell: Element) => (cell.textContent || '').trim())
  );
}

async function selectHistoryRow(page: Page, row: Locator, timeout = 5000, primaryTarget?: Locator): Promise<void> {
  await row.scrollIntoViewIfNeeded().catch(() => undefined);

  const selectionTargets = row.locator(
    `xpath=.//td[@imgtype='CheckBox']//img | .//img[contains(@alt,'Check') or contains(@title,'Check') or contains(@alt,'Select') or contains(@title,'Select') or contains(@src,'Check')] | .//input[@type='checkbox'] | .//td[contains(@class,'selected') or contains(@class,'selectedrow')]`
  );

  const attemptClick = async (locator: Locator): Promise<boolean> => {
    if ((await locator.count().catch(() => 0)) === 0) return false;
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      await locator.click({ timeout });
      return true;
    } catch {
      try {
        await locator.click({ timeout, force: true });
        return true;
      } catch {
        try {
          await locator.evaluate((el: HTMLElement) => (el as HTMLElement).click());
          return true;
        } catch {
          try {
            await locator.evaluate((el: HTMLElement) => {
              const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
              el.dispatchEvent(evt);
            });
            return true;
          } catch {
            return false;
          }
        }
      }
    }
  };

  if (primaryTarget && (await attemptClick(primaryTarget))) return;

  if ((await selectionTargets.count().catch(() => 0)) > 0) {
    const target = selectionTargets.first();
    if (await attemptClick(target)) return;
  }

  const firstNonEmptyCell = row.locator('xpath=./td[normalize-space(.) != ""] | ./th[normalize-space(.) != ""]').first();
  if (await attemptClick(firstNonEmptyCell)) return;

  const clickableDescendant = row.locator('xpath=.//button | .//a | .//input | .//span | .//div').first();
  if (await attemptClick(clickableDescendant)) return;

  if (await attemptClick(row)) return;

  throw new Error('Could not click the matched history row');
}

export async function selectIPHistoryByHeader(page: Page, step: testStep): Promise<void> {
  try {
    if (!step.element) throw new Error('No container element provided in step.element');
    if (!step.tableColumnNames) throw new Error('No TableColumnNames provided in step.tableColumnNames');
    if (typeof step.value === 'undefined' || step.value === null) throw new Error('No value provided in step.value to match against the header column');

    const headerName = String(step.tableColumnNames).trim();
    const expectedValue = String(resolveTestVariables(step.value)).trim();
    const containerSelector = getLocatorString(step);

    const container = await resolveElement(page, containerSelector, step);
    await container.waitFor({ state: 'visible', timeout: 5000 });

    const headerRow = container.locator(`xpath=.//tr[@id='g_TRColHdrC0']`);
    if ((await headerRow.count()) === 0) {
      throw new Error(`History header row with id 'g_TRColHdrC0' not found inside container ${containerSelector}`);
    }

    type HeaderMeta = { text: string; id: string; icn: string; ictext: string; index: number };
    const headerMeta: HeaderMeta[] = await headerRow.locator('th,td').evaluateAll((elements: Element[]) =>
      elements.map((el, idx) => ({
        text: (el.textContent || '').trim(),
        id: (el.getAttribute('id') || el.getAttribute('headers') || '').toString(),
        icn: (el.getAttribute('icn') || '').toString(),
        ictext: (el.getAttribute('ictext') || '').toString(),
        index: idx
      }))
    );

    if (headerMeta.length === 0 || headerMeta.every(h => !h.text && !h.icn && !h.ictext)) {
      throw new Error('No headers found in history header row');
    }

    const findHeaderMeta = (headerNameToFind: string): HeaderMeta | null => {
      const normalizedTarget = normalizeText(headerNameToFind).replace(/\s+/g, '');
      for (const meta of headerMeta) {
        const normalizedHeaderText = normalizeText(meta.text).replace(/\s+/g, '');
        const normalizedIcn = normalizeText(meta.icn).replace(/\s+/g, '');
        const normalizedIctext = normalizeText(meta.ictext).replace(/\s+/g, '');

        if (
          normalizedHeaderText === normalizedTarget ||
          normalizedIcn === normalizedTarget ||
          normalizedIctext === normalizedTarget ||
          normalizedHeaderText.includes(normalizedTarget) ||
          normalizedIcn.includes(normalizedTarget) ||
          normalizedIctext.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedHeaderText) ||
          normalizedTarget.includes(normalizedIcn) ||
          normalizedTarget.includes(normalizedIctext)
        ) {
          return meta;
        }
      }
      return null;
    };

    const headers = headerMeta.map(h => h.text || h.ictext || h.icn || '(empty)');

    const dataTable = container.locator(`xpath=.//table[@id='g_DT2C0']`);
    if ((await dataTable.count()) === 0) {
      throw new Error(`History data table with id 'g_DT2C0' not found inside container ${containerSelector}`);
    }

    let dataRows = dataTable.locator(`xpath=.//tr[not(@id='g_TRColHdrC0') and normalize-space(.)!='']`);
    let dataCount = await dataRows.count();
    if (dataCount === 0) {
      throw new Error('No data rows found in history data table');
    }

    const headerParts = String(step.tableColumnNames || '').split('|').map(part => part.trim()).filter(Boolean);
    const valueParts = String(step.value || '').split('|').map(part => part.trim()).filter(Boolean);
    if (headerParts.length === 0 || valueParts.length === 0) {
      throw new Error('At least one header and one value must be provided for selectIPHistoryByHeader');
    }
    if (headerParts.length !== valueParts.length) {
      throw new Error(`Mismatch between number of headers (${headerParts.length}) and values (${valueParts.length}) in selectIPHistoryByHeader`);
    }

    const criteria = headerParts.map((header, index) => ({
      headerName: header,
      expectedValue: String(resolveTestVariables(valueParts[index])).trim()
    }));

    let targetRow: Locator | null = null;
    let targetRowIndex = -1;
    let targetIcIndex: string | null = null;

    const buildRowCellLocator = (meta: HeaderMeta): string => {
      const parts: string[] = [];
      const escapeForXPath = (value: string): string => {
        if (value.includes("'")) {
          const escapedParts = value.split("'").map(part => `'${part}'`);
          return `concat(${escapedParts.join(", '\'', ")})`;
        }
        return `'${value}'`;
      };

      if (meta.icn) {
        parts.push(`normalize-space(@icn) = ${escapeForXPath(meta.icn)}`);
      }
      if (meta.ictext) {
        parts.push(`normalize-space(@ictext) = ${escapeForXPath(meta.ictext)}`);
      }
      if (typeof meta.index === 'number') {
        parts.push(`normalize-space(@headers) = ${escapeForXPath(`CtlParHeader${meta.index}`)}`);
      }
      if (parts.length === 0) {
        return `xpath=./td[${meta.index + 1}]`;
      }
      return `xpath=./td[${parts.join(' or ')}]`;
    };

    const normalizeCriteriaValue = (value: string) => normalizeText(value);

    for (let i = 0; i < dataCount; i++) {
      const row = dataRows.nth(i);
      let rowMatches = true;

      for (const criterion of criteria) {
        const headerMetaForCriterion = findHeaderMeta(criterion.headerName);
        if (!headerMetaForCriterion) {
          throw new Error(`Header "${criterion.headerName}" not found in history grid. Available headers: ${headers.join(', ')}`);
        }

        const cell = row.locator(buildRowCellLocator(headerMetaForCriterion)).first();
        if ((await cell.count()) === 0) {
          rowMatches = false;
          break;
        }

        const cellText = (await cell.textContent())?.trim() || '';
        const normalizedCellText = normalizeText(cellText);
        const normalizedExpected = normalizeCriteriaValue(criterion.expectedValue);
        if (normalizedCellText !== normalizedExpected && !normalizedCellText.includes(normalizedExpected)) {
          rowMatches = false;
          break;
        }
      }

      if (rowMatches) {
        targetRow = row;
        targetRowIndex = i;
        targetIcIndex = (await row.getAttribute('icindex')) || null;
        break;
      }
    }

    if (targetRowIndex === -1 || !targetRow) {
      const criteriaDescription = criteria.map(c => `${c.headerName}="${c.expectedValue}"`).join(', ');
      throw new Error(`No history row matching all criteria: ${criteriaDescription}`);
    }

    const matchedValues = await Promise.all(criteria.map(async criterion => {
      const headerMetaForCriterion = findHeaderMeta(criterion.headerName)!;
      const cell = targetRow!.locator(buildRowCellLocator(headerMetaForCriterion)).first();
      const actualText = (await cell.textContent())?.trim() || '';
      return `${criterion.headerName}="${actualText}"`;
    }));

    console.log(`✓ Matched history row ${targetRowIndex + 1} with ${matchedValues.join(', ')}`);

    const selectionTable = container.locator(`xpath=.//table[@id='g_DT1C0']`);
    if ((await selectionTable.count()) === 0) {
      throw new Error(`Selection table with id 'g_DT1C0' not found inside container ${containerSelector}`);
    }

    let selectionRow: Locator;
    if (targetIcIndex) {
      selectionRow = selectionTable.locator(`xpath=.//tr[@icindex='${targetIcIndex}']`);
    } else {
      selectionRow = selectionTable.locator(`xpath=.//tr[normalize-space(.)!=''][${targetRowIndex + 1}]`);
    }

    if ((await selectionRow.count()) === 0) {
      throw new Error(`Corresponding selection row not found for history row index ${targetRowIndex}`);
    }

    const primaryTarget = selectionRow.locator(`xpath=.//td[1] | .//img[contains(@alt,'Click to select row') or contains(@title,'Click to select row') or contains(@title,'Click to unselect row')]`).first();
    await selectHistoryRow(page, selectionRow, 5000, primaryTarget);

    console.log(`✓ Selected history row ${targetRowIndex + 1} based on "${headerName}" = "${expectedValue}"`);
    return;
  } catch (error) {
    console.error(`Failed to select IP history row by header "${step.tableColumnNames}":`, error);
    throw error;
  }
}
export async function selectEmptyIPSlotCheckBox(page: Page, containerSelector: string, dataRowIndex: number, step: testStep, timeout = 5000): Promise<void> {
  if (dataRowIndex < 0) throw new Error('Invalid dataRowIndex provided');

  const container = await resolveElement(page, containerSelector, step);
  await container.waitFor({ state: 'visible', timeout });

  const tables = container.locator('table');
  const tableCount = await tables.count();
  if (tableCount < 2) {
    throw new Error(`Expected at least 2 tables in container ${containerSelector}, found ${tableCount}`);
  }

  const firstTable = tables.nth(2);
  await firstTable.waitFor({ state: 'visible', timeout });

  // find data rows (tbody tr preferred)
  let firstTableRows = firstTable.locator('tbody tr');
  let firstCount = await firstTableRows.count();
  if (firstCount === 0) {
    // fallback to all rows after possible header
    const allRows = firstTable.locator('tr');
    const total = await allRows.count();
    if (total === 0) {
      throw new Error('No rows found in first table');
    }
    // assume header present and use rows from position()>1; otherwise use all rows
    firstTableRows = total > 1 ? firstTable.locator(`xpath=./tr[position()>1]`) : firstTable.locator('tr');
    firstCount = await firstTableRows.count();
  }

  if (dataRowIndex >= firstCount) {
    throw new Error(`Requested row index ${dataRowIndex} exceeds first table data rows (${firstCount})`);
  }

  const targetRow = firstTableRows.nth(dataRowIndex);

  // Locator for checkbox image - try several patterns to be resilient
  const checkboxImg = targetRow.locator(
    `xpath=.//td[@imgtype='CheckBox']//img | .//img[contains(@alt,'Check') or contains(@title,'Check') or contains(@src,'Check')] | .//input[@type='checkbox']`
  ).first();

  const count = await checkboxImg.count();
  if (count === 0) {
    throw new Error('Checkbox element not found in target first-table row');
  }

  await checkboxImg.waitFor({ state: 'visible', timeout }).catch(() => { /* ignore */ });

  // Determine selection state heuristically (attribute 'checked' or src contains 'Checked')
  const checkedAttr = (await checkboxImg.getAttribute('checked')) || (await checkboxImg.getAttribute('aria-checked'));
  const srcAttr = (await checkboxImg.getAttribute('src')) || '';
  const isSelected = (String(checkedAttr).toLowerCase() === 'true') ||
    /check(ed)?/i.test(srcAttr) && !/uncheck(ed)?/i.test(srcAttr);

  if (isSelected) {
    // Deselect and reselect to ensure a fresh selection (per requirement)
    await checkboxImg.click();
    await page.waitForTimeout(120);
    await checkboxImg.click();
    return;
  } else {
    await checkboxImg.click();
    return;
  }
}
export async function selectRecordInTable(
  page: Page,
  step: testStep
): Promise<void> {
 
  if (!step.value) {
    throw new Error("No values provided");
  }
 
  const tableColumnNames = step.tableColumnNames || "Patient";
 
  const reqdColumns = tableColumnNames
    .split("|")
    .map(col => col.trim());
 
  const expectedValues = step.value
    .split("|")
    .map(val => resolveTestVariables(val.trim()));
 
  console.log("\n================ INPUT DEBUG ================");
  console.log("Columns:", reqdColumns);
  console.log("Values :", expectedValues);
  console.log("=============================================\n");
 
  if (reqdColumns.length !== expectedValues.length) {
    throw new Error("Column count mismatch");
  }
 
  const tableLocator = await resolveElement(
    page,
    getLocatorString(step),
    step
  );
 
  await tableLocator.waitFor({ state: "visible" });
 
  //
  // ✅ IMPORTANT: WAIT FOR GRID DATA TO LOAD
  //
  console.log("⏳ Waiting for grid data to load...");
 
  // Try multiple row selectors for compatibility with different Kendo versions
  const rowSelectors = [
    ".k-grid-content tbody tr.k-master-row",
    ".k-grid-content tbody tr.k-table-row",
    "tbody tr.k-master-row",
    "tbody tr.k-table-row",
    "tbody tr[role='row']"
  ];

  let activeRowSelector = rowSelectors[0];
  for (const selector of rowSelectors) {
    const count = await tableLocator.locator(selector).count().catch(() => 0);
    if (count > 0) {
      activeRowSelector = selector;
      break;
    }
  }

  await tableLocator
    .locator(activeRowSelector)
    .first()
    .waitFor({ timeout: 5000 });
 
  await page.waitForFunction((sel) => {
    const cells = document.querySelectorAll(sel + " td");
    return Array.from(cells).some(c =>
      (c.textContent || "").trim().length > 0
    );
  }, activeRowSelector, { timeout: 15000 });
 
  console.log("✅ Grid data loaded\n");
 
  //
  // HEADER EXTRACTION
  //
  // Try multiple header selectors for compatibility
  const headerSelectors = [
    ".k-grid-header th",
    "thead th",
    "th[role='columnheader']",
    "th"
  ];

  let headers: string[] = [];
  for (const hdrSel of headerSelectors) {
    headers = await tableLocator
      .locator(hdrSel)
      .evaluateAll(ths =>
        ths.map(th => (th.textContent || "").trim())
      );
    if (headers.length > 0 && headers.some(h => h.length > 0)) break;
  }
 
  console.log("📊 RAW HEADERS:", headers);
 
  const normalizedHeaders = headers.map(h =>
    h.toLowerCase().trim()
  );
 
  const columnIndexes = reqdColumns.map(col => {
    let idx = normalizedHeaders.indexOf(
      col.toLowerCase().trim()
    );

    // Fallback: partial match
    if (idx === -1) {
      idx = normalizedHeaders.findIndex(h =>
        h.includes(col.toLowerCase().trim()) ||
        col.toLowerCase().trim().includes(h)
      );
    }
 
    if (idx === -1) {
      throw new Error(
        `Column "${col}" not found.\nAvailable headers: ${headers.join(", ")}`
      );
    }
 
    return idx;
  });
 
  console.log("📍 COLUMN INDEX MAP:");
  reqdColumns.forEach((c, i) => {
    console.log(`   ${c} -> index ${columnIndexes[i]}`);
  });
 
  //
  // ROW SCAN
  //
  const rows = tableLocator.locator(activeRowSelector);
 
  const rowCount = await rows.count();
 
  console.log(`\n🔎 Total rows found: ${rowCount}\n`);
 
  let matched = false;
 
  for (let i = 0; i < rowCount; i++) {
 
    const row = rows.nth(i);
    const cells = row.locator("td");
 
    console.log(`➡️ Checking Row ${i + 1}`);
 
    let isMatch = true;
 
    for (let j = 0; j < columnIndexes.length; j++) {
 
      const rawText = await cells.nth(columnIndexes[j]).textContent();
 
      const cellText = (rawText || "")
        .replace(/\s+/g, " ")
        .trim();
 
      const expected = (expectedValues[j] || "")
        .replace(/\s+/g, " ")
        .trim();
 
      console.log(
        `   Column "${reqdColumns[j]}": "${cellText}" vs "${expected}"`
      );
 
      if (cellText.toLowerCase() !== expected.toLowerCase()) {
        isMatch = false;
      }
    }
 
    if (isMatch) {
      matched = true;
 
      console.log(`\n✅ MATCH FOUND IN ROW ${i + 1}`);
 
      // Try multiple checkbox selectors for compatibility
      let checkbox = row.locator("input.k-select-checkbox");
      let checkboxCount = await checkbox.count();
      if (checkboxCount === 0) {
        checkbox = row.locator("input[aria-label='Select row']");
        checkboxCount = await checkbox.count();
      }
      if (checkboxCount === 0) {
        checkbox = row.locator("input[type='checkbox']");
        checkboxCount = await checkbox.count();
      }

      if (checkboxCount > 0) {
        const isChecked = await checkbox.isChecked();
        if (!isChecked) {
          await checkbox.check();
          console.log(`☑️ Row ${i + 1} selected`);
        } else {
          console.log(`☑️ Row ${i + 1} already selected`);
        }
      } else {
        // No checkbox found, click the row directly
        await row.click();
        console.log(`☑️ Row ${i + 1} clicked (no checkbox found)`);
      }
 
      break;
    }
  }
 
  //
  // ❌ NO MATCH HANDLING
  //
  if (!matched) {
    console.log("\n❌ NO MATCH FOUND");
    console.log("Expected Columns:", reqdColumns);
    console.log("Expected Values :", expectedValues);
 
    console.log("\n⚠️ DEBUG CHECKS:");
    console.log("- Grid may not contain PASID yet");
    console.log("- Column name mismatch (check header text)");
    console.log("- Data still loading in iframe/grid");
    console.log("- Value may be in another column");
 
    throw new Error(
      `No matching rows found for: ${step.value}`
    );
  }
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function selectKendoRecordGrid(page: Page, step: testStep): Promise<void> {
  try {
    if (!step.value) throw new Error('No value provided. Expected "PASID|Status"');

    // Accept value as "PASID|Status" or datasetColumnNames for DDT
    let raw = step.isDDT === true && step.datasetColumnNames ? step.datasetColumnNames : step.value;
    raw = resolveTestVariables(String(raw));

    const parts = raw.split('|').map(p => p.trim());
    if (parts.length < 2) throw new Error('Value must be in format "PASID|Status" or "PASID|ExpandIcon"');

    const targetPAS = parts[0];
    const targetStatusOrAction = parts[1];
    const isExpandAction = ['expandicon', 'expand'].includes(targetStatusOrAction.toLowerCase());
    const targetStatus = isExpandAction ? '' : targetStatusOrAction;

    let tableLocator = await resolveElement(page, getLocatorString(step), step);
    await tableLocator.waitFor({ state: 'visible', timeout: 5000 });

    // Wait for grid data to populate (non-blocking)
    await page.waitForFunction(() => {
      const cells = document.querySelectorAll('.k-grid-content tbody tr.k-master-row td');
      return Array.from(cells).some(c => (c.textContent || '').trim().length > 0);
    }, { timeout: 15000 }).catch(() => undefined);

    // Try to find rows scoped under the resolved locator. If the locator points
    // at a child element (e.g. the calendar icon), scope may be empty — use a
    // broader Kendo grid row selector and a row self-match fallback.
    const rowsSelector = '.k-grid-content tbody tr.k-master-row, table.k-grid-table tbody tr.k-master-row, tbody tr.k-master-row';
    let rows = tableLocator.locator(rowsSelector);
    let count = await rows.count().catch(() => 0);

    if (count === 0) {
      // If the resolved locator itself is already a Kendo row, use it directly.
      const selfRow = tableLocator.locator('xpath=self::tr[contains(@class,"k-master-row")]');
      if (await selfRow.count().catch(() => 0) > 0) {
        rows = selfRow;
        count = await rows.count().catch(() => 0);
      }
    }

    if (count === 0) {
      // 1) nearest ancestor with k-grid / role=grid / k-widget
      const ancestorGrid = tableLocator.locator('xpath=ancestor::*[contains(@class,"k-grid") or @role="grid" or contains(@class,"k-widget")][1]');
      if (await ancestorGrid.count().catch(() => 0) > 0) {
        tableLocator = ancestorGrid.first();
        await tableLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
        rows = tableLocator.locator(rowsSelector);
        count = await rows.count().catch(() => 0);
      }
    }

    if (count === 0) {
      // 2) fallback: nearest ancestor <table>
      const ancestorTable = tableLocator.locator('xpath=ancestor::table[1]');
      if (await ancestorTable.count().catch(() => 0) > 0) {
        tableLocator = ancestorTable.first();
        await tableLocator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
        rows = tableLocator.locator(rowsSelector);
        count = await rows.count().catch(() => 0);
      }
    }

    if (count === 0) throw new Error('No rows found in Kendo grid');

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);

      // Locate PAS cell text - prefer .smallfont2 but fallback to any text that contains PASID
      let pasText = '';
      const smallfont2 = row.locator('.smallfont2').first();
      if (await smallfont2.count() > 0) {
        pasText = (await smallfont2.textContent()) || '';
      } else {
        // fallback to search entire row for PASID substring
        pasText = (await row.textContent()) || '';
      }

      if (!pasText.includes(targetPAS)) {
        continue; // PAS not matched in this row
      }

      let statusEl: Locator | null = null;
      let statusText = '';

      if (!isExpandAction) {
        // Get current status text (class currentstatus)
        statusEl = row.locator('.currentstatus').first();
        statusText = (await statusEl.count() > 0) ? ((await statusEl.textContent()) || '').trim() : '';

        if (statusText !== targetStatus) {
          // Not matching status for this PAS in same row
          continue;
        }
      }

      if (isExpandAction) {
        const expandIcon = row.locator("td[data-kendo-grid-column-index='9'] div.arrowIcon span.mdi-chevron-right, td[data-kendo-grid-column-index='9'] div.arrowIcon span.iconArrow, td[data-kendo-grid-column-index='9'] span.mdi-chevron-right").first();
        if ((await expandIcon.count().catch(() => 0)) > 0) {
          await expandIcon.scrollIntoViewIfNeeded();
          await expandIcon.click().catch(async () => {
            const cell = row.locator("td[data-kendo-grid-column-index='9']").first();
            await cell.click().catch(() => undefined);
          });
          console.log(`Matched PAS "${targetPAS}" and clicked expand icon on row ${i + 1}`);
          return;
        }

        console.warn('Expand icon not found for matched row');
        continue;
      }

      // Both conditions satisfied — perform actions for calendar icon
      const calIcon = row.locator("td[data-kendo-grid-column-index='0'] [part='calenderIcon'], td[data-kendo-grid-column-index='0'] .calenderIcon, td[data-kendo-grid-column-index='0'] div[part='calenderIcon']").first();
      if ((await calIcon.count().catch(() => 0)) > 0) {
        try {
          await calIcon.scrollIntoViewIfNeeded();
          await calIcon.click();
        } catch (err) {
          const inner = row.locator("td[data-kendo-grid-column-index='0'] [part='calenderIcon'] > div, td[data-kendo-grid-column-index='0'] .calenderIcon > div").first();
          if ((await inner.count().catch(() => 0)) > 0) {
            await inner.click().catch(() => undefined);
          }
        }
      } else {
        console.warn('Calendar icon not found for matched row');
      }

      const expandCell = row.locator("td[data-kendo-grid-column-index='9']").first();

      await page.waitForTimeout(250);

      const finishKeywords = [targetStatus.toLowerCase(), 'return to theatre', 'returned to theatre', 'finish', 'finished', 'complete', 'completed'];
      const getStatusText = async () => {
        if (!statusEl) {
          return '';
        }
        return (await statusEl.count()) > 0 ? ((await statusEl.textContent()) || '').trim().toLowerCase() : '';
      };

      let updatedStatus = await getStatusText();
      const start = Date.now();
      while (Date.now() - start < 3000 && !finishKeywords.some(k => k && updatedStatus.includes(k))) {
        await page.waitForTimeout(200);
        updatedStatus = await getStatusText();
      }

      const shouldExpand = finishKeywords.some(k => k && updatedStatus.includes(k));

      if (shouldExpand) {
        if (await expandCell.count() > 0) {
          try {
            await expandCell.scrollIntoViewIfNeeded();
            const arrow = expandCell.locator('.iconArrow, .mdi-chevron-right, .arrowIcon').first();
            if (await arrow.count() > 0) {
              await arrow.click().catch(() => expandCell.click().catch(() => undefined));
            } else {
              await expandCell.click().catch(() => undefined);
            }
          } catch (err) {
            console.warn('Failed to click expand chevron:', err);
          }
        } else {
          console.warn('Expand cell not found for matched row');
        }
      } else {
        console.log(`Row status after calendar action: "${updatedStatus}" — not in finish keywords, skipping expand`);
      }

      console.log(`Matched PAS "${targetPAS}" with status "${targetStatus}" and performed clicks on row ${i + 1}`);
      return;
    }

    throw new Error(`No row found with PAS "${targetPAS}" and status "${targetStatus}"`);
  } catch (error) {
    console.error('selectKendoRecordGrid failed:', error);
    throw error;
  }
}
export async function splitString(page: Page, step: testStep): Promise<void> {

  try {

    // Validate Values field

    if (!step.value) {

      throw new Error('Values field is required for splitString action');

    }



    const parts = step.value.split('|').map(part => part.trim());



    // Validate minimum required parameters

    if (parts.length < 4) {

      throw new Error('Values must contain source string, separator, result index, and variable name separated by |');

    }



    let sourceStr = parts[0];

    let separator = parts[1];

    const resultIndex = parseInt(parts[2]);

    const varName = parts[3];



    // Handle quoted separators (remove surrounding quotes)

    if ((separator.startsWith('"') && separator.endsWith('"')) ||

        (separator.startsWith("'") && separator.endsWith("'"))) {

      separator = separator.slice(1, -1);

    }



    // Handle special separator cases

    let actualSeparator = separator;

    switch (separator.toLowerCase()) {

      case 'space':

      case ' ':

        actualSeparator = ' ';

        break;

      case 'comma':

        actualSeparator = ',';

        break;

      case 'tab':

        actualSeparator = '\t';

        break;

      case 'newline':

      case 'nl':

        actualSeparator = '\n';

        break;

      case 'pipe':

        actualSeparator = '|';

        break;

      default:

        actualSeparator = separator;

    }



    // Get the source value (handles global variables)

    const sourceValue = resolveTestVariables(sourceStr);



    // Validate result index

    if (isNaN(resultIndex) || resultIndex < 0) {

      throw new Error('Result index must be a valid non-negative number');

    }



    // Perform the split operation

    const resultArray = sourceValue.split(actualSeparator);



    // Check if result index is within bounds

    if (resultIndex >= resultArray.length) {

      throw new Error(`Result index ${resultIndex} is out of bounds. Array length: ${resultArray.length}`);

    }



    const result = resultArray[resultIndex].trim(); // Trim the result to remove extra spaces



    // Store result in global variables with proper variable name formatting

    //onst finalVarName = varName.startsWith('_') ? varName : `_${varName}`;

    //executionContext.setGlobalVariable(finalVarName, result);

    const finalVarName = varName.startsWith('_') ? varName : `_${varName}`;
executionContext.addSuiteVariable(finalVarName, result);

console.log(`Stored split result in global variable: ${finalVarName} = "${result}"`);



  } catch (error: unknown) {

    console.error(`Error in splitString: ${error instanceof Error ? error.message : String(error)}`);

    throw error;

  }

}







// --- Restored (carried earlier) ---
export async function selectSlotByCurrentTime(page: Page, step: testStep): Promise<{ code: number; value: string }> {
  try {
    // Determine current time (or use override from Values for testing)
    let now: Date;
    if (step.value && /^\d{1,2}:\d{2}$/.test(step.value.trim())) {
      const [h, m] = step.value.trim().split(':').map(Number);
      now = new Date();
      now.setHours(h, m, 0, 0);
      console.log(`  🕐 Using override time: ${step.value.trim()}`);
    } else {
      now = new Date();
      console.log(`  🕐 Current system time: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    }

    // Round DOWN to nearest 30-minute boundary
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 0 : 30;

    // Calculate end time (start + 30 minutes)
    const endDate = new Date(now);
    endDate.setHours(hours, roundedMinutes + 30, 0, 0);
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();

    // Format without leading zeros on hours (e.g., "1:00" not "01:00")
    const slotStartTime = `${hours}:${roundedMinutes.toString().padStart(2, '0')}`;
    const slotEndTime = `${endHours}:${endMinutes.toString().padStart(2, '0')}`;
    const slotRange = `${slotStartTime} to ${slotEndTime}`;
    console.log(`  🎯 Target slot range: ${slotRange}`);

    // Store calculated slot range as a variable for downstream steps
    const varManager = executionContext.getVariableManager();
    if (varManager) {
      varManager.set('SlotTime', slotRange);
      varManager.set('SlotStartTime', slotStartTime);
      varManager.set('SlotEndTime', slotEndTime);
    }

    // Wait a moment for the grid to be fully rendered
    await page.waitForTimeout(1000);

    // Strategy: Use page.evaluate to find the row with matching slot range and click its checkbox.
    // The Lorenzo Clinic Overview grid uses standard HTML tables. Slot cells contain
    // range text like "1:00 to 1:30", "11:30 to 12:00", etc.
    const result = await page.evaluate((targetRange: string) => {
      const [targetStart] = targetRange.split(' to ');
      const allCells = document.querySelectorAll('td');
      let matchingRow: HTMLTableRowElement | null = null;

      for (const cell of Array.from(allCells)) {
        const text = (cell.textContent || '').trim();

        // Strategy 1: Match full range text (e.g., "1:00 to 1:30")
        if (text.includes(targetRange)) {
          const row = cell.closest('tr') as HTMLTableRowElement;
          if (row) { matchingRow = row; break; }
        }

        // Strategy 2: Match start time in a "Start time" column
        const timeMatch = text.match(/(\d{1,2}:\d{2})/);
        if (timeMatch && timeMatch[1] === targetStart) {
          const row = cell.closest('tr');
          if (!row) continue;

          // Verify this cell is in a "Start time" column by checking the column header
          const table = cell.closest('table');
          if (!table) continue;

          const cellIndex = Array.from(row.children).indexOf(cell);
          const headerRow = table.querySelector('tr');
          if (headerRow) {
            const headerCells = headerRow.querySelectorAll('th, td');
            if (cellIndex < headerCells.length) {
              const headerText = (headerCells[cellIndex].textContent || '').toLowerCase().trim();
              if (headerText.includes('start')) {
                matchingRow = row as HTMLTableRowElement;
                break;
              }
            }
          }

          // If no header check possible, just use first match
          if (!matchingRow) {
            matchingRow = row as HTMLTableRowElement;
          }
        }
      }

      if (!matchingRow) {
        return { success: false, error: `No row found matching slot "${targetRange}" (start: "${targetStart}")` };
      }

      // Find the checkbox in the matching row
      const checkbox = matchingRow.querySelector('input[type="checkbox"], input[aria-label="Select row"]') as HTMLInputElement;
      if (checkbox) {
        checkbox.click();
        return { success: true, method: 'checkbox' };
      }

      // Try img-based select row button
      const selectImg = matchingRow.querySelector('img[title="Click to select row"], img[alt="Click to select row"]') as HTMLElement;
      if (selectImg) {
        selectImg.click();
        return { success: true, method: 'img-select' };
      }

      // Try clicking the row itself
      matchingRow.click();
      return { success: true, method: 'row-click' };
    }, slotRange);

    if (result.success) {
      console.log(`  ✅ Selected slot ${slotRange} via ${result.method}`);
      return { code: 0, value: `Selected slot ${slotRange} via ${result.method}` };
    }

    // Fallback: Try using Playwright locators across all frames
    console.log(`  ⚠️ page.evaluate didn't find match. Trying Playwright locator approach...`);

    // Search across all frames (Lorenzo uses iframes heavily)
    const allFrames = page.frames();
    for (const frame of allFrames) {
      try {
        // Find all cells containing the target slot range or start time
        const timeCells = frame.locator(`xpath=//td[contains(text(),"${slotStartTime}")]`);
        const count = await timeCells.count().catch(() => 0);

        for (let i = 0; i < count; i++) {
          const cell = timeCells.nth(i);
          const cellText = await cell.textContent().catch(() => '');
          // Match if cell contains the full range or just the start time
          if (!(cellText || '').includes(slotRange) && !(cellText || '').includes(slotStartTime)) continue;

          // Found matching cell - get its parent row
          const row = cell.locator('xpath=ancestor::tr');
          const rowCount = await row.count().catch(() => 0);
          if (rowCount === 0) continue;

          // Try to click the checkbox in this row
          const checkboxSelectors = [
            "input[aria-label='Select row']",
            "input[type='checkbox']",
            "img[title='Click to select row']"
          ];

          let clicked = false;
          for (const sel of checkboxSelectors) {
            const cb = row.locator(sel).first();
            const cbCount = await cb.count().catch(() => 0);
            if (cbCount > 0) {
              await cb.click();
              clicked = true;
              console.log(`  ✅ Selected slot ${slotRange} via frame locator (${sel})`);
              return { code: 0, value: `Selected slot ${slotRange}` };
            }
          }

          if (!clicked) {
            await row.click();
            console.log(`  ✅ Selected slot ${slotRange} via row click in frame`);
            return { code: 0, value: `Selected slot ${slotRange} via row click` };
          }
        }
      } catch { /* continue to next frame */ }
    }

    // Final fallback: try next available slot after target time
    console.log(`  ⚠️ Exact match for ${slotRange} not found. Trying next available slot...`);
    const targetMinutes = hours * 60 + roundedMinutes;

    const nextResult = await page.evaluate((targetMins: number) => {
      const allCells = document.querySelectorAll('td');
      let bestRow: HTMLTableRowElement | null = null;
      let bestTime = '';
      let bestDiff = Infinity;

      for (const cell of Array.from(allCells)) {
        const text = (cell.textContent || '').trim();
        const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) continue;

        const cellMins = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
        const diff = cellMins - targetMins;
        if (diff >= 0 && diff < bestDiff) {
          const row = cell.closest('tr') as HTMLTableRowElement;
          if (row) {
            bestRow = row;
            bestTime = `${timeMatch[1]}:${timeMatch[2]}`;
            bestDiff = diff;
          }
        }
      }

      if (!bestRow) return { success: false, error: 'No available slot found' };

      const checkbox = bestRow.querySelector('input[type="checkbox"], input[aria-label="Select row"]') as HTMLInputElement;
      if (checkbox) { checkbox.click(); return { success: true, time: bestTime, method: 'checkbox' }; }

      const selectImg = bestRow.querySelector('img[title="Click to select row"]') as HTMLElement;
      if (selectImg) { selectImg.click(); return { success: true, time: bestTime, method: 'img' }; }

      bestRow.click();
      return { success: true, time: bestTime, method: 'row-click' };
    }, targetMinutes);

    if (nextResult.success) {
      const selectedTime = (nextResult as any).time;
      if (varManager) varManager.set('SlotTime', selectedTime);
      console.log(`  ✅ Selected next available slot at ${selectedTime}`);
      return { code: 0, value: `Selected next available slot at ${selectedTime}` };
    }

    return { code: 1, value: `No slot found for ${slotRange} or later` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ selectSlotByCurrentTime failed: ${msg}`);
    return { code: 1, value: `Failed to select time slot: ${msg}` };
  }

}


// --- Restored (carried earlier) ---
export async function clickAndSwitchToPopup(page: Page, step: testStep): Promise<Outcome> {
  try {
    const timeout = step.value ? parseInt(step.value, 10) : 30000;
    const baseSelector = getLocatorString(step);
    console.log(`  🔍 Looking for element to click: ${baseSelector}`);

    const element = await resolveElement(page, baseSelector, step);

    // Set up popup listener BEFORE clicking
    const context = page.context();
    const popupPromise = context.waitForEvent('page', { timeout });

    console.log(`  🖱️ Clicking element and waiting for popup window...`);
    await element.click();

    let popupPage: Page;
    try {
      popupPage = await popupPromise;
    } catch {
      // Popup didn't appear via context event — try checking all browser contexts
      // This can happen with CDP connections where the popup opens in a different context
      console.log(`  ⚠️ No popup via context event. Attempting CDP re-connect to find new page...`);
      
      // Wait a bit for the window to fully open
      await page.waitForTimeout(3000);
      
      // Try to find new page via the browser object
      const browser = context.browser();
      if (browser) {
        const allContexts = browser.contexts();
        for (const ctx of allContexts) {
          const pages = ctx.pages();
          for (const p of pages) {
            if (p !== page && !p.isClosed()) {
              const url = p.url();
              const title = await p.title().catch(() => '');
              if (url.toLowerCase().includes('diditesturl') || title.toLowerCase().includes('encounter')) {
                popupPage = p;
                console.log(`  ✅ Found popup page via browser contexts: "${title}" - ${url}`);
                break;
              }
            }
          }
          if (popupPage!) break;
        }
      }

      if (!popupPage!) {
        // Last resort: try connecting to CDP again to pick up new pages
        try {
          const freshBrowser = await chromium.connectOverCDP('http://127.0.0.1:9222');
          const allContexts = freshBrowser.contexts();
          for (const ctx of allContexts) {
            for (const p of ctx.pages()) {
              if (!p.isClosed()) {
                const url = p.url();
                const title = await p.title().catch(() => '');
                if (url.toLowerCase().includes('diditesturl') || title.toLowerCase().includes('encounter')) {
                  popupPage = p;
                  console.log(`  ✅ Found popup page via fresh CDP connection: "${title}" - ${url}`);
                  break;
                }
              }
            }
            if (popupPage!) break;
          }
        } catch (cdpErr) {
          console.log(`  ⚠️ Fresh CDP connection failed: ${cdpErr instanceof Error ? cdpErr.message : cdpErr}`);
        }
      }

      if (!popupPage!) {
        return { code: 1, value: `Popup window did not appear within ${timeout}ms` };
      }

    }

    // Wait for popup to load
    await popupPage.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await popupPage.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const popupTitle = await popupPage.title().catch(() => 'Unknown');
    const popupUrl = popupPage.url();
    console.log(`  ✅ Popup opened: "${popupTitle}" - ${popupUrl}`);

    // Store popup page reference in execution context for subsequent steps
    const varManager = executionContext.getVariableManager();
    if (varManager) {
      varManager.set('PopupPage', '__POPUP_PAGE_REF__');
    }
    // Store on execution context directly so resolvePageForStep can access it
    (executionContext as any)._popupPage = popupPage;

    return { code: 0, value: `Popup opened: "${popupTitle}" at ${popupUrl}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ clickAndSwitchToPopup failed: ${msg}`);
    return { code: 1, value: `Failed to click and switch to popup: ${msg}` };
  }

}


// --- Restored (carried earlier) ---
export async function selectSlotByCurrentTimeDC(

  page: Page,

  step: testStep

): Promise<{ code: number; value: string }> {

 

  try {

 

    // ✅ STEP 1: Resolve time

    let now = new Date();

 

    if (step.value && /^\d{1,2}:\d{2}$/.test(String(step.value).trim())) {

      const [h, m] = String(step.value).trim().split(":").map(Number);

      now.setHours(h, m, 0, 0);

      console.log(`🕐 Using override time: ${step.value}`);

    }

 

    // ✅ STEP 2: Round to 15 mins

    const interval = 15;

    const remainder = now.getMinutes() % interval;

 

    if (remainder !== 0) {

      now.setMinutes(now.getMinutes() + (interval - remainder));

    }

 

    now.setSeconds(0, 0);

 

    const targetMinutes = now.getHours() * 60 + now.getMinutes();

 

    const targetTime =

      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

 

    console.log(`🎯 Target: ${targetTime}`);

 

    // ✅ STEP 3: Detect context (page or frame)

    let ctx: any = null;

 

    const pageCount = await page.locator("//td[@icn='StartTime']").count();

 

    if (pageCount > 10) {

      ctx = page;

      console.log("✅ Grid found on MAIN page");

    } else {

      for (const f of page.frames()) {

        try {

          if ((await f.locator("//td[@icn='StartTime']").count()) > 10) {

            ctx = f;

            console.log("✅ Grid found in FRAME");

            break;

          }

        } catch {}

      }

    }

 

    if (!ctx) {

      throw new Error("Slot grid not found");

    }

 

    // ✅ STEP 4: Locators

    const startCells = ctx.locator("//td[@icn='StartTime']");

    const statusCells = ctx.locator("//td[@icn='AppointmentStatus']");

    const clickCells = ctx.locator("//td[.//img[@title='Click to select row']]");

 

    const total = await startCells.count();

    const statusCount = await statusCells.count();

    const clickCount = await clickCells.count();

 

    console.log(`✅ Slots: ${total}`);

 

    let selectedIndex = -1;

 

    // ✅ ✅ STEP 5: MAIN LOOP (OPTIMIZED ✅)

    for (let i = 0; i < total; i++) {

 

      const startCell = startCells.nth(i);

 

      // ✅ Get time from title or text

      let raw = await startCell.getAttribute("title");

      if (!raw) raw = await startCell.innerText();

 

      const time = (raw || "").replace(/\s+/g, "").trim();

 

      if (!time || !time.includes(":")) continue;

 

      const [h, m] = time.split(":").map(Number);

      if (isNaN(h) || isNaN(m)) continue;

 

      const minutes = h * 60 + m;

 

      // ✅ Skip past slots

      if (minutes < targetMinutes) continue;

 

      // ✅ Get visual position

      const startBox = await startCell.boundingBox();

      if (!startBox) continue;

 

      // ✅ Match status via Y alignment

      let matchedStatus = "";

 

      for (let j = 0; j < statusCount; j++) {

 

        const statusCell = statusCells.nth(j);

        const statusBox = await statusCell.boundingBox();

 

        if (!statusBox) continue;

 

        if (Math.abs(statusBox.y - startBox.y) < 5) {

          matchedStatus =

            (await statusCell.getAttribute("title")) ||

            await statusCell.innerText();

          break;

        }

      }

 

      const status = (matchedStatus || "").trim();

 

      console.log(`➡️ ${time} | Status: ${status}`);

 

      // ✅ ✅ FIRST AVAILABLE SLOT → STOP ✅

      if (status === "Available") {

        selectedIndex = i;

        break;  // 🔥 performance optimization

      }

    }

 

    if (selectedIndex === -1) {

      throw new Error("No available slots found after target time");

    }

 

    // ✅ STEP 6: Get selected time

    let selectedTime =

      await startCells.nth(selectedIndex).getAttribute("title");

 

    if (!selectedTime) {

      selectedTime = await startCells.nth(selectedIndex).innerText();

    }

 

    console.log(`✅ Selected slot: ${selectedTime}`);

 

    // ✅ STEP 7: Click using visual mapping ✅

    const startElement = startCells.nth(selectedIndex);

    const startBox = await startElement.boundingBox();

 

    if (!startBox) {

      throw new Error("Unable to locate slot position");

    }

 

    let bestClickIndex = -1;

    let bestDistance = Number.MAX_SAFE_INTEGER;

 

    for (let i = 0; i < clickCount; i++) {

 

      const clickBox = await clickCells.nth(i).boundingBox();

      if (!clickBox) continue;

 

      const distance = Math.abs(clickBox.y - startBox.y);

 

      if (distance < bestDistance) {

        bestDistance = distance;

        bestClickIndex = i;

      }

    }

 

    if (bestClickIndex === -1) {

      throw new Error("No matching checkbox found");

    }

 

    console.log("✅ Clicking slot");

 

    const clickCell = clickCells.nth(bestClickIndex);

 

    await clickCell.scrollIntoViewIfNeeded();

    await clickCell.click();

 

    return {

      code: 0,

      value: (selectedTime || "").trim()

    };

 

  } catch (error) {

 

    const msg = error instanceof Error ? error.message : String(error);

 

    console.error(`❌ Error: ${msg}`);

 

    return {

      code: 1,

      value: `Failed to select time slot: ${msg}`

    };

  }

}


// --- Restored (carried earlier) ---
export async function selectBookedSlotByPatientId(

  page: Page,

  step: testStep

): Promise<{ code: number; value: string }> {

 

  try {

 

    // ✅ ✅ STEP 0: SIMULATED RUNTIME VARIABLE STORE ✅

    // 🔁 Replace this with your actual framework store if available

    const runtimeData: Record<string, string> = (globalThis as any).testData || {

      _PASID: "PASID-052913"  // 👉 example fallback

    };

 

    // ✅ ✅ VARIABLE RESOLVER ✅

    const resolveValue = (val: string) => {

      if (!val) return "";

 

      if (val.startsWith("_")) {

        const resolved = runtimeData[val];

        console.log(`🔁 Resolving ${val} → ${resolved}`);

        return resolved || val;   // fallback if missing

      }

 

      return val;

    };

 

    // ✅ Normalize function

    const normalize = (val: string) =>

      (val || "")

        .replace(/\u00A0/g, "")      // NBSP

        .replace(/\s+/g, "")         // remove spaces/newlines

        .replace(/–|—|‑/g, "-")      // normalize dashes

        .trim();

 

    // ✅ STEP 1: Resolve input value

    const rawInput = String(step.value || "").trim();

    console.log(`📌 Raw input: "${rawInput}"`);

 

    const resolvedValue = resolveValue(rawInput);

    const expected = normalize(resolvedValue);

 

    console.log(`🎯 Final PASID to match: ${expected}`);

 

    // ✅ STEP 2: Detect context (page or frame)

    let ctx: any = null;

 

    const pageCount = await page.locator("//td[@icn='PatientInfo.PatientIdentifier']").count();

 

    if (pageCount > 10) {

      ctx = page;

      console.log("✅ Grid found on MAIN page");

    } else {

      for (const f of page.frames()) {

        try {

          const count = await f.locator("//td[@icn='PatientInfo.PatientIdentifier']").count();

          if (count > 10) {

            ctx = f;

            console.log("✅ Grid found in FRAME");

            break;

          }

        } catch {}

      }

    }

 

    if (!ctx) {

      throw new Error("Grid not found");

    }

 

    // ✅ STEP 3: Locators

    const patientCells = ctx.locator("//td[@icn='PatientInfo.PatientIdentifier']");

    const clickCells = ctx.locator("//td[.//img[@title='Click to select row']]");

    const startCells = ctx.locator("//td[@icn='StartTime']");

 

    const total = await patientCells.count();

    console.log(`✅ Total rows: ${total}`);

 

    let targetBox: any = null;

 

    // ✅ ✅ STEP 4: FIND PASID (ONLY THIS MATTERS ✅)

    for (let i = 0; i < total; i++) {

 

      let raw =

        (await patientCells.nth(i).getAttribute("title")) ||

        await patientCells.nth(i).innerText();

 

      const id = normalize(raw);

 

      console.log(`➡️ Checking PatientID: "${id}"`);

 

      if (id === expected) {

        console.log(`✅ MATCH FOUND`);

        targetBox = await patientCells.nth(i).boundingBox();

 

        if (!targetBox) {

          throw new Error("Could not determine row position");

        }

 

        break;

      }

    }

 

    if (!targetBox) {

      throw new Error(`Patient ID ${resolvedValue} not found`);

    }

 

    // ✅ STEP 5: (Optional) derive time only for logging

    let selectedTime = "";

 

    const startCount = await startCells.count();

 

    let bestTimeDistance = Number.MAX_SAFE_INTEGER;

 

    for (let i = 0; i < startCount; i++) {

 

      const box = await startCells.nth(i).boundingBox();

      if (!box) continue;

 

      const delta = Math.abs(box.y - targetBox.y);

 

      if (delta < bestTimeDistance) {

        bestTimeDistance = delta;

 

        selectedTime =

          (await startCells.nth(i).getAttribute("title")) ||

          await startCells.nth(i).innerText();

      }

    }

 

    console.log(`✅ Slot time (visual match): ${selectedTime}`);

 

    // ✅ ✅ STEP 6: CLICK CORRECT ROW ✅

    const clickCount = await clickCells.count();

 

    let bestClickIndex = -1;

    let bestDistance = Number.MAX_SAFE_INTEGER;

 

    for (let i = 0; i < clickCount; i++) {

 

      const box = await clickCells.nth(i).boundingBox();

      if (!box) continue;

 

      const delta = box.y - targetBox.y;

 

      // ✅ ❗ IMPORTANT FIX (NO ABOVE ROW)

      if (delta < -2) continue;

 

      if (delta < bestDistance) {

        bestDistance = delta;

        bestClickIndex = i;

      }

    }

 

    if (bestClickIndex === -1) {

      throw new Error("Matching checkbox not found");

    }

 

    console.log("✅ Clicking correct booked slot ✅");

 

    await clickCells.nth(bestClickIndex).scrollIntoViewIfNeeded();

    await clickCells.nth(bestClickIndex).click();

 

    return {

      code: 0,

      value: (selectedTime || "").trim()

    };

 

  } catch (error) {

 

    const msg = error instanceof Error ? error.message : String(error);

 

    console.error(`❌ Error: ${msg}`);

 

    return {

      code: 1,

      value: `Failed to select booked slot: ${msg}`

    };

  }

}
