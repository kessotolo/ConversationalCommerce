import React from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function AccountSecurityPage() {
    // Clerk/Auth provider UI integration would go here
    return (
        <div>
            <h1>Account Security</h1>
            <Card>
                <div style={{ marginBottom: 16 }}>
                    <strong>Password</strong>
                    <div>
                        <Button onClick={() => {/* trigger Clerk password change UI */ }}>Change Password</Button>
                    </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <strong>Two-Factor Authentication (2FA)</strong>
                    <div>
                        <Button onClick={() => {/* trigger Clerk 2FA UI */ }}>Manage 2FA</Button>
                    </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <strong>Security Questions</strong>
                    <div>
                        <Button disabled>Coming Soon</Button>
                    </div>
                </div>
                <div>
                    <strong>Audit Log</strong>
                    <div>
                        <Button disabled>Coming Soon</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}