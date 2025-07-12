'use client';

import { useState, useEffect } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Rocket,
    CheckCircle2,
    ArrowRight,
    X,
    Menu,
    Sparkles,
    Target,
    Zap
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressRing } from '@/components/ui/progress-ring';
import { cn } from '@/lib/utils';
import ActivationSetupStage, {
    type SetupTask,
    defaultSetupTasks
} from './ActivationSetupStage';
import ActivationEngageStage, {
    type EngageTask,
    defaultEngageTasks
} from './ActivationEngageStage';
import ActivationConvertStage, {
    type ConvertTask,
    defaultConvertTasks
} from './ActivationConvertStage';

export interface ActivationJourneyProps {
    setupTasks?: SetupTask[];
    engageTasks?: EngageTask[];
    convertTasks?: ConvertTask[];
    onTaskAction?: (stage: 'setup' | 'engage' | 'convert', taskId: string) => void;
    onJourneyComplete?: () => void;
    className?: string;
    showMobileDrawer?: boolean;
    onMobileDrawerToggle?: () => void;
}

export default function ActivationJourney({
    setupTasks = defaultSetupTasks,
    engageTasks = defaultEngageTasks,
    convertTasks = defaultConvertTasks,
    onTaskAction,
    onJourneyComplete,
    className = '',
    showMobileDrawer = false,
    onMobileDrawerToggle
}: ActivationJourneyProps) {
    const [expandedStage, setExpandedStage] = useState<'setup' | 'engage' | 'convert' | null>('setup');
    const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
    const [showCelebration, setShowCelebration] = useState(false);

    // Calculate overall progress
    const totalTasks = setupTasks.length + engageTasks.length + convertTasks.length;
    const completedTasks =
        setupTasks.filter(t => t.completed).length +
        engageTasks.filter(t => t.completed).length +
        convertTasks.filter(t => t.completed).length;
    const overallProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Check stage completion
    const isSetupComplete = setupTasks.every(task => task.completed);
    const isEngageComplete = engageTasks.every(task => task.completed);
    const isConvertComplete = convertTasks.every(task => task.completed);
    const isJourneyComplete = isSetupComplete && isEngageComplete && isConvertComplete;

    // Handle task actions
    const handleTaskAction = (stage: 'setup' | 'engage' | 'convert', taskId: string) => {
        if (onTaskAction) {
            onTaskAction(stage, taskId);
        }
    };

    // Handle stage completion
    const handleStageComplete = (stage: 'setup' | 'engage' | 'convert') => {
        setCompletedStages(prev => new Set([...prev, stage]));

        // Auto-expand next stage
        if (stage === 'setup' && !isEngageComplete) {
            setExpandedStage('engage');
        } else if (stage === 'engage' && !isConvertComplete) {
            setExpandedStage('convert');
        }
    };

    // Handle journey completion
    useEffect(() => {
        if (isJourneyComplete && !showCelebration) {
            setShowCelebration(true);
            setTimeout(() => {
                setShowCelebration(false);
                if (onJourneyComplete) {
                    onJourneyComplete();
                }
            }, 3000);
        }
    }, [isJourneyComplete, showCelebration, onJourneyComplete]);

    const getStageStatus = (stage: 'setup' | 'engage' | 'convert') => {
        switch (stage) {
            case 'setup': return isSetupComplete ? 'complete' : 'active';
            case 'engage': return isEngageComplete ? 'complete' : isSetupComplete ? 'active' : 'locked';
            case 'convert': return isConvertComplete ? 'complete' : isEngageComplete ? 'active' : 'locked';
        }
    };

    const getStageColor = (stage: 'setup' | 'engage' | 'convert') => {
        const status = getStageStatus(stage);
        switch (status) {
            case 'complete': return 'text-green-600 bg-green-50 border-green-200';
            case 'active': return stage === 'setup' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                stage === 'engage' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                    'text-purple-600 bg-purple-50 border-purple-200';
            case 'locked': return 'text-gray-400 bg-gray-50 border-gray-200';
        }
    };

    const getStageIcon = (stage: 'setup' | 'engage' | 'convert') => {
        const status = getStageStatus(stage);
        if (status === 'complete') {
            return <CheckCircle2 className="h-5 w-5" />;
        }

        switch (stage) {
            case 'setup': return <Sparkles className="h-5 w-5" />;
            case 'engage': return <Zap className="h-5 w-5" />;
            case 'convert': return <Target className="h-5 w-5" />;
        }
    };

    const StageHeader = ({
        stage,
        title,
        description,
        taskCount,
        completedCount
    }: {
        stage: 'setup' | 'engage' | 'convert';
        title: string;
        description: string;
        taskCount: number;
        completedCount: number;
    }) => {
        const status = getStageStatus(stage);
        const isExpanded = expandedStage === stage;
        const canExpand = status !== 'locked';
        const stageProgress = taskCount > 0 ? (completedCount / taskCount) * 100 : 0;

        return (
            <div
                className={cn(
                    'flex items-center justify-between p-4 sm:p-5 rounded-xl border-2 transition-all duration-300',
                    'hover:shadow-md active:scale-[0.98] cursor-pointer',
                    getStageColor(stage),
                    canExpand ? 'hover:shadow-md' : 'cursor-not-allowed opacity-60',
                    isExpanded ? 'shadow-lg ring-2 ring-opacity-20' : ''
                )}
                onClick={() => canExpand && setExpandedStage(isExpanded ? null : stage)}
                data-testid={`activation-stage-header-${stage}`}
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                        'p-2 sm:p-3 rounded-lg transition-all duration-300',
                        status === 'complete' ? 'bg-green-100 text-green-600' :
                            status === 'active' ? 'bg-white/80 text-current' :
                                'bg-gray-100 text-gray-400'
                    )}>
                        {getStageIcon(stage)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base truncate">{title}</h3>
                        <p className="text-xs sm:text-sm opacity-80 truncate">{description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Progress Ring for mobile */}
                    <div className="sm:hidden">
                        <ProgressRing
                            progress={stageProgress}
                            size="sm"
                            color={status === 'complete' ? 'success' : 'primary'}
                            showPercentage={false}
                        >
                            <span className="text-xs font-medium">
                                {completedCount}/{taskCount}
                            </span>
                        </ProgressRing>
                    </div>

                    {/* Badge for desktop */}
                    <Badge
                        variant="outline"
                        className="hidden sm:flex text-xs px-2 py-1 bg-white/80"
                    >
                        {completedCount}/{taskCount}
                    </Badge>

                    {canExpand && (
                        <div className="p-1">
                            {isExpanded ?
                                <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> :
                                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />
                            }
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Mobile Drawer Component
    const MobileDrawer = () => (
        <div className={cn(
            'fixed inset-0 z-50 lg:hidden transition-all duration-300',
            showMobileDrawer ? 'visible' : 'invisible'
        )}>
            <div
                className={cn(
                    'absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
                    showMobileDrawer ? 'opacity-100' : 'opacity-0'
                )}
                onClick={onMobileDrawerToggle}
            />
            <div className={cn(
                'absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl',
                'max-h-[90vh] overflow-y-auto transition-transform duration-300',
                showMobileDrawer ? 'translate-y-0' : 'translate-y-full'
            )}>
                {/* Drag handle */}
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />

                <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ProgressRing
                            progress={overallProgress}
                            size="sm"
                            color="primary"
                            showPercentage={false}
                        >
                            <Rocket className="h-4 w-4 text-[#6C9A8B]" />
                        </ProgressRing>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Activation Journey</h2>
                            <p className="text-xs text-gray-600">{Math.round(overallProgress)}% Complete</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMobileDrawerToggle}
                        className="p-2 hover:bg-gray-100"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="p-4 space-y-4">
                    <ActivationJourneyContent />
                </div>
            </div>
        </div>
    );

    const ActivationJourneyContent = () => (
        <div className="space-y-4 sm:space-y-6">
            {/* Journey Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                        <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Activation Journey</h2>
                        <p className="text-xs sm:text-sm text-gray-600">Complete these steps to maximize your success</p>
                    </div>
                </div>

                {/* Overall Progress */}
                <div className="hidden sm:block">
                    <ProgressRing
                        progress={overallProgress}
                        size="md"
                        color="primary"
                        showPercentage={true}
                    />
                </div>
            </div>

            {/* Stage Headers */}
            <div className="space-y-3 sm:space-y-4">
                <StageHeader
                    stage="setup"
                    title="Setup & Foundation"
                    description="Get your store basics ready"
                    taskCount={setupTasks.length}
                    completedCount={setupTasks.filter(t => t.completed).length}
                />
                <StageHeader
                    stage="engage"
                    title="Engage & Connect"
                    description="Build customer relationships"
                    taskCount={engageTasks.length}
                    completedCount={engageTasks.filter(t => t.completed).length}
                />
                <StageHeader
                    stage="convert"
                    title="Convert & Optimize"
                    description="Drive sales and growth"
                    taskCount={convertTasks.length}
                    completedCount={convertTasks.filter(t => t.completed).length}
                />
            </div>

            {/* Expanded Stage Content */}
            {expandedStage && (
                <div className="animate-fade-in">
                    {expandedStage === 'setup' && (
                        <ActivationSetupStage
                            tasks={setupTasks}
                            onTaskAction={(taskId) => handleTaskAction('setup', taskId)}
                            onStageComplete={() => handleStageComplete('setup')}
                        />
                    )}
                    {expandedStage === 'engage' && (
                        <ActivationEngageStage
                            tasks={engageTasks}
                            onTaskAction={(taskId) => handleTaskAction('engage', taskId)}
                            onStageComplete={() => handleStageComplete('engage')}
                        />
                    )}
                    {expandedStage === 'convert' && (
                        <ActivationConvertStage
                            tasks={convertTasks}
                            onTaskAction={(taskId) => handleTaskAction('convert', taskId)}
                            onStageComplete={() => handleStageComplete('convert')}
                        />
                    )}
                </div>
            )}

            {/* Journey Complete Message */}
            {isJourneyComplete && (
                <div className="p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-green-800 text-sm sm:text-base">Journey Complete! 🎉</h4>
                            <p className="text-xs sm:text-sm text-green-700">
                                Congratulations! Your store is now fully activated and ready to convert customers.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop/Tablet View */}
            <Card className={cn('hidden lg:block', className)} data-testid="activation-journey">
                <CardContent className="p-6">
                    <ActivationJourneyContent />
                </CardContent>
            </Card>

            {/* Mobile Sticky CTA */}
            <div className="lg:hidden">
                <Button
                    onClick={onMobileDrawerToggle}
                    className={cn(
                        'fixed bottom-20 right-4 z-40 rounded-full shadow-lg p-3',
                        'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
                        'text-white transition-all duration-300 hover:scale-105 active:scale-95',
                        'border-2 border-white/20 backdrop-blur-sm'
                    )}
                    data-testid="mobile-activation-cta"
                >
                    <div className="flex items-center gap-2">
                        <ProgressRing
                            progress={overallProgress}
                            size="sm"
                            color="primary"
                            showPercentage={false}
                            className="bg-white/20 rounded-full p-1"
                        >
                            <Rocket className="h-3 w-3 text-white" />
                        </ProgressRing>
                        <span className="text-sm font-medium">
                            {Math.round(overallProgress)}%
                        </span>
                    </div>
                </Button>
            </div>

            {/* Mobile Drawer */}
            <MobileDrawer />

            {/* Journey Complete Celebration */}
            {showCelebration && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 text-center animate-bounce max-w-sm mx-4 border-2 border-green-200">
                        <div className="text-6xl sm:text-8xl mb-4">🎊</div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Amazing!</h2>
                        <p className="text-sm sm:text-base text-gray-600">
                            Your activation journey is complete! Your store is now ready to convert customers.
                        </p>
                        <ProgressRing
                            progress={100}
                            size="md"
                            color="success"
                            className="mt-4 mx-auto"
                        />
                    </div>
                </div>
            )}
        </>
    );
}