import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  useToast,
  HStack,
  Text,
  Checkbox,
  Divider,
  useColorModeValue,
  Spinner,
} from '@chakra-ui/react';
import { FiDownload, FiChevronDown } from 'react-icons/fi';
import { AiOutlineFileExcel } from 'react-icons/ai';
import { BsFiletypeCsv, BsFiletypeJson } from 'react-icons/bs';
import AnalyticsService, { AnalyticsQuery, ExportOptions } from '../services/AnalyticsService';

interface DataExportProps {
  query: AnalyticsQuery;
  disabled?: boolean;
  variant?: string;
  size?: string;
}

const DataExport: React.FC<DataExportProps> = ({
  query,
  disabled = false,
  variant = 'solid',
  size = 'md',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const toast = useToast();
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
      
      toast({
        title: 'Export successful',
        description: `Your data has been exported as ${format.toUpperCase()}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Export failed', error);
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your data. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Button}
        rightIcon={<Icon as={FiChevronDown} />}
        leftIcon={<Icon as={FiDownload} />}
        variant={variant}
        size={size}
        isDisabled={disabled || isExporting}
        colorScheme="blue"
      >
        {isExporting ? <Spinner size="sm" /> : 'Export'}
      </MenuButton>
      <MenuList
        p={3}
        minWidth="200px"
        bg={bgColor}
        borderColor={borderColor}
        boxShadow="md"
      >
        <Text fontWeight="semibold" mb={2}>
          Export Options
        </Text>
        <Box mb={3}>
          <Checkbox
            isChecked={includeHeaders}
            onChange={(e) => setIncludeHeaders(e.target.checked)}
          >
            Include column headers
          </Checkbox>
        </Box>
        <Divider mb={3} />
        <Text fontWeight="semibold" mb={2} fontSize="sm">
          Format
        </Text>
        <Box>
          <MenuItem
            icon={<Icon as={BsFiletypeCsv} boxSize={4} />}
            onClick={() => handleExport('csv')}
            closeOnSelect={true}
          >
            CSV File
          </MenuItem>
          <MenuItem
            icon={<Icon as={AiOutlineFileExcel} boxSize={4} color="green.500" />}
            onClick={() => handleExport('excel')}
            closeOnSelect={true}
          >
            Excel Spreadsheet
          </MenuItem>
          <MenuItem
            icon={<Icon as={BsFiletypeJson} boxSize={4} color="orange.500" />}
            onClick={() => handleExport('json')}
            closeOnSelect={true}
          >
            JSON Data
          </MenuItem>
        </Box>
      </MenuList>
    </Menu>
  );
};

export default DataExport;
