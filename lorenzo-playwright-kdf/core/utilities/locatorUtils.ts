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
    let pageLocators = repository[page];
    if (!pageLocators) {
        // Case-insensitive fallback: page files may be named `PageXxx.js` (capital P)
        // while test data references `pageXxx`. The repository is keyed by filename, so
        // the casing can differ. Page names never collide by case only, so this is safe.
        const matchKey = Object.keys(repository).find(k => k.toLowerCase() === page.toLowerCase());
        if (matchKey) {
            pageLocators = repository[matchKey];
        }
    }
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
