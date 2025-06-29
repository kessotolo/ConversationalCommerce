import React from 'react';
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Select,
  Input,
  VStack,
  Box,
  Textarea
} from '@chakra-ui/react';
import { ReturnReason } from '../models/return';
import { ReturnService } from '../services/ReturnService';

interface ReturnReasonSelectorProps {
  selectedReason: ReturnReason | '';
  explanation: string;
  onReasonChange: (reason: ReturnReason | '') => void;
  onExplanationChange: (explanation: string) => void;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
}

/**
 * Component for selecting a return reason with validation
 */
export const ReturnReasonSelector: React.FC<ReturnReasonSelectorProps> = ({
  selectedReason,
  explanation,
  onReasonChange,
  onExplanationChange,
  isRequired = true,
  isInvalid = false,
  errorMessage = 'Please select a reason for your return'
}) => {
  const reasonDescriptions = ReturnService.getReasonDescriptions();
  
  // Determine if an explanation is required based on the selected reason
  const isExplanationRequired = selectedReason === ReturnReason.OTHER;
  
  // Handle reason selection
  const handleReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ReturnReason | '';
    onReasonChange(value);
  };
  
  // Handle explanation change
  const handleExplanationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onExplanationChange(e.target.value);
  };
  
  return (
    <VStack spacing={4} align="stretch" width="100%">
      <FormControl isRequired={isRequired} isInvalid={isInvalid}>
        <FormLabel>Reason for Return</FormLabel>
        <Select 
          placeholder="Select reason" 
          value={selectedReason} 
          onChange={handleReasonChange}
        >
          {Object.values(ReturnReason).map((reason) => (
            <option key={reason} value={reason}>
              {reasonDescriptions[reason]}
            </option>
          ))}
        </Select>
        {isInvalid ? (
          <FormErrorMessage>{errorMessage}</FormErrorMessage>
        ) : (
          <FormHelperText>
            Please select the reason that best describes why you're returning this item
          </FormHelperText>
        )}
      </FormControl>
      
      <FormControl isRequired={isExplanationRequired} isInvalid={isExplanationRequired && !explanation}>
        <FormLabel>Additional Details</FormLabel>
        <Textarea
          value={explanation}
          onChange={handleExplanationChange}
          placeholder={
            isExplanationRequired 
              ? "Please explain why you're returning this item" 
              : "Optional - Add any additional details about your return"
          }
          size="md"
          resize="vertical"
        />
        {isExplanationRequired && !explanation ? (
          <FormErrorMessage>
            Please provide details about why you're returning this item
          </FormErrorMessage>
        ) : (
          <FormHelperText>
            {isExplanationRequired
              ? "Required for 'Other' reason"
              : "Optional - Help us improve by providing more details"}
          </FormHelperText>
        )}
      </FormControl>
    </VStack>
  );
};

export default ReturnReasonSelector;
