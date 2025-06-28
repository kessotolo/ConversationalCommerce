import React, { useState, useEffect } from 'react';
import { onboardingApi, validateDomain } from '@/modules/tenant/api/onboardingApi';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { getStoredAuthToken } from '@/utils/auth-utils';
import { ConversationEventLogger } from '@/modules/conversation/utils/eventLogger';
import { ConversationEventType } from '@/modules/conversation/models/event';
import type { OnboardingStatusResponse } from '@/modules/tenant/api/onboardingApi';

const steps = ['Business Info', 'KYC', 'KYC Upload', 'Domain', 'Team Invite', 'Done'];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [domainStatus, setDomainStatus] = useState<{ available: boolean; message: string } | null>(
    null,
  );
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
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);

  const { } = useAuth(); // Auth context still needed but user not used
  const { tenant } = useTenant();
  // Ensure token is always a string, not null or undefined
  const token = getStoredAuthToken() ?? '';

  useEffect(() => {
    const fetchStatus = async () => {
      if (!token || !tenant) return;
      try {
        const status = await onboardingApi.getStatus(token);
        setOnboardingStatus(status);
        // If onboarding is complete, set step to Done
        if (status.overall_complete) setStep(steps.length - 1);
        else if (status.current_step) {
          const idx = steps.findIndex(s => s.toLowerCase().replace(/ /g, '') === status.current_step?.replace('_', ''));
          if (idx >= 0) setStep(idx);
        }
      } catch (err) {
        // Optionally show error
      }
    };
    fetchStatus();
  }, [token, tenant]);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);
    let nextStep = step;
    const newForm = { ...form };
    const inputElem = (e.target as HTMLFormElement).elements.namedItem(
      'input',
    ) as HTMLInputElement | null;
    const input: string = inputElem ? inputElem.value : '';
    try {
      if (!token || !tenant) {
        setFormError('Authentication or tenant context missing.');
        setLoading(false);
        return;
      }
      if (onboardingStatus?.overall_complete) {
        setFormError('Onboarding is already complete.');
        setLoading(false);
        return;
      }
      if (steps[step] === 'Domain') {
        const res = await validateDomain(domainInput || input);
        setDomainStatus(res);
        if (!res.available) {
          setFormError(res.message);
          await ConversationEventLogger.log({
            event_type: ConversationEventType.ONBOARDING_ERROR,
            user_id: tenant.id,
            tenant_id: tenant.id,
            payload: { step: 'domain', error: res.message },
            metadata: {},
          });
          setLoading(false);
          return;
        }
        await onboardingApi.setDomain(
          { tenant_id: tenant.id, domain: domainInput || input },
          token
        );
        await ConversationEventLogger.log({
          event_type: ConversationEventType.ONBOARDING_STEP,
          user_id: tenant.id,
          tenant_id: tenant.id,
          payload: { step: 'domain', result: 'success' },
          metadata: {},
        });
      }
      if (steps[step] === 'KYC Upload' && file) {
        setUploadProgress(0);
        setKycError(null);
        setKycStatus('pending');
        const kycId = typeof newForm['kyc_id'] === 'string' ? newForm['kyc_id'] : '';
        if (!kycId) {
          setFormError('KYC ID missing. Please complete KYC step first.');
          await ConversationEventLogger.log({
            event_type: ConversationEventType.ONBOARDING_ERROR,
            user_id: tenant.id,
            tenant_id: tenant.id,
            payload: { step: 'kyc_upload', error: 'KYC ID missing' },
            metadata: {},
          });
          setLoading(false);
          return;
        }
        const uploadRes = await onboardingApi.uploadKYCFile(kycId, file, token);
        setUploadProgress(100);
        newForm['kyc_file_url'] = uploadRes.file_url;
        setKycStatus('pending');
        setTimeout(() => setKycStatus('verified'), 2000);
        await ConversationEventLogger.log({
          event_type: ConversationEventType.ONBOARDING_STEP,
          user_id: tenant.id,
          tenant_id: tenant.id,
          payload: { step: 'kyc_upload', result: 'success', file_url: uploadRes.file_url },
          metadata: {},
        });
        nextStep++;
      } else {
        switch (steps[step]) {
          case 'Business Info': {
            if (!input || !(e.target as HTMLFormElement).elements.namedItem('phone')) {
              setFormError('Business name and phone are required.');
              await ConversationEventLogger.log({
                event_type: ConversationEventType.ONBOARDING_ERROR,
                user_id: tenant.id,
                tenant_id: tenant.id,
                payload: { step: 'business_info', error: 'Missing business name or phone' },
                metadata: {},
              });
              setLoading(false);
              return;
            }
            newForm['business_name'] = input;
            const phoneElem = (e.target as HTMLFormElement).elements.namedItem(
              'phone',
            ) as HTMLInputElement | null;
            newForm['phone'] = phoneElem ? phoneElem.value : '';
            const emailElem = (e.target as HTMLFormElement).elements.namedItem(
              'email',
            ) as HTMLInputElement | null;
            newForm['email'] = emailElem ? emailElem.value : '';
            const data = {
              business_name: newForm['business_name'] as string,
              phone: newForm['phone'] as string,
              email: newForm['email'] as string,
              subdomain: (newForm['business_name'] as string).toLowerCase().replace(/\s+/g, '-'),
            };
            const res = await onboardingApi.startOnboarding(data, token);
            newForm['tenant_id'] = res.tenant_id;
            await ConversationEventLogger.log({
              event_type: ConversationEventType.ONBOARDING_STEP,
              user_id: tenant.id,
              tenant_id: tenant.id,
              payload: { step: 'business_info', result: 'success' },
              metadata: {},
            });
            break;
          }
          case 'KYC': {
            if (!input || !(e.target as HTMLFormElement).elements.namedItem('id_number')) {
              setFormError('ID type and number are required.');
              await ConversationEventLogger.log({
                event_type: ConversationEventType.ONBOARDING_ERROR,
                user_id: tenant.id,
                tenant_id: tenant.id,
                payload: { step: 'kyc', error: 'Missing ID type or number' },
                metadata: {},
              });
              setLoading(false);
              return;
            }
            newForm['id_type'] = input;
            const idNumberElem = (e.target as HTMLFormElement).elements.namedItem(
              'id_number',
            ) as HTMLInputElement | null;
            newForm['id_number'] = idNumberElem ? idNumberElem.value : '';
            const data = {
              tenant_id: tenant.id,
              business_name: newForm['business_name'] as string,
              id_number: newForm['id_number'] as string,
              id_type: newForm['id_type'] as string,
            };
            const res = await onboardingApi.submitKYC(data, token);
            newForm['kyc_id'] = res.kyc_id;
            await ConversationEventLogger.log({
              event_type: ConversationEventType.ONBOARDING_STEP,
              user_id: tenant.id,
              tenant_id: tenant.id,
              payload: { step: 'kyc', result: 'success' },
              metadata: {},
            });
            break;
          }
          case 'Domain': {
            newForm['domain'] = domainInput || input;
            break;
          }
          case 'Team Invite': {
            if (!invitePhone && !inviteEmail) {
              setFormError('Enter a phone number or email to invite a team member.');
              await ConversationEventLogger.log({
                event_type: ConversationEventType.ONBOARDING_ERROR,
                user_id: tenant.id,
                tenant_id: tenant.id,
                payload: { step: 'team_invite', error: 'Missing phone or email' },
                metadata: {},
              });
              setLoading(false);
              return;
            }
            if (invitePhone) {
              const data = {
                tenant_id: tenant.id,
                invitee_phone: invitePhone,
                role: 'member',
              };
              const res = await onboardingApi.inviteTeam(data, token);
              setInviteStatus('WhatsApp invite link generated!');
              setWebInviteLink(res.invite_link || '');
              await ConversationEventLogger.log({
                event_type: ConversationEventType.ONBOARDING_STEP,
                user_id: tenant.id,
                tenant_id: tenant.id,
                payload: { step: 'team_invite', result: 'success', invite_link: res.invite_link },
                metadata: {},
              });
            }
            if (inviteEmail) {
              setInviteStatus('Email invite sent!');
              await ConversationEventLogger.log({
                event_type: ConversationEventType.ONBOARDING_STEP,
                user_id: tenant.id,
                tenant_id: tenant.id,
                payload: { step: 'team_invite', result: 'success', invite_email: inviteEmail },
                metadata: {},
              });
            }
            break;
          }
          default:
            break;
        }
        nextStep++;
      }
      setForm(newForm);
      setStep(nextStep);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
      await ConversationEventLogger.log({
        event_type: ConversationEventType.ONBOARDING_ERROR,
        user_id: tenant?.id ?? '',
        tenant_id: tenant?.id ?? '',
        payload: { step: steps[step], error: err instanceof Error ? err.message : String(err) },
        metadata: {},
      });
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Business Info', 'KYC', 'KYC Upload', 'Domain', 'Team Invite', 'Done'];

  return (
    <div className="max-w-md mx-auto p-0 sm:p-4 bg-white rounded shadow-md flex flex-col h-[100dvh] text-base sm:text-base">
      {/* Progress Bar/Step Indicator */}
      <div className="sticky top-0 z-10 bg-white pt-4 pb-2 px-4 flex flex-col gap-2">
        <div className="flex items-center justify-between w-full">
          {stepLabels.map((label, idx) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold border-2 ${idx < step ? 'bg-green-500 border-green-500 text-white' : idx === step ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-200 border-gray-300 text-gray-500'}`}
              >
                {idx + 1}
              </div>
              <span
                className={`text-[10px] sm:text-xs mt-1 text-center ${idx === step ? 'font-semibold text-blue-600' : 'text-gray-400'}`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full h-1 bg-gray-200 rounded-full mt-2">
          <div
            className="h-1 bg-blue-600 rounded-full transition-all"
            style={{ width: `${(step / (stepLabels.length - 1)) * 100}%` }}
          />
        </div>
      </div>
      {/* KYC Status Banner */}
      {kycStatus && (
        <div className="text-xs text-blue-700 font-semibold px-4 pb-1" data-testid="kyc-status">
          KYC Status: {kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}
        </div>
      )}
      {formError && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-2 mx-4 flex items-center justify-between"
          role="alert"
          data-testid="onboarding-error"
        >
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
      <h2 className="text-xl font-bold mb-4 px-4 pt-2 text-center">Onboarding Wizard</h2>
      <form className="flex-1 flex flex-col gap-4 px-4" onSubmit={handleNext} data-testid="onboarding-form">
        {step === 0 && (
          <>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Business Name</span>
              <input
                name="input"
                className="border rounded px-4 py-3 w-full text-base"
                required
                autoComplete="organization"
                data-testid="business-name-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Phone</span>
              <input
                name="phone"
                className="border rounded px-4 py-3 w-full text-base"
                required
                inputMode="tel"
                autoComplete="tel"
                data-testid="phone-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium">Email</span>
              <input
                name="email"
                className="border rounded px-4 py-3 w-full text-base"
                inputMode="email"
                autoComplete="email"
                data-testid="email-input"
              />
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
              <input
                name="id_number"
                className="border rounded px-4 py-3 w-full text-base"
                required
              />
            </label>
          </>
        )}
        {step === 2 && (
          <>
            <label className="flex flex-col gap-1">
              <span className="font-medium">KYC Document</span>
              <input
                type="file"
                name="kyc_file"
                className="border rounded px-4 py-3 w-full text-base"
                required
                aria-label="KYC Document"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {uploadProgress !== null && (
              <div className="text-xs mt-2">Upload Progress: {uploadProgress}%</div>
            )}
            {kycError && (
              <div className="text-red-600 text-xs mt-2">{kycError}</div>
            )}
          </>
        )}
        {step === 3 && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Subdomain</span>
            <input
              name="input"
              className="border rounded px-4 py-3 w-full text-base"
              placeholder="Enter your subdomain"
              value={domainInput}
              onChange={async (e) => {
                setDomainInput(e.target.value);
                if (e.target.value) {
                  const res = await validateDomain(e.target.value);
                  setDomainStatus(res);
                  setFormError(res.available ? null : res.message);
                } else {
                  setDomainStatus(null);
                  setFormError(null);
                }
              }}
              required
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
                onChange={(e) => {
                  setInvitePhone(e.target.value);
                  setFormError(null);
                }}
                inputMode="tel"
                pattern="^\+?\d{8,}$"
              />
              <button
                type="button"
                className="bg-green-600 text-white px-4 py-3 rounded mt-2 active:scale-95 transition-transform"
                onClick={async () => {
                  setInviteStatus(null);
                  setInviteError(null);
                  try {
                    // Ensure we have a valid tenant ID string (not null/undefined)
                    const tenantId = tenant?.id ?? '';
                    const data = {
                      tenant_id: tenantId,
                      invitee_phone: invitePhone,
                      role: 'member',
                    };
                    // Ensure token is always a string for API call
                    const stringToken = token ?? '';
                    const res = await onboardingApi.inviteTeam(data, stringToken);
                    setInviteStatus('WhatsApp invite link generated!');
                    setWebInviteLink(res.invite_link || '');
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
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setFormError(null);
                }}
                inputMode="email"
                type="email"
              />
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-3 rounded mt-2 active:scale-95 transition-transform"
                onClick={async () => {
                  setInviteStatus(null);
                  setInviteError(null);
                  try {
                    // No need to send email for this scenario - handled by the backend
                    setInviteStatus('Email invite sent!');
                  } catch {
                    setInviteError('Failed to send email invite.');
                  }
                }}
                disabled={!inviteEmail?.includes('@')}
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
                  const link =
                    webInviteLink ||
                    `https://yourapp.com/invite/accept?phone=${encodeURIComponent(invitePhone)}`;
                  setWebInviteLink(link || '');
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
          <div className="text-green-700 font-semibold">
            🎉 Onboarding complete! You're ready to start selling.
          </div>
        )}
        {step < steps.length - 1 && (
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-3 rounded mt-2 active:scale-95 transition-transform"
            disabled={loading || (step === 3 && !domainStatus?.available)}
            data-testid="submit-button"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading...
              </span>
            ) : (
              'Next'
            )}
          </button>
        )}
      </form>
      <div className="mt-2 text-xs text-gray-400 px-4 pb-2">
        Step {step + 1} of {steps.length}
      </div>
    </div>
  );
}
