import { format } from 'date-fns';
import * as os from 'os';

/**
 * Dynamic variable substitution system
 * Replaces placeholder variables with runtime values
 * 
 * Supported variables:
 * - _currentDate => current date in 'dd-MMM-yyyy' format
 * - _currentTime => current time in 'HH:mm' format
 * - _currentDateTime => combined date and time 'dd-MMM-yyyy HH:mm'
 * - _currentDevice => current system hostname
 * - _randomNumber => random 6-digit number
 * - _randomString => random 8-character string
 * - _uuid => UUID v4
 * 
 * Usage:
 *   "User_{{_currentDate}}_{{_randomNumber}}" => "User_05-May-2026_483921"
 *   "Test_{{_currentTime}}" => "Test_14:32"
 */

/**
 * Generates a random number with specified digits
 */
function generateRandomNumber(digits: number = 6): string {
    return Math.floor(Math.random() * Math.pow(10, digits))
        .toString()
        .padStart(digits, '0');
}

/**
 * Generates a random alphanumeric string
 */
function generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Substitutes all supported variables in a string
 * @param value - String containing variables to substitute
 * @param customVariables - Additional custom variables to substitute
 * @returns String with all variables replaced
 */
export function substituteVariables(
    value: string,
    customVariables: Record<string, any> = {}
): string {
    if (!value || typeof value !== 'string') {
        return value;
    }

    let result = value;
    const now = new Date();

    // Built-in variables
    const builtInVariables: Record<string, string> = {
        _currentDate: format(now, 'dd-MMM-yyyy'),
        _currentTime: format(now, 'HH:mm'),
        _currentDateTime: format(now, 'dd-MMM-yyyy HH:mm'),
        _currentDevice: os.hostname(),
        _randomNumber: generateRandomNumber(6),
        _randomString: generateRandomString(8),
        _uuid: generateUUID(),
    };

    // Combine built-in and custom variables
    const allVariables = { ...builtInVariables, ...customVariables };

    // Replace all variables
    for (const [key, value] of Object.entries(allVariables)) {
        if (value !== undefined && value !== null) {
            // Support both {{variable}} and _variable formats
            const regex1 = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            const regex2 = new RegExp(key, 'g');
            result = result.replace(regex1, String(value));
            result = result.replace(regex2, String(value));
        }
    }

    return result;
}

/**
 * Extracts all variable references from a string
 * @param value - String to search for variables
 * @returns Array of variable names found
 */
export function extractVariables(value: string): string[] {
    if (!value || typeof value !== 'string') {
        return [];
    }

    // Match both {{variable}} and _variable patterns
    const regex = /\{\{(_\w+)\}\}|(_\w+)/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(value)) !== null) {
        const varName = match[1] || match[2];
        if (!matches.includes(varName)) {
            matches.push(varName);
        }
    }

    return matches;
}

/**
 * Validates if all variables in a string are supported
 * @param value - String to validate
 * @param customVariables - Custom variables available
 * @returns Object with validation result and any unsupported variables
 */
export function validateVariables(
    value: string,
    customVariables: Record<string, any> = {}
): { valid: boolean; unsupported: string[] } {
    if (!value || typeof value !== 'string') {
        return { valid: true, unsupported: [] };
    }

    const builtInVariables = [
        '_currentDate',
        '_currentTime',
        '_currentDateTime',
        '_currentDevice',
        '_randomNumber',
        '_randomString',
        '_uuid',
    ];

    const supportedVariables = [
        ...builtInVariables,
        ...Object.keys(customVariables),
    ];

    const foundVariables = extractVariables(value);
    const unsupported = foundVariables.filter(
        (v) => !supportedVariables.includes(v)
    );

    return {
        valid: unsupported.length === 0,
        unsupported,
    };
}

export default {
    substituteVariables,
    extractVariables,
    validateVariables,
};
