import * as fs from 'fs';
import * as path from 'path';
import { locatorRepository } from './interfaceUtils';

/**
 * Detects the type of selector and returns with proper field
 */
function detectSelectorType(selector: string): {xpath?: string, cssselector?: string} {
    if (selector.startsWith('//')) {
        return { xpath: selector };
    } else if (selector.includes('[') || selector.includes('#') || selector.includes('.')) {
        return { cssselector: selector };
    } else {
        return { xpath: selector };
    }
}

/**
 * Dynamically loads all Lorenzo page JS files and converts them to locator repository format
 * @param pagesDir - Directory containing page JS files
 * @returns locatorRepository in format: {pageName: {elementName: {xpath, testid, id, etc}}}
 */
export async function readLocatorRepositoryFromPages(pagesDir: string = './pages'): Promise<locatorRepository> {
    const repository: locatorRepository = {};

    try {
        // Verify directory exists
        if (!fs.existsSync(pagesDir)) {
            console.warn(`⚠️ Pages directory not found: ${pagesDir}`);
            return repository;
        }

        // Get all JS files
        const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.js'));
        console.log(`📄 Found ${files.length} page files to load`);

        // Process each JS file
        for (const file of files) {
            const filePath = path.resolve(pagesDir, file);
            const pageName = path.basename(file, '.js');

            try {
                // Read file content
                const fileContent = fs.readFileSync(filePath, 'utf-8');

                // Extract all exports using improved regex
                // Handle double-quoted strings (may contain single quotes) and single-quoted strings (may contain double quotes)
                const exportRegex = /export\s+const\s+(\w+)\s*=\s*[\s\n]*(?:"([^"]*)"|'([^']*)')/gs;
                
                repository[pageName] = {};
                let match;

                while ((match = exportRegex.exec(fileContent)) !== null) {
                    const exportName = match[1];
                    const exportValue = (match[2] ?? match[3]).trim(); // match[2] = double-quoted, match[3] = single-quoted

                    if (typeof exportValue === 'string' && exportValue.length > 0) {
                        const selectorType = detectSelectorType(exportValue);
                        repository[pageName][exportName] = {
                            xpath: selectorType.xpath,
                            testid: undefined,
                            id: undefined,
                            cssselector: selectorType.cssselector,
                            role: undefined,
                            description: ''
                        };
                    }
                }

                const elementCount = Object.keys(repository[pageName]).length;
                console.log(`  ✅ ${pageName}: ${elementCount} elements loaded`);

            } catch (error) {
                console.error(`  ❌ Error loading page file ${file}:`, error);
            }
        }

        console.log(`\n✅ Total pages loaded: ${Object.keys(repository).length}`);
        return repository;

    } catch (error) {
        console.error('❌ Error reading pages directory:', error);
        return repository;
    }
}

/**
 * Converts a single page JS file to locator entries
 * @param filePath - Full path to the page JS file
 * @returns Object with element locators
 */
export async function loadSinglePageLocators(filePath: string): Promise<{[key: string]: any}> {
    const locators: {[key: string]: any} = {};

    try {
        const fileContent = fs.readFileSync(path.resolve(filePath), 'utf-8');
        
        // Extract all exports using improved regex
        const exportRegex = /export\s+const\s+(\w+)\s*=\s*[\s\n]*["']([^"']*?)["']/gs;
        let match;

        while ((match = exportRegex.exec(fileContent)) !== null) {
            const exportName = match[1];
            const exportValue = match[2].trim();

            const selectorType = detectSelectorType(exportValue);
            locators[exportName] = {
                xpath: selectorType.xpath,
                testid: undefined,
                id: undefined,
                cssselector: selectorType.cssselector,
                role: undefined,
                description: ''
            };
        }

        return locators;

    } catch (error) {
        console.error(`Error loading page file ${filePath}:`, error);
        return locators;
    }
}

/**
 * Exports locator repository to JSON for caching/debugging
 * @param repository - Locator repository to export
 * @param outputPath - Path to save the JSON file
 */
export function exportLocatorRepository(repository: locatorRepository, outputPath: string = './locator-repository.json'): void {
    try {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(repository, null, 2), 'utf-8');
        console.log(`✅ Locator repository exported to: ${outputPath}`);

    } catch (error) {
        console.error(`❌ Error exporting locator repository:`, error);
    }
}

/**
 * Imports a cached locator repository from JSON
 * @param filePath - Path to the JSON file
 * @returns Locator repository object
 */
export function importLocatorRepository(filePath: string): locatorRepository {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Cache file not found: ${filePath}`);
            return {};
        }

        const data = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(data);

    } catch (error) {
        console.error(`❌ Error importing locator repository:`, error);
        return {};
    }
}
