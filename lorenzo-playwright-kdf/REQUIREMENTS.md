# Lorenzo Playwright KDF - Requirements & Setup

## 📋 System Requirements

### Software
- **Node.js:** v18+ (with npm v8+)
- **TypeScript:** v5.x (installed via package.json)
- **Playwright:** v1.57.0
- **PostgreSQL:** 12+ (for database integration)
- **Operating System:** Windows 10/11, macOS, or Linux

### Browsers
- **Chromium:** v120+
- **Firefox:** v120+
- **WebKit:** v17+
- **Edge:** v120+ (for debugging with --remote-debugging-port)
- **Chrome:** Local installation for --remote-debugging-port

### Hardware
- **RAM:** Minimum 4GB (8GB recommended for parallel test execution)
- **Storage:** 2GB for node_modules, reports, and test artifacts
- **Network:** Internet access for LORENZO application URL

---

## 🔧 Installation & Setup

### 1. Install Dependencies
```bash
cd lorenzo-playwright-kdf
npm install
```

**Key Packages Installed:**
- `@playwright/test` - Test automation framework
- `@types/node` - TypeScript node definitions
- `pg` - PostgreSQL client
- `xlsx` - Excel file reading
- `dotenv` - Environment variable management
- `@faker-js/faker` - Test data generation
- `deasync` - Synchronous wait utilities

### 2. Configure Environment Variables

Create/update `.env` file in `lorenzo-playwright-kdf/`:

```env
# Application Configuration
URL = http://dxcappchne8097a.cscidp.net/webclient_sso/extlogon.aspx?idp=oidnatlogon&IsClientInfoNotRequired=true
PRODUCT_NAME = LORENZO
EXECUTION_PACK = smoke

# Test Data Sources
EXECUTION_PLANNER = ./excelFramework/executionPlanner/LORENZO_Planner.xlsx
TESTCASE_REPOSITORY_SOURCE = excel
LOCATOR_REPOSITORY_SOURCE = pages
PLANNER_REPOSITORY_SOURCE = excel
ELEMENT_REPOSITORY_PATH = ./ExcelFramework/ElementRepository.xlsx
DATASET_ROOT_PATH = ./resources/dataSets/LORENZO

# Database Connection
DB_HOST = 10.92.130.24
DB_PORT = 5432
DB_DATABASE = LORENZO
DB_USER = your_db_user
DB_PASSWORD = your_db_password

# Reporting
ROOT_REPORT_PATH = ./reports
CONSOLIDATED_REPORT_PATH = ./reports/consolidatedReports
INDIVIDUAL_REPORT_PATH = ./reports/individualReports
CAPTURED_DATA_PATH = ./reports/capturedData

# Execution Settings
CONTINUE_ON_FAILURE = false
EXECUTED_BY = Your Name
```

### 3. Initialize Database

Ensure PostgreSQL is running and accessible:

```bash
# Login to PostgreSQL
psql -h 10.92.130.24 -U postgres -d LORENZO

# Load schema (run contents of database/init.sql)
\i ../database/init.sql
```

**Tables Created:**
- `execplanner` - Test execution plans
- `execution_results` - Detailed test results
- `execution_summary` - Summary statistics

### 4. Verify Setup

```bash
# Check TypeScript compilation
npm run validate

# List available test cases
npm planner

# Run unit tests
npm unit
```

---

## 📊 Excel File Requirements

### ElementRepository.xlsx
**Location:** `excelFramework/ElementRepository.xlsx`

**Columns:**
- `PageName` - Page object name (e.g., "pageLogin")
- `ElementName` - Element identifier
- `LocatorType` - CSS, XPath, role, etc.
- `Locator` - Actual locator string
- `ElementType` - BUTTON, TEXTBOX, LABEL, etc.
- `Description` - Element description

**Example Row:**
```
PageName: pageLogin
ElementName: loginButton
LocatorType: CSS
Locator: #btn-login
ElementType: BUTTON
```

### Test Case Excel Files
**Location:** `excelFramework/testcases/[Module]/[TestName].xlsx`

**Columns:**
- `StepNo` - Step number
- `ActionType` - CLICK, TYPE, VERIFY, WAIT, etc.
- `ElementType` - BUTTON, TEXTBOX, LABEL, etc.
- `PageName` - Page object name
- `ElementName` - Element from repository
- `TestData` - Input data (supports #{variables})
- `ExpectedResult` - For assertions
- `Description` - Step description

**Example Row:**
```
StepNo: 1
ActionType: CLICK
PageName: pageLogin
ElementName: loginButton
TestData: (empty)
ExpectedResult: Login form submitted
Description: Click login button
```

### Execution Planner
**Location:** `excelFramework/executionPlanner/LORENZO_Planner.xlsx`

**Columns:**
- `Module` - Test module name
- `TestCaseName` - Test case file name
- `Status` - ACTIVE, SKIP, etc.
- `Priority` - P0, P1, P2, etc.
- `Description` - Test purpose

---

## 🗂️ Directory Structure Requirements

### Directories to Create (if missing)
```bash
# Ensure these exist for reports
mkdir -p reports/consolidatedReports
mkdir -p reports/individualReports
mkdir -p reports/capturedData
mkdir -p reports/logs
```

### Data Directory
```bash
# For test data sets
mkdir -p resources/dataSets/LORENZO
```

---

## 🚀 Running Tests

### Basic Test Execution
```bash
cd lorenzo-playwright-kdf
npm test
```

### Run Specific Test Module
```bash
# Edit EXECUTION_PACK in .env to specify module
# Then run:
npm test
```

### Generate Execution Plans
```bash
npm planner
```

### Unit Tests
```bash
npm unit
```

### Validate All Page Objects
```bash
npm validate
```

### Debug Mode (Interactive)
```bash
# Launch Edge with remote debugging
npm run browser:edge

# OR launch Chrome
npm run browser:chrome
```

---

## 📝 Page Object Requirements

### File Naming
- Format: `page[PageName].ts`
- Example: `pageLogin.ts`, `pagePatientSearch.ts`
- Location: `core/pages/`

### Page Object Structure
```typescript
export const pageLogin = {
  // Main elements
  usernameField: 'CSS:#username',
  passwordField: 'CSS:[data-testid="password"]',
  loginButton: 'CSS:button:has-text("Login")',
  
  // Nested sections
  errorSection: {
    errorMessage: 'CSS:.alert-error',
    retryButton: 'CSS:button[id="retry"]'
  },
  
  // Lists/tables
  userTable: {
    rows: 'CSS:table tbody tr',
    firstRow: 'CSS:table tbody tr:first-child'
  }
};
```

### Locator Best Practices
1. Prefer data-testid attributes: `[data-testid="id"]`
2. Use semantic roles: `role=button, name="Login"`
3. Avoid fragile XPath (deep nested paths)
4. Use CSS selectors when possible
5. Document complex locators with comments

---

## 🐛 Troubleshooting

### Issue: "Cannot find module 'pg'"
**Solution:** Run `npm install` to ensure all dependencies installed

### Issue: "Database connection failed"
**Solution:** Verify connection details in `.env` and PostgreSQL is running

### Issue: "Element not found"
**Solution:** 
1. Check ElementRepository.xlsx has correct locator
2. Verify page object name matches
3. Check locator syntax (CSS vs XPath)

### Issue: "TypeScript compilation errors"
**Solution:** Run `npm run validate` to see errors, then fix type issues

### Issue: "Test timeout"
**Solution:** Increase timeout in testStep configuration or .env

---

## 📚 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @playwright/test | ^1.57.0 | Test automation framework |
| typescript | ^5.x | Language & type safety |
| pg | ^8.16.3 | PostgreSQL client |
| xlsx | ^0.18.5 | Excel file operations |
| @faker-js/faker | ^10.3.0 | Test data generation |
| dotenv | ^17.2.3 | Environment variable loading |
| cross-env | ^7.0.3 | Cross-platform env vars |
| deasync | ^0.1.31 | Sync wait utilities |

---

## ✅ Pre-Launch Checklist

- [ ] Node.js v18+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] `.env` file configured with correct values
- [ ] PostgreSQL accessible at DB_HOST:DB_PORT
- [ ] LORENZO application URL accessible
- [ ] Excel test files present in excelFramework/
- [ ] Page objects created in core/pages/
- [ ] ElementRepository.xlsx populated
- [ ] test case Excel files created
- [ ] Report directories exist (or auto-created)
- [ ] TypeScript compiles without errors (`npm run validate`)

---

## 🔐 Security Considerations

1. **Never commit .env file** - Use `.env.example` as template
2. **Database credentials** - Store securely, rotate regularly
3. **Test URLs** - Ensure test environments are isolated
4. **Screenshot data** - May contain sensitive information (PII, credentials)
5. **Log files** - Review before sharing (may contain test data)

---

## 📞 Common Commands Reference

```bash
# Installation
npm install                  # Install all dependencies

# Testing
npm test                     # Run main test suite
npm planner                  # Generate execution plans
npm unit                     # Run unit tests
npm validate                 # Validate page objects

# Debugging
npm run browser:edge         # Launch Edge debugger
npm run browser:chrome       # Launch Chrome debugger

# TypeScript
npx tsc --noEmit            # Check compilation errors
npx tsc                     # Compile TypeScript

# Excel Operations
npm run validate             # Validates Excel file reads
```

---

## 📖 Documentation Files

- `.copilot-instructions.md` - Project structure & patterns
- `INTEGRATION_SUMMARY.txt` - (if exists) Integration details
- `package.json` - Dependency & script documentation
- `tsconfig.json` - TypeScript configuration details
- `.env.example` - Environment variable template

---

## 🎯 Next Steps After Setup

1. **Create test cases** in Excel format
2. **Add page objects** for your application
3. **Configure ElementRepository.xlsx** with locators
4. **Run validation** to test setup
5. **Execute first test** to verify integration
6. **Review reports** in reports/ directory
