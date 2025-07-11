'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Unlock } from 'lucide-react';

interface EmergencyStatus {
    lockdown_active: boolean;
    lockdown_reason: string;
    lockdown_initiated_by: string;
    lockdown_initiated_at: string;
    lockdown_duration_minutes: number;
    affected_services: string[];
    total_users_affected: number;
    total_tenants_affected: number;
}

interface EmergencyStatusCardProps {
    emergencyStatus: EmergencyStatus | null;
    onLiftLockdown: () => void;
}

export function EmergencyStatusCard({ emergencyStatus, onLiftLockdown }: EmergencyStatusCardProps) {
    if (!emergencyStatus?.lockdown_active) {
        return null;
    }

    return (
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>EMERGENCY LOCKDOWN ACTIVE</AlertTitle>
            <AlertDescription>
                System is currently in emergency lockdown mode. All non-essential services are disabled.
                <div className="mt-2">
                    <div className="text-sm">Reason: {emergencyStatus.lockdown_reason}</div>
                    <div className="text-sm">Initiated by: {emergencyStatus.lockdown_initiated_by}</div>
                    <div className="text-sm">Duration: {emergencyStatus.lockdown_duration_minutes} minutes</div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onLiftLockdown}
                    className="mt-2"
                >
                    <Unlock className="h-4 w-4 mr-2" />
                    Lift Lockdown
                </Button>
            </AlertDescription>
        </Alert>
    );
}