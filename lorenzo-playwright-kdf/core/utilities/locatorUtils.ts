import { executionContext, locatorEntry, locatorRepository, testStep } from './interfaceUtils';

export function getLocatorString(step: testStep): string {
    const repository = executionContext.getAllSuiteVariables().LOCATOR_REPOSITORY || '';
    const page = step.page;
    const element = step.element;

    if (!repository) {
        throw new Error('Repository is Empty! Check the source configurations.');
    }

    if (!page || !element) {
        throw new Error('Page and Element parameters are required to find a locator entry.');
    }
    const pageLocators = repository[page];
    if (!pageLocators) {
        throw new Error(`Page "${page}" not found in locator repository.`);
    }

    const locator = pageLocators[element];
    if (!locator) {
        throw new Error(`Element "${element}" not found for page "${page}" in locator repository.`);
    }

    return buildSelector(locator, `${page}.${element}`);
}

function buildSelector(elementLocator: locatorEntry, elementName?: string): string {
    if (elementLocator.testid) {
        return `[data-testid="${elementLocator.testid}"]`;
    } else if (elementLocator.id) {
        return `#${elementLocator.id}`;
    } else if (elementLocator.cssselector) {
        return elementLocator.cssselector;
    } else if (elementLocator.xpath) {
        return `xpath=${elementLocator.xpath}`;
    } else if (elementLocator.role) {
        return `[role="${elementLocator.role}"]`;
    } else {
        const elementIdentifier = elementName ? `for element: ${elementName}` : '';
        throw new Error(`No valid locator strategy found ${elementIdentifier}`);
    }
}
