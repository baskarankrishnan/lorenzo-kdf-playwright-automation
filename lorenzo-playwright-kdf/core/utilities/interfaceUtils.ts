export class ExecutionContext {
    private suiteVariables: Map<string, any> = new Map();
    private testVariables: Map<string, Map<string, any>> = new Map();
    private currentContextKey: string = '';
    private variableManager: any;

    constructor() {
        this.initializeSuiteVariables();
        this.initializeVariableManager();
    }

    private initializeSuiteVariables(): void {
        for (const [key, value] of Object.entries(process.env)) {
            if (value !== undefined) {
                this.suiteVariables.set(key, value);
            }
        }
    }

    private initializeVariableManager(): void {
        // Lazy load to avoid circular dependency
        try {
            const VariableManager = require('./variableManager').VariableManager;
            this.variableManager = new VariableManager(false); // Disable logging by default
        } catch (error) {
            console.warn('VariableManager not available');
        }
    }

    getVariableManager(): any {
        if (!this.variableManager) {
            this.initializeVariableManager();
        }
        return this.variableManager;
    }

    setCurrentContext(contextKey: string): void {
        this.currentContextKey = contextKey;
        if (!this.testVariables.has(contextKey)) {
            this.testVariables.set(contextKey, new Map());
        }
    }

    getCurrentContext(): string {
        return this.currentContextKey;
    }

    addVariable(key: string, value: any, contextKey?: string): void {
        const context = contextKey || this.currentContextKey;
        if (!this.testVariables.has(context)) {
            this.testVariables.set(context, new Map());
        }
        this.testVariables.get(context)!.set(key, value);
    }

    removeVariable(key: string, contextKey?: string): boolean {
        const context = contextKey || this.currentContextKey;
        return this.testVariables.get(context)?.delete(key) || false;
    }

    getVariableValue(key: string, contextKey?: string): any {
        const context = contextKey || this.currentContextKey;

        if (this.testVariables.has(context)) {
            const testVar = this.testVariables.get(context)!.get(key);
            if (testVar !== undefined) return testVar;
        }

        return this.suiteVariables.get(key);
    }

    getAllTestVariables(contextKey?: string): { [key: string]: any } {
        const context = contextKey || this.currentContextKey;
        return this.testVariables.has(context)
            ? Object.fromEntries(this.testVariables.get(context)!)
            : {};
    }

    getAllSuiteVariables(): { [key: string]: any } {
        return Object.fromEntries(this.suiteVariables);
    }

    getAllVariables(contextKey?: string): { [key: string]: any } {
        const context = contextKey || this.currentContextKey;
        const merged = { ...this.getAllSuiteVariables() };

        if (this.testVariables.has(context)) {
            Object.assign(merged, Object.fromEntries(this.testVariables.get(context)!));
        }

        return merged;
    }

    addSuiteVariable(key: string, value: any): void {
        this.suiteVariables.set(key, value);
    }

    removeSuiteVariable(key: string): boolean {
        return this.suiteVariables.delete(key);
    }

    hasVariable(key: string, contextKey?: string): boolean {
        const context = contextKey || this.currentContextKey;
        return (this.testVariables.has(context) && this.testVariables.get(context)!.has(key))
            || this.suiteVariables.has(key);
    }

    clearTestVariables(contextKey?: string): void {
        const context = contextKey || this.currentContextKey;
        this.testVariables.delete(context);
    }

    clearAllTestVariables(): void {
        this.testVariables.clear();
    }

    clearSuiteVariables(): void {
        this.suiteVariables.clear();
    }

    clearAll(): void {
        this.testVariables.clear();
        this.suiteVariables.clear();
        this.currentContextKey = '';
    }

    getAllContextKeys(): string[] {
        return Array.from(this.testVariables.keys());
    }

    getTestVariablesSize(contextKey?: string): number {
        const context = contextKey || this.currentContextKey;
        return this.testVariables.get(context)?.size || 0;
    }

    getSuiteVariablesSize(): number {
        return this.suiteVariables.size;
    }

    toJSON(contextKey?: string): { [key: string]: any } {
        return this.getAllTestVariables(contextKey);
    }

    toCompleteJSON(contextKey?: string): {
        suiteVariables: { [key: string]: any };
        testVariables: { [key: string]: any };
        allVariables: { [key: string]: any };
    } {
        return {
            suiteVariables: this.getAllSuiteVariables(),
            testVariables: this.getAllTestVariables(contextKey),
            allVariables: this.getAllVariables(contextKey)
        };
    }
}

export const executionContext = new ExecutionContext();

export interface testStep {
    stepNo: number;
    stepDescription: string;
    page: string | '';
    element: string | '';
    elementText: string | '';
    actionKeyword: string;
    property: string | '';
    condition?: string | '';
    tableColumnNames: string | '';
    value: string | '';
    datasetColumnNames: string | '';
    isCommented?: boolean;
    isDDT?: boolean;
    // Extended properties for enhanced assertions
    attribute?: string;
    index?: number;
    row?: number;
    column?: string | number;
    colorProperty?: string;
    fromState?: string;
    toState?: string;
}

export interface testCase {
    testCaseId: string;
    testCaseDescription?: string;
    module?: string;
    jiraId?: string;
    author?: string;
    excelName?: string;
    isDDT?: boolean;
    testSteps: testStep[];
}

export interface stepExecutionResult {
    stepNo: number;
    stepDescription: string;
    stepStatus: number;
    page?: string;
    element?: string;
    elementText?: string;
    actionKeyword: string;
    property?: string;
    condition?: string;
    tableColumnNames?: string;
    value?: string;
    datasetColumnNames?: string;
    isDDT?: boolean;
    outcome: number;
    stepStartTime: string;
    stepEndTime: string;
    stepDuration: string;
    screenshotPath: string;
    pageActions: stepExecutionResult[];
    returnText: string;
    stepTimestamp: string;
}

export interface testCaseExecutionResult {
    testCaseId: string;
    testCaseDescription?: string;
    module?: string;
    jiraId?: string;
    author?: string;
    excelName?: string;
    isDDT?: boolean;
    testCaseStatus: number;
    steps: stepExecutionResult[];
    startTime: string;
    endTime: string;
    duration: string;
    returnText: string;
    testTimestamp: string;
    browserConfig: browserConfig;
    capturedData: { [key: string]: any };
}

export interface browserConfig {
    browserName: string;
    browserVersion: string;
    os: string;
    osVersion: string;
}

export interface locatorEntry {
    testid?: string;
    id?: string;
    cssselector?: string;
    xpath?: string;
    role?: string;
    description?: string;
}

export interface locatorRepository {
    [page: string]: {
        [element: string]: locatorEntry;
    };
}

export interface testCaseInfo {
    testcaseId: string;
    jiraId?: string;
    description?: string;
    author?: string;
    isDDt?: string;
    ddtStartRow?: string;
    ddtEndRow?: string;
}

export interface testCasesByExcel {
    [excelName: string]: {
        module: string;
        testCases: testCaseInfo[];
    };
}

export interface testResultsByExcel {
    [excelName: string]: {
        module: string;
        [testCaseId: string]: testCaseExecutionResult | string;
    };
}

export interface executionMetrics {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    totalDuration: string;
    startTime: string;
    endTime: string;
}

export interface consolidatedReport {
    executionPack: string;
    executionTimestamp: string;
    continueOnFailure: boolean;
    browserConfig: browserConfig;
    executionMetrics: executionMetrics;
    testResults: testResultsByExcel;
}

export interface Outcome {
    code: number;
    value: string;
    data?: stepExecutionResult[];
}

export interface NetworkContext {
    capturedData: any[];
    isActive: boolean;
    filter: { urlPattern: string; method: string };
    responseHandler: ((request: any) => Promise<void>) | null;
}

export interface LoaderRule {
    name: string;
    locator: string;
    waitType: 'hidden' | 'visible' | 'attached' | 'detached';
};