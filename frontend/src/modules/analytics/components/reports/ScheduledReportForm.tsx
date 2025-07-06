import React, { useState } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Add other shadcn/ui primitives as needed

import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import { format, addDays } from 'date-fns';

import { ScheduledReport, ReportScheduleFrequency } from '../../types/scheduledReport';
import { AnalyticsExportFormat, AnalyticsQuery } from '../../types/analytics';
import AnalyticsQueryBuilder from '../filters/AnalyticsQueryBuilder';

interface ScheduledReportFormProps {
  initialValues?: ScheduledReport;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

// Create Yup validation schema
const ReportSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  description: Yup.string(),
  frequency: Yup.string().required('Frequency is required'),
  export_format: Yup.string().required('Export format is required'),
  recipient_emails: Yup.array()
    .of(Yup.string().email('Invalid email address'))
    .min(1, 'At least one recipient email is required'),
  enabled: Yup.boolean(),
  next_run_date: Yup.date().required('Next run date is required'),
});

const ScheduledReportForm: React.FC<ScheduledReportFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const [newEmail, setNewEmail] = useState<string>('');
  // Default values for new report
  const defaultValues = {
    name: '',
    description: '',
    frequency: ReportScheduleFrequency.WEEKLY,
    export_format: AnalyticsExportFormat.excel,
    recipient_emails: [],
    enabled: true,
    next_run_date: format(addDays(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm'),
    query_params: {
      metrics: ['revenue', 'orders'],
      dimensions: ['date'],
      filters: {},
      date_range: {
        start_date: format(addDays(new Date(), -30), 'yyyy-MM-dd'),
        end_date: format(new Date(), 'yyyy-MM-dd'),
      },
      sort_by: 'date',
      sort_desc: false,
      limit: 1000,
    },
  };
  
  // Handle email input
  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, push: (email: string) => void) => {
    if (e.key === 'Enter' && newEmail.trim()) {
      e.preventDefault(); // Prevent form submission
      // Validate email
      if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(newEmail)) {
        window.alert('Please enter a valid email address');
        return;
      }
      push(newEmail.trim());
      setNewEmail('');
    }
  };
  
  // Handle query change
  const handleQueryChange = (query: AnalyticsQuery, setFieldValue: (field: string, value: any) => void) => {
    setFieldValue('query_params', query);
  };
  
  return (
    <Formik
      initialValues={initialValues || defaultValues}
      validationSchema={ReportSchema}
      onSubmit={(values) => {
        onSubmit(values);
      }}
    >
      {({ values, errors, touched, isSubmitting, setFieldValue }) => (
        <Form>
          <div className="space-y-6">
            {/* Basic Report Information */}
            <div>
              <div className="text-lg font-medium mb-3">Report Details</div>
              <div className="space-y-4">
                <Field name="name">
                  {({ field, form }: any) => (
                    <div className="space-y-1">
                      <label htmlFor="name" className="block font-medium">Report Name</label>
                      <input {...field} id="name" placeholder="Monthly Sales Report" className="w-full border rounded px-3 py-2" />
                      {form.errors.name && form.touched.name && (
                        <div className="text-red-500 text-sm">{form.errors.name}</div>
                      )}
                    </div>
                  )}
                </Field>
                <Field name="description">
                  {({ field, form }: any) => (
                    <div className="space-y-1">
                      <label htmlFor="description" className="block font-medium">Description</label>
                      <textarea
                        {...field}
                        id="description"
                        placeholder="Monthly sales broken down by product category"
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  )}
                </Field>
              </div>
            </div>
            <hr className="my-6" />
            
            {/* Schedule Configuration */}
            <div>
              <div className="text-lg font-medium mb-3">Schedule Configuration</div>
              <div className="space-y-4">
                <Field name="frequency">
                  {({ field, form }: any) => (
                    <div className="space-y-1">
                      <label htmlFor="frequency" className="block font-medium">Frequency</label>
                      <select {...field} id="frequency" className="w-full border rounded px-3 py-2">
                        <option value={ReportScheduleFrequency.DAILY}>Daily</option>
                        <option value={ReportScheduleFrequency.WEEKLY}>Weekly</option>
                        <option value={ReportScheduleFrequency.MONTHLY}>Monthly</option>
                        <option value={ReportScheduleFrequency.QUARTERLY}>Quarterly</option>
                        <option value={ReportScheduleFrequency.ANNUAL}>Annual</option>
                      </select>
                      {form.errors.frequency && form.touched.frequency && (
                        <div className="text-red-500 text-sm">{form.errors.frequency}</div>
                      )}
                    </div>
                  )}
                </Field>
                <Field name="next_run_date">
                  {({ field, form }: any) => (
                    <div className="space-y-1">
                      <label htmlFor="next_run_date" className="block font-medium">Next Run Date</label>
                      <input
                        {...field}
                        id="next_run_date"
                        type="datetime-local"
                        className="w-full border rounded px-3 py-2"
                      />
                      {form.errors.next_run_date && form.touched.next_run_date && (
                        <div className="text-red-500 text-sm">{form.errors.next_run_date}</div>
                      )}
                    </div>
                  )}
                </Field>
                <Field name="enabled">
                  {({ field, form }: any) => (
                    <div className="flex items-center space-x-2">
                      <label htmlFor="enabled" className="font-medium mb-0">Enabled</label>
                      <input
                        {...field}
                        id="enabled"
                        type="checkbox"
                        checked={field.value}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                    </div>
                  )}
                </Field>
              </div>
            </div>
            <hr className="my-6" />
            
            {/* Delivery Configuration */}
            <div>
              <div className="text-lg font-medium mb-3">Delivery Configuration</div>
              <div className="space-y-4">
                <Field name="export_format">
                  {({ field, form }: any) => (
                    <div className="space-y-1">
                      <label htmlFor="export_format" className="block font-medium">Export Format</label>
                      <select {...field} id="export_format" className="w-full border rounded px-3 py-2">
                        <option value={AnalyticsExportFormat.excel}>Excel</option>
                        <option value={AnalyticsExportFormat.csv}>CSV</option>
                        <option value={AnalyticsExportFormat.json}>JSON</option>
                      </select>
                      {form.errors.export_format && form.touched.export_format && (
                        <div className="text-red-500 text-sm">{form.errors.export_format}</div>
                      )}
                    </div>
                  )}
                </Field>
                <FieldArray name="recipient_emails">
                  {({ push, remove }: any) => (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          placeholder="Enter email and press Enter"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          onKeyDown={(e) => handleEmailInputKeyDown(e, push)}
                          className="w-full border rounded px-3 py-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newEmail.trim() && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(newEmail)) {
                              push(newEmail.trim());
                              setNewEmail('');
                            }
                          }}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                          Add
                        </button>
                      </div>
                      <div className="min-h-[60px] flex flex-wrap gap-2 mt-2">
                        {values.recipient_emails?.map((email: string, index: number) => (
                          <badge key={index} className="flex items-center gap-1">
                            {email}
                            <button type="button" onClick={() => remove(index)} className="text-red-500 ml-1">×</button>
                          </badge>
                        ))}
                      </div>
                      {errors.recipient_emails && touched.recipient_emails && (
                        <div className="text-red-500 text-sm">
                          {typeof errors.recipient_emails === 'string'
                            ? errors.recipient_emails
                            : 'Please add at least one valid recipient email'}
                        </div>
                      )}
                    </div>
                  )}
                </FieldArray>
              </div>
            </div>
            <hr className="my-6" />
            
            {/* Query Configuration */}
            <div>
              <div className="text-lg font-medium mb-3">Report Data Configuration</div>
              <AnalyticsQueryBuilder
                initialQuery={values.query_params}
                onChange={(query) => handleQueryChange(query, setFieldValue)}
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
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                {initialValues ? 'Update Report' : 'Create Report'}
              </button>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default ScheduledReportForm;
