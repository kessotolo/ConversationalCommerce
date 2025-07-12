'use client';

import { useState } from 'react';
import {
    Target,
    DollarSign,
    CheckCircle,
    ArrowRight,
    TrendingUp,
    ShoppingCart,
    Percent,
    BarChart3,
    Zap,
    Star,
    Gift
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ConvertTask {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    icon: React.ReactNode;
    action?: () => void;
    actionLabel?: string;
    priority?: 'high' | 'medium' | 'low';
}

interface ActivationConvertStageProps {
    tasks: ConvertTask[];
    onTaskAction: (taskId: string) => void;
    onStageComplete?: () => void;
    className?: string;
}

export default function ActivationConvertStage({
    tasks,
    onTaskAction,
    onStageComplete,
    className = ''
}: ActivationConvertStageProps) {
    const [hoveredTask, setHoveredTask] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

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
            setShowCelebration(true);
            setTimeout(() => {
                setShowCelebration(false);
                onStageComplete();
            }, 2000); // Show celebration for 2 seconds
        }
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'high': return 'from-red-500 to-pink-500';
            case 'medium': return 'from-yellow-500 to-orange-500';
            case 'low': return 'from-green-500 to-emerald-500';
            default: return 'from-purple-500 to-indigo-500';
        }
    };

    const getPriorityBadge = (priority?: string) => {
        switch (priority) {
            case 'high': return { label: 'High Impact', color: 'bg-red-100 text-red-700 border-red-200' };
            case 'medium': return { label: 'Medium Impact', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
            case 'low': return { label: 'Low Impact', color: 'bg-green-100 text-green-700 border-green-200' };
            default: return { label: 'Standard', color: 'bg-purple-100 text-purple-700 border-purple-200' };
        }
    };

    return (
        <Card
            className={`
        relative overflow-hidden transition-all duration-500 hover:shadow-xl
        bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/40
        border-2 border-purple-100/50 backdrop-blur-sm
        ${isStageComplete ? 'border-green-200 bg-gradient-to-br from-green-50/30 to-emerald-50/40' : ''}
        ${className}
      `}
            data-testid="activation-convert-stage"
        >
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-indigo-600/5" />

            {/* Celebration animation */}
            {showCelebration && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm z-10">
                    <div className="text-center animate-bounce">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-2xl font-bold text-green-800">Congratulations!</h3>
                        <p className="text-green-700">You're ready to convert customers!</p>
                    </div>
                </div>
            )}

            {/* Star animation for completed stage */}
            {isStageComplete && !showCelebration && (
                <div className="absolute top-4 right-4 animate-spin">
                    <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
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
                                : 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-600'
                            }
            `}>
                            {isStageComplete ? (
                                <CheckCircle className="h-6 w-6" />
                            ) : (
                                <Target className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Convert First Customer
                            </h3>
                            <p className="text-sm text-gray-600">
                                Optimize for sales and track your first conversions
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant={isStageComplete ? "default" : "secondary"}
                        className={`
              px-3 py-1 text-xs font-medium
              ${isStageComplete
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-purple-100 text-purple-700 border-purple-200'
                            }
            `}
                    >
                        {completedTasks}/{totalTasks} Complete
                    </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Conversion Readiness</span>
                        <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`
                h-2.5 rounded-full transition-all duration-700 ease-out
                ${isStageComplete
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                }
              `}
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                    {tasks.map((task) => {
                        const priorityBadge = getPriorityBadge(task.priority);
                        return (
                            <div
                                key={task.id}
                                className={`
                  group relative p-4 rounded-xl border transition-all duration-300
                  ${task.completed
                                        ? 'bg-green-50/50 border-green-200 shadow-sm'
                                        : 'bg-white/80 border-gray-200 hover:border-purple-300 hover:shadow-md'
                                    }
                  ${hoveredTask === task.id ? 'scale-[1.02]' : ''}
                `}
                                onMouseEnter={() => setHoveredTask(task.id)}
                                onMouseLeave={() => setHoveredTask(null)}
                                data-testid={`convert-task-${task.id}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`
                      p-2 rounded-lg transition-all duration-300 relative
                      ${task.completed
                                                ? 'bg-green-100 text-green-600'
                                                : `bg-gradient-to-r ${getPriorityColor(task.priority)} text-white group-hover:scale-110`
                                            }
                    `}>
                                            {task.completed ? (
                                                <CheckCircle className="h-5 w-5" />
                                            ) : (
                                                task.icon
                                            )}

                                            {/* Priority indicator */}
                                            {!task.completed && task.priority === 'high' && (
                                                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`
                          font-medium transition-colors duration-300
                          ${task.completed
                                                        ? 'text-green-800 line-through'
                                                        : 'text-gray-900'
                                                    }
                        `}>
                                                    {task.title}
                                                </h4>
                                                {!task.completed && task.priority && (
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs px-2 py-0.5 ${priorityBadge.color}`}
                                                    >
                                                        {priorityBadge.label}
                                                    </Badge>
                                                )}
                                            </div>
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
                                            className={`
                        ml-3 text-white transition-all duration-300 hover:scale-105
                        focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                        bg-gradient-to-r ${getPriorityColor(task.priority)} hover:shadow-lg
                      `}
                                            data-testid={`convert-task-action-${task.id}`}
                                            aria-label={`${task.actionLabel} for ${task.title}`}
                                        >
                                            {task.actionLabel}
                                            <ArrowRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Stage Complete Message */}
                {isStageComplete && !showCelebration && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-green-800">Ready to Convert!</h4>
                                <p className="text-sm text-green-700">
                                    Amazing! Your store is now optimized for conversions. Time to make those first sales! 🚀
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Conversion Tips */}
                {!isStageComplete && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Zap className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-purple-800 mb-1">Conversion Tip</h4>
                                <p className="text-sm text-purple-700">
                                    Focus on high-impact tasks first! Creating your first product and setting up analytics will give you the biggest boost.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Default convert tasks - can be customized
export const defaultConvertTasks: ConvertTask[] = [
    {
        id: 'add-first-product',
        title: 'Add First Product',
        description: 'Create your first product listing with photos and details',
        completed: false,
        icon: <ShoppingCart className="h-5 w-5" />,
        actionLabel: 'Add Product',
        priority: 'high'
    },
    {
        id: 'create-discount',
        title: 'Create Welcome Discount',
        description: 'Set up a discount code to incentivize first purchases',
        completed: false,
        icon: <Percent className="h-5 w-5" />,
        actionLabel: 'Create',
        priority: 'high'
    },
    {
        id: 'setup-analytics',
        title: 'Setup Analytics',
        description: 'Enable tracking to monitor your store performance',
        completed: false,
        icon: <BarChart3 className="h-5 w-5" />,
        actionLabel: 'Setup',
        priority: 'medium'
    },
    {
        id: 'test-purchase',
        title: 'Test Purchase Flow',
        description: 'Complete a test purchase to ensure everything works',
        completed: false,
        icon: <DollarSign className="h-5 w-5" />,
        actionLabel: 'Test',
        priority: 'high'
    },
    {
        id: 'add-gift-option',
        title: 'Add Gift Options',
        description: 'Enable gift wrapping or gift messages for customers',
        completed: false,
        icon: <Gift className="h-5 w-5" />,
        actionLabel: 'Enable',
        priority: 'low'
    }
];