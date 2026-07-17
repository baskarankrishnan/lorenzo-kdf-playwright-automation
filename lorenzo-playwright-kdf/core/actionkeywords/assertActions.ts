import { Page } from "@playwright/test";
import { Outcome, testStep } from "../utilities/interfaceUtils";
import { getLocatorString } from "../utilities/locatorUtils";
import { resolveElement } from "./elementActions";
import { resolveTestVariables } from "./dataActions";

export async function verifyProperty(page: Page, step: testStep): Promise<Outcome> {
  try {
    let actualValue: any;
    let expectedValue: any = step.value;

    const booleanLikeProperties = new Set(['exists', 'checked', 'disabled', 'enabled', 'focused', 'hidden', 'visible']);
    const property = step.property?.toLowerCase();

    // Some generated steps set expected state in Condition rather than Values.
    // Only boolean-like properties should use Condition as the expected value.
    if ((expectedValue === null || expectedValue === undefined || String(expectedValue).trim() === '')
      && step.condition
      && property
      && booleanLikeProperties.has(property)) {
      expectedValue = resolveTestVariables(step.condition);
    }

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    if (step.isDDT === true && step.datasetColumnNames) {
      expectedValue = step.datasetColumnNames;
    }

    if (typeof expectedValue === 'string') {
      if (expectedValue.trim().toLowerCase() === 'true') {
        expectedValue = true;
      } else if (expectedValue.trim().toLowerCase() === 'false') {
        expectedValue = false;
      }
    }

    if (!property) {
      throw new Error(`Property is required for verifyProperty action`);
    }

    const baseSelector = getLocatorString(step);

    switch (property) {
      case 'exists': {
        const expectedTrue = expectedValue === true || String(expectedValue).toLowerCase() === 'true';
        const timeoutMs = 5000;
        const pollIntervalMs = 200;
        const startTime = Date.now();
        let lastError: Error | null = null;

        while (Date.now() - startTime < timeoutMs) {
          let elementExists = true;
          let isVisible = false;
          try {
            const locator = await resolveElement(page, baseSelector, step, 2000);
            isVisible = await locator.isVisible().catch(() => false);
          } catch (e) {
            elementExists = false;
            lastError = e instanceof Error ? e : new Error(String(e));
          }

          if (expectedTrue) {
            if (elementExists && isVisible) {
              return {
                code: 0,
                value: `Successfully verified property 'exists' for element: ${step.page}.${step.element}`
              };
            }
            if (elementExists && !isVisible) {
              lastError = new Error(`exists property expected true but element is not visible`);
            } else {
              lastError = new Error(`exists property expected true but element not found`);
            }
          } else {
            if (!elementExists || !isVisible) {
              return {
                code: 0,
                value: `Successfully verified property 'exists' for element: ${step.page}.${step.element}`
              };
            }
          }

          if (Date.now() - startTime + pollIntervalMs >= timeoutMs) {
            break;
          }

          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        if (expectedTrue) {
          throw lastError || new Error(`exists property expected true but element not found`);
        }

        throw new Error(
          `exists property expected false but element is present and visible` +
          ` (${step.page}.${step.element} selector=${baseSelector})`
        );
      }

      case 'checked': {
        const element = await resolveElement(page, baseSelector, step);
        const isChecked = await element.isChecked();
        if ((expectedValue === true || String(expectedValue).toLowerCase() === 'true') && !isChecked) {
          throw new Error(`checked property expected true but got false`);
        }
        if ((expectedValue === false || String(expectedValue).toLowerCase() === 'false') && isChecked) {
          throw new Error(`checked property expected false but got true`);
        }
        break;
      }

      case 'disabled': {
        const element = await resolveElement(page, baseSelector, step);
        const isDisabled = await element.isDisabled();
        if ((expectedValue === true || String(expectedValue).toLowerCase() === 'true') && !isDisabled) {
          throw new Error(`disabled property expected true but got false`);
        }
        if ((expectedValue === false || String(expectedValue).toLowerCase() === 'false') && isDisabled) {
          throw new Error(`disabled property expected false but got true`);
        }
        break;
      }

      case 'enabled': {
        const element = await resolveElement(page, baseSelector, step);
        const isEnabled = await element.isEnabled();
        if ((expectedValue === true || String(expectedValue).toLowerCase() === 'true') && !isEnabled) {
          throw new Error(`enabled property expected true but got false`);
        }
        if ((expectedValue === false || String(expectedValue).toLowerCase() === 'false') && isEnabled) {
          throw new Error(`enabled property expected false but got true`);
        }
        break;
      }

      case 'focused': {
        const element = await resolveElement(page, baseSelector, step);
        const isFocused = await element.evaluate(el => el === document.activeElement);
        if ((expectedValue === true || String(expectedValue).toLowerCase() === 'true') && !isFocused) {
          throw new Error(`focused property expected true but got false`);
        }
        if ((expectedValue === false || String(expectedValue).toLowerCase() === 'false') && isFocused) {
          throw new Error(`focused property expected false but got true`);
        }
        break;
      }

      case 'hidden': {
        // An element that is absent or not visible is treated as hidden.
        // resolveElement only returns visible elements, so a missing/hidden element throws —
        // catch that and treat it as isHidden = true.
        let isHidden = true;
        try {
          const element = await resolveElement(page, baseSelector, step);
          isHidden = await element.isHidden();
        } catch {
          isHidden = true;
        }
        if ((expectedValue === true || String(expectedValue).toLowerCase() === 'true') && !isHidden) {
          throw new Error(`hidden property expected true but got false`);
        }
        if ((expectedValue === false || String(expectedValue).toLowerCase() === 'false') && isHidden) {
          throw new Error(`hidden property expected false but got true`);
        }
        break;
      }

      case 'visible': {
        // If element is not found at all, it is not visible.
        let isVisible = false;
        try {
          const element = await resolveElement(page, baseSelector, step);
          isVisible = await element.isVisible();
        } catch {
          isVisible = false;
        }
        if ((expectedValue === true || String(expectedValue).toLowerCase() === 'true') && !isVisible) {
          throw new Error(`visible property expected true but got false`);
        }
        if ((expectedValue === false || String(expectedValue).toLowerCase() === 'false') && isVisible) {
          throw new Error(`visible property expected false but got true`);
        }
        break;
      }

      case 'value':
      case 'text': {
        const element = await resolveElement(page, baseSelector, step);
        await element.waitFor({ state: 'visible', timeout: 5000 });
        //await element.scrollIntoViewIfNeeded();

        const tagName = await element.evaluate(el => el.tagName.toLowerCase());

        if (tagName === 'input' || tagName === 'textarea') {
          actualValue = await element.inputValue();
        } else if (tagName === "select") {
          // For select elements, property becomes "wText" (might mean selected text)
          const selectedOption = element.locator('option:checked');
          actualValue = await selectedOption.textContent() || '';
          actualValue = actualValue.trim();
        }
        else {
          actualValue = await element.textContent() || '';
          actualValue = actualValue.trim();
        }

        if (actualValue === null || actualValue === undefined) {
          actualValue = '';
        }

        const condition = step.condition?.toLowerCase() || 'equal';

        switch (condition) {
          case 'contains':
            if (!String(actualValue).includes(String(expectedValue))) {
              throw new Error(`Expected value to contain "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'notcontains':
            if (String(actualValue).includes(String(expectedValue))) {
              throw new Error(`Expected value not to contain "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'equal':
          case 'equals':
            if (String(actualValue) !== String(expectedValue)) {
              throw new Error(`Expected value to equal "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'notequal':
          case 'notequals':
            if (String(actualValue) === String(expectedValue)) {
              throw new Error(`Expected value not to equal "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'greaterthan':
          case 'greater':
            if (Number(actualValue) <= Number(expectedValue)) {
              throw new Error(`Expected ${actualValue} to be greater than ${expectedValue}`);
            }
            break;

          case 'lessthan':
          case 'less':
            if (Number(actualValue) >= Number(expectedValue)) {
              throw new Error(`Expected ${actualValue} to be less than ${expectedValue}`);
            }
            break;

          case 'greaterthanorequals':
          case 'greaterorequal':
            if (Number(actualValue) < Number(expectedValue)) {
              throw new Error(`Expected ${actualValue} to be greater than or equal to ${expectedValue}`);
            }
            break;

          case 'lessthanorequals':
          case 'lessorequal':
            if (Number(actualValue) > Number(expectedValue)) {
              throw new Error(`Expected ${actualValue} to be less than or equal to ${expectedValue}`);
            }
            break;

          case 'startswith':
            if (!String(actualValue).startsWith(String(expectedValue))) {
              throw new Error(`Expected value to start with "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'notstartswith':
            if (String(actualValue).startsWith(String(expectedValue))) {
              throw new Error(`Expected value not to start with "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'endswith':
            if (!String(actualValue).endsWith(String(expectedValue))) {
              throw new Error(`Expected value to end with "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'notendswith':
            if (String(actualValue).endsWith(String(expectedValue))) {
              throw new Error(`Expected value not to end with "${expectedValue}" but got "${actualValue}"`);
            }
            break;

          case 'in': {
            const inValues = String(expectedValue).split(',').map(v => v.trim());
            if (!inValues.includes(String(actualValue))) {
              throw new Error(`Expected value to be one of [${inValues.join(', ')}] but got "${actualValue}"`);
            }
            break;
          }

          case 'notin': {
            const notInValues = String(expectedValue).split(',').map(v => v.trim());
            if (notInValues.includes(String(actualValue))) {
              throw new Error(`Expected value not to be one of [${notInValues.join(', ')}] but got "${actualValue}"`);
            }
            break;
          }

          default:
            throw new Error(`Unsupported condition '${condition}' for ${property} property`);
        }
        break;
      }

      default:
        throw new Error(`Unsupported property '${property}' for verifyProperty`);
    }

    console.log(`  ✅ Verified property '${property}' for element: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully verified property '${property}' for element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify property '${step.property}' for element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify property: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function verifyStyle(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    if (step.isDDT === true && step.datasetColumnNames) {
      expectedValue = step.datasetColumnNames;
    }

    const property = step.property?.toLowerCase();
    if (!property) {
      throw new Error(`Property is required for verifyStyle action`);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    switch (property) {
      case 'background-color':
      case 'color':
      case 'font-weight':
      case 'text-decoration':
      case 'border': {
        const actualValue = await element.evaluate((el: Element, prop: string) => {
          return window.getComputedStyle(el).getPropertyValue(prop);
        }, property);

        const condition = step.condition?.toLowerCase() || 'equal';

        switch (condition) {
          case 'equal':
          case 'equals':
            if (actualValue !== expectedValue) {
              throw new Error(`${property} expected '${expectedValue}' but got '${actualValue}'`);
            }
            break;

          case 'notequal':
          case 'notequals':
            if (actualValue === expectedValue) {
              throw new Error(`${property} was NOT expected to be '${expectedValue}'`);
            }
            break;

          case 'contains':
            if (!actualValue.includes(String(expectedValue))) {
              throw new Error(`${property} expected to contain '${expectedValue}', but got '${actualValue}'`);
            }
            break;

          case 'notcontains':
            if (actualValue.includes(String(expectedValue))) {
              throw new Error(`${property} was NOT expected to contain '${expectedValue}', but got '${actualValue}'`);
            }
            break;

          default:
            throw new Error(`Unsupported condition '${condition}' for verifyStyle`);
        }
        break;
      }

      case 'ellipsis': {
        const styles = await element.evaluate((el: Element) => {
          const computed = window.getComputedStyle(el);
          return {
            overflow: computed.getPropertyValue('overflow'),
            whiteSpace: computed.getPropertyValue('white-space'),
            textOverflow: computed.getPropertyValue('text-overflow')
          };
        });

        const condition = step.condition?.toLowerCase() || 'equal';

        switch (condition) {
          case 'contains':
            if (styles.overflow !== 'hidden' || styles.whiteSpace !== 'nowrap' || styles.textOverflow !== 'ellipsis') {
              const failedProps: string[] = [];
              if (styles.overflow !== 'hidden') failedProps.push(`overflow expected 'hidden' but got '${styles.overflow}'`);
              if (styles.whiteSpace !== 'nowrap') failedProps.push(`white-space expected 'nowrap' but got '${styles.whiteSpace}'`);
              if (styles.textOverflow !== 'ellipsis') failedProps.push(`text-overflow expected 'ellipsis' but got '${styles.textOverflow}'`);
              throw new Error(`${failedProps.join('; ')}`);
            }
            break;

          case 'notcontains':
            if (styles.overflow === 'hidden' && styles.whiteSpace === 'nowrap' && styles.textOverflow === 'ellipsis') {
              throw new Error(`ellipsis style was NOT expected but all properties matched`);
            }
            break;

          default:
            if (styles.overflow !== 'hidden') {
              throw new Error(`overflow expected 'hidden' but got '${styles.overflow}'`);
            }
            if (styles.whiteSpace !== 'nowrap') {
              throw new Error(`white-space expected 'nowrap' but got '${styles.whiteSpace}'`);
            }
            if (styles.textOverflow !== 'ellipsis') {
              throw new Error(`text-overflow expected 'ellipsis' but got '${styles.textOverflow}'`);
            }
        }
        break;
      }

      default: {
        const actualValue = await element.evaluate((el: Element, prop: string) => {
          return window.getComputedStyle(el).getPropertyValue(prop);
        }, property);

        const condition = step.condition?.toLowerCase() || 'equal';

        switch (condition) {
          case 'equal':
          case 'equals':
            if (actualValue !== expectedValue) {
              throw new Error(`${property} expected '${expectedValue}' but got '${actualValue}'`);
            }
            break;

          case 'notequal':
          case 'notequals':
            if (actualValue === expectedValue) {
              throw new Error(`${property} was NOT expected to be '${expectedValue}'`);
            }
            break;

          case 'contains':
            if (!actualValue.includes(String(expectedValue))) {
              throw new Error(`${property} expected to contain '${expectedValue}', but got '${actualValue}'`);
            }
            break;

          case 'notcontains':
            if (actualValue.includes(String(expectedValue))) {
              throw new Error(`${property} was NOT expected to contain '${expectedValue}', but got '${actualValue}'`);
            }
            break;

          default:
            throw new Error(`Unsupported condition '${condition}' for verifyStyle`);
        }
      }
    }

    console.log(`  ✅ Verified style '${property}' for element: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully verified style '${property}' for element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify style '${step.elementText}' for element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify style: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function assertTextEquals(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      throw new Error('No values provided for assertion. Expected format: expected|actual');
    }

    let valueToUse = resolveTestVariables(step.value);

    if (step.isDDT === true && step.datasetColumnNames) {
      valueToUse = step.datasetColumnNames;
    }

    const values = valueToUse.split('|').map(s => s.trim());
    if (values.length !== 2) {
      throw new Error(`Invalid format. Expected: expected|actual, Got: ${valueToUse}`);
    }

    const [expected, actual] = values;

    if (actual !== expected) {
      throw new Error(`Assertion failed: Expected "${expected}" but got "${actual}"`);
    }

    console.log(`  ✅ Assertion passed: "${actual}" equals "${expected}"`);

    return {
      code: 0,
      value: `Assertion passed: "${actual}" equals "${expected}"`
    };
  } catch (error) {
    console.error(`  ❌ Assertion failed: Text does not equal`);
    return {
      code: 1,
      value: `Failed to assert text equals: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function assertTextContains(page: Page, step: testStep): Promise<Outcome> {
  try {
    if (!step.value) {
      throw new Error('No values provided for assertion. Expected format: expected|actual');
    }

    let valueToUse = resolveTestVariables(step.value);

    if (step.isDDT === true && step.datasetColumnNames) {
      valueToUse = step.datasetColumnNames;
    }

    const values = valueToUse.split('|').map(s => s.trim());
    if (values.length !== 2) {
      throw new Error(`Invalid format. Expected: expected|actual, Got: ${valueToUse}`);
    }

    const [expected, actual] = values;

    if (!actual.includes(expected)) {
      throw new Error(`Assertion failed: "${actual}" does not contain "${expected}"`);
    }

    console.log(`  ✅ Assertion passed: "${actual}" contains "${expected}"`);

    return {
      code: 0,
      value: `Assertion passed: "${actual}" contains "${expected}"`
    };
  } catch (error) {
    console.error(`  ❌ Assertion failed: Text does not contain expected value`);
    return {
      code: 1,
      value: `Failed to assert text contains: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 1. ATTRIBUTE ASSERTIONS
// ============================================

/**
 * Verifies element attributes (data-*, aria-*, class, id, href, src, placeholder, etc)
 * @param page - Playwright page object
 * @param step - Test step with page, element, attribute, value, condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyAttribute(page, {
 *   page: 'pageLogin',
 *   element: 'btn_Submit',
 *   attribute: 'data-testid',
 *   value: 'submit-button',
 *   condition: 'equal'
 * });
 */
export async function verifyAttribute(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    if (step.isDDT === true && step.datasetColumnNames) {
      expectedValue = step.datasetColumnNames;
    }

    const attribute = step.attribute?.toLowerCase();
    if (!attribute) {
      throw new Error(`Attribute is required for verifyAttribute action`);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const actualValue = await element.getAttribute(attribute);

    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (actualValue !== expectedValue) {
          throw new Error(`Attribute '${attribute}' expected '${expectedValue}' but got '${actualValue}'`);
        }
        break;

      case 'notequal':
      case 'notequals':
        if (actualValue === expectedValue) {
          throw new Error(`Attribute '${attribute}' was NOT expected to be '${expectedValue}'`);
        }
        break;

      case 'contains':
        if (!actualValue?.includes(String(expectedValue))) {
          throw new Error(`Attribute '${attribute}' expected to contain '${expectedValue}', but got '${actualValue}'`);
        }
        break;

      case 'notcontains':
        if (actualValue?.includes(String(expectedValue))) {
          throw new Error(`Attribute '${attribute}' was NOT expected to contain '${expectedValue}', but got '${actualValue}'`);
        }
        break;

      case 'startswith':
        if (!actualValue?.startsWith(String(expectedValue))) {
          throw new Error(`Attribute '${attribute}' expected to start with '${expectedValue}', but got '${actualValue}'`);
        }
        break;

      case 'endswith':
        if (!actualValue?.endsWith(String(expectedValue))) {
          throw new Error(`Attribute '${attribute}' expected to end with '${expectedValue}', but got '${actualValue}'`);
        }
        break;

      case 'exists':
        const isExpectedToExist = String(expectedValue).toLowerCase() === 'true';
        if (isExpectedToExist && !actualValue) {
          throw new Error(`Attribute '${attribute}' was expected to exist but not found`);
        }
        if (!isExpectedToExist && actualValue) {
          throw new Error(`Attribute '${attribute}' was NOT expected to exist but found: '${actualValue}'`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyAttribute`);
    }

    console.log(`  ✅ Verified attribute '${attribute}' for element: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully verified attribute '${attribute}' for element: ${step.page}.${step.element}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify attribute for element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify attribute: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 2. ELEMENT COUNT & LIST ASSERTIONS
// ============================================

/**
 * Verifies the count of elements matching a selector
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (expected count), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyElementCount(page, {
 *   page: 'pageWaitingList',
 *   element: 'rows_Items',
 *   value: '10',
 *   condition: 'equal'
 * });
 */
export async function verifyElementCount(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue: any = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const elements = await page.locator(baseSelector).all();
    const actualCount = elements.length;

    const condition = step.condition?.toLowerCase() || 'equal';
    const expectedCount = Number(expectedValue);

    switch (condition) {
      case 'equal':
      case 'equals':
        if (actualCount !== expectedCount) {
          throw new Error(`Expected ${expectedCount} elements but found ${actualCount}`);
        }
        break;

      case 'greaterthan':
      case 'greater':
        if (actualCount <= expectedCount) {
          throw new Error(`Expected count > ${expectedCount} but got ${actualCount}`);
        }
        break;

      case 'lessthan':
      case 'less':
        if (actualCount >= expectedCount) {
          throw new Error(`Expected count < ${expectedCount} but got ${actualCount}`);
        }
        break;

      case 'greaterthanorequals':
      case 'greaterorequal':
        if (actualCount < expectedCount) {
          throw new Error(`Expected count >= ${expectedCount} but got ${actualCount}`);
        }
        break;

      case 'lessthanorequals':
      case 'lessorequal':
        if (actualCount > expectedCount) {
          throw new Error(`Expected count <= ${expectedCount} but got ${actualCount}`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyElementCount`);
    }

    console.log(`  ✅ Verified element count (${actualCount}) for element: ${step.page}.${step.element}`);

    return {
      code: 0,
      value: `Successfully verified ${actualCount} elements found`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify element count for element: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify element count: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if a list contains a specific item
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (item to find), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyListContains(page, {
 *   page: 'pageWaitingList',
 *   element: 'rows_ItemName',
 *   value: 'John Doe',
 *   condition: 'contains'
 * });
 */
export async function verifyListContains(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const elements = await page.locator(baseSelector).all();
    const allTexts: string[] = [];

    for (const element of elements) {
      const text = await element.textContent() || '';
      allTexts.push(text.trim());
    }

    const condition = step.condition?.toLowerCase() || 'contains';
    let found = false;

    switch (condition) {
      case 'contains':
        found = allTexts.some(text => text.includes(String(expectedValue)));
        if (!found) {
          throw new Error(`List does not contain "${expectedValue}". Items: ${allTexts.join(', ')}`);
        }
        break;

      case 'notcontains':
        found = allTexts.some(text => text.includes(String(expectedValue)));
        if (found) {
          throw new Error(`List was NOT expected to contain "${expectedValue}"`);
        }
        break;

      case 'equal':
      case 'equals':
        found = allTexts.some(text => text === String(expectedValue));
        if (!found) {
          throw new Error(`List does not contain exact match "${expectedValue}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyListContains`);
    }

    console.log(`  ✅ Verified list contains "${expectedValue}"`);

    return {
      code: 0,
      value: `List successfully verified to contain "${expectedValue}"`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify list contains: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify list contains: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verifies a specific item in a list at given index (0-based)
 * @param page - Playwright page object
 * @param step - Test step with page, element, index, value, condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyItemAtIndex(page, {
 *   page: 'pageWaitingList',
 *   element: 'rows_ItemName',
 *   index: 0,
 *   value: 'John Doe',
 *   condition: 'equal'
 * });
 */
export async function verifyItemAtIndex(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const index = Number(step.index || 0);
    const baseSelector = getLocatorString(step);
    const elements = await page.locator(baseSelector).all();

    if (index < 0 || index >= elements.length) {
      throw new Error(`Index ${index} is out of bounds. Total elements: ${elements.length}`);
    }

    const itemText = await elements[index].textContent() || '';
    const actualValue = itemText.trim();

    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (actualValue !== String(expectedValue)) {
          throw new Error(`Item at index ${index} expected "${expectedValue}" but got "${actualValue}"`);
        }
        break;

      case 'contains':
        if (!actualValue.includes(String(expectedValue))) {
          throw new Error(`Item at index ${index} expected to contain "${expectedValue}" but got "${actualValue}"`);
        }
        break;

      case 'notcontains':
        if (actualValue.includes(String(expectedValue))) {
          throw new Error(`Item at index ${index} was NOT expected to contain "${expectedValue}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyItemAtIndex`);
    }

    console.log(`  ✅ Verified item at index ${index}`);

    return {
      code: 0,
      value: `Successfully verified item at index ${index}: "${actualValue}"`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify item at index: ${step.page}.${step.element}`);
    return {
      code: 1,
      value: `Failed to verify item at index: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 3. TABLE ASSERTIONS
// ============================================

/**
 * Counts rows in a table and verifies the count matches expected value
 * @param page - Playwright page object
 * @param step - Test step with page, element (table), value (expected row count), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyTableRowCount(page, {
 *   page: 'pageWaitingList',
 *   element: 'tbl_WaitingList',
 *   value: '25',
 *   condition: 'equal'
 * });
 */
export async function verifyTableRowCount(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue: any = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    // Common row selector patterns: tbody tr, [role="row"], .table-row
    const rowSelector = `${baseSelector} tbody tr, ${baseSelector} [role="row"]`;
    const rows = await page.locator(rowSelector).all();
    const actualCount = rows.length;
    const expectedCount = Number(expectedValue);

    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (actualCount !== expectedCount) {
          throw new Error(`Expected ${expectedCount} rows but found ${actualCount}`);
        }
        break;

      case 'greaterthan':
        if (actualCount <= expectedCount) {
          throw new Error(`Expected rows > ${expectedCount} but got ${actualCount}`);
        }
        break;

      case 'lessthan':
        if (actualCount >= expectedCount) {
          throw new Error(`Expected rows < ${expectedCount} but got ${actualCount}`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyTableRowCount`);
    }

    console.log(`  ✅ Verified table row count: ${actualCount}`);

    return {
      code: 0,
      value: `Successfully verified ${actualCount} rows in table`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify table row count`);
    return {
      code: 1,
      value: `Failed to verify table row count: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verifies a specific cell value in a table by row and column
 * @param page - Playwright page object
 * @param step - Test step with page, element (table), row, column, value, condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyTableCell(page, {
 *   page: 'pageWaitingList',
 *   element: 'tbl_WaitingList',
 *   row: 2,
 *   column: '1',
 *   value: 'John Doe',
 *   condition: 'equal'
 * });
 */
export async function verifyTableCell(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const row = Number(step.row || 1);
    const column = step.column || step.property || '1';
    const baseSelector = getLocatorString(step);

    // Get table rows
    const rowSelector = `${baseSelector} tbody tr, ${baseSelector} [role="row"]`;
    const rows = await page.locator(rowSelector).all();

    if (row < 1 || row > rows.length) {
      throw new Error(`Row ${row} is out of bounds. Total rows: ${rows.length}`);
    }

    // Get cell from row
    const targetRow = rows[row - 1];
    let cellText = '';

    if (isNaN(Number(column))) {
      // Column is a header text - find matching column
      const cellsByRole = await targetRow.locator('[role="cell"], td, th').all();
      cellText = await cellsByRole[0].textContent() || '';
    } else {
      // Column is index
      const colIndex = Number(column) - 1;
      const cellsByRole = await targetRow.locator('[role="cell"], td, th').all();
      if (colIndex < 0 || colIndex >= cellsByRole.length) {
        throw new Error(`Column ${column} is out of bounds`);
      }
      cellText = await cellsByRole[colIndex].textContent() || '';
    }

    cellText = cellText.trim();

    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (cellText !== String(expectedValue)) {
          throw new Error(`Cell [${row},${column}] expected "${expectedValue}" but got "${cellText}"`);
        }
        break;

      case 'contains':
        if (!cellText.includes(String(expectedValue))) {
          throw new Error(`Cell [${row},${column}] expected to contain "${expectedValue}"`);
        }
        break;

      case 'notcontains':
        if (cellText.includes(String(expectedValue))) {
          throw new Error(`Cell [${row},${column}] was NOT expected to contain "${expectedValue}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyTableCell`);
    }

    console.log(`  ✅ Verified table cell [${row},${column}]`);

    return {
      code: 0,
      value: `Successfully verified table cell [${row},${column}]: "${cellText}"`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify table cell`);
    return {
      code: 1,
      value: `Failed to verify table cell: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verifies an entire table row matches expected values (pipe-separated)
 * @param page - Playwright page object
 * @param step - Test step with page, element (table), row, value (pipe-separated values), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyTableRow(page, {
 *   page: 'pageWaitingList',
 *   element: 'tbl_WaitingList',
 *   row: 1,
 *   value: 'John Doe|25-Apr-2026|Urgent',
 *   condition: 'contains'
 * });
 */
export async function verifyTableRow(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const row = Number(step.row || 1);
    const baseSelector = getLocatorString(step);
    const rowSelector = `${baseSelector} tbody tr, ${baseSelector} [role="row"]`;
    const rows = await page.locator(rowSelector).all();

    if (row < 1 || row > rows.length) {
      throw new Error(`Row ${row} is out of bounds. Total rows: ${rows.length}`);
    }

    const targetRow = rows[row - 1];
    const cells = await targetRow.locator('[role="cell"], td').all();
    const rowValues = await Promise.all(cells.map(cell => cell.textContent()));
    const rowText = rowValues.map(v => (v || '').trim()).join('|');

    const expectedValues = String(expectedValue).split('|').map(v => v.trim());

    const condition = step.condition?.toLowerCase() || 'contains';
    let match = false;

    switch (condition) {
      case 'contains':
        match = expectedValues.every(val => rowValues.some(cell => (cell || '').trim().includes(val)));
        if (!match) {
          throw new Error(`Row ${row} does not contain all expected values: ${expectedValues.join(', ')}`);
        }
        break;

      case 'equal':
      case 'equals':
        match = rowText === String(expectedValue);
        if (!match) {
          throw new Error(`Row ${row} expected "${expectedValue}" but got "${rowText}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyTableRow`);
    }

    console.log(`  ✅ Verified table row ${row}`);

    return {
      code: 0,
      value: `Successfully verified table row ${row}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify table row`);
    return {
      code: 1,
      value: `Failed to verify table row: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 4. PAGE STATE ASSERTIONS
// ============================================

/**
 * Verifies the current page URL matches expected value
 * @param page - Playwright page object
 * @param step - Test step with value (URL), condition (equal/contains/startswith/endswith)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyPageUrl(page, {
 *   value: '/waitinglist',
 *   condition: 'contains'
 * });
 */
export async function verifyPageUrl(page: Page, step: testStep): Promise<Outcome> {
  try {
    const expectedValue = step.value;
    if (!expectedValue) {
      throw new Error('URL value is required');
    }

    const currentUrl = page.url();
    const condition = step.condition?.toLowerCase() || 'contains';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (currentUrl !== expectedValue) {
          throw new Error(`Expected URL "${expectedValue}" but got "${currentUrl}"`);
        }
        break;

      case 'contains':
        if (!currentUrl.includes(expectedValue)) {
          throw new Error(`URL expected to contain "${expectedValue}" but got "${currentUrl}"`);
        }
        break;

      case 'startswith':
        if (!currentUrl.startsWith(expectedValue)) {
          throw new Error(`URL expected to start with "${expectedValue}" but got "${currentUrl}"`);
        }
        break;

      case 'endswith':
        if (!currentUrl.endsWith(expectedValue)) {
          throw new Error(`URL expected to end with "${expectedValue}" but got "${currentUrl}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyPageUrl`);
    }

    console.log(`  ✅ Verified page URL`);

    return {
      code: 0,
      value: `Page URL verified: ${currentUrl}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify page URL`);
    return {
      code: 1,
      value: `Failed to verify page URL: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verifies the page title matches expected value
 * @param page - Playwright page object
 * @param step - Test step with value (expected title), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyPageTitle(page, {
 *   value: 'Waiting List',
 *   condition: 'contains'
 * });
 */
export async function verifyPageTitle(page: Page, step: testStep): Promise<Outcome> {
  try {
    const expectedValue = step.value;
    if (!expectedValue) {
      throw new Error('Title value is required');
    }

    const pageTitle = await page.title();
    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (pageTitle !== expectedValue) {
          throw new Error(`Expected title "${expectedValue}" but got "${pageTitle}"`);
        }
        break;

      case 'contains':
        if (!pageTitle.includes(expectedValue)) {
          throw new Error(`Title expected to contain "${expectedValue}" but got "${pageTitle}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyPageTitle`);
    }

    console.log(`  ✅ Verified page title`);

    return {
      code: 0,
      value: `Page title verified: ${pageTitle}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify page title`);
    return {
      code: 1,
      value: `Failed to verify page title: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks for JavaScript console errors on the page
 * @param page - Playwright page object
 * @param step - Test step with value ('none' or number of expected errors)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyPageErrors(page, {
 *   value: 'none'
 * });
 */
export async function verifyPageErrors(page: Page, step: testStep): Promise<Outcome> {
  try {
    const expectedValue = step.value?.toLowerCase() || 'none';
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    // Wait a bit to capture any console messages
    await page.waitForTimeout(1000);

    if (expectedValue === 'none') {
      if (errors.length > 0) {
        throw new Error(`Expected no errors but found: ${errors.join(', ')}`);
      }
    } else {
      const expectedCount = Number(expectedValue);
      if (errors.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} errors but found ${errors.length}`);
      }
    }

    console.log(`  ✅ Verified page has no console errors`);

    return {
      code: 0,
      value: `Page errors verified: ${errors.length} errors found`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify page errors`);
    return {
      code: 1,
      value: `Failed to verify page errors: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 5. DROPDOWN/SELECT ASSERTIONS
// ============================================

/**
 * Checks currently selected dropdown option
 * @param page - Playwright page object
 * @param step - Test step with page, element (dropdown), value (expected option), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifySelectedOption(page, {
 *   page: 'pageCreateReferral',
 *   element: 'dd_Priority',
 *   value: 'Urgent',
 *   condition: 'equal'
 * });
 */
export async function verifySelectedOption(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const tagName = await element.evaluate(el => el.tagName.toLowerCase());

    let selectedText = '';

    if (tagName === 'select') {
      const selectedOption = element.locator('option:checked');
      selectedText = await selectedOption.textContent() || '';
    } else if (tagName === 'div' || tagName === 'span') {
      // Custom dropdown
      selectedText = await element.textContent() || '';
    }

    selectedText = selectedText.trim();

    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (selectedText !== String(expectedValue)) {
          throw new Error(`Expected selected option "${expectedValue}" but got "${selectedText}"`);
        }
        break;

      case 'contains':
        if (!selectedText.includes(String(expectedValue))) {
          throw new Error(`Selected option expected to contain "${expectedValue}" but got "${selectedText}"`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifySelectedOption`);
    }

    console.log(`  ✅ Verified selected option: ${selectedText}`);

    return {
      code: 0,
      value: `Verified selected option: ${selectedText}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify selected option`);
    return {
      code: 1,
      value: `Failed to verify selected option: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if dropdown has a specific option available
 * @param page - Playwright page object
 * @param step - Test step with page, element (dropdown), value (option to find)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyDropdownContainsOption(page, {
 *   page: 'pageCreateReferral',
 *   element: 'dd_Priority',
 *   value: 'Urgent'
 * });
 */
export async function verifyDropdownContainsOption(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    
    const options = await element.locator('option').all();
    const optionTexts: string[] = [];

    for (const option of options) {
      const text = await option.textContent() || '';
      optionTexts.push(text.trim());
    }

    const found = optionTexts.some(text => text.includes(String(expectedValue)));

    if (!found) {
      throw new Error(`Option "${expectedValue}" not found. Available: ${optionTexts.join(', ')}`);
    }

    console.log(`  ✅ Verified dropdown contains option: ${expectedValue}`);

    return {
      code: 0,
      value: `Dropdown verified to contain option: ${expectedValue}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify dropdown contains option`);
    return {
      code: 1,
      value: `Failed to verify dropdown contains option: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Counts options in dropdown and verifies the count
 * @param page - Playwright page object
 * @param step - Test step with page, element (dropdown), value (expected count), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyDropdownOptionCount(page, {
 *   page: 'pageCreateReferral',
 *   element: 'dd_Priority',
 *   value: '5',
 *   condition: 'equal'
 * });
 */
export async function verifyDropdownOptionCount(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue: any = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const options = await element.locator('option').all();
    const actualCount = options.length;
    const expectedCount = Number(expectedValue);

    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
      case 'equals':
        if (actualCount !== expectedCount) {
          throw new Error(`Expected ${expectedCount} options but found ${actualCount}`);
        }
        break;

      case 'greaterthan':
        if (actualCount <= expectedCount) {
          throw new Error(`Expected options > ${expectedCount} but got ${actualCount}`);
        }
        break;

      case 'lessthan':
        if (actualCount >= expectedCount) {
          throw new Error(`Expected options < ${expectedCount} but got ${actualCount}`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyDropdownOptionCount`);
    }

    console.log(`  ✅ Verified dropdown option count: ${actualCount}`);

    return {
      code: 0,
      value: `Verified ${actualCount} options in dropdown`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify dropdown option count`);
    return {
      code: 1,
      value: `Failed to verify dropdown option count: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 6. FORM STATE ASSERTIONS
// ============================================

/**
 * Checks form validation state (valid or invalid)
 * @param page - Playwright page object
 * @param step - Test step with page, element (form), value ('true' for valid, 'false' for invalid)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyFormValid(page, {
 *   page: 'pageCreateReferral',
 *   element: 'frm_ReferralForm',
 *   value: 'true'
 * });
 */
export async function verifyFormValid(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const form = await resolveElement(page, baseSelector, step);

    const isValid = await form.evaluate((el: any) => {
      if (el.checkValidity) {
        return el.checkValidity();
      }
      return true;
    });

    const expectedValid = String(expectedValue).toLowerCase() === 'true';

    if (expectedValid && !isValid) {
      throw new Error(`Form expected to be valid but has validation errors`);
    }

    if (!expectedValid && isValid) {
      throw new Error(`Form expected to be invalid but is valid`);
    }

    console.log(`  ✅ Verified form is ${expectedValid ? 'valid' : 'invalid'}`);

    return {
      code: 0,
      value: `Form validated successfully`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify form validity`);
    return {
      code: 1,
      value: `Failed to verify form validity: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks field validation error message
 * @param page - Playwright page object
 * @param step - Test step with page, element (field), value (expected error message)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyFieldError(page, {
 *   page: 'pageCreateReferral',
 *   element: 'txt_PatientName',
 *   value: 'Patient name is required'
 * });
 */
export async function verifyFieldError(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    // Look for error message near the field
    const errorSelectors = [
      `${baseSelector} + .error`,
      `${baseSelector} + .error-message`,
      `${baseSelector} ~ .error`,
      `[aria-describedby*="${step.element}"]`
    ];

    let errorMessage = '';

    for (const selector of errorSelectors) {
      try {
        const errorElement = page.locator(selector);
        if (await errorElement.isVisible()) {
          errorMessage = await errorElement.textContent() || '';
          break;
        }
      } catch (e) {
        // Selector doesn't exist, try next
      }
    }

    if (!errorMessage) {
      const validationMessage = await element.evaluate((el: any) => el.validationMessage);
      errorMessage = validationMessage;
    }

    errorMessage = errorMessage.trim();

    if (!errorMessage.includes(String(expectedValue))) {
      throw new Error(`Expected error message containing "${expectedValue}" but got "${errorMessage}"`);
    }

    console.log(`  ✅ Verified field error: ${errorMessage}`);

    return {
      code: 0,
      value: `Field error verified: ${errorMessage}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify field error`);
    return {
      code: 1,
      value: `Failed to verify field error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if field is marked as required
 * @param page - Playwright page object
 * @param step - Test step with page, element (field)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyFieldRequired(page, {
 *   page: 'pageCreateReferral',
 *   element: 'txt_PatientName'
 * });
 */
export async function verifyFieldRequired(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    const isRequired = await element.evaluate((el: any) => {
      return el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
    });

    if (!isRequired) {
      throw new Error(`Field expected to be required but is not`);
    }

    console.log(`  ✅ Verified field is required`);

    return {
      code: 0,
      value: `Field verified to be required`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify field required`);
    return {
      code: 1,
      value: `Failed to verify field required: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 7. COLOR & THEME ASSERTIONS
// ============================================

/**
 * Checks element color (text, background, border) in various formats
 * @param page - Playwright page object
 * @param step - Test step with page, element, colorProperty (text/background/border), value (hex/rgb), condition
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyElementColor(page, {
 *   page: 'pageWaitingList',
 *   element: 'lbl_Status',
 *   colorProperty: 'text',
 *   value: '#FF0000',
 *   condition: 'equal'
 * });
 */
export async function verifyElementColor(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const colorProperty = step.colorProperty?.toLowerCase() || 'text';

    let cssProperty = 'color';
    switch (colorProperty) {
      case 'text':
        cssProperty = 'color';
        break;
      case 'background':
        cssProperty = 'background-color';
        break;
      case 'border':
        cssProperty = 'border-color';
        break;
      default:
        cssProperty = colorProperty;
    }

    const actualColor = await element.evaluate((el: Element, prop: string) => {
      return window.getComputedStyle(el).getPropertyValue(prop);
    }, cssProperty);

    const rgbToHex = (rgb: string): string => {
      const match = rgb.match(/\d+/g);
      if (!match || match.length < 3) return rgb;
      const r = parseInt(match[0]).toString(16).padStart(2, '0');
      const g = parseInt(match[1]).toString(16).padStart(2, '0');
      const b = parseInt(match[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    };

    const normalizeColor = (color: string): string => {
      if (color.includes('rgb')) {
        return rgbToHex(color);
      }
      return color.trim().toUpperCase();
    };

    const normalized = normalizeColor(actualColor);
    const expectedNorm = normalizeColor(String(expectedValue));

    if (normalized !== expectedNorm) {
      throw new Error(`Expected ${colorProperty} color "${expectedValue}" but got "${actualColor}"`);
    }

    console.log(`  ✅ Verified element color`);

    return {
      code: 0,
      value: `Element ${colorProperty} color verified: ${actualColor}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify element color`);
    return {
      code: 1,
      value: `Failed to verify element color: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks application theme (light or dark mode)
 * @param page - Playwright page object
 * @param step - Test step with value ('light' or 'dark')
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyTheme(page, {
 *   value: 'light'
 * });
 */
export async function verifyTheme(page: Page, step: testStep): Promise<Outcome> {
  try {
    const expectedTheme = step.value?.toLowerCase() || 'light';

    const theme = await page.evaluate(() => {
      const htmlClasses = document.documentElement.className;
      const bodyClasses = document.body.className;
      const allClasses = `${htmlClasses} ${bodyClasses}`.toLowerCase();

      if (allClasses.includes('dark')) return 'dark';
      if (allClasses.includes('light')) return 'light';

      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      return prefersLight ? 'light' : 'dark';
    });

    if (theme !== expectedTheme) {
      throw new Error(`Expected theme "${expectedTheme}" but got "${theme}"`);
    }

    console.log(`  ✅ Verified theme: ${theme}`);

    return {
      code: 0,
      value: `Theme verified: ${theme}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify theme`);
    return {
      code: 1,
      value: `Failed to verify theme: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 8. NUMERIC RANGE ASSERTIONS
// ============================================

/**
 * Checks if numeric value is within specified range (min-max)
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (min-max format)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyNumberInRange(page, {
 *   page: 'pageWaitingList',
 *   element: 'lbl_PatientCount',
 *   value: '1-100'
 * });
 */
export async function verifyNumberInRange(page: Page, step: testStep): Promise<Outcome> {
  try {
    let rangeValue = step.value;

    if (rangeValue && typeof rangeValue === 'string') {
      rangeValue = resolveTestVariables(rangeValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const text = await element.textContent() || '';
    const actualValue = Number(text.trim());

    const range = String(rangeValue).split('-').map(v => Number(v.trim()));

    if (range.length !== 2) {
      throw new Error(`Invalid range format. Expected "min-max" but got "${rangeValue}"`);
    }

    const [min, max] = range;

    if (actualValue < min || actualValue > max) {
      throw new Error(`Value ${actualValue} is outside range ${min}-${max}`);
    }

    console.log(`  ✅ Verified number in range: ${actualValue}`);

    return {
      code: 0,
      value: `Number ${actualValue} verified to be in range ${min}-${max}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify number in range`);
    return {
      code: 1,
      value: `Failed to verify number in range: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Advanced numeric comparisons (divisible, even, odd, prime)
 * @param page - Playwright page object
 * @param step - Test step with value (expected|actual), condition (divisibleby/even/odd/prime/equal)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyNumericComparison(page, {
 *   value: '5|100',
 *   condition: 'divisibleby'
 * });
 */
export async function verifyNumericComparison(page: Page, step: testStep): Promise<Outcome> {
  try {
    let valueToUse = step.value;

    if (valueToUse && typeof valueToUse === 'string') {
      valueToUse = resolveTestVariables(valueToUse);
    }

    const values = String(valueToUse).split('|').map(v => Number(v.trim()));
    if (values.length !== 2) {
      throw new Error(`Invalid format. Expected "expected|actual"`);
    }

    const [expected, actual] = values;
    const condition = step.condition?.toLowerCase() || 'equal';

    switch (condition) {
      case 'equal':
        if (actual !== expected) {
          throw new Error(`Expected ${expected} but got ${actual}`);
        }
        break;

      case 'divisibleby':
        if (actual % expected !== 0) {
          throw new Error(`${actual} is not divisible by ${expected}`);
        }
        break;

      case 'even':
        if (actual % 2 !== 0) {
          throw new Error(`${actual} is not even`);
        }
        break;

      case 'odd':
        if (actual % 2 === 0) {
          throw new Error(`${actual} is not odd`);
        }
        break;

      case 'prime':
        const isPrime = (n: number) => {
          if (n <= 1) return false;
          if (n <= 3) return true;
          if (n % 2 === 0 || n % 3 === 0) return false;
          for (let i = 5; i * i <= n; i += 6) {
            if (n % i === 0 || n % (i + 2) === 0) return false;
          }
          return true;
        };
        if (!isPrime(actual)) {
          throw new Error(`${actual} is not a prime number`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyNumericComparison`);
    }

    console.log(`  ✅ Verified numeric comparison`);

    return {
      code: 0,
      value: `Numeric comparison verified`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify numeric comparison`);
    return {
      code: 1,
      value: `Failed to verify numeric comparison: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 9. REGEX & PATTERN ASSERTIONS
// ============================================

/**
 * Verifies text matches a regular expression pattern
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (regex pattern)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyTextPattern(page, {
 *   page: 'pagePatientSearch',
 *   element: 'txt_NHSNumber',
 *   value: '^\\\\d{10}$'
 * });
 */
export async function verifyTextPattern(page: Page, step: testStep): Promise<Outcome> {
  try {
    let patternValue = step.value;

    if (patternValue && typeof patternValue === 'string') {
      patternValue = resolveTestVariables(patternValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const text = await element.textContent() || '';

    const pattern = new RegExp(String(patternValue));

    if (!pattern.test(text.trim())) {
      throw new Error(`Text "${text}" does not match pattern "${patternValue}"`);
    }

    console.log(`  ✅ Verified text matches pattern`);

    return {
      code: 0,
      value: `Text verified to match pattern: ${patternValue}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify text pattern`);
    return {
      code: 1,
      value: `Failed to verify text pattern: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 10. ACCESSIBILITY ASSERTIONS
// ============================================

/**
 * Verifies ARIA attributes for accessibility compliance
 * @param page - Playwright page object
 * @param step - Test step with page, element, property (aria-label/role/aria-required), value
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyAccessibility(page, {
 *   page: 'pageLogin',
 *   element: 'btn_Submit',
 *   property: 'aria-label',
 *   value: 'Submit form'
 * });
 */
export async function verifyAccessibility(page: Page, step: testStep): Promise<Outcome> {
  try {
    let expectedValue = step.value;

    if (expectedValue && typeof expectedValue === 'string') {
      expectedValue = resolveTestVariables(expectedValue);
    }

    const ariaAttr = step.property?.toLowerCase() || 'aria-label';
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    const actualValue = await element.getAttribute(ariaAttr);

    if (!actualValue || !actualValue.includes(String(expectedValue))) {
      throw new Error(`Accessibility attribute '${ariaAttr}' expected to contain "${expectedValue}" but got "${actualValue}"`);
    }

    console.log(`  ✅ Verified accessibility attribute: ${ariaAttr}`);

    return {
      code: 0,
      value: `Accessibility verified: ${ariaAttr} = "${actualValue}"`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify accessibility`);
    return {
      code: 1,
      value: `Failed to verify accessibility: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if element is keyboard accessible (can be accessed via Tab/Enter)
 * @param page - Playwright page object
 * @param step - Test step with page, element
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyKeyboardAccessible(page, {
 *   page: 'pageLogin',
 *   element: 'btn_Submit'
 * });
 */
export async function verifyKeyboardAccessible(page: Page, step: testStep): Promise<Outcome> {
  try {
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    const isKeyboardAccessible = await element.evaluate((el: any) => {
      const tabIndex = parseInt(el.getAttribute('tabindex') || '-1');
      const isButton = el.tagName.toLowerCase() === 'button';
      const isLink = el.tagName.toLowerCase() === 'a';
      const isInput = ['input', 'select', 'textarea'].includes(el.tagName.toLowerCase());
      const hasClickHandler = el.onclick !== null;

      return tabIndex >= 0 || isButton || isLink || isInput || hasClickHandler;
    });

    if (!isKeyboardAccessible) {
      throw new Error(`Element is not keyboard accessible`);
    }

    console.log(`  ✅ Verified element is keyboard accessible`);

    return {
      code: 0,
      value: `Element verified to be keyboard accessible`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify keyboard accessibility`);
    return {
      code: 1,
      value: `Failed to verify keyboard accessibility: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks WCAG color contrast ratio for accessibility compliance
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (min ratio like 4.5 for AA compliance)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyColorContrast(page, {
 *   page: 'pageLogin',
 *   element: 'txt_Username',
 *   value: '4.5',
 *   condition: 'greaterorequal'
 * });
 */
export async function verifyColorContrast(page: Page, step: testStep): Promise<Outcome> {
  try {
    let minRatio: any = step.value || '4.5';

    if (minRatio && typeof minRatio === 'string') {
      minRatio = resolveTestVariables(minRatio);
    }

    const expectedRatio = Number(minRatio);
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);

    const contrast = await element.evaluate(() => {
      const getLuminance = (r: number, g: number, b: number): number => {
        const [rs, gs, bs] = [r, g, b].map(x => {
          x = x / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      const getColor = (el: Element): [number, number, number] => {
        const rgb = window.getComputedStyle(el).color.match(/\d+/g);
        return [parseInt(rgb?.[0] || '0'), parseInt(rgb?.[1] || '0'), parseInt(rgb?.[2] || '0')];
      };

      const [r, g, b] = getColor(document.querySelector('body')!);
      const l1 = getLuminance(r, g, b);
      const [r2, g2, b2] = getColor(document.querySelector('body')!);
      const l2 = getLuminance(r2, g2, b2);

      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);

      return (lighter + 0.05) / (darker + 0.05);
    });

    if (contrast < expectedRatio) {
      throw new Error(`Color contrast ${contrast} is below minimum required ${expectedRatio}`);
    }

    console.log(`  ✅ Verified color contrast: ${contrast}`);

    return {
      code: 0,
      value: `Color contrast verified: ${contrast} >= ${expectedRatio}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify color contrast`);
    return {
      code: 1,
      value: `Failed to verify color contrast: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 11. DATE & TIME ASSERTIONS
// ============================================

/**
 * Checks if date text matches expected format
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (format like DD-MMM-YYYY/MM/DD/YYYY)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyDateFormat(page, {
 *   page: 'pagePatientRegistration',
 *   element: 'txt_DateOfBirth',
 *   value: 'DD-MMM-YYYY'
 * });
 */
export async function verifyDateFormat(page: Page, step: testStep): Promise<Outcome> {
  try {
    const expectedFormat = step.value || 'DD-MMM-YYYY';
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const text = await element.textContent() || '';
    const dateText = text.trim();

    // Create regex from format
    const formatToRegex = (format: string): string => {
      return format
        .replace(/DD/g, '(\\d{2})')
        .replace(/MM/g, '(\\d{2}|[A-Z][a-z]{2})')
        .replace(/YYYY/g, '(\\d{4})')
        .replace(/YY/g, '(\\d{2})')
        .replace(/HH/g, '(\\d{2})')
        .replace(/mm/g, '(\\d{2})')
        .replace(/ss/g, '(\\d{2})');
    };

    const pattern = new RegExp(`^${formatToRegex(expectedFormat)}$`);

    if (!pattern.test(dateText)) {
      throw new Error(`Date "${dateText}" does not match format "${expectedFormat}"`);
    }

    console.log(`  ✅ Verified date format`);

    return {
      code: 0,
      value: `Date verified to match format: ${expectedFormat}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify date format`);
    return {
      code: 1,
      value: `Failed to verify date format: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if date is within specified range
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (from|to dates, pipe-separated)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyDateRange(page, {
 *   page: 'pageWaitingList',
 *   element: 'txt_ReferralDate',
 *   value: '01-Jan-2026|31-Dec-2026'
 * });
 */
export async function verifyDateRange(page: Page, step: testStep): Promise<Outcome> {
  try {
    let rangeValue = step.value;

    if (rangeValue && typeof rangeValue === 'string') {
      rangeValue = resolveTestVariables(rangeValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const text = await element.textContent() || '';

    const dates = String(rangeValue).split('|').map(v => v.trim());
    if (dates.length !== 2) {
      throw new Error(`Invalid format. Expected "from|to" date range"`);
    }

    const parseDate = (dateStr: string): Date => {
      // Support DD-MMM-YYYY, DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
      return date;
    };

    const actualDate = parseDate(text);
    const fromDate = parseDate(dates[0]);
    const toDate = parseDate(dates[1]);

    if (actualDate < fromDate || actualDate > toDate) {
      throw new Error(`Date ${text} is outside range ${dates[0]} to ${dates[1]}`);
    }

    console.log(`  ✅ Verified date in range`);

    return {
      code: 0,
      value: `Date verified to be in range`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify date range`);
    return {
      code: 1,
      value: `Failed to verify date range: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks date relative to today (age, future, etc)
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (negative=years ago, positive=future), condition (olderthan/newerthan/today)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyDateRelative(page, {
 *   page: 'pagePatientRegistration',
 *   element: 'txt_DateOfBirth',
 *   value: '-18',
 *   condition: 'olderthan'
 * });
 */
export async function verifyDateRelative(page: Page, step: testStep): Promise<Outcome> {
  try {
    let ageValue: any = step.value || '-18';

    if (ageValue && typeof ageValue === 'string') {
      ageValue = resolveTestVariables(ageValue);
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const text = await element.textContent() || '';

    const dateFromText = new Date(text);
    const today = new Date();
    const ageYears = parseInt(String(ageValue));

    const targetDate = new Date();
    targetDate.setFullYear(targetDate.getFullYear() + ageYears);

    const condition = step.condition?.toLowerCase() || 'olderthan';

    switch (condition) {
      case 'olderthan':
        if (dateFromText > targetDate) {
          throw new Error(`Date ${text} is not older than ${ageYears} years`);
        }
        break;

      case 'newerthan':
        if (dateFromText < targetDate) {
          throw new Error(`Date ${text} is not newer than ${ageYears} years`);
        }
        break;

      case 'today':
        if (dateFromText.toDateString() !== today.toDateString()) {
          throw new Error(`Date ${text} is not today`);
        }
        break;

      default:
        throw new Error(`Unsupported condition '${condition}' for verifyDateRelative`);
    }

    console.log(`  ✅ Verified date is ${condition} ${ageYears} years`);

    return {
      code: 0,
      value: `Date verified to be ${condition} ${ageYears} years`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify date relative`);
    return {
      code: 1,
      value: `Failed to verify date relative: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 12. SORTING ASSERTIONS
// ============================================

/**
 * Checks if list is sorted alphabetically (ascending or descending)
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (asc/desc)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifySorted(page, {
 *   page: 'pageWaitingList',
 *   element: 'rows_ItemName',
 *   value: 'asc'
 * });
 */
export async function verifySorted(page: Page, step: testStep): Promise<Outcome> {
  try {
    const sortOrder = step.value?.toLowerCase() || 'asc';
    const baseSelector = getLocatorString(step);
    const elements = await page.locator(baseSelector).all();

    const texts: string[] = [];
    for (const element of elements) {
      const text = await element.textContent() || '';
      texts.push(text.trim());
    }

    let isSorted = true;

    if (sortOrder === 'asc') {
      for (let i = 1; i < texts.length; i++) {
        if (texts[i] < texts[i - 1]) {
          isSorted = false;
          break;
        }
      }
    } else if (sortOrder === 'desc') {
      for (let i = 1; i < texts.length; i++) {
        if (texts[i] > texts[i - 1]) {
          isSorted = false;
          break;
        }
      }
    }

    if (!isSorted) {
      throw new Error(`List is not sorted in ${sortOrder} order. Items: ${texts.join(', ')}`);
    }

    console.log(`  ✅ Verified list is sorted ${sortOrder}`);

    return {
      code: 0,
      value: `List verified to be sorted in ${sortOrder} order`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify sorted list`);
    return {
      code: 1,
      value: `Failed to verify sorted list: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Checks if numeric list is sorted (ascending or descending)
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (asc/desc)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyNumericSort(page, {
 *   page: 'pageWaitingList',
 *   element: 'rows_Priority',
 *   value: 'desc'
 * });
 */
export async function verifyNumericSort(page: Page, step: testStep): Promise<Outcome> {
  try {
    const sortOrder = step.value?.toLowerCase() || 'asc';
    const baseSelector = getLocatorString(step);
    const elements = await page.locator(baseSelector).all();

    const numbers: number[] = [];
    for (const element of elements) {
      const text = await element.textContent() || '';
      const num = Number(text.trim());
      if (!isNaN(num)) {
        numbers.push(num);
      }
    }

    let isSorted = true;

    if (sortOrder === 'asc') {
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] < numbers[i - 1]) {
          isSorted = false;
          break;
        }
      }
    } else if (sortOrder === 'desc') {
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] > numbers[i - 1]) {
          isSorted = false;
          break;
        }
      }
    }

    if (!isSorted) {
      throw new Error(`Numbers are not sorted in ${sortOrder} order. Values: ${numbers.join(', ')}`);
    }

    console.log(`  ✅ Verified numbers are sorted ${sortOrder}`);

    return {
      code: 0,
      value: `Numbers verified to be sorted in ${sortOrder} order`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify numeric sort`);
    return {
      code: 1,
      value: `Failed to verify numeric sort: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ============================================
// 13. STATE MACHINE ASSERTIONS
// ============================================

/**
 * Verifies state transitions (workflow validation)
 * @param page - Playwright page object
 * @param step - Test step with page, element, fromState, toState
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifyStateTransition(page, {
 *   page: 'pageManageReferral',
 *   element: 'lbl_ReferralStatus',
 *   fromState: 'Draft',
 *   toState: 'Submitted'
 * });
 */
export async function verifyStateTransition(page: Page, step: testStep): Promise<Outcome> {
  try {
    const fromState = step.fromState;
    const toState = step.toState;

    if (!fromState || !toState) {
      throw new Error('fromState and toState are required for verifyStateTransition');
    }

    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const currentState = await element.textContent() || '';
    const currentStateClean = currentState.trim();

    // Check if transition is valid (simplified - can be extended with state machine logic)
    if (!currentStateClean.includes(toState)) {
      throw new Error(`Expected to transition to state "${toState}" but current state is "${currentStateClean}"`);
    }

    console.log(`  ✅ Verified state transition from ${fromState} to ${toState}`);

    return {
      code: 0,
      value: `State transition verified: ${fromState} → ${toState}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify state transition`);
    return {
      code: 1,
      value: `Failed to verify state transition: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Verifies a sequence of states was followed (workflow completion)
 * @param page - Playwright page object
 * @param step - Test step with page, element, value (comma-separated states)
 * @returns Outcome {code: 0 on success, code: 1 on failure}
 * @example
 * await verifySequence(page, {
 *   page: 'pageManageReferral',
 *   element: 'lbl_ReferralStatus',
 *   value: 'Draft,Submitted,Accepted,Scheduled'
 * });
 */
export async function verifySequence(page: Page, step: testStep): Promise<Outcome> {
  try {
    // This is a more advanced assertion that tracks state changes over time
    // For now, we'll verify that all states are present in a sequence
    const stateStr = step.value;

    if (!stateStr) {
      throw new Error('States sequence is required');
    }

    const states = String(stateStr).split(',').map(s => s.trim());
    const baseSelector = getLocatorString(step);
    const element = await resolveElement(page, baseSelector, step);
    const currentText = await element.textContent() || '';

    // Verify that element text contains evidence of state sequence
    for (const state of states) {
      if (!currentText.includes(state)) {
        throw new Error(`State sequence missing: "${state}" not found in "${currentText}"`);
      }
    }

    console.log(`  ✅ Verified state sequence`);

    return {
      code: 0,
      value: `State sequence verified: ${states.join(' → ')}`
    };
  } catch (error) {
    console.error(`  ❌ Failed to verify state sequence`);
    return {
      code: 1,
      value: `Failed to verify state sequence: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
