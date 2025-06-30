import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Textarea,
  Select,
  Switch,
  Stack,
  HStack,
  VStack,
  Flex,
  Divider,
  Text,
  Tag,
  TagLabel,
  TagCloseButton,
  useToast,
} from '@chakra-ui/react';
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
  const toast = useToast();
  
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
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
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
          <Stack spacing={6}>
            {/* Basic Report Information */}
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={3}>
                Report Details
              </Text>
              
              <Stack spacing={4}>
                <Field name="name">
                  {({ field, form }: any) => (
                    <FormControl isInvalid={form.errors.name && form.touched.name}>
                      <FormLabel htmlFor="name">Report Name</FormLabel>
                      <Input {...field} id="name" placeholder="Monthly Sales Report" />
                      <FormErrorMessage>{form.errors.name}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                
                <Field name="description">
                  {({ field, form }: any) => (
                    <FormControl>
                      <FormLabel htmlFor="description">Description</FormLabel>
                      <Textarea
                        {...field}
                        id="description"
                        placeholder="Monthly sales broken down by product category"
                      />
                    </FormControl>
                  )}
                </Field>
              </Stack>
            </Box>
            
            <Divider />
            
            {/* Schedule Configuration */}
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={3}>
                Schedule Configuration
              </Text>
              
              <Stack spacing={4}>
                <Field name="frequency">
                  {({ field, form }: any) => (
                    <FormControl isInvalid={form.errors.frequency && form.touched.frequency}>
                      <FormLabel htmlFor="frequency">Frequency</FormLabel>
                      <Select {...field} id="frequency">
                        <option value={ReportScheduleFrequency.DAILY}>Daily</option>
                        <option value={ReportScheduleFrequency.WEEKLY}>Weekly</option>
                        <option value={ReportScheduleFrequency.MONTHLY}>Monthly</option>
                        <option value={ReportScheduleFrequency.QUARTERLY}>Quarterly</option>
                        <option value={ReportScheduleFrequency.ANNUAL}>Annual</option>
                      </Select>
                      <FormErrorMessage>{form.errors.frequency}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                
                <Field name="next_run_date">
                  {({ field, form }: any) => (
                    <FormControl isInvalid={form.errors.next_run_date && form.touched.next_run_date}>
                      <FormLabel htmlFor="next_run_date">Next Run Date</FormLabel>
                      <Input
                        {...field}
                        id="next_run_date"
                        type="datetime-local"
                      />
                      <FormErrorMessage>{form.errors.next_run_date}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                
                <Field name="enabled">
                  {({ field, form }: any) => (
                    <FormControl display="flex" alignItems="center">
                      <FormLabel htmlFor="enabled" mb="0">
                        Enabled
                      </FormLabel>
                      <Switch
                        {...field}
                        id="enabled"
                        isChecked={field.value}
                      />
                    </FormControl>
                  )}
                </Field>
              </Stack>
            </Box>
            
            <Divider />
            
            {/* Delivery Configuration */}
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={3}>
                Delivery Configuration
              </Text>
              
              <Stack spacing={4}>
                <Field name="export_format">
                  {({ field, form }: any) => (
                    <FormControl isInvalid={form.errors.export_format && form.touched.export_format}>
                      <FormLabel htmlFor="export_format">Export Format</FormLabel>
                      <Select {...field} id="export_format">
                        <option value={AnalyticsExportFormat.excel}>Excel</option>
                        <option value={AnalyticsExportFormat.csv}>CSV</option>
                        <option value={AnalyticsExportFormat.json}>JSON</option>
                      </Select>
                      <FormErrorMessage>{form.errors.export_format}</FormErrorMessage>
                    </FormControl>
                  )}
                </Field>
                
                <FormControl isInvalid={Boolean(errors.recipient_emails) && touched.recipient_emails as boolean}>
                  <FormLabel>Recipient Emails</FormLabel>
                  <FieldArray name="recipient_emails">
                    {({ push, remove }: any) => (
                      <VStack align="stretch" spacing={2}>
                        <Flex>
                          <Input
                            placeholder="Enter email and press Enter"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyDown={(e) => handleEmailInputKeyDown(e, push)}
                          />
                          <Button
                            ml={2}
                            onClick={() => {
                              if (newEmail.trim() && /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(newEmail)) {
                                push(newEmail.trim());
                                setNewEmail('');
                              }
                            }}
                          >
                            Add
                          </Button>
                        </Flex>
                        <Box minH="60px">
                          <Flex wrap="wrap" gap={2} mt={2}>
                            {values.recipient_emails?.map((email: string, index: number) => (
                              <Tag
                                size="md"
                                key={index}
                                borderRadius="full"
                                variant="solid"
                                colorScheme="blue"
                              >
                                <TagLabel>{email}</TagLabel>
                                <TagCloseButton onClick={() => remove(index)} />
                              </Tag>
                            ))}
                          </Flex>
                        </Box>
                        {errors.recipient_emails && touched.recipient_emails && (
                          <Text color="red.500" fontSize="sm">
                            {typeof errors.recipient_emails === 'string'
                              ? errors.recipient_emails
                              : 'Please add at least one valid recipient email'}
                          </Text>
                        )}
                      </VStack>
                    )}
                  </FieldArray>
                </FormControl>
              </Stack>
            </Box>
            
            <Divider />
            
            {/* Query Configuration */}
            <Box>
              <Text fontSize="lg" fontWeight="medium" mb={3}>
                Report Data Configuration
              </Text>
              
              <AnalyticsQueryBuilder
                initialQuery={values.query_params}
                onChange={(query) => handleQueryChange(query, setFieldValue)}
              />
            </Box>
            
            <Divider />
            
            {/* Form Actions */}
            <Flex justify="flex-end" mt={4}>
              <Button variant="outline" mr={3} onClick={onCancel}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                isLoading={isSubmitting}
                type="submit"
              >
                {initialValues ? 'Update Report' : 'Create Report'}
              </Button>
            </Flex>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};

export default ScheduledReportForm;
