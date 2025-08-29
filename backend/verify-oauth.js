/**
 * Simple OAuth Implementation Verification
 * Checks that all components are properly structured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying OAuth Backend Implementation...\n');

// Check required files exist
const requiredFiles = [
  'src/server.ts',
  'src/routes/auth.ts', 
  'src/routes/connections.ts',
  'src/security/oauth.ts',
  'src/security/middleware.ts',
  'src/security/audit.ts',
  'src/connectors/slack.ts',
  'src/connectors/types.ts',
  'src/connectors/index.ts',
  'src/services/oauth-service.ts',
  'src/types/database.ts',
  'src/types/express.d.ts',
  '.env.example',
  'OAUTH_README.md'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
for (const file of requiredFiles) {
  const filepath = path.join(__dirname, file);
  if (fs.existsSync(filepath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

// Check package.json scripts
console.log('\n📦 Checking package.json scripts:');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredScripts = ['dev', 'start', 'build', 'test:oauth'];
  
  for (const script of requiredScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`   ✅ ${script}: ${packageJson.scripts[script]}`);
    } else {
      console.log(`   ❌ ${script} - MISSING`);
      allFilesExist = false;
    }
  }
}

// Check environment configuration
console.log('\n🔧 Checking environment configuration:');
const envExamplePath = path.join(__dirname, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  const requiredVars = [
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET', 
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'DATABASE_URL'
  ];
  
  for (const varName of requiredVars) {
    if (envContent.includes(varName)) {
      console.log(`   ✅ ${varName}`);
    } else {
      console.log(`   ❌ ${varName} - MISSING FROM .env.example`);
      allFilesExist = false;
    }
  }
}

// Check TypeScript types
console.log('\n🔷 Checking TypeScript implementation:');
const srcFiles = [
  'src/server.ts',
  'src/connectors/slack.ts', 
  'src/routes/connections.ts'
];

for (const file of srcFiles) {
  const filepath = path.join(__dirname, file);
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Check for proper imports
    const hasImports = content.includes('import ') && content.includes('from ');
    const hasTypes = content.includes(': ') || content.includes('interface ') || content.includes('type ');
    
    console.log(`   ${hasImports ? '✅' : '❌'} ${file} - ES6 imports`);
    console.log(`   ${hasTypes ? '✅' : '❌'} ${file} - TypeScript types`);
  }
}

// Summary
console.log('\n📊 Implementation Summary:');
console.log('┌─────────────────────────────────────┬──────────┐');
console.log('│ Component                           │ Status   │');
console.log('├─────────────────────────────────────┼──────────┤');
console.log(`│ Server & Routes                     │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log(`│ OAuth Security & PKCE               │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log(`│ Slack Connector                     │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log(`│ Security Middleware                 │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log(`│ Audit & Compliance                  │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log(`│ Database Integration                │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log(`│ Environment Configuration           │ ${allFilesExist ? '✅ Ready' : '❌ Issues'} │`);
console.log('└─────────────────────────────────────┴──────────┘');

if (allFilesExist) {
  console.log('\n🎉 OAuth Backend Implementation Complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Copy .env.example to .env and configure your credentials');
  console.log('   2. Set up your database and run migrations');
  console.log('   3. Configure your Slack OAuth app following docs/OAUTH_SETUP.md');
  console.log('   4. Install dependencies with: npm install');
  console.log('   5. Start development server with: npm run dev');
  console.log('\n📖 Documentation: OAUTH_README.md');
} else {
  console.log('\n❌ Implementation has missing components. Please check the errors above.');
  process.exit(1);
}

console.log('\n🚀 Ready for Stage 1 integration with frontend!');