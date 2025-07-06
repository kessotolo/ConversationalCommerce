import React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { ReturnStatus, ReturnRequestResponse } from '../models/return';
import { formatDate } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

  // Check if the process was rejected or cancelled
  const isRejected = returnRequest.status === ReturnStatus.REJECTED;
  const isCancelled = returnRequest.status === ReturnStatus.CANCELLED;

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-md shadow-sm w-full">
      <h3 className="font-bold mb-6 text-lg">Return Status</h3>

      <div className="flex flex-col md:flex-row justify-between items-start mb-2">
        {steps.map((step, index) => {
          // Determine if this step is active, completed, or inactive
          const isActive = index + 1 === activeStep;
          const isCompleted = index + 1 < activeStep;

          // Skip steps that aren't relevant due to cancellation/rejection
          if ((isCancelled && index > 0) || (isRejected && index > 1)) {
            return null;
          }

          // Determine step color classes
          let stepColorClasses = '';
          let textColorClasses = '';

          if (isActive) {
            if (isRejected || isCancelled) {
              stepColorClasses = 'bg-red-500 border-red-500 text-white';
            } else {
              stepColorClasses = 'bg-blue-500 border-blue-500 text-white';
            }
          } else if (isCompleted) {
            stepColorClasses = 'bg-green-500 border-green-500 text-white';
          } else {
            stepColorClasses = 'bg-transparent border-gray-300 text-gray-300 dark:border-gray-600 dark:text-gray-600';
          }

          textColorClasses = isActive || isCompleted ? 'text-inherit' : 'text-gray-500';

          return (
            <React.Fragment key={index}>
              {/* Divider between steps */}
              {index > 0 && (
                <div
                  className={cn(
                    "hidden md:block h-px flex-1 self-center mx-2",
                    isCompleted ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
              )}

              {/* Step circle */}
              <div className="flex-shrink-0 flex flex-col items-center space-y-2 w-full md:w-auto mb-4 md:mb-0">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex items-center justify-center",
                    stepColorClasses
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : isActive && (isRejected || isCancelled) ? (
                    <XIcon className="w-4 h-4" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>

                <div className="flex flex-col items-center space-y-0 text-center">
                  <span
                    className={cn(
                      "text-sm",
                      isActive ? 'font-bold' : 'font-medium',
                      textColorClasses
                    )}
                  >
                    {step.label}
                  </span>

                  <span
                    className="text-xs text-gray-500 block md:hidden"
                  >
                    {step.description}
                  </span>

                  {step.date && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-gray-500 cursor-help">
                            {formatDate(step.date)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Date: {formatDate(step.date, true)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Current status badge */}
      <div className="flex items-center justify-center space-x-2 mt-6">
        <span className="font-medium">Current Status:</span>
        <Badge
          variant={
            returnRequest.status === ReturnStatus.REJECTED || returnRequest.status === ReturnStatus.CANCELLED
              ? 'destructive'
              : returnRequest.status === ReturnStatus.COMPLETED
                ? 'default'
                : 'secondary'
          }
          className={cn(
            "px-2 py-1 rounded-md",
            returnRequest.status === ReturnStatus.COMPLETED && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          )}
        >
          {returnRequest.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>
    </div>
  );
};

export default ReturnStatusTracker;
