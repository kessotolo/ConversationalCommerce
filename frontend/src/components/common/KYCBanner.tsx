import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';

type KYCBannerProps = {
  className?: string;
};

/**
 * Non-blocking KYC notification banner that displays country-specific KYC requirements
 * Nigeria requires BVN verification while other countries have different requirements
 */
const KYCBanner: React.FC<KYCBannerProps> = ({ className = '' }) => {
  const { tenant } = useTenant();
  const [dismissed, setDismissed] = useState(false);
  const [bannerKey, setBannerKey] = useState('kyc-banner-shown');

  useEffect(() => {
    const localKey = `${bannerKey}-${tenant?.id || 'default'}`;
    const isDismissed = localStorage.getItem(localKey) === 'true';
    setDismissed(isDismissed);
  }, [tenant?.id, bannerKey]);

  // Skip banner if tenant is undefined or KYC is already verified
  if (!tenant || tenant.kyc_status === 'verified' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    const localKey = `${bannerKey}-${tenant?.id || 'default'}`;
    localStorage.setItem(localKey, 'true');
  };

  // Get country-specific KYC message
  const getKYCMessage = () => {
    // Nigeria-specific message for BVN
    if (tenant.country_code === 'NG') {
      return (
        <>
          Complete your store verification with your <strong>BVN</strong> to enable all features.
        </>
      );
    }

    // Kenya-specific message
    if (tenant.country_code === 'KE') {
      return (
        <>
          Verify your store identity with your <strong>National ID</strong> to enable all features.
        </>
      );
    }

    // Ghana-specific message
    if (tenant.country_code === 'GH') {
      return (
        <>
          Complete your store verification with your <strong>Ghana Card</strong> to enable all features.
        </>
      );
    }

    // Default message for other countries
    return (
      <>
        Complete your store verification with a valid <strong>ID document</strong> to enable all features.
      </>
    );
  };

  return (
    <div 
      className={`bg-amber-50 border-l-4 border-amber-400 p-4 shadow-md ${className}`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-3">
            <svg 
              className="h-6 w-6 text-amber-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          <div className="text-sm leading-5 text-amber-700">
            <p>{getKYCMessage()}</p>
            <p className="mt-1">
              <Link 
                href="/dashboard/settings/verification" 
                className="font-medium underline hover:text-amber-800"
              >
                Complete Verification Now
              </Link>
            </p>
          </div>
        </div>
        <button 
          onClick={handleDismiss} 
          className="ml-4 text-amber-500 hover:text-amber-700 focus:outline-none"
        >
          <XCircle size={20} />
        </button>
      </div>
    </div>
  );
};

export default KYCBanner;
