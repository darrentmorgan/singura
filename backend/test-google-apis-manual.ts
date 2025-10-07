/**
 * Manual Google API Testing Script
 * Test Google Workspace APIs directly with an access token
 */

import { google } from 'googleapis';

async function testGoogleAPIs(accessToken: string) {
  console.log('\n🧪 Testing Google Workspace APIs...\n');

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth });
  const admin = google.admin({ version: 'directory_v1', auth });
  const script = google.script({ version: 'v1', auth });
  const oauth2 = google.oauth2({ version: 'v2', auth });

  try {
    // 1. Test authentication & get user info
    console.log('1️⃣ Testing authentication...');
    const userInfo = await oauth2.userinfo.get();
    console.log('✅ User:', userInfo.data.email);
    console.log('   Domain:', userInfo.data.hd || 'Personal Gmail');
    console.log('   Account Type:', userInfo.data.hd ? 'Workspace' : 'Personal');

    // 2. Test Drive API - Search for Apps Script projects
    console.log('\n2️⃣ Testing Drive API - Apps Script projects...');
    const driveResponse = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.script'",
      pageSize: 10,
      fields: 'files(id,name,mimeType,createdTime,modifiedTime,owners)',
      orderBy: 'modifiedTime desc'
    });

    if (driveResponse.data.files && driveResponse.data.files.length > 0) {
      console.log(`✅ Found ${driveResponse.data.files.length} Apps Script projects:`);
      driveResponse.data.files.forEach((file, i) => {
        console.log(`   ${i + 1}. ${file.name} (${file.id})`);
        console.log(`      Modified: ${file.modifiedTime}`);
      });

      // Try to get content of first script
      const firstScript = driveResponse.data.files[0];
      console.log(`\n   Testing script content access for: ${firstScript.name}`);
      try {
        const content = await script.projects.getContent({ scriptId: firstScript.id! });
        console.log(`   ✅ Can access script content`);
        console.log(`      Files in project: ${content.data.files?.length || 0}`);

        // Check for AI platform usage
        if (content.data.files) {
          for (const file of content.data.files) {
            if (file.source) {
              const source = file.source.toLowerCase();
              if (source.includes('openai') || source.includes('chatgpt')) {
                console.log(`      🚨 AI PLATFORM DETECTED: OpenAI/ChatGPT in ${file.name}`);
              }
              if (source.includes('anthropic') || source.includes('claude')) {
                console.log(`      🚨 AI PLATFORM DETECTED: Claude in ${file.name}`);
              }
            }
          }
        }
      } catch (contentError: any) {
        console.log(`   ⚠️ Cannot access script content: ${contentError.message}`);
      }
    } else {
      console.log('❌ No Apps Script projects found');
    }

    // 3. Test OAuth Applications (admin.tokens.list)
    console.log('\n3️⃣ Testing OAuth Applications...');
    try {
      const tokensResponse = await admin.tokens.list({ userKey: 'me' });

      if (tokensResponse.data.items && tokensResponse.data.items.length > 0) {
        console.log(`✅ Found ${tokensResponse.data.items.length} OAuth applications:`);
        tokensResponse.data.items.forEach((token: any, i: number) => {
          const displayText = token.displayText || token.clientId;
          const isAI = /openai|chatgpt|claude|anthropic|gemini/i.test(displayText);

          console.log(`   ${i + 1}. ${displayText}${isAI ? ' 🚨 AI PLATFORM' : ''}`);
          console.log(`      Client ID: ${token.clientId}`);
          console.log(`      Scopes: ${token.scopes?.length || 0} permissions`);

          if (isAI) {
            console.log(`      🔍 Scopes: ${token.scopes?.slice(0, 3).join(', ')}${token.scopes?.length > 3 ? '...' : ''}`);
          }
        });
      } else {
        console.log('❌ No OAuth applications found');
      }
    } catch (tokensError: any) {
      console.log(`⚠️ Cannot access OAuth tokens: ${tokensError.message}`);
      console.log('   (This requires Google Workspace admin permissions)');
    }

    // 4. Test Service Accounts (via audit logs)
    console.log('\n4️⃣ Testing Service Accounts (audit logs)...');
    try {
      const adminReports = google.admin({ version: 'reports_v1', auth });
      const auditResponse = await adminReports.activities.list({
        userKey: 'all',
        applicationName: 'token',
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        maxResults: 100
      });

      if (auditResponse.data.items && auditResponse.data.items.length > 0) {
        const serviceAccounts = new Set<string>();
        auditResponse.data.items.forEach((activity: any) => {
          const email = activity.actor?.email;
          if (email && (email.includes('.iam.gserviceaccount.com') || email.includes('.apps.googleusercontent.com'))) {
            serviceAccounts.add(email);
          }
        });

        if (serviceAccounts.size > 0) {
          console.log(`✅ Found ${serviceAccounts.size} service accounts:`);
          Array.from(serviceAccounts).forEach((email, i) => {
            console.log(`   ${i + 1}. ${email}`);
          });
        } else {
          console.log('❌ No service accounts found in audit logs');
        }
      } else {
        console.log('❌ No audit log activity found');
      }
    } catch (auditError: any) {
      console.log(`⚠️ Cannot access audit logs: ${auditError.message}`);
      console.log('   (This requires Google Workspace admin permissions)');
    }

    console.log('\n✅ API Testing Complete!\n');

  } catch (error: any) {
    console.error('\n❌ API Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Get access token from command line argument
const accessToken = process.argv[2];

if (!accessToken) {
  console.error('❌ Usage: npx ts-node test-google-apis-manual.ts <ACCESS_TOKEN>');
  console.error('\nTo get your access token:');
  console.error('1. Open Chrome DevTools (F12) on http://localhost:4200');
  console.error('2. Go to Application tab > Local Storage');
  console.error('3. Look for Google access token in storage');
  console.error('\nOR manually go to: https://developers.google.com/oauthplayground');
  process.exit(1);
}

testGoogleAPIs(accessToken);
