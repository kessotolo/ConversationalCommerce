import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X } from 'lucide-react';

interface OnboardingPromptCardProps {
    stepsComplete: number;
    totalSteps: number;
    onContinue: () => void;
    onDismiss: () => void;
    userName?: string | undefined;
}

const OnboardingPromptCard: React.FC<OnboardingPromptCardProps> = ({
    stepsComplete,
    totalSteps,
    onContinue,
    onDismiss,
    userName,
}) => {
    const percent = Math.round((stepsComplete / totalSteps) * 100);
    return (
        <Card className="w-full max-w-xl mx-auto mb-6 p-0 overflow-hidden border-2 border-[#A8D5BA] shadow-lg relative">
            <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors z-10"
                onClick={onDismiss}
                aria-label="Dismiss onboarding prompt"
            >
                <X className="w-5 h-5" />
            </button>
            <div className="p-6 flex flex-col gap-3">
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                    {userName ? `Welcome, ${userName}!` : 'Welcome!'}
                </h2>
                <p className="text-gray-700 mb-2 text-base">
                    Finish setting up your store to start selling.
                </p>
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-[#f5f9f7] rounded-full overflow-hidden">
                        <div
                            className="h-2 bg-[#6C9A8B] rounded-full transition-all"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span className="text-xs text-gray-500 min-w-fit">{stepsComplete} / {totalSteps} complete</span>
                </div>
                <Button
                    className="w-full bg-[#6C9A8B] hover:bg-[#5d8a7b] text-white font-semibold rounded-lg py-2 mt-2"
                    onClick={onContinue}
                >
                    Continue Onboarding
                </Button>
            </div>
        </Card>
    );
};

export default OnboardingPromptCard;