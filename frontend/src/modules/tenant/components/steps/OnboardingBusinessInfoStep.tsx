import React from "react";

interface Props {
  form: Record<string, unknown>;
  setForm: (v: Record<string, unknown>) => void;
}

const OnboardingBusinessInfoStep: React.FC<Props> = ({ form, setForm }) => (
  <>
    <label className="flex flex-col gap-1" htmlFor="business-name-input">
      <span className="font-medium">Business Name</span>
      <input
        id="business-name-input"
        name="business_name"
        className="border rounded px-4 py-3 w-full text-base"
        required
        autoComplete="organization"
        data-testid="business-name-input"
        value={form.business_name ?? ""}
        onChange={e => setForm({ ...form, business_name: e.target.value })}
      />
    </label>
    <label className="flex flex-col gap-1" htmlFor="phone-input">
      <span className="font-medium">Phone</span>
      <input
        id="phone-input"
        name="phone"
        className="border rounded px-4 py-3 w-full text-base"
        required
        inputMode="tel"
        autoComplete="tel"
        data-testid="phone-input"
        value={form.phone ?? ""}
        onChange={e => setForm({ ...form, phone: e.target.value })}
      />
    </label>
    <label className="flex flex-col gap-1" htmlFor="email-input">
      <span className="font-medium">Email</span>
      <input
        id="email-input"
        name="email"
        className="border rounded px-4 py-3 w-full text-base"
        inputMode="email"
        autoComplete="email"
        data-testid="email-input"
        value={form.email ?? ""}
        onChange={e => setForm({ ...form, email: e.target.value })}
      />
    </label>
  </>
);

export default OnboardingBusinessInfoStep;
