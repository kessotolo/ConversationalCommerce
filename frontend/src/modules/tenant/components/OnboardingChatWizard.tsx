'use client';
import { useUser, useOrganization } from '@clerk/nextjs';
import React, { useState } from 'react';

import { ConversationEventType } from '@/modules/conversation/models/event';
import { ConversationEventLogger } from '@/modules/conversation/utils/eventLogger';
import { onboardingApi, validateDomain } from '@/modules/tenant/api/onboardingApi';

// Types for chat messages and form state
interface ChatMessage {
  sender: 'system' | 'user';
  text: string;
}

interface OnboardingFormState {
  business_name?: string;
  phone?: string;
  email?: string;
  kyc_file_url?: string;
  id_type?: string;
  id_number?: string;
  domain?: string;
}

const steps = [
  'greet',
  'businessInfo',
  'kyc',
  'kycUpload',
  'domain',
  'teamInvite',
  'done',
] as const;

export default function OnboardingChatWizard() {
  const [step, setStep] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'system' as const,
      text: "👋 Welcome! Let's set up your store. What's your business name?",
    },
  ]);
  const [form, setForm] = useState<OnboardingFormState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [domainStatus, setDomainStatus] = useState<{ available: boolean; message: string } | null>(
    null,
  );
  const { user } = useUser();
  const { organization } = useOrganization();

  // Helper to get tenant ID for event logging
  const getTenantId = (): string => {
    if (organization?.id) return organization.id;
    if (user?.publicMetadata && typeof user.publicMetadata['tenantId'] === 'string') {
      return user.publicMetadata['tenantId'];
    }
    return '';
  };

  // Log a conversation event (analytics)
  const logEvent = async (
    eventType: ConversationEventType,
    payload: Record<string, unknown> = {},
  ) => {
    if (!user) return;
    await ConversationEventLogger.log({
      event_type: eventType,
      user_id: user.id,
      tenant_id: getTenantId(),
      payload,
      metadata: {},
    });
  };

  // Main handler for user input (async for API and event logging)
  const handleUserInput = async (input: string | File) => {
    setLoading(true);
    setError(null);
    let nextStep = step;
    let newMessages = [
      ...messages,
      { sender: 'user' as const, text: typeof input === 'string' ? input : input.name },
    ];
    const newForm: OnboardingFormState = { ...form };
    try {
      switch (steps[step]) {
        case 'greet':
          newForm.business_name = String(input);
          newMessages.push({ sender: 'system' as const, text: "Great! What's your phone number?" });
          nextStep++;
          await logEvent(ConversationEventType.CONVERSATION_STARTED, { business_name: input });
          break;
        case 'businessInfo':
          newForm.phone = String(input);
          newMessages.push({
            sender: 'system' as const,
            text: 'Please enter your email address (or type skip).',
          });
          nextStep++;
          break;
        case 'kyc':
          if (input !== 'skip') newForm.email = String(input);
          newMessages.push({
            sender: 'system' as const,
            text: 'Please upload your ID or business registration document.',
          });
          nextStep++;
          break;
        case 'kycUpload':
          if (input instanceof File) {
            setError(null);
            newMessages = [...messages, { sender: 'user' as const, text: input.name }];
            try {
              const uploadRes = await onboardingApi.uploadKYCFile(input);
              newForm.kyc_file_url = uploadRes.file_url;
              setError(null);
              newMessages.push({
                sender: 'system' as const,
                text: 'ID uploaded! What type of ID is this? (e.g., passport, national)',
              });
              nextStep++;
              await logEvent(ConversationEventType.MESSAGE_SENT, {
                kyc_file_url: uploadRes.file_url,
              });
              setForm(newForm);
              setMessages(newMessages);
              setStep(nextStep);
              setLoading(false);
              return;
            } catch (err) {
              setError('Failed to upload file. Please try again.');
              setForm(newForm);
              setMessages(newMessages);
              setLoading(false);
              return;
            }
          } else {
            setError('Please upload a file.');
            newMessages.push({ sender: 'system' as const, text: 'Please upload a file.' });
            setForm(newForm);
            setMessages(newMessages);
            setLoading(false);
            return;
          }
        case 'domain':
          newForm.id_type = String(input);
          newMessages.push({
            sender: 'system' as const,
            text: 'What is your government-issued ID number?',
          });
          nextStep++;
          break;
        case 'teamInvite':
          newForm.id_number = String(input);
          // Simulate API calls for onboarding, KYC, etc.
          await onboardingApi.startOnboarding(newForm);
          await onboardingApi.submitKYC(newForm);
          newMessages.push({
            sender: 'system' as const,
            text: 'What subdomain would you like for your store?',
          });
          nextStep++;
          break;
        case 'done':
          newForm.domain = String(input);
          await onboardingApi.setDomain(newForm);
          newMessages.push({
            sender: 'system' as const,
            text: 'Would you like to invite a team member? (yes/no)',
          });
          nextStep++;
          break;
        default:
          if (typeof input === 'string' && input.toLowerCase() === 'yes') {
            newMessages.push({ sender: 'system' as const, text: 'Enter their phone number:' });
          } else if (typeof input === 'string' && input.toLowerCase() === 'no') {
            newMessages.push({
              sender: 'system' as const,
              text: "🎉 Onboarding complete! You're ready to start selling.",
            });
            nextStep = steps.length; // End
            await logEvent(ConversationEventType.CONVERSATION_CLOSED, {});
          } else if (typeof input === 'string' && /^\+?\d{8,}$/.test(input)) {
            const inviteRes = await onboardingApi.inviteTeam({ phone: input });
            newMessages.push({
              sender: 'system' as const,
              text: `Invite sent! Share this link: ${inviteRes.invite_link}`,
            });
            newMessages.push({
              sender: 'system' as const,
              text: "🎉 Onboarding complete! You're ready to start selling.",
            });
            nextStep = steps.length; // End
            await logEvent(ConversationEventType.USER_JOINED, { invited_phone: input });
          } else {
            newMessages.push({
              sender: 'system' as const,
              text: 'Please answer yes or no, or enter a valid phone number.',
            });
          }
          break;
      }
      setForm(newForm);
      setMessages(newMessages);
      setStep(nextStep);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow-md flex flex-col h-[90vh]">
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>
      {error && (
        <div className="text-red-600 text-sm mt-2" role="alert" data-testid="onboarding-error">
          {error}
        </div>
      )}
      {step < steps.length && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const inputElem = (e.target as HTMLFormElement).elements.namedItem(
              'input',
            ) as HTMLInputElement | null;
            if (inputElem && inputElem.value) {
              if (steps[step] === 'domain') {
                const res = await validateDomain(inputElem.value);
                setDomainStatus(res);
                if (!res.available) {
                  setError(res.message);
                  return;
                }
              }
              await handleUserInput(inputElem.value);
              inputElem.value = '';
            }
          }}
        >
          {steps[step] === 'kycUpload' ? (
            <>
              <label htmlFor="kyc-upload-file" className="sr-only">
                KYC Document
              </label>
              <input
                id="kyc-upload-file"
                aria-label="KYC Document"
                type="file"
                accept="image/*,application/pdf"
                className="flex-1 border rounded px-2 py-1"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setError(null);
                    handleUserInput(e.target.files[0]);
                  }
                }}
                disabled={loading}
              />
            </>
          ) : steps[step] === 'domain' ? (
            <>
              <input
                name="input"
                type="text"
                className="flex-1 border rounded px-2 py-1"
                placeholder="Enter your subdomain"
                disabled={loading}
                autoFocus
                onChange={async (e) => {
                  const val = e.target.value;
                  if (val) {
                    const res = await validateDomain(val);
                    setDomainStatus(res);
                    setError(res.available ? null : res.message);
                  } else {
                    setDomainStatus(null);
                    setError(null);
                  }
                }}
              />
              {domainStatus && (
                <div
                  className={
                    domainStatus.available
                      ? 'text-green-600 text-xs mt-1'
                      : 'text-red-600 text-xs mt-1'
                  }
                >
                  {domainStatus.message}
                </div>
              )}
            </>
          ) : (
            <input
              name="input"
              type="text"
              className="flex-1 border rounded px-2 py-1"
              placeholder="Type your answer..."
              disabled={loading}
              autoFocus
            />
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1 rounded"
            disabled={loading}
          >
            Send
          </button>
        </form>
      )}
      {step >= steps.length && (
        <div className="text-green-700 font-semibold text-center mt-4" role="status">
          🎉 Onboarding complete! You're ready to start selling.
        </div>
      )}
      <div className="mt-2 text-xs text-gray-400">
        Step {Math.min(step + 1, steps.length)} of {steps.length}
      </div>
    </div>
  );
}
