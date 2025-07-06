import React from "react";

interface Props {
  domainInput: string;
  setDomainInput: (v: string) => void;
  domainStatus: { available: boolean; message: string } | null;
}

const OnboardingDomainStep: React.FC<Props> = ({ domainInput, setDomainInput, domainStatus }) => (
  <label className="flex flex-col gap-1" htmlFor="subdomain-input">
    <span className="font-medium">Subdomain</span>
    <input
      id="subdomain-input"
      name="input"
      className="border rounded px-4 py-3 w-full text-base"
      required
      autoComplete="off"
      value={domainInput}
      onChange={e => setDomainInput(e.target.value)}
      data-testid="subdomain-input"
    />
    {domainStatus && (
      <div className={`text-xs mt-2 ${domainStatus.available ? 'text-green-600' : 'text-red-600'}`}>{domainStatus.message}</div>
    )}
  </label>
);

export default OnboardingDomainStep;
