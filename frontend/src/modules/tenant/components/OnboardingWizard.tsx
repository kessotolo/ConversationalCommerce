import React, { useState } from 'react';
import { onboardingApi, validateDomain, sendInviteEmail } from '../api/onboardingApi';

const steps = [
    'Business Info',
    'KYC',
    'KYC Upload',
    'Domain',
    'Team Invite',
    'Done',
];

export default function OnboardingWizard() {
    const [step, setStep] = useState(0);
    const [form, setForm] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [statusMsg, setStatusMsg] = useState<string>('');
    const [domainStatus, setDomainStatus] = useState<{ available: boolean; message: string } | null>(null);
    const [domainInput, setDomainInput] = useState('');
    const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'rejected' | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [kycError, setKycError] = useState<string | null>(null);
    const [invitePhone, setInvitePhone] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteStatus, setInviteStatus] = useState<string | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [webInviteLink, setWebInviteLink] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Placeholder: auto-redirect to chat if possible
    // useEffect(() => { /* logic to detect chat and redirect */ }, []);

    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setFormError(null);
        let nextStep = step;
        let newForm = { ...form };
        let input: any = (e.target as any).elements.input?.value;
        if (steps[step] === 'Domain') {
            const res = await validateDomain(domainInput || input);
            setDomainStatus(res);
            if (!res.available) {
                setFormError(res.message);
                setLoading(false);
                return;
            }
        }
        if (steps[step] === 'KYC Upload' && file) {
            setUploadProgress(0);
            setKycError(null);
            setKycStatus('pending');
            // Simulate upload progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 20;
                setUploadProgress(Math.min(progress, 100));
            }, 200);
            try {
                const uploadRes = await onboardingApi.uploadKYCFile(file);
                clearInterval(progressInterval);
                setUploadProgress(100);
                newForm.kyc_file_url = uploadRes.file_url;
                setStatusMsg('ID uploaded!');
                setKycStatus('pending');
                // Simulate KYC review: after 2s, set to verified
                setTimeout(() => setKycStatus('verified'), 2000);
                nextStep++;
            } catch (err) {
                clearInterval(progressInterval);
                setUploadProgress(null);
                setKycStatus('rejected');
                setKycError('Failed to upload file. Please try again.');
                setFormError('Failed to upload file. Please try again.');
                setLoading(false);
                return;
            }
        } else {
            switch (steps[step]) {
                case 'Business Info':
                    if (!input || !(e.target as any).elements.phone?.value) {
                        setFormError('Business name and phone are required.');
                        setLoading(false);
                        return;
                    }
                    newForm.business_name = input;
                    newForm.phone = (e.target as any).elements.phone?.value;
                    newForm.email = (e.target as any).elements.email?.value;
                    break;
                case 'KYC':
                    if (!input || !(e.target as any).elements.id_number?.value) {
                        setFormError('ID type and number are required.');
                        setLoading(false);
                        return;
                    }
                    newForm.id_type = input;
                    newForm.id_number = (e.target as any).elements.id_number?.value;
                    break;
                case 'Domain':
                    newForm.domain = domainInput || input;
                    break;
                case 'Team Invite':
                    if (!invitePhone && !inviteEmail) {
                        setFormError('Enter a phone number or email to invite a team member.');
                        setLoading(false);
                        return;
                    }
                    newForm.invitee_phone = invitePhone;
                    newForm.invitee_email = inviteEmail;
                    break;
                default:
                    break;
            }
            nextStep++;
        }
        setForm(newForm);
        setStep(nextStep);
        setLoading(false);
    };

    const stepLabels = [
        'Business Info',
        'KYC',
        'KYC Upload',
        'Domain',
        'Team Invite',
        'Done',
    ];

    return (
        <div className="max-w-md mx-auto p-0 sm:p-4 bg-white rounded shadow-md flex flex-col h-[100dvh] text-base sm:text-base">
            {/* Progress Bar/Step Indicator */}
            <div className="sticky top-0 z-10 bg-white pt-4 pb-2 px-4 flex flex-col gap-2">
                <div className="flex items-center justify-between w-full">
                    {stepLabels.map((label, idx) => (
                        <div key={label} className="flex-1 flex flex-col items-center">
                            <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border-2 ${idx < step ? 'bg-green-500 border-green-500 text-white' : idx === step ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>{idx + 1}</div>
                            <span className={`text-[10px] sm:text-xs mt-1 text-center ${idx === step ? 'font-semibold text-blue-600' : 'text-gray-400'}`}>{label}</span>
                        </div>
                    ))}
                </div>
                <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
                    <div className="h-1 bg-blue-600 rounded-full transition-all" style={{ width: `${(step / (stepLabels.length - 1)) * 100}%` }} />
                </div>
            </div>
            <h2 className="text-xl font-bold mb-4 px-4 pt-2 text-center">Onboarding Wizard</h2>
            <form className="flex-1 flex flex-col gap-4 px-4" onSubmit={handleNext}>
                {step === 0 && (
                    <>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">Business Name</span>
                            <input name="input" className="border rounded px-4 py-3 w-full text-base" required autoComplete="organization" />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">Phone</span>
                            <input name="phone" className="border rounded px-4 py-3 w-full text-base" required inputMode="tel" autoComplete="tel" />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">Email</span>
                            <input name="email" className="border rounded px-4 py-3 w-full text-base" inputMode="email" autoComplete="email" />
                        </label>
                    </>
                )}
                {step === 1 && (
                    <>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">ID Type</span>
                            <input name="input" className="border rounded px-4 py-3 w-full text-base" required />
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">ID Number</span>
                            <input name="id_number" className="border rounded px-4 py-3 w-full text-base" required />
                        </label>
                    </>
                )}
                {step === 2 && (
                    <>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">KYC Document</span>
                            <input type="file" className="border rounded px-4 py-3 w-full text-base" onChange={e => setFile(e.target.files?.[0] || null)} required />
                        </label>
                        {uploadProgress !== null && (
                            <div className="text-blue-600 text-xs mt-2 animate-pulse">Uploading: {uploadProgress}%</div>
                        )}
                        {uploadProgress !== null && uploadProgress < 100 && (
                            <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                                <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        )}
                        {kycStatus === 'pending' && <div className="text-yellow-600 text-xs mt-2">KYC Status: Pending review...</div>}
                        {kycStatus === 'verified' && <div className="text-green-600 text-xs mt-2">KYC Status: Verified ✅</div>}
                        {kycStatus === 'rejected' && <div className="text-red-600 text-xs mt-2">KYC Status: Rejected ❌</div>}
                        {kycError && <div className="text-red-600 text-xs mt-2">{kycError}</div>}
                    </>
                )}
                {step === 3 && (
                    <label className="flex flex-col gap-1">
                        <span className="font-medium">Subdomain</span>
                        <input
                            name="input"
                            className="border rounded px-4 py-3 w-full text-base"
                            required
                            value={domainInput}
                            onChange={async e => {
                                setDomainInput(e.target.value);
                                setFormError(null);
                                if (e.target.value) {
                                    const res = await validateDomain(e.target.value);
                                    setDomainStatus(res);
                                } else {
                                    setDomainStatus(null);
                                }
                            }}
                        />
                        {domainStatus && (
                            <div className={domainStatus.available ? 'text-green-600 text-xs mt-1' : 'text-red-600 text-xs mt-1'}>
                                {domainStatus.message}
                            </div>
                        )}
                    </label>
                )}
                {step === 4 && (
                    <div className="flex flex-col gap-4">
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">Team Member Phone (WhatsApp)</span>
                            <input
                                name="phone"
                                className="border rounded px-4 py-3 w-full text-base"
                                placeholder="e.g. +2348012345678"
                                value={invitePhone}
                                onChange={e => { setInvitePhone(e.target.value); setFormError(null); }}
                                inputMode="tel"
                                pattern="^\+?\d{8,}$"
                            />
                            <button
                                type="button"
                                className="bg-green-600 text-white px-4 py-3 rounded mt-2 active:scale-95 transition-transform"
                                onClick={async () => {
                                    setInviteStatus(null); setInviteError(null);
                                    try {
                                        const res = await onboardingApi.inviteTeam({ phone: invitePhone });
                                        setInviteStatus('WhatsApp invite link generated!');
                                        setWebInviteLink(res.invite_link);
                                    } catch {
                                        setInviteError('Failed to generate WhatsApp invite.');
                                    }
                                }}
                                disabled={!invitePhone || !/^\+?\d{8,}$/.test(invitePhone)}
                            >
                                Send WhatsApp Invite
                            </button>
                        </label>
                        <label className="flex flex-col gap-1">
                            <span className="font-medium">Team Member Email</span>
                            <input
                                name="email"
                                className="border rounded px-4 py-3 w-full text-base"
                                placeholder="e.g. team@example.com"
                                value={inviteEmail}
                                onChange={e => { setInviteEmail(e.target.value); setFormError(null); }}
                                inputMode="email"
                                type="email"
                            />
                            <button
                                type="button"
                                className="bg-blue-600 text-white px-4 py-3 rounded mt-2 active:scale-95 transition-transform"
                                onClick={async () => {
                                    setInviteStatus(null); setInviteError(null);
                                    try {
                                        const link = webInviteLink || `https://yourapp.com/invite/accept?email=${encodeURIComponent(inviteEmail)}`;
                                        await sendInviteEmail(inviteEmail, link);
                                        setInviteStatus('Email invite sent!');
                                    } catch {
                                        setInviteError('Failed to send email invite.');
                                    }
                                }}
                                disabled={!inviteEmail || !inviteEmail.includes('@')}
                            >
                                Send Email Invite
                            </button>
                        </label>
                        <div className="flex flex-col gap-1">
                            <span className="font-medium">Or copy web invite link</span>
                            <button
                                type="button"
                                className="bg-gray-200 text-gray-800 px-4 py-3 rounded active:scale-95 transition-transform"
                                onClick={() => {
                                    const link = webInviteLink || `https://yourapp.com/invite/accept?phone=${encodeURIComponent(invitePhone)}`;
                                    setWebInviteLink(link);
                                    navigator.clipboard.writeText(link);
                                    setInviteStatus('Web invite link copied!');
                                }}
                                disabled={!invitePhone && !inviteEmail}
                            >
                                Copy Web Invite Link
                            </button>
                        </div>
                        {webInviteLink && (
                            <div className="text-xs text-gray-500 break-all mt-1">{webInviteLink}</div>
                        )}
                        {inviteStatus && <div className="text-green-600 text-xs mt-2">{inviteStatus}</div>}
                        {inviteError && <div className="text-red-600 text-xs mt-2">{inviteError}</div>}
                    </div>
                )}
                {step === 5 && (
                    <div className="text-green-700 font-semibold">🎉 Onboarding complete! You're ready to start selling.</div>
                )}
                {step < steps.length - 1 && (
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-3 rounded mt-2 active:scale-95 transition-transform"
                        disabled={loading || (step === 3 && (!domainStatus || !domainStatus.available))}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2 justify-center">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                Loading...
                            </span>
                        ) : 'Next'}
                    </button>
                )}
            </form>
            <div className="mt-2 text-xs text-gray-400 px-4 pb-2">Step {step + 1} of {steps.length}</div>
            {/* Error Banner */}
            {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-2 mx-4 flex items-center justify-between" role="alert">
                    <span className="text-sm">{formError}</span>
                    <button
                        className="ml-2 text-red-700 font-bold text-lg"
                        aria-label="Dismiss error"
                        onClick={() => setFormError(null)}
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}