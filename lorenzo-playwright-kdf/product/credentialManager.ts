/**
 * Enhanced Credential Manager
 * Manages credentials with support for:
 * - Multiple users
 * - Multiple browsers
 * - Worker index-based routing
 * - Credential rotation
 * - Runtime environment override
 * 
 * Usage:
 *   const manager = new CredentialManager(workerIndex);
 *   const creds = manager.getCredentials();
 *   const username = manager.getUsername();
 */

interface Credential {
    username: string;
    password: string;
    email?: string;
    [key: string]: any;
}

interface BrowserCredentialConfig {
    browser: string;
    credentials: Credential[];
}

export class CredentialManager {
    private workerIndex: number;
    private credentials: Credential[] = [];
    private currentCredentialIndex: number = 0;
    private config: Map<string, BrowserCredentialConfig> = new Map();

    constructor(workerIndex: number = 0) {
        this.workerIndex = workerIndex;
        this.initializeCredentials();
    }

    /**
     * Initializes credentials from environment or default config
     */
    private initializeCredentials(): void {
        // First try to load from environment
        const envCredentials = this.loadFromEnvironment();
        if (envCredentials.length > 0) {
            this.credentials = envCredentials;
            return;
        }

        // Fall back to default configuration
        this.credentials = this.getDefaultCredentials();
    }

    /**
     * Loads credentials from environment variables
     * Expected format:
     * CREDENTIALS_JSON='[{"username":"user1","password":"pass1"},{"username":"user2","password":"pass2"}]'
     */
    private loadFromEnvironment(): Credential[] {
        try {
            const credStr = process.env.CREDENTIALS_JSON;
            if (credStr) {
                return JSON.parse(credStr);
            }

            // Alternative: Individual env vars
            const username = process.env.TEST_USERNAME;
            const password = process.env.TEST_PASSWORD;
            if (username && password) {
                return [{ username, password }];
            }

            return [];
        } catch (error) {
            console.error('Error loading credentials from environment:', error);
            return [];
        }
    }

    /**
     * Gets default/hardcoded credentials
     * Should be updated with actual test accounts
     */
    private getDefaultCredentials(): Credential[] {
        return [
            {
                username: 'doctor',
                password: 'doctor',
                role: 'doctor',
                displayName: 'Doctor User',
            },
            {
                username: 'nurse',
                password: 'nurse',
                role: 'nurse',
                displayName: 'Nurse User',
            },
            {
                username: 'admin',
                password: 'admin',
                role: 'admin',
                displayName: 'Admin User',
            },
        ];
    }

    /**
     * Gets credentials for current worker
     * Rotates through available credentials based on worker index
     */
    getCredentials(): Credential {
        if (this.credentials.length === 0) {
            throw new Error('No credentials configured');
        }

        // Calculate which credential to use based on worker index
        const index = this.workerIndex % this.credentials.length;
        return this.credentials[index];
    }

    /**
     * Gets specific credential by index
     */
    getCredentialByIndex(index: number): Credential {
        if (index < 0 || index >= this.credentials.length) {
            throw new Error(`Credential index ${index} out of range`);
        }
        return this.credentials[index];
    }

    /**
     * Gets credential by username
     */
    getCredentialByUsername(username: string): Credential | undefined {
        return this.credentials.find((c) => c.username === username);
    }

    /**
     * Gets credential by role
     */
    getCredentialByRole(role: string): Credential | undefined {
        return this.credentials.find((c) => c.role === role);
    }

    /**
     * Gets all credentials
     */
    getAllCredentials(): Credential[] {
        return [...this.credentials];
    }

    /**
     * Gets username for current worker
     */
    getUsername(): string {
        return this.getCredentials().username;
    }

    /**
     * Gets password for current worker
     */
    getPassword(): string {
        return this.getCredentials().password;
    }

    /**
     * Gets full credentials object {username, password}
     */
    getCredentialPair(): { username: string; password: string } {
        const cred = this.getCredentials();
        return {
            username: cred.username,
            password: cred.password,
        };
    }

    /**
     * Gets credential string in format: username|password
     */
    getCredentialString(): string {
        const cred = this.getCredentials();
        return `${cred.username}|${cred.password}`;
    }

    /**
     * Sets/adds credential
     */
    addCredential(credential: Credential): void {
        if (!credential.username || !credential.password) {
            throw new Error('Credential must have username and password');
        }
        this.credentials.push(credential);
        console.log(`✅ Added credential: ${credential.username}`);
    }

    /**
     * Updates credential by username
     */
    updateCredential(username: string, updates: Partial<Credential>): void {
        const cred = this.getCredentialByUsername(username);
        if (!cred) {
            throw new Error(`Credential not found for username: ${username}`);
        }
        Object.assign(cred, updates);
        console.log(`✅ Updated credential: ${username}`);
    }

    /**
     * Removes credential by username
     */
    removeCredential(username: string): boolean {
        const index = this.credentials.findIndex((c) => c.username === username);
        if (index === -1) {
            return false;
        }
        this.credentials.splice(index, 1);
        console.log(`✅ Removed credential: ${username}`);
        return true;
    }

    /**
     * Gets next credential in rotation
     */
    getNextCredential(): Credential {
        if (this.credentials.length === 0) {
            throw new Error('No credentials configured');
        }
        this.currentCredentialIndex = (this.currentCredentialIndex + 1) % this.credentials.length;
        return this.credentials[this.currentCredentialIndex];
    }

    /**
     * Rotates to specific credential index
     */
    setCurrentCredentialIndex(index: number): void {
        if (index < 0 || index >= this.credentials.length) {
            throw new Error(`Credential index ${index} out of range`);
        }
        this.currentCredentialIndex = index;
    }

    /**
     * Gets count of configured credentials
     */
    getCredentialCount(): number {
        return this.credentials.length;
    }

    /**
     * Sets worker index and recalculates credential
     */
    setWorkerIndex(index: number): void {
        this.workerIndex = index;
    }

    /**
     * Validates credential format
     */
    static validateCredential(credential: any): boolean {
        return (
            credential &&
            typeof credential.username === 'string' &&
            typeof credential.password === 'string' &&
            credential.username.length > 0 &&
            credential.password.length > 0
        );
    }

    /**
     * Prints summary of available credentials
     */
    printSummary(): void {
        console.log('\n📋 CREDENTIAL MANAGER SUMMARY');
        console.log('════════════════════════════════════════');
        console.log(`Worker Index: ${this.workerIndex}`);
        console.log(`Current Credential: ${this.getUsername()}`);
        console.log(`Total Credentials: ${this.getCredentialCount()}`);
        console.log('\nAvailable Credentials:');

        this.credentials.forEach((cred, index) => {
            const marker = index === this.workerIndex % this.credentials.length ? '👉' : '  ';
            console.log(`${marker} [${index}] ${cred.username} (${cred.role || 'unknown'})`);
        });

        console.log('════════════════════════════════════════\n');
    }
}

// Default singleton instance
let defaultManager: CredentialManager;

/**
 * Gets or creates default credential manager
 */
export function getCredentialManager(workerIndex: number = 0): CredentialManager {
    if (!defaultManager) {
        defaultManager = new CredentialManager(workerIndex);
    }
    return defaultManager;
}

/**
 * Resets default credential manager
 */
export function resetCredentialManager(): void {
    defaultManager = null as any;
}

export default CredentialManager;
