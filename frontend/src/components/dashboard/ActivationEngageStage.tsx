'use client';

import { useState } from 'react';
import {
    MessageCircle,
    Share2,
    CheckCircle,
    ArrowRight,
    Zap,
    Instagram,
    Send,
    Link,
    Bell,
    Users
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface EngageTask {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    icon: React.ReactNode;
    action?: () => void;
    actionLabel?: string;
    socialPlatform?: 'whatsapp' | 'instagram' | 'telegram' | 'general';
}

interface ActivationEngageStageProps {
    tasks: EngageTask[];
    onTaskAction: (taskId: string) => void;
    onStageComplete?: () => void;
    className?: string;
}

export default function ActivationEngageStage({
    tasks,
    onTaskAction,
    onStageComplete,
    className = ''
}: ActivationEngageStageProps) {
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

    const getSocialColor = (platform?: string) => {
        switch (platform) {
            case 'whatsapp': return 'from-green-500 to-green-600';
            case 'instagram': return 'from-pink-500 to-purple-600';
            case 'telegram': return 'from-blue-500 to-blue-600';
            default: return 'from-orange-500 to-red-500';
        }
    };

    return (
        <Card
            className={`
        relative overflow-hidden transition-all duration-500 hover:shadow-xl
        bg-gradient-to-br from-white via-orange-50/30 to-red-50/40
        border-2 border-orange-100/50 backdrop-blur-sm
        ${isStageComplete ? 'border-green-200 bg-gradient-to-br from-green-50/30 to-emerald-50/40' : ''}
        ${className}
      `}
            data-testid="activation-engage-stage"
        >
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 via-transparent to-red-600/5" />

            {/* Zap animation for completed stage */}
            {isStageComplete && (
                <div className="absolute top-4 right-4 animate-bounce">
                    <Zap className="h-6 w-6 text-green-500" />
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
                                : 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-600'
                            }
            `}>
                            {isStageComplete ? (
                                <CheckCircle className="h-6 w-6" />
                            ) : (
                                <MessageCircle className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Start Engaging
                            </h3>
                            <p className="text-sm text-gray-600">
                                Connect with customers and build your audience
                            </p>
                        </div>
                    </div>

                    <Badge
                        variant={isStageComplete ? "default" : "secondary"}
                        className={`
              px-3 py-1 text-xs font-medium
              ${isStageComplete
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-orange-100 text-orange-700 border-orange-200'
                            }
            `}
                    >
                        {completedTasks}/{totalTasks} Complete
                    </Badge>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Engagement Progress</span>
                        <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`
                h-2.5 rounded-full transition-all duration-700 ease-out
                ${isStageComplete
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                    : 'bg-gradient-to-r from-orange-500 to-red-500'
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
                                    : 'bg-white/80 border-gray-200 hover:border-orange-300 hover:shadow-md'
                                }
                ${hoveredTask === task.id ? 'scale-[1.02]' : ''}
              `}
                            onMouseEnter={() => setHoveredTask(task.id)}
                            onMouseLeave={() => setHoveredTask(null)}
                            data-testid={`engage-task-${task.id}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`
                    p-2 rounded-lg transition-all duration-300 relative
                    ${task.completed
                                            ? 'bg-green-100 text-green-600'
                                            : `bg-gradient-to-r ${getSocialColor(task.socialPlatform)} text-white group-hover:scale-110`
                                        }
                  `}>
                                        {task.completed ? (
                                            <CheckCircle className="h-5 w-5" />
                                        ) : (
                                            task.icon
                                        )}

                                        {/* Social platform indicator */}
                                        {!task.completed && task.socialPlatform && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white shadow-sm flex items-center justify-center">
                                                {task.socialPlatform === 'whatsapp' && (
                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                )}
                                                {task.socialPlatform === 'instagram' && (
                                                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full" />
                                                )}
                                                {task.socialPlatform === 'telegram' && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                )}
                                            </div>
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
                                        className={`
                      ml-3 text-white transition-all duration-300 hover:scale-105
                      focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                      bg-gradient-to-r ${getSocialColor(task.socialPlatform)} hover:shadow-lg
                    `}
                                        data-testid={`engage-task-action-${task.id}`}
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
                                <Zap className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-green-800">Engagement Active!</h4>
                                <p className="text-sm text-green-700">
                                    Excellent! You're now connected and ready to engage with customers.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Social Media Tips */}
                {!isStageComplete && (
                    <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Share2 className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-orange-800 mb-1">Pro Tip</h4>
                                <p className="text-sm text-orange-700">
                                    Connect multiple channels to reach more customers. WhatsApp and Instagram are great starting points!
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Default engage tasks - can be customized
export const defaultEngageTasks: EngageTask[] = [
    {
        id: 'connect-whatsapp',
        title: 'Connect WhatsApp',
        description: 'Link your WhatsApp Business account for direct customer communication',
        completed: false,
        icon: <Send className="h-5 w-5" />,
        actionLabel: 'Connect',
        socialPlatform: 'whatsapp'
    },
    {
        id: 'connect-instagram',
        title: 'Connect Instagram',
        description: 'Link your Instagram account to sell through DMs',
        completed: false,
        icon: <Instagram className="h-5 w-5" />,
        actionLabel: 'Connect',
        socialPlatform: 'instagram'
    },
    {
        id: 'share-store-link',
        title: 'Share Store Link',
        description: 'Share your store link on social media or with friends',
        completed: false,
        icon: <Link className="h-5 w-5" />,
        actionLabel: 'Share',
        socialPlatform: 'general'
    },
    {
        id: 'enable-notifications',
        title: 'Enable Notifications',
        description: 'Turn on notifications to stay updated on new orders and messages',
        completed: false,
        icon: <Bell className="h-5 w-5" />,
        actionLabel: 'Enable',
        socialPlatform: 'general'
    },
    {
        id: 'invite-team',
        title: 'Invite Team Members',
        description: 'Add team members to help manage your store',
        completed: false,
        icon: <Users className="h-5 w-5" />,
        actionLabel: 'Invite',
        socialPlatform: 'general'
    }
];