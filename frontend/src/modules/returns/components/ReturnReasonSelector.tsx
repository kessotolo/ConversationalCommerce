import React from 'react';
import { ReturnReason } from '../models/return';
import { ReturnService } from '../services/ReturnService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
  const handleReasonChange = (value: string) => {
    onReasonChange(value as ReturnReason | '');
  };

  // Handle explanation change
  const handleExplanationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onExplanationChange(e.target.value);
  };

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="return-reason" className={cn(isRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
          Reason for Return
        </Label>
        <Select value={selectedReason} onValueChange={handleReasonChange}>
          <SelectTrigger id="return-reason" className={cn(isInvalid && "border-red-500")}>
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ReturnReason).map((reason) => (
              <SelectItem key={reason} value={reason}>
                {reasonDescriptions[reason]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isInvalid ? (
          <p className="text-red-500 text-sm">{errorMessage}</p>
        ) : (
          <p className="text-gray-500 text-sm">
            Please select the reason that best describes why you're returning this item
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="return-explanation" className={cn(isExplanationRequired && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
          Additional Details
        </Label>
        <Textarea
          id="return-explanation"
          value={explanation}
          onChange={handleExplanationChange}
          placeholder={
            isExplanationRequired
              ? "Please explain why you're returning this item"
              : "Optional - Add any additional details about your return"
          }
          className={cn(
            "resize-y",
            isExplanationRequired && !explanation && "border-red-500"
          )}
        />
        {isExplanationRequired && !explanation ? (
          <p className="text-red-500 text-sm">
            Please provide details about why you're returning this item
          </p>
        ) : (
          <p className="text-gray-500 text-sm">
            {isExplanationRequired
              ? "Required for 'Other' reason"
              : "Optional - Help us improve by providing more details"}
          </p>
        )}
      </div>
    </div>
  );
};

export default ReturnReasonSelector;
