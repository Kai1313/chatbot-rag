# PBG Assist — Playwright End-to-End Test Suite

This directory contains the automated Playwright test suite for **PBG Assist**, covering both Mobile/Desktop PWA UI flows and Backend API integration tests.

---

## 📁 Test Structure

```
testing/
├── package.json               # Playwright test dependencies & test scripts
├── playwright.config.ts       # Configured with Desktop Chrome, Mobile Chrome (Pixel 5), and Mobile Safari (iPhone 12)
└── tests/
    ├── pbg_assist.spec.ts     # E2E UI tests (welcome screen, RAG query, status check, reset chat)
    └── pbg_api.spec.ts        # Direct REST API tests (/api/health, /api/status, /api/chat)
```

---

## 🚀 How to Run the Tests

### 1. Prerequisites
Make sure the Docker stack is running:
```bash
docker compose up -d
```

### 2. Install Playwright Dependencies
In the `testing/` directory, run:
```bash
cd testing
npm install
npx playwright install --with-deps
```

### 3. Execute Tests

* **Run all tests (Headless)**:
  ```bash
  npm test
  ```

* **Run tests with Interactive UI**:
  ```bash
  npm run test:ui
  ```

* **View HTML Test Report**:
  ```bash
  npm run test:report
  ```
