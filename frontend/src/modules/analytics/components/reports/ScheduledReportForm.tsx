import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { ScheduledReport, ScheduledReportCreate, ReportScheduleFrequency } from '../../types/scheduledReport';
import { AnalyticsExportFormat } from '../../types/analytics';
import AnalyticsQueryBuilder from '../filters/AnalyticsQueryBuilder';

interface ScheduledReportFormProps {
  initialValues?: ScheduledReport;
  onSubmit: (data: ScheduledReportCreate) => void;
  onCancel: () => void;
}

const ScheduledReportForm: React.FC<ScheduledReportFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
}) => {
  // Helper to get default date
  const getDefaultNextRunDate = () => {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  };

  // Helper to ensure a DateRange object with string fields, never undefined
  const getSafeDateRange = (dateRange: unknown): { start_date: string; end_date: string } => {
    const fallbackStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fallbackEnd = new Date().toISOString().split('T')[0];
    let start_date = fallbackStart;
    let end_date = fallbackEnd;
    if (dateRange && typeof dateRange === 'object') {
      const dr = dateRange as Record<string, unknown>;
      if (typeof dr.start_date === 'string' && dr.start_date.trim() !== '') {
        start_date = dr.start_date;
      }
      if (typeof dr.end_date === 'string' && dr.end_date.trim() !== '') {
        end_date = dr.end_date;
      }
    }
    return { start_date, end_date };
  };


  // Form state
  const [formData, setFormData] = useState<ScheduledReportCreate>({
    name: initialValues?.name || '',
    description: initialValues?.description || '',
    frequency: initialValues?.frequency || ReportScheduleFrequency.MONTHLY,
    recipient_emails: initialValues?.recipient_emails || [],
    export_format: initialValues?.export_format || AnalyticsExportFormat.excel,
    enabled: initialValues?.enabled === undefined ? true : initialValues.enabled,
    next_run_date: (initialValues?.next_run_date && initialValues.next_run_date !== '' ? initialValues.next_run_date : getDefaultNextRunDate()),
    query_params: {
      metrics: Array.isArray(initialValues?.query_params?.metrics) ? initialValues.query_params.metrics : [],
      dimensions: Array.isArray(initialValues?.query_params?.dimensions) ? initialValues.query_params.dimensions : [],
      filters: typeof initialValues?.query_params?.filters === 'object' && initialValues.query_params.filters !== null ? initialValues.query_params.filters : {},
      date_range: getSafeDateRange(initialValues?.query_params?.date_range),
      sort_by: typeof initialValues?.query_params?.sort_by === 'string' ? initialValues.query_params.sort_by : '',
      sort_desc: typeof initialValues?.query_params?.sort_desc === 'boolean' ? initialValues.query_params.sort_desc : false,
      limit: typeof initialValues?.query_params?.limit === 'number' ? initialValues.query_params.limit : 1000
    }
  });

  // Email input state
  const [emailInput, setEmailInput] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Frequency is required';
    }

    if (!formData.export_format) {
      newErrors.export_format = 'Export format is required';
    }

    if (!formData.next_run_date) {
      newErrors.next_run_date = 'Next run date is required';
    }

    if (formData.recipient_emails.length === 0) {
      newErrors.recipient_emails = 'At least one recipient email is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof ScheduledReportCreate, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle email addition
  const handleAddEmail = () => {
    if (emailInput.trim() && !formData.recipient_emails.includes(emailInput.trim())) {
      handleInputChange('recipient_emails', [...formData.recipient_emails, emailInput.trim()]);
      setEmailInput('');
    }
  };

  // Handle email removal
  const handleRemoveEmail = (index: number) => {
    const newEmails = formData.recipient_emails.filter((_, i) => i !== index);
    handleInputChange('recipient_emails', newEmails);
  };

  // Handle email input key press
  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  // Handle query change
  const handleQueryChange = (query: any) => {
    handleInputChange('query_params', query);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Report Details */}
        <div>
          <div className="text-lg font-medium mb-3">Report Details</div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="name" className="block font-medium">Report Name</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Monthly Sales Report"
                className="w-full border rounded px-3 py-2"
              />
              {errors.name && (
                <div className="text-red-500 text-sm">{errors.name}</div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="block font-medium">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed sales report for the month"
                rows={3}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <hr className="my-6" />

        {/* Schedule Configuration */}
        <div>
          <div className="text-lg font-medium mb-3">Schedule Configuration</div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="frequency" className="block font-medium">Frequency</label>
              <select
                id="frequency"
                value={formData.frequency}
                onChange={(e) => handleInputChange('frequency', e.target.value as ReportScheduleFrequency)}
                className="w-full border rounded px-3 py-2"
              >
                <option value={ReportScheduleFrequency.DAILY}>Daily</option>
                <option value={ReportScheduleFrequency.WEEKLY}>Weekly</option>
                <option value={ReportScheduleFrequency.MONTHLY}>Monthly</option>
                <option value={ReportScheduleFrequency.QUARTERLY}>Quarterly</option>
                <option value={ReportScheduleFrequency.ANNUAL}>Annual</option>
              </select>
              {errors.frequency && (
                <div className="text-red-500 text-sm">{errors.frequency}</div>
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor="next_run_date" className="block font-medium">Next Run Date</label>
              <input
                id="next_run_date"
                type="date"
                value={formData.next_run_date}
                onChange={(e) => handleInputChange('next_run_date', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              {errors.next_run_date && (
                <div className="text-red-500 text-sm">{errors.next_run_date}</div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="enabled" className="font-medium mb-0">Enabled</label>
              <input
                id="enabled"
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600"
              />
            </div>
          </div>
        </div>

        <hr className="my-6" />

        {/* Delivery Configuration */}
        <div>
          <div className="text-lg font-medium mb-3">Delivery Configuration</div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="export_format" className="block font-medium">Export Format</label>
              <select
                id="export_format"
                value={formData.export_format}
                onChange={(e) => handleInputChange('export_format', e.target.value as AnalyticsExportFormat)}
                className="w-full border rounded px-3 py-2"
              >
                <option value={AnalyticsExportFormat.excel}>Excel</option>
                <option value={AnalyticsExportFormat.csv}>CSV</option>
                <option value={AnalyticsExportFormat.json}>JSON</option>
              </select>
              {errors.export_format && (
                <div className="text-red-500 text-sm">{errors.export_format}</div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyPress={handleEmailKeyPress}
                  placeholder="Enter email and press Enter"
                  className="w-full border rounded px-3 py-2"
                />
                <button
                  type="button"
                  onClick={handleAddEmail}
                  disabled={!emailInput.trim()}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="min-h-[60px] flex flex-wrap gap-2 mt-2">
                {formData.recipient_emails.map((email, index) => (
                  <Badge key={index} className="flex items-center gap-1">
                    {email}
                    <button type="button" onClick={() => handleRemoveEmail(index)} className="text-red-500 ml-1">×</button>
                  </Badge>
                ))}
              </div>
              {errors.recipient_emails && (
                <div className="text-red-500 text-sm">
                  {errors.recipient_emails}
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="my-6" />

        {/* Report Data Configuration */}
        <div>
          <div className="text-lg font-medium mb-3">Report Data Configuration</div>
          <AnalyticsQueryBuilder
            initialQuery={formData.query_params}
            onChange={handleQueryChange}
          />
        </div>

        <hr className="my-6" />

        {/* Form Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {initialValues ? 'Update Report' : 'Create Report'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ScheduledReportForm;
