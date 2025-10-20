/**
 * PDF Generation Component
 * Generates PDF reports for automation compliance and risk assessment
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  pdf
} from '@react-pdf/renderer';
import { Download, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';

// Safe type checking utilities
const safeToString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (value === null || value === undefined) return 'N/A';
  return String(value);
};

const safeToUpperCase = (value: unknown): string => {
  const str = safeToString(value);
  return str.toUpperCase();
};

// PDF Styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20
  },
  section: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4B5563',
    width: 120
  },
  value: {
    fontSize: 10,
    color: '#1F2937',
    flex: 1
  },
  riskHigh: {
    color: '#DC2626',
    fontWeight: 'bold'
  },
  riskMedium: {
    color: '#D97706',
    fontWeight: 'bold'
  },
  riskLow: {
    color: '#059669',
    fontWeight: 'bold'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10
  }
});

// Automation interface with safe defaults
interface Automation {
  id: string;
  name: string;
  platform: string;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low' | 'critical' | 'unknown';
  status: string;
  discoveredAt: string;
  lastActivity?: string;
  permissions?: string[];
  description?: string;
  // Handle potential "opportunity" data structure
  opportunity?: {
    priority?: string | number | null;
    [key: string]: unknown;
  };
}

interface PDFReportProps {
  automations: Automation[];
  organizationName?: string;
  reportType: 'risk_assessment' | 'compliance' | 'automation_inventory' | 'security_summary';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

// PDF Document Component
const AutomationReport: React.FC<PDFReportProps> = ({
  automations,
  organizationName = `${BRAND.name} Organization`,
  reportType = 'risk_assessment',
  dateRange
}) => {
  const reportTitles = {
    'risk_assessment': 'Automation Risk Assessment Report',
    'compliance': 'Compliance Audit Report',
    'automation_inventory': 'Automation Inventory Report',
    'security_summary': 'Security Summary Report'
  };

  const currentDate = new Date().toLocaleDateString();
  const title = reportTitles[reportType];

  // Safe data processing with error handling
  const processAutomationData = (automation: Automation) => {
    return {
      ...automation,
      name: safeToString(automation.name),
      platform: safeToUpperCase(automation.platform),
      riskLevel: safeToUpperCase(automation.riskLevel),
      status: safeToUpperCase(automation.status),
      // Safely handle the problematic opportunity.priority field
      priority: automation.opportunity?.priority 
        ? safeToUpperCase(automation.opportunity.priority)
        : 'NOT SET',
      riskScore: typeof automation.riskScore === 'number' ? automation.riskScore : 0,
      discoveredAt: automation.discoveredAt || 'Unknown',
      lastActivity: automation.lastActivity || 'No recent activity',
      permissions: Array.isArray(automation.permissions) 
        ? automation.permissions.join(', ') 
        : 'No permissions listed',
      description: safeToString(automation.description || 'No description available')
    };
  };

  // Generate summary statistics
  const stats = {
    total: automations.length,
    high: automations.filter(a => a.riskLevel === 'high').length,
    medium: automations.filter(a => a.riskLevel === 'medium').length,
    low: automations.filter(a => a.riskLevel === 'low').length,
    platforms: [...new Set(automations.map(a => safeToString(a.platform)))].length
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            Generated for {organizationName} on {currentDate}
          </Text>
          {dateRange && (
            <Text style={styles.subtitle}>
              Report Period: {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Automations:</Text>
            <Text style={styles.value}>{stats.total}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>High Risk:</Text>
            <Text style={[styles.value, styles.riskHigh]}>{stats.high}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Medium Risk:</Text>
            <Text style={[styles.value, styles.riskMedium]}>{stats.medium}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Low Risk:</Text>
            <Text style={[styles.value, styles.riskLow]}>{stats.low}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Connected Platforms:</Text>
            <Text style={styles.value}>{stats.platforms}</Text>
          </View>
        </View>

        {/* Automation Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation Details</Text>
          {automations.slice(0, 10).map((automation) => {
            const processedAutomation = processAutomationData(automation);
            const riskStyle = 
              processedAutomation.riskLevel === 'HIGH' ? styles.riskHigh :
              processedAutomation.riskLevel === 'MEDIUM' ? styles.riskMedium :
              styles.riskLow;

            return (
              <View key={automation.id} style={{ marginBottom: 15, padding: 8, backgroundColor: '#F3F4F6' }}>
                <View style={styles.row}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={[styles.value, { fontWeight: 'bold' }]}>{processedAutomation.name}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Platform:</Text>
                  <Text style={styles.value}>{processedAutomation.platform}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Risk Level:</Text>
                  <Text style={[styles.value, riskStyle]}>
                    {processedAutomation.riskLevel} ({processedAutomation.riskScore}/100)
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Status:</Text>
                  <Text style={styles.value}>{processedAutomation.status}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Priority:</Text>
                  <Text style={styles.value}>{processedAutomation.priority}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Discovered:</Text>
                  <Text style={styles.value}>{processedAutomation.discoveredAt}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Permissions:</Text>
                  <Text style={[styles.value, { fontSize: 8 }]}>{processedAutomation.permissions}</Text>
                </View>
              </View>
            );
          })}
          
          {automations.length > 10 && (
            <Text style={[styles.value, { fontStyle: 'italic', textAlign: 'center' }]}>
              ... and {automations.length - 10} more automations
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by {BRAND.name} - Shadow AI Detection Platform | {currentDate}
        </Text>
      </Page>
    </Document>
  );
};

// PDF Generator Component Props
interface PDFGeneratorProps {
  automations: Automation[];
  organizationName?: string;
  reportType?: 'risk_assessment' | 'compliance' | 'automation_inventory' | 'security_summary';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  className?: string;
}

// Main PDF Generator Component
export const PDFGenerator: React.FC<PDFGeneratorProps> = ({
  automations,
  organizationName = `${BRAND.name} Organization`,
  reportType = 'risk_assessment',
  dateRange,
  className = ''
}) => {
  const reportTitles = {
    'risk_assessment': 'Risk Assessment Report',
    'compliance': 'Compliance Audit Report', 
    'automation_inventory': 'Automation Inventory',
    'security_summary': 'Security Summary'
  };

  const fileName = `${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;

  try {
    return (
      <div className={className}>
        <PDFDownloadLink
          document={
            <AutomationReport
              automations={automations}
              organizationName={organizationName}
              reportType={reportType}
              dateRange={dateRange}
            />
          }
          fileName={fileName}
        >
          {({ loading, error }) => {
            if (error) {
              return (
                <Button variant="outline" className="text-red-600 border-red-200">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  PDF Generation Error
                </Button>
              );
            }

            if (loading) {
              return (
                <Button variant="outline" disabled>
                  <FileText className="h-4 w-4 mr-2 animate-pulse" />
                  Generating PDF...
                </Button>
              );
            }

            return (
              <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-300">
                <Download className="h-4 w-4 mr-2" />
                Download {reportTitles[reportType]}
              </Button>
            );
          }}
        </PDFDownloadLink>
      </div>
    );
  } catch (error) {
    console.error('PDF Generator component error:', error);
    return (
      <Button variant="outline" className="text-red-600 border-red-200" disabled>
        <AlertTriangle className="h-4 w-4 mr-2" />
        PDF Generation Unavailable
      </Button>
    );
  }
};

// Export PDF generation utility function for programmatic use
// eslint-disable-next-line react-refresh/only-export-components
export const generatePDF = async (
  automations: Automation[],
  reportType: 'risk_assessment' | 'compliance' | 'automation_inventory' | 'security_summary' = 'risk_assessment',
  organizationName = `${BRAND.name} Organization`
): Promise<Blob> => {
  try {
    const doc = (
      <AutomationReport
        automations={automations}
        organizationName={organizationName}
        reportType={reportType}
      />
    );
    
    const blob = await pdf(doc).toBlob();
    return blob;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default PDFGenerator;