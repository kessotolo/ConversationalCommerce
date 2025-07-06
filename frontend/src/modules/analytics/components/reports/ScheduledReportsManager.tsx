import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// No modal, menu, or alert primitives found, so use semantic HTML and Tailwind for those.
// Use native dialog for modals and window.alert for notifications.
import { FiPlus, FiEdit2, FiTrash2, FiSend, FiMoreVertical } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';

import { ScheduledReportService } from '../../services/ScheduledReportService';
import { ScheduledReport, ReportScheduleFrequency } from '../../types/scheduledReport';
import { AnalyticsExportFormat } from '../../types/analytics';
import ScheduledReportForm from './ScheduledReportForm';

const ScheduledReportsManager: React.FC = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isRunningNow, setIsRunningNow] = useState<boolean>(false);
  
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  const toast = useToast();
  
  // Load scheduled reports
  useEffect(() => {
    fetchReports();
  }, []);
  
  // Fetch reports from API
  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await ScheduledReportService.getAll();
      setReports(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load scheduled reports');
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Get frequency display text
  const getFrequencyText = (frequency: ReportScheduleFrequency) => {
    const map: Record<ReportScheduleFrequency, string> = {
      [ReportScheduleFrequency.DAILY]: 'Daily',
      [ReportScheduleFrequency.WEEKLY]: 'Weekly',
      [ReportScheduleFrequency.MONTHLY]: 'Monthly',
      [ReportScheduleFrequency.QUARTERLY]: 'Quarterly',
      [ReportScheduleFrequency.ANNUAL]: 'Annual',
    };
    return map[frequency] || 'Unknown';
  };
  
  // Get export format display text
  const getExportFormatText = (format: AnalyticsExportFormat) => {
    const map: Record<AnalyticsExportFormat, string> = {
      [AnalyticsExportFormat.csv]: 'CSV',
      [AnalyticsExportFormat.excel]: 'Excel',
      [AnalyticsExportFormat.json]: 'JSON',
    };
    return map[format] || 'Unknown';
  };
  
  // Handle edit report
  const handleEditReport = (report: ScheduledReport) => {
    setSelectedReport(report);
    onFormOpen();
  };
  
  // Handle create new report
  const handleCreateReport = () => {
    setSelectedReport(null);
    onFormOpen();
  };
  
  // Handle delete report button
  const handleDeleteClick = (report: ScheduledReport) => {
    setSelectedReport(report);
    onDeleteOpen();
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedReport) return;
    
    try {
      setIsDeleting(true);
      await ScheduledReportService.delete(selectedReport.id);
      
      // Update UI
      setReports((prev) => prev.filter((r) => r.id !== selectedReport.id));
      
      toast({
        title: 'Report deleted',
        description: `${selectedReport.name} has been deleted.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onDeleteClose();
      
    } catch (err: any) {
      toast({
        title: 'Failed to delete report',
        description: err.message || 'An error occurred while deleting the report.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle run report now
  const handleRunNow = async (report: ScheduledReport) => {
    try {
      setIsRunningNow(true);
      await ScheduledReportService.runNow(report.id);
      
      toast({
        title: 'Report scheduled',
        description: `${report.name} has been scheduled for immediate execution.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
    } catch (err: any) {
      toast({
        title: 'Failed to run report',
        description: err.message || 'An error occurred while running the report.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRunningNow(false);
    }
  };
  
  // Handle save report (create or update)
  const handleSaveReport = async (reportData: any) => {
    try {
      if (selectedReport) {
        // Update existing report
        const updated = await ScheduledReportService.update(selectedReport.id, reportData);
        setReports((prev) =>
          prev.map((r) => (r.id === selectedReport.id ? updated : r))
        );
        
        toast({
          title: 'Report updated',
          description: `${updated.name} has been updated.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // Create new report
        const created = await ScheduledReportService.create(reportData);
        setReports((prev) => [...prev, created]);
        
        toast({
          title: 'Report created',
          description: `${created.name} has been created.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }
      
      onFormClose();
      
    } catch (err: any) {
      toast({
        title: 'Failed to save report',
        description: err.message || 'An error occurred while saving the report.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Scheduled Reports</h2>
        <Button
          onClick={handleCreateReport}
          className="flex items-center gap-2"
        >
          <FiPlus className="w-4 h-4" /> Create Report
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
          <span className="font-bold mr-2">Error!</span>
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <span className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-300 rounded-md">
          <div className="text-lg mb-4">No scheduled reports found</div>
          <Button
            onClick={handleCreateReport}
            className="flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" /> Create Your First Report
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
          <table className="min-w-full bg-white dark:bg-gray-900">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Name</th>
                <th className="px-4 py-2 text-left font-semibold">Frequency</th>
                <th className="px-4 py-2 text-left font-semibold">Format</th>
                <th className="px-4 py-2 text-left font-semibold">Next Run</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-2">
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {report.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-4 py-2">{getFrequencyText(report.frequency)}</td>
                  <td className="px-4 py-2">{getExportFormatText(report.export_format)}</td>
                  <td className="px-4 py-2">{formatDate(report.next_run_date)}</td>
                  <td className="px-4 py-2">
                    <Badge variant={report.enabled ? 'success' : 'secondary'}>
                      {report.enabled ? 'Active' : 'Paused'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={() => setSelectedReport(report)}
                        aria-haspopup="menu"
                        aria-expanded={selectedReport?.id === report.id}
                      >
                        <FiMoreVertical className="w-5 h-5" />
                      </button>
                      {selectedReport?.id === report.id && (
                        <ul className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                          <li>
                            <button
                              className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                              onClick={() => handleEditReport(report)}
                            >
                              <FiEdit2 className="w-4 h-4" /> Edit
                            </button>
                          </li>
                          <li>
                            <button
                              className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-700 text-left"
                              onClick={() => handleRunNow(report)}
                              disabled={isRunningNow}
                            >
                              <FiSend className="w-4 h-4" /> Run Now
                            </button>
                          </li>
                          <li>
                            <button
                              className="flex items-center gap-2 px-4 py-2 w-full hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-red-600"
                              onClick={() => handleDeleteClick(report)}
                            >
                              <FiTrash2 className="w-4 h-4" /> Delete
                            </button>
                          </li>
                        </ul>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Report Form Modal */}
      <dialog open={isFormOpen} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h3 className="text-lg font-semibold">
              {selectedReport ? 'Edit Report' : 'Create Report'}
            </h3>
            <button
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={onFormClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-6">
            <ScheduledReportForm
              initialValues={selectedReport || undefined}
              onSubmit={handleSaveReport}
              onCancel={onFormClose}
            />
          </div>
        </div>
      </dialog>

      {/* Delete Confirmation Modal */}
      <dialog open={isDeleteOpen} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Delete Report</h3>
            <button
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={onDeleteClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="p-6">
            <div className="mb-4">
              Are you sure you want to delete the report "{selectedReport?.name}"? This action cannot be undone.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default ScheduledReportsManager;
