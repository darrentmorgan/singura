/**
 * Export Dialog Component
 * Allows users to export automations to CSV or PDF format
 */

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import { useOrganization } from '@clerk/clerk-react';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import type { Automation, ExportRequest } from '@singura/shared-types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  automations: Automation[];
  selectedAutomationIds?: string[];
}

export function ExportDialog({
  isOpen,
  onClose,
  automations,
  selectedAutomationIds = []
}: ExportDialogProps) {
  const { organization } = useOrganization();
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    selectedAutomationIds.length > 0 ? selectedAutomationIds : automations.map(a => a.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [selectAll, setSelectAll] = useState(selectedAutomationIds.length === 0);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(automations.map(a => a.id));
      setSelectAll(true);
    }
  };

  const handleToggleAutomation = (id: string) => {
    if (selectedIds.includes(id)) {
      const newIds = selectedIds.filter(sid => sid !== id);
      setSelectedIds(newIds);
      setSelectAll(false);
    } else {
      const newIds = [...selectedIds, id];
      setSelectedIds(newIds);
      setSelectAll(newIds.length === automations.length);
    }
  };

  const handleExport = async () => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Please select at least one automation to export');
      return;
    }

    setIsExporting(true);

    try {
      const exportRequest: ExportRequest = {
        automationIds: selectedIds,
        organizationId: organization.id
      };

      let blob: Blob;
      let filename: string;

      if (exportFormat === 'csv') {
        blob = await api.exportAutomationsCSV(exportRequest);
        filename = `automations-export-${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        blob = await api.exportAutomationsPDF(exportRequest);
        filename = `automations-export-${new Date().toISOString().split('T')[0]}.pdf`;
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${selectedIds.length} automation(s)`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export automations. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Export Automations
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Select the format and automations you want to export.
                </p>
              </div>

              {/* Export format selection */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700">Export Format</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`relative rounded-lg border p-4 flex flex-col items-center cursor-pointer hover:border-gray-400 ${
                      exportFormat === 'csv'
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    <FileSpreadsheet className="h-8 w-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">CSV</span>
                    <span className="text-xs text-gray-500">Spreadsheet format</span>
                    {exportFormat === 'csv' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`relative rounded-lg border p-4 flex flex-col items-center cursor-pointer hover:border-gray-400 ${
                      exportFormat === 'pdf'
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    <FileText className="h-8 w-8 text-red-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">PDF</span>
                    <span className="text-xs text-gray-500">Document format</span>
                    {exportFormat === 'pdf' && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Automation selection */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Select Automations ({selectedIds.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    {selectAll ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                  {automations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No automations available to export
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {automations.map((automation) => (
                        <label
                          key={automation.id}
                          className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={selectedIds.includes(automation.id)}
                            onChange={() => handleToggleAutomation(automation.id)}
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">
                                {automation.name}
                              </span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                automation.risk?.level === 'critical'
                                  ? 'bg-red-100 text-red-800'
                                  : automation.risk?.level === 'high'
                                  ? 'bg-orange-100 text-orange-800'
                                  : automation.risk?.level === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {automation.risk?.level || 'unknown'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {automation.platform} • {automation.type}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              disabled={isExporting || selectedIds.length === 0}
              onClick={handleExport}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}