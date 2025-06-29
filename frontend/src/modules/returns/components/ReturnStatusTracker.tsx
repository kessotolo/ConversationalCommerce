import React from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Circle,
  Divider,
  useColorModeValue,
  Badge,
  Tooltip
} from '@chakra-ui/react';
import { CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { ReturnStatus, ReturnRequestResponse } from '../models/return';
import { formatDate } from '@/utils/format';

interface ReturnStatusTrackerProps {
  returnRequest: ReturnRequestResponse;
}

/**
 * Component for tracking and displaying return status progress
 */
export const ReturnStatusTracker: React.FC<ReturnStatusTrackerProps> = ({
  returnRequest
}) => {
  // Determine the active step based on current status
  const getActiveStep = (status: ReturnStatus): number => {
    const statusOrder = {
      [ReturnStatus.REQUESTED]: 1,
      [ReturnStatus.UNDER_REVIEW]: 2,
      [ReturnStatus.APPROVED]: 3,
      [ReturnStatus.PARTIAL_APPROVED]: 3,
      [ReturnStatus.REJECTED]: 2, // End state, but stops at review step
      [ReturnStatus.RECEIVED]: 4,
      [ReturnStatus.COMPLETED]: 5,
      [ReturnStatus.CANCELLED]: 1 // End state, but stops at request step
    };
    return statusOrder[status] || 1;
  };
  
  // Define all possible steps
  const steps = [
    { 
      label: 'Return Requested', 
      description: 'Return request submitted',
      date: returnRequest.requested_at 
    },
    { 
      label: 'Under Review', 
      description: 'Reviewing your request',
      date: null // We don't track this timestamp currently
    },
    { 
      label: returnRequest.status === ReturnStatus.PARTIAL_APPROVED ? 'Partially Approved' : 'Approved', 
      description: returnRequest.status === ReturnStatus.REJECTED 
        ? 'Return request not approved'
        : 'Return approved, awaiting items',
      date: returnRequest.processed_at
    },
    { 
      label: 'Items Received', 
      description: 'Items have been received',
      date: null // Would be tracked in a real system
    },
    { 
      label: 'Refund Processed', 
      description: 'Refund has been issued',
      date: returnRequest.refund_processed_at
    },
  ];

  // Get the current active step
  const activeStep = getActiveStep(returnRequest.status);
  
  // Color scheme
  const activeColor = useColorModeValue('blue.500', 'blue.300');
  const inactiveColor = useColorModeValue('gray.300', 'gray.600');
  const completedColor = useColorModeValue('green.500', 'green.300');
  const rejectedColor = useColorModeValue('red.500', 'red.300');
  
  // Check if the process was rejected or cancelled
  const isRejected = returnRequest.status === ReturnStatus.REJECTED;
  const isCancelled = returnRequest.status === ReturnStatus.CANCELLED;
  
  return (
    <Box bg={useColorModeValue('white', 'gray.800')} p={5} borderRadius="md" shadow="sm" w="100%">
      <Text fontWeight="bold" mb={6} fontSize="lg">Return Status</Text>
      
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" alignItems="flex-start" mb={2}>
        {steps.map((step, index) => {
          // Determine if this step is active, completed, or inactive
          const isActive = index + 1 === activeStep;
          const isCompleted = index + 1 < activeStep;
          
          // Skip steps that aren't relevant due to cancellation/rejection
          if ((isCancelled && index > 0) || (isRejected && index > 1)) {
            return null;
          }
          
          // Determine step color
          let stepColor = inactiveColor;
          if (isActive) {
            stepColor = (isRejected || isCancelled) ? rejectedColor : activeColor;
          } else if (isCompleted) {
            stepColor = completedColor;
          }
          
          return (
            <React.Fragment key={index}>
              {/* Divider between steps */}
              {index > 0 && (
                <Divider 
                  display={{ base: 'none', md: 'block' }} 
                  orientation="horizontal"
                  borderColor={isCompleted ? completedColor : inactiveColor}
                  flex="1"
                  alignSelf="center"
                  mx={2}
                />
              )}
            
              {/* Step circle */}
              <VStack flex="0 0 auto" spacing={2} width={{ base: "100%", md: "auto" }} mb={{ base: 4, md: 0 }}>
                <Circle 
                  size="40px"
                  bg={isActive || isCompleted ? stepColor : 'transparent'}
                  color={isActive || isCompleted ? 'white' : stepColor}
                  borderWidth={2}
                  borderColor={stepColor}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : isActive && (isRejected || isCancelled) ? (
                    <CloseIcon />
                  ) : (
                    <Text>{index + 1}</Text>
                  )}
                </Circle>
                
                <VStack spacing={0} textAlign="center">
                  <Text 
                    fontWeight={isActive ? 'bold' : 'medium'} 
                    color={isActive || isCompleted ? 'inherit' : 'gray.500'}
                    fontSize="sm"
                  >
                    {step.label}
                  </Text>
                  
                  <Text 
                    fontSize="xs" 
                    color="gray.500"
                    display={{ base: 'block', md: 'none' }} 
                  >
                    {step.description}
                  </Text>
                  
                  {step.date && (
                    <Tooltip label={`Date: ${formatDate(step.date, true)}`}>
                      <Text fontSize="xs" color="gray.500">
                        {formatDate(step.date)}
                      </Text>
                    </Tooltip>
                  )}
                </VStack>
              </VStack>
            </React.Fragment>
          );
        })}
      </Flex>
      
      {/* Current status badge */}
      <HStack mt={6} spacing={2} justify="center">
        <Text fontWeight="medium">Current Status:</Text>
        <Badge 
          colorScheme={
            returnRequest.status === ReturnStatus.REJECTED || returnRequest.status === ReturnStatus.CANCELLED
              ? 'red'
              : returnRequest.status === ReturnStatus.COMPLETED
                ? 'green'
                : 'blue'
          } 
          px={2} 
          py={1} 
          borderRadius="md"
        >
          {returnRequest.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </HStack>
    </Box>
  );
};

export default ReturnStatusTracker;
