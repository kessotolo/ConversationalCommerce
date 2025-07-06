import React from "react";

interface Props {
  invitePhone: string;
  setInvitePhone: (v: string) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteStatus: string | null;
  inviteError: string | null;
  webInviteLink: string | null;
  setWebInviteLink: (v: string | null) => void;
}

const OnboardingTeamInviteStep: React.FC<Props> = ({ invitePhone, setInvitePhone, inviteEmail, setInviteEmail, inviteStatus, inviteError, webInviteLink, setWebInviteLink }) => (
  <div className="flex flex-col gap-4">
    <label className="flex flex-col gap-1" htmlFor="team-member-phone-input">
      <span className="font-medium">Team Member Phone (WhatsApp)</span>
      <input
        id="team-member-phone-input"
        name="team_member_phone"
        className="border rounded px-4 py-3 w-full text-base"
        placeholder="e.g. +2348012345678"
        value={invitePhone}
        onChange={e => setInvitePhone(e.target.value)}
        inputMode="tel"
        pattern="^\\+?\d{8,}$"
      />
    </label>
    <label className="flex flex-col gap-1" htmlFor="team-member-email-input">
      <span className="font-medium">Team Member Email</span>
      <input
        id="team-member-email-input"
        name="team_member_email"
        className="border rounded px-4 py-3 w-full text-base"
        placeholder="e.g. team@example.com"
        value={inviteEmail}
        onChange={e => setInviteEmail(e.target.value)}
        inputMode="email"
        type="email"
      />
    </label>
    {webInviteLink && (
      <div className="text-xs text-gray-500 break-all mt-1">{webInviteLink}</div>
    )}
    {inviteStatus && <div className="text-green-600 text-xs mt-2">{inviteStatus}</div>}
    {inviteError && <div className="text-red-600 text-xs mt-2">{inviteError}</div>}
  </div>
);

export default OnboardingTeamInviteStep;
