'use client';

import { useState } from 'react';
import {
    Building2,
    Upload,
    CheckCircle,
    ArrowRight,
    Sparkles,
    FileText,
    Globe,
    CreditCard
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface SetupTask {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    icon: React.ReactNode;
    action?: () => void;
    actionLabel?: string;
}

interface ActivationSetupStageProps {
    tasks: SetupTask[];
    onTaskAction: (taskId: string) => void;
    onStageComplete?: () => void;
    className?: string;
}

export default function ActivationSetupStage({
    tasks,
    onTaskAction,
    onStageComplete,
    className = ''
}: ActivationSetupStageProps) {
    const [hoveredTask, setHoveredTask] = useState<string | null>(null);

    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const isStageComplete = completedTasks === totalTasks;

    const handleTaskAction = (taskId: string) => {
        onTaskAction(taskId);

        // Check if this completes the stage
        const updatedCompletedCount = tasks.filter(task =>
            task.id === taskId ? true : task.completed
        ).length;

        if (updatedCompletedCount === totalTasks && onStageComplete) {
            setTimeout(() => onStageComplete(), 500); // Small delay for animation
        }
    };

    return (
        <Card
            className={`
        relative overflow-hidden transition-all duration-500 hover:shadow-xl
        bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40
        border-2 border-blue-100/50 backdrop-blur-sm
        ${isStageComplete ? 'border-green-200 bg-gradient-to-br from-green-50/30 to-emerald-50/40' : ''}
        ${className}
      `}
            data-testid="activation-setup-stage"
        >
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-transparent to-indigo-600/5" />

            {/* Sparkle animation for completed stage */}
            {isStageComplete && (
                <div className="absolute top-4 right-4 animate-pulse">
                    <Sparkles className="h-6 w-6 text-green-500" />
                </div>
            )}

            <CardContent className="relative p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`
              p-3 rounded-xl transition-all duration-300
              ${isStageComplete
                                ? 'bg-green-100 text-green-600'
                                : 'bg-blue-100 text-blue-600'
                            }
            `}>
                            {isStageComplete ? (
                                <CheckCircle className="h-6 w-6" />
                            ) : (
                                <Building2 className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Get Set Up
                            </h3>
                            <p className="text-sm text-gray-600">
                                Essential setup to get your store ready
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant={isStageComplete ? "default" : "secondary"}
                        className={`
              px-3 py-1 text-xs font-medium
              ${isStageComplete
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }
            `}
                    >
                        {completedTasks}/{totalTasks} Complete
                    </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`
                h-2.5 rounded-full transition-all duration-700 ease-out
                ${isStageComplete
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                }
              `}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`
                group relative p-4 rounded-xl border transition-all duration-300
                ${task.completed
                                    ? 'bg-green-50/50 border-green-200 shadow-sm'
                                    : 'bg-white/80 border-gray-200 hover:border-blue-300 hover:shadow-md'
                                }
                ${hoveredTask === task.id ? 'scale-[1.02]' : ''}
              `}
                            onMouseEnter={() => setHoveredTask(task.id)}
                            onMouseLeave={() => setHoveredTask(null)}
                            data-testid={`setup-task-${task.id}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`
                    p-2 rounded-lg transition-all duration-300
                    ${task.completed
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
                                        }
                  `}>
                                        {task.completed ? (
                                            <CheckCircle className="h-5 w-5" />
                                        ) : (
                                            task.icon
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`
                      font-medium transition-colors duration-300
                      ${task.completed
                                                ? 'text-green-800 line-through'
                                                : 'text-gray-900'
                                            }
                    `}>
                                            {task.title}
                                        </h4>
                                        <p className={`
                      text-sm transition-colors duration-300
                      ${task.completed
                                                ? 'text-green-600'
                                                : 'text-gray-600'
                                            }
                    `}>
                                            {task.description}
                                        </p>
                                    </div>
                                </div>

                                {!task.completed && task.actionLabel && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleTaskAction(task.id)}
                                        className="
                      ml-3 bg-blue-600 hover:bg-blue-700 text-white
                      transition-all duration-300 hover:scale-105
                      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    "
                                        data-testid={`setup-task-action-${task.id}`}
                                        aria-label={`${task.actionLabel} for ${task.title}`}
                                    >
                                        {task.actionLabel}
                                        <ArrowRight className="h-4 w-4 ml-1" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stage Complete Message */}
                {isStageComplete && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-green-800">Setup Complete!</h4>
                                <p className="text-sm text-green-700">
                                    Great job! Your store is now ready for the next stage.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Default setup tasks - can be customized
export const defaultSetupTasks: SetupTask[] = [
    {
        id: 'business-info',
        title: 'Business Information',
        description: 'Add your business name, description, and contact details',
        completed: false,
        icon: <Building2 className="h-5 w-5" />,
        actionLabel: 'Complete'
    },
    {
        id: 'upload-logo',
        title: 'Upload Logo',
        description: 'Add your brand logo to personalize your store',
        completed: false,
        icon: <Upload className="h-5 w-5" />,
        actionLabel: 'Upload'
    },
    {
        id: 'kyc-documents',
        title: 'KYC Documents',
        description: 'Upload required documents for verification',
        completed: false,
        icon: <FileText className="h-5 w-5" />,
        actionLabel: 'Upload'
    },
    {
        id: 'domain-setup',
        title: 'Domain Setup',
        description: 'Connect your custom domain or use our subdomain',
        completed: false,
        icon: <Globe className="h-5 w-5" />,
        actionLabel: 'Setup'
    },
    {
        id: 'payment-setup',
        title: 'Payment Methods',
        description: 'Configure payment options for your customers',
        completed: false,
        icon: <CreditCard className="h-5 w-5" />,
        actionLabel: 'Configure'
    }
];