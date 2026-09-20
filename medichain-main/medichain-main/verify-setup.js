#!/usr/bin/env node

/**
 * MediChain Setup Verification Script
 * Checks if frontend and backend are properly wired together
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  blue: '\x1b[34m'
};

function check(name, condition, fix = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (fix) console.log(`  ${colors.yellow}Fix: ${fix}${colors.reset}`);
    return false;
  }
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(searchString);
  } catch {
    return false;
  }
}

console.log(`\n${colors.blue}=== MediChain Setup Verification ===${colors.reset}\n`);

let allGood = true;

// Backend checks
console.log(`${colors.blue}Backend:${colors.reset}`);
allGood &= check(
  'Backend directory exists',
  fileExists('medichain-backend'),
  'Ensure medichain-backend folder exists'
);
allGood &= check(
  'Server directory exists',
  fileExists('medichain-backend/server'),
  'Ensure medichain-backend/server folder exists'
);
allGood &= check(
  'Server package.json exists',
  fileExists('medichain-backend/server/package.json'),
  'Run: cd medichain-backend/server && npm init'
);
allGood &= check(
  'Server index.js exists',
  fileExists('medichain-backend/server/index.js'),
  'Create server/index.js'
);
allGood &= check(
  'Auth routes exist',
  fileExists('medichain-backend/server/routes/auth.js'),
  'Create server/routes/auth.js'
);
allGood &= check(
  'Records routes exist',
  fileExists('medichain-backend/server/routes/records.js'),
  'Create server/routes/records.js'
);
allGood &= check(
  'Smart contract exists',
  fileExists('medichain-backend/contracts/AccessControl.sol'),
  'Create contracts/AccessControl.sol'
);

// Frontend checks
console.log(`\n${colors.blue}Frontend:${colors.reset}`);
allGood &= check(
  'Frontend directory exists',
  fileExists('medichain-main/medichain-main'),
  'Ensure medichain-main/medichain-main folder exists'
);
allGood &= check(
  'Frontend package.json exists',
  fileExists('medichain-main/medichain-main/package.json'),
  'Ensure package.json exists'
);
allGood &= check(
  'Environment file exists',
  fileExists('medichain-main/medichain-main/.env.local'),
  'Create .env.local with API_URL and contract address'
);
allGood &= check(
  'API client exists',
  fileExists('medichain-main/medichain-main/lib/api.ts'),
  'Create lib/api.ts'
);
allGood &= check(
  'Wallet service exists',
  fileExists('medichain-main/medichain-main/lib/wallet.ts'),
  'Create lib/wallet.ts'
);
allGood &= check(
  'WalletContext exists',
  fileExists('medichain-main/medichain-main/lib/WalletContext.tsx'),
  'Create lib/WalletContext.tsx'
);
allGood &= check(
  'useRecords hook exists',
  fileExists('medichain-main/medichain-main/lib/useRecords.ts'),
  'Create lib/useRecords.ts'
);
allGood &= check(
  'useAccess hook exists',
  fileExists('medichain-main/medichain-main/lib/useAccess.ts'),
  'Create lib/useAccess.ts'
);

// Integration checks
console.log(`\n${colors.blue}Integration:${colors.reset}`);
allGood &= check(
  'Page imports WalletContext',
  fileContains('medichain-main/medichain-main/app/page.tsx', 'useWallet'),
  'Import and use WalletContext in page.tsx'
);
allGood &= check(
  'Layout wraps with WalletProvider',
  fileContains('medichain-main/medichain-main/app/layout.tsx', 'WalletProvider'),
  'Wrap children with WalletProvider in layout.tsx'
);
allGood &= check(
  'API client configured',
  fileContains('medichain-main/medichain-main/lib/api.ts', 'NEXT_PUBLIC_API_URL'),
  'Configure API_URL in lib/api.ts'
);
allGood &= check(
  'Ethers.js installed',
  fileContains('medichain-main/medichain-main/package.json', 'ethers'),
  'Run: pnpm add -w ethers axios'
);
allGood &= check(
  'Axios installed',
  fileContains('medichain-main/medichain-main/package.json', 'axios'),
  'Run: pnpm add -w axios'
);

// Dependencies check
console.log(`\n${colors.blue}Dependencies:${colors.reset}`);
allGood &= check(
  'Backend node_modules exists',
  fileExists('medichain-backend/server/node_modules'),
  'Run: cd medichain-backend/server && npm install'
);
allGood &= check(
  'Frontend node_modules exists',
  fileExists('medichain-main/medichain-main/node_modules'),
  'Run: cd medichain-main/medichain-main && pnpm install'
);

// Summary
console.log(`\n${colors.blue}=== Summary ===${colors.reset}`);
if (allGood) {
  console.log(`${colors.green}✓ All checks passed! Your setup looks good.${colors.reset}`);
  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log('1. Configure .env files with API keys and contract address');
  console.log('2. Start backend: cd medichain-backend/server && npm run dev');
  console.log('3. Start frontend: cd medichain-main/medichain-main && pnpm dev');
  console.log('4. Open http://localhost:3000 and connect your wallet');
} else {
  console.log(`${colors.red}✗ Some checks failed. Please fix the issues above.${colors.reset}`);
  console.log(`\nRefer to SETUP.md for detailed instructions.`);
}

console.log('');
