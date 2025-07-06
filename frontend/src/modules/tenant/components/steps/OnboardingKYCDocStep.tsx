import React from "react";

interface Props {
  file: File | null;
  setFile: (f: File | null) => void;
  uploadProgress: number | null;
  kycError: string | null;
}

const OnboardingKYCDocStep: React.FC<Props> = ({ file, setFile, uploadProgress, kycError }) => (
  <>
    <label className="flex flex-col gap-1" htmlFor="kyc-document-input">
      <span className="font-medium">KYC Document</span>
      <input
        id="kyc-document-input"
        type="file"
        name="kyc_file"
        className="border rounded px-4 py-3 w-full text-base"
        required
        aria-label="KYC Document"
        onChange={e => setFile(e.target.files?.[0] || null)}
        data-testid="kyc-document-input"
      />
    </label>
    {uploadProgress !== null && (
      <div className="text-xs mt-2" data-testid="upload-progress">
        Upload Progress: {uploadProgress}%
      </div>
    )}
    {kycError && (
      <div className="text-red-600 text-xs mt-2" data-testid="kyc-error">
        {kycError}
      </div>
    )}
  </>
);

export default OnboardingKYCDocStep;
