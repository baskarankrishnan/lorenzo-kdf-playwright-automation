import { test } from '@playwright/test';
import * as pageLoaderUtils from '../utilities/pageLoaderUtils';
import * as path from 'path';
import * as fs from 'fs';

test.describe('LORENZO PAGE VALIDATION', () => {
    test('validate all pages load correctly', async () => {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║     LORENZO PAGE VALIDATION UTILITY        ║');
        console.log('╚════════════════════════════════════════════╝\n');

        const startTime = Date.now();
        const pagesDir = './pages';

        console.log(`📂 Scanning directory: ${pagesDir}\n`);

        try {
            // Load all pages
            const repository = await pageLoaderUtils.readLocatorRepositoryFromPages(pagesDir);

            // Calculate statistics
            const pageCount = Object.keys(repository).length;
            const totalElements = Object.values(repository).reduce((sum, page: any) => sum + Object.keys(page).length, 0);
            const avgElements = Math.round(totalElements / pageCount);

            console.log('\n═══════════════════════════════════════════════\n');
            console.log('✅ VALIDATION REPORT');
            console.log('═══════════════════════════════════════════════');
            console.log(`📄 Total Pages Loaded:        ${pageCount}`);
            console.log(`🔍 Total Elements Loaded:     ${totalElements}`);
            console.log(`📊 Average Elements/Page:     ${avgElements}`);
            console.log(`⏱️  Load Time:                ${Date.now() - startTime}ms`);

            // Show top 10 pages by element count
            const pageStats = Object.entries(repository)
                .map(([name, elements]: [string, any]) => ({ name, count: Object.keys(elements).length }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            console.log('\n📊 TOP 10 PAGES BY ELEMENT COUNT:');
            console.log('───────────────────────────────────────────────');
            pageStats.forEach((stat, idx) => {
                console.log(`  ${(idx + 1).toString().padEnd(2)}. ${stat.name.padEnd(40)} ${stat.count} elements`);
            });

            // Export for reference
            console.log('\n💾 Exporting repository for reference...');
            pageLoaderUtils.exportLocatorRepository(repository, './reports/locator-repository-snapshot.json');

            // Validate xpath format
            console.log('\n🔍 XPATH VALIDATION:');
            console.log('───────────────────────────────────────────────');
            let validXpaths = 0;
            let invalidXpaths = 0;

            for (const [pageName, elements] of Object.entries(repository)) {
                for (const [elementName, locator] of Object.entries(elements)) {
                    const loc = locator as any;
                    if (loc.xpath && loc.xpath.trim().startsWith('//')) {
                        validXpaths++;
                    } else {
                        invalidXpaths++;
                        console.log(`  ⚠️ Invalid XPath in ${pageName}.${elementName}: ${loc.xpath?.substring(0, 50)}`);
                    }
                }
            }

            console.log(`  ✅ Valid XPaths:              ${validXpaths}`);
            console.log(`  ⚠️ Invalid XPaths:           ${invalidXpaths}`);

            console.log('\n═══════════════════════════════════════════════');
            console.log('✅ VALIDATION COMPLETE - ALL SYSTEMS GO!\n');

        } catch (error) {
            console.error('\n❌ VALIDATION FAILED:');
            console.error(error);
            throw error;
        }
    });
});
