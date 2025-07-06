import React from "react";

interface Props {
  form: Record<string, unknown>;
  setForm: (v: Record<string, unknown>) => void;
}

const OnboardingKYCStep: React.FC<Props> = ({ form, setForm }) => (
  <>
    <label className="flex flex-col gap-1" htmlFor="id-type-input">
      <span className="font-medium">ID Type</span>
        <input
          id="id-type-input"
          name="id_type"
          className="border rounded px-4 py-3 w-full text-base"
          required
          aria-label="ID Type"
          value={form.id_type ?? ""}
          onChange={e => setForm({ ...form, id_type: e.target.value })}
        />
    </label>
    <label className="flex flex-col gap-1" htmlFor="id-number-input">
      <span className="font-medium">ID Number</span>
        <input
          id="id-number-input"
          name="id_number"
          className="border rounded px-4 py-3 w-full text-base"
          required
          aria-label="ID Number"
          value={form.id_number ?? ""}
          onChange={e => setForm({ ...form, id_number: e.target.value })}
        />
    </label>
  </>
);

export default OnboardingKYCStep;
