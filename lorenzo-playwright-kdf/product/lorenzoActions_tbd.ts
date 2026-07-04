// import { Page, Locator } from "@playwright/test";
// import { getGlobalValueIfPrefixed, parseStructuredValue } from "../utilities/dataHelpers";
// import { setTextBox, clickElement, resolveElement, resolveElements, waitForElement, getText, selectListBox } from "./elementActions";
// import { waitForRoller } from "./waitActions";
// import { getLocator } from "../utilities/locatorManager";
// import { executionContext } from "../utilities/executionContext";

// interface TestStep {
//     StepNo: number;
//     StepDescription: string;
//     Page: string;
//     Element: string;
//     Values?: string;
//     ElementText?: string;
//     ActionKeyword: string;
//     Property?: string;
//     Condition?: string;
//     TableColumnNames?: string;
//     [key: string]: any;
// }

// // export async function selectComboBox(page: Page, step: TestStep) {
// //     try {
// //         const optionText = getGlobalValueIfPrefixed(step.Values);
// //         const comboboxName = getGlobalValueIfPrefixed(step.Element);
// //         const baseSelector = getLocator(step.Page, step.Element, step);
// //         const element = await resolveElement(page, baseSelector);
// //         await element.click();
// //         //const comboIDSplit = baseSelector.split('_');

// //         const underscoreIndex = baseSelector.indexOf('_');
// //         const firstPart = underscoreIndex !== -1 ? baseSelector.substring(0, underscoreIndex) : baseSelector;
// //         const rest = underscoreIndex !== -1 ? baseSelector.substring(underscoreIndex + 1) : '';
// //         // firstPart contains the part before the first '_'
// //         // rest contains everything after the first '_'




// //         const comboboxId = rest; // e.g., C2T, C2L
// //         //const inputSelector = `#C2T_${comboboxId}`;
// //         const timeout = 5000;

// //         //await page.click(inputSelector);

// //         // Wait for dropdown to appear
// //         const listSelector = `#C2L_${comboboxId}`;
// //         const allOptionsSelector = `${listSelector} li`;
// //         const options = await resolveElements(page, allOptionsSelector, {
// //             timeout: 5000,
// //             visibleOnly: true,
// //             minCount: 1
// //         });
// //         for (let opt of options) {
// //             const labelText = await opt.locator('label').textContent();
// //             if (labelText == optionText) {
// //                 await opt.click();
// //                 break;
// //             }
// //         }
// //     } catch (error) {
// //         const errorMsg = (error instanceof Error) ? error.message : String(error);
// //         console.error(`Error selecting from combobox: ${errorMsg}`);
// //         throw error;
// //     }
// // }

// export async function selectComboBox(page: Page, step: TestStep) {
//     try {
//         const optionText = getGlobalValueIfPrefixed(step.Values);
//         const comboboxName = getGlobalValueIfPrefixed(step.Element);
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);
//         //await element.click();

//         // Identify combo box type by DOM structure or selector
//         let comboType: 'lorenzo' | 'referral' | 'unknown' = 'unknown';

//         // Heuristic: Referral combo boxes have id like "icombobox_Control_cboServicetype"
//         if (baseSelector.startsWith('#icombobox_Control_') || baseSelector.includes('icombobox_Control_')) {
//             comboType = 'referral';
//         } else if (baseSelector.startsWith('#C2T_') || baseSelector.startsWith('#C2L_')) {
//             comboType = 'lorenzo';
//         }

//         switch (comboType) {
//             case 'lorenzo': {
//                 // Existing Lorenzo combo box logic
//                 const underscoreIndex = baseSelector.indexOf('_');
//                 const rest = underscoreIndex !== -1 ? baseSelector.substring(underscoreIndex + 1) : '';
//                 const comboboxId = rest;
//                 const listSelector = `#C2L_${comboboxId}`;
//                 const allOptionsSelector = `${listSelector} li`;
//                 const options = await resolveElements(page, allOptionsSelector, {
//                     timeout: 5000,
//                     visibleOnly: true,
//                     minCount: 1
//                 });
//                 for (let opt of options) {
//                     const labelText = await opt.locator('label').textContent();
//                     if (labelText == optionText) {
//                         await opt.click();
//                         return;
//                     }
//                 }
//                 throw new Error(`Option "${optionText}" not found in Lorenzo combo box`);
//             }

//             case 'referral': {
//                 // Referral combo box logic (based on provided DOM)
//                 // 1. Click the dropdown arrow if present
//                 const arrowBtn = element.locator('img[id^="icombobox_Image_"]');
//                 if (await arrowBtn.count() > 0 && await arrowBtn.isVisible()) {
//                     // Check if the dropdown is already expanded by inspecting the class or aria-expanded attribute
//                     const isExpanded = await arrowBtn.getAttribute('class')?.then(cls => cls?.includes('expanded') || false)
//                         || await arrowBtn.getAttribute('aria-expanded') === 'true';
//                     if (!isExpanded) {
//                         await arrowBtn.click();
//                     }
//                 } else {
//                     // Fallback: click the text input to open dropdown
//                     const input = element.locator('input[type="text"][id^="icombobox_Text_"]');
//                     if (await input.count() > 0 && await input.isVisible()) {
//                         await input.click();
//                     }
//                 }

//                 // Example input: "icombobox_List_cboServicetype"
//                 // Goal: Split into "icombobox_List_cbo" and "Servicetype"
//                 // const splitPrefix = "#icombobox_Control_cbo";
//                 // let prefix = "";
//                 // let suffix = "";

//                 // if (baseSelector.startsWith(splitPrefix)) {
//                 //     prefix = "icombobox_List_cbo";
//                 //     suffix = baseSelector.substring(splitPrefix.length); // e.g., "Servicetype"
//                 // }


//                 // 3. Find the option and select it


//                 // const allOptionsSelector = `xpath=//select[@id='${prefix}${suffix}']//option`;
//                 // const options = await resolveElements(page, allOptionsSelector, {
//                 //     timeout: 50000,
//                 //     visibleOnly: true,
//                 //     minCount: 1
//                 // });
//                 // for (let opt of options) {
//                 //     const labelText = await opt.textContent();
//                 //     if (labelText == optionText) {
//                 //         await opt.click();
//                 //         return;
//                 //     }


//                 // Normalize baseSelector to an id-like value (remove leading '#' or 'xpath=' if present)
//                 const cleanBase = baseSelector.replace(/^xpath=/i, '').replace(/^#/, '');

//                 // Two formats supported:
//                 //  - icombobox_Control_cbo<suffix>  (already handled previously; keep behavior)
//                 //  - icombobox_Control_C<digits>     (new dynamic numeric id, e.g. C31)
//                 let allOptionsSelector: string | null = null;

//                 // Handle the existing 'cbo' pattern (do not change existing behavior)
//                 if (/^icombobox_Control_cbo/i.test(cleanBase)) {
//                     const suffix = cleanBase.substring('icombobox_Control_cbo'.length); // e.g., "Servicetype" or "RefSource"
//                     const prefix = 'icombobox_List_cbo';
//                     // exact select id is usually icombobox_List_cbo<Suffix>
//                     allOptionsSelector = `xpath=//select[@id='${prefix}${suffix}']//option`;
//                 }
//                 // Handle the dynamic C## pattern (e.g., icombobox_Control_C31)
//                 else if (/^icombobox_Control_C\d+/i.test(cleanBase)) {
//                     const suffix = cleanBase.substring('icombobox_Control_'.length); // e.g., "C31"
//                     // Select any <select> whose id starts with icombobox_List_ and contains the dynamic suffix
//                     // This is robust to id variations like icombobox_List_C31 or icombobox_List__C31 etc.
//                     allOptionsSelector = `xpath=//select[starts-with(@id,'icombobox_List_') and contains(@id, '${suffix}')]//option`;
//                 } else {
//                     // Generic fallback: try any select that starts with icombobox_List_ (covers other unexpected cases)
//                     allOptionsSelector = `xpath=//select[starts-with(@id,'icombobox_List_')]//option`;
//                 }

//                 if (!allOptionsSelector) {
//                     throw new Error('Unable to construct options selector for referral combobox');
//                 }

//                 // 2. Wait for options to appear and select the matching option by text
//                 const options = await resolveElements(page, allOptionsSelector, {
//                     timeout: 50000,
//                     visibleOnly: true,
//                     minCount: 1
//                 });

//                 for (const opt of options) {
//                     const labelText = (await opt.textContent())?.trim() || '';
//                     if (labelText === optionText) {
//                         // clicking the <option> is fine in many cases; if not, select via the <select> element
//                         try {
//                             await opt.click();
//                         } catch {
//                             // fallback: select by value/label on the parent <select>
//                             const parentSelect = opt.locator('xpath=ancestor::select[1]');
//                             if (await parentSelect.count() > 0) {
//                                 await parentSelect.selectOption({ label: optionText }).catch(() => { /* ignore */ });
//                             }
//                         }
//                         return;
//                     }
//                 }

//                 throw new Error(`Option "${optionText}" not found in Referral combo box (selector: ${allOptionsSelector})`);
//             }

//         }
//     }
//     // default: {
//     //     // Fallback: try generic logic (click label or option by text)
//     //     const optionLocator = element.locator('li,label,option', { hasText: optionText });
//     //     if (await optionLocator.count() > 0) {
//     //         await optionLocator.first().click();
//     //         return;
//     //     }
//     //     throw new Error(`Combo box type not recognized or option "${optionText}" not found`);
//     // }
//     catch (error) { }
// }



// export async function setComboBox(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No value provided for combo box`);
//         }

//         const value = getGlobalValueIfPrefixed(step.Values);
//         const finalValue = String(value).trim();
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);

//         await waitForRoller(page);

//         const inputField = element.locator('input[uselectinput], input[type="text"]').first();

//         if (!await inputField.isVisible()) {
//             throw new Error(`Input field not found in combo box`);
//         }

//         await inputField.click();
//         await inputField.clear();
//         await inputField.fill(finalValue);

//         await page.waitForTimeout(1000);

//         // Try exact match first
//         const exactMatchSelector = `xpath=//u-select-option[. = '${finalValue}']`;
//         const exactOption = await resolveElement(page, exactMatchSelector, 2000).catch(() => null);

//         if (exactOption) {
//             await exactOption.click();
//         } else {
//             // Try partial match
//             const partialMatchSelector = `xpath=//u-select-option[contains(., '${finalValue}')]`;
//             const partialOption = await resolveElement(page, partialMatchSelector, 2000).catch(() => null);

//             if (partialOption) {
//                 await partialOption.click();
//             } else {
//                 // Just press Enter if no match found
//                 await inputField.press('Enter');
//             }
//         }

//         await waitForRoller(page);

//     } catch (error) {
//         console.error(`Failed to set combo box:`, error);
//         throw error;
//     }
// }
// export async function setCheckbox(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No value provided for checkbox. Expected: true or false`);
//         }

//         const shouldBeChecked = String(getGlobalValueIfPrefixed(step.Values)).toLowerCase().trim() === 'true';
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);

//         await waitForRoller(page);

//         // Find the actual checkbox input
//         const checkbox = await element.evaluateHandle(el => {
//             // If element is already a checkbox input, return it
//             if (el.tagName.toLowerCase() === 'input' && el.getAttribute('type') === 'checkbox') {
//                 return el;
//             }
//             // Otherwise, find checkbox input within
//             return el.querySelector('input[type="checkbox"]') || el;
//         });

//         // Get current state and click if needed
//         const isChecked = await checkbox.evaluate((el: any) => el.checked === true);

//         if (isChecked !== shouldBeChecked) {
//             // Try clicking the checkbox or its label
//             const clicked = await checkbox.evaluate((el: any) => {
//                 const input = el.tagName.toLowerCase() === 'input' ? el : el.querySelector('input[type="checkbox"]');
//                 if (input) {
//                     // Click label if exists, otherwise click input
//                     const label = input.id ? document.querySelector(`label[for="${input.id}"]`) : null;
//                     (label || input).click();
//                     return true;
//                 }
//                 return false;
//             });

//             if (!clicked) {
//                 // Fallback: click the wrapper element
//                 await element.click();
//             }
//         }

//         await waitForRoller(page);
//         console.log(`Set checkbox ${step.Page}.${step.Element} to ${shouldBeChecked}`);

//     } catch (error) {
//         console.error(`Failed to set checkbox ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }
// export async function verifyValueInComboBox(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No value provided for verification`);
//         }

//         if (!step.Condition) {
//             throw new Error(`No condition provided for verification. Expected: equal, contains, not contains, or not equals`);
//         }

//         const expectedValue = getGlobalValueIfPrefixed(step.Values);
//         const finalExpectedValue = String(expectedValue).trim();
//         const condition = step.Condition.toLowerCase().trim();
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);

//         const inputField = element.locator('input[uselectinput], input[type="text"]').first();

//         let actualValue = '';

//         if (await inputField.isVisible()) {
//             actualValue = await inputField.inputValue();
//         } else {
//             actualValue = await element.textContent() || '';
//         }

//         actualValue = actualValue.trim();

//         let verificationPassed = false;
//         let errorMessage = '';

//         switch (condition) {
//             case 'equal':
//             case 'equals':
//                 verificationPassed = actualValue === finalExpectedValue;
//                 errorMessage = `Expected value to equal "${finalExpectedValue}" but found "${actualValue}"`;
//                 break;

//             case 'contains':
//             case 'contain':
//                 verificationPassed = actualValue.toLowerCase().includes(finalExpectedValue.toLowerCase());
//                 errorMessage = `Expected value to contain "${finalExpectedValue}" but found "${actualValue}"`;
//                 break;

//             case 'not contains':
//             case 'not contain':
//             case 'notcontains':
//             case 'notcontain':
//                 verificationPassed = !actualValue.toLowerCase().includes(finalExpectedValue.toLowerCase());
//                 errorMessage = `Expected value to NOT contain "${finalExpectedValue}" but found "${actualValue}"`;
//                 break;

//             case 'not equals':
//             case 'not equal':
//             case 'notequals':
//             case 'notequal':
//                 verificationPassed = actualValue !== finalExpectedValue;
//                 errorMessage = `Expected value to NOT equal "${finalExpectedValue}" but found "${actualValue}"`;
//                 break;

//             default:
//                 throw new Error(`Invalid condition: "${condition}". Expected: equal, contains, not contains, or not equals`);
//         }

//         if (!verificationPassed) {
//             throw new Error(errorMessage);
//         }

//     } catch (error) {
//         console.error(`Failed to verify combo box value:`, error);
//         throw error;
//     }
// }
// export async function verifyComboBoxOptions(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No expected options provided for verification`);
//         }

//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);

//         await waitForRoller(page);

//         // Find and click the dropdown button to open options
//         const dropdownButton = element.locator('button[aria-label="Open selection"]');
//         const chevronIcon = element.locator('u-icon[class*="icon_fluorine_chevron_down"]');

//         // Try clicking the dropdown button first, then the chevron icon, then the element itself
//         if (await dropdownButton.isVisible()) {
//             await dropdownButton.click();
//         } else if (await chevronIcon.isVisible()) {
//             await chevronIcon.click();
//         } else {
//             await element.click();
//         }

//         // Wait for dropdown to open
//         await waitForRoller(page);
//         await page.waitForTimeout(500);

//         // Get all options from the dropdown using resolveElements
//         const optionsSelector = `xpath=//u-select-option//div[contains(@class,'d-flex')]`;
//         const optionElements = await resolveElements(page, optionsSelector, {
//             timeout: 5000,
//             visibleOnly: true,
//             minCount: 1
//         });

//         const actualOptionsList: string[] = [];

//         for (const option of optionElements) {
//             const text = await option.textContent();
//             if (text && text.trim()) {
//                 actualOptionsList.push(text.trim());
//             }
//         }

//         // Parse expected options
//         const expectedOptionsList = step.Values.split('|').map(opt => opt.trim());

//         // Compare actual vs expected
//         const actualOptionsStr = actualOptionsList.join(', ');
//         const expectedOptionsStr = expectedOptionsList.join(', ');

//         if (actualOptionsList.length !== expectedOptionsList.length) {
//             throw new Error(`Option count mismatch. Expected ${expectedOptionsList.length} options but found ${actualOptionsList.length}. ` +
//                 `\nExpected: [${expectedOptionsStr}]` +
//                 `\nActual: [${actualOptionsStr}]`);
//         }

//         // Check if all expected options are present (order matters)
//         for (let i = 0; i < expectedOptionsList.length; i++) {
//             if (actualOptionsList[i] !== expectedOptionsList[i]) {
//                 throw new Error(`Option mismatch at position ${i + 1}. ` +
//                     `Expected "${expectedOptionsList[i]}" but found "${actualOptionsList[i]}". ` +
//                     `\nExpected: [${expectedOptionsStr}]` +
//                     `\nActual: [${actualOptionsStr}]`);
//             }
//         }

//         // Close the dropdown
//         if (await dropdownButton.isVisible()) {
//             await dropdownButton.click();
//         } else if (await chevronIcon.isVisible()) {
//             await chevronIcon.click();
//         } else {
//             // Click outside to close dropdown
//             await page.click('body', { position: { x: 0, y: 0 } });
//         }

//         await page.waitForTimeout(300);

//         console.log(`✓ Verified combo box options. Found: [${actualOptionsStr}]`);

//     } catch (error) {
//         console.error(`Failed to verify combo box options:`, error);
//         throw error;
//     }
// }
// export async function clearTextBox(page: Page, step: TestStep): Promise<void> {
//     try {
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const locator = await resolveElement(page, baseSelector);
//         await locator.waitFor({ state: 'visible', timeout: 5000 });
//         await locator.scrollIntoViewIfNeeded();

//         let targetLocator = locator;
//         let actualValue = '';

//         // Check if element is u-input and get the actual input inside
//         const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
//         if (tagName === 'u-input') {
//             const innerInput = locator.locator('input').first();
//             if (await innerInput.count() > 0) {
//                 targetLocator = innerInput;
//             }
//         }

//         // Check if the target is an input element
//         const isInputElement = await targetLocator.evaluate(el => {
//             const tag = el.tagName.toLowerCase();
//             return tag === 'input' || tag === 'textarea' || tag === 'select' || el.hasAttribute('contenteditable');
//         });

//         if (isInputElement) {
//             // Try standard clear
//             await targetLocator.clear();
//             actualValue = await targetLocator.inputValue().catch(() => '');
//         }

//         // If not cleared or not an input element, try using the clear button
//         if (!isInputElement || actualValue !== '') {
//             const clearButton = locator.locator('u-clear-button button, button.btn-clear').first();
//             if (await clearButton.count() > 0 && await clearButton.isVisible()) {
//                 await clearButton.click();
//                 await page.waitForTimeout(100);
//                 if (isInputElement) {
//                     actualValue = await targetLocator.inputValue().catch(() => '');
//                 }
//             } else if (!isInputElement) {
//                 throw new Error(`Element is not clearable and no clear button found`);
//             }
//         }

//         if (isInputElement && actualValue !== '') {
//             console.warn(`Clear verification failed. Text box still contains: "${actualValue}"`);
//         }

//         console.log(`Successfully cleared text in ${step.Page}.${step.Element}`);
//     } catch (error) {
//         console.error(`Failed to clear text in ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }
// export async function toggleElement(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) throw new Error(`No value provided for toggle. Expected: true/false or on/off`);

//         const targetValue = String(getGlobalValueIfPrefixed(step.Values)).toLowerCase().trim();
//         const shouldBeChecked = targetValue === 'true' || targetValue === 'on';

//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);
//         await waitForRoller(page);

//         // Check if the element itself is clickable toggle (like orbis-switch_slider)
//         const isSliderElement = await element.evaluate(el =>
//             el.classList.contains('orbis-switch_slider') ||
//             el.classList.contains('orbis-switch') ||
//             el.classList.contains('toggle')
//         );

//         if (isSliderElement) {
//             // For slider elements, we need to find the associated checkbox differently
//             // Look for checkbox in parent or sibling elements
//             const checkbox = await findAssociatedCheckbox();

//             if (checkbox && await safeCount(checkbox) > 0) {
//                 const currentState = await checkbox.evaluate((el: HTMLInputElement) => el.checked);

//                 if (currentState !== shouldBeChecked) {
//                     await element.click();
//                     await page.waitForTimeout(200);

//                     // Verify the toggle worked
//                     const newState = await checkbox.evaluate((el: HTMLInputElement) => el.checked);
//                     if (newState !== shouldBeChecked) {
//                         throw new Error(`Toggle failed. Expected: ${shouldBeChecked ? 'ON' : 'OFF'}, Actual: ${newState ? 'ON' : 'OFF'}`);
//                     }
//                 }
//             } else {
//                 // No checkbox found, just click the slider and assume it toggles
//                 await element.click();
//                 await page.waitForTimeout(200);
//             }

//             await waitForRoller(page);
//             return;
//         }

//         // Standard checkbox handling
//         let checkbox = element.locator('input[type="checkbox"]').first();

//         // If not found, try within gwt-CheckBox span
//         if (await safeCount(checkbox) === 0) {
//             checkbox = element.locator('span.gwt-CheckBox input[type="checkbox"]').first();
//         }

//         // If still not found, try within orbis-switch label
//         if (await safeCount(checkbox) === 0) {
//             checkbox = element.locator('label.orbis-switch input[type="checkbox"]').first();
//         }

//         // If element itself is a checkbox
//         if (await safeCount(checkbox) === 0) {
//             const isCheckbox = await element.evaluate(el =>
//                 el.tagName.toLowerCase() === 'input' && el.getAttribute('type') === 'checkbox'
//             );
//             if (isCheckbox) {
//                 checkbox = element;
//             }
//         }

//         if (await safeCount(checkbox) === 0) {
//             throw new Error(`No checkbox found within element ${step.Page}.${step.Element}`);
//         }

//         // Get current state
//         const currentState = await checkbox.evaluate((el: HTMLInputElement) => el.checked);

//         // Check if toggle is needed
//         if (currentState === shouldBeChecked) {
//             console.log(`Toggle already in desired state: ${shouldBeChecked ? 'ON' : 'OFF'}`);
//             return;
//         }

//         // Try clicking different targets in order of preference
//         const clicked = await tryClickTargets();

//         if (!clicked) {
//             // If no visual element clicked, click the checkbox directly
//             await checkbox.click();
//         }

//         // Wait for state change
//         await page.waitForTimeout(200);

//         // Verify the toggle worked
//         const newState = await checkbox.evaluate((el: HTMLInputElement) => el.checked);
//         if (newState !== shouldBeChecked) {
//             // Try programmatic approach as fallback
//             await checkbox.evaluate((input: HTMLInputElement, checked: boolean) => {
//                 input.checked = checked;
//                 input.dispatchEvent(new Event('change', { bubbles: true }));
//                 input.dispatchEvent(new Event('input', { bubbles: true }));
//             }, shouldBeChecked);

//             // Final verification
//             await page.waitForTimeout(200);
//             const finalState = await checkbox.evaluate((el: HTMLInputElement) => el.checked);
//             if (finalState !== shouldBeChecked) {
//                 throw new Error(`Toggle failed. Expected: ${shouldBeChecked ? 'ON' : 'OFF'}, Actual: ${finalState ? 'ON' : 'OFF'}`);
//             }
//         }

//         await waitForRoller(page);

//         async function findAssociatedCheckbox() {
//             try {
//                 // Remove xpath= prefix if it exists to avoid double prefix
//                 const cleanSelector = baseSelector.replace(/^xpath=/i, '');

//                 // Try to find checkbox in parent structure using relative XPath
//                 // Note: We use element.locator() which already has the context of the element
//                 let checkbox = element.locator('ancestor::div[contains(@class,"toggle") or contains(@class,"switch")]//input[@type="checkbox"]').first();
//                 if (await safeCount(checkbox) > 0) return checkbox;

//                 // Try parent element
//                 checkbox = element.locator('..//input[@type="checkbox"]').first();
//                 if (await safeCount(checkbox) > 0) return checkbox;

//                 // Try preceding sibling
//                 checkbox = element.locator('preceding-sibling::input[@type="checkbox"]').first();
//                 if (await safeCount(checkbox) > 0) return checkbox;

//                 // Try following sibling
//                 checkbox = element.locator('following-sibling::input[@type="checkbox"]').first();
//                 if (await safeCount(checkbox) > 0) return checkbox;

//                 // Try using CSS selectors for better reliability
//                 // Find parent container and look for checkbox
//                 const parentContainers = [
//                     element.locator('..').first(),
//                     element.locator('../..').first(),
//                     element.locator('../../..').first()
//                 ];

//                 for (const parent of parentContainers) {
//                     if (await safeCount(parent) > 0) {
//                         const checkboxInParent = parent.locator('input[type="checkbox"]').first();
//                         if (await safeCount(checkboxInParent) > 0) {
//                             return checkboxInParent;
//                         }
//                     }
//                 }

//                 return null;
//             } catch (error) {
//                 console.warn('Error finding associated checkbox:', error);
//                 return null;
//             }
//         }

//         async function tryClickTargets(): Promise<boolean> {
//             // Try to click on slider first
//             const slider = element.locator('span.orbis-switch_slider').first();
//             if (await safeCount(slider) > 0 && await slider.isVisible()) {
//                 await slider.click();
//                 return true;
//             }

//             // Try orbis-switch label
//             const orbisSwitch = element.locator('label.orbis-switch').first();
//             if (await safeCount(orbisSwitch) > 0 && await orbisSwitch.isVisible()) {
//                 await orbisSwitch.click();
//                 return true;
//             }

//             // Try any label element
//             const label = element.locator('label').first();
//             if (await safeCount(label) > 0 && await label.isVisible()) {
//                 await label.click();
//                 return true;
//             }

//             return false;
//         }

//         // Safe count helper to avoid the evaluate error
//         async function safeCount(locator: Locator): Promise<number> {
//             try {
//                 return await locator.count();
//             } catch (error) {
//                 if (error instanceof Error && error.message.includes('evaluate')) {
//                     console.warn('Count failed due to XPath evaluation error:', error.message);
//                     return 0;
//                 }
//                 throw error;
//             }
//         }

//     } catch (error) {
//         console.error(`Failed to toggle element ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }
// export async function selectTypeAhead(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error('No value provided for typeahead selection');
//         }
//         const fullValue = String(step.Values).trim();
//         const typeValue = fullValue.split(' ')[0];
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const dropdown = await resolveElement(page, baseSelector);
//         await waitForRoller(page);
//         await dropdown.click();
//         const input = dropdown.locator('input');
//         if (await input.isVisible()) {
//             await input.fill('');
//             await input.type(typeValue, { delay: 100 });
//         }
//         await page.waitForTimeout(1000);

//         let exactMatchSelector: string;
//         let partialMatchSelector: string;

//         const elementIdentifier = `${step.Page}.${step.Element}`;

//         switch (elementIdentifier) {
//             case 'pageReconciliation.txt_ProductSelectionTypeahead':
//                 exactMatchSelector = `xpath=//u-cdk-overlay//div[@title='${fullValue}']`;
//                 partialMatchSelector = `xpath=//ddm-product-item//div[contains(@class,"product-name") and contains(normalize-space(.), '${fullValue}')]`;
//                 break;
//             default:
//                 exactMatchSelector = `xpath=//u-cdk-overlay//div[@title='${fullValue}']`;
//                 partialMatchSelector = `xpath=//u-cdk-overlay//div[contains(normalize-space(.), '${fullValue}')]`;
//                 break;
//         }

//         const exactOption = await resolveElement(page, exactMatchSelector, 2000).catch(() => null);
//         if (exactOption) {
//             await exactOption.click();
//         } else {
//             const partialOption = await resolveElement(page, partialMatchSelector, 2000).catch(() => null);
//             if (partialOption) {
//                 await partialOption.click();
//             } else {
//                 throw new Error(`Option "${fullValue}" not found in typeahead dropdown`);
//             }
//         }
//         await waitForRoller(page);
//     } catch (error) {
//         console.error('Failed to select from typeahead:', error);
//         throw error;
//     }
// }
// export async function mouseHoverAndGetText(page: Page, step: TestStep): Promise<void> {
//     try {
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);

//         await element.hover();

//         // Wait for tooltip to appear
//         await page.waitForTimeout(500);

//         const tooltipSelector = "xpath=//div[contains(@class,'tooltip-inner')]";
//         const tooltipElement = await resolveElement(page, tooltipSelector, 2000).catch(() => null);

//         if (!tooltipElement) {
//             throw new Error('Tooltip element not found after hovering');
//         }

//         const textContent = await tooltipElement.textContent();
//         console.log(`Text content of tooltip:`, textContent);

//         if (step.Values && step.Values.startsWith('_')) {
//             const varName = step.Values; // Keep the underscore
//             executionContext.setGlobalVariable(varName, textContent);
//             console.log(`Stored text in global variable: ${varName} = "${textContent}"`);
//         }

//     } catch (error) {
//         console.error(`Failed to hover and get text:`, error);
//         throw error;
//     }
// }
// export async function verifyAscendingSortUGrid(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.TableColumnNames) {
//             throw new Error('No column names provided for sorting verification');
//         }

//         const columnNames = step.TableColumnNames.split('|').map(c => c.trim());
//         const isMultiColumnSort = columnNames.length === 2;
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const tableLocator = await resolveElement(page, baseSelector);

//         const headers = await tableLocator.locator('u-grid-column-header').evaluateAll(rows =>
//             Array.from(rows).flatMap(row =>
//                 Array.from(row.querySelectorAll("u-grid-header-cell > div[class*='header-content-wrapper']")).map(cell =>
//                     cell.textContent?.trim() || ''
//                 )
//             )
//         );

//         const primaryColIndex = headers.findIndex(h => h.includes(columnNames[0]));
//         if (primaryColIndex === -1) {
//             throw new Error(`Column "${columnNames[0]}" not found`);
//         }

//         const secondaryColIndex = isMultiColumnSort
//             ? headers.findIndex(h => h.includes(columnNames[1]))
//             : -1;

//         if (isMultiColumnSort && secondaryColIndex === -1) {
//             throw new Error(`Column "${columnNames[1]}" not found`);
//         }

//         await page.waitForTimeout(300);

//         const headerCells = await tableLocator.locator('u-grid-header-cell').elementHandles();
//         const primaryHeader = headerCells[primaryColIndex];

//         const hasSortIndicator = await primaryHeader.evaluate((cell: Element) =>
//             !!cell.querySelector('[class*="sort-indicator"]')
//         );

//         if (!hasSortIndicator) {
//             throw new Error(`Column "${columnNames[0]}" does not support sorting`);
//         }

//         for (let i = 0; i < 3; i++) {
//             await primaryHeader.click();
//             const icon = await primaryHeader.$('[class*="sort-indicator"]');
//             const className = await icon?.getAttribute('class');
//             if (className?.includes('sort-asc')) break;
//         }

//         if (isMultiColumnSort) {
//             const secondaryHeader = headerCells[secondaryColIndex];
//             await page.keyboard.down('Control');
//             await secondaryHeader.click();
//             await page.keyboard.up('Control');
//         }

//         const ResObject: Record<string, string[]> = {};
//         const seenRowIds = new Set<string>();
//         const maxScrolls = 100;
//         let scrollAttempts = 0;

//         while (scrollAttempts < maxScrolls) {
//             let newRowFound = false;
//             const itemHandles = await tableLocator.locator('u-collection-item').elementHandles();

//             for (const item of itemHandles) {
//                 const rowId = await item.getAttribute('data-u-collection-element-id');
//                 const groupId = await item.getAttribute('data-u-collection-parent-id');

//                 if (!rowId || seenRowIds.has(rowId)) continue;

//                 seenRowIds.add(rowId);
//                 newRowFound = true;

//                 if (!groupId) continue;
//                 if (!ResObject[groupId]) ResObject[groupId] = [];

//                 const row = await item.$('u-grid-row');
//                 if (row) {
//                     const cells = await row.$$('u-grid-cell');
//                     const primaryVal = cells[primaryColIndex]
//                         ? (await cells[primaryColIndex].textContent())?.trim() || ''
//                         : '';
//                     const secondaryVal = isMultiColumnSort && cells[secondaryColIndex]
//                         ? (await cells[secondaryColIndex].textContent())?.trim() || ''
//                         : '';

//                     const value = isMultiColumnSort
//                         ? `${primaryVal} | ${secondaryVal}`
//                         : primaryVal;

//                     ResObject[groupId].push(value);
//                 }
//             }

//             if (itemHandles.length > 0) {
//                 const lastItem = itemHandles[itemHandles.length - 1];
//                 await lastItem.scrollIntoViewIfNeeded();
//                 await page.waitForTimeout(400);
//             }

//             if (!newRowFound) break;
//             scrollAttempts++;
//         }

//         for (const [groupId, values] of Object.entries(ResObject)) {
//             if (isMultiColumnSort) {
//                 const sortedPairs = values.map(v => {
//                     const [pVal, sVal] = v.split('|').map(s => s.trim().toLowerCase());
//                     return { primaryVal: pVal, secondaryVal: sVal };
//                 });

//                 const isMultiSorted = sortedPairs.every((curr, i, arr) => {
//                     if (i === 0) return true;
//                     const prev = arr[i - 1];
//                     if (prev.primaryVal < curr.primaryVal) return true;
//                     if (prev.primaryVal > curr.primaryVal) return false;
//                     return prev.secondaryVal <= curr.secondaryVal;
//                 });

//                 if (!isMultiSorted) {
//                     throw new Error(`Multi-column sort verification failed for columns: ${columnNames.join(' | ')}`);
//                 }
//             } else {
//                 const isSorted = values.every((val, i, arr) =>
//                     i === 0 || arr[i - 1].toLowerCase() <= val.toLowerCase()
//                 );

//                 if (!isSorted) {
//                     throw new Error(`Sort verification failed for column: ${columnNames[0]}`);
//                 }
//             }
//         }

//         console.log(`Verified ascending sort for column(s): ${step.TableColumnNames}`);

//     } catch (error) {
//         console.error(`Failed to verify ascending sort:`, error);
//         throw error;
//     }
// }
// export async function verifyDescendingSortUGrid(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.TableColumnNames) {
//             throw new Error('No column names provided for sorting verification');
//         }

//         const columnNames = step.TableColumnNames.split('|').map(c => c.trim());
//         const isMultiColumnSort = columnNames.length === 2;
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const tableLocator = await resolveElement(page, baseSelector);

//         const headers = await tableLocator.locator('u-grid-column-header').evaluateAll(rows =>
//             Array.from(rows).flatMap(row =>
//                 Array.from(row.querySelectorAll("u-grid-header-cell > div[class*='header-content-wrapper']")).map(cell =>
//                     cell.textContent?.trim() || ''
//                 )
//             )
//         );

//         const primaryColIndex = headers.findIndex(h => h.includes(columnNames[0]));
//         if (primaryColIndex === -1) {
//             throw new Error(`Column "${columnNames[0]}" not found`);
//         }

//         const secondaryColIndex = isMultiColumnSort
//             ? headers.findIndex(h => h.includes(columnNames[1]))
//             : -1;

//         if (isMultiColumnSort && secondaryColIndex === -1) {
//             throw new Error(`Column "${columnNames[1]}" not found`);
//         }

//         await page.waitForTimeout(300);

//         const headerCells = await tableLocator.locator('u-grid-header-cell').elementHandles();
//         const primaryHeader = headerCells[primaryColIndex];

//         const hasSortIndicator = await primaryHeader.evaluate((cell: Element) =>
//             !!cell.querySelector('[class*="sort-indicator"]')
//         );

//         if (!hasSortIndicator) {
//             throw new Error(`Column "${columnNames[0]}" does not support sorting`);
//         }

//         for (let i = 0; i < 3; i++) {
//             await primaryHeader.click();
//             const icon = await primaryHeader.$('[class*="sort-indicator"]');
//             const className = await icon?.getAttribute('class');
//             if (className?.includes('sort-desc')) break;
//         }

//         if (isMultiColumnSort) {
//             const secondaryHeader = headerCells[secondaryColIndex];
//             await page.keyboard.down('Control');
//             await secondaryHeader.click();
//             await page.keyboard.up('Control');
//         }

//         const ResObject: Record<string, string[]> = {};
//         const seenRowIds = new Set<string>();
//         const maxScrolls = 100;
//         let scrollAttempts = 0;

//         while (scrollAttempts < maxScrolls) {
//             let newRowFound = false;
//             const itemHandles = await tableLocator.locator('u-collection-item').elementHandles();

//             for (const item of itemHandles) {
//                 const rowId = await item.getAttribute('data-u-collection-element-id');
//                 const groupId = await item.getAttribute('data-u-collection-parent-id');

//                 if (!rowId || seenRowIds.has(rowId)) continue;

//                 seenRowIds.add(rowId);
//                 newRowFound = true;

//                 if (!groupId) continue;
//                 if (!ResObject[groupId]) ResObject[groupId] = [];

//                 const row = await item.$('u-grid-row');
//                 if (row) {
//                     const cells = await row.$$('u-grid-cell');
//                     const primaryVal = cells[primaryColIndex]
//                         ? (await cells[primaryColIndex].textContent())?.trim() || ''
//                         : '';
//                     const secondaryVal = isMultiColumnSort && cells[secondaryColIndex]
//                         ? (await cells[secondaryColIndex].textContent())?.trim() || ''
//                         : '';

//                     const value = isMultiColumnSort
//                         ? `${primaryVal} | ${secondaryVal}`
//                         : primaryVal;

//                     ResObject[groupId].push(value);
//                 }
//             }

//             if (itemHandles.length > 0) {
//                 const lastItem = itemHandles[itemHandles.length - 1];
//                 await lastItem.scrollIntoViewIfNeeded();
//                 await page.waitForTimeout(400);
//             }

//             if (!newRowFound) break;
//             scrollAttempts++;
//         }

//         for (const [groupId, values] of Object.entries(ResObject)) {
//             if (isMultiColumnSort) {
//                 const sortedPairs = values.map(v => {
//                     const [pVal, sVal] = v.split('|').map(s => s.trim().toLowerCase());
//                     return { primaryVal: pVal, secondaryVal: sVal };
//                 });

//                 const isMultiSorted = sortedPairs.every((curr, i, arr) => {
//                     if (i === 0) return true;
//                     const prev = arr[i - 1];
//                     if (prev.primaryVal > curr.primaryVal) return true;
//                     if (prev.primaryVal < curr.primaryVal) return false;
//                     return prev.secondaryVal >= curr.secondaryVal;
//                 });

//                 if (!isMultiSorted) {
//                     throw new Error(`Multi-column sort verification failed for columns: ${columnNames.join(' | ')}`);
//                 }
//             } else {
//                 const isSorted = values.every((val, i, arr) =>
//                     i === 0 || arr[i - 1].toLowerCase() >= val.toLowerCase()
//                 );

//                 if (!isSorted) {
//                     throw new Error(`Sort verification failed for column: ${columnNames[0]}`);
//                 }
//             }
//         }

//         console.log(`Verified descending sort for column(s): ${step.TableColumnNames}`);

//     } catch (error) {
//         console.error(`Failed to verify descending sort:`, error);
//         throw error;
//     }
// }
// export async function login(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No credentials provided for login`);
//         }
//         const values = step.Values.split('|').map(v => v.trim());
//         if (values.length < 2) {
//             throw new Error(`Invalid login format. Expected: username|password, Got: ${step.Values}`);
//         }
//         const username = getGlobalValueIfPrefixed(values[0]);
//         const password = getGlobalValueIfPrefixed(values[1]);
//         const finalUsername = String(username).trim();
//         const finalPassword = String(password).trim();

//         await setTextBox(page, { ...step, Page: 'pageLogin', Element: 'txt_Username', Values: finalUsername });
//         await setTextBox(page, { ...step, Page: 'pageLogin', Element: 'txt_Password', Values: finalPassword });
//         await clickElement(page, { ...step, Page: 'pageLogin', Element: 'btn_Login' });
//         await waitForRoller(page);

//         const errorAlert = page.getByRole('alertdialog');
//         if (await errorAlert.count() > 0) {
//             const alertText = await errorAlert.textContent();
//             if (alertText?.includes('Error: Invalid username or password')) {
//                 throw new Error(`Login failed: Invalid username or password`);
//             }
//         }
//         console.log('Login completed successfully');
//     } catch (error) {
//         console.error('Login failed:', error);
//         throw error;
//     }
// }
// export async function logout(page: Page, step: TestStep): Promise<void> {
//     try {
//         await waitForRoller(page);
//         await clickElement(page, { ...step, Page: 'pageOverview', Element: 'btn_UserInformation' });
//         await waitForRoller(page);
//         await waitForElement(page, { ...step, Page: 'pageOverview', Element: 'btn_LogOff' });
//         await waitForRoller(page);
//         await clickElement(page, { ...step, Page: 'pageOverview', Element: 'btn_LogOff' });
//         await waitForRoller(page);
//         await page.waitForLoadState('networkidle');
//         console.log('Logout completed successfully');
//     } catch (error) {
//         console.error('Failed to logout:', error);
//         throw error;
//     }
// }

// export async function selectRecordInUGridTable(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No values provided for table row selection`);
//         }

//         if (!step.TableColumnNames) {
//             throw new Error(`No table column names provided for row selection`);
//         }

//         await waitForRoller(page);

//         const tableIdentifier = `${step.Page}.${step.Element}`;
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const tableLocator = await resolveElement(page, baseSelector);

//         // Parse expected values
//         const valuesString = String(step.Values);
//         const tableColumnNamesString = String(step.TableColumnNames);
//         const isMultiColumn = tableColumnNamesString.includes('|');
//         const reqdColumns = isMultiColumn
//             ? tableColumnNamesString.split('|').map(col => col.trim())
//             : [tableColumnNamesString.trim()];
//         const expectedRefs = isMultiColumn
//             ? valuesString.split('|').map(val => val.trim())
//             : [valuesString.trim()];
//         const expectedValues = expectedRefs.map(ref => getGlobalValueIfPrefixed(ref));

//         switch (tableIdentifier) {
//             case 'pagePatientHome.tbl_PatientSearchList':
//                 await selectPatientSearchListRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//             // Add this case to the switch statement in selectRecordInUGridTable function
//             case 'pagePatientHome.tbl_CaseRecordList':
//                 await selectCaseRecordListRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//             // Add this case to selectRecordInUGridTable function
//             case 'pageReconciliation.tbl_ReconciliationImportTable':
//                 await selectReconciliationImportTableRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;

//             // Add more cases here for other table types
//             default:
//                 // Fallback to generic selection logic
//                 await selectGenericUGridRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//         }

//         await waitForRoller(page);
//         console.log(`✓ Successfully selected row in table ${step.Page}.${step.Element}`);

//     } catch (error) {
//         console.error(`Failed to select record in table ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }
// export async function verifyRecordInUGridTable(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No values provided for table verification`);
//         }

//         if (!step.TableColumnNames) {
//             throw new Error(`No table column names provided for verification`);
//         }

//         const condition = (step.Condition || 'in').toLowerCase();
//         if (condition !== 'in' && condition !== 'notin') {
//             throw new Error(`Invalid condition: "${step.Condition}". Expected: 'In' or 'NotIn'`);
//         }

//         await waitForRoller(page);

//         const tableIdentifier = `${step.Page}.${step.Element}`;
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const tableLocator = await resolveElement(page, baseSelector);

//         // Parse expected values
//         const valuesString = String(step.Values);
//         const tableColumnNamesString = String(step.TableColumnNames);
//         const isMultiColumn = tableColumnNamesString.includes('|');
//         const reqdColumns = isMultiColumn
//             ? tableColumnNamesString.split('|').map(col => col.trim())
//             : [tableColumnNamesString.trim()];
//         const expectedRefs = isMultiColumn
//             ? valuesString.split('|').map(val => val.trim())
//             : [valuesString.trim()];
//         const expectedValues = expectedRefs.map(ref => getGlobalValueIfPrefixed(ref));

//         let matchingRowsCount = 0;

//         switch (tableIdentifier) {
//             case 'pagePatientHome.tbl_PatientSearchList':
//                 matchingRowsCount = await verifyPatientSearchListRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;

//             // Add this case to the switch statement in verifyRecordInUGridTable function
//             case 'pagePatientHome.tbl_CaseRecordList':
//                 matchingRowsCount = await verifyCaseRecordListRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//             // Add this case to verifyRecordInUGridTable function
//             case 'pageReconciliation.tbl_ReconciliationImportTable':
//                 matchingRowsCount = await verifyReconciliationImportTableRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//             case 'pagePAS_RTT.tbl_RTTCases':
//                 matchingRowsCount = await verifyRTTCasesRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//             case 'pageMHScreen.tbl_MHSectionGrid':
//                 matchingRowsCount = await verifyMHSectionGridRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;

//             // Add more cases here for other table types
//             default:
//                 // Fallback to generic verification logic
//                 matchingRowsCount = await verifyGenericUGridRecord(page, tableLocator, reqdColumns, expectedValues);
//                 break;
//         }

//         // Verify based on condition
//         if (condition === 'in') {
//             if (matchingRowsCount === 0) {
//                 const criteriaStr = reqdColumns.map((col, i) => `${col}: "${expectedValues[i]}"`).join(', ');
//                 throw new Error(`No matching rows found in table for criteria: ${criteriaStr}`);
//             }
//             console.log(`✓ Found ${matchingRowsCount} matching row(s) in table ${step.Page}.${step.Element}`);
//         } else if (condition === 'notin') {
//             if (matchingRowsCount > 0) {
//                 const criteriaStr = reqdColumns.map((col, i) => `${col}: "${expectedValues[i]}"`).join(', ');
//                 throw new Error(`Found ${matchingRowsCount} matching row(s) when expecting none for criteria: ${criteriaStr}`);
//             }
//             console.log(`✓ Verified no matching rows in table ${step.Page}.${step.Element}`);
//         }

//     } catch (error) {
//         console.error(`Failed to verify record in table ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }
// // Helper function for selecting records in Patient Search List
// async function selectPatientSearchListRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<void> {
//     const headers = ['Patient', 'Sex', 'Date of birth', 'Address', 'Action'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim().toLowerCase();
//             let cellValue = '';

//             switch (colIdx) {
//                 case 0: // Patient column
//                     const patientCell = gridRow.locator('.center-container u-grid-cell').first();
//                     // Extract PID
//                     const pidElement = patientCell.locator('[data-cy="patient-search-list-pid-value"]');
//                     if (await pidElement.count() > 0) {
//                         const pidText = await pidElement.textContent();
//                         cellValue = pidText?.trim() || '';
//                     }
//                     // Also check patient name if PID doesn't match
//                     if (!cellValue.toLowerCase().includes(expectedValue)) {
//                         const nameElement = patientCell.locator('[data-cy="patient-search-list-grid-name-child-div"]');
//                         if (await nameElement.count() > 0) {
//                             const nameText = await nameElement.textContent();
//                             cellValue = nameText?.trim() || '';
//                         }
//                     }
//                     break;

//                 case 1: // Sex column
//                     const sexCell = gridRow.locator('.center-container u-grid-cell').nth(1);
//                     const sexIcon = sexCell.locator('u-icon');
//                     if (await sexIcon.count() > 0) {
//                         const iconClass = await sexIcon.getAttribute('class');
//                         cellValue = iconClass?.includes('male') ? 'male' : 'female';
//                     }
//                     break;

//                 case 2: // Date of birth column
//                     const dobCell = gridRow.locator('.center-container u-grid-cell').nth(2);
//                     cellValue = (await dobCell.textContent())?.trim() || '';
//                     break;

//                 case 3: // Address column
//                     const addressCell = gridRow.locator('.center-container u-grid-cell').nth(3);
//                     cellValue = (await addressCell.textContent())?.trim() || '';
//                     break;
//             }

//             if (!cellValue.toLowerCase().includes(expectedValue)) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             // Select the row using radio button
//             const radioButton = gridRow.locator('.left-pin-container u-radio');
//             if (await radioButton.count() > 0) {
//                 await radioButton.click();
//                 return;
//             }

//             // Fallback: try action button
//             const actionButton = gridRow.locator('.right-pin-container button[aria-label="Open patient record"]');
//             if (await actionButton.count() > 0) {
//                 await actionButton.click();
//                 return;
//             }

//             throw new Error('No selection mechanism found for the matching row');
//         }
//     }

//     const criteriaStr = reqdColumns.map((col, i) => `${col}: "${expectedValues[i]}"`).join(', ');
//     throw new Error(`No matching row found for selection criteria: ${criteriaStr}`);
// }
// // Helper function for verifying records in Patient Search List
// async function verifyPatientSearchListRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<number> {
//     const headers = ['Patient', 'Sex', 'Date of birth', 'Address', 'Action'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();
//     let matchingRowsCount = 0;

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim().toLowerCase();
//             let cellValue = '';

//             switch (colIdx) {
//                 case 0: // Patient column
//                     const patientCell = gridRow.locator('.center-container u-grid-cell').first();
//                     // Extract PID
//                     const pidElement = patientCell.locator('[data-cy="patient-search-list-pid-value"]');
//                     if (await pidElement.count() > 0) {
//                         const pidText = await pidElement.textContent();
//                         cellValue = pidText?.trim() || '';
//                     }
//                     // Also check patient name if PID doesn't match
//                     if (!cellValue.toLowerCase().includes(expectedValue)) {
//                         const nameElement = patientCell.locator('[data-cy="patient-search-list-grid-name-child-div"]');
//                         if (await nameElement.count() > 0) {
//                             const nameText = await nameElement.textContent();
//                             cellValue = nameText?.trim() || '';
//                         }
//                     }
//                     break;

//                 case 1: // Sex column
//                     const sexCell = gridRow.locator('.center-container u-grid-cell').nth(1);
//                     const sexIcon = sexCell.locator('u-icon');
//                     if (await sexIcon.count() > 0) {
//                         const iconClass = await sexIcon.getAttribute('class');
//                         cellValue = iconClass?.includes('male') ? 'male' : 'female';
//                     }
//                     break;

//                 case 2: // Date of birth column
//                     const dobCell = gridRow.locator('.center-container u-grid-cell').nth(2);
//                     cellValue = (await dobCell.textContent())?.trim() || '';
//                     break;

//                 case 3: // Address column
//                     const addressCell = gridRow.locator('.center-container u-grid-cell').nth(3);
//                     cellValue = (await addressCell.textContent())?.trim() || '';
//                     break;
//             }

//             if (!cellValue.toLowerCase().includes(expectedValue)) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             matchingRowsCount++;
//         }
//     }

//     return matchingRowsCount;
// }
// // Generic fallback helper for selecting records in other UGrid tables
// async function selectGenericUGridRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<void> {
//     // Extract headers using the existing logic
//     const headers = await tableLocator.locator('u-grid-column-header').evaluateAll(rows => {
//         return Array.from(rows).flatMap(row =>
//             Array.from(row.querySelectorAll("u-grid-header-cell > div[class*='header-content-wrapper']")).map(cell =>
//                 cell.textContent ? cell.textContent.trim() : ''
//             )
//         );
//     });

//     if (headers.length === 0) {
//         throw new Error("No table headers found");
//     }

//     // Get indices of required columns
//     const columnIndices = reqdColumns.map(col => headers.indexOf(col));
//     columnIndices.forEach((idx, i) => {
//         if (idx === -1) {
//             throw new Error(`Column "${reqdColumns[i]}" not found in table headers. Available headers: ${headers.join(', ')}`);
//         }
//     });

//     // Use existing generic selection logic
//     const rows = tableLocator.locator('u-grid-row');
//     const rowCount = await rows.count();

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const cells = await row.locator('u-grid-cell').all();

//         let isMatch = true;
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             if (colIdx >= 0 && colIdx < cells.length) {
//                 const cellValue = (await cells[colIdx].textContent() || '').trim();
//                 const expectedValue = String(expectedValues[i]).trim();

//                 if (!cellValue.toLowerCase().includes(expectedValue.toLowerCase())) {
//                     isMatch = false;
//                     break;
//                 }
//             }
//         }

//         if (isMatch) {
//             // Try different selection methods
//             const checkbox = row.locator('u-checkbox').first();
//             const radio = row.locator('u-radio').first();

//             if (await checkbox.count() > 0) {
//                 await checkbox.click();
//             } else if (await radio.count() > 0) {
//                 await radio.click();
//             } else {
//                 await row.click();
//             }
//             return;
//         }
//     }

//     const criteriaStr = reqdColumns.map((col, i) => `${col}: "${expectedValues[i]}"`).join(', ');
//     throw new Error(`No matching row found for selection criteria: ${criteriaStr}`);
// }
// // Generic fallback helper for verifying records in other UGrid tables
// async function verifyGenericUGridRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<number> {
//     // Extract headers using the existing logic
//     const headers = await tableLocator.locator('u-grid-column-header').evaluateAll(rows => {
//         return Array.from(rows).flatMap(row =>
//             Array.from(row.querySelectorAll("u-grid-header-cell > div[class*='header-content-wrapper']")).map(cell =>
//                 cell.textContent ? cell.textContent.trim() : ''
//             )
//         );
//     });

//     if (headers.length === 0) {
//         throw new Error("No table headers found");
//     }

//     // Extract all row data
//     const allRowsData = await tableLocator.locator("u-grid-row").evaluateAll(rows => {
//         return Array.from(rows).map(row =>
//             Array.from(row.querySelectorAll('u-grid-cell')).map(cell =>
//                 cell.textContent ? cell.textContent.trim() : ''
//             )
//         );
//     });

//     // Get indices of required columns
//     const columnIndices = reqdColumns.map(col => headers.indexOf(col));
//     columnIndices.forEach((idx, i) => {
//         if (idx === -1) {
//             throw new Error(`Column "${reqdColumns[i]}" not found in table headers. Available headers: ${headers.join(', ')}`);
//         }
//     });

//     // Find matching rows
//     const matchingRows = allRowsData.filter(row => {
//         return columnIndices.every((colIdx, i) =>
//             colIdx !== -1 && row[colIdx] === String(expectedValues[i])
//         );
//     });

//     return matchingRows.length;
// }
// // Helper function for selecting records in Case Record List
// async function selectCaseRecordListRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<void> {
//     const headers = ['', 'Case number', '', 'Registration/Admission date', 'Discharge date', 'Department', 'Ward', 'Treating clinician', 'Action'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.filter(h => h).join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim().toLowerCase();
//             let cellValue = '';

//             // Get all cells from center container
//             const centerCells = gridRow.locator('.center-container u-grid-cell');

//             switch (colIdx) {
//                 case 0: // First column (icon column)
//                     const iconCell = centerCells.nth(0);
//                     const icon = iconCell.locator('u-icon');
//                     if (await icon.count() > 0) {
//                         const iconClass = await icon.getAttribute('class');
//                         if (iconClass?.includes('inpatient')) {
//                             cellValue = 'inpatient';
//                         } else if (iconClass?.includes('outpatient')) {
//                             cellValue = 'outpatient';
//                         }
//                     }
//                     break;

//                 case 1: // Case number column
//                     const caseCell = centerCells.nth(1);
//                     // Check for regular case number
//                     let caseText = await caseCell.textContent();
//                     if (caseText?.trim()) {
//                         cellValue = caseText.trim();
//                     } else {
//                         // Check for outpatient certificate structure
//                         const certificateDiv = caseCell.locator('.outpatient-certificate');
//                         if (await certificateDiv.count() > 0) {
//                             const spans = await certificateDiv.locator('span').allTextContents();
//                             cellValue = spans.filter(s => s && s !== '-').join(' - ');
//                         }
//                     }
//                     break;

//                 case 2: // Third column (status icon)
//                     const statusCell = centerCells.nth(2);
//                     const statusIcon = statusCell.locator('u-icon');
//                     if (await statusIcon.count() > 0) {
//                         const statusClass = await statusIcon.getAttribute('class');
//                         if (statusClass?.includes('start_circle')) {
//                             cellValue = 'active';
//                         }
//                     }
//                     break;

//                 case 3: // Registration/Admission date
//                     const admissionCell = centerCells.nth(3);
//                     cellValue = (await admissionCell.textContent())?.trim() || '';
//                     break;

//                 case 4: // Discharge date
//                     const dischargeCell = centerCells.nth(4);
//                     cellValue = (await dischargeCell.textContent())?.trim() || '';
//                     break;

//                 case 5: // Department
//                     const deptCell = centerCells.nth(5);
//                     cellValue = (await deptCell.textContent())?.trim() || '';
//                     break;

//                 case 6: // Ward
//                     const wardCell = centerCells.nth(6);
//                     cellValue = (await wardCell.textContent())?.trim() || '';
//                     break;

//                 case 7: // Treating clinician
//                     const clinicianCell = centerCells.nth(7);
//                     cellValue = (await clinicianCell.textContent())?.trim() || '';
//                     break;
//             }

//             console.log(`Row ${rowIndex}, Column "${reqdColumns[i]}" (index ${colIdx}): "${cellValue}" vs expected "${expectedValue}"`);

//             if (!cellValue.toLowerCase().includes(expectedValue)) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             console.log(`Match found at row ${rowIndex}`);

//             // Try to click the action button in right-pin container
//             const actionButton = gridRow.locator('.right-pin-container button[aria-label="Open case record"]');
//             if (await actionButton.count() > 0) {
//                 await actionButton.click();
//                 return;
//             }

//             // Fallback: try folder icon
//             const folderIcon = gridRow.locator('.right-pin-container u-icon.icon_fluorine_folder_open');
//             if (await folderIcon.count() > 0) {
//                 await folderIcon.click();
//                 return;
//             }

//             // Final fallback: click the row
//             await gridRow.click();
//             return;
//         }
//     }

//     const criteriaStr = reqdColumns.map((col, i) => `${col}: "${expectedValues[i]}"`).join(', ');
//     throw new Error(`No matching row found for selection criteria: ${criteriaStr}`);
// }
// // Helper function for verifying records in Case Record List
// async function verifyCaseRecordListRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<number> {
//     const headers = ['', 'Case number', '', 'Registration/Admission date', 'Discharge date', 'Department', 'Ward', 'Treating clinician', 'Action'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.filter(h => h).join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();
//     let matchingRowsCount = 0;

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim().toLowerCase();
//             let cellValue = '';

//             // Get all cells from center container
//             const centerCells = gridRow.locator('.center-container u-grid-cell');

//             switch (colIdx) {
//                 case 0: // First column (icon column)
//                     const iconCell = centerCells.nth(0);
//                     const icon = iconCell.locator('u-icon');
//                     if (await icon.count() > 0) {
//                         const iconClass = await icon.getAttribute('class');
//                         if (iconClass?.includes('inpatient')) {
//                             cellValue = 'inpatient';
//                         } else if (iconClass?.includes('outpatient')) {
//                             cellValue = 'outpatient';
//                         }
//                     }
//                     break;

//                 case 1: // Case number column
//                     const caseCell = centerCells.nth(1);
//                     // Check for regular case number
//                     let caseText = await caseCell.textContent();
//                     if (caseText?.trim()) {
//                         cellValue = caseText.trim();
//                     } else {
//                         // Check for outpatient certificate structure
//                         const certificateDiv = caseCell.locator('.outpatient-certificate');
//                         if (await certificateDiv.count() > 0) {
//                             const spans = await certificateDiv.locator('span').allTextContents();
//                             cellValue = spans.filter(s => s && s !== '-').join(' - ');
//                         }
//                     }
//                     break;

//                 case 2: // Third column (status icon)
//                     const statusCell = centerCells.nth(2);
//                     const statusIcon = statusCell.locator('u-icon');
//                     if (await statusIcon.count() > 0) {
//                         const statusClass = await statusIcon.getAttribute('class');
//                         if (statusClass?.includes('start_circle')) {
//                             cellValue = 'active';
//                         }
//                     }
//                     break;

//                 case 3: // Registration/Admission date
//                     const admissionCell = centerCells.nth(3);
//                     cellValue = (await admissionCell.textContent())?.trim() || '';
//                     break;

//                 case 4: // Discharge date
//                     const dischargeCell = centerCells.nth(4);
//                     cellValue = (await dischargeCell.textContent())?.trim() || '';
//                     break;

//                 case 5: // Department
//                     const deptCell = centerCells.nth(5);
//                     cellValue = (await deptCell.textContent())?.trim() || '';
//                     break;

//                 case 6: // Ward
//                     const wardCell = centerCells.nth(6);
//                     cellValue = (await wardCell.textContent())?.trim() || '';
//                     break;

//                 case 7: // Treating clinician
//                     const clinicianCell = centerCells.nth(7);
//                     cellValue = (await clinicianCell.textContent())?.trim() || '';
//                     break;
//             }

//             console.log(`Row ${rowIndex}, Column "${reqdColumns[i]}" (index ${colIdx}): "${cellValue}" vs expected "${expectedValue}"`);

//             if (!cellValue.toLowerCase().includes(expectedValue)) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             matchingRowsCount++;
//         }
//     }

//     return matchingRowsCount;
// }
// // Helper function for selecting records in Reconciliation Import Table
// async function selectReconciliationImportTableRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<void> {
//     const headers = ['Status', 'Medication name', 'Route', 'Dosage', 'Comment', 'Substance', 'Treatment start', 'Duration', 'Medical case', 'Prescription type'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim().toLowerCase();
//             let cellValue = '';

//             // Get cells from left-pin container (skip first 2 which are UI controls)
//             const leftPinCells = await gridRow.locator('.left-pin-container u-grid-cell').all();
//             const dataLeftPinCells = leftPinCells.slice(2); // Skip collapse and checkbox

//             // Get cells from center container
//             const centerCells = await gridRow.locator('.center-container u-grid-cell').all();

//             // Combine cells
//             const allCells = [...dataLeftPinCells, ...centerCells];

//             if (colIdx < allCells.length) {
//                 const cell = allCells[colIdx];

//                 switch (colIdx) {
//                     case 0: // Status
//                         const statusBadge = cell.locator('.medication-statement-grid__item u-badge').first();
//                         if (await statusBadge.count() > 0) {
//                             cellValue = (await statusBadge.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 1: // Medication name
//                         const medicationSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await medicationSpan.count() > 0) {
//                             cellValue = (await medicationSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 2: // Route
//                         const routeBadge = cell.locator('.medication-statement-grid__item u-badge').first();
//                         if (await routeBadge.count() > 0) {
//                             cellValue = (await routeBadge.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 3: // Dosage
//                         const dosageSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await dosageSpan.count() > 0) {
//                             cellValue = (await dosageSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 4: // Comment
//                         // Comment column typically has an icon, check for tooltip or text
//                         const commentIcon = cell.locator('u-icon.icon_fluorine_comment').first();
//                         if (await commentIcon.count() > 0) {
//                             // If there's a comment icon, we assume there's a comment
//                             cellValue = 'comment';
//                         }
//                         break;

//                     // Update the substance case in both selectReconciliationImportTableRecord and verifyReconciliationImportTableRecord methods:

//                     case 5: // Substance
//                         const substanceDiv = cell.locator('.medication-statement-grid__substance-item').first();
//                         if (await substanceDiv.count() > 0) {
//                             // Get both substance name and code
//                             const substanceSpans = await substanceDiv.locator('span.u-highlight-pipe').allTextContents();
//                             if (substanceSpans.length >= 2) {
//                                 // Combine substance name and code: "substanceName substanceCode"
//                                 cellValue = `${substanceSpans[0].trim()} ${substanceSpans[1].trim()}`;
//                             } else if (substanceSpans.length === 1) {
//                                 cellValue = substanceSpans[0].trim();
//                             }
//                         }
//                         break;


//                     case 6: // Treatment start
//                         const startSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await startSpan.count() > 0) {
//                             cellValue = (await startSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 7: // Duration
//                         const durationSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await durationSpan.count() > 0) {
//                             cellValue = (await durationSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 8: // Medical case
//                         const caseSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await caseSpan.count() > 0) {
//                             cellValue = (await caseSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 9: // Prescription type
//                         const prescriptionSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await prescriptionSpan.count() > 0) {
//                             cellValue = (await prescriptionSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     default:
//                         // Fallback to general text content
//                         cellValue = (await cell.textContent())?.trim() || '';
//                         break;
//                 }
//             }

//             console.log(`Row ${rowIndex}, Column "${reqdColumns[i]}" (index ${colIdx}): "${cellValue}" vs expected "${expectedValue}"`);

//             if (!cellValue.toLowerCase().includes(expectedValue)) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             console.log(`Match found at row ${rowIndex}`);

//             // Try to select using checkbox
//             const checkbox = gridRow.locator('.left-pin-container u-checkbox').first();
//             if (await checkbox.count() > 0) {
//                 await checkbox.click();
//                 return;
//             }

//             // Fallback: click the row
//             await gridRow.click();
//             return;
//         }
//     }

//     const criteriaStr = reqdColumns.map((col, i) => `${col}: "${expectedValues[i]}"`).join(', ');
//     throw new Error(`No matching row found for selection criteria: ${criteriaStr}`);
// }
// // Helper function for verifying records in Reconciliation Import Table
// async function verifyReconciliationImportTableRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<number> {
//     const headers = ['Status', 'Medication name', 'Route', 'Dosage', 'Comment', 'Substance', 'Treatment start', 'Duration', 'Medical case', 'Prescription type'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()));
//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();
//     let matchingRowsCount = 0;

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim().toLowerCase();
//             let cellValue = '';

//             // Get cells from left-pin container (skip first 2 which are UI controls)
//             const leftPinCells = await gridRow.locator('.left-pin-container u-grid-cell').all();
//             const dataLeftPinCells = leftPinCells.slice(2); // Skip collapse and checkbox

//             // Get cells from center container
//             const centerCells = await gridRow.locator('.center-container u-grid-cell').all();

//             // Combine cells
//             const allCells = [...dataLeftPinCells, ...centerCells];

//             if (colIdx < allCells.length) {
//                 const cell = allCells[colIdx];

//                 switch (colIdx) {
//                     case 0: // Status
//                         const statusBadge = cell.locator('.medication-statement-grid__item u-badge').first();
//                         if (await statusBadge.count() > 0) {
//                             cellValue = (await statusBadge.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 1: // Medication name
//                         const medicationSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await medicationSpan.count() > 0) {
//                             cellValue = (await medicationSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 2: // Route
//                         const routeBadge = cell.locator('.medication-statement-grid__item u-badge').first();
//                         if (await routeBadge.count() > 0) {
//                             cellValue = (await routeBadge.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 3: // Dosage
//                         const dosageSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await dosageSpan.count() > 0) {
//                             cellValue = (await dosageSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 4: // Comment
//                         // Comment column typically has an icon, check for tooltip or text
//                         const commentIcon = cell.locator('u-icon.icon_fluorine_comment').first();
//                         if (await commentIcon.count() > 0) {
//                             // If there's a comment icon, we assume there's a comment
//                             cellValue = 'comment';
//                         }
//                         break;

//                     // Update the substance case in both selectReconciliationImportTableRecord and verifyReconciliationImportTableRecord methods:

//                     case 5: // Substance
//                         const substanceDiv = cell.locator('.medication-statement-grid__substance-item').first();
//                         if (await substanceDiv.count() > 0) {
//                             // Get both substance name and code
//                             const substanceSpans = await substanceDiv.locator('span.u-highlight-pipe').allTextContents();
//                             if (substanceSpans.length >= 2) {
//                                 // Combine substance name and code: "substanceName substanceCode"
//                                 cellValue = `${substanceSpans[0].trim()} ${substanceSpans[1].trim()}`;
//                             } else if (substanceSpans.length === 1) {
//                                 cellValue = substanceSpans[0].trim();
//                             }
//                         }
//                         break;


//                     case 6: // Treatment start
//                         const startSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await startSpan.count() > 0) {
//                             cellValue = (await startSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 7: // Duration
//                         const durationSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await durationSpan.count() > 0) {
//                             cellValue = (await durationSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 8: // Medical case
//                         const caseSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await caseSpan.count() > 0) {
//                             cellValue = (await caseSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     case 9: // Prescription type
//                         const prescriptionSpan = cell.locator('.medication-statement-grid__item span.u-highlight-pipe').first();
//                         if (await prescriptionSpan.count() > 0) {
//                             cellValue = (await prescriptionSpan.textContent())?.trim() || '';
//                         }
//                         break;

//                     default:
//                         // Fallback to general text content
//                         cellValue = (await cell.textContent())?.trim() || '';
//                         break;
//                 }
//             }

//             console.log(`Row ${rowIndex}, Column "${reqdColumns[i]}" (index ${colIdx}): "${cellValue}" vs expected "${expectedValue}"`);

//             if (!cellValue.toLowerCase().includes(expectedValue)) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             matchingRowsCount++;
//         }
//     }

//     return matchingRowsCount;
// }
// // Helper function for verifying records in RTT Cases table
// async function verifyRTTCasesRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<number> {
//     const headers = ['Pathway ID', 'Start date', 'End date', 'Breach date', 'Case number', 'Intended status', 'Status', 'Action'];

//     // FIXED: More precise column matching to avoid "Status" matching "Intended status"
//     const columnIndices = reqdColumns.map(col => {
//         const colLower = col.toLowerCase().trim();
//         let index = -1;

//         // Exact match first
//         index = headers.findIndex(h => h.toLowerCase().trim() === colLower);

//         // If no exact match, try contains but with special handling for "status"
//         if (index === -1) {
//             if (colLower === 'status') {
//                 // For "status", find the one that is exactly "Status", not "Intended status"
//                 index = headers.findIndex(h => h.toLowerCase().trim() === 'status');
//             } else {
//                 // For other columns, use contains logic
//                 index = headers.findIndex(h => h.toLowerCase().includes(colLower));
//             }
//         }

//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();
//     let matchingRowsCount = 0;

//     console.log(`Found ${rowCount} RTT Cases rows to verify`);

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim();
//             let cellValue = '';

//             const centerCells = gridRow.locator('.center-container u-grid-cell');
//             const cellCount = await centerCells.count();

//             if (colIdx === 7) { // Action column
//                 const actionCell = gridRow.locator('.right-pin-container u-grid-cell');
//                 const editButton = actionCell.locator('button[aria-label="Edit"]');
//                 const deleteButton = actionCell.locator('button[aria-label="Delete"]');

//                 if (await editButton.count() > 0 && await deleteButton.count() > 0) {
//                     cellValue = 'edit delete';
//                 }
//             } else if (colIdx < cellCount) {
//                 // For all other columns, get from center container
//                 cellValue = (await centerCells.nth(colIdx).textContent())?.trim() || '';
//             } else {
//                 console.log(`Column index ${colIdx} is out of range for ${cellCount} cells`);
//                 cellValue = '';
//             }

//             console.log(`Row ${rowIndex + 1}, Column "${reqdColumns[i]}" (index ${colIdx}): "${cellValue}" vs expected "${expectedValue}"`);

//             // Handle empty values - if expected is empty and actual is empty, consider it a match
//             if (expectedValue === '' && cellValue === '') {
//                 continue;
//             }

//             // Case-insensitive comparison
//             if (expectedValue !== '' && !cellValue.toLowerCase().includes(expectedValue.toLowerCase())) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             matchingRowsCount++;
//             console.log(`Match found at row ${rowIndex + 1}`);
//         }
//     }

//     console.log(`Total matching RTT Cases records: ${matchingRowsCount}`);
//     return matchingRowsCount;
// }
// // Helper function for verifying records in MH Section Grid
// async function verifyMHSectionGridRecord(
//     page: Page,
//     tableLocator: Locator,
//     reqdColumns: string[],
//     expectedValues: any[]
// ): Promise<number> {
//     const headers = ['Section Name', 'Start date/time', 'Expiry date/time', 'Planned end date/time', 'Status', 'Legal status', 'Actual end date/time', 'Mental categories', 'Action'];

//     // Validate columns exist
//     const columnIndices = reqdColumns.map(col => {
//         const colLower = col.toLowerCase().trim();
//         let index = -1;

//         // Exact match first
//         index = headers.findIndex(h => h.toLowerCase().trim() === colLower);

//         // If no exact match, try contains logic
//         if (index === -1) {
//             index = headers.findIndex(h => h.toLowerCase().includes(colLower));
//         }

//         if (index === -1) {
//             throw new Error(`Column "${col}" not found. Available headers: ${headers.join(', ')}`);
//         }
//         return index;
//     });

//     // Get all rows
//     const rows = tableLocator.locator('u-collection-item');
//     const rowCount = await rows.count();
//     let matchingRowsCount = 0;

//     console.log(`Found ${rowCount} MH Section Grid rows to verify`);

//     for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
//         const row = rows.nth(rowIndex);
//         const gridRow = row.locator('u-grid-row');

//         let isMatch = true;

//         // Check each required column
//         for (let i = 0; i < columnIndices.length; i++) {
//             const colIdx = columnIndices[i];
//             const expectedValue = String(expectedValues[i]).trim();
//             let cellValue = '';

//             // Get all cells from center container
//             const centerCells = gridRow.locator('.center-container u-grid-cell');

//             switch (colIdx) {
//                 case 0: // Section Name
//                     const sectionCell = centerCells.nth(0);
//                     const sectionSpan = sectionCell.locator('span');
//                     if (await sectionSpan.count() > 0) {
//                         cellValue = (await sectionSpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await sectionCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 1: // Start date/time
//                     const startDateCell = centerCells.nth(1);
//                     const startSpan = startDateCell.locator('span');
//                     if (await startSpan.count() > 0) {
//                         cellValue = (await startSpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await startDateCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 2: // Expiry date/time
//                     const expiryDateCell = centerCells.nth(2);
//                     const expirySpan = expiryDateCell.locator('span');
//                     if (await expirySpan.count() > 0) {
//                         cellValue = (await expirySpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await expiryDateCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 3: // Planned end date/time
//                     const plannedEndCell = centerCells.nth(3);
//                     const plannedSpan = plannedEndCell.locator('span');
//                     if (await plannedSpan.count() > 0) {
//                         cellValue = (await plannedSpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await plannedEndCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 4: // Status
//                     const statusCell = centerCells.nth(4);
//                     const statusBadge = statusCell.locator('u-badge .badge-content');
//                     if (await statusBadge.count() > 0) {
//                         cellValue = (await statusBadge.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await statusCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 5: // Legal status
//                     const legalStatusCell = centerCells.nth(5);
//                     const legalSpan = legalStatusCell.locator('span');
//                     if (await legalSpan.count() > 0) {
//                         cellValue = (await legalSpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await legalStatusCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 6: // Actual end date/time
//                     const actualEndCell = centerCells.nth(6);
//                     const actualSpan = actualEndCell.locator('span');
//                     if (await actualSpan.count() > 0) {
//                         cellValue = (await actualSpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await actualEndCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 7: // Mental categories
//                     const mentalCatCell = centerCells.nth(7);
//                     const mentalSpan = mentalCatCell.locator('span');
//                     if (await mentalSpan.count() > 0) {
//                         cellValue = (await mentalSpan.textContent())?.trim() || '';
//                     } else {
//                         cellValue = (await mentalCatCell.textContent())?.trim() || '';
//                     }
//                     break;

//                 case 8: // Action column
//                     const actionCell = gridRow.locator('.right-pin-container u-grid-cell');
//                     const editButton = actionCell.locator('button[aria-label="Edit"]');
//                     if (await editButton.count() > 0) {
//                         cellValue = 'edit';
//                     }
//                     break;
//             }

//             console.log(`Row ${rowIndex + 1}, Column "${reqdColumns[i]}" (index ${colIdx}): "${cellValue}" vs expected "${expectedValue}"`);

//             // Handle empty values - if expected is empty and actual is empty, consider it a match
//             if (expectedValue === '' && cellValue === '') {
//                 continue;
//             }

//             // Case-insensitive comparison
//             if (expectedValue !== '' && !cellValue.toLowerCase().includes(expectedValue.toLowerCase())) {
//                 isMatch = false;
//                 break;
//             }
//         }

//         if (isMatch) {
//             matchingRowsCount++;
//             console.log(`Match found at row ${rowIndex + 1}`);
//         }
//     }

//     console.log(`Total matching MH Section Grid records: ${matchingRowsCount}`);
//     return matchingRowsCount;
// }
// // export async function getTextAndStorePASID(page: Page, step: TestStep): Promise<{ text: string, pasid?: string }> {
// //   try {
// //     const baseSelector = getLocator(step.Page, step.Element, step);
// //     const locator = await resolveElement(page, baseSelector);

// //     // Ensure element is visible
// //     await locator.waitFor({ state: 'visible', timeout: 5000 });

// //     // Get the tag name
// //     const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
// //     let text = '';

// //     if (tagName === 'input' || tagName === 'textarea') {
// //       // For input elements, try to get value first, then placeholder
// //       const value = await locator.inputValue();
// //       if (value) {
// //         text = value;
// //       } else {
// //         // Get placeholder if value is empty
// //         text = await locator.getAttribute('placeholder') || '';
// //       }
// //     } else {
// //       // For other elements, get text content
// //       text = await locator.textContent() || '';
// //       text = text.trim();
// //     }

// //     console.log(`Retrieved text from ${step.Page}.${step.Element}: "${text}"`);

// //     // Extract PASID using regex
// //     let pasid: string | undefined = undefined;
// //     const pasidMatch = text.match(/PatientID:\s*(PASID-\d+)/);
// //     if (pasidMatch && pasidMatch[1]) {
// //       pasid = pasidMatch[1];
// //       // Store PASID in global variable if Values is provided and starts with _PASID
// //       if (step.Values && step.Values.startsWith('_')) {
// //         executionContext.setGlobalVariable(step.Values, pasid);
// //         console.log(`Stored PASID in global variable: ${step.Values} = "${pasid}"`);
// //       }
// //       console.log(`Extracted PASID: ${pasid}`);
// //     } else {
// //       console.warn('PASID not found in the retrieved text.');
// //     }

// //     // Optionally, also store the full text if needed
// //     if (step.Values && step.Values.startsWith('_')) {
// //       executionContext.setGlobalVariable(step.Values + '_FULLTEXT', text);
// //       console.log(`Stored full text in global variable: ${step.Values}_FULLTEXT = "${text}"`);
// //     }

// //     return { text, pasid };

// //   } catch (error) {
// //     console.error(`Failed to get text and PASID from ${step.Page}.${step.Element}:`, error);
// //     throw error;
// //   }
// // }

// export async function getTextAndStorePASID(page: Page, step: TestStep): Promise<{ text: string, pasid?: string, surname?: string, forename?: string, gender?: string, dob?: string }> {
//     try {
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const locator = await resolveElement(page, baseSelector);

//         // Ensure element is visible
//         await locator.waitFor({ state: 'visible', timeout: 5000 });

//         // Get the tag name
//         const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
//         let text = '';

//         if (tagName === 'input' || tagName === 'textarea') {
//             // For input elements, try to get value first, then placeholder
//             const value = await locator.inputValue();
//             if (value) {
//                 text = value;
//             } else {
//                 // Get placeholder if value is empty
//                 text = await locator.getAttribute('placeholder') || '';
//             }
//         } else {
//             // For other elements, get text content
//             text = await locator.textContent() || '';
//             text = text.trim();
//         }

//         console.log(`Retrieved text from ${step.Page}.${step.Element}: "${text}"`);

//         // Extract Surname, Forename, Gender, DOB, PASID using regex
//         // Example: "Successfully registered the patient GILL Brain , Gender: Male, Date of birth: 18/04/1994, PatientID: PASID-039472"
//         let surname: string | undefined = undefined;
//         let forename: string | undefined = undefined;
//         let gender: string | undefined = undefined;
//         let dob: string | undefined = undefined;
//         let pasid: string | undefined = undefined;

//         // Extract patient name (Surname and Forename)
//         const nameMatch = text.match(/Successfully registered the patient\s+([A-Za-z\-']+)\s+([A-Za-z\-']+)\s*,/);
//         if (nameMatch) {
//             surname = nameMatch[1];
//             forename = nameMatch[2];
//         }

//         // Extract Gender
//         const genderMatch = text.match(/Gender:\s*([A-Za-z]+)/);
//         if (genderMatch) {
//             gender = genderMatch[1];
//         }

//         // Extract Date of Birth
//         const dobMatch = text.match(/Date of birth:\s*([\d\/]+)/);
//         if (dobMatch) {
//             dob = dobMatch[1];
//         }

//         // Extract PASID
//         const pasidMatch = text.match(/PatientID:\s*(PASID-\d+)/);
//         if (pasidMatch && pasidMatch[1]) {
//             pasid = pasidMatch[1];
//             // Store PASID in global variable if Values is provided and starts with _PASID
//             if (step.Values && step.Values.startsWith('_')) {
//                 executionContext.setGlobalVariable(step.Values + 'PASID', pasid);
//                 console.log(`Stored PASID in global variable: ${step.Values}PASID = "${pasid}"`);
//             }
//             console.log(`Extracted PASID: ${pasid}`);
//         } else {
//             console.warn('PASID not found in the retrieved text.');
//         }

//         // Store Surname, Forename, Gender, DOB in global variables if Values is provided and starts with _
//         if (step.Values && step.Values.startsWith('_')) {
//             if (surname) {
//                 executionContext.setGlobalVariable(step.Values + 'SURNAME', surname);
//                 console.log(`Stored Surname in global variable: ${step.Values}SURNAME = "${surname}"`);
//             }
//             if (forename) {
//                 executionContext.setGlobalVariable(step.Values + 'FORENAME', forename);
//                 console.log(`Stored Forename in global variable: ${step.Values}FORENAME = "${forename}"`);
//             }
//             if (gender) {
//                 executionContext.setGlobalVariable(step.Values + 'GENDER', gender);
//                 console.log(`Stored Gender in global variable: ${step.Values}GENDER = "${gender}"`);
//             }
//             if (dob) {
//                 executionContext.setGlobalVariable(step.Values + 'DOB', dob);
//                 console.log(`Stored DOB in global variable: ${step.Values}_OB = "${dob}"`);
//             }
//             executionContext.setGlobalVariable(step.Values + 'FULLTEXT', text);
//             console.log(`Stored full text in global variable: ${step.Values}FULLTEXT = "${text}"`);
//         }

//         return { text, pasid, surname, forename, gender, dob };

//     } catch (error) {
//         console.error(`Failed to get text and PASID from ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }


// export async function setTextPASID(page: Page, step: TestStep): Promise<void> {
//     try {

//         // The step.Values should be the variable name (e.g., "_PASID") where PASID was stored
//         if (!step.Values) {
//             throw new Error(`No PASID variable name provided for setTextPASID at ${step.Page}.${step.Element}`);
//         }

//         // Retrieve PASID from global variable
//         const pasid = executionContext.getGlobalVariable(step.Values);
//         if (!pasid) {
//             throw new Error(`PASID not found in global variable: ${step.Values}`);
//         }

//         const stepWithText = { ...step, ElementText: pasid };

//         const baseSelector = getLocator(step.Page, step.Element, stepWithText);
//         const locator = await resolveElement(page, baseSelector);

//         // Ensure element is ready for input
//         await locator.waitFor({ state: 'visible', timeout: 5000 });
//         await locator.scrollIntoViewIfNeeded();

//         // Clear existing text and fill with PASID
//         await locator.clear();
//         await locator.fill(String(pasid));
//         console.log(`Successfully set PASID in ${step.Page}.${step.Element}: "${pasid}"`);
//     } catch (error) {
//         console.error(`Failed to set PASID in ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }



// export async function getCellData(
//     page: Page,
//     gridSelector: string,
//     columnHeader: string,
//     pasidVarName: string
// ): Promise<string | undefined> {
//     // Get PASID from global variable
//     const pasid = executionContext.getGlobalVariable(pasidVarName);
//     if (!pasid) {
//         throw new Error(`PASID not found in global variable: ${pasidVarName}`);
//     }

//     // Find the grid/table
//     const grid = page.locator(gridSelector);
//     await grid.waitFor({ state: 'visible', timeout: 5000 });

//     // Find all header cells (the first <tr> in the table)
//     const headerRow = grid.locator('tr').first();
//     const headerCells = await headerRow.locator('td.G_CH, th.G_CH').all();

//     let targetColIndex = -1;
//     let pasidColIndex = -1;

//     // Find the column index for the given header and for PASID
//     for (let i = 0; i < headerCells.length; i++) {
//         const headerText = (await headerCells[i].locator('span').textContent())?.trim() || '';
//         if (
//             headerText.toLowerCase() === columnHeader.toLowerCase() ||
//             headerText.toLowerCase().includes(columnHeader.toLowerCase())
//         ) {
//             targetColIndex = i;
//         }
//         if (
//             headerText.toLowerCase() === 'pas number' ||
//             headerText.toLowerCase() === 'pasid' ||
//             headerText.toLowerCase().includes('pasid')
//         ) {
//             pasidColIndex = i;
//         }
//     }
//     if (targetColIndex === -1) {
//         throw new Error(`Column header "${columnHeader}" not found in grid`);
//     }
//     if (pasidColIndex === -1) {
//         throw new Error(`PASID column not found in grid`);
//     }

//     // Find all data rows (skip header row)
//     const rows = await grid.locator('tr').nth(1).locator('td').count() > 0
//         ? await grid.locator('tr').all()
//         : await grid.locator('tbody > tr').all();

//     for (let row of rows) {
//         // Skip header row
//         const isHeader = await row.locator('td.G_CH, th.G_CH').count();
//         if (isHeader) continue;

//         const cells = await row.locator('td').all();
//         if (cells.length === 0) continue;

//         // Get PASID cell text
//         const pasidCellText = (await cells[pasidColIndex].innerText()).trim();
//         if (pasidCellText === pasid) {
//             // Return the value from the requested column
//             return (await cells[targetColIndex].innerText()).trim();
//         }
//     }
//     return undefined;
// }

// export async function selectComboByIndex(page: Page, step: TestStep): Promise<void> {
//     try {
//         const rawIndex = getGlobalValueIfPrefixed(step.Values);
//         const index = Number(rawIndex);
//         if (Number.isNaN(index) || !Number.isInteger(index) || index < 0) {
//             throw new Error(`Invalid index provided for selectComboByIndex: ${step.Values}`);
//         }

//         const comboboxName = getGlobalValueIfPrefixed(step.Element);
//         const baseSelector = getLocator(step.Page, step.Element, step);
//         const element = await resolveElement(page, baseSelector);

//         // Identify combo box type by DOM structure or selector
//         let comboType: 'lorenzo' | 'referral' | 'unknown' = 'unknown';
//         if (baseSelector.startsWith('#icombobox_Control_') || baseSelector.includes('icombobox_Control_')) {
//             comboType = 'referral';
//         } else if (baseSelector.startsWith('#C2T_') || baseSelector.startsWith('#C2L_')) {
//             comboType = 'lorenzo';
//         }

//         switch (comboType) {
//             case 'lorenzo': {
//                 const underscoreIndex = baseSelector.indexOf('_');
//                 const rest = underscoreIndex !== -1 ? baseSelector.substring(underscoreIndex + 1) : '';
//                 const comboboxId = rest;
//                 const listSelector = `#C2L_${comboboxId}`;
//                 const allOptionsSelector = `${listSelector} li`;
//                 const options = await resolveElements(page, allOptionsSelector, {
//                     timeout: 5000,
//                     visibleOnly: true,
//                     minCount: 1
//                 });
//                 if (index >= options.length) {
//                     throw new Error(`Index ${index} out of range for Lorenzo combo options (found ${options.length})`);
//                 }
//                 await options[index].click();
//                 return;
//             }

//             case 'referral': {
//                 // ensure dropdown opened
//                 const arrowBtn = element.locator('img[id^="icombobox_Image_"]');
//                 if (await arrowBtn.count() > 0 && await arrowBtn.isVisible()) {
//                     const isExpanded = await arrowBtn.getAttribute('class')?.then(cls => cls?.includes('expanded') || false)
//                         || await arrowBtn.getAttribute('aria-expanded') === 'true';
//                     if (!isExpanded) {
//                         await arrowBtn.click();
//                     }
//                 } else {
//                     const input = element.locator('input[type="text"][id^="icombobox_Text_"]');
//                     if (await input.count() > 0 && await input.isVisible()) {
//                         await input.click();
//                     }
//                 }

//                 const cleanBase = baseSelector.replace(/^xpath=/i, '').replace(/^#/, '');
//                 let allOptionsSelector: string | null = null;

//                 if (/^icombobox_Control_cbo/i.test(cleanBase)) {
//                     const suffix = cleanBase.substring('icombobox_Control_cbo'.length);
//                     const prefix = 'icombobox_List_cbo';
//                     allOptionsSelector = `xpath=//select[@id='${prefix}${suffix}']//option`;
//                 } else if (/^icombobox_Control_C\d+/i.test(cleanBase)) {
//                     const suffix = cleanBase.substring('icombobox_Control_'.length);
//                     allOptionsSelector = `xpath=//select[starts-with(@id,'icombobox_List_') and contains(@id, '${suffix}')]//option`;
//                 } else {
//                     allOptionsSelector = `xpath=//select[starts-with(@id,'icombobox_List_')]//option`;
//                 }

//                 if (!allOptionsSelector) {
//                     throw new Error('Unable to construct options selector for referral combobox');
//                 }

//                 const options = await resolveElements(page, allOptionsSelector, {
//                     timeout: 50000,
//                     visibleOnly: true,
//                     minCount: 1
//                 });

//                 if (index >= options.length) {
//                     throw new Error(`Index ${index} out of range for Referral combo options (found ${options.length})`);
//                 }

//                 const targetOpt = options[index];
//                 try {
//                     await targetOpt.click();
//                     return;
//                 } catch {
//                     // fallback: select via parent <select> by value or label
//                     const parentSelect = targetOpt.locator('xpath=ancestor::select[1]');
//                     if (await parentSelect.count() > 0) {
//                         const valueAttr = await targetOpt.getAttribute('value');
//                         if (valueAttr !== null && valueAttr !== undefined) {
//                             await parentSelect.selectOption({ value: valueAttr }).catch(() => { /* ignore */ });
//                             return;
//                         } else {
//                             const labelText = (await targetOpt.textContent())?.trim() || '';
//                             if (labelText) {
//                                 await parentSelect.selectOption({ label: labelText }).catch(() => { /* ignore */ });
//                                 return;
//                             }
//                         }
//                     }
//                     throw new Error(`Failed to select option at index ${index} for Referral combo`);
//                 }
//             }

//             default: {
//                 // Generic fallback: try find option-like elements under element
//                 const optionLocators = await resolveElements(page, `${baseSelector} li, ${baseSelector} option, ${baseSelector} [role="option"]`, {
//                     timeout: 3000,
//                     visibleOnly: true,
//                     minCount: 1
//                 }).catch(() => []);
//                 if (optionLocators && index < optionLocators.length) {
//                     await optionLocators[index].click();
//                     return;
//                 }
//                 throw new Error(`Combo box type not recognized or index ${index} not selectable`);
//             }
//         }
//     } catch (error) {
//         const errorMsg = (error instanceof Error) ? error.message : String(error);
//         console.error(`Error selecting from combobox by index: ${errorMsg}`);
//         throw error;
//     }
// }

// export async function selectEmptyIPSlotCheckBox(
//     page: Page,
//     containerSelector: string,
//     dataRowIndex: number,
//     timeout = 5000
// ): Promise<void> {
//     if (dataRowIndex < 0) throw new Error('Invalid dataRowIndex provided');

//     const container = await resolveElement(page, containerSelector);
//     await container.waitFor({ state: 'visible', timeout });

//     const tables = container.locator('table');
//     const tableCount = await tables.count();
//     if (tableCount < 2) {
//         throw new Error(`Expected at least 2 tables in container ${containerSelector}, found ${tableCount}`);
//     }

//     const firstTable = tables.nth(2);
//     await firstTable.waitFor({ state: 'visible', timeout });

//     // find data rows (tbody tr preferred)
//     let firstTableRows = firstTable.locator('tbody tr');
//     let firstCount = await firstTableRows.count();
//     if (firstCount === 0) {
//         // fallback to all rows after possible header
//         const allRows = firstTable.locator('tr');
//         const total = await allRows.count();
//         if (total === 0) {
//             throw new Error('No rows found in first table');
//         }
//         // assume header present and use rows from position()>1; otherwise use all rows
//         firstTableRows = total > 1 ? firstTable.locator(`xpath=./tr[position()>1]`) : firstTable.locator('tr');
//         firstCount = await firstTableRows.count();
//     }

//     if (dataRowIndex >= firstCount) {
//         throw new Error(`Requested row index ${dataRowIndex} exceeds first table data rows (${firstCount})`);
//     }

//     const targetRow = firstTableRows.nth(dataRowIndex);

//     // Locator for checkbox image - try several patterns to be resilient
//     const checkboxImg = targetRow.locator(
//         `xpath=.//td[@imgtype='CheckBox']//img | .//img[contains(@alt,'Check') or contains(@title,'Check') or contains(@src,'Check')] | .//input[@type='checkbox']`
//     ).first();

//     const count = await checkboxImg.count();
//     if (count === 0) {
//         throw new Error('Checkbox element not found in target first-table row');
//     }

//     await checkboxImg.waitFor({ state: 'visible', timeout }).catch(() => { /* ignore */ });

//     // Determine selection state heuristically (attribute 'checked' or src contains 'Checked')
//     const checkedAttr = (await checkboxImg.getAttribute('checked')) || (await checkboxImg.getAttribute('aria-checked'));
//     const srcAttr = (await checkboxImg.getAttribute('src')) || '';
//     const isSelected = (String(checkedAttr).toLowerCase() === 'true') ||
//         /check(ed)?/i.test(srcAttr) && !/uncheck(ed)?/i.test(srcAttr);

//     if (isSelected) {
//         // Deselect and reselect to ensure a fresh selection (per requirement)
//         await checkboxImg.click();
//         await page.waitForTimeout(120);
//         await checkboxImg.click();
//         return;
//     } else {
//         await checkboxImg.click();
//         return;
//     }
// }

// export async function selectIPPegBoardByHeader(
//     page: Page,
//     step: TestStep
// ): Promise<void> {
//     try {
//         if (!step.Element) {
//             throw new Error('No container element provided in step.Element');
//         }
//         if (!step.TableColumnNames) {
//             throw new Error('No TableColumnNames provided in step.TableColumnNames');
//         }
//         if (typeof step.Values === 'undefined' || step.Values === null) {
//             throw new Error('No value provided in step.Values to match against the header column');
//         }

//         const headerName = step.TableColumnNames;
//         const expectedValue = String(getGlobalValueIfPrefixed(step.Values)).trim();
//         const containerSelector = getLocator(step.Page, step.Element, step);

//         const container = await resolveElement(page, containerSelector);
//         await container.waitFor({ state: 'visible', timeout: 5000 });

//         const tables = container.locator('table');
//         const tableCount = await tables.count();
//         if (tableCount < 2) {
//             throw new Error(`Expected at least 2 tables in container ${containerSelector}, found ${tableCount}`);
//         }

//         // Extract headers from the header table (same as selectBlankSlot: header table at index 1)
//         const headerTable = tables.nth(1);
//         await headerTable.waitFor({ state: 'visible', timeout: 5000 });
//         const headerCells = headerTable.locator('tr').first().locator('th,td');
//         const headers = await headerCells.evaluateAll(elements =>
//             elements.map(el => (el.textContent || '').trim())
//         );

//         if (headers.length === 0) {
//             throw new Error('No headers found in header table');
//         }

//         const colIdx = headers.findIndex(h => h.toLowerCase().includes(headerName.toLowerCase()));
//         if (colIdx === -1) {
//             throw new Error(`"${headerName}" header not found. Available headers: ${headers.join(', ')}`);
//         }

//         // Data rows are in the data table (selectBlankSlot used tables.nth(3)); follow same layout,
//         // but fallback to tables.nth(1) if the expected data table index doesn't exist.
//         const dataTableIndex = tableCount > 3 ? 3 : 1;
//         const dataTable = tables.nth(dataTableIndex);
//         await dataTable.waitFor({ state: 'visible', timeout: 5000 });

//         // get data rows under tbody if present, otherwise all rows except first
//         let dataRows = dataTable.locator('tbody tr');
//         let dataCount = await dataRows.count();
//         if (dataCount === 0) {
//             const allRows = dataTable.locator('tr');
//             const total = await allRows.count();
//             if (total <= 1) {
//                 throw new Error('No data rows found in data table');
//             }
//             dataRows = dataTable.locator(`xpath=./tr[position()>1]`);
//             dataCount = await dataRows.count();
//         }

//         // Find the first row where the specified column matches expectedValue
//         let targetRowIndex = -1;
//         for (let i = 0; i < dataCount; i++) {
//             const row = dataRows.nth(i);
//             const cells = row.locator('td');
//             const cellCount = await cells.count();
//             if (colIdx >= cellCount) continue;
//             const cellText = (await cells.nth(colIdx).textContent())?.trim() || '';
//             if (cellText === expectedValue) {
//                 targetRowIndex = i;
//                 break;
//             }
//         }

//         if (targetRowIndex === -1) {
//             throw new Error(`No row with "${headerName}" = "${expectedValue}" found in data table`);
//         }

//         // Click corresponding checkbox in the first table (reuse helper)
//         await selectEmptyIPSlotCheckBox(page, containerSelector, targetRowIndex);

//         console.log(`✓ Selected row ${targetRowIndex + 1} based on "${headerName}" = "${expectedValue}"`);
//     } catch (error) {
//         console.error(`Failed to select IP PegBoard row by header "${step.TableColumnNames}":`, error);
//         throw error;
//     }
// }


// export async function selectRowByTableHeader(
//     page: Page,
//     step: TestStep
// ): Promise<void> {
//     try {
//         if (!step.Element) {
//             throw new Error('No container element provided in step.Element');
//         }
//         if (!step.TableColumnNames) {
//             throw new Error('No TableColumnNames provided in step.TableColumnNames');
//         }
//         if (typeof step.Values === 'undefined' || step.Values === null) {
//             throw new Error('No value provided in step.Values to match against the header column');
//         }

//         const headerName = step.TableColumnNames;
//         const expectedValue = String(getGlobalValueIfPrefixed(step.Values)).trim();
//         const containerSelector = getLocator(step.Page, step.Element, step);

//         const container = await resolveElement(page, containerSelector);
//         await container.waitFor({ state: 'visible', timeout: 5000 });

//         const tables = container.locator('table');
//         const tableCount = await tables.count();
//         if (tableCount === 0) {
//             throw new Error(`No tables found in container ${containerSelector}`);
//         }

//         // Find a table that contains the header we need
//         let headerTableIndex = -1;
//         for (let t = 0; t < tableCount; t++) {
//             const tloc = tables.nth(t);
//             const headerCells = tloc.locator('th,td');
//             const cellCount = await headerCells.count();
//             if (cellCount === 0) continue;
//             const texts = await headerCells.evaluateAll(elements =>
//                 elements.map(el => (el.textContent || '').trim())
//             );
//             if (texts.some(txt => txt.toLowerCase().includes(headerName.toLowerCase()))) {
//                 headerTableIndex = t;
//                 break;
//             }
//         }

//         if (headerTableIndex === -1) {
//             throw new Error(`"${headerName}" header not found in any table under ${containerSelector}`);
//         }

//         const headerTable = tables.nth(headerTableIndex);
//         const headerCells = headerTable.locator('th,td');
//         const headers = await headerCells.evaluateAll(elements => elements.map(el => (el.textContent || '').trim()));
//         const colIdx = headers.findIndex(h => h.toLowerCase().includes(headerName.toLowerCase()));
//         if (colIdx === -1) {
//             throw new Error(`\"${headerName}\" header not found in header table`);
//         }

//         // Choose the data table: prefer the next table after the header table
//         let dataTableIndex = headerTableIndex + 1;
//         if (dataTableIndex >= tableCount) dataTableIndex = headerTableIndex;
//         const dataTable = tables.nth(dataTableIndex);
//         await dataTable.waitFor({ state: 'visible', timeout: 5000 });

//         // Get data rows (tbody tr preferred)
//         let dataRows = dataTable.locator('tbody tr');
//         let dataCount = await dataRows.count();
//         if (dataCount === 0) {
//             const allRows = dataTable.locator('tr');
//             const total = await allRows.count();
//             if (total <= 1) {
//                 throw new Error('No data rows found in data table');
//             }
//             dataRows = dataTable.locator(`xpath=./tr[position()>1]`);
//             dataCount = await dataRows.count();
//         }

//         // Find the first matching row
//         let targetRowIndex = -1;
//         for (let i = 0; i < dataCount; i++) {
//             const row = dataRows.nth(i);
//             const cells = row.locator('td');
//             const cellCount = await cells.count();
//             if (colIdx >= cellCount) continue;
//             const cellText = (await cells.nth(colIdx).innerText()).trim();
//             if (cellText === expectedValue) {
//                 targetRowIndex = i;

//                 // Try to click a checkbox inside the row if present, otherwise click the row itself
//                 const checkbox = row.locator('input[type="checkbox"], img[alt*="Check"], td[imgtype="CheckBox"] img').first();
//                 const cbCount = await checkbox.count();
//                 if (cbCount > 0) {
//                     await checkbox.click();
//                 } else {
//                     await row.click();
//                 }
//                 break;
//             }
//         }

//         if (targetRowIndex === -1) {
//             throw new Error(`No row with "${headerName}" = "${expectedValue}" found in data table`);
//         }

//         console.log(`✓ Selected row ${targetRowIndex + 1} for "${headerName}" = "${expectedValue}"`);
//     } catch (error) {
//         console.error(`Failed to select row by header "${step.TableColumnNames}":`, error);
//         throw error;
//     }
// }



// export async function selectECPatByHeader(
//     page: Page,
//     step: TestStep
// ): Promise<void> {
//     try {
//         if (!step.Element) throw new Error('No container element provided in step.Element');
//         if (!step.TableColumnNames) throw new Error('No TableColumnNames provided in step.TableColumnNames');
//         if (typeof step.Values === 'undefined' || step.Values === null) throw new Error('No value provided in step.Values to match against the header column');

//         const headerName = step.TableColumnNames;
//         const expectedValue = String(getGlobalValueIfPrefixed(step.Values)).trim();
//         const containerSelector = getLocator(step.Page, step.Element, step);

//         const container = await resolveElement(page, containerSelector);
//         await container.waitFor({ state: 'visible', timeout: 5000 });

//         const tables = container.locator('table');
//         const tableCount = await tables.count();
//         if (tableCount === 0) throw new Error(`No tables found in container ${containerSelector}`);

//         // NOTE: Header columns for EC patient grid are written in the 6th table (index 5).
//         // Prefer the 6th table when present; otherwise fall back to scanning for the header.
//         let headerTableIndex = -1;
//         if (tableCount > 5) {
//             headerTableIndex = 5;
//         } else {
//             for (let t = 0; t < tableCount; t++) {
//                 const tbl = tables.nth(t);
//                 const hdrCells = tbl.locator('tr').first().locator('th,td');
//                 const headers = await hdrCells.evaluateAll(elements => elements.map(el => (el.textContent || '').trim())).catch(() => []);
//                 if (headers.some(h => h.toLowerCase().includes(headerName.toLowerCase()))) {
//                     headerTableIndex = t;
//                     break;
//                 }
//             }
//         }

//         if (headerTableIndex === -1) {
//             throw new Error(`Header "${headerName}" not found in any table under ${containerSelector}`);
//         }

//         // Use header table to determine column index
//         const headerTable = tables.nth(headerTableIndex);
//         await headerTable.waitFor({ state: 'visible', timeout: 5000 });
//         const headerCells = headerTable.locator('tr').first().locator('th,td');
//         const headers = await headerCells.evaluateAll(elements => elements.map(el => (el.textContent || '').trim()));
//         const colIdx = headers.findIndex(h => h.toLowerCase().includes(headerName.toLowerCase()));
//         if (colIdx === -1) throw new Error(`"${headerName}" header not found. Available headers: ${headers.join(', ')}`);

//         // Determine data table index relative to header table (prefer headerTableIndex+2 pattern)
//         let dataTableIndex = headerTableIndex + 2;
//         if (dataTableIndex >= tableCount) dataTableIndex = headerTableIndex + 1;
//         if (dataTableIndex >= tableCount) dataTableIndex = headerTableIndex;

//         const dataTable = tables.nth(dataTableIndex);
//         await dataTable.waitFor({ state: 'visible', timeout: 5000 });

//         // get data rows under tbody or rows after header
//         let dataRows = dataTable.locator('tbody tr');
//         let dataCount = await dataRows.count();
//         if (dataCount === 0) {
//             const allRows = dataTable.locator('tr');
//             const total = await allRows.count();
//             if (total <= 1) throw new Error('No data rows found in data table');
//             dataRows = dataTable.locator(`xpath=./tr[position()>1]`);
//             dataCount = await dataRows.count();
//         }

//         // locate first row that matches expectedValue in the target column
//         let targetRowIndex = -1;
//         for (let i = 0; i < dataCount; i++) {
//             const row = dataRows.nth(i);
//             const cells = row.locator('td');
//             const cellCount = await cells.count();
//             if (colIdx >= cellCount) continue;
//             const cellText = (await cells.nth(colIdx).textContent())?.trim() || '';
//             if (cellText === expectedValue) {
//                 targetRowIndex = i;
//                 break;
//             }
//         }

//         if (targetRowIndex === -1) {
//             throw new Error(`No row with "${headerName}" = "${expectedValue}" found in data table`);
//         }

//         // Find the table that contains checkboxes (scan tables for a checkbox-like column)
//         let checkboxTableIndex = -1;
//         for (let t = 0; t < tableCount; t++) {
//             const tbl = tables.nth(t);
//             const chkCount = await tbl.locator(`xpath=.//td[@imgtype='CheckBox'] | .//img[contains(translate(@alt,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'check') or contains(translate(@title,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'check') or contains(translate(@src,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'check')]`).count().catch(() => 0);
//             if (chkCount > 0) {
//                 checkboxTableIndex = t;
//                 break;
//             }
//         }
//         // fallback: assume checkbox table is immediately before data table
//         if (checkboxTableIndex === -1) {
//             const fallback = dataTableIndex - 1;
//             if (fallback >= 0) checkboxTableIndex = fallback;
//             else checkboxTableIndex = 0;
//         }

//         const checkboxTable = tables.nth(checkboxTableIndex);
//         await checkboxTable.waitFor({ state: 'visible', timeout: 5000 });

//         // get checkbox table data rows (tbody preferred)
//         let checkboxRows = checkboxTable.locator('tbody tr');
//         let checkboxCount = await checkboxRows.count();
//         if (checkboxCount === 0) {
//             const allRows = checkboxTable.locator('tr');
//             const total = await allRows.count();
//             if (total === 0) throw new Error('No rows found in checkbox table');
//             checkboxRows = total > 1 ? checkboxTable.locator(`xpath=./tr[position()>1]`) : checkboxTable.locator('tr');
//             checkboxCount = await checkboxRows.count();
//         }

//         if (targetRowIndex >= checkboxCount) {
//             throw new Error(`Row index ${targetRowIndex} out of range for checkbox table (rows: ${checkboxCount})`);
//         }

//         const targetCheckboxRow = checkboxRows.nth(targetRowIndex);
//         const checkboxImg = targetCheckboxRow.locator(
//             `xpath=.//td[@imgtype='CheckBox']//img | .//img[contains(@alt,'Check') or contains(@title,'Check') or contains(@src,'Check')] | .//input[@type='checkbox']`
//         ).first();

//         const count = await checkboxImg.count();
//         if (count === 0) throw new Error('Checkbox element not found in target checkbox-row');

//         await checkboxImg.waitFor({ state: 'visible', timeout: 5000 }).catch(() => { /* ignore */ });

//         const checkedAttr = (await checkboxImg.getAttribute('checked')) || (await checkboxImg.getAttribute('aria-checked'));
//         const srcAttr = (await checkboxImg.getAttribute('src')) || '';
//         const isSelected = (String(checkedAttr).toLowerCase() === 'true') ||
//             (/check(ed)?/i.test(srcAttr) && !/uncheck(ed)?/i.test(srcAttr));

//         if (isSelected) {
//             await checkboxImg.click();
//             await page.waitForTimeout(120);
//             await checkboxImg.click();
//         } else {
//             await checkboxImg.click();
//         }

//         console.log(`✓ Selected EC patient row ${targetRowIndex + 1} where ${headerName}="${expectedValue}"`);
//     } catch (error) {
//         console.error(`Failed to select EC patient by header "${step.TableColumnNames}":`, error);
//         throw error;
//     }
// }


// /**
//  * Split a string obtained from a value reference (e.g. "_BannerText" or a literal string)
//  * by the provided delimiter and return trimmed parts. Optionally store parts into global
//  * variables passed as subsequent parameters.
//  *
//  * Usage:
//  *   // return array only
//  *   splitTextByValue('_BannerText', ',')
//  *   // store first two parts into global vars _PART1 and _PART2
//  *   splitTextByValue('_BannerText', ',', '_PART1', '_PART2')
//  *
//  * Notes:
//  * - If there are fewer parts than out variable names, remaining globals are set to ''.
//  * - If parts contain empty strings they are preserved for variable assignment; the returned
//  *   array is the full parts array (trimmed).
//  */

// export function splitTextByValue(valueRef: any, delimiter: string = '|', ...outVarNames: string[]): string[] {
//     try {
//         // Resolve valueRef which may be a global variable reference (handled by getGlobalValueIfPrefixed)
//         const resolved = getGlobalValueIfPrefixed(valueRef);
//         if (resolved === undefined || resolved === null) {
//             // ensure any requested output globals are created as empty
//             for (const varName of outVarNames) {
//                 if (varName) {
//                     executionContext.setGlobalVariable(varName, '');
//                     console.log(`Global variable ${varName} set to "" (input value undefined/null)`);
//                 }
//             }
//             return [];
//         }

//         const raw = String(resolved);

//         // Interpret common placeholder delimiters
//         let delim = delimiter || '|';
//         const token = delim.trim().toUpperCase();
//         if (token === '<SPACE>' || token === 'SPACE') delim = ' ';
//         if (token === '<PIPE>') delim = '|';

//         // Split and trim each part (preserve empty parts for indexing)
//         const parts = raw.split(delim).map(p => (p === null || typeof p === 'undefined') ? '' : String(p).trim());

//         // Assign parts to provided global variable names (3rd parameter onwards)
//         if (outVarNames && outVarNames.length > 0) {
//             for (let i = 0; i < outVarNames.length; i++) {
//                 const varName = outVarNames[i];
//                 const val = parts[i] !== undefined ? parts[i] : '';
//                 if (varName) {
//                     executionContext.setGlobalVariable(varName, val);
//                     console.log(`Global variable ${varName} set to "${val}"`);
//                 }
//             }
//         }

//         console.log(`splitTextByValue resolved "${raw}" -> [${parts.join(' | ')}] using delimiter "${delim}"`);
//         return parts;
//     } catch (err) {
//         // On error, ensure requested globals are set to '' to avoid undefined usage
//         try {
//             for (const varName of outVarNames) {
//                 if (varName) {
//                     executionContext.setGlobalVariable(varName, '');
//                     console.log(`Global variable ${varName} set to "" (error during split)`);
//                 }
//             }
//         } catch (e) { /* ignore */ }
//         return [];
//     }
// }

// export async function splitString(page: Page, step: TestStep): Promise<void> {
//     try {
//         // Validate Values field
//         if (!step.Values) {
//             throw new Error('Values field is required for splitString action');
//         }

//         const parts = step.Values.split('|').map(part => part.trim());

//         // Validate minimum required parameters
//         if (parts.length < 4) {
//             throw new Error('Values must contain source string, separator, result index, and variable name separated by |');
//         }

//         let sourceStr = parts[0];
//         let separator = parts[1];
//         const resultIndex = parseInt(parts[2]);
//         const varName = parts[3];

//         // Handle quoted separators (remove surrounding quotes)
//         if ((separator.startsWith('"') && separator.endsWith('"')) ||
//             (separator.startsWith("'") && separator.endsWith("'"))) {
//             separator = separator.slice(1, -1);
//         }

//         // Handle special separator cases
//         let actualSeparator = separator;
//         switch (separator.toLowerCase()) {
//             case 'space':
//             case ' ':
//                 actualSeparator = ' ';
//                 break;
//             case 'comma':
//                 actualSeparator = ',';
//                 break;
//             case 'tab':
//                 actualSeparator = '\t';
//                 break;
//             case 'newline':
//             case 'nl':
//                 actualSeparator = '\n';
//                 break;
//             case 'pipe':
//                 actualSeparator = '|';
//                 break;
//             default:
//                 actualSeparator = separator;
//         }


//         // Resolve the source value.
//         // If sourceStr is a global variable name (starts with '_') prefer the value already stored
//         // in executionContext; fall back to getGlobalValueIfPrefixed if not present.
//         let sourceValueRaw: any;
//         if (typeof sourceStr === 'string' && sourceStr.startsWith('_')) {
//             sourceValueRaw = executionContext.getGlobalVariable(sourceStr);
//             if (sourceValueRaw === undefined || sourceValueRaw === null) {
//                 sourceValueRaw = getGlobalValueIfPrefixed(sourceStr);
//             }
//         } else {
//             sourceValueRaw = getGlobalValueIfPrefixed(sourceStr);
//         }

//         const sourceValue = String(sourceValueRaw ?? '');
//         // Validate result index
//         if (isNaN(resultIndex) || resultIndex < 0) {
//             throw new Error('Result index must be a valid non-negative number');
//         }

//         // Perform the split operation
//         const resultArray = sourceValue.split(actualSeparator);

//         // Check if result index is within bounds
//         if (resultIndex >= resultArray.length) {
//             throw new Error(`Result index ${resultIndex} is out of bounds. Array length: ${resultArray.length}`);
//         }

//         const result = resultArray[resultIndex].trim(); // Trim the result to remove extra spaces

//         // Store result in global variables with proper variable name formatting
//         const finalVarName = varName.startsWith('_') ? varName : `_${varName}`;
//         executionContext.setGlobalVariable(finalVarName, result);
//         console.log(`Global variable ${finalVarName} = "${executionContext.getGlobalVariable(finalVarName)}"`);

//     } catch (error: unknown) {
//         console.error(`Error in splitString: ${error instanceof Error ? error.message : String(error)}`);
//         throw error;
//     }
// }




// export async function setTextBoxIon(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No value provided for setTextBoxIon at ${step.Page}.${step.Element}`);
//         }

//         const value = getGlobalValueIfPrefixed(step.Values);
//         const stepWithText = { ...step, ElementText: value };

//         const baseSelector = getLocator(step.Page, step.Element, stepWithText);
//         const locator = await resolveElement(page, baseSelector);

//         // Ensure element is ready and visible
//         await locator.waitFor({ state: 'visible', timeout: 5000 });
//         await locator.scrollIntoViewIfNeeded();

//         // Try to find native input/textarea inside the ion component
//         let innerInput = locator.locator('input.native-input, input, textarea').first();
//         if ((await innerInput.count()) === 0) {
//             // fallback xpath search for descendant inputs
//             innerInput = locator.locator(`xpath=.//input | .//textarea`).first();
//         }

//         if (await innerInput.count() > 0) {
//             // ensure input visible & interactable
//             await innerInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { /* ignore */ });
//             // clear and fill
//             try {
//                 await innerInput.fill(String(value));
//             } catch {
//                 // fallback: click, select all, then type
//                 await innerInput.click({ clickCount: 3 }).catch(() => { /* ignore */ });
//                 await innerInput.type(String(value));
//             }
//             console.log(`Successfully set ion text in ${step.Page}.${step.Element}: "${value}"`);
//             return;
//         }

//         // Final fallback: focus the host element and type
//         try {
//             await locator.click();
//             await locator.fill?.(String(value)).catch(() => { /* ignore */ });
//             await page.keyboard.type(String(value));
//             console.log(`Successfully set text (fallback) in ${step.Page}.${step.Element}: "${value}"`);
//             return;
//         } catch (err) {
//             throw new Error(`Could not locate inner input for ${step.Page}.${step.Element}`);
//         }
//     } catch (error) {
//         console.error(`Failed to set ion text in ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }

// export async function setTextBoxKendo(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Values) {
//             throw new Error(`No value provided for setTextBoxKendo at ${step.Page}.${step.Element}`);
//         }

//         const value = getGlobalValueIfPrefixed(step.Values);
//         const stepWithText = { ...step, ElementText: value };

//         const baseSelector = getLocator(step.Page, step.Element, stepWithText);
//         const locator = await resolveElement(page, baseSelector);

//         await locator.waitFor({ state: 'visible', timeout: 5000 });
//         await locator.scrollIntoViewIfNeeded();

//         // Primary selector for Kendo textbox input
//         let kendoInput = locator.locator('kendo-textbox input.k-input-inner, itextbox input.k-input-inner, input.k-input-inner, input.k-textbox, input[type="text"]').first();

//         if ((await kendoInput.count()) === 0) {
//             // Fallback: search descendant inputs via XPath
//             kendoInput = locator.locator(`xpath=.//input[contains(@class,'k-input') or contains(@class,'k-textbox') or not(@type) or @type='text']`).first();
//         }

//         if (await kendoInput.count() > 0) {
//             await kendoInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { /* ignore */ });
//             try {
//                 await kendoInput.fill(String(value));
//             } catch {
//                 // fallback: focus, select all and type
//                 await kendoInput.click({ clickCount: 3 }).catch(() => { /* ignore */ });
//                 await kendoInput.type(String(value), { delay: 20 });
//             }
//             console.log(`Successfully set Kendo text in ${step.Page}.${step.Element}: "${value}"`);
//             return;
//         }

//         // Final fallback: focus host element then type
//         try {
//             await locator.click();
//             await page.keyboard.type(String(value), { delay: 20 });
//             console.log(`Successfully set Kendo text (fallback) in ${step.Page}.${step.Element}: "${value}"`);
//             return;
//         } catch (err) {
//             throw new Error(`Could not locate Kendo input for ${step.Page}.${step.Element}`);
//         }
//     } catch (error) {
//         console.error(`Failed to set Kendo text in ${step.Page}.${step.Element}:`, error);
//         throw error;
//     }
// }


// export async function selectDrugInMultiList(page: Page, step: TestStep): Promise<void> {
//     try {
//         if (!step.Element) throw new Error('No container element provided in step.Element');
//         if (!step.Values) throw new Error('No value(s) provided in step.Values');

//         // Resolve values (supports global var prefixes)
//         const rawValues = String(getGlobalValueIfPrefixed(step.Values));
//         const items = rawValues.split('|').map(s => s.trim()).filter(s => s.length > 0);
//         if (items.length === 0) throw new Error(`No selectable items parsed from step.Values: "${step.Values}"`);

//         const containerSelector = getLocator(step.Page, step.Element, step);
//         const container = await resolveElement(page, containerSelector);
//         await container.waitFor({ state: 'visible', timeout: 5000 });

//         // helper to safely build regex for matching visible text (case-insensitive, substring)
//         const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//         for (const rawItem of items) {
//             const item = rawItem.trim();
//             if (!item) continue;

//             // Prefer clickable span with pointer-cursor (per DOM). Use hasText with case-insensitive regex.
//             const candidateLocators = [
//                 container.locator('span.pointer-cursor', { hasText: new RegExp(escapeRegExp(item), 'i') }),
//                 container.locator('div.pointer-cursor', { hasText: new RegExp(escapeRegExp(item), 'i') }),
//                 container.locator('kendo-gridlayout-item', { hasText: new RegExp(escapeRegExp(item), 'i') }),
//                 container.locator('xpath=.//*[normalize-space() and contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "' + item.toLowerCase() + '")]')
//             ];

//             let found = false;
//             for (const loc of candidateLocators) {
//                 if (await loc.count() > 0) {
//                     const el = loc.first();
//                     await el.scrollIntoViewIfNeeded();
//                     await el.click();
//                     console.log(`Selected multi-list item: "${item}"`);
//                     await page.waitForTimeout(120);
//                     found = true;
//                     break;
//                 }
//             }

//             if (!found) {
//                 throw new Error(`Item "${item}" not found in multi-list under ${step.Page}.${step.Element}`);
//             }
//         }
//     } catch (error) {
//         console.error(`Failed to select drug(s) in multi-list:`, error);
//         throw error;
//     }
// }

// export async function selectKendoComboBox(page: Page, step: TestStep): Promise<void> {

//     try {

//         if (!step.Values) {

//             throw new Error(`No value provided for KendoUI combo box selection`);

//         }

//         const value = getGlobalValueIfPrefixed(step.Values);

//         const finalValue = String(value).trim();

//         // Check if value is index-based selection (format: "index | n")

//         const isIndexSelection = finalValue.toLowerCase().startsWith('index |') || finalValue.toLowerCase().startsWith('index|');

//         let targetIndex = -1;

//         if (isIndexSelection) {

//             const parts = finalValue.split('|').map(p => p.trim());

//             if (parts.length >= 2) {

//                 targetIndex = parseInt(parts[1]);

//                 if (isNaN(targetIndex) || targetIndex < 1) {

//                     throw new Error(`Invalid index value: ${parts[1]}. Index must be a positive number starting from 1`);

//                 }

//             } else {

//                 throw new Error(`Invalid index format. Expected: "index | n" where n is a positive number`);

//             }

//         }

//         const baseSelector = getLocator(step.Page, step.Element, step);

//         const element = await resolveElement(page, baseSelector);

//         await waitForRoller(page);

//         // KendoUI specific: Open dropdown by clicking the toggle button

//         const dropdownButton = element.locator('button[aria-label="Select"]');

//         if (await dropdownButton.isVisible()) {

//             await dropdownButton.click();

//         } else {

//             // Fallback: click on the combobox container

//             await element.click();

//         }

//         // Wait for dropdown to open

//         await page.waitForTimeout(1000);

//         // Wait for Kendo popup to be visible

//         if (isIndexSelection) {

//             // Select by index (1-based) from Kendo list items

//             const kendoOptionsSelector = 'kendo-popup li[role="option"]';

//             const options = await resolveElements(page, kendoOptionsSelector, {

//                 timeout: 5000,

//                 visibleOnly: true,

//                 minCount: targetIndex

//             });

//             if (options.length < targetIndex) {

//                 throw new Error(`Cannot select index ${targetIndex}. Only ${options.length} options available in Kendo combo box`);

//             }

//             // Select the option at the specified index (convert 1-based to 0-based)

//             await options[targetIndex - 1].click();

//             console.log(`Selected Kendo option at index ${targetIndex}`);

//         } else {

//             // Text-based selection for KendoUI

//             // Strategy 1: Try exact text match in list items

//             const exactMatchSelector = `kendo-popup li[role="option"]:has-text("${finalValue}")`;

//             const exactOption = await resolveElement(page, exactMatchSelector, 3000).catch(() => null);

//             if (exactOption) {

//                 await exactOption.click();

//             } else {

//                 // Strategy 2: Try partial text match

//                 const partialMatchSelector = `kendo-popup li[role="option"]`;

//                 const allOptions = await page.$$(partialMatchSelector);

//                 let foundOption = false;

//                 for (const option of allOptions) {

//                     const optionText = await option.textContent();

//                     if (optionText && optionText.includes(finalValue)) {

//                         await option.click();

//                         foundOption = true;

//                         break;

//                     }

//                 }

//                 if (!foundOption) {

//                     // Strategy 3: Use typeahead functionality for editable combobox

//                     const searchInput = element.locator('input.k-input-inner');

//                     if (await searchInput.isVisible()) {

//                         await searchInput.click();

//                         await searchInput.fill('');

//                         await searchInput.type(finalValue, { delay: 100 });

//                         // Wait for filtered results

//                         await page.waitForTimeout(500);

//                         // Try to select the first filtered option

//                         const firstOption = page.locator('kendo-popup li[role="option"]').first();

//                         if (await firstOption.isVisible({ timeout: 2000 })) {

//                             await firstOption.click();

//                         } else {

//                             throw new Error(`Option "${finalValue}" not found in Kendo combo box after typeahead search`);

//                         }

//                     } else {

//                         throw new Error(`Option "${finalValue}" not found in Kendo combo box`);

//                     }

//                 }

//             }

//         }

//         // Wait for selection to be applied and dropdown to close

//         await page.waitForTimeout(500);

//         await waitForRoller(page);

//         // Verify selection was successful

//         await verifyKendoSelection(page, element, finalValue, isIndexSelection);

//     } catch (error) {

//         console.error(`Failed to select from KendoUI combo box:`, error);

//         throw error;

//     }

// }

// /**

// * Helper function to verify Kendo combobox selection

// */

// async function verifyKendoSelection(page: Page, combobox: Locator, expectedValue: string, isIndexSelection: boolean): Promise<void> {

//     try {

//         // Wait a bit for the selection to be reflected

//         await page.waitForTimeout(300);

//         if (isIndexSelection) {

//             // For index selection, just verify something is selected

//             const selectedValue = await combobox.locator('input.k-input-inner').getAttribute('value');

//             if (!selectedValue || selectedValue.trim() === '') {

//                 console.warn('Kendo combo box appears to be empty after index selection');

//             }

//         } else {

//             // For text selection, verify the text matches

//             const selectedValue = await combobox.locator('input.k-input-inner').getAttribute('value');

//             if (selectedValue && !selectedValue.includes(expectedValue)) {

//                 console.warn(`Kendo selection verification: Expected "${expectedValue}", but found "${selectedValue}"`);

//             }

//         }

//     } catch (error) {

//         console.warn('Kendo selection verification failed:', error);

//         // Don't throw error for verification failure, as the selection might still be successful

//     }

// }

// /**

// * Alternative method for KendoUI combobox with direct input (for editable combobox)

// */

// export async function setKendoComboBoxValue(page: Page, step: TestStep): Promise<void> {

//     try {

//         if (!step.Values) {

//             throw new Error(`No value provided for KendoUI combo box input`);

//         }

//         const value = getGlobalValueIfPrefixed(step.Values);

//         const finalValue = String(value).trim();

//         const baseSelector = getLocator(step.Page, step.Element, step);

//         const element = await resolveElement(page, baseSelector);

//         await waitForRoller(page);

//         // For editable Kendo combobox, we can directly set the input value

//         const searchInput = element.locator('input.k-input-inner');

//         if (await searchInput.isVisible()) {

//             // Clear existing value

//             await searchInput.click();

//             await searchInput.clear();

//             // Type the new value

//             await searchInput.fill(finalValue);

//             // Press Enter to confirm

//             await searchInput.press('Enter');

//             console.log(`Set Kendo combo box value to: ${finalValue}`);

//         } else {

//             throw new Error('Kendo combo box input field not found or not editable');

//         }

//         await waitForRoller(page);

//     } catch (error) {

//         console.error(`Failed to set KendoUI combo box value:`, error);

//         throw error;

//     }

// }

// /**

// * Method to get available options from KendoUI combobox

// */

// export async function getKendoComboBoxOptions(page: Page, step: TestStep): Promise<string[]> {

//     try {

//         const baseSelector = getLocator(step.Page, step.Element, step);

//         const element = await resolveElement(page, baseSelector);

//         // Open dropdown

//         const dropdownButton = element.locator('button[aria-label="Select"]');

//         if (await dropdownButton.isVisible()) {

//             await dropdownButton.click();

//         }

//         // Wait for dropdown to open

//         await page.waitForTimeout(1000);

//         // Get all option texts

//         const options = await page.$$eval('kendo-popup li[role="option"]',

//             (elements) => elements.map(el => el.textContent?.trim() || '')

//         );

//         // Close dropdown by pressing Escape

//         await page.keyboard.press('Escape');

//         return options.filter(opt => opt !== '');

//     } catch (error) {

//         console.error(`Failed to get KendoUI combo box options:`, error);

//         throw error;

//     }

// }
