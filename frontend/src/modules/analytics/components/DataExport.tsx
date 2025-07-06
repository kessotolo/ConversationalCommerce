import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
// No dropdown or checkbox primitives found, so use semantic HTML and Tailwind for those.
import { FiDownload, FiChevronDown } from 'react-icons/fi';
import { AiOutlineFileExcel } from 'react-icons/ai';
import { BsFiletypeCsv, BsFiletypeJson } from 'react-icons/bs';
import AnalyticsService from '../services/AnalyticsService';
import type { AnalyticsQuery, ExportOptions } from '../services/AnalyticsService';

interface DataExportProps {
  query: AnalyticsQuery;
  disabled?: boolean;
  variant?: string;
  size?: string;
}

const DataExport: React.FC<DataExportProps> = ({
  query,
  disabled = false,
  variant = 'default', // shadcn/ui variant
  size = 'default', // shadcn/ui size
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [open, setOpen] = useState(false);
  const analyticsService = new AnalyticsService();

  // Export file name generator
  const getExportFileName = (format: string): string => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '-');
    
    const metrics = query.metrics.join('-');
    return `analytics-${metrics}-${dateStr}-${timeStr}.${format.toLowerCase()}`;
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'excel' | 'json') => {
    try {
      setIsExporting(true);
      
      const exportOptions: ExportOptions = {
        format,
        includeHeaders,
      };
      
      const response = await analyticsService.exportAnalytics(query, exportOptions);
      
      // Create a blob from the response data
      let blob;
      let contentType;
      
      if (format === 'csv') {
        contentType = 'text/csv';
      } else if (format === 'excel') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        contentType = 'application/json';
      }
      
      blob = new Blob([response.data], { type: contentType });
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = getExportFileName(format);
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      window.alert(`Export successful! Your data has been exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed', error);
      window.alert('Export failed. There was an error exporting your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Tailwind handles bg and border color with dark mode classes

  return (
    <div className="relative inline-block text-left">
      <Button
        type="button"
        variant={['default','link','destructive','outline','secondary','ghost'].includes(variant) ? variant as any : 'default'}
        size={['default','sm','lg','icon'].includes(size) ? size as any : 'default'}
        className="inline-flex items-center gap-2"
        disabled={disabled || isExporting}
        onClick={() => setOpen((open) => !open as boolean)}
      >
        <FiDownload className="w-4 h-4" />
        {isExporting ? (
          <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        ) : (
          'Export'
        )}
        <FiChevronDown className="w-4 h-4" />
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg focus:outline-none">
          <div className="p-3">
            <div className="font-semibold mb-2">Export Options</div>
            <div className="mb-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="includeHeaders"
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
                className="accent-blue-600"
              />
              <label htmlFor="includeHeaders" className="text-sm">Include column headers</label>
            </div>
            <hr className="my-3 border-gray-200 dark:border-gray-700" />
            <div className="font-semibold mb-2 text-sm">Format</div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                onClick={() => { handleExport('csv'); setOpen(false); }}
              >
                <BsFiletypeCsv className="w-4 h-4" /> CSV File
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                onClick={() => { handleExport('excel'); setOpen(false); }}
              >
                <AiOutlineFileExcel className="w-4 h-4 text-green-500" /> Excel Spreadsheet
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                onClick={() => { handleExport('json'); setOpen(false); }}
              >
                <BsFiletypeJson className="w-4 h-4 text-orange-500" /> JSON Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataExport;
