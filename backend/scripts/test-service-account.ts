import { google } from 'googleapis';
import * as path from 'path';

async function testServiceAccount() {
  console.log('🧪 Testing service account setup...\n');

  try {
    // 1. Load service account credentials
    const keyPath = path.join(__dirname, '../config/demo-service-account.json');
    console.log(`📁 Loading credentials from: ${keyPath}`);

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      // IMPORTANT: Replace with your admin email
      subject: process.env.DEMO_ADMIN_EMAIL || 'REPLACE_WITH_YOUR_ADMIN_EMAIL@YOUR-DOMAIN.COM'
    });

    console.log('✓ Credentials loaded\n');

    // 2. Get auth client
    console.log('🔐 Authenticating with Google...');
    const authClient = await auth.getClient();
    console.log('✓ Authentication successful!\n');

    // 3. Test: List files
    const drive = google.drive({ version: 'v3', auth });
    console.log('📂 Searching for demo folders...');

    const response = await drive.files.list({
      pageSize: 20,
      fields: 'files(id, name, mimeType, createdTime)',
      q: "name contains '[DEMO]' and trashed=false"
    });

    console.log('✓ Successfully queried Google Drive!\n');

    if (response.data.files && response.data.files.length > 0) {
      console.log('✅ Demo folders found:');
      response.data.files.forEach(file => {
        console.log(`   📁 ${file.name}`);
        console.log(`      ID: ${file.id}`);
        console.log(`      Created: ${file.createdTime}\n`);
      });
    } else {
      console.log('⚠️  No demo folders found yet.');
      console.log('   Create folders in Google Drive with names starting with "[DEMO]"\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SERVICE ACCOUNT SETUP IS WORKING!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Next steps:');
    console.log('   1. Create demo folders in Google Drive (if not done)');
    console.log('   2. Run velocity attack scenario');
    console.log('   3. Verify detection in Singura\n');

  } catch (error: any) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ ERROR DETECTED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      console.log('🔴 Service account key file not found!\n');
      console.log('📍 Expected location:');
      console.log(`   ${path.join(__dirname, '../config/demo-service-account.json')}\n`);
      console.log('📝 To fix:');
      console.log('   1. Download service account key from Google Cloud Console');
      console.log('   2. Save it as: backend/config/demo-service-account.json');
      console.log('   3. Run this script again\n');
    } else if (error.message.includes('invalid_grant')) {
      console.log('🔴 Domain-wide delegation not enabled or not propagated yet!\n');
      console.log('📝 To fix:');
      console.log('   1. Go to: admin.google.com/ac/owl/domainwidedelegation');
      console.log('   2. Verify your service account Client ID is listed');
      console.log('   3. Verify these scopes are added:');
      console.log('      - https://www.googleapis.com/auth/drive');
      console.log('      - https://www.googleapis.com/auth/admin.reports.audit.readonly');
      console.log('   4. Wait 10-15 minutes for changes to propagate');
      console.log('   5. Run this script again\n');
    } else if (error.message.includes('unauthorized_client')) {
      console.log('🔴 Client ID mismatch!\n');
      console.log('📝 To fix:');
      console.log('   1. Open: backend/config/demo-service-account.json');
      console.log('   2. Find the "client_id" field');
      console.log('   3. Go to: admin.google.com/ac/owl/domainwidedelegation');
      console.log('   4. Verify the Client ID matches EXACTLY');
      console.log('   5. If different, delete and re-add with correct Client ID\n');
    } else if (error.message.includes('subject')) {
      console.log('🔴 Admin email not set!\n');
      console.log('📝 To fix:');
      console.log('   1. Set environment variable:');
      console.log('      export DEMO_ADMIN_EMAIL=your-admin@your-domain.com');
      console.log('   2. Or edit this file and replace REPLACE_WITH_YOUR_ADMIN_EMAIL\n');
    } else {
      console.log('🔴 Unexpected error:\n');
      console.log(error.message);
      console.log('\n📝 Full error details:');
      console.log(error);
    }

    process.exit(1);
  }
}

// Run the test
testServiceAccount();
