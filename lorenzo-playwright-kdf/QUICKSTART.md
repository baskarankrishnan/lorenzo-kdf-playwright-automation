# Quick Start Guide - Lorenzo Playwright KDF

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (2 min)
```bash
cd C:\Users\bkrishnan6\ORBIS PAS UKI-LZO\lorenzo-playwright-kdf
npm install
```

### Step 2: Configure Environment (1 min)
Update `lorenzo-playwright-kdf/.env` with your values:
```env
URL = your_lorenzo_application_url
DB_HOST = 10.92.130.24
DB_USER = your_db_user
DB_PASSWORD = your_db_password
```

### Step 3: Verify Setup (1 min)
```bash
npm run validate
```
Expected output: ✅ All page objects validated

### Step 4: Run First Test (1 min)
```bash
npm test
```

---

## 📝 Creating Your First Test

### Step 1: Create Excel Test Case
File: `excelFramework/testcases/smoke/FirstTest.xlsx`

| StepNo | ActionType | PageName | ElementName | TestData | Description |
|--------|-----------|----------|-------------|----------|-------------|
| 1 | NAVIGATE | - | - | http://your-app.com | Navigate to application |
| 2 | CLICK | pageLogin | loginButton | - | Click login button |
| 3 | TYPE | pageLogin | usernameField | testuser | Enter username |
| 4 | TYPE | pageLogin | passwordField | password123 | Enter password |
| 5 | CLICK | pageLogin | submitButton | - | Click submit |
| 6 | VERIFY | pageDashboard | welcomeMessage | Welcome testuser | Verify login success |

### Step 2: Create Page Object
File: `core/pages/pageLogin.ts`

```typescript
export const pageLogin = {
  usernameField: 'CSS:input[id="username"]',
  passwordField: 'CSS:input[id="password"]',
  loginButton: 'CSS:button[type="submit"]',
  errorMessage: 'CSS:.error-text',
  rememberMeCheckbox: 'CSS:input[type="checkbox"]'
};

export const pageDashboard = {
  welcomeMessage: 'CSS:.welcome-message',
  logoutButton: 'CSS:button[id="logout"]',
  mainContent: 'CSS:main.content'
};
```

### Step 3: Add to ElementRepository.xlsx
```
PageName: pageLogin
ElementName: usernameField
LocatorType: CSS
Locator: input[id="username"]
ElementType: TEXTBOX
Description: Login username input field
```

### Step 4: Update Execution Planner
File: `excelFramework/executionPlanner/LORENZO_Planner.xlsx`

| Module | TestCaseName | Status | Priority | Description |
|--------|-------------|--------|----------|-------------|
| smoke | FirstTest | ACTIVE | P0 | Basic login test |

### Step 5: Run Test
```bash
npm test
```

Results appear in: `reports/consolidatedReports/`

---

## 🔍 Understanding Test Results

### Report Files Generated
```
reports/
├── consolidatedReports/
│   └── LORENZO_Overall_Summary_Report_[timestamp].html
├── individualReports/
│   ├── LORENZO_[module]_[testcase]_[timestamp].html
│   └── (one file per test)
├── capturedData/
│   └── [timestamp]_CapturedData.json
└── logs/
    └── [action]_[timestamp].txt
```

### Interpreting Results
- **Green ✅** - Test passed
- **Red ❌** - Test failed (check error message)
- **Yellow ⚠️** - Warning (non-critical issue)
- **Blue ℹ️** - Information (step executed)

---

## 🎯 Available Functions by Category

### Most Common Functions

#### Interaction Functions
```typescript
// Click elements
await clickElement(page, { locator: 'CSS:button#submit' });

// Type text
await setTextBox(page, { locator: 'CSS:input#username', testData: 'myusername' });

// Get text
const result = await getText(page, { locator: 'CSS:label.title' });
// result.value = 'Label text'

// Select dropdown
await selectListBox(page, { locator: 'CSS:select#country', testData: 'USA' });

// Wait for element
await waitForElement(page, { locator: 'CSS:div#loading', timeOut: 5000 });
```

#### Validation Functions
```typescript
// Verify text exists
await verifyValueInListBox(page, { 
  locator: 'CSS:select#options', 
  testData: 'expectedValue' 
});

// Check visibility
const visible = await isElementVisible(page, { locator: 'CSS:button#submit' });

// Check if enabled
const enabled = await isElementEnabled(page, { locator: 'CSS:input#field' });

// Get size
const size = await getElementSize(page, { locator: 'CSS:div#container' });
```

#### Browser Functions
```typescript
// Navigate to URL
await navigateToURL(page, { testData: 'http://app.com' });

// Go back
await goBack(page, {});

// Switch to tab
await switchToTab(page, { testData: 'second' });

// Take screenshot
await takeScreenshot(page, { description: 'Login screen' });

// Handle alert
await handleAlert(page, { testData: 'accept' });
```

#### Data Functions
```typescript
// Clear text field
await clearTextBox(page, { locator: 'CSS:input#search' });

// Send keyboard keys
await sendKeys(page, { locator: 'CSS:input#search', testData: 'Enter' });

// Drag and drop
await dragAndDrop(page, { 
  locator: 'CSS:div.draggable', 
  testData: 'CSS:div.drop-zone' 
});

// Upload file
await uploadFile(page, { 
  locator: 'CSS:input[type="file"]', 
  testData: 'C:\\path\\to\\file.pdf' 
});
```

---

## 🔧 Configuration Tips

### Run Specific Test Module
```env
# In .env
EXECUTION_PACK = smoke
```
Then: `npm test`

### Change Test Data
Use variables in test data:
```
TestData: #{username}
```
Set in execution context or Excel

### Parallel Execution
Edit `playwright.config.js` to enable parallel workers

### Timeout Settings
```typescript
// Per step
testStep.timeOut = 10000;  // 10 seconds

// Global
PLAYWRIGHT_TEST_TIMEOUT = 30000;
```

---

## 🐛 Debugging Tips

### Enable Detailed Logging
```env
# Add to .env
DEBUG = true
LOG_LEVEL = debug
```

### Inspect Element Locators
```bash
# Use browser debug mode
npm run browser:edge
# or
npm run browser:chrome
```

### Check Test Data Resolution
Add logging in test:
```typescript
const resolved = await resolveTestVariables(testData, context);
console.log('Resolved:', resolved);
```

### Review Execution Logs
```
reports/logs/LORENZO_[action]_[timestamp].txt
```

---

## 📊 Advanced Features

### Data-Driven Testing
Create multiple rows in test Excel:
```
Row 1: Scenario 1 data
Row 2: Scenario 2 data
Row 3: Scenario 3 data
```
Framework runs all rows automatically

### Variable Substitution
```
TestData: Username: #{username}, Password: #{password}
```
Resolved at runtime from context

### Database Integration
Test results automatically stored:
```
execplanner - Test execution plans
execution_results - Detailed results
execution_summary - Statistics
```

### Custom Assertions
Use `assertActions.ts` functions:
```typescript
await assertTextEquals(page, { 
  locator: 'CSS:h1.title', 
  expectedResult: 'Dashboard' 
});
```

---

## ✅ Checklist: First Test Success

- [ ] Dependencies installed (`npm install`)
- [ ] `.env` configured with test URL
- [ ] Database connection verified
- [ ] Excel test case created
- [ ] Page object created
- [ ] ElementRepository.xlsx updated
- [ ] Execution Planner updated
- [ ] `npm run validate` passes ✅
- [ ] `npm test` runs successfully ✅
- [ ] Report generated in reports/ ✅

---

## 📞 Common Issues & Solutions

### Error: "Cannot find page object"
- Check file name matches: `page[PageName].ts`
- Ensure exported properly
- Verify in elementRepository.xlsx

### Error: "Locator not found"
- Check CSS selector or XPath syntax
- Verify element exists on page
- Use browser debug mode to inspect

### Error: "Test timeout"
- Increase timeOut value
- Check page load time
- Verify application responsiveness

### Error: "Database connection failed"
- Verify DB_HOST, DB_PORT in .env
- Check PostgreSQL is running
- Verify credentials correct

---

## 🚀 Next: Advanced Topics

Once you're comfortable with basics:

1. **Custom Action Functions** - Extend actionkeywords/
2. **AI Test Healing** - Auto-fix broken tests
3. **Parallel Execution** - Run multiple tests simultaneously
4. **CI/CD Integration** - GitHub Actions, Jenkins, etc.
5. **Performance Metrics** - Track test execution speed
6. **Database Reporting** - Query results from PostgreSQL

---

## 📚 Additional Resources

- `.copilot-instructions.md` - Complete framework documentation
- `REQUIREMENTS.md` - Setup requirements & configuration
- `core/actionkeywords/` - All available action functions
- `excelFramework/` - Test data templates
- `reports/` - Generated test reports
