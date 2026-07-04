/**
 * Variable Manager - Persists and manages variables across test steps
 * 
 * Features:
 * - Save/retrieve variables by key
 * - Global scope and step-specific scope
 * - Variable substitution in strings
 * - Export/import variable state
 * - Logging and debugging
 * 
 * Usage:
 *   const varMgr = new VariableManager();
 *   varMgr.save('patientId', '12345', 'global');
 *   const id = varMgr.retrieve('patientId'); // '12345'
 *   const text = varMgr.substitute('Patient: {{patientId}}'); // 'Patient: 12345'
 */

export class VariableManager {
    private globalVariables: Map<string, any> = new Map();
    private stepVariables: Map<string, Map<string, any>> = new Map();
    private variableHistory: Array<{ timestamp: Date; action: string; key: string; value: any; scope: string }> = [];
    private logEnabled: boolean = true;

    constructor(logEnabled: boolean = true) {
        this.logEnabled = logEnabled;
        this.log('VariableManager initialized');
    }

    /**
     * Saves a variable
     * @param key - Variable name
     * @param value - Variable value
     * @param scope - 'global' (default) or step number
     */
    save(key: string, value: any, scope: string = 'global'): void {
        try {
            if (scope === 'global') {
                this.globalVariables.set(key, value);
            } else {
                if (!this.stepVariables.has(scope)) {
                    this.stepVariables.set(scope, new Map());
                }
                this.stepVariables.get(scope)!.set(key, value);
            }

            this.recordHistory('save', key, value, scope);
            this.log(`💾 Saved [${scope}] ${key} = ${JSON.stringify(value).substring(0, 100)}`);
        } catch (error) {
            console.error(`Error saving variable ${key}:`, error);
            throw error;
        }
    }

    /**
     * Retrieves a variable value
     * Searches: step scope first, then global scope
     * @param key - Variable name
     * @param scope - Optional specific scope to search
     * @returns Variable value or undefined
     */
    retrieve(key: string, scope?: string): any {
        try {
            // If specific scope provided, search only there
            if (scope) {
                if (scope === 'global') {
                    return this.globalVariables.get(key);
                }
                return this.stepVariables.get(scope)?.get(key);
            }

            // Otherwise search: step scope first, then global
            for (const stepMap of this.stepVariables.values()) {
                if (stepMap.has(key)) {
                    return stepMap.get(key);
                }
            }

            return this.globalVariables.get(key);
        } catch (error) {
            console.error(`Error retrieving variable ${key}:`, error);
            return undefined;
        }
    }

    /**
     * Checks if a variable exists
     */
    exists(key: string, scope?: string): boolean {
        if (scope) {
            if (scope === 'global') {
                return this.globalVariables.has(key);
            }
            return this.stepVariables.get(scope)?.has(key) ?? false;
        }

        // Check all scopes
        if (this.globalVariables.has(key)) {
            return true;
        }

        for (const stepMap of this.stepVariables.values()) {
            if (stepMap.has(key)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Deletes a variable
     */
    delete(key: string, scope?: string): boolean {
        try {
            if (scope) {
                if (scope === 'global') {
                    return this.globalVariables.delete(key);
                }
                return this.stepVariables.get(scope)?.delete(key) ?? false;
            }

            // Delete from all scopes
            let deleted = this.globalVariables.delete(key);
            for (const stepMap of this.stepVariables.values()) {
                if (stepMap.delete(key)) {
                    deleted = true;
                }
            }

            this.recordHistory('delete', key, undefined, scope || 'all');
            this.log(`🗑️ Deleted [${scope || 'all'}] ${key}`);
            return deleted;
        } catch (error) {
            console.error(`Error deleting variable ${key}:`, error);
            return false;
        }
    }

    /**
     * Clears all variables in a scope
     */
    clear(scope: string = 'global'): void {
        try {
            if (scope === 'global') {
                this.globalVariables.clear();
            } else if (scope === 'all') {
                this.globalVariables.clear();
                this.stepVariables.clear();
            } else {
                this.stepVariables.delete(scope);
            }

            this.recordHistory('clear', '*', undefined, scope);
            this.log(`🧹 Cleared [${scope}] variables`);
        } catch (error) {
            console.error(`Error clearing variables:`, error);
        }
    }

    /**
     * Substitutes variables in a string
     * @param text - Text containing {{variableName}} placeholders
     * @returns Text with variables replaced
     */
    substitute(text: string): string {
        try {
            if (!text || typeof text !== 'string') {
                return text;
            }

            let result = text;

            // Replace all variables with {{variableName}} format
            const regex = /\{\{(\w+)\}\}/g;
            result = result.replace(regex, (match, key) => {
                const value = this.retrieve(key);
                if (value === undefined) {
                    this.log(`⚠️ Variable not found in substitution: ${key}`);
                    return match; // Keep original if not found
                }
                return String(value);
            });

            return result;
        } catch (error) {
            console.error(`Error substituting variables in text:`, error);
            return text;
        }
    }

    /**
     * Gets all variables in a scope
     */
    getAll(scope: string = 'global'): Record<string, any> {
        const result: Record<string, any> = {};

        if (scope === 'global') {
            for (const [key, value] of this.globalVariables.entries()) {
                result[key] = value;
            }
        } else if (scope === 'all') {
            // Return all variables from all scopes
            for (const [key, value] of this.globalVariables.entries()) {
                result[`global.${key}`] = value;
            }
            for (const [stepScope, stepMap] of this.stepVariables.entries()) {
                for (const [key, value] of stepMap.entries()) {
                    result[`${stepScope}.${key}`] = value;
                }
            }
        } else {
            const stepMap = this.stepVariables.get(scope);
            if (stepMap) {
                for (const [key, value] of stepMap.entries()) {
                    result[key] = value;
                }
            }
        }

        return result;
    }

    /**
     * Gets count of variables
     */
    count(scope?: string): number {
        if (scope === 'global') {
            return this.globalVariables.size;
        } else if (scope === 'all' || !scope) {
            let total = this.globalVariables.size;
            for (const stepMap of this.stepVariables.values()) {
                total += stepMap.size;
            }
            return total;
        } else {
            return this.stepVariables.get(scope)?.size ?? 0;
        }
    }

    /**
     * Gets variable history
     */
    getHistory(limit: number = 100): Array<any> {
        return this.variableHistory.slice(-limit);
    }

    /**
     * Clears history
     */
    clearHistory(): void {
        this.variableHistory = [];
        this.log('📜 History cleared');
    }

    /**
     * Exports all variables as JSON
     */
    export(): string {
        const data = {
            globalVariables: Object.fromEntries(this.globalVariables),
            stepVariables: Object.fromEntries(
                Array.from(this.stepVariables.entries()).map(([scope, map]) => [
                    scope,
                    Object.fromEntries(map),
                ])
            ),
            exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(data, null, 2);
    }

    /**
     * Imports variables from JSON
     */
    import(jsonString: string): void {
        try {
            const data = JSON.parse(jsonString);

            // Import global variables
            if (data.globalVariables) {
                for (const [key, value] of Object.entries(data.globalVariables)) {
                    this.globalVariables.set(key, value);
                }
            }

            // Import step variables
            if (data.stepVariables) {
                for (const [scope, vars] of Object.entries(data.stepVariables)) {
                    const stepMap = new Map(Object.entries(vars as Record<string, any>));
                    this.stepVariables.set(scope, stepMap);
                }
            }

            this.log('📥 Variables imported');
        } catch (error) {
            console.error('Error importing variables:', error);
            throw error;
        }
    }

    /**
     * Prints a summary of all variables
     */
    printSummary(): void {
        console.log('\n📊 VARIABLE MANAGER SUMMARY');
        console.log('════════════════════════════════════════');

        const globalVars = this.getAll('global');
        if (Object.keys(globalVars).length > 0) {
            console.log('\n🌍 GLOBAL VARIABLES:');
            for (const [key, value] of Object.entries(globalVars)) {
                console.log(`  ${key}: ${JSON.stringify(value).substring(0, 100)}`);
            }
        }

        for (const [scope, vars] of this.stepVariables.entries()) {
            if (vars.size > 0) {
                console.log(`\n📍 STEP ${scope} VARIABLES:`);
                for (const [key, value] of vars.entries()) {
                    console.log(`  ${key}: ${JSON.stringify(value).substring(0, 100)}`);
                }
            }
        }

        console.log(`\nTotal variables: ${this.count('all')}`);
        console.log('════════════════════════════════════════\n');
    }

    /**
     * Records variable history entry
     */
    private recordHistory(action: string, key: string, value: any, scope: string): void {
        this.variableHistory.push({
            timestamp: new Date(),
            action,
            key,
            value,
            scope,
        });
    }

    /**
     * Logs message if logging is enabled
     */
    private log(message: string): void {
        if (this.logEnabled) {
            console.log(message);
        }
    }

    /**
     * Enable/disable logging
     */
    setLogging(enabled: boolean): void {
        this.logEnabled = enabled;
    }
}

export default VariableManager;
