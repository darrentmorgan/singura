/**
 * PDF Generation Test
 * Test the PDF generation functionality with sample data
 */

import { generatePDF } from './PDFGenerator';

// Sample automation data for testing
const sampleAutomations = [
  {
    id: 'test-1',
    name: 'Test Slack Bot',
    platform: 'slack',
    riskScore: 85,
    riskLevel: 'high' as const,
    status: 'active',
    discoveredAt: '2025-01-01T10:00:00Z',
    lastActivity: '2025-01-09T15:30:00Z',
    permissions: ['channels:read', 'chat:write'],
    description: 'Test automation for PDF generation',
    opportunity: {
      priority: 'high' // This was the problematic field
    }
  },
  {
    id: 'test-2', 
    name: 'Test Google Script',
    platform: 'google',
    riskScore: 45,
    riskLevel: 'medium' as const,
    status: 'acknowledged',
    discoveredAt: '2025-01-02T14:20:00Z',
    permissions: ['gmail.readonly'],
    opportunity: {
      priority: null // Test null value handling
    }
  },
  {
    id: 'test-3',
    name: 'Test Microsoft Flow',
    platform: 'microsoft',
    riskScore: 25,
    riskLevel: 'low' as const,
    status: 'suppressed',
    discoveredAt: '2025-01-03T08:30:00Z',
    opportunity: {
      priority: 123 // Test number value handling
    }
  }
];

// Test PDF generation
export const testPDFGeneration = async () => {
  try {
    console.log('Testing PDF generation...');
    
    const pdfBlob = await generatePDF(
      sampleAutomations,
      'security_summary',
      'Test Organization'
    );
    
    console.log('PDF generated successfully!', {
      size: pdfBlob.size,
      type: pdfBlob.type
    });
    
    return pdfBlob;
  } catch (error) {
    console.error('PDF generation test failed:', error);
    throw error;
  }
};

// Export for manual testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testPDFGeneration = testPDFGeneration;
}