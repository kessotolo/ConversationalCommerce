import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
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
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Scheduled Reports</Heading>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="blue"
          onClick={handleCreateReport}
        >
          Create Report
        </Button>
      </Flex>

      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      ) : reports.length === 0 ? (
        <Box
          p={8}
          textAlign="center"
          borderWidth={1}
          borderRadius="md"
          borderStyle="dashed"
        >
          <Text fontSize="lg" mb={4}>
            No scheduled reports found
          </Text>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={handleCreateReport}
          >
            Create Your First Report
          </Button>
        </Box>
      ) : (
        <Table variant="simple" borderWidth={1} borderRadius="md">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Frequency</Th>
              <Th>Format</Th>
              <Th>Next Run</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {reports.map((report) => (
              <Tr key={report.id}>
                <Td>
                  <Text fontWeight="medium">{report.name}</Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>
                    {report.description || 'No description'}
                  </Text>
                </Td>
                <Td>{getFrequencyText(report.frequency)}</Td>
                <Td>{getExportFormatText(report.export_format)}</Td>
                <Td>{formatDate(report.next_run_date)}</Td>
                <Td>
                  <Badge
                    colorScheme={report.enabled ? 'green' : 'gray'}
                    variant="subtle"
                    px={2}
                    py={1}
                    borderRadius="full"
                  >
                    {report.enabled ? 'Active' : 'Paused'}
                  </Badge>
                </Td>
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                      size="sm"
                      aria-label="Actions"
                    />
                    <MenuList>
                      <MenuItem
                        icon={<FiEdit2 />}
                        onClick={() => handleEditReport(report)}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        icon={<FiSend />}
                        onClick={() => handleRunNow(report)}
                        isDisabled={isRunningNow}
                      >
                        Run Now
                      </MenuItem>
                      <MenuItem
                        icon={<FiTrash2 />}
                        onClick={() => handleDeleteClick(report)}
                        color="red.500"
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Create/Edit Report Form Modal */}
      <Modal isOpen={isFormOpen} onClose={onFormClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedReport ? 'Edit Report' : 'Create Report'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <ScheduledReportForm
              initialValues={selectedReport || undefined}
              onSubmit={handleSaveReport}
              onCancel={onFormClose}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete the report "{selectedReport?.name}"?
              This action cannot be undone.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              onClick={handleDeleteConfirm}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ScheduledReportsManager;
