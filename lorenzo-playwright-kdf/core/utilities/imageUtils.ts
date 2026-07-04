import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export async function captureScreenshot(
    page: Page | null,
    screenshotName: string,
    screenshotDir: string,
    shouldCapture: boolean = true
): Promise<string> {
    if (!shouldCapture) {
        return '';
    }

    // Check if page is null or closed
    if (!page) {
        console.warn(`⚠️ Cannot capture screenshot "${screenshotName}" - page is null`);
        return '';
    }

    try {
        if (page.isClosed()) {
            console.warn(`⚠️ Cannot capture screenshot "${screenshotName}" - page is closed`);
            return '';
        }

        // Ensure the directory exists
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const fullPath = path.join(screenshotDir, `${screenshotName}.png`);

        // Capture the screenshot
        await page.screenshot({ path: fullPath, fullPage: true });

        return fullPath;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if error is due to page being closed
        if (errorMessage.includes('Target page, context or browser has been closed')) {
            console.warn(`⚠️ Cannot capture screenshot "${screenshotName}" - page was closed during capture`);
            return '';
        }

        console.error(`❌ Failed to capture screenshot "${screenshotName}": ${errorMessage}`);
        return '';
    }
}
