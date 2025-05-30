import React from 'react';
import { ExternalLink, Eye, QrCode, Settings, Edit } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface StorefrontLinksProps {
  className?: string;
}

export default function StorefrontLinks({ className }: StorefrontLinksProps) {
  const { tenant, isLoading } = useTenant();

  if (isLoading || !tenant) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded w-full max-w-xs mb-2"></div>
        <div className="h-10 bg-gray-200 rounded w-full max-w-md"></div>
      </div>
    );
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'yourplatform.com';
  const isDefaultDomain = baseDomain === 'yourplatform.com';
  const isDefaultSubdomain = tenant.subdomain === 'default';

  const subdomainUrl = `https://${tenant.subdomain}.${baseDomain}`;
  const customDomainUrl = tenant.customDomain ? `https://${tenant.customDomain}` : null;

  // Check if we're using default/placeholder values
  const usingPlaceholders = isDefaultDomain || isDefaultSubdomain;

  return (
    <div className={className}>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Your Storefront</h3>

        {usingPlaceholders && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Your storefront is currently using placeholder values.
              To set up your actual storefront URL, please customize your store settings.
            </p>
            <a
              href="/dashboard/settings"
              className="text-sm text-blue-600 hover:underline mt-2 inline-block"
            >
              Configure store settings
            </a>
          </div>
        )}

        {/* Subdomain URL */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Subdomain URL</span>
            <div className="flex space-x-2">
              {/* View actual storefront (eye icon) */}
              <a
                href={usingPlaceholders ? "#" : subdomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-1 rounded-full flex items-center justify-center w-8 h-8 ${usingPlaceholders ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                title={usingPlaceholders ? "Setup your store first" : "View live storefront"}
                onClick={usingPlaceholders ? (e) => e.preventDefault() : undefined}
              >
                <Eye size={18} />
              </a>

              {/* Edit storefront (edit icon) */}
              <a
                href="/dashboard/storefront/customize"
                className="p-1 rounded-full flex items-center justify-center w-8 h-8 text-green-600 hover:bg-green-50"
                title="Edit storefront"
              >
                <Edit size={18} />
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(subdomainUrl)}
                className="p-1 rounded-full flex items-center justify-center w-8 h-8 text-purple-600 hover:bg-purple-50"
                title="Copy URL"
              >
                <ExternalLink size={18} />
              </button>
              <a
                href={`/dashboard/storefront/qr?url=${encodeURIComponent(subdomainUrl)}`}
                className="p-1 rounded-full flex items-center justify-center w-8 h-8 text-orange-600 hover:bg-orange-50"
                title="Get QR code"
              >
                <QrCode size={18} />
              </a>
            </div>
          </div>
          <div className="flex items-center">
            {usingPlaceholders ? (
              <span className="text-gray-500 italic">{subdomainUrl} <small>(placeholder)</small></span>
            ) : (
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate"
              >
                {subdomainUrl}
              </a>
            )}
          </div>
        </div>

        {/* Custom Domain URL (if available) */}
        {customDomainUrl && (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Custom Domain</span>
              <div className="flex space-x-2">
                <a
                  href={customDomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-full hover:bg-gray-100"
                  title="View storefront"
                >
                  <Eye size={18} />
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(customDomainUrl)}
                  className="p-1 rounded-full hover:bg-gray-100"
                  title="Copy URL"
                >
                  <ExternalLink size={18} />
                </button>
                <a
                  href={`/dashboard/storefront/qr?url=${encodeURIComponent(customDomainUrl)}`}
                  className="p-1 rounded-full hover:bg-gray-100"
                  title="Get QR code"
                >
                  <QrCode size={18} />
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <a
                href={customDomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate"
              >
                {customDomainUrl}
              </a>
            </div>
          </div>
        )}

        {/* Settings link */}
        <div className="pt-2">
          <a
            href="/dashboard/storefront/customize"
            className="text-sm text-[#6C9A8B] font-semibold hover:text-[#4e6e5e] flex items-center"
          >
            <Settings size={16} className="mr-1" />
            Customize storefront
          </a>
        </div>
      </div>
    </div>
  );
}
