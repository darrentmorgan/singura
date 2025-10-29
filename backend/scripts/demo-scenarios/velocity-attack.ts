import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.demo') });

interface VelocityAttackConfig {
  targetFolderId: string;
  fileCount: number;
  impersonateUser: string;
}

async function runVelocityAttack(config: VelocityAttackConfig) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 VELOCITY ATTACK DEMO SCENARIO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 Configuration:');
  console.log(`   Target Folder: ${config.targetFolderId}`);
  console.log(`   Files to Create: ${config.fileCount}`);
  console.log(`   Impersonate User: ${config.impersonateUser}\n`);

  try {
    // 1. Authenticate
    console.log('🔐 Authenticating with Google...');
    const keyPath = path.join(__dirname, '../../config/demo-service-account.json');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
      subject: config.impersonateUser
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✓ Authentication successful\n');

    // 2. Verify folder exists
    console.log('📁 Verifying target folder...');
    const folder = await drive.files.get({
      fileId: config.targetFolderId,
      fields: 'id, name, mimeType'
    });
    console.log(`✓ Found folder: "${folder.data.name}"\n`);

    // 3. Create files rapidly
    console.log(`🚀 Creating ${config.fileCount} files rapidly...\n`);
    const startTime = Date.now();
    const filesCreated: string[] = [];

    for (let i = 0; i < config.fileCount; i++) {
      const timestamp = new Date().toISOString();
      const fileName = `[DEMO] Velocity Test ${i + 1} - ${timestamp}.txt`;

      const file = await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'text/plain',
          parents: [config.targetFolderId]
        },
        media: {
          mimeType: 'text/plain',
          body: [
            `Singura Detection Demo - Velocity Attack Test File`,
            ``,
            `File Number: ${i + 1} of ${config.fileCount}`,
            `Created: ${timestamp}`,
            `Purpose: Automated velocity detection testing`,
            ``,
            `This file was created by a service account to simulate`,
            `high-velocity automation that should trigger Singura's`,
            `velocity detector (threshold: 1 file/second).`,
            ``,
            `Expected Detection:`,
            `- Detector: Velocity`,
            `- Risk Level: High`,
            `- Risk Score: 75+`,
            ``,
            `Safe to delete after testing.`
          ].join('\n')
        }
      });

      filesCreated.push(file.data.id!);

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = ((i + 1) / elapsed).toFixed(2);
        console.log(`   ✓ Created ${i + 1}/${config.fileCount} files (${rate} files/sec)`);
      }

      // Small delay to spread over ~10 seconds but still very fast
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const duration = Date.now() - startTime;
    const durationSeconds = (duration / 1000).toFixed(2);
    const eventsPerSecond = (config.fileCount / (duration / 1000)).toFixed(2);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SCENARIO COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Performance Metrics:');
    console.log(`   Files Created: ${filesCreated.length}`);
    console.log(`   Total Duration: ${durationSeconds} seconds`);
    console.log(`   Average Rate: ${eventsPerSecond} files/second`);
    console.log(`   Human Threshold: 1.0 files/second`);
    console.log(`   Detection Status: ${parseFloat(eventsPerSecond) > 1.0 ? '✅ SHOULD TRIGGER' : '❌ BELOW THRESHOLD'}\n`);

    console.log('📈 Expected Detection:');
    console.log(`   Detector: Velocity Detector`);
    console.log(`   Risk Level: High`);
    console.log(`   Risk Score: 75-85`);
    console.log(`   Evidence: ${eventsPerSecond} files/sec > 1.0 files/sec threshold\n`);

    console.log('🔍 Next Steps:');
    console.log(`   1. Wait 5-10 minutes for Google audit logs to update`);
    console.log(`   2. Run Singura discovery:`);
    console.log(`      POST /api/discovery/run`);
    console.log(`      { "platform": "google", "connectionId": "..." }`);
    console.log(`   3. Check dashboard for velocity detection`);
    console.log(`   4. Verify detection metadata shows ~${eventsPerSecond} files/sec\n`);

    console.log('🧹 Cleanup:');
    console.log(`   To delete test files, run:`);
    console.log(`   npm run demo:cleanup -- ${config.targetFolderId}\n`);

    return {
      success: true,
      filesCreated,
      duration,
      eventsPerSecond: parseFloat(eventsPerSecond),
      expectedDetection: {
        detector: 'velocity',
        riskLevel: 'high',
        riskScore: 75
      }
    };

  } catch (error: any) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ SCENARIO FAILED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (error.message.includes('File not found')) {
      console.log('🔴 Target folder not found!\n');
      console.log('📝 To fix:');
      console.log('   1. Verify folder ID is correct');
      console.log('   2. Check folder exists in Google Drive');
      console.log('   3. Ensure service account has access to folder\n');
    } else if (error.message.includes('insufficient permissions')) {
      console.log('🔴 Insufficient permissions!\n');
      console.log('📝 To fix:');
      console.log('   1. Verify domain-wide delegation is enabled');
      console.log('   2. Check Drive scope is authorized');
      console.log('   3. Ensure impersonated user has access to folder\n');
    } else {
      console.log('🔴 Unexpected error:\n');
      console.log(error.message);
      console.log('\n📝 Full error details:');
      console.log(error);
    }

    throw error;
  }
}

// Configuration
const config: VelocityAttackConfig = {
  targetFolderId: process.env.DEMO_TEST_FOLDER_ID || 'REPLACE_WITH_FOLDER_ID',
  fileCount: parseInt(process.env.DEMO_FILE_COUNT || '50'),
  impersonateUser: process.env.DEMO_ADMIN_EMAIL || 'REPLACE_WITH_YOUR_ADMIN_EMAIL@YOUR-DOMAIN.COM'
};

// Validate config
if (config.targetFolderId === 'REPLACE_WITH_FOLDER_ID') {
  console.error('\n❌ Error: Target folder ID not configured!\n');
  console.error('📝 To fix:');
  console.error('   1. Create a folder in Google Drive named "[DEMO] Test Files"');
  console.error('   2. Copy the folder ID from the URL');
  console.error('   3. Set environment variable: DEMO_TEST_FOLDER_ID=<folder-id>');
  console.error('   4. Or edit this file and replace REPLACE_WITH_FOLDER_ID\n');
  process.exit(1);
}

if (config.impersonateUser === 'REPLACE_WITH_YOUR_ADMIN_EMAIL@YOUR-DOMAIN.COM') {
  console.error('\n❌ Error: Admin email not configured!\n');
  console.error('📝 To fix:');
  console.error('   1. Set environment variable: DEMO_ADMIN_EMAIL=your-admin@your-domain.com');
  console.error('   2. Or edit this file and replace REPLACE_WITH_YOUR_ADMIN_EMAIL\n');
  process.exit(1);
}

// Run it
runVelocityAttack(config).catch(error => {
  process.exit(1);
});
